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
import designRoutes from "./routes/designs.js";
import myDesignRoutes from "./routes/designs.js";
import adminRouter from "./routes/adminRoutes.js";
import adminSessionRoutes from "./routes/adminSessionRoutes.js";
import adminAuditRoutes from "./routes/adminAuditRoutes.js";
// IMPORTANT: this route must export a Router that uses express.raw on the webhook path
import stripeWebhookRoutes from "./routes/stripeWebhook.js";

import { protect } from "./middleware/authMiddleware.js";

const app = express();
app.set("trust proxy", 1);

// ---- Security / Hardening ----
app.use(helmet());

const allowedOrigins = [
  "https://teesfromthepast.vercel.app",
  "http://localhost:5173",
  // "https://<your-custom-domain>"
];
const corsOptions = {
  origin(origin, cb) {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    console.warn(`[CORS] Blocked origin: ${origin}`);
    return cb(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
};
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(cookieParser());

// ---- Stripe webhook FIRST (needs raw body) ----
// The route file should internally do something like:
// router.post('/webhook', express.raw({ type: 'application/json' }), handler)
app.use("/api/stripe", stripeWebhookRoutes);

// ---- JSON body parsers AFTER webhook ----
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

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
  console.log(`[App] ${req.method} ${req.originalUrl}`);
  next();
});

// ---- Health ----
app.get("/", (_req, res) => res.send("Tees From The Past Backend API"));
app.get("/health", (_req, res) => res.status(200).json({ status: "OK" }));

// ---- API Routers (ensure /api prefix consistency) ----
app.use("/api/auth", authRoutes);
app.use("/api/designs", designRoutes);
app.use("/api/mydesigns", myDesignRoutes);

// Admin
app.use("/api/admin", protect, adminRouter);           // core admin bundle (/users, /orders, /designs etc.)
app.use("/api/admin/sessions", adminSessionRoutes);    // devices tab
app.use("/api/admin/audit", adminAuditRoutes);         // audit logs tab

// ---- Global error handler (keep your existing one) ----
export default app;
