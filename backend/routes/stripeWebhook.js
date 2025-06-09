// backend/routes/stripeWebhook.js
import express from 'express';
import Stripe from 'stripe';
import 'dotenv/config';
import Order from '../models/Order.js'; // Your Order model
import Product from '../models/Product.js'; // --- IMPORT a Product model to update stock ---
import Design from '../models/Design.js'; // To get full image URL

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

    if (!stripe || !webhookSecret) {
        console.error('[Webhook] CRITICAL ERROR: Stripe or Webhook secret not configured.');
        return res.status(500).send('Server configuration error for webhooks.');
    }

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
        console.log(`[Webhook] Event constructed successfully. Type: ${event.type}, ID: ${event.id}`);
    } catch (err) {
        console.error(`[Webhook] ERROR constructing event or signature verification failed: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // --- ENTIRE LOGIC FOR payment_intent.succeeded HAS BEEN REBUILT ---
    if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        console.log('-----------------------------------------------------');
        console.log('[Webhook] Processing payment_intent.succeeded for PI ID:', paymentIntent.id);
        console.log('[Webhook] Full PaymentIntent Metadata from Stripe:', JSON.stringify(paymentIntent.metadata, null, 2));

        try {
            // 1. Check if order already exists to prevent duplicates
            const existingOrder = await Order.findOne({ paymentIntentId: paymentIntent.id });
            if (existingOrder) {
                console.log(`[Webhook] Order ${existingOrder._id} already exists for PaymentIntent ${paymentIntent.id}. Ignoring event.`);
                return res.status(200).json({ received: true, message: 'Order already processed.' });
            }

            // 2. Extract and parse metadata
            const { userId, orderDetails } = paymentIntent.metadata;
            if (!userId || !orderDetails) {
                throw new Error('Missing userId or orderDetails in PaymentIntent metadata.');
            }
            const itemsFromMeta = JSON.parse(orderDetails);
            if (!Array.isArray(itemsFromMeta) || itemsFromMeta.length === 0) {
                throw new Error('Parsed orderDetails is not a valid array or is empty.');
            }

            // 3. Prepare order items for our database schema
            const orderItems = [];
            for (const item of itemsFromMeta) {
                // Fetch the design to get the full image URL, as it's not stored in metadata
                const designDoc = await Design.findById(item.designId);
                orderItems.push({
                    productId: item.productId,
                    designId: item.designId,
                    name: item.productName, // The name of the base product, e.g., "Men's Premium Tee"
                    quantity: item.quantity,
                    price: item.priceAtPurchase, // Price in cents, matching totalAmount
                    size: item.size,
                    color: item.color,
                    customImageURL: designDoc ? designDoc.imageDataUrl : '', // The AI-generated design image URL
                    // Note: We'll need to add sku to the OrderItem schema if we want to store it there. For now, we use it to find the variant.
                });
            }
            console.log('[Webhook] Successfully prepared orderItems for DB:', JSON.stringify(orderItems, null, 2));


            // 4. Get shipping details from the Payment Intent
            const shippingDetails = paymentIntent.shipping;
            if (!shippingDetails || !shippingDetails.address || !shippingDetails.name) {
                throw new Error('Missing or incomplete shipping details in PaymentIntent.');
            }

            // 5. Create the new order document
            const newOrder = new Order({
                user: userId,
                orderItems: orderItems,
                totalAmount: paymentIntent.amount, // Amount is already in cents from Stripe
                shippingAddress: {
                    recipientName: shippingDetails.name,
                    street: shippingDetails.address.line1, // Assuming street is in line1
                    city: shippingDetails.address.city,
                    state: shippingDetails.address.state,
                    zipCode: shippingDetails.address.postal_code,
                    country: shippingDetails.address.country,
                },
                paymentIntentId: paymentIntent.id,
                paymentStatus: 'Succeeded',
                orderStatus: 'Processing', // Start as Processing since payment is confirmed
            });

            await newOrder.save();
            console.log(`[Webhook] New order ${newOrder._id} CREATED successfully for PI_ID: ${paymentIntent.id}`);

            // 6. Decrement stock levels (CRUCIAL)
            console.log('[Webhook] Attempting to update stock levels...');
            for (const item of itemsFromMeta) {
                await Product.updateOne(
                    { _id: item.productId, 'variants.sku': item.variantSku },
                    { $inc: { 'variants.$.stock': -item.quantity } }
                );
                console.log(`[Webhook] Decremented stock for product ${item.productId}, variant SKU ${item.variantSku} by ${item.quantity}.`);
            }
            console.log('[Webhook] Stock levels updated successfully.');

        } catch (err) {
            console.error(`[Webhook] DATABASE or PROCESSING ERROR for PI_ID: ${paymentIntent.id}. Error:`, err.message, err.stack);
            // We return a 500 error to tell Stripe to retry the webhook later.
            // If we returned 200, Stripe would think we succeeded and would not try again.
            return res.status(500).json({ error: 'Failed to process webhook event on our server.' });
        }
    } else {
        console.log(`[Webhook] Unhandled event type: ${event.type}. Event ID: ${event.id}`);
    }

    // Acknowledge receipt of the event
    console.log(`[Webhook] Finished processing event ID: ${event.id}. Sending 200 OK to Stripe.`);
    console.log('=====================================================');
    res.status(200).json({ received: true });
});

export default router;
