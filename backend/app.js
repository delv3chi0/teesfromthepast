// backend/app.js
import express from "express";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";

const app = express();

// ---- trust proxy so you get real client IPs behind Render's proxy
app.set("trust proxy", 1);

// ---- tiny request logger (replaces morgan)
app.use((req, _res, next) => {
  if (process.env.NODE_ENV !== "test") {
    console.log("[App]", req.method, req.originalUrl);
  }
  next();
});

// ---- parsers
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// ---- CORS (inline, no dependency)
// Configure allowed origins via env or sane defaults
const DEFAULT_ALLOWED = [
  "https://teesfromthepast.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
  "https://teesfromthepast.onrender.com",
];
const envAllowed = (process.env.CORS_ALLOWED_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const ALLOWED_ORIGINS = [...new Set([...DEFAULT_ALLOWED, ...envAllowed])];

function corsMiddleware(req, res, next) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin"); // ensure proper caching per origin
  }
  // If you need to allow all origins in a pinch, uncomment the next line
  // res.setHeader("Access-Control-Allow-Origin", "*");

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type, X-Requested-With, X-CSRF-Token"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS"
  );
  // Needed for cookies/bearer across origins (ok even if you don’t use cookies)
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    return res.status(204).end(); // quick preflight response
  }
  next();
}
app.use(corsMiddleware);

// ---- health
app.get("/health", (_req, res) => res.json({ ok: true }));

// ---- routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);

// ---- 404
app.use((req, res) => {
  res
    .status(404)
    .json({ message: `Not Found: ${req.method} ${req.originalUrl}` });
});

// ---- error handler
// keep this last
app.use((err, req, res, _next) => {
  const status =
    res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  console.error("[Error]", err?.message, err?.stack);
  res.status(status).json({
    message: err?.message || "Server error",
    stack: process.env.NODE_ENV === "production" ? undefined : err?.stack,
  });
});

export default app;
