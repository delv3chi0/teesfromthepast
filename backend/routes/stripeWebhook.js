// backend/routes/stripeWebhook.js
import express from 'express';
import Stripe from 'stripe';
import 'dotenv/config';
import Order from '../models/Order.js'; // Import your Order model
// Ensure raw body parsing for Stripe webhooks BEFORE this route if it's global,
// or use express.raw({type: 'application/json'}) specifically for this route.
// router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => { ... });


const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error(` Stripe webhook signature error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntentSucceeded = event.data.object;
      console.log('[Webhook] PaymentIntent succeeded:', paymentIntentSucceeded.id);
      
      // --- Create Order ---
      try {
        const existingOrder = await Order.findOne({ paymentIntentId: paymentIntentSucceeded.id });
        if (existingOrder) {
          console.log(`[Webhook] Order already exists for PaymentIntent ${paymentIntentSucceeded.id}.`);
          // Optionally update status if needed, though 'succeeded' should be final for payment.
          existingOrder.paymentStatus = paymentIntentSucceeded.status;
          await existingOrder.save();
          return res.json({ received: true, message: 'Order already exists.' });
        }

        const metadata = paymentIntentSucceeded.metadata;
        const userId = metadata.userId;
        const orderDetailsString = metadata.orderDetails; // This is a JSON string

        if (!userId || !orderDetailsString) {
          console.error('[Webhook] Missing userId or orderDetails in PaymentIntent metadata for PI_ID:', paymentIntentSucceeded.id);
          // Potentially send an alert to admin, but don't stop Stripe from getting a 200
          return res.status(400).send('Webhook Error: Missing critical metadata.');
        }
        
        const orderItemsFromMeta = JSON.parse(orderDetailsString);

        // The shipping details are on the PaymentIntent object itself
        const shippingDetails = paymentIntentSucceeded.shipping;
        if (!shippingDetails || !shippingDetails.address) {
            console.error('[Webhook] Missing shipping details in PaymentIntent for PI_ID:', paymentIntentSucceeded.id);
            return res.status(400).send('Webhook Error: Missing shipping details.');
        }
        
        // Construct the billing address. For now, assuming it's the same as shipping
        // If you collect distinct billing on checkout and save to PI, use that.
        // Otherwise, you might need to retrieve it from user profile if "billing same as shipping" was true
        // For simplicity, let's assume billing was passed to PI metadata or is same as shipping
        const billingAddr = metadata.billingAddress ? JSON.parse(metadata.billingAddress) : shippingDetails;


        const newOrder = new Order({
          user: userId,
          items: orderItemsFromMeta.map(item => ({
            productId: item.productId,
            productName: item.productName,
            productType: item.productType,
            size: item.size,
            color: item.color,
            quantity: item.quantity,
            priceAtPurchase: item.priceAtPurchase, // Price per item in cents
            designImageUrl: item.designImageUrl,
            designPrompt: item.designPrompt,
          })),
          totalAmount: paymentIntentSucceeded.amount, // Total in cents
          currency: paymentIntentSucceeded.currency,
          shippingAddress: {
            recipientName: shippingDetails.name,
            street1: shippingDetails.address.line1,
            street2: shippingDetails.address.line2,
            city: shippingDetails.address.city,
            state: shippingDetails.address.state,
            zipCode: shippingDetails.address.postal_code,
            country: shippingDetails.address.country,
            phone: shippingDetails.phone,
          },
          // For billingAddress: If you passed distinct billing address in PI metadata, use it.
          // Otherwise, if it was same as shipping, you can copy shipping.
          // The profile page saves both shipping and billing to user's profile.
          // CheckoutPage.jsx PUTs both to /auth/profile *before* creating PI.
          // If you want the *actual* billing address used for the transaction, it should ideally be passed in PI metadata too.
          // For now, assuming it was the same or handled similarly to shipping:
          billingAddress: { // This is a simplification; you should ideally get this from PI metadata or context.
            recipientName: billingAddr.name || shippingDetails.name,
            street1: billingAddr.address.line1 || shippingDetails.address.line1,
            street2: billingAddr.address.line2 || shippingDetails.address.line2,
            city: billingAddr.address.city || shippingDetails.address.city,
            state: billingAddr.address.state || shippingDetails.address.state,
            zipCode: billingAddr.address.postal_code || shippingDetails.address.postal_code,
            country: billingAddr.address.country || shippingDetails.address.country,
            phone: billingAddr.phone || shippingDetails.phone,
          },
          paymentIntentId: paymentIntentSucceeded.id,
          paymentStatus: paymentIntentSucceeded.status, // Should be 'succeeded'
          orderStatus: 'Processing', // Update from 'Pending Confirmation'
        });

        await newOrder.save();
        console.log(`[Webhook] Order ${newOrder._id} created for PaymentIntent ${paymentIntentSucceeded.id}`);
        // You might want to send a confirmation email to the user here.

      } catch (dbError) {
        console.error(`[Webhook] Error creating order or database error: ${dbError.message} for PI_ID: ${paymentIntentSucceeded.id}`, dbError.stack);
        // If order creation fails, this is critical. You need a retry mechanism or admin alert.
        // For Stripe, still return 200 if event was valid, to prevent Stripe from retrying this specific event delivery.
        // Log the error thoroughly for manual intervention.
        return res.status(500).send(`Webhook DB Error: ${dbError.message}`); // Or 200 with logged error
      }
      break;

    case 'payment_intent.payment_failed':
      const paymentIntentFailed = event.data.object;
      console.log('[Webhook] PaymentIntent failed:', paymentIntentFailed.id, paymentIntentFailed.last_payment_error?.message);
      // Optional: Update an existing order if it was created in a 'pending' state, or log.
      try {
          const orderToUpdate = await Order.findOne({ paymentIntentId: paymentIntentFailed.id });
          if (orderToUpdate) {
              orderToUpdate.paymentStatus = paymentIntentFailed.status; // 'failed' or specific status
              orderToUpdate.orderStatus = 'Cancelled'; // Or 'Payment Failed'
              await orderToUpdate.save();
              console.log(`[Webhook] Order ${orderToUpdate._id} updated to payment_failed.`);
          }
      } catch (dbError) {
          console.error(`[Webhook] DB error updating order for failed PI ${paymentIntentFailed.id}: ${dbError.message}`);
      }
      break;

    // ... handle other event types
    default:
      console.log(`[Webhook] Unhandled event type ${event.type}`);
  }

  // Return a response to acknowledge receipt of the event
  res.json({received: true});
});

export default router;
