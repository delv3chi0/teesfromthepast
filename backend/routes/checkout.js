// backend/routes/checkout.js
import express from 'express';
import Stripe from 'stripe';
import 'dotenv/config';
import { protect } from '../middleware/authMiddleware.js';
// Example: import Design from '../models/Design.js'; // If you need to fetch design details

const router = express.Router();

if (!process.env.STRIPE_SECRET_KEY) {
  console.error("[Checkout] CRITICAL STARTUP ERROR: Stripe secret key (STRIPE_SECRET_KEY) is not configured in .env.");
}
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

const MAX_METADATA_FIELD_LENGTH = 490; // Stripe limit is 500, being a bit conservative

async function getPriceInCents(item) {
  console.log('[Checkout] getPriceInCents for item:', item);
  if (!item || !item.productType) {
    console.warn('[Checkout] Invalid item provided to getPriceInCents. Defaulting price.');
    return 2000; 
  }
  // Ensure productType is compared case-insensitively
  const productTypeLower = item.productType.toLowerCase();
  if (productTypeLower === 't-shirt') return 2500; // $25.00
  if (productTypeLower === 'hoodie') return 4000; // $40.00
  console.warn(`[Checkout] No specific price found for productType: ${item.productType}, defaulting.`);
  return 2000; 
}

async function getItemDetailsForOrder(item) {
  // This function prepares details that might be fetched from a DB in a real scenario
  // For now, it mostly re-structures what's passed.
  console.log('[Checkout] getItemDetailsForOrder for item (id, productType):', item.id, item.productType);
  return {
    productId: item.id, // This is the designId from the frontend
    productName: `Custom ${item.productType || 'Apparel'} (${item.color || 'N/A'}, ${item.size || 'N/A'})`,
    productType: item.productType,
    size: item.size,
    color: item.color,
  };
}

router.post('/create-payment-intent', protect, async (req, res) => {
  console.log('-----------------------------------------------------');
  console.log('[Checkout] /create-payment-intent route hit by user:', req.user.id);
  
  if (!stripe) {
    console.error("[Checkout] CRITICAL ERROR: Stripe is not initialized. Check STRIPE_SECRET_KEY.");
    return res.status(500).json({ error: 'Payment processing is currently unavailable. Stripe not configured.' });
  }

  const { items, currency = 'usd', shippingAddress } = req.body;
  // Log received data carefully, especially sensitive parts if any in a real app
  console.log('[Checkout] Request body items (first item):', items && items.length > 0 ? JSON.stringify(items[0], (key, value) => key === 'imageDataUrl' ? value.substring(0, 50) + '...' : value, 2) : 'No items');
  console.log('[Checkout] Request body currency:', currency);
  console.log('[Checkout] Request body shippingAddress:', JSON.stringify(shippingAddress, null, 2));

  if (!items || !Array.isArray(items) || items.length === 0) {
    console.error("[Checkout] ERROR: No items provided or items is not an array.");
    return res.status(400).json({ error: 'No items provided for payment.' });
  }
  if (!shippingAddress || typeof shippingAddress !== 'object' || Object.keys(shippingAddress).length === 0) {
    console.error("[Checkout] ERROR: Shipping address is missing or invalid.");
    return res.status(400).json({ error: 'Shipping address is required.' });
  }

  let countryCode = shippingAddress.country;
  if (!countryCode || typeof countryCode !== 'string' || countryCode.trim().length === 0) {
      console.error("[Checkout] ERROR: Shipping address country is missing or empty.");
      return res.status(400).json({ error: 'Shipping address country is required.' });
  }
  countryCode = countryCode.trim().toUpperCase();
  if (countryCode === 'UNITED STATES' || countryCode === 'USA') {
      countryCode = 'US';
  }
  if (countryCode.length !== 2) {
      console.error(`[Checkout] ERROR: Invalid shipping address country format: '${shippingAddress.country}'. Must be a 2-letter ISO code.`);
      return res.status(400).json({ error: `Invalid country format: '${shippingAddress.country}'. Please use a 2-letter ISO country code (e.g., US, CA).` });
  }
  const validatedShippingAddress = { ...shippingAddress, country: countryCode };

  try {
    let amountInCents = 0;
    const orderItemsForStripeMetadata = []; // Specifically for Stripe metadata (leaner)
    const fullOrderItemsForLogging = []; // For backend logging (can be more detailed)

    console.log('[Checkout] Processing items to calculate total and prepare metadata...');
    for (const item of items) {
      if (!item || typeof item !== 'object' || !item.id || !item.productType || !item.size || !item.color || !item.prompt || !item.imageDataUrl) {
        console.error('[Checkout] ERROR: Invalid item structure in items array. Missing required fields.', item);
        return res.status(400).json({ error: 'Invalid item data received. Ensure all product details (id, productType, size, color, prompt, imageDataUrl) are present.' });
      }
      
      const pricePerItemCents = await getPriceInCents(item);
      const quantity = parseInt(item.quantity, 10) || 1;
      amountInCents += pricePerItemCents * quantity;
      console.log(`[Checkout] Item: ${item.id}, Price/Item: ${pricePerItemCents}, Qty: ${quantity}, Subtotal: ${pricePerItemCents * quantity}`);

      const baseItemDetails = await getItemDetailsForOrder(item);

      // For Stripe metadata (lean version)
      orderItemsForStripeMetadata.push({
        ...baseItemDetails, // productId, productName, productType, size, color
        quantity: quantity,
        priceAtPurchase: pricePerItemCents,
        // Truncate prompt if it's too long for Stripe metadata
        designPrompt: item.prompt.substring(0, MAX_METADATA_FIELD_LENGTH),
        // DO NOT include full imageDataUrl in Stripe metadata. Use a reference or omit.
        // designId is already included as productId.
      });

      // For more detailed backend logging (can include more if needed)
      fullOrderItemsForLogging.push({
        ...baseItemDetails,
        quantity: quantity,
        priceAtPurchase: pricePerItemCents,
        designPrompt: item.prompt,
        designId: item.id, // Explicitly log designId
        // Log a snippet of imageDataUrl for verification, not the whole thing
        imageDataUrlSnippet: item.imageDataUrl.substring(0, 100) + '...' 
      });
    }
    console.log('[Checkout] Total calculated amount (cents):', amountInCents);
    console.log('[Checkout] Items prepared for FULL backend logging (first item):', fullOrderItemsForLogging.length > 0 ? JSON.stringify(fullOrderItemsForLogging[0], null, 2) : 'N/A');
    console.log('[Checkout] Items prepared for STRIPE METADATA (first item):', orderItemsForStripeMetadata.length > 0 ? JSON.stringify(orderItemsForStripeMetadata[0], null, 2) : 'N/A');


    if (amountInCents < 50) { // Stripe minimum is often $0.50 USD
        console.error("[Checkout] ERROR: Invalid order amount calculated (must be >= 50 cents). Amount:", amountInCents);
        return res.status(400).json({ error: 'Invalid order amount. Total must be at least $0.50.'});
    }
    
    const stringifiedOrderDetailsForStripe = JSON.stringify(orderItemsForStripeMetadata);
    console.log(`[Checkout] Stringified orderDetails for Stripe metadata length: ${stringifiedOrderDetailsForStripe.length}`);
    // Stripe's total metadata size limit is around 40KB. Individual fields 500 chars.
    // If stringifiedOrderDetailsForStripe is still too large, you might need to make it even leaner.

    const paymentIntentParams = {
      amount: amountInCents,
      currency: currency,
      automatic_payment_methods: { enabled: true },
      metadata: {
        userId: req.user.id, 
        orderDetails: stringifiedOrderDetailsForStripe, // This is now leaner
        // Add other simple metadata if needed, e.g.,
        // customerUsername: req.user.username (if available and desired)
      },
      shipping: {
        name: validatedShippingAddress.recipientName,
        address: {
          line1: validatedShippingAddress.street1,
          line2: validatedShippingAddress.street2 || undefined,
          city: validatedShippingAddress.city,
          state: validatedShippingAddress.state,
          postal_code: validatedShippingAddress.zipCode,
          country: validatedShippingAddress.country,
        },
        phone: validatedShippingAddress.phone || undefined,
      },
      description: `Order from TeesFromThePast for user ${req.user.id}`,
      // receipt_email: req.user.email, // Consider if user email is verified and if Stripe should send email
    };
    
    console.log(`[Checkout] Creating PaymentIntent for user ${req.user.id}. Amount: ${amountInCents} ${currency.toUpperCase()}`);
    // Avoid logging full params if it contains sensitive data in production.
    // For debugging, logging specific parts or a summary is better.
    // console.log('[Checkout] Full PaymentIntent Params to Stripe:', JSON.stringify(paymentIntentParams, null, 2)); 
    console.log('[Checkout] PaymentIntent Params for Stripe (excluding full orderDetails metadata for brevity):', 
        JSON.stringify({...paymentIntentParams, metadata: {...paymentIntentParams.metadata, orderDetails: `[${orderItemsForStripeMetadata.length} items, total length: ${stringifiedOrderDetailsForStripe.length}]`}}, null, 2)
    );
    
    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);
    console.log('[Checkout] PaymentIntent created successfully. ID:', paymentIntent.id);

    res.send({
      clientSecret: paymentIntent.client_secret,
      amount: amountInCents,
      currency: currency,
    });

  } catch (error) {
    let errorMessage = `Failed to create payment intent: ${error.message}`;
    if (error.type) { // Stripe error
        errorMessage = `Stripe Error (${error.type}): ${error.message}`;
        if (error.code) errorMessage += ` (Code: ${error.code})`;
        if (error.param) errorMessage += ` (Param: ${error.param})`;
        console.error("[Checkout] Stripe API Error details:", JSON.stringify(error, null, 2));
    } else { // Other backend error
        console.error("[Checkout] CRITICAL ERROR creating payment intent (Non-Stripe):", error.message, error.stack);
    }
    res.status(500).send({ error: { message: errorMessage } });
  } finally {
    console.log('[Checkout] /create-payment-intent request finished for user:', req.user.id);
    console.log('-----------------------------------------------------');
  }
});

export default router;
