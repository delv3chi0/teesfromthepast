// backend/app.js
import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";

import authRoutes from "./routes/auth.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import designsRoutes from "./routes/designs.js";
import storefrontProductRoutes from "./routes/storefrontProductRoutes.js";
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

dotenv.config();

// --- DB ---
connectDB();

// --- App ---
const app = express();

// --- Health check for Render ---
app.get("/health", (req, res) => res.send("OK"));

// --- Tiny built-in CORS middleware (no dependency) ---
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS ||
  "https://teesfromthepast.vercel.app,http://localhost:5173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    // Dynamically reflect the requesting allowed origin
    res.setHeader("Access-Control-Allow-Origin", origin);
    // Let proxies/CDNs know response varies by Origin
    res.setHeader("Vary", "Origin");
    // If you ever use cookies, keep this true; it's harmless for bearer tokens
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }

  // Methods & headers your app needs
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With"
  );

  // Short-circuit preflight
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  next();
});

// --- Body parser (JSON) ---
// NOTE: If your Stripe webhook requires raw body, that route should mount BEFORE this json()
// with express.raw({ type: 'application/json' }) inside stripeWebhookRoutes.
app.use(express.json({ limit: "10mb" }));

// --- Routes ---
app.use("/api/auth", authRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/mydesigns", designsRoutes);
app.use("/api/storefront/product", storefrontProductRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use("/api/stripe", stripeWebhookRoutes);
app.use("/api/printful", printfulRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/admin/users", adminUserRoutes);
app.use("/api/admin/orders", adminOrderRoutes);
app.use("/api/admin/designs", adminDesignRoutes);
app.use("/api/admin/products", adminProductRoutes);
app.use("/api/contest", contestRoutes);
app.use("/api/forms", formRoutes);

export default app;
