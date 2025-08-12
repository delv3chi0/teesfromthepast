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

// Route imports
import authRoutes from "./routes/auth.js";
import generateImageRoutes from "./routes/generateImage.js";
import stripeWebhookRoutes from "./routes/stripeWebhook.js";
import checkoutRoutes from "./routes/checkout.js";
import designRoutes from "./routes/designs.js";
import contestRoutes from "./routes/contest.js";
import orderRoutes from "./routes/orders.js";
import formRoutes from "./routes/formRoutes.js";
import adminUserRoutes from "./routes/adminUserRoutes.js";
import adminOrderRoutes from "./routes/adminOrderRoutes.js";
import adminDesignRoutes from "./routes/adminDesignRoutes.js";
import adminProductRoutes from "./routes/adminProductRoutes.js";
import storefrontProductRoutes from "./routes/storefrontProductRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import printfulRoutes from "./routes/printful.js";

const app = express();

// --- Security / infra middleware ---
app.set("trust proxy", 1);            // important on Render/Vercel proxies
app.use(helmet());

// CORS (allow your site + local dev)
const allowedOrigins = [
  "https://teesfromthepast.vercel.app",
  "http://localhost:5173",
];
const corsOptions = {
  origin(origin, callback) {
    // allow no-origin (curl, native apps) and vercel preview subdomains
    if (
      !origin ||
      allowedOrigins.includes(origin) ||
      origin.endsWith("-delv3chios-projects.vercel.app")
    ) {
      return callback(null, true);
    }
    console.warn(`[CORS] Blocked origin: ${origin}`);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions));

// Stripe webhook (raw body) — must be BEFORE express.json()
app.use("/api/stripe", stripeWebhookRoutes);

// Body parsers (larger limits for images/base64)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Hardening
app.use(mongoSanitize());
app.use(xss());
app.use(hpp());

// Rate limiter on all API
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests from this IP, please try again after 15 minutes",
});
app.use("/api", limiter);

// Debug log so we can see requests hitting the app
app.use((req, _res, next) => {
  console.log(`[App] ${req.method} ${req.originalUrl}`);
  next();
});

// --- Simple health routes ---
app.get("/", (_req, res) => res.send("Tees From The Past Backend API"));
app.get("/health", (_req, res) => res.status(200).json({ status: "OK" }));

// --- API routes ---
app.use("/api/auth", authRoutes);
app.use("/api", generateImageRoutes);         // e.g., /api/generate
app.use("/api/checkout", checkoutRoutes);
app.use("/api/mydesigns", designRoutes);
app.use("/api/contest", contestRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/forms", formRoutes);

// ✅ Storefront routes (mounted once, correct base)
app.use("/api/storefront", storefrontProductRoutes);

// Admin
app.use("/api/admin/users", adminUserRoutes);
app.use("/api/admin/orders", adminOrderRoutes);
app.use("/api/admin/designs", adminDesignRoutes);
app.use("/api/admin", adminProductRoutes);

// Uploads & Printful helpers
app.use("/api", uploadRoutes);
app.use("/api/printful", printfulRoutes);

// --- Global error handler (last) ---
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
