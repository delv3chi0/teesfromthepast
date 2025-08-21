// backend/app.js
import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";

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

dotenv.config();
connectDB();

const app = express();

// Health check for Render
app.get("/health", (req, res) => res.send("OK"));

app.use(express.json({ limit: "10mb" }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/mydesigns", designsRoutes);
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

export default app;
