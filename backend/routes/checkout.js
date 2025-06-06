// backend/routes/checkout.js
import express from 'express';
import Stripe from 'stripe';
import 'dotenv/config';
import { protect } from '../middleware/authMiddleware.js';

// --- CHANGED: Import Product and Design models ---
import Product from '../models/Product.js';
import Design from '../models/Design.js';

const router = express.Router();

if (!process.env.STRIPE_SECRET_KEY) {
    console.error("[Checkout] CRITICAL STARTUP ERROR: Stripe secret key (STRIPE_SECRET_KEY) is not configured in .env.");
}
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

const MAX_METADATA_FIELD_LENGTH = 490;

// --- REMOVED: The old hardcoded getPriceInCents function is no longer needed ---

router.post('/create-payment-intent', protect, async (req, res) => {
    console.log('-----------------------------------------------------');
    console.log('[Checkout] /create-payment-intent route hit by user:', req.user.id);
    
    if (!stripe) {
        console.error("[Checkout] CRITICAL ERROR: Stripe is not initialized. Check STRIPE_SECRET_KEY.");
        return res.status(500).json({ error: 'Payment processing is currently unavailable. Stripe not configured.' });
    }

    const { items, currency = 'usd', shippingAddress } = req.body;
    console.log('[Checkout] Request body items (first item):', items && items.length > 0 ? JSON.stringify(items[0], (key, value) => key === 'imageDataUrl' ? value.substring(0, 50) + '...' : value, 2) : 'No items');
    console.log('[Checkout] Request body currency:', currency);
    console.log('[Checkout] Request body shippingAddress:', JSON.stringify(shippingAddress, null, 2));

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
            // --- CHANGED: New validation for dynamic product fields ---
            if (!item || !item.productId || !item.variantSku || !item.designId || !item.quantity) {
                console.error('[Checkout] ERROR: Invalid item structure. Missing productId, variantSku, designId, or quantity.', item);
                return res.status(400).json({ error: 'Invalid item data received. Ensure all product details are present.' });
            }

            // --- CHANGED: Fetch product and variant from DB ---
            const product = await Product.findById(item.productId);
            const design = await Design.findById(item.designId);

            if (!product || !product.isActive) {
                return res.status(404).json({ error: `The product "${item.productName || 'item'}" is no longer available.` });
            }
            if (!design) {
                return res.status(404).json({ error: 'The selected design could not be found.' });
            }

            const variant = product.variants.find(v => v.sku === item.variantSku);
            if (!variant) {
                return res.status(404).json({ error: `The selected product option (size/color) is no longer available.` });
            }

            const quantity = parseInt(item.quantity, 10) || 1;

            // --- CHANGED: Stock Check ---
            if (variant.stock < quantity) {
                return res.status(400).json({ error: `Sorry, we only have ${variant.stock} of "${product.name} - ${variant.colorName} / ${variant.size}" in stock.` });
            }

            // --- CHANGED: Dynamic Price Calculation ---
            // Price is base price + variant modifier. Convert to cents.
            const pricePerItemCents = Math.round((product.basePrice + variant.priceModifier) * 100);
            amountInCents += pricePerItemCents * quantity;
            console.log(`[Checkout] Item: ${product.name} (${variant.sku}), Base: ${product.basePrice}, Mod: ${variant.priceModifier}, Price/Item: ${pricePerItemCents}, Qty: ${quantity}, Subtotal: ${pricePerItemCents * quantity}`);
            
            // --- CHANGED: Prepare metadata with real data ---
            orderItemsForStripeMetadata.push({
                productId: product._id.toString(),
                productName: product.name,
                variantSku: variant.sku,
                size: variant.size,
                color: variant.colorName,
                designId: design._id.toString(),
                designPrompt: design.prompt.substring(0, MAX_METADATA_FIELD_LENGTH),
                quantity: quantity,
                priceAtPurchase: pricePerItemCents, // Store price in cents
            });
        }
        
        console.log('[Checkout] Total calculated amount (cents):', amountInCents);

        if (amountInCents < 50) { // Stripe minimum is $0.50 USD
            return res.status(400).json({ error: 'Invalid order amount. Total must be at least $0.50.'});
        }
        
        const stringifiedOrderDetailsForStripe = JSON.stringify(orderItemsForStripeMetadata);
        if (stringifiedOrderDetailsForStripe.length > 40000) { // Stripe metadata limit is ~40KB
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
        if (error.type) { // Stripe error
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

export default router;
