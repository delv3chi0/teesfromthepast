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
import adminRouter from "./routes/admin.js";                  // your existing “admin bundle”
import adminSessionRoutes from "./routes/adminSessionRoutes.js";
import adminAuditRoutes from "./routes/adminAuditRoutes.js";
import stripeWebhookRoutes from "./routes/stripeWebhook.js";  // route must use express.raw on /webhook

import { protect } from "./middleware/authMiddleware.js";
import { csrfSelective, csrfTokenRoute } from "./middleware/csrfSelective.js";

const app = express();
app.set("trust proxy", 1);

// ---- Security / Hardening ----
app.use(helmet());

// ---- CORS ----
const allowedOrigins = [
  "https://teesfromthepast.vercel.app",
  "http://localhost:5173",
  // add preview/custom domains here if needed
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

// ---- Stripe webhook FIRST (needs raw body inside the route file) ----
// routes/stripeWebhook.js should do: router.post('/webhook', express.raw({ type: 'application/json' }), handler)
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

// ---- CSRF (selective; currently non-blocking for your JWT API) ----
app.use(csrfSelective);

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
app.use("/api/mydesigns", designRoutes);   // reuse same router
app.get("/api/csrf", csrfTokenRoute);      // (optional) endpoint to fetch a CSRF token if needed later

// ---- Admin bundles ----
app.use("/api/admin", protect, adminRouter);        // users/orders/designs, etc.
app.use("/api/admin/sessions", adminSessionRoutes); // devices tab
app.use("/api/admin/audit", adminAuditRoutes);      // audit logs tab

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
