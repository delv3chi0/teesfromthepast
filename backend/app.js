// backend/app.js
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import compression from "compression";

import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";
import productRoutes from "./routes/products.js";
import orderRoutes from "./routes/orders.js";
import designsRoutes from "./routes/designs.js";
import { getFrontendUrl } from "./config/env.js";

const app = express();

// Core middleware
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(compression());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

if (process.env.NODE_ENV !== "test") {
  app.use(morgan("tiny"));
}

// CORS allowlist
const allowlist = new Set(
  [
    getFrontendUrl(),
    "https://teesfromthepast.vercel.app",
    "https://teesfromthepast.onrender.com",
    "http://localhost:5173",
    "http://localhost:3000",
  ].filter(Boolean)
);

app.use(
  cors({
    origin(origin, cb) {
      if (!origin || allowlist.has(origin)) return cb(null, true);
      return cb(new Error(`CORS: Origin not allowed: ${origin}`));
    },
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    maxAge: 86400,
  })
);

// Healthcheck
app.get("/health", (req, res) => res.json({ ok: true }));

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/designs", designsRoutes);

// 404 fallback
app.use((req, res) => res.status(404).json({ message: "Not Found" }));

// Error handler
app.use((err, req, res, _next) => {
  const status = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  res.status(status).json({ message: err.message || "Server Error" });
});

export default app;
