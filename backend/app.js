// backend/app.js
import express from "express";
import "dotenv/config";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import hpp from "hpp";
import xss from "xss-clean";

// ---- ROUTES (IMPORTS) ----
import authRoutes from "./routes/auth.js";
import designRoutes from "./routes/designs.js";               // used for /api/designs and /api/mydesigns
import adminRouter from "./routes/admin.js";                  // your existing “admin bundle”
import adminSessionRoutes from "./routes/adminSessionRoutes.js";
import adminAuditRoutes from "./routes/adminAuditRoutes.js";
import stripeWebhookRoutes from "./routes/stripeWebhook.js";  // must use express.raw inside

import { protect } from "./middleware/authMiddleware.js";

const app = express();
app.set("trust proxy", 1);

// ---- Security / Hardening ----
app.use(helmet());

// ---- CORS (explicit + credentials + proper OPTIONS short-circuit) ----
const ALLOWED_ORIGINS = new Set([
  "https://teesfromthepast.vercel.app",
  "http://localhost:5173",
  // Add any preview URLs if you use them, e.g.:
  // "https://teesfromthepast-git-somehash.vercel.app",
]);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin"); // so caches don’t collapse responses across origins
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader(
      "Access-Control-Allow-Headers",
      // Allow typical SPA headers; add others if you use them
      "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-CSRF-Token"
    );
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    );
  }

  if (req.method === "OPTIONS") {
    // Preflight should return 204 quickly
    return res.status(204).end();
  }

  return next();
});

app.use(cookieParser());

// ---- Stripe webhook FIRST (needs raw body inside the route file) ----
app.use("/api/stripe", stripeWebhookRoutes);

// ---- JSON body parsers AFTER webhook ----
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// ---- Hardening ----
app.use(mongoSanitize());
app.use(xss());
app.use(hpp());

// ---- Rate limit on API ----
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", limiter);

// ---- Debug log (optional) ----
app.use((req, _res, next) => {
  console.log(`[App] ${req.method} ${req.originalUrl} — Origin: ${req.headers.origin || "N/A"}`);
  next();
});

// ---- Health ----
app.get("/", (_req, res) => res.send("Tees From The Past Backend API"));
app.get("/health", (_req, res) => res.status(200).json({ status: "OK" }));

// ---- API Routers ----
app.use("/api/auth", authRoutes);
app.use("/api/designs", designRoutes);
app.use("/api/mydesigns", designRoutes);

// ---- Admin bundles ----
app.use("/api/admin", protect, adminRouter);
app.use("/api/admin/sessions", adminSessionRoutes);
app.use("/api/admin/audit", adminAuditRoutes);

// ---- Global error handler ----
app.use((err, req, res, _next) => {
  console.error("[Backend Error]", err.message, err.stack ? `\nStack: ${err.stack}` : "");
  const status = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(status).json({
    message: err.message,
    stack: process.env.NODE_ENV === "production" ? "🥞" : err.stack,
  });
});

export default app;
