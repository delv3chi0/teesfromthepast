// backend/app.js
import express from "express";
import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import hpp from "hpp";
import xss from "xss-clean";

// ---- ROUTES (IMPORTS) ----
import authRoutes from "./routes/auth.js";
import designRoutes from "./routes/designs.js";               // used for /api/designs and /api/mydesigns
import adminRouter from "./routes/admin.js";                  // admin bundle
import adminSessionRoutes from "./routes/adminSessionRoutes.js";
import adminAuditRoutes from "./routes/adminAuditRoutes.js";
import stripeWebhookRoutes from "./routes/stripeWebhook.js";  // must use express.raw inside

import { protect } from "./middleware/authMiddleware.js";

const app = express();
app.set("trust proxy", 1);

// ---- Security / Hardening ----
app.use(helmet());

// ---- CORS ----
// Allow prod, localhost, and any Vercel preview *.vercel.app
const STATIC_ALLOWED = new Set([
  "https://teesfromthepast.vercel.app",
  "http://localhost:5173",
]);

function isAllowedOrigin(origin) {
  if (!origin) return true; // server-to-server, curl, etc.
  if (STATIC_ALLOWED.has(origin)) return true;
  try {
    const u = new URL(origin);
    if (u.hostname.endsWith(".vercel.app")) return true; // preview domains
  } catch {} // ignore bad origins
  return false;
}

const corsOptions = {
  origin(origin, cb) {
    if (isAllowedOrigin(origin)) return cb(null, true);
    console.warn(`[CORS] Blocked origin: ${origin}`);
    return cb(new Error("Not allowed by CORS"));
  },
  credentials: true, // safe to leave on; we don't set session cookies
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
  ],
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

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

// ---- Debug log (quiet in prod) ----
app.use((req, _res, next) => {
  if (process.env.NODE_ENV !== "production") {
    console.log(`[App] ${req.method} ${req.originalUrl}`);
  }
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

  // keep CORS headers on errors for allowed origins
  const origin = req.get("Origin");
  if (isAllowedOrigin(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }

  res.status(status).json({
    message: err.message,
    stack: process.env.NODE_ENV === "production" ? "🥞" : err.stack,
  });
});

export default app;
