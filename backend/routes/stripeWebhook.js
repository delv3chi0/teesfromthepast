import express from 'express';
import Stripe from 'stripe';
import bodyParser from 'body-parser';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const router = express.Router();

// Use raw body for webhook signature verification
router.post('/', bodyParser.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('❌ Stripe Webhook Error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle event types
  switch (event.type) {
    case 'checkout.session.completed':
      console.log('✅ Checkout completed:', event.data.object);
      // TODO: activate subscription in DB
      break;
    case 'invoice.paid':
      console.log('💰 Invoice paid:', event.data.object);
      break;
    case 'invoice.payment_failed':
      console.warn('❌ Payment failed:', event.data.object);
      break;
    case 'customer.subscription.deleted':
      console.log('🚫 Subscription cancelled:', event.data.object);
      break;
    case 'customer.subscription.updated':
      console.log('🔄 Subscription updated:', event.data.object);
      break;
    default:
      console.log(`🔔 Unhandled event type: ${event.type}`);
  }

  res.status(200).json({ received: true });
});

export default router;
