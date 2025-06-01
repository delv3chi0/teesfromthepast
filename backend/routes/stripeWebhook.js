// backend/routes/stripeWebhook.js
import express from 'express';
import Stripe from 'stripe';
import 'dotenv/config';
import Order from '../models/Order.js'; // Your Order model
import Design from '../models/Design.js'; // Import your Design model

const router = express.Router();

if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("[Webhook] CRITICAL STARTUP ERROR: Stripe Secret Key or Webhook Secret is not defined in .env!");
}

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  console.log('=====================================================');
  console.log(`[Webhook] Timestamp: ${new Date().toISOString()} - Received a request to /webhook endpoint.`);
  const sig = req.headers['stripe-signature'];
  let event;

  if (!stripe) {
    console.error('[Webhook] CRITICAL ERROR: Stripe SDK not initialized. Check STRIPE_SECRET_KEY.');
    return res.status(500).send('Stripe SDK not configured on the server.');
  }
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
    console.error(`[Webhook] Request body (first 200 chars): ${req.body.toString().substring(0,200)}`);
    console.error(`[Webhook] Stripe Signature: ${sig}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

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
      console.log('[Webhook] Extracted orderDetailsString from metadata (first 200 chars):', orderDetailsString ? orderDetailsString.substring(0,200) + '...' : 'Not found');

      if (!userId) {
        console.error('[Webhook] CRITICAL ERROR: Missing userId in PaymentIntent metadata. PI_ID:', paymentIntentSucceeded.id);
        return res.status(200).json({ received: true, error: 'Missing userId in metadata, order not created.' });
      }
      if (!orderDetailsString) {
        console.error('[Webhook] CRITICAL ERROR: Missing orderDetailsString in PaymentIntent metadata. PI_ID:', paymentIntentSucceeded.id);
        return res.status(200).json({ received: true, error: 'Missing orderDetailsString in metadata, order not created.' });
      }

      let orderItemsFromMeta;
      try {
        orderItemsFromMeta = JSON.parse(orderDetailsString);
        console.log('[Webhook] Parsed orderDetails from metadata (first item if exists):', orderItemsFromMeta && orderItemsFromMeta.length > 0 ? JSON.stringify(orderItemsFromMeta[0], null, 2) : 'Empty or invalid array');
        if (!Array.isArray(orderItemsFromMeta) || orderItemsFromMeta.length === 0) {
            console.error('[Webhook] CRITICAL ERROR: Parsed orderDetails is not a valid array or is empty. PI_ID:', paymentIntentSucceeded.id);
            return res.status(200).json({ received: true, error: 'Invalid orderDetails in metadata, order not created.' });
        }
      } catch (parseError) {
        console.error('[Webhook] CRITICAL ERROR: Failed to parse orderDetailsString JSON. PI_ID:', paymentIntentSucceeded.id, 'Error:', parseError.message, 'String was (first 200 chars):', orderDetailsString.substring(0,200));
        return res.status(200).json({ received: true, error: 'Failed to parse orderDetails, order not created.' });
      }

      const shippingDetails = paymentIntentSucceeded.shipping;
      console.log('[Webhook] Shipping Details from PaymentIntent:', JSON.stringify(shippingDetails, null, 2));

      if (!shippingDetails || !shippingDetails.address || !shippingDetails.name) {
          console.error('[Webhook] CRITICAL ERROR: Missing or incomplete shipping details in PaymentIntent. PI_ID:', paymentIntentSucceeded.id);
          return res.status(200).json({ received: true, error: 'Missing shipping details, order not created.' });
      }
      
      const billingAddressUsed = paymentIntentSucceeded.metadata.billingAddress
        ? JSON.parse(paymentIntentSucceeded.metadata.billingAddress)
        : { recipientName: shippingDetails.name, ...shippingDetails.address };
      console.log('[Webhook] Billing Address to be used for order:', JSON.stringify(billingAddressUsed, null, 2));

      try {
        console.log('[Webhook] Checking for existing order with PI_ID:', paymentIntentSucceeded.id);
        const existingOrder = await Order.findOne({ paymentIntentId: paymentIntentSucceeded.id });
        
        if (existingOrder) {
          console.log(`[Webhook] Order ${existingOrder._id} already exists for PaymentIntent ${paymentIntentSucceeded.id}. Current payment_status: ${existingOrder.paymentStatus}`);
          if (existingOrder.paymentStatus !== 'succeeded' && paymentIntentSucceeded.status === 'succeeded') {
            existingOrder.paymentStatus = paymentIntentSucceeded.status;
            existingOrder.orderStatus = existingOrder.orderStatus === 'Pending Confirmation' ? 'Processing' : existingOrder.orderStatus;
            await existingOrder.save();
            console.log(`[Webhook] Updated existing order ${existingOrder._id} status to ${paymentIntentSucceeded.status}.`);
          }
        } else {
          console.log('[Webhook] No existing order found. Attempting to create new order for PI_ID:', paymentIntentSucceeded.id);
          
          const populatedOrderItems = [];
          for (const metaItem of orderItemsFromMeta) {
            let actualDesignImageUrl = metaItem.designImageUrl; // This would be undefined if not in lean metadata

            if (metaItem.productId && !actualDesignImageUrl) { // productId from metadata is the designId
                console.log(`[Webhook] Attempting to fetch Design doc for ID: ${metaItem.productId} to get full imageDataUrl.`);
                try {
                    const designDoc = await Design.findById(metaItem.productId);
                    if (designDoc && designDoc.imageDataUrl) {
                        actualDesignImageUrl = designDoc.imageDataUrl;
                        console.log(`[Webhook] Successfully fetched imageDataUrl for design ${metaItem.productId}.`);
                    } else {
                        console.warn(`[Webhook] Could not find design document or imageDataUrl for designId: ${metaItem.productId}. designImageUrl in Order will be undefined.`);
                    }
                } catch (designFetchError) {
                    console.error(`[Webhook] Error fetching design ${metaItem.productId}: ${designFetchError.message}. designImageUrl in Order will be undefined.`);
                }
            } else if (actualDesignImageUrl) {
                 console.log(`[Webhook] designImageUrl was already present in metadata for item ${metaItem.productId} (this is unexpected if metadata is lean).`);
            }


            populatedOrderItems.push({
              productId: metaItem.productId, // This is the designId
              productName: metaItem.productName || 'N/A',
              productType: metaItem.productType || 'N/A',
              size: metaItem.size,
              color: metaItem.color,
              quantity: metaItem.quantity,
              priceAtPurchase: metaItem.priceAtPurchase,
              designImageUrl: actualDesignImageUrl, // Potentially populated from Design doc
              designPrompt: metaItem.designPrompt, // From metadata (possibly truncated)
            });
          }
          console.log('[Webhook] Populated order items (first item if exists):', populatedOrderItems.length > 0 ? JSON.stringify(populatedOrderItems[0], (key, value) => key === 'designImageUrl' && value ? value.substring(0,50) + '...' : value, 2) : 'No items');


          const newOrderData = {
            user: userId,
            items: populatedOrderItems,
            totalAmount: paymentIntentSucceeded.amount,
            currency: paymentIntentSucceeded.currency,
            shippingAddress: {
              recipientName: shippingDetails.name,
              street1: shippingDetails.address.line1,
              street2: shippingDetails.address.line2 || '',
              city: shippingDetails.address.city,
              state: shippingDetails.address.state,
              zipCode: shippingDetails.address.postal_code,
              country: shippingDetails.address.country,
              phone: shippingDetails.phone || '',
            },
            billingAddress: {
              recipientName: billingAddressUsed.recipientName || shippingDetails.name,
              street1: billingAddressUsed.line1 || shippingDetails.address.line1,
              street2: billingAddressUsed.line2 || '',
              city: billingAddressUsed.city || shippingDetails.address.city,
              state: billingAddressUsed.state || shippingDetails.address.state,
              zipCode: billingAddressUsed.postal_code || shippingDetails.address.postal_code,
              country: billingAddressUsed.country || shippingDetails.address.country,
              phone: billingAddressUsed.phone || '',
            },
            paymentIntentId: paymentIntentSucceeded.id,
            paymentStatus: paymentIntentSucceeded.status,
            orderStatus: 'Processing',
          };
          console.log('[Webhook] Attempting to save new order. Data (items stringified for brevity):', JSON.stringify({...newOrderData, items: `[${newOrderData.items.length} items]`}, null, 2) );
          const newOrder = new Order(newOrderData);
          await newOrder.save();
          console.log(`[Webhook] New order ${newOrder._id} CREATED successfully for PI_ID: ${paymentIntentSucceeded.id}`);
        }
      } catch (dbError) {
        console.error(`[Webhook] DATABASE ERROR during order creation/update for PI_ID: ${paymentIntentSucceeded.id}. Error:`, dbError.message, dbError.stack);
        // Return 500 to tell Stripe something went wrong so it can retry.
        return res.status(500).send(`Webhook database processing error: ${dbError.message}`);
      }
      console.log('-----------------------------------------------------');
      break;

    case 'payment_intent.payment_failed':
      const paymentIntentFailed = event.data.object;
      console.log('-----------------------------------------------------');
      console.log('[Webhook] Received payment_intent.payment_failed for PI ID:', paymentIntentFailed.id);
      // ... (rest of payment_failed logic)
      console.log('-----------------------------------------------------');
      break;
    
    default:
      console.log(`[Webhook] Unhandled event type: ${event.type}. Event ID: ${event.id}`);
  }

  console.log(`[Webhook] Finished processing event ID: ${event.id}. Sending 200 OK to Stripe.`);
  console.log('=====================================================');
  res.status(200).json({received: true});
});

export default router;
