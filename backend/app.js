/*
  backend/app.js (cleaned)
  - CORS applied before any routes (including /health)
  - Removed temporary debug preflight logs and /api/_cors-diag route
  - Preserves previous functionality and exports
*/

import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import { JSON_BODY_LIMIT_MB } from "./config/constants.js";
import { requestId } from "./middleware/requestId.js";
import { createRequestLogger } from "./utils/logger.js";
import rateLimitLogin from "./middleware/rateLimitLogin.js";
import { metricsMiddleware, getMetricsHandler } from "./middleware/metrics.js";
import inFlightTracker from "./middleware/inFlightTracker.js";
import { createSecurityHeaders } from "./middleware/securityHeaders.js";

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
import metricsRoutes from "./routes/metrics.js";
import configRoutes from "./routes/configRoutes.js";
import cloudinaryDirectUploadRoutes from "./routes/cloudinaryDirectUploadRoutes.js";
import healthRoutes from "./routes/health.js";

const app = express();
app.set("trust proxy", 1);

// Startup / CORS config log
console.log(`[Startup] NODE_ENV=${process.env.NODE_ENV || "development"} MODE.`);
logCorsConfig();

// Apply CORS before any routes
applyCors(app);

// In-flight request tracking for graceful shutdown
app.use(inFlightTracker);

// Operational endpoints (health, readiness, version, metrics)
app.use(healthRoutes);

// Version endpoint
import { getVersionInfo } from "./version/index.js";
app.get("/version", (_req, res) => {
  try {
    const versionInfo = getVersionInfo();
    res.status(200).json(versionInfo);
  } catch (error) {
    res.status(500).json({
      error: { code: 'VERSION_ERROR', message: 'Unable to retrieve version information' }
    });
  }
});

// Metrics endpoint
app.get("/metrics", getMetricsHandler);

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

// Additional security headers middleware
app.use(createSecurityHeaders({
  skipPaths: ['/api/stripe'] // Skip CSP for webhook endpoints that might need raw body
}));

// Global Redis-backed rate limiting
import { createRateLimit } from "./middleware/rateLimit.js";
app.use(createRateLimit());

// Rate limits with adaptive abuse detection
import { createAdaptiveRateLimit } from "./utils/adaptiveRateLimit.js";

const contactLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply adaptive rate limiting to different route groups
app.use("/api/forms/contact", contactLimiter);
app.use("/api/auth/login", createAdaptiveRateLimit('auth'));
app.use("/api/auth/register", createAdaptiveRateLimit('auth'));
app.use("/api/upload", createAdaptiveRateLimit('upload'));
app.use("/api", createAdaptiveRateLimit('api')); // General API rate limiting

// Request metadata / logging / metrics
app.use(requestId);
app.use(createRequestLogger);
app.use(metricsMiddleware);

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
app.use("/api/metrics", metricsRoutes);

// Development error test route (only in non-production)
if (process.env.NODE_ENV !== 'production') {
  app.get('/api/dev/boom', (req, res, next) => {
    const error = new Error('Simulated error for testing');
    error.statusCode = 500;
    error.code = 'TEST_ERROR';
    next(error);
  });
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: { code: "NOT_FOUND", message: "Resource not found." },
    requestId: req.id,
  });
});

// Global error handler (must be last)
import { sentryErrorHandler } from "./utils/errorMonitoring.js";

// Custom CORS error handler first
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
  next(err); // Pass to Sentry error handler
});

// Sentry error handler (handles all other errors)
app.use(sentryErrorHandler);

export { app };
export default app;
