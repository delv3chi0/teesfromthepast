// backend/routes/checkout.js
import express from "express";
import Stripe from "stripe";
import "dotenv/config";
import { protect } from "../middleware/authMiddleware.js";
import Product from "../models/Product.js";
import Design from "../models/Design.js";

// Optional structured error utility (safe import pattern if you added it)
let sendError;
try {
  const mod = await import("../utils/sendError.js");
  sendError = mod.sendError || mod.default;
} catch {
  // silently ignore if not present; we fall back to plain JSON errors
}

const router = express.Router();

if (!process.env.STRIPE_SECRET_KEY) {
  console.error(
    "[Checkout] CRITICAL STARTUP ERROR: Stripe secret key (STRIPE_SECRET_KEY) is not configured in .env."
  );
}
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

const MAX_METADATA_FIELD_LENGTH = 490;

/**
 * Helper to respond with error.
 * For the legacy /create-payment-intent route we preserve the original plain { error: string } shape.
 * For the alias /api/checkout (req._structuredErrors === true) we provide structured errors if sendError exists.
 */
function respondError(req, res, httpStatus, message, opts = {}) {
  const { code = "BAD_REQUEST", details } = opts;
  if (req._structuredErrors && sendError) {
    return sendError(res, code, httpStatus, message, details);
  }
  // Legacy shape
  return res.status(httpStatus).json({ error: message });
}

/**
 * Resolve and validate country code (2-letter ISO) with your existing normalization rules.
 */
function normalizeCountry(raw) {
  if (!raw || typeof raw !== "string") return null;
  let cc = raw.trim();
  if (!cc) return null;
  if (/^(UNITED STATES|USA)$/i.test(cc)) cc = "US";
  cc = cc.toUpperCase();
  if (cc.length !== 2) return null;
  return cc;
}

/**
 * Compute price in cents given product + variant in either schema:
 * Priority:
 *  1. variant.priceCents (already computed/stored)
 *  2. product.basePrice + variant.priceModifier (both assumed USD values) -> *100 & rounded
 *  3. fallback 0 if neither present
 */
function computeVariantPriceCents(product, variant) {
  if (variant && typeof variant.priceCents === "number") return variant.priceCents;
  const base = typeof product?.basePrice === "number" ? product.basePrice : null;
  const mod =
    variant && typeof variant.priceModifier === "number" ? variant.priceModifier : 0;
  if (base !== null) {
    return Math.round((base + mod) * 100);
  }
  return 0;
}

/**
 * Main shared handler used by both /create-payment-intent and alias /.
 * Decides behavior slightly based on req._checkoutAlias flag (only for logging / structured errors).
 */
async function handleCreatePaymentIntent(req, res) {
  const routeTag = req._checkoutAlias ? "/ (alias)" : "/create-payment-intent";
  console.log("-----------------------------------------------------");
  console.log(`[Checkout] ${routeTag} route hit by user:`, req.user?.id);

  if (!stripe) {
    console.error(
      "[Checkout] CRITICAL ERROR: Stripe is not initialized. Check STRIPE_SECRET_KEY."
    );
    return respondError(
      req,
      res,
      500,
      "Payment processing is currently unavailable. Stripe not configured.",
      { code: "STRIPE_NOT_CONFIGURED" }
    );
  }

  const { items, currency = "usd", shippingAddress } = req.body || {};

  // Basic validations
  if (!Array.isArray(items) || items.length === 0) {
    return respondError(req, res, 400, "No items provided for payment.", {
      code: "NO_ITEMS"
    });
  }
  if (
    !shippingAddress ||
    typeof shippingAddress !== "object" ||
    Object.keys(shippingAddress).length === 0
  ) {
    return respondError(req, res, 400, "Shipping address is required.", {
      code: "MISSING_SHIPPING"
    });
  }

  let countryCode = normalizeCountry(shippingAddress.country);
  if (!countryCode) {
    return respondError(
      req,
      res,
      400,
      `Invalid country format: '${shippingAddress.country}'. Please use a 2-letter ISO country code (e.g., US, CA).`,
      { code: "INVALID_COUNTRY" }
    );
  }
  const validatedShippingAddress = { ...shippingAddress, country: countryCode };

  try {
    let amountInCents = 0;
    const stripeOrderItems = []; // Detailed metadata (route 1 style)
    const compactItems = []; // Compact fallback (route 2 style)
    console.log(
      "[Checkout] Processing items to calculate total and prepare metadata..."
    );

    for (const item of items) {
      if (
        !item ||
        !item.productId ||
        !item.variantSku ||
        !item.designId ||
        !item.quantity
      ) {
        console.error("[Checkout] ERROR: Invalid item structure.", item);
        return respondError(
          req,
          res,
          400,
            "Invalid item data received. Ensure all product details are present.",
          { code: "INVALID_ITEM" }
        );
      }

      const product = await Product.findById(item.productId);
      const design = await Design.findById(item.designId);

      if (!product || !product.isActive) {
        return respondError(
          req,
          res,
          404,
          `The product "${item.productName || "item"}" is no longer available.`,
          { code: "PRODUCT_UNAVAILABLE" }
        );
      }
      if (!design) {
        return respondError(req, res, 404, "The selected design could not be found.", {
          code: "DESIGN_NOT_FOUND"
        });
      }
      if (!product.variants || product.variants.length === 0) {
        return respondError(
          req,
          res,
          404,
          "This product has no purchaseable options.",
          { code: "NO_VARIANTS" }
        );
      }

      // Determine schema style
      const isNewFormat = product.variants[0]?.sizes !== undefined;
      let foundVariant = null;

      if (isNewFormat) {
        // color.sizes nested format
        for (const color of product.variants) {
          const sizeVariant = color.sizes.find(
            (s) => s.sku === item.variantSku
          );
            if (sizeVariant) {
              // In new schema we treat sizeVariant as "variant" but add color info
              foundVariant = {
                ...sizeVariant,
                colorName: color.colorName,
                colorCode: color.colorCode || color.colorName
              };
              break;
            }
        }
      } else {
        // Legacy flat array
        foundVariant = product.variants.find(
          (v) => v.sku === item.variantSku
        );
      }

      if (!foundVariant) {
        return respondError(
          req,
          res,
          404,
          `The selected product option (SKU: ${item.variantSku}) is no longer available.`,
          { code: "VARIANT_NOT_FOUND" }
        );
      }

      // Stock / availability checks (adapt to whichever flag exists)
      if (
        (typeof foundVariant.inStock === "boolean" && !foundVariant.inStock) ||
        (typeof foundVariant.stock === "number" &&
          foundVariant.stock < parseInt(item.quantity, 10))
      ) {
        return respondError(
          req,
          res,
          400,
          `Sorry, the selected variant for "${product.name}" is out of stock.`,
          { code: "OUT_OF_STOCK" }
        );
      }

      const quantity = parseInt(item.quantity, 10) || 1;

      // Compute price
      const pricePerItemCents = computeVariantPriceCents(product, foundVariant);
      const lineSubtotal = pricePerItemCents * quantity;
      amountInCents += lineSubtotal;

      console.log(
        `[Checkout] Item: ${product.name} (${foundVariant.sku || foundVariant.colorName || foundVariant.name}) Price/Item: ${pricePerItemCents} Qty: ${quantity} Subtotal: ${lineSubtotal}`
      );

      // Detailed metadata (original route style)
      stripeOrderItems.push({
        productId: product._id.toString(),
        productName: product.name,
        variantSku: foundVariant.sku,
        size: foundVariant.size,
        color: foundVariant.colorName,
        designId: design._id.toString(),
        designPrompt: (design.prompt || "")
          .substring(0, MAX_METADATA_FIELD_LENGTH),
        quantity,
        priceAtPurchase: pricePerItemCents
      });

      // Compact item (alias style)
      compactItems.push({
        product: (product.name || "").substring(0, MAX_METADATA_FIELD_LENGTH),
        design: (design.name || "").substring(0, MAX_METADATA_FIELD_LENGTH),
        variant: (foundVariant.colorName ||
          foundVariant.name ||
          "").substring(0, MAX_METADATA_FIELD_LENGTH),
        quantity,
        unitPrice: pricePerItemCents
      });
    }

    console.log("[Checkout] Total calculated amount (cents):", amountInCents);

    // Safety thresholds (preserve original semantics)
    if (amountInCents <= 0) {
      return respondError(
        req,
        res,
        400,
        "Order total must be greater than zero.",
        { code: "AMOUNT_TOO_LOW" }
      );
    }
    if (!req._checkoutAlias && amountInCents < 50) {
      // Original legacy rule: minimum $0.50 only enforced on legacy route
      return respondError(
        req,
        res,
        400,
        "Invalid order amount. Total must be at least $0.50.",
        { code: "AMOUNT_TOO_LOW" }
      );
    }

    // Build metadata
    let metadata;
    if (req._checkoutAlias) {
      // Alias route uses compact metadata (shorter)
      metadata = {
        userId: req.user.id,
        items: JSON.stringify(compactItems).substring(0, MAX_METADATA_FIELD_LENGTH),
        shipping: JSON.stringify(validatedShippingAddress).substring(
          0,
          MAX_METADATA_FIELD_LENGTH
        ),
        orderSource: "teesfromthepast_checkout"
      };
    } else {
      // Legacy route uses detailed orderDetails JSON
      const orderDetailsJSON = JSON.stringify(stripeOrderItems);
      if (orderDetailsJSON.length > 40000) {
        return respondError(
          req,
          res,
          400,
          "Order details are too large for processing.",
          { code: "ORDER_DETAILS_TOO_LARGE" }
        );
      }
      metadata = {
        userId: req.user.id,
        orderDetails: orderDetailsJSON
      };
    }

    const paymentIntentParams = {
      amount: amountInCents,
      currency: currency,
      automatic_payment_methods: { enabled: true },
      metadata,
      shipping: {
        name: validatedShippingAddress.recipientName,
        address: {
          line1: validatedShippingAddress.street1,
          line2: validatedShippingAddress.street2 || undefined,
          city: validatedShippingAddress.city,
          state: validatedShippingAddress.state,
          postal_code: validatedShippingAddress.zipCode,
          country: validatedShippingAddress.country
        },
        phone: validatedShippingAddress.phone || undefined
      },
      description: `Order from TeesFromThePast for user ${req.user.id}`
    };

    console.log(
      `[Checkout] Creating PaymentIntent for user ${req.user.id}. Amount: ${amountInCents} ${currency.toUpperCase()}`
    );
    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);
    console.log(
      "[Checkout] PaymentIntent created successfully. ID:",
      paymentIntent.id
    );

    res.send({
      clientSecret: paymentIntent.client_secret,
      amount: amountInCents,
      currency: currency
    });
  } catch (error) {
    let errorMessage = `Failed to create payment intent: ${error.message}`;
    if (error.type) {
      errorMessage = `Stripe Error (${error.type}): ${error.message}`;
      if (error.code) errorMessage += ` (Code: ${error.code})`;
      console.error(
        "[Checkout] Stripe API Error details:",
        JSON.stringify(error, null, 2)
      );
    } else {
      console.error(
        "[Checkout] CRITICAL ERROR creating payment intent (Non-Stripe):",
        error.message,
        error.stack
      );
    }
    // Error shape respects route style
    if (req._structuredErrors && sendError) {
      return sendError(res, "STRIPE_ERROR", 500, errorMessage);
    }
    res.status(500).send({ error: { message: errorMessage } });
  } finally {
    console.log(
      `[Checkout] ${routeTag} request finished for user:`,
      req.user?.id
    );
    console.log("-----------------------------------------------------");
  }
}

// Legacy route (kept exactly at same path; behavior unchanged)
router.post("/create-payment-intent", protect, handleCreatePaymentIntent);

// Alias route: sets flags for structured errors & logging tag, reuses handler
router.post("/", protect, (req, res) => {
  req._checkoutAlias = true;
  req._structuredErrors = true; // enables structured sendError shape if utility is present
  return handleCreatePaymentIntent(req, res);
});

export default router;
