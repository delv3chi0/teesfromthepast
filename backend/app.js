/*
  backend/app.js
  - Ensures CORS is applied before ANY route (including /health).
  - Adds temporary debug logging for OPTIONS requests to verify Origin header flow.
  - Provides optional diagnostic endpoint /api/_cors-diag (remove after validation).
  - Preserves prior functionality and exports.
*/

import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import { JSON_BODY_LIMIT_MB } from "./config/constants.js";
import { requestId } from "./middleware/requestId.js";
import { requestLogger } from "./middleware/requestLogger.js";
import rateLimitLogin from "./middleware/rateLimitLogin.js";

// Side-effect: configure Cloudinary early
import "./config/cloudinary.js";

// CORS utilities
import { applyCors, logCorsConfig } from "./utils/cors.js";

/* Route imports */
import authRoutes from "./routes/auth.js";
import emailVerificationRoutes from "./routes/emailVerificationRoutes.js";
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
import adminSessionRoutes from "./routes/adminSessionRoutes.js";
import adminAuditRoutes from "./routes/adminAuditRoutes.js";
import contestRoutes from "./routes/contest.js";
import formRoutes from "./routes/formRoutes.js";
import configRoutes from "./routes/configRoutes.js";
import cloudinaryDirectUploadRoutes from "./routes/cloudinaryDirectUploadRoutes.js";

const app = express();
app.set("trust proxy", 1);

// Startup logging
console.log(
  `[Startup] NODE_ENV=${process.env.NODE_ENV || "development"} MODE.`
);
logCorsConfig();

/* ------------------------------------------------------------------
   TEMP DEBUG MIDDLEWARE (remove after confirming CORS in production)
------------------------------------------------------------------- */
app.use((req, _res, next) => {
  if (req.method === "OPTIONS") {
    // Minimal log to confirm origin and path before CORS handling
    console.log(
      `[DEBUG CORS] Preflight -> Path: ${req.path}, Origin: ${req.headers.origin || "(none)"}`
    );
  }
  next();
});

/* Apply CORS BEFORE ANY ROUTES (including /health) */
applyCors(app);

// Optional diagnostic route (remove after testing)
app.get("/api/_cors-diag", (req, res) => {
  res.json({
    ok: true,
    note: "Temporary CORS diagnostic endpoint",
    receivedOrigin: req.headers.origin || null,
    timestamp: new Date().toISOString(),
  });
});

/* Health route (now also gains CORS headers) */
app.get("/health", (_req, res) => res.status(200).send("OK"));

/* Stripe webhook BEFORE general body parsing if it expects raw body internally */
app.use("/api/stripe", stripeWebhookRoutes);

/* JSON body parser */
app.use(express.json({ limit: `${JSON_BODY_LIMIT_MB}mb` }));

/* Security headers */
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

/* Rate limits */
const contactLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/forms/contact", contactLimiter);
app.use("/api/auth/login", rateLimitLogin);

/* Request metadata/logging */
app.use(requestId);
app.use(requestLogger);

/* New Cloudinary direct upload + config */
app.use("/api/cloudinary", cloudinaryDirectUploadRoutes);
app.use("/api/config", configRoutes);

/* Core application routes */
app.use("/api/auth", authRoutes);
app.use("/api/auth", emailVerificationRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/mydesigns", designsRoutes);
app.use("/api/storefront", storefrontRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use("/api/printful", printfulRoutes);
app.use("/api/orders", ordersRoutes);

/* Admin routes */
app.use("/api/admin/users", adminUserRoutes);
app.use("/api/admin/orders", adminOrderRoutes);
app.use("/api/admin/designs", adminDesignRoutes);
app.use("/api/admin/products", adminProductRoutes);
app.use("/api/admin/sessions", adminSessionRoutes);
app.use("/api/admin/audit", adminAuditRoutes);

/* Public extras */
app.use("/api/contest", contestRoutes);
app.use("/api/forms", formRoutes);

/* 404 handler */
app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: { code: "NOT_FOUND", message: "Resource not found." },
    requestId: req.id,
  });
});

/* Error handler (captures CORS origin errors too) */
app.use((err, req, res, next) => {
  const msg = err?.message || "";
  if (/^CORS: Origin not allowed:/i.test(msg)) {
    if (!res.headersSent) {
      return res.status(403).json({
        ok: false,
        error: { code: "CORS_ORIGIN_DENIED", message: msg },
        requestId: req.id,
      });
    }
  }
  console.error("[Unhandled Error]", err);
  if (res.headersSent) return next(err);
  res.status(500).json({
    ok: false,
    error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred." },
    requestId: req.id,
  });
});

/* Export BOTH default and named */
export { app };
export default app;
