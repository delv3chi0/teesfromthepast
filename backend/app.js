// backend/app.js
import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";

// Core app routes
import authRoutes from "./routes/auth.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import designsRoutes from "./routes/designs.js";
import storefrontProductRoutes from "./routes/storefrontProductRoutes.js";
import checkoutRoutes from "./routes/checkout.js";
import stripeWebhookRoutes from "./routes/stripeWebhook.js";
import printfulRoutes from "./routes/printful.js";
import ordersRoutes from "./routes/orders.js";
import adminUserRoutes from "./routes/adminUserRoutes.js";
import adminOrderRoutes from "./routes/adminOrderRoutes.js";
import adminDesignRoutes from "./routes/adminDesignRoutes.js";
import adminProductRoutes from "./routes/adminProductRoutes.js";
import contestRoutes from "./routes/contest.js";
import formRoutes from "./routes/formRoutes.js";

// NEW admin utilities
import adminSessionRoutes from "./routes/adminSessionRoutes.js";
import adminAuditRoutes from "./routes/adminAuditRoutes.js";

dotenv.config();
connectDB();

const app = express();

// --- Health check for Render ---
app.get("/health", (req, res) => res.send("OK"));

// --- Tiny dependency-free CORS ---
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS ||
  "https://teesfromthepast.vercel.app,http://localhost:5173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With"
  );
  if (req.method === "OPTIONS") return res.status(204).end();
  next();
});

// JSON body parsing (keep Stripe webhook raw inside its router)
app.use(express.json({ limit: "10mb" }));

// --- Routes ---
app.use("/api/auth", authRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/mydesigns", designsRoutes);
app.use("/api/storefront/product", storefrontProductRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use("/api/stripe", stripeWebhookRoutes);
app.use("/api/printful", printfulRoutes);
app.use("/api/orders", ordersRoutes);

// Admin feature routes
app.use("/api/admin/users", adminUserRoutes);
app.use("/api/admin/orders", adminOrderRoutes);
app.use("/api/admin/designs", adminDesignRoutes);
app.use("/api/admin/products", adminProductRoutes);

// NEW: Admin utilities now mounted
app.use("/api/admin/sessions", adminSessionRoutes);
app.use("/api/admin/audit", adminAuditRoutes);

// Public extras
app.use("/api/contest", contestRoutes);
app.use("/api/forms", formRoutes);

export default app;
