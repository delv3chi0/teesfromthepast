// backend/routes/checkout.js
import express from 'express';
import Stripe from 'stripe';
import 'dotenv/config';
import { protect } from '../middleware/authMiddleware.js';
// Example: import Design from '../models/Design.js'; // If you need to fetch design details

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// --- IMPORTANT ---
// TODO: Replace these placeholder functions with your actual secure backend logic
// to determine prices and get full item details. Never trust prices from the client.
async function getPriceInCents(item) {
  console.log('[Checkout] getPriceInCents for item:', item);
  // This is a placeholder. Implement your pricing logic here.
  // Example: Fetch product from DB, check variants, apply discounts, etc.
  if (item.productType === 'T-Shirt') return 2500; // $25.00
  if (item.productType === 'Hoodie') return 4000; // $40.00
  console.warn(`[Checkout] No specific price found for productType: ${item.productType}, defaulting.`);
  return 2000; // Default price if not found
}

async function getItemDetailsForOrder(item) {
  console.log('[Checkout] getItemDetailsForOrder for item:', item);
  // This is a placeholder. Fetch actual details from your database (e.g., Design model).
  // const design = await Design.findById(item.id); // Example
  // if (!design) {
  //   console.error(`[Checkout] Design/Product not found for ID: ${item.id}`);
  //   throw new Error(`Product details not found for item ID ${item.id}`);
  // }
  return {
    productId: item.id, // Should be the unique ID of the design/product
    productName: `Custom ${item.productType || 'Apparel'} (${item.color || 'N/A'}, ${item.size || 'N/A'})`, // Make this more descriptive
    productType: item.productType,
    size: item.size,
    color: item.color,
    // designImageUrl: design ? design.imageDataUrl : item.imageDataUrl, // Use actual URL from DB or passed item
    // designPrompt: design ? design.prompt : item.prompt,
  };
}
// --- END IMPORTANT ---

router.post('/create-payment-intent', protect, async (req, res) => {
  console.log('-----------------------------------------------------');
  console.log('[Checkout] /create-payment-intent route hit');
  const { items, currency = 'usd', shippingAddress } = req.body;
  console.log('[Checkout] Request body items:', items);
  console.log('[Checkout] Request body currency:', currency);
  console.log('[Checkout] Request body shippingAddress:', shippingAddress);

  if (!process.env.STRIPE_SECRET_KEY) {
    console.error("[Checkout] CRITICAL ERROR: Stripe secret key not configured.");
    return res.status(500).json({ error: 'Stripe payments are not configured on the server.' });
  }
  if (!items || !Array.isArray(items) || items.length === 0) {
    console.error("[Checkout] ERROR: No items provided or items is not an array.");
    return res.status(400).json({ error: 'No items provided for payment.' });
  }
  if (!shippingAddress || typeof shippingAddress !== 'object' || Object.keys(shippingAddress).length === 0) {
    console.error("[Checkout] ERROR: Shipping address is missing or invalid.");
    return res.status(400).json({ error: 'Shipping address is required.' });
  }

  try {
    let amountInCents = 0;
    const orderItemsForMetadata = [];

    console.log('[Checkout] Processing items to calculate total and prepare metadata...');
    for (const item of items) {
      if (!item || typeof item !== 'object' || !item.id || !item.productType) {
        console.error('[Checkout] ERROR: Invalid item structure in items array:', item);
        throw new Error('Invalid item data received.'); // Or handle more gracefully
      }
      console.log('[Checkout] Processing item:', item);
      const pricePerItemCents = await getPriceInCents(item);
      const quantity = parseInt(item.quantity, 10) || 1;
      amountInCents += pricePerItemCents * quantity;
      console.log(`[Checkout] Item: ${item.id}, Price/Item: ${pricePerItemCents}, Qty: ${quantity}, Subtotal for item: ${pricePerItemCents * quantity}`);

      const itemDetails = await getItemDetailsForOrder(item);
      orderItemsForMetadata.push({
        ...itemDetails,
        quantity: quantity,
        priceAtPurchase: pricePerItemCents,
        designImageUrl: item.imageDataUrl, // Passed from CheckoutPage.jsx designToCheckout
        designPrompt: item.prompt,         // Passed from CheckoutPage.jsx designToCheckout
      });
    }
    console.log('[Checkout] Total calculated amount (cents):', amountInCents);
    console.log('[Checkout] Items prepared for PaymentIntent metadata:', orderItemsForMetadata);


    if (amountInCents <= 0) {
        console.error("[Checkout] ERROR: Invalid order amount calculated (must be > 0). Amount:", amountInCents);
        return res.status(400).json({ error: 'Invalid order amount.'});
    }

    const paymentIntentParams = {
      amount: amountInCents,
      currency: currency,
      automatic_payment_methods: { enabled: true },
      metadata: {
        userId: req.user.id,
        orderDetails: JSON.stringify(orderItemsForMetadata),
        // Consider adding stringified billingAddress if it can be distinct and is collected
        // billingAddress: billingAddress ? JSON.stringify(processedBillingAddress) : undefined,
      },
      shipping: {
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
      },
    };
    
    console.log(`[Checkout] Creating PaymentIntent for user ${req.user.id}. Amount: ${amountInCents} ${currency.toUpperCase()}`);
    console.log('[Checkout] Full PaymentIntent Params to Stripe:', JSON.stringify(paymentIntentParams, null, 2)); // Pretty print
    
    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);
    console.log('[Checkout] PaymentIntent created successfully. ID:', paymentIntent.id, 'Client Secret:', paymentIntent.client_secret ? '******' : 'NOT FOUND');

    res.send({
      clientSecret: paymentIntent.client_secret,
      amount: amountInCents,
      currency: currency,
    });

  } catch (error) {
    console.error("[Checkout] CRITICAL ERROR creating payment intent:", error.message, error.stack);
    res.status(500).send({ error: { message: `Failed to create payment intent: ${error.message}` } });
  } finally {
    console.log('[Checkout] /create-payment-intent request finished');
    console.log('-----------------------------------------------------');
  }
});

export default router;
