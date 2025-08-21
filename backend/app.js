// backend/app.js
import express from "express";
import cors from "cors";

// Routes
import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";
// If you have other route modules, import & mount them here too

const app = express();

// --- Trust proxy (so req.ip works on Render/behind proxies) ---
app.set("trust proxy", 1);

// --- Body parsers ---
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// --- CORS (fixes your Vercel → Render requests & preflights) ---
const allowedOrigins = [
  process.env.FRONTEND_ORIGIN,                 // optional override via env
  "https://teesfromthepast.vercel.app",        // your deployed frontend
  "http://localhost:5173",                     // local dev (vite)
  "http://localhost:3000",                     // alt local dev
].filter(Boolean);

const corsOptions = {
  origin(origin, cb) {
    // Allow non-browser/SSR or same-origin requests with no Origin header
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS: ${origin} not allowed`));
  },
  credentials: true,
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};

// Apply CORS & handle preflights early
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// --- Health check (nice for Render) ---
app.get("/healthz", (_req, res) => res.status(200).json({ ok: true }));

// --- API routes ---
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
// Mount other routes here, e.g.:
// app.use("/api/orders", ordersRoutes);
// app.use("/api/products", productRoutes);

// --- 404 ---
app.use((req, res) => {
  return res.status(404).json({ message: "Not Found" });
});

// --- Error handler ---
app.use((err, req, res, _next) => {
  const status = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  // If CORS blocked, force 403 so client UX is clearer than a network error
  if (err?.message?.startsWith("CORS:")) {
    return res.status(403).json({ message: err.message });
  }
  console.error("[Error]", err?.stack || err);
  res.status(status).json({
    message: err?.message || "Server Error",
  });
});

export default app;
