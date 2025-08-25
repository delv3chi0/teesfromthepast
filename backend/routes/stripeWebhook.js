// backend/routes/stripeWebhook.js
import express from "express";
import Stripe from "stripe";
import "dotenv/config";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Design from "../models/Design.js";
import WebhookEvent from "../models/WebhookEvent.js";
import { logger } from "../utils/logger.js";
import { 
  verifyWebhookSignature, 
  processWebhookSafely 
} from "../utils/webhookReliability.js";

const router = express.Router();

if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
  logger.error("CRITICAL: STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET missing");
}

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// MUST be mounted BEFORE global express.json() in app.js
router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  if (!stripe || !webhookSecret) return res.status(500).send("Stripe not configured");

  const sig = req.headers["stripe-signature"];
  let event;
  
  try {
    // Use enhanced signature verification with tighter tolerance
    verifyWebhookSignature(req.body, sig, webhookSecret, 300); // 5 minute tolerance
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    req.log?.error("Webhook signature verification failed", { 
      error: err.message,
      hasSignature: !!sig,
      bodyLength: req.body?.length 
    });
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    const result = await processWebhookSafely(
      event.id,
      event.type,
      async () => await processStripeEvent(event, req)
    );
    
    return res.status(200).json({ 
      received: true, 
      dedup: result.deduped,
      webhookId: event.id
    });
    
  } catch (error) {
    req.log?.error("Webhook processing error", { 
      webhookId: event.id,
      eventType: event.type,
      error: error.message 
    });
    
    return res.status(500).json({ 
      error: "Failed to process webhook",
      webhookId: event.id 
    });
  }
});

// Extract webhook processing logic into separate function
async function processStripeEvent(event, req) {
  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object;
    
    req.log?.info("Processing payment_intent.succeeded", { 
      paymentIntentId: pi.id,
      amount: pi.amount,
      currency: pi.currency 
    });

    const existingOrder = await Order.findOne({ paymentIntentId: pi.id });
    if (existingOrder) {
      req.log?.info("Order already exists for payment intent", { 
        paymentIntentId: pi.id,
        orderId: existingOrder._id 
      });
      return;
    }

    const { userId } = pi.metadata || {};
    let itemsFromMeta = [];

    try {
      itemsFromMeta = JSON.parse(pi.metadata?.items || "[]");
    } catch {
      req.log?.warn("Failed to parse items from payment intent metadata", { 
        paymentIntentId: pi.id 
      });
      itemsFromMeta = [];
    }

    if (!itemsFromMeta.length) {
      req.log?.warn("No items found in payment intent metadata", { 
        paymentIntentId: pi.id 
      });
      return;
    }

    // Extract billing and shipping addresses
    const shippingAddressForDb = pi.shipping?.address
      ? {
          name: pi.shipping.name || "",
          line1: pi.shipping.address.line1 || "",
          line2: pi.shipping.address.line2 || "",
          city: pi.shipping.address.city || "",
          state: pi.shipping.address.state || "",
          postal_code: pi.shipping.address.postal_code || "",
          country: pi.shipping.address.country || "",
        }
      : null;

    const billingAddressForDb = pi.charges?.data?.[0]?.billing_details?.address
      ? {
          name: pi.charges.data[0].billing_details.name || "",
          line1: pi.charges.data[0].billing_details.address.line1 || "",
          line2: pi.charges.data[0].billing_details.address.line2 || "",
          city: pi.charges.data[0].billing_details.address.city || "",
          state: pi.charges.data[0].billing_details.address.state || "",
          postal_code: pi.charges.data[0].billing_details.address.postal_code || "",
          country: pi.charges.data[0].billing_details.address.country || "",
        }
      : null;

    // Create new order
    const newOrder = new Order({
      user: userId || null,
      items: itemsFromMeta,
      totalAmount: pi.amount,
      currency: pi.currency,
      shippingAddress: shippingAddressForDb,
      billingAddress: billingAddressForDb,
      paymentIntentId: pi.id,
      paymentStatus: "Succeeded",
      orderStatus: "Processing",
    });
    
    await newOrder.save();
    
    req.log?.info("Order created successfully", { 
      orderId: newOrder._id,
      paymentIntentId: pi.id,
      itemCount: itemsFromMeta.length,
      totalAmount: pi.amount
    });

    // Update stock levels with enhanced logging
    await updateProductStock(itemsFromMeta, req);
    
  } else if (event.type === "payment_intent.payment_failed") {
    const pi = event.data.object;
    req.log?.warn("Payment failed", { 
      paymentIntentId: pi.id,
      lastPaymentError: pi.last_payment_error?.message 
    });
  } else {
    req.log?.debug("Unhandled webhook event", { eventType: event.type });
  }
}

// Enhanced stock update function with error handling
async function updateProductStock(items, req) {
  for (const item of items) {
    try {
      const product = await Product.findById(item.productId);
      if (!product) {
        req.log?.warn("Product not found for stock update", { 
          productId: item.productId,
          variantSku: item.variantSku 
        });
        continue;
      }

      const isNew = product.variants?.length > 0 && product.variants[0]?.sizes !== undefined;

      if (isNew) {
        const colorVariant = product.variants.find(cv => 
          cv.sizes?.some(sv => sv.sku === item.variantSku)
        );
        if (colorVariant) {
          const sizeVariant = colorVariant.sizes.find(sv => sv.sku === item.variantSku);
          if (sizeVariant) {
            const oldStock = sizeVariant.stock || 0;
            sizeVariant.stock = Math.max(0, oldStock - item.quantity);
            
            req.log?.info("Stock updated (new variant structure)", {
              productId: item.productId,
              variantSku: item.variantSku,
              oldStock,
              newStock: sizeVariant.stock,
              quantity: item.quantity
            });
          }
        }
      } else {
        const oldVariant = product.variants?.find(v => v.sku === item.variantSku);
        if (oldVariant) {
          const oldStock = oldVariant.stock || 0;
          oldVariant.stock = Math.max(0, oldStock - item.quantity);
          
          req.log?.info("Stock updated (old variant structure)", {
            productId: item.productId,
            variantSku: item.variantSku,
            oldStock,
            newStock: oldVariant.stock,
            quantity: item.quantity
          });
        }
      }
      
      await product.save();
      
    } catch (error) {
      req.log?.error("Failed to update product stock", {
        productId: item.productId,
        variantSku: item.variantSku,
        error: error.message
      });
      // Continue processing other items even if one fails
    }
  }
}

export default router;