// backend/app.js (only showing the CORS block & admin fix from your earlier error)
import express from "express";
import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import hpp from "hpp";
import xss from "xss-clean";

// Route imports ...
import { protect } from "./middleware/authMiddleware.js"; // ⬅️ make sure this line exists
// (rest of your imports unchanged)

const app = express();
app.set("trust proxy", 1);
app.use(helmet());

// CORS
const allowedOrigins = [
  "https://teesfromthepast.vercel.app",
  "http://localhost:5173",
  // Add any preview URLs or custom domains here:
  // "https://your-custom-domain.com",
];
const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    console.warn(`[CORS] Blocked origin: ${origin}`);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
};
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(cookieParser());

// Stripe webhook first (raw body) ...
app.use("/api/stripe", stripeWebhookRoutes);

// Body parsers
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Hardening
app.use(mongoSanitize());
app.use(xss());
app.use(hpp());

// Rate limit on /api
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false });
app.use("/api", limiter);

// Debug log
app.use((req, _res, next) => { console.log(`[App] ${req.method} ${req.originalUrl}`); next(); });

// Health
app.get("/", (_req, res) => res.send("Tees From The Past Backend API"));
app.get("/health", (_req, res) => res.status(200).json({ status: "OK" }));

// Routers (unchanged) ...
// Admin (ensure protect import above exists)
app.use('/admin', protect, adminRouter);

// Global error handler (unchanged)
export default app;
