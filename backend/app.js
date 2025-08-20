// backend/app.js
import express from "express";
import "dotenv/config";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import hpp from "hpp";
import xss from "xss-clean";

// ---- ROUTES (IMPORTS) ----
import authRoutes from "./routes/auth.js";
import designRoutes from "./routes/designs.js";

// Admin route bundles (mount ALL explicitly so /api/admin/* exists)
import adminRouter from "./routes/admin.js";
import adminUserRoutes from "./routes/adminUserRoutes.js";
import adminOrderRoutes from "./routes/adminOrderRoutes.js";
import adminDesignRoutes from "./routes/adminDesignRoutes.js";
import adminProductRoutes from "./routes/adminProductRoutes.js";
import adminSessionRoutes from "./routes/adminSessionRoutes.js";
import adminAuditRoutes from "./routes/adminAuditRoutes.js";

import stripeWebhookRoutes from "./routes/stripeWebhook.js"; // uses express.raw inside file
import { protect } from "./middleware/authMiddleware.js";

const app = express();
app.set("trust proxy", 1);

// ---- Security / Hardening ----
app.use(helmet());

// ---- CORS ----
// We use JWT in headers (no cookies) => CSRF not needed.
const STATIC_ALLOW = new Set([
  "https://teesfromthepast.vercel.app",
  "http://localhost:5173",
]);

function isAllowedOrigin(origin) {
  if (!origin) return true; // curl/postman
  if (STATIC_ALLOW.has(origin)) return true;
  // allow Vercel preview branches like https://<branch>-teesfromthepast.vercel.app
  try {
    const u = new URL(origin);
    return u.hostname.endsWith("-teesfromthepast.vercel.app");
  } catch {
    return false;
  }
}

const corsOptions = {
  origin(origin, cb) {
    if (isAllowedOrigin(origin)) return cb(null, true);
    return cb(new Error("Not allowed by CORS: " + origin));
  },
  credentials: false, // IMPORTANT: no cookies for auth
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Authorization", "Content-Type", "X-Requested-With"],
};
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

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
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", limiter);

// ---- Debug log ----
app.use((req, _res, next) => {
  console.log(`[App] ${req.method} ${req.originalUrl}`);
  next();
});

// ---- Health ----
app.get("/", (_req, res) => res.send("Tees From The Past Backend API"));
app.get("/health", (_req, res) => res.status(200).json({ status: "OK" }));

// ---- Public API Routers ----
app.use("/api/auth", authRoutes);
app.use("/api/designs", designRoutes);
app.use("/api/mydesigns", designRoutes);

// ---- Admin API Routers (mount ALL explicit sub-routers) ----
// Each sub-router already applies protect/admin internally, but mounting behind
// /api/admin + protect ensures no accidental exposure if a file forgets it.
app.use("/api/admin", protect, adminRouter);
app.use("/api/admin/users", protect, adminUserRoutes);
app.use("/api/admin/orders", protect, adminOrderRoutes);
app.use("/api/admin/designs", protect, adminDesignRoutes);
app.use("/api/admin/products", protect, adminProductRoutes);
app.use("/api/admin/sessions", protect, adminSessionRoutes);
app.use("/api/admin/audit", protect, adminAuditRoutes);

// ---- Global error handler ----
app.use((err, req, res, _next) => {
  console.error("[Backend Error]", err.message, err.stack ? `\nStack: ${err.stack}` : "");
  const status = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  res.status(status).json({
    message: err.message,
    stack: process.env.NODE_ENV === "production" ? "🥞" : err.stack,
  });
});

export default app;
