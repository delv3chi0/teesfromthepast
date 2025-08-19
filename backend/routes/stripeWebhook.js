// backend/routes/stripeWebhook.js
import express from "express";
import Stripe from "stripe";
import "dotenv/config";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Design from "../models/Design.js";
import WebhookEvent from "../models/WebhookEvent.js";

const router = express.Router();

if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
  console.error("[Webhook] CRITICAL: STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET missing");
}

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// MUST be before express.json() (done in app.js)
router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  if (!stripe || !webhookSecret) return res.status(500).send("Stripe not configured");

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error("[Webhook] Signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Idempotency ledger
  try {
    const existed = await WebhookEvent.findById(event.id);
    if (existed) return res.status(200).json({ received: true, dedup: true });
    await WebhookEvent.create({ _id: event.id, type: event.type });
  } catch (e) {
    console.error("[Webhook] Failed to record event id:", e.message);
  }

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object;

    try {
      const existingOrder = await Order.findOne({ paymentIntentId: pi.id });
      if (existingOrder) return res.status(200).json({ received: true, message: "order exists" });

      const { userId } = pi.metadata || {};
      let itemsFromMeta = [];
      try { itemsFromMeta = JSON.parse(pi.metadata?.orderDetails || "[]"); }
      catch { throw new Error("orderDetails metadata JSON parse failed"); }
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

      // stock decrement (old/new variant shapes)
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
    } catch (err) {
      console.error("[Webhook] Handler error:", err.message, err.stack || "");
      return res.status(500).json({ error: "Failed to process webhook" });
    }
  } else if (event.type === "payment_intent.payment_failed") {
    console.log(`[Webhook] Payment failed: ${event.data.object.id}`);
  } else {
    console.log(`[Webhook] Unhandled: ${event.type}`);
  }

  return res.status(200).json({ received: true });
});

export default router;
