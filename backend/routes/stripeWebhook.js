// backend/routes/stripeWebhook.js
import express from 'express';
import Stripe from 'stripe';
import 'dotenv/config'; // Ensure environment variables are loaded
import User from '../models/User.js'; // Assuming you want to update user data

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Use raw body parser for Stripe webhooks
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];

    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        console.error(`Webhook Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
        case 'checkout.session.completed':
            const session = event.data.object;
            console.log(`Checkout session completed for customer: ${session.customer_details.email}`);
            // You can get more details from the session, e.g., line items
            // const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
            // console.log('Line Items:', lineItems.data);

            // Example: Update user's subscription status or record purchase
            // You'll need to link the Stripe session to a user in your DB.
            // This usually involves storing the user's ID in Stripe metadata during checkout creation.
            // For demonstration, let's just log it.
            // In a real app, you might find the user by session.client_reference_id
            // await User.findByIdAndUpdate(userId, { $push: { purchases: { sessionId: session.id, amount: session.amount_total } } });
            console.log('Customer Email:', session.customer_details.email);
            console.log('Total Amount:', session.amount_total);
            console.log('Currency:', session.currency);

            // Fulfill the purchase, e.g., send confirmation email, grant access to digital content
            break;
        case 'invoice.payment_succeeded':
            const invoice = event.data.object;
            console.log(`Invoice payment succeeded for customer: ${invoice.customer_email}`);
            // Handle recurring subscription payments here
            break;
        case 'customer.subscription.deleted':
            const subscription = event.data.object;
            console.log(`Subscription deleted for customer: ${subscription.customer}`);
            // Update user status in your database (e.g., mark subscription as inactive)
            break;
        // ... handle other event types
        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    // Return a 200 response to acknowledge receipt of the event
    res.json({ received: true });
});

export default router;
