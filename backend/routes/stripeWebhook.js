// backend/routes/stripeWebhook.js
import express from "express";
import Stripe from "stripe";
import "dotenv/config";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Design from "../models/Design.js";
import WebhookEvent from "../models/WebhookEvent.js";
import logger from "../utils/logger.js";

const router = express.Router();

if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
  logger.error("webhook.config_missing", { 
    hasSecretKey: !!process.env.STRIPE_SECRET_KEY,
    hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET
  });
}

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// MUST be mounted BEFORE global express.json() in app.js
router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const log = req.log || logger;
  
  if (!stripe || !webhookSecret) {
    log.error("webhook.not_configured", {});
    return res.status(500).send("Stripe not configured");
  }

  const sig = req.headers["stripe-signature"];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    log.info("webhook.signature_verified", { 
      eventId: event.id,
      eventType: event.type
    });
  } catch (err) {
    log.error("webhook.signature_failed", { 
      error: err.message,
      signature: sig?.substring(0, 20) + "..." // Log partial signature for debugging
    });
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Idempotency ledger
  try {
    const existed = await WebhookEvent.findById(event.id);
    if (existed) {
      log.info("webhook.duplicate_event", { 
        eventId: event.id,
        eventType: event.type
      });
      return res.status(200).json({ received: true, dedup: true });
    }
    await WebhookEvent.create({ _id: event.id, type: event.type });
    log.info("webhook.event_recorded", { 
      eventId: event.id,
      eventType: event.type
    });
  } catch (e) {
    log.error("webhook.idempotency_failed", { 
      error: e.message,
      eventId: event.id
    });
    // do not bail; still try to process once
  }

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object;
    log.info("webhook.payment_succeeded", { 
      paymentIntentId: pi.id,
      amount: pi.amount,
      currency: pi.currency
    });

    try {
      const existingOrder = await Order.findOne({ paymentIntentId: pi.id });
      if (existingOrder) {
        log.info("webhook.order_exists", { 
          paymentIntentId: pi.id,
          orderId: existingOrder._id
        });
        return res.status(200).json({ received: true, message: "order exists" });
      }

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
      await newOrder.save();
      
      log.info("webhook.order_created", { 
        orderId: newOrder._id,
        userId: userId,
        totalAmount: pi.amount,
        itemCount: orderItems.length
      });

      // stock decrement (supports both old and new variant shapes)
      for (const item of itemsFromMeta) {
        const product = await Product.findById(item.productId);
        if (!product) continue;

        const isNew = product.variants?.length > 0 && product.variants[0]?.sizes !== undefined;

        if (isNew) {
          const colorVariant = product.variants.find(cv => cv.sizes?.some(sv => sv.sku === item.variantSku));
          if (colorVariant) {
            const sizeVariant = colorVariant.sizes.find(sv => sv.sku === item.variantSku);
            if (sizeVariant) sizeVariant.stock = Math.max(0, (sizeVariant.stock || 0) - item.quantity);
          }
        } else {
          const oldVariant = product.variants?.find(v => v.sku === item.variantSku);
          if (oldVariant) oldVariant.stock = Math.max(0, (oldVariant.stock || 0) - item.quantity);
        }
        await product.save();
      }
      
      log.info("webhook.stock_updated", { 
        itemsProcessed: itemsFromMeta.length
      });
    } catch (err) {
      log.error("webhook.order_creation_failed", { 
        error: err.message,
        stack: err.stack,
        paymentIntentId: pi.id
      });
      return res.status(500).json({ error: "Failed to process webhook" });
    }
  } else if (event.type === "payment_intent.payment_failed") {
    const pi = event.data.object;
    log.warn("webhook.payment_failed", { 
      paymentIntentId: pi.id,
      lastPaymentError: pi.last_payment_error?.message
    });
  } else {
    log.info("webhook.event_unhandled", { 
      eventType: event.type,
      eventId: event.id
    });
  }

  return res.status(200).json({ received: true });
});

export default router;
