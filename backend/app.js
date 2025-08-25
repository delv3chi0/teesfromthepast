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
import cookieParser from "cookie-parser";

import { JSON_BODY_LIMIT_MB } from "./config/constants.js";
import { requestId } from "./middleware/requestId.js";
import { requestLogger } from "./middleware/requestLogger.js";
import perfHeaders from "./middleware/perfHeaders.js";
import rateLimitLogin from "./middleware/rateLimitLogin.js";
import logger from "./utils/logger.js";

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

// Enable ETag for response caching
app.set('etag', true);

// Startup / CORS config log
logger.info(`Server starting in ${process.env.NODE_ENV || "development"} mode`);
logCorsConfig();

// Apply CORS before any routes
applyCors(app);

// Add compression middleware (threshold 1kb, auto-negotiates gzip/brotli)
app.use(compression({
  threshold: 1024, // Only compress responses larger than 1kb
  level: 6 // Balanced compression level
}));

// Performance headers middleware
app.use(perfHeaders);

// Health endpoint with detailed status
app.get("/health", (_req, res) => {
  const uptime = process.uptime();
  const version = process.env.npm_package_version || "1.0.0";
  const gitSha = process.env.GIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || "unknown";
  
  res.status(200).json({
    ok: true,
    uptime: Math.floor(uptime),
    version,
    gitSha,
    time: new Date().toISOString(),
    env: process.env.NODE_ENV || "development"
  });
});

// Enhanced healthz endpoint
app.get("/healthz", (_req, res) => {
  const uptime = process.uptime();
  const version = process.env.npm_package_version || "1.0.0";
  const gitSha = process.env.GIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || "unknown";
  
  res.status(200).json({
    ok: true,
    uptime: Math.floor(uptime),
    version,
    gitSha,
    time: new Date().toISOString()
  });
});

/*
  Stripe webhook BEFORE json parser if the webhook route needs raw body.
  (Assumes stripeWebhookRoutes internally handles raw body if required.)
*/
app.use("/api/stripe", stripeWebhookRoutes);

// JSON body parser
app.use(express.json({ limit: `${JSON_BODY_LIMIT_MB}mb` }));

// Cookie parser for session management
app.use(cookieParser());

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
app.use("/api/forms/contact", contactLimiter);
app.use("/api/auth/login", rateLimitLogin);

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
  logger.error("Unhandled error", { 
    error: err.message, 
    stack: err.stack,
    requestId: req.id,
    method: req.method,
    path: req.path 
  });
  if (res.headersSent) return next(err);
  res.status(500).json({
    ok: false,
    error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred." },
    requestId: req.id,
  });
});

export { app };
export default app;
