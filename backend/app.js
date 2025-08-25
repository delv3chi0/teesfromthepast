import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import { JSON_BODY_LIMIT_MB } from "./config/constants.js";

// Middleware (must be named exports or defaults as implemented)
import { requestId } from "./middleware/requestId.js";
import { requestLogger } from "./middleware/requestLogger.js";
import rateLimitLogin from "./middleware/rateLimitLogin.js";

// Core route modules (adjust filenames if yours differ)
import authRoutes from "./routes/auth.js";
import emailVerificationRoutes from "./routes/emailVerificationRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import designsRoutes from "./routes/designs.js";
import storefrontRoutes from "./routes/storefrontProductRoutes.js";
import checkoutRoutes from "./routes/checkout.js";          // Updated to include alias route
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

const app = express();

/**
 * Trust the Render proxy (one hop) so rate limiting & req.ip are accurate.
 */
app.set("trust proxy", 1);

/**
 * Health check FIRST (fast, no deps)
 */
app.get("/health", (_req, res) => res.status(200).send("OK"));

/**
 * CORS: allow configured origins, expose X-Req-Id so clients can correlate errors.
 * (You chose a dependency-free approach; preserved.)
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
  "x-req-id"
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
  // Expose request correlation header
  res.setHeader("Access-Control-Expose-Headers", "X-Req-Id");
  if (req.method === "OPTIONS") return res.status(204).end();
  next();
});

/**
 * STRIPE WEBHOOK: Must come BEFORE express.json() so its route can use express.raw().
 * (Assumes stripeWebhookRoutes internally sets the raw body middleware for the specific endpoint.)
 */
app.use("/api/stripe", stripeWebhookRoutes);

/**
 * JSON body parser (after Stripe) with configurable limit.
 */
app.use(
  express.json({
    limit: `${JSON_BODY_LIMIT_MB}mb`
  })
);

/**
 * Security headers + CSP (retain your earlier allowances, updated to also permit Cloudinary, hCaptcha).
 */
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        "script-src": [
          "'self'",
          "'unsafe-inline'",
          "https://js.hcaptcha.com",
          "https://hcaptcha.com"
        ],
        "frame-src": ["'self'", "https://hcaptcha.com", "https://*.hcaptcha.com"],
        "style-src": ["'self'", "'unsafe-inline'"],
        "img-src": ["'self'", "data:", "blob:", "https://res.cloudinary.com"],
        "connect-src": ["'self'", "https://api.hcaptcha.com", ...ALLOWED_ORIGINS]
      }
    }
  })
);

/**
 * Contact form rate limiter (unchanged behavior)
 */
const contactLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false
});
app.use("/api/forms/contact", contactLimiter);

/**
 * Targeted login rate limiter (new). Must appear BEFORE authRoutes for /login.
 * - Only throttles POST /api/auth/login (or whatever method you use).
 * Adjust MAX_ATTEMPTS or window in middleware if needed.
 */
app.use("/api/auth/login", rateLimitLogin);

/**
 * Request tracing & logging (after basic infra middleware, before business routes)
 */
app.use(requestId);
app.use(requestLogger);

/**
 * Public & user routes
 */
app.use("/api/auth", authRoutes);
app.use("/api/auth", emailVerificationRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/mydesigns", designsRoutes);
app.use("/api/storefront", storefrontRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use("/api/printful", printfulRoutes);
app.use("/api/orders", ordersRoutes);

/**
 * Admin routes
 */
app.use("/api/admin/users", adminUserRoutes);
app.use("/api/admin/orders", adminOrderRoutes);
app.use("/api/admin/designs", adminDesignRoutes);
app.use("/api/admin/products", adminProductRoutes);
app.use("/api/admin/sessions", adminSessionRoutes);
app.use("/api/admin/audit", adminAuditRoutes);

/**
 * Public extras
 */
app.use("/api/contest", contestRoutes);
app.use("/api/forms", formRoutes);

/**
 * 404 handler
 */
app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: { code: "NOT_FOUND", message: "Resource not found." },
    requestId: req.id
  });
});

/**
 * Central error handler (non-strict; lets earlier sendError responses pass)
 */
app.use((err, req, res, next) => {
  console.error("[Unhandled Error]", err);
  if (res.headersSent) return next(err);
  res.status(500).json({
    ok: false,
    error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred." },
    requestId: req.id
  });
});

export default app;
