import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import connectDB from "./config/db.js";

// Routes
import authRoutes from "./routes/auth.js";
import designRoutes from "./routes/designs.js";
import uploadRoutes from "./routes/uploadRoutes.js";
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

dotenv.config();
connectDB();

const app = express();

// Security middleware
app.use(helmet());

// CORS allowlist
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
].filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// Raw body parser for Stripe webhook BEFORE express.json()
app.use("/api/stripe/webhook", express.raw({ type: "application/json" }));

// JSON body parser
app.use(express.json({ limit: "10mb" }));

// Rate limiter
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 200,
  })
);

// Health check
app.get("/health", (req, res) => res.json({ status: "ok" }));

// Mount routes
app.use("/api/auth", authRoutes);
app.use("/api/mydesigns", designRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/storefront/product", storefrontProductRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use("/api/stripe", stripeWebhookRoutes);
app.use("/api/printful", printfulRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/admin/users", adminUserRoutes);
app.use("/api/admin/orders", adminOrderRoutes);
app.use("/api/admin/designs", adminDesignRoutes);
app.use("/api/admin/products", adminProductRoutes);
app.use("/api/contest", contestRoutes);
app.use("/api/forms", formRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Server Error" });
});

export default app;
