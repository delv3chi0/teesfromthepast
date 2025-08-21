// backend/app.js
import express from "express";
import cors from "cors";

// Route modules
import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";

const app = express();

// Trust Render proxy for correct IPs
app.set("trust proxy", 1);

// Body parsing
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

/**
 * CORS — permissive but scoped.
 * Never throw inside origin() — preflights must succeed or the browser will block.
 */
const allowedOrigins = [
  process.env.FRONTEND_ORIGIN,                  // optional env override
  "https://teesfromthepast.vercel.app",         // your deployed frontend
  "http://localhost:5173",                      // Vite dev
  "http://localhost:3000",                      // CRA/Next dev
].filter(Boolean);

const corsOptions = {
  origin(origin, cb) {
    // Allow same-origin, SSR, curl, health checks (no origin header)
    if (!origin) return cb(null, true);
    // Allow listed origins; deny others without throwing (so preflight gets a 200 and the browser decides)
    if (allowedOrigins.includes(origin)) return cb(null, true);
    // Not allowed: still callback with false (no CORS headers) instead of throwing an error
    return cb(null, false);
  },
  credentials: true,
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
// Make sure every path responds to OPTIONS for preflight
app.options("*", cors(corsOptions));

/**
 * Health & root — ensure Render sees HTTP 200 on "/" and "/healthz"
 */
app.get("/", (_req, res) => res.status(200).send("OK"));
app.head("/", (_req, res) => res.status(200).end());
app.get("/healthz", (_req, res) => res.status(200).json({ ok: true }));

/**
 * API routes
 */
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);

/**
 * 404 handler
 */
app.use((req, res) => {
  res.status(404).json({ message: "Not Found" });
});

/**
 * Error handler — log and send JSON
 */
app.use((err, req, res, _next) => {
  const status = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  console.error("[Error]", err?.stack || err);
  res.status(status).json({ message: err?.message || "Server Error" });
});

export default app;
