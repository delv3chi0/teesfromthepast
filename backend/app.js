// backend/app.js
import express from "express";
// import morgan from "morgan"; // removed to avoid dependency
import cookieParser from "cookie-parser";
import helmet from "helmet";
import compression from "compression";
import { buildCors } from "./utils/cors.js";
import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";

const app = express();

// Trust Render's proxy so IPs/user-agent are correct
app.set("trust proxy", 1);

// Security hardening
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

// Simple request log (tiny stand-in for morgan)
if (process.env.NODE_ENV !== "test") {
  app.use((req, _res, next) => {
    console.log("[App]", req.method, req.originalUrl);
    next();
  });
}

// Parsers
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// CORS (must be before routes) + preflight
const corsMiddleware = buildCors();
app.use(corsMiddleware);
app.options("*", corsMiddleware);

// Compression
app.use(compression());

// Health
app.get("/health", (_req, res) => res.json({ ok: true }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ message: `Not Found: ${req.method} ${req.originalUrl}` });
});

// Error handler
app.use((err, req, res, _next) => {
  const status = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  console.error("[Error]", err?.message, err?.stack);
  res.status(status).json({
    message: err?.message || "Server error",
    stack: process.env.NODE_ENV === "production" ? undefined : err?.stack,
  });
});

export default app;
