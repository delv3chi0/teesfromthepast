// backend/routes/checkout.js
import express from 'express';
import Stripe from 'stripe';
import 'dotenv/config';
import { protect } from '../middleware/authMiddleware.js';
import logger from '../utils/logger.js';

import Product from '../models/Product.js';
import Design from '../models/Design.js';

const router = express.Router();

if (!process.env.STRIPE_SECRET_KEY) {
    logger.error("checkout.stripe_not_configured", { 
        hasKey: false,
        reason: "STRIPE_SECRET_KEY missing from environment"
    });
}
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

const MAX_METADATA_FIELD_LENGTH = 490;

router.post('/create-payment-intent', protect, async (req, res) => {
    const log = req.log || logger;
    log.info('checkout.create_payment_intent.start', { userId: req.user.id });
    
    if (!stripe) {
        log.error("checkout.stripe_unavailable", { 
            userId: req.user.id,
            reason: "Stripe not initialized"
        });
        return res.status(500).json({ error: 'Payment processing is currently unavailable. Stripe not configured.' });
    }

    const { items, currency = 'usd', shippingAddress } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'No items provided for payment.' });
    }
    if (!shippingAddress || typeof shippingAddress !== 'object' || Object.keys(shippingAddress).length === 0) {
        return res.status(400).json({ error: 'Shipping address is required.' });
    }
    
    let countryCode = shippingAddress.country;
    if (!countryCode || typeof countryCode !== 'string' || countryCode.trim().length === 0) {
        return res.status(400).json({ error: 'Shipping address country is required.' });
    }
    countryCode = countryCode.trim().toUpperCase();
    if (countryCode === 'UNITED STATES' || countryCode === 'USA') countryCode = 'US';
    if (countryCode.length !== 2) {
        return res.status(400).json({ error: `Invalid country format: '${shippingAddress.country}'. Please use a 2-letter ISO country code (e.g., US, CA).` });
    }
    const validatedShippingAddress = { ...shippingAddress, country: countryCode };

    try {
        let amountInCents = 0;
        const orderItemsForStripeMetadata = [];
        
        log.info('checkout.processing_items', { 
            userId: req.user.id,
            itemCount: items.length
        });
        
        for (const item of items) {
            if (!item || !item.productId || !item.variantSku || !item.designId || !item.quantity) {
                log.error('checkout.invalid_item', { 
                    userId: req.user.id,
                    item: item,
                    missingFields: {
                        productId: !item?.productId,
                        variantSku: !item?.variantSku,
                        designId: !item?.designId,
                        quantity: !item?.quantity
                    }
                });
                return res.status(400).json({ error: 'Invalid item data received. Ensure all product details are present.' });
            }

            const product = await Product.findById(item.productId);
            const design = await Design.findById(item.designId);

            if (!product || !product.isActive) {
                return res.status(404).json({ error: `The product "${item.productName || 'item'}" is no longer available.` });
            }
            if (!design) {
                return res.status(404).json({ error: 'The selected design could not be found.' });
            }
            if (!product.variants || product.variants.length === 0) {
                return res.status(404).json({ error: 'This product has no purchaseable options.' });
            }

            // ==================== MODIFICATION START: Backwards-Compatible Variant Logic ====================
            const isNewFormat = product.variants[0].sizes !== undefined;
            let foundVariant = null;
            let pricePerItemCents = 0;

            if (isNewFormat) {
                // --- NEW FORMAT LOGIC ---
                for (const color of product.variants) {
                    const sizeVariant = color.sizes.find(s => s.sku === item.variantSku);
                    if (sizeVariant) {
                        if (!sizeVariant.inStock) {
                            return res.status(400).json({ error: `Sorry, ${product.name} - ${color.colorName} / ${sizeVariant.size} is out of stock.` });
                        }
                        // Combine color and size info into a single object for consistency
                        foundVariant = { ...sizeVariant, colorName: color.colorName }; 
                        pricePerItemCents = Math.round((product.basePrice + sizeVariant.priceModifier) * 100);
                        break; // Exit the loop once we find our variant
                    }
                }
            } else {
                // --- OLD FORMAT LOGIC ---
                const oldVariant = product.variants.find(v => v.sku === item.variantSku);
                if (oldVariant) {
                    if (oldVariant.stock < item.quantity) {
                        return res.status(400).json({ error: `Sorry, we only have ${oldVariant.stock} of "${product.name} - ${oldVariant.colorName} / ${oldVariant.size}" in stock.` });
                    }
                    foundVariant = oldVariant;
                    pricePerItemCents = Math.round((product.basePrice + oldVariant.priceModifier) * 100);
                }
            }

            if (!foundVariant) {
                return res.status(404).json({ error: `The selected product option (SKU: ${item.variantSku}) is no longer available.` });
            }

            const quantity = parseInt(item.quantity, 10) || 1;
            amountInCents += pricePerItemCents * quantity;
            log.info('checkout.item_processed', {
                userId: req.user.id,
                productName: product.name,
                sku: foundVariant.sku,
                pricePerItemCents,
                quantity,
                subtotalCents: pricePerItemCents * quantity
            });

            orderItemsForStripeMetadata.push({
                productId: product._id.toString(),
                productName: product.name,
                variantSku: foundVariant.sku,
                size: foundVariant.size,
                color: foundVariant.colorName,
                designId: design._id.toString(),
                designPrompt: design.prompt.substring(0, MAX_METADATA_FIELD_LENGTH),
                quantity: quantity,
                priceAtPurchase: pricePerItemCents,
            });
            // ==================== MODIFICATION END ====================
        }
        
        log.info('checkout.total_calculated', {
            userId: req.user.id,
            totalAmountCents: amountInCents,
            currency: currency.toUpperCase(),
            itemCount: items.length
        });

        if (amountInCents < 50) {
            return res.status(400).json({ error: 'Invalid order amount. Total must be at least $0.50.'});
        }
        
        const stringifiedOrderDetailsForStripe = JSON.stringify(orderItemsForStripeMetadata);
        if (stringifiedOrderDetailsForStripe.length > 40000) {
            return res.status(400).json({ error: 'Order details are too large for processing.' });
        }

        const paymentIntentParams = {
            amount: amountInCents,
            currency: currency,
            automatic_payment_methods: { enabled: true },
            metadata: {
                userId: req.user.id,
                orderDetails: stringifiedOrderDetailsForStripe,
            },
            shipping: {
                name: validatedShippingAddress.recipientName,
                address: {
                    line1: validatedShippingAddress.street1,
                    line2: validatedShippingAddress.street2 || undefined,
                    city: validatedShippingAddress.city,
                    state: validatedShippingAddress.state,
                    postal_code: validatedShippingAddress.zipCode,
                    country: validatedShippingAddress.country,
                },
                phone: validatedShippingAddress.phone || undefined,
            },
            description: `Order from TeesFromThePast for user ${req.user.id}`,
        };
        
        log.info('checkout.payment_intent.creating', {
            userId: req.user.id,
            amount: amountInCents,
            currency: currency.toUpperCase()
        });
        const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);
        log.info('checkout.payment_intent.created', {
            userId: req.user.id,
            paymentIntentId: paymentIntent.id,
            amount: amountInCents
        });

        res.send({
            clientSecret: paymentIntent.client_secret,
            amount: amountInCents,
            currency: currency,
        });

    } catch (error) {
        let errorMessage = `Failed to create payment intent: ${error.message}`;
        if (error.type) {
            errorMessage = `Stripe Error (${error.type}): ${error.message}`;
            if (error.code) errorMessage += ` (Code: ${error.code})`;
            log.error("checkout.stripe_api_error", {
                userId: req.user.id,
                errorType: error.type,
                errorCode: error.code,
                errorMessage: error.message,
                errorDetails: JSON.stringify(error, null, 2)
            });
        } else {
            log.error("checkout.payment_intent_error", {
                userId: req.user.id,
                error: error.message,
                stack: error.stack
            });
        }
        res.status(500).send({ error: { message: errorMessage } });
    } finally {
        log.info('checkout.create_payment_intent.end', { userId: req.user.id });
    }
});

export default router;
