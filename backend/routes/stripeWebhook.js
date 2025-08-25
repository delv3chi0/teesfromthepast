// backend/routes/stripeWebhook.js
import express from "express";
import Stripe from "stripe";
import config from "../config/index.js";
import logger from "../utils/logger.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Design from "../models/Design.js";
import WebhookEvent from "../models/WebhookEvent.js";

const router = express.Router();

if (!config.stripeSecretKey || !config.stripeWebhookSecret) {
  logger.error("[Webhook] CRITICAL: STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET missing");
}

const stripe = config.stripeSecretKey ? new Stripe(config.stripeSecretKey) : null;
const webhookSecret = config.stripeWebhookSecret;

// MUST be mounted BEFORE global express.json() in app.js
router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  if (!stripe || !webhookSecret) return res.status(500).send("Stripe not configured");

  const sig = req.headers["stripe-signature"];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    logger.error("[Webhook] Signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Idempotency ledger
  try {
    const existed = await WebhookEvent.findById(event.id);
    if (existed) return res.status(200).json({ received: true, dedup: true });
    await WebhookEvent.create({ _id: event.id, type: event.type });
  } catch (e) {
    logger.error("[Webhook] Failed to record event id:", e.message);
    // do not bail; still try to process once
  }

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object;

    try {
      const existingOrder = await Order.findOne({ paymentIntentId: pi.id });
      if (existingOrder) return res.status(200).json({ received: true, message: "order exists" });

      const { userId } = pi.metadata || {};
      let itemsFromMeta = [];
      try {
        itemsFromMeta = JSON.parse(pi.metadata?.orderDetails || "[]");
      } catch {
        throw new Error("orderDetails metadata JSON parse failed");
      }
      if (!userId || !Array.isArray(itemsFromMeta) || itemsFromMeta.length === 0) {
        throw new Error("Missing userId or orderDetails in metadata");
      }

      const orderItems = [];
      for (const item of itemsFromMeta) {
        const designDoc = item.designId ? await Design.findById(item.designId) : null;
        orderItems.push({
          productId: item.productId,
          designId: item.designId,
          name: item.productName,
          quantity: item.quantity,
          price: item.priceAtPurchase, // cents
          size: item.size,
          color: item.color,
          customImageURL: designDoc ? (designDoc.publicUrl || designDoc.imageDataUrl) : undefined,
        });
      }

      const ship = pi.shipping;
      if (!ship?.address?.line1 || !ship?.name) throw new Error("Shipping details incomplete");
      const shippingAddressForDb = {
        recipientName: ship.name,
        street1: ship.address.line1,
        street2: ship.address.line2 || undefined,
        city: ship.address.city,
        state: ship.address.state,
        zipCode: ship.address.postal_code,
        country: ship.address.country,
        phone: ship.phone || undefined,
      };

      const billingMeta = pi.metadata?.billingAddress
        ? JSON.parse(pi.metadata.billingAddress)
        : null;
      const billingAddressForDb = billingMeta || {
        recipientName: ship.name,
        street1: ship.address.line1,
        street2: ship.address.line2 || undefined,
        city: ship.address.city,
        state: ship.address.state,
        zipCode: ship.address.postal_code,
        country: ship.address.country,
        phone: ship.phone || undefined,
      };

      const newOrder = new Order({
        user: userId,
        orderItems,
        totalAmount: pi.amount, // cents
        shippingAddress: shippingAddressForDb,
        billingAddress: billingAddressForDb,
        paymentIntentId: pi.id,
        paymentStatus: "Succeeded",
        orderStatus: "Processing",
      });
      
      try {
        await newOrder.save();
      } catch (saveErr) {
        // Handle duplicate key error (E11000) gracefully
        if (saveErr.code === 11000 && saveErr.message.includes('paymentIntentId')) {
          logger.info("webhook.duplicate_key_order_race", { paymentIntentId: pi.id });
          return res.status(200).json({ received: true, dedup: true });
        }
        throw saveErr; // Re-throw other errors
      }

      // stock decrement (supports both old and new variant shapes)
      for (const item of itemsFromMeta) {
        try {
          const product = await Product.findById(item.productId);
          if (!product) {
            logger.warn("[Webhook] Product not found for inventory decrement", { productId: item.productId });
            continue;
          }

          const isNew = product.variants?.length > 0 && product.variants[0]?.sizes !== undefined;

          if (isNew) {
            const colorVariant = product.variants.find(cv => cv.sizes?.some(sv => sv.sku === item.variantSku));
            if (colorVariant) {
              const sizeVariant = colorVariant.sizes.find(sv => sv.sku === item.variantSku);
              if (sizeVariant) sizeVariant.stock = Math.max(0, (sizeVariant.stock || 0) - item.quantity);
            } else {
              logger.warn("[Webhook] Color variant not found for inventory decrement", { 
                productId: item.productId, 
                variantSku: item.variantSku 
              });
            }
          } else {
            const oldVariant = product.variants?.find(v => v.sku === item.variantSku);
            if (oldVariant) {
              oldVariant.stock = Math.max(0, (oldVariant.stock || 0) - item.quantity);
            } else {
              logger.warn("[Webhook] Variant not found for inventory decrement", { 
                productId: item.productId, 
                variantSku: item.variantSku 
              });
            }
          }
          await product.save();
        } catch (inventoryErr) {
          logger.warn("[Webhook] Failed to update inventory for item", { 
            productId: item.productId, 
            variantSku: item.variantSku,
            error: inventoryErr.message 
          });
          // Continue processing other items - don't fail the entire webhook
        }
      }
    } catch (err) {
      logger.error("[Webhook] Handler error:", err.message, err.stack || "");
      return res.status(500).json({ error: "Failed to process webhook" });
    }
  } else if (event.type === "payment_intent.payment_failed") {
    logger.info(`[Webhook] Payment failed: ${event.data.object.id}`);
  } else {
    logger.debug(`[Webhook] Unhandled: ${event.type}`);
  }

  return res.status(200).json({ received: true });
});

export default router;
