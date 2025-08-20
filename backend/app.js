// backend/app.js
import express from "express";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import compression from "compression";
import { buildCors } from "./utils/cors.js";
import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";
// import other existing routers here as you already had them:
// import designRoutes from "./routes/designs.js"; etc.

const app = express();

// Trust Render's proxy so IPs/user-agent are correct
app.set("trust proxy", 1);

// Base security hardening
app.use(helmet({
  crossOriginResourcePolicy: false, // allow images/fonts to load cross-origin
}));

// Logging
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// Body parsers
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// CORS (must be BEFORE routes)
const corsMiddleware = buildCors();
app.use(corsMiddleware);

// Explicit preflight for all routes
app.options("*", corsMiddleware);

// Compression
app.use(compression());

// Health
app.get("/health", (_req, res) => res.json({ ok: true }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);

// TODO: mount the rest of your existing routes just like before, e.g.
// app.use("/api/mydesigns", designRoutes);
// app.use("/api/orders", orderRoutes);
// app.use("/api/upload", uploadRoutes);
// app.use("/api/contest", contestRoutes);
// app.use("/api/printful", printfulRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ message: `Not Found: ${req.method} ${req.originalUrl}` });
});

// Error handler (keeps JSON shape)
app.use((err, req, res, _next) => {
  const status = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  console.error("[Error]", err?.message, err?.stack);
  res.status(status).json({
    message: err?.message || "Server error",
    stack: process.env.NODE_ENV === "production" ? undefined : err?.stack,
  });
});

export default app;
