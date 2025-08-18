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
import { csrfStrict, csrfTokenRoute } from "./middleware/csrfStrict.js";

const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");

// ---- Security / Hardening ----
app.use(helmet());

// ---- CORS (no cookies/credentials; JWT is sent in Authorization header) ----
const ALLOWED = new Set([
  "https://teesfromthepast.vercel.app",
  "http://localhost:5173",
]);
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization"
    );
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    );
    // No credentials because we are not using cookies for auth
  }
  if (req.method === "OPTIONS") return res.status(204).end();
  next();
});

app.use(cookieParser());

// ---- Stripe webhook FIRST (raw body is configured inside the route file) ----
app.use("/api/stripe", stripeWebhookRoutes);

// ---- JSON body parsers AFTER webhook ----
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// ---- Hardening ----
app.use(mongoSanitize());
app.use(xss());
app.use(hpp());

// ---- Rate limit on API ----
app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// ---- CSRF (no-op) ----
app.use(csrfStrict);

// ---- Debug log (optional) ----
app.use((req, _res, next) => {
  console.log(`[App] ${req.method} ${req.originalUrl}`);
  next();
});

// ---- Health ----
app.get("/", (_req, res) => res.send("Tees From The Past Backend API"));
app.get("/health", (_req, res) => res.status(200).json({ status: "OK" }));

// ---- API Routers ----
app.use("/api/auth", authRoutes);
app.use("/api/designs", designRoutes);
app.use("/api/mydesigns", designRoutes);
app.get("/api/csrf", csrfTokenRoute); // returns { csrfToken: null, csrf: "disabled" }

// ---- Admin bundles ----
app.use("/api/admin", protect, adminRouter);
app.use("/api/admin/sessions", adminSessionRoutes);
app.use("/api/admin/audit", adminAuditRoutes);

// ---- Global error handler ----
app.use((err, req, res, _next) => {
  console.error(
    "[Backend Error]",
    err.message,
    err.stack ? `\nStack: ${err.stack}` : ""
  );
  const status = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(status).json({
    message: err.message,
    stack: process.env.NODE_ENV === "production" ? "🥞" : err.stack,
  });
});

export default app;
