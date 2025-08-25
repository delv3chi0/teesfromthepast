/*
  backend/app.js (cleaned)
  - CORS applied before any routes (including /health)
  - Removed temporary debug preflight logs and /api/_cors-diag route
  - Preserves previous functionality and exports
  - Enhanced with compression, structured logging, and performance headers
*/

import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import { JSON_BODY_LIMIT_MB } from "./config/constants.js";
import { requestId } from "./middleware/requestId.js";
import { createRequestLogger } from "./utils/logger.js";
import rateLimitLogin from "./middleware/rateLimitLogin.js";
import { loginRateLimit, registerRateLimit, passwordResetRateLimit, trackFailedLogin, checkLoginLockout } from "./middleware/rateLimiter.js";
import compressionMiddleware from "./middleware/compression.js";
import perfHeadersMiddleware from "./middleware/perfHeaders.js";
import { cachePublicConfig } from "./utils/cache.js";

// Initialize Cloudinary side-effects early
import "./config/cloudinary.js";

// CORS utilities
import { applyCors, logCorsConfig } from "./utils/cors.js";

// Structured logging
import logger from "./utils/logger.js";

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

// Enable strong ETag for better caching
app.set('etag', 'strong');

// Startup / CORS config log
logger.info(`[Startup] NODE_ENV=${process.env.NODE_ENV || "development"} MODE.`);
logCorsConfig();

// Apply compression early (before routes)
app.use(compressionMiddleware);

// Apply CORS before any routes
applyCors(app);

// Performance headers middleware
app.use(perfHeadersMiddleware);

// Health endpoints (now receives CORS headers)
import healthRoutes from "./routes/health.js";
app.use(healthRoutes);

/*
  Stripe webhook BEFORE json parser if the webhook route needs raw body.
  (Assumes stripeWebhookRoutes internally handles raw body if required.)
*/
app.use("/api/stripe", stripeWebhookRoutes);

// JSON body parser
app.use(express.json({ limit: `${JSON_BODY_LIMIT_MB}mb` }));

// Security headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// Enhanced rate limits with security tracking
const contactLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/forms/contact", contactLimiter);

// Enhanced auth rate limiting
app.use("/api/auth/login", checkLoginLockout, loginRateLimit, trackFailedLogin);
app.use("/api/auth/register", registerRateLimit);
app.use("/api/auth/forgot-password", passwordResetRateLimit);
app.use("/api/auth/reset-password", passwordResetRateLimit);

// Request metadata / logging with structured logging
app.use(requestId);
app.use(createRequestLogger());

// Cloudinary direct upload + config (with caching for public config)
app.use("/api/cloudinary", cloudinaryDirectUploadRoutes);
app.use("/api/config", cachePublicConfig, configRoutes);

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

// Global error handler with structured logging
app.use((err, req, res, next) => {
  const msg = err?.message || "";
  const context = {
    reqId: req.id,
    userId: req.user?.id,
    method: req.method,
    path: req.path,
    ip: req.client?.ip || req.ip,
    userAgent: req.headers['user-agent']
  };

  if (/^CORS: Origin not allowed:/i.test(msg)) {
    logger.warn({ ...context, error: msg }, 'CORS origin denied');
    if (!res.headersSent) {
      return res.status(403).json({
        ok: false,
        error: { code: "CORS_ORIGIN_DENIED", message: msg },
        requestId: req.id,
      });
    }
  }
  
  // Log error with appropriate level and detail
  const errorData = {
    ...context,
    error: {
      name: err.name,
      message: err.message,
      stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
    }
  };

  if (err.status >= 400 && err.status < 500) {
    logger.warn(errorData, `Client error: ${err.message}`);
  } else {
    logger.error(errorData, `Server error: ${err.message}`);
  }

  if (res.headersSent) return next(err);
  
  res.status(err.status || 500).json({
    ok: false,
    error: { 
      code: err.code || "INTERNAL_ERROR", 
      message: process.env.NODE_ENV === 'production' ? "An unexpected error occurred." : err.message
    },
    requestId: req.id,
  });
});

export { app };
export default app;
