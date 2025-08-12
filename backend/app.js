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
app.set("trust proxy", 1);
app.use(helmet());

// CORS
const allowedOrigins = [
  "https://teesfromthepast.vercel.app",
  "http://localhost:5173",
];
const corsOptions = {
  origin(origin, callback) {
    if (
      !origin ||
      allowedOrigins.includes(origin) ||
      // Allow Vercel preview deployments like https://<hash>-delv3chios-projects.vercel.app
      /-delv3chios-projects\.vercel\.app$/.test(origin)
    ) {
      return callback(null, true);
    }
    console.warn(`[CORS] Blocked origin: ${origin}`);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  // IMPORTANT: Let cors reflect whatever headers the browser asks for.
  // By *omitting* allowedHeaders, the 'cors' package will echo
  // Access-Control-Request-Headers from the preflight automatically.
  // (This avoids breaking when new headers like "token" or "cache-control" appear.)
  // allowedHeaders: undefined
};

// Handle CORS + preflight early
app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // respond to preflight with the same options

// Stripe webhook (raw body) — must be BEFORE express.json()
app.use("/api/stripe", stripeWebhookRoutes);

// Body parsers
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
