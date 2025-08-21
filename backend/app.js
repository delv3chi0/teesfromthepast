// backend/app.js
import express from "express";
import cors from "cors";

// Routes
import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";

const app = express();

// Trust proxy (needed on Render/behind proxies)
app.set("trust proxy", 1);

// Body parsers
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// --- CORS ---
const allowedOrigins = [
  process.env.FRONTEND_ORIGIN,
  "https://teesfromthepast.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
].filter(Boolean);

const corsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true);                 // SSR / same-origin / curl
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS: ${origin} not allowed`)); // will be turned into 403 below
  },
  credentials: true,
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// --- Health & root (so Render health check passes) ---
app.get("/", (_req, res) => res.status(200).send("OK"));
app.head("/", (_req, res) => res.status(200).end());
app.get("/healthz", (_req, res) => res.status(200).json({ ok: true }));

// --- API routes ---
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);

// --- 404 ---
app.use((req, res) => {
  res.status(404).json({ message: "Not Found" });
});

// --- Error handler ---
app.use((err, req, res, _next) => {
  const isCors = err?.message?.startsWith?.("CORS:");
  if (isCors) return res.status(403).json({ message: err.message });

  const status = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  console.error("[Error]", err?.stack || err);
  res.status(status).json({ message: err?.message || "Server Error" });
});

export default app;
