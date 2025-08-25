// backend/routes/checkout.js
import express from 'express';
import Stripe from 'stripe';
import 'dotenv/config';
import { protect } from '../middleware/authMiddleware.js';

import Product from '../models/Product.js';
import Design from '../models/Design.js';

const router = express.Router();

if (!process.env.STRIPE_SECRET_KEY) {
    console.error("[Checkout] CRITICAL STARTUP ERROR: Stripe secret key (STRIPE_SECRET_KEY) is not configured in .env.");
}
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

const MAX_METADATA_FIELD_LENGTH = 490;

router.post('/create-payment-intent', protect, async (req, res) => {
    console.log('-----------------------------------------------------');
    console.log('[Checkout] /create-payment-intent route hit by user:', req.user.id);
    
    if (!stripe) {
        console.error("[Checkout] CRITICAL ERROR: Stripe is not initialized. Check STRIPE_SECRET_KEY.");
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
        
        console.log('[Checkout] Processing items to calculate total and prepare metadata...');
        
        for (const item of items) {
            if (!item || !item.productId || !item.variantSku || !item.designId || !item.quantity) {
                console.error('[Checkout] ERROR: Invalid item structure.', item);
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
            console.log(`[Checkout] Item: ${product.name} (${foundVariant.sku}), Price/Item: ${pricePerItemCents}, Qty: ${quantity}, Subtotal: ${pricePerItemCents * quantity}`);

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
        
        console.log('[Checkout] Total calculated amount (cents):', amountInCents);

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
        
        console.log(`[Checkout] Creating PaymentIntent for user ${req.user.id}. Amount: ${amountInCents} ${currency.toUpperCase()}`);
        const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);
        console.log('[Checkout] PaymentIntent created successfully. ID:', paymentIntent.id);

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
            console.error("[Checkout] Stripe API Error details:", JSON.stringify(error, null, 2));
        } else {
            console.error("[Checkout] CRITICAL ERROR creating payment intent (Non-Stripe):", error.message, error.stack);
        }
        res.status(500).send({ error: { message: errorMessage } });
    } finally {
        console.log('[Checkout] /create-payment-intent request finished for user:', req.user.id);
        console.log('-----------------------------------------------------');
    }
});

// Checkout alias - reuses the same logic as /create-payment-intent
router.post('/', protect, async (req, res) => {
    console.log('-----------------------------------------------------');
    console.log('[Checkout] /checkout (alias) route hit by user:', req.user.id);
    
    if (!stripe) {
        console.error("[Checkout] CRITICAL ERROR: Stripe is not initialized. Check STRIPE_SECRET_KEY.");
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
        
        console.log('[Checkout] Processing items to calculate total and prepare metadata...');
        
        for (const item of items) {
            if (!item || !item.productId || !item.variantSku || !item.designId || !item.quantity) {
                console.error('[Checkout] ERROR: Invalid item structure.', item);
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
                        foundVariant = {
                            ...sizeVariant,
                            colorName: color.colorName,
                            colorCode: color.colorCode || color.colorName
                        };
                        pricePerItemCents = sizeVariant.priceCents;
                        break;
                    }
                }
            } else {
                // --- OLD FORMAT LOGIC ---
                foundVariant = product.variants.find(variant => variant.sku === item.variantSku);
                if (foundVariant) {
                    if (!foundVariant.inStock) {
                        return res.status(400).json({ error: `Sorry, ${product.name} (${foundVariant.colorName || foundVariant.name || 'variant'}) is out of stock.` });
                    }
                    pricePerItemCents = foundVariant.priceCents;
                }
            }
            // ==================== MODIFICATION END ====================

            if (!foundVariant) {
                return res.status(404).json({ error: `The selected variation of "${product.name}" could not be found or is out of stock.` });
            }

            const itemTotal = pricePerItemCents * item.quantity;
            amountInCents += itemTotal;

            const shortMetadata = {
                product: (product.name || '').substring(0, MAX_METADATA_FIELD_LENGTH),
                design: (design.name || '').substring(0, MAX_METADATA_FIELD_LENGTH),
                variant: (foundVariant.colorName || foundVariant.name || '').substring(0, MAX_METADATA_FIELD_LENGTH),
                quantity: item.quantity,
                unitPrice: pricePerItemCents
            };
            orderItemsForStripeMetadata.push(shortMetadata);

            console.log(`[Checkout] Item: ${product.name} (${foundVariant.colorName || foundVariant.name}) x${item.quantity} = $${itemTotal / 100}`);
        }

        console.log(`[Checkout] Total calculated: $${amountInCents / 100} ${currency.toUpperCase()}`);

        if (amountInCents <= 0) {
            return res.status(400).json({ error: 'Order total must be greater than zero.' });
        }

        const paymentIntentParams = {
            amount: amountInCents,
            currency: currency,
            automatic_payment_methods: { enabled: true },
            metadata: {
                userId: req.user.id,
                items: JSON.stringify(orderItemsForStripeMetadata).substring(0, MAX_METADATA_FIELD_LENGTH),
                shipping: JSON.stringify(validatedShippingAddress).substring(0, MAX_METADATA_FIELD_LENGTH),
                orderSource: 'teesfromthepast_checkout'
            },
            description: `Order from TeesFromThePast for user ${req.user.id}`,
        };
        
        console.log(`[Checkout] Creating PaymentIntent for user ${req.user.id}. Amount: ${amountInCents} ${currency.toUpperCase()}`);
        const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);
        console.log('[Checkout] PaymentIntent created successfully. ID:', paymentIntent.id);

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
            console.error("[Checkout] Stripe API Error details:", JSON.stringify(error, null, 2));
        } else {
            console.error("[Checkout] CRITICAL ERROR creating payment intent (Non-Stripe):", error.message, error.stack);
        }
        res.status(500).send({ error: { message: errorMessage } });
    } finally {
        console.log('[Checkout] /checkout (alias) request finished for user:', req.user.id);
        console.log('-----------------------------------------------------');
    }
});

export default router;
