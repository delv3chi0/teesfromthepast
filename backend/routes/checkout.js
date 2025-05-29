// backend/routes/checkout.js
import express from 'express';
import Stripe from 'stripe';
import 'dotenv/config';
import { protect } from '../middleware/authMiddleware.js'; // Ensure users are logged in to checkout

const router = express.Router();

// Ensure your Stripe secret key is loaded correctly.
// The key should be for TEST mode for now.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

router.post('/create-payment-intent', protect, async (req, res) => {
    // For now, let's assume a fixed amount for a T-shirt.
    // In the future, 'req.body' would contain items from the cart, product IDs, quantities etc.
    // to calculate the total amount.
    const { items, currency = 'usd' } = req.body; // Frontend could send items or just trigger a default purchase

    // EXAMPLE: Calculate order amount on the server.
    // NEVER trust the amount sent from the client for actual charging.
    // For this first step, let's assume a single item purchase and calculate amount here.
    // Let's say a custom tee costs $25.00
    const amountInCents = 2500; // Stripe expects amounts in the smallest currency unit (e.g., cents for USD)

    if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(500).json({ error: 'Stripe payments are not configured on the server.' });
    }

    try {
        console.log(`[Payment Intent] Creating payment intent for amount: ${amountInCents} ${currency.toUpperCase()}`);

        // Create a PaymentIntent with the order amount and currency
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInCents,
            currency: currency,
            automatic_payment_methods: {
                enabled: true, // Stripe will automatically enable relevant payment methods
            },
            // You can add metadata here if needed, like userId, designId, etc.
            // metadata: { userId: req.user.id, designId: items?.[0]?.designId || 'N/A' },
        });

        console.log(`[Payment Intent] Created successfully. ID: ${paymentIntent.id}`);
        // Send the client_secret back to the frontend
        res.send({
            clientSecret: paymentIntent.client_secret,
            amount: amountInCents, // Optional: send amount back for display
            currency: currency    // Optional: send currency back
        });

    } catch (error) {
        console.error("[Payment Intent] Error creating payment intent:", error.message);
        res.status(400).send({ error: { message: error.message } });
    }
});

export default router;
