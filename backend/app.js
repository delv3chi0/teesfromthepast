// backend/app.js
import express from "express";
import cors from "cors";

// Route modules (keep these imports even if they 404 now; they won't be used by health checks)
import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";

const app = express();

// Trust Render's proxy so req.ip is accurate
app.set("trust proxy", 1);

// Body parsers
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

/**
 * CORS — allow your deployed frontend + local dev.
 * Never throw inside origin() so preflights don't fail with a network error.
 */
const allowedOrigins = [
  process.env.FRONTEND_ORIGIN,                  // optional override
  "https://teesfromthepast.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
].filter(Boolean);

const corsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true);                 // health checks, curl, SSR
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(null, false);                              // disallowed origin: respond without CORS headers
  },
  credentials: true,
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  preflightContinue: false,
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // respond to all preflights

/**
 * Health + root — must be 200 for Render.
 * We also log these so you can confirm the probe is reaching the app.
 */
app.get("/", (req, res) => {
  console.log(`[Health] GET / from ${req.ip || "unknown"}`);
  res.status(200).send("OK");
});
app.head("/", (_req, res) => res.status(200).end());

app.get("/healthz", (req, res) => {
  console.log(`[Health] GET /healthz from ${req.ip || "unknown"}`);
  res.status(200).json({ ok: true, ts: new Date().toISOString() });
});

/**
 * API routes
 */
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);

/**
 * 404
 */
app.use((req, res) => {
  res.status(404).json({ message: "Not Found" });
});

/**
 * Error handler
 */
app.use((err, req, res, _next) => {
  const status = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  console.error("[Error]", err?.stack || err);
  res.status(status).json({ message: err?.message || "Server Error" });
});

export default app;
