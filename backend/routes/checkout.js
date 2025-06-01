// backend/routes/checkout.js
import express from 'express';
import Stripe from 'stripe';
import 'dotenv/config';
import { protect } from '../middleware/authMiddleware.js';
// Assume you have a way to get product details and prices, e.g., from a DB or config
// For example: import Product from '../models/Product.js'; // If you have a Product model for standard items
// Or import Design from '../models/Design.js'; // If prices depend on design or custom aspects

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Placeholder function to get product price (replace with your actual logic)
// This needs to be secure and fetch prices from your backend data.
async function getPriceInCents(item) {
  // Example: if item.id is a designId and productType determines base price
  // This is highly simplified. Your logic will depend on your product structure.
  if (item.productType === 'T-Shirt') return 2500; // $25.00
  if (item.productType === 'Hoodie') return 4000; // $40.00
  return 2000; // Default price
}

// Placeholder to get item name/details (you might fetch from Design model)
async function getItemDetailsForOrder(item) {
    // Fetch from Design model if item.id is designId, etc.
    // const design = await Design.findById(item.id);
    return {
        productId: item.id, // This would be the designId from your 'items'
        productName: `Custom ${item.productType} (${item.color}, ${item.size})`, // Be more specific
        productType: item.productType,
        size: item.size,
        color: item.color,
        // designImageUrl: design ? design.imageDataUrl : item.imageDataUrl, // from your 'items' object passed by client
        // designPrompt: design ? design.prompt : item.prompt, // from your 'items' object
    };
}


router.post('/create-payment-intent', protect, async (req, res) => {
  const { items, currency = 'usd', shippingAddress } = req.body; // items from frontend

  if (!process.env.STRIPE_SECRET_KEY) {
    console.error("[Payment Intent] Stripe secret key not configured.");
    return res.status(500).json({ error: 'Stripe payments are not configured on the server.' });
  }
  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'No items provided for payment.' });
  }
  if (!shippingAddress) {
    return res.status(400).json({ error: 'Shipping address is required.' });
  }

  try {
    let amountInCents = 0;
    const orderItemsForMetadata = [];

    for (const item of items) {
      const pricePerItemCents = await getPriceInCents(item); // Implement this!
      amountInCents += pricePerItemCents * (item.quantity || 1);
      
      const itemDetails = await getItemDetailsForOrder(item); // Implement this!
      orderItemsForMetadata.push({
        ...itemDetails, // Contains productId, productName, productType, size, color etc.
        quantity: item.quantity || 1,
        priceAtPurchase: pricePerItemCents, // Price per item in cents
        designImageUrl: item.imageDataUrl, // Passed from CheckoutPage.jsx designToCheckout
        designPrompt: item.prompt, // Passed from CheckoutPage.jsx designToCheckout
      });
    }

    if (amountInCents <= 0) {
        return res.status(400).json({ error: 'Invalid order amount.'});
    }

    const paymentIntentParams = {
      amount: amountInCents,
      currency: currency,
      automatic_payment_methods: { enabled: true },
      metadata: {
        userId: req.user.id,
        // Store stringified items; Stripe metadata values are strings
        orderDetails: JSON.stringify(orderItemsForMetadata),
      },
      shipping: { // Add shipping to PI as you already do
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
    
    console.log(`[Payment Intent] Creating PI for ${amountInCents} ${currency.toUpperCase()} for user ${req.user.id}`);
    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

    res.send({
      clientSecret: paymentIntent.client_secret,
      amount: amountInCents, // Send back the calculated amount
      currency: currency,
    });

  } catch (error) {
    console.error("[Payment Intent] Error creating payment intent:", error.message, error.stack);
    res.status(500).send({ error: { message: 'Failed to create payment intent: ' + error.message } });
  }
});

export default router;
