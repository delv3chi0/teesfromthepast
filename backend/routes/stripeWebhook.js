// backend/routes/stripeWebhook.js
import express from 'express';
import Stripe from 'stripe';
import 'dotenv/config';
import Order from '../models/Order.js'; // Import your Order model

const router = express.Router();

if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("CRITICAL: Stripe Secret Key or Webhook Secret is not defined in .env!");
    // Potentially throw an error or exit if these are critical for startup
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Use express.raw for this specific route to get the raw body for signature verification
router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  console.log('=====================================================');
  console.log('[Webhook] Received a request to /webhook endpoint.');
  const sig = req.headers['stripe-signature'];
  let event;

  if (!webhookSecret) {
      console.error('[Webhook] CRITICAL ERROR: Webhook secret is not configured on the server.');
      return res.status(500).send('Webhook secret not configured.');
  }

  try {
    console.log('[Webhook] Attempting to construct event...');
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    console.log(`[Webhook] Event constructed successfully. Type: ${event.type}, ID: ${event.id}`);
  } catch (err) {
    console.error(`[Webhook] ERROR constructing event or signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntentSucceeded = event.data.object;
      console.log('-----------------------------------------------------');
      console.log('[Webhook] Processing payment_intent.succeeded for PI ID:', paymentIntentSucceeded.id);
      console.log('[Webhook] PaymentIntent Status:', paymentIntentSucceeded.status);
      console.log('[Webhook] PaymentIntent Amount:', paymentIntentSucceeded.amount, paymentIntentSucceeded.currency);
      console.log('[Webhook] Full PaymentIntent Metadata from Stripe:', JSON.stringify(paymentIntentSucceeded.metadata, null, 2));

      const userId = paymentIntentSucceeded.metadata.userId;
      const orderDetailsString = paymentIntentSucceeded.metadata.orderDetails;

      console.log('[Webhook] Extracted UserID from metadata:', userId);
      console.log('[Webhook] Extracted orderDetailsString from metadata:', orderDetailsString);

      if (!userId) {
        console.error('[Webhook] CRITICAL ERROR: Missing userId in PaymentIntent metadata. PI_ID:', paymentIntentSucceeded.id);
        // Return 200 to Stripe to acknowledge receipt, but log error for investigation.
        // Order cannot be created without userId.
        return res.status(200).json({ received: true, error: 'Missing userId in metadata, order not created.' });
      }
      if (!orderDetailsString) {
        console.error('[Webhook] CRITICAL ERROR: Missing orderDetailsString in PaymentIntent metadata. PI_ID:', paymentIntentSucceeded.id);
        return res.status(200).json({ received: true, error: 'Missing orderDetailsString in metadata, order not created.' });
      }

      let orderItemsFromMeta;
      try {
        orderItemsFromMeta = JSON.parse(orderDetailsString);
        console.log('[Webhook] Parsed orderDetails from metadata:', orderItemsFromMeta);
        if (!Array.isArray(orderItemsFromMeta) || orderItemsFromMeta.length === 0) {
            console.error('[Webhook] CRITICAL ERROR: Parsed orderDetails is not a valid array or is empty. PI_ID:', paymentIntentSucceeded.id);
            return res.status(200).json({ received: true, error: 'Invalid orderDetails in metadata, order not created.' });
        }
      } catch (parseError) {
        console.error('[Webhook] CRITICAL ERROR: Failed to parse orderDetailsString JSON. PI_ID:', paymentIntentSucceeded.id, 'Error:', parseError, 'String was:', orderDetailsString);
        return res.status(200).json({ received: true, error: 'Failed to parse orderDetails, order not created.' });
      }

      const shippingDetails = paymentIntentSucceeded.shipping;
      console.log('[Webhook] Shipping Details from PaymentIntent:', shippingDetails);

      if (!shippingDetails || !shippingDetails.address || !shippingDetails.name) {
          console.error('[Webhook] CRITICAL ERROR: Missing or incomplete shipping details in PaymentIntent. PI_ID:', paymentIntentSucceeded.id);
          return res.status(200).json({ received: true, error: 'Missing shipping details, order not created.' });
      }
      
      // Placeholder for billing address - ideally, pass this in metadata if distinct
      const billingAddressUsed = paymentIntentSucceeded.metadata.billingAddress
        ? JSON.parse(paymentIntentSucceeded.metadata.billingAddress) // Assuming it was stringified
        : { // Fallback to shipping if not provided or structure it as needed
            recipientName: shippingDetails.name,
            ...shippingDetails.address // Spread the address sub-object
          };
      console.log('[Webhook] Billing Address to be used for order:', billingAddressUsed);


      try {
        console.log('[Webhook] Checking for existing order with PI_ID:', paymentIntentSucceeded.id);
        const existingOrder = await Order.findOne({ paymentIntentId: paymentIntentSucceeded.id });
        
        if (existingOrder) {
          console.log(`[Webhook] Order ${existingOrder._id} already exists for PaymentIntent ${paymentIntentSucceeded.id}. Current payment_status: ${existingOrder.paymentStatus}`);
          if (existingOrder.paymentStatus !== 'succeeded' && paymentIntentSucceeded.status === 'succeeded') {
            existingOrder.paymentStatus = paymentIntentSucceeded.status;
            existingOrder.orderStatus = existingOrder.orderStatus === 'Pending Confirmation' ? 'Processing' : existingOrder.orderStatus; // Update if it was pending
            await existingOrder.save();
            console.log(`[Webhook] Updated existing order ${existingOrder._id} status to ${paymentIntentSucceeded.status}.`);
          }
        } else {
          console.log('[Webhook] No existing order found. Attempting to create new order for PI_ID:', paymentIntentSucceeded.id);
          const newOrderData = {
            user: userId,
            items: orderItemsFromMeta.map(item => ({
              productId: item.productId,
              productName: item.productName || 'N/A',
              productType: item.productType || 'N/A',
              size: item.size,
              color: item.color,
              quantity: item.quantity,
              priceAtPurchase: item.priceAtPurchase,
              designImageUrl: item.designImageUrl,
              designPrompt: item.designPrompt,
            })),
            totalAmount: paymentIntentSucceeded.amount,
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
            billingAddress: { // Use the prepared billingAddressUsed
                recipientName: billingAddressUsed.recipientName || shippingDetails.name, // Fallback
                street1: billingAddressUsed.line1 || shippingDetails.address.line1,
                street2: billingAddressUsed.line2 || shippingDetails.address.line2,
                city: billingAddressUsed.city || shippingDetails.address.city,
                state: billingAddressUsed.state || shippingDetails.address.state,
                zipCode: billingAddressUsed.postal_code || shippingDetails.address.postal_code,
                country: billingAddressUsed.country || shippingDetails.address.country,
                phone: billingAddressUsed.phone || shippingDetails.phone,
            },
            paymentIntentId: paymentIntentSucceeded.id,
            paymentStatus: paymentIntentSucceeded.status,
            orderStatus: 'Processing', // Or 'Pending Confirmation' initially
          };
          console.log('[Webhook] Constructed new order data:', JSON.stringify(newOrderData, null, 2));
          const newOrder = new Order(newOrderData);
          await newOrder.save();
          console.log(`[Webhook] New order ${newOrder._id} CREATED successfully for PI_ID: ${paymentIntentSucceeded.id}`);
          // TODO: Consider sending order confirmation email here
        }
      } catch (dbError) {
        console.error(`[Webhook] DATABASE ERROR during order creation/update for PI_ID: ${paymentIntentSucceeded.id}. Error:`, dbError.message, dbError.stack);
        // Important: Return 500 to tell Stripe something went wrong on your end,
        // Stripe will retry. If it's a permanent issue (e.g., bad data that won't resolve),
        // you might eventually return 200 after logging to stop retries for that specific event.
        // For now, 500 is okay for retry attempts if it's a transient DB issue.
        return res.status(500).send(`Webhook database processing error: ${dbError.message}`);
      }
      console.log('-----------------------------------------------------');
      break;

    case 'payment_intent.payment_failed':
      const paymentIntentFailed = event.data.object;
      console.log('-----------------------------------------------------');
      console.log('[Webhook] Received payment_intent.payment_failed for PI ID:', paymentIntentFailed.id);
      if (paymentIntentFailed.last_payment_error) {
        console.log('[Webhook] Payment failure reason:', paymentIntentFailed.last_payment_error.message);
      }
      // Optional: Update an order status if it exists
      try {
          const orderToUpdate = await Order.findOne({ paymentIntentId: paymentIntentFailed.id });
          if (orderToUpdate) {
              orderToUpdate.paymentStatus = paymentIntentFailed.status; // e.g., 'requires_payment_method'
              orderToUpdate.orderStatus = 'Payment Failed'; // Update order status
              await orderToUpdate.save();
              console.log(`[Webhook] Order ${orderToUpdate._id} updated to status: Payment Failed.`);
          } else {
              console.log('[Webhook] No existing order found to update for failed PI_ID:', paymentIntentFailed.id);
          }
      } catch (dbError) {
          console.error(`[Webhook] DB error updating order for failed PI_ID ${paymentIntentFailed.id}: ${dbError.message}`);
      }
      console.log('-----------------------------------------------------');
      break;
    
    // ... potentially handle other event types like 'charge.succeeded' if needed,
    // or other PaymentIntent statuses.

    default:
      console.log(`[Webhook] Unhandled event type: ${event.type}. Event ID: ${event.id}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  console.log(`[Webhook] Finished processing event ID: ${event.id}. Sending 200 OK to Stripe.`);
  console.log('=====================================================');
  res.status(200).json({received: true});
});

export default router;
