// backend/app.js
import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";

// Core app routes
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

// Admin utilities
import adminSessionRoutes from "./routes/adminSessionRoutes.js";
import adminAuditRoutes from "./routes/adminAuditRoutes.js";

dotenv.config();
connectDB();

const app = express();

// Trust Render/Reverse proxy so req.ip & x-forwarded-for work
app.set("trust proxy", true);

// --- Health check for Render ---
app.get("/health", (req, res) => res.send("OK"));

/**
 * Tiny dependency-free CORS that:
 *  - Allows your Vercel app + localhost
 *  - Handles preflight properly (reflects Access-Control-Request-Headers)
 *  - Whitelists the custom telemetry/session headers you use
 *  - Works whether the browser sends lowercase or PascalCase names
 */
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS ||
  "https://teesfromthepast.vercel.app,http://localhost:5173,http://localhost:3000")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const DEFAULT_ALLOWED_HEADERS = [
  // standard
  "content-type",
  "authorization",
  "x-requested-with",

  // your session & telemetry headers (lowercase for preflight consistency)
  "x-session-id",
  "x-client-info",
  "x-client-timezone",
  "x-client-lang",
  "x-client-viewport",
  "x-client-platform",
  "x-client-ua",
  "x-client-localtime",
  "x-client-devicememory",
  "x-client-cpucores",
];

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    // allow sharing the response across varying origins
    res.setHeader("Vary", "Origin");
  }

  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");

  // If the browser sent a preflight header list, reflect it back.
  // Otherwise, send our default, which includes all custom headers we use.
  const requested = req.headers["access-control-request-headers"];
  res.setHeader(
    "Access-Control-Allow-Headers",
    (requested && String(requested)) || DEFAULT_ALLOWED_HEADERS.join(", ")
  );

  // We use Bearer tokens (not cookies), so credentials are not required.
  // Flip to true if you later use cookies.
  res.setHeader("Access-Control-Allow-Credentials", "false");

  if (req.method === "OPTIONS") {
    // End preflight quickly
    return res.status(204).end();
  }
  next();
});

// JSON body parsing
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

// Admin feature routes
app.use("/api/admin/users", adminUserRoutes);
app.use("/api/admin/orders", adminOrderRoutes);
app.use("/api/admin/designs", adminDesignRoutes);
app.use("/api/admin/products", adminProductRoutes);
app.use("/api/admin/sessions", adminSessionRoutes);
app.use("/api/admin/audit", adminAuditRoutes);

// Public extras
app.use("/api/contest", contestRoutes);
app.use("/api/forms", formRoutes);

export default app;
