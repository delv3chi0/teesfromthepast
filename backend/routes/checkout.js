// backend/routes/checkout.js
import express from 'express';
import Stripe from 'stripe';
import 'dotenv/config';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

router.post('/checkout', async (req, res) => {
    const { items } = req.body; // Expecting an array of items, e.g., [{ id, name, price, imageUrl, quantity }]

    if (!items || items.length === 0) {
        return res.status(400).json({ message: 'No items provided for checkout.' });
    }

    try {
        // Map your product items to Stripe's line_items format
        const lineItems = items.map(item => ({
            price_data: {
                currency: 'usd',
                product_data: {
                    name: item.name,
                    images: [item.imageUrl], // Use the generated image as product image
                    description: `Custom AI Retro T-Shirt with prompt: ${item.name}`,
                },
                unit_amount: item.price, // Price in cents (e.g., 2500 for $25.00)
            },
            quantity: item.quantity,
        }));

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            success_url: 'http://localhost:5173/success?session_id={CHECKOUT_SESSION_ID}', // Redirect to frontend success page
            cancel_url: 'http://localhost:5173/cancel', // Redirect to frontend cancel page
            // Optionally, you can add client_reference_id to link to your user
            // client_reference_id: req.user.id, // If you have user authentication in place
        });

        res.json({ url: session.url });
    } catch (error) {
        console.error('Error creating Stripe checkout session:', error);
        res.status(500).json({ message: 'Failed to create Stripe checkout session.', error: error.message });
    }
});

export default router;
