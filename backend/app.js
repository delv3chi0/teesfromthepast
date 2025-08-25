/*
  backend/app.js (cleaned)
  - CORS applied before any routes (including /health)
  - Removed temporary debug preflight logs and /api/_cors-diag route
  - Preserves previous functionality and exports
*/

import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import compression from "compression";

import { JSON_BODY_LIMIT_MB } from "./config/constants.js";
import { requestId } from "./middleware/requestId.js";
import { requestLogger } from "./middleware/requestLogger.js";
import rateLimitLogin from "./middleware/rateLimitLogin.js";

// Initialize Cloudinary side-effects early
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

// Startup / CORS config log
console.log(`[Startup] NODE_ENV=${process.env.NODE_ENV || "development"} MODE.`);
logCorsConfig();

// Apply CORS before any routes
applyCors(app);

// Health (now receives CORS headers)
app.get("/health", (_req, res) => res.status(200).send("OK"));

/*
  Stripe webhook BEFORE json parser if the webhook route needs raw body.
  (Assumes stripeWebhookRoutes internally handles raw body if required.)
*/
app.use("/api/stripe", stripeWebhookRoutes);

// JSON body parser
app.use(express.json({ limit: `${JSON_BODY_LIMIT_MB}mb` }));

// Compression middleware with threshold
app.use(compression({
  threshold: 1024, // 1kb threshold
  level: 6, // balance between compression ratio and CPU usage
  filter: (req, res) => {
    // Don't compress already compressed responses or specific content types
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Security headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// Rate limits
const contactLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5, // limit each IP to 5 registration/password reset requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many authentication attempts, please try again later." }
});

const burstyLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 20, // 20 requests per minute for bursty endpoints
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later." }
});

app.use("/api/forms/contact", contactLimiter);
app.use("/api/auth/login", rateLimitLogin);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/password-reset-request", authLimiter);
app.use("/api/auth/reset-password", authLimiter);

// Request metadata / logging
app.use(requestId);
app.use(requestLogger);

// Cloudinary direct upload + config
app.use("/api/cloudinary", cloudinaryDirectUploadRoutes);
app.use("/api/config", configRoutes);

// Core application routes
app.use("/api/auth", authRoutes);
app.use("/api/auth", emailVerificationRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/mydesigns", designsRoutes);
app.use("/api/storefront", storefrontRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use("/api/printful", printfulRoutes);
app.use("/api/orders", ordersRoutes);

// Admin routes
app.use("/api/admin/users", adminUserRoutes);
app.use("/api/admin/orders", adminOrderRoutes);
app.use("/api/admin/designs", adminDesignRoutes);
app.use("/api/admin/products", adminProductRoutes);
app.use("/api/admin/sessions", adminSessionRoutes);
app.use("/api/admin/audit", adminAuditRoutes);

// Public extras
app.use("/api/contest", contestRoutes);
app.use("/api/forms", formRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: { code: "NOT_FOUND", message: "Resource not found." },
    requestId: req.id,
  });
});

// Error handler (captures CORS origin errors too)
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

export { app };
export default app;
