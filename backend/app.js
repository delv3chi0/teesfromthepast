// backend/app.js
import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";

// Core app routes
import authRoutes from "./routes/auth.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import designsRoutes from "./routes/designs.js";
import storefrontRoutes from "./routes/storefrontProductRoutes.js";
import checkoutRoutes from "./routes/checkout.js";
import stripeWebhookRoutes from "./routes/stripeWebhook.js";
import printfulRoutes from "./routes/printful.js";
import ordersRoutes from "./routes/orders.js";
import adminUserRoutes from "./routes/adminUserRoutes.js";
import adminOrderRoutes from "./routes/adminOrderRoutes.js";
import adminDesignRoutes from "./routes/adminDesignRoutes.js";
import adminProductRoutes from "./routes/adminProductRoutes.js";
import contestRoutes from "./routes/contest.js";
import formRoutes from "./routes/formRoutes.js";
import emailVerificationRoutes from "./routes/emailVerificationRoutes.js";

// Admin utilities
import adminSessionRoutes from "./routes/adminSessionRoutes.js";
import adminAuditRoutes from "./routes/adminAuditRoutes.js";

// 👇 NEW: add express-rate-limit to gently throttle the contact form
import rateLimit from "express-rate-limit";

dotenv.config();
connectDB();

const app = express();

/**
 * Trust the first proxy (Render puts you behind exactly one).
 * This makes req.ip the REAL client IP and keeps express-rate-limit happy.
 */
app.set("trust proxy", 1); // <-- CHANGED from true to 1

// --- Health check ---
app.get("/health", (_req, res) => res.send("OK"));

/**
 * Dependency-free CORS:
 * - Allows your Vercel app + localhost
 * - Handles preflight
 * - Whitelists custom headers you use (Authorization + x-session-id)
 */
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS ||
  "https://teesfromthepast.vercel.app,http://localhost:5173,http://localhost:3000")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const DEFAULT_ALLOWED_HEADERS = [
  "content-type",
  "authorization",
  "x-requested-with",
  "x-session-id",
  "x-client-info",
  "x-client-timezone",
  "x-client-lang",
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  const requested = req.headers["access-control-request-headers"];
  res.setHeader(
    "Access-Control-Allow-Headers",
    (requested && String(requested)) || DEFAULT_ALLOWED_HEADERS.join(", ")
  );
  // Using Bearer tokens, not cookies (no credentials needed)
  if (req.method === "OPTIONS") return res.status(204).end();
  next();
});

/**
 * IMPORTANT: Mount Stripe webhook BEFORE any JSON body parser
 * so `express.raw()` inside the webhook route can read the untouched body.
 */
app.use("/api/stripe", stripeWebhookRoutes);

// JSON body parsing (after Stripe)
app.use(express.json({ limit: "10mb" }));

/**
 * 👇 NEW: Gentle rate-limit ONLY the contact form POST
 * - 30 requests per IP per minute (tune as you like)
 * - Standard headers on; legacy headers off
 * - With trust proxy = 1 above, the limiter sees the real client IP
 */
const contactLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 30,           // allow 30 POSTs per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/forms/contact", contactLimiter);

// --- Public & user routes ---
app.use("/api/auth", authRoutes);
app.use("/api/auth", emailVerificationRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/mydesigns", designsRoutes);
app.use("/api/storefront", storefrontRoutes); // /products, /shop-data, /product/:slug
app.use("/api/checkout", checkoutRoutes);
app.use("/api/printful", printfulRoutes);
app.use("/api/orders", ordersRoutes);

// --- Admin routes (protected) ---
app.use("/api/admin/users", adminUserRoutes);
app.use("/api/admin/orders", adminOrderRoutes);
app.use("/api/admin/designs", adminDesignRoutes);
app.use("/api/admin/products", adminProductRoutes);
app.use("/api/admin/sessions", adminSessionRoutes);
app.use("/api/admin/audit", adminAuditRoutes);

// --- Public extras ---
app.use("/api/contest", contestRoutes);
app.use("/api/forms", formRoutes);

export default app;
