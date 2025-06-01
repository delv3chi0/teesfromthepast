// backend/routes/checkout.js
import express from 'express';
import Stripe from 'stripe';
import 'dotenv/config';
import { protect } from '../middleware/authMiddleware.js'; 

const router = express.Router();

// Ensure your Stripe secret key is loaded correctly.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

router.post('/create-payment-intent', protect, async (req, res) => {
    const { items, currency = 'usd', shippingAddress } = req.body; // shippingAddress is now expected

    // TODO: Implement proper amount calculation based on 'items' or other product details from req.body
    // For now, using a fixed amount for demonstration.
    const amountInCents = 2500; // Example: $25.00

    if (!process.env.STRIPE_SECRET_KEY) {
        console.error("[Payment Intent] Stripe secret key not configured.");
        return res.status(500).json({ error: 'Stripe payments are not configured on the server.' });
    }

    try {
        const paymentIntentParams = {
            amount: amountInCents,
            currency: currency,
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: { 
                userId: req.user.id,
                // Example: You might want to pass product details from 'items' here if needed
                // items: JSON.stringify(items) 
            },
        };

        // Add shipping details to the PaymentIntent if provided by the frontend
        if (shippingAddress) {
            paymentIntentParams.shipping = {
                name: shippingAddress.recipientName,
                address: {
                    line1: shippingAddress.street1,
                    line2: shippingAddress.street2 || undefined, 
                    city: shippingAddress.city,
                    state: shippingAddress.state,
                    postal_code: shippingAddress.zipCode,
                    country: shippingAddress.country,
                },
                phone: shippingAddress.phone || undefined,
            };
            console.log(`[Payment Intent] Including shipping address for: ${shippingAddress.recipientName}`);
        } else {
            console.log("[Payment Intent] No shipping address provided for this payment intent.");
        }

        console.log(`[Payment Intent] Creating payment intent for amount: ${amountInCents} ${currency.toUpperCase()}`);
        const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

        console.log(`[Payment Intent] Created successfully. ID: ${paymentIntent.id}`);
        res.send({
            clientSecret: paymentIntent.client_secret,
            amount: amountInCents, 
            currency: currency    
        });

    } catch (error) {
        console.error("[Payment Intent] Error creating payment intent:", error.message);
        res.status(400).send({ error: { message: error.message } });
    }
});

export default router;
