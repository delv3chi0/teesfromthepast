/* 
  ONLY replace if you can safely merge; otherwise, manually add the marked additions:
  1) import cloudinaryDirectUploadRoutes
  2) app.use("/api/cloudinary", cloudinaryDirectUploadRoutes);
*/
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import { JSON_BODY_LIMIT_MB } from "./config/constants.js";
import { requestId } from "./middleware/requestId.js";
import { requestLogger } from "./middleware/requestLogger.js";
import rateLimitLogin from "./middleware/rateLimitLogin.js";

// Ensure Cloudinary config loads early (side effects)
import "./config/cloudinary.js";

/* Existing route imports (SHORTENED for brevity - keep yours intact) */
import authRoutes from "./routes/auth.js";
import emailVerificationRoutes from "./routes/emailVerificationRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import designsRoutes from "./routes/designs.js";
import storefrontRoutes from "./routes/storefrontProductRoutes.js";
import checkoutRoutes from "./routes/checkout.js";
import stripeWebhookRoutes from "./routes/stripeWebhook.js";
import printfulRoutes from "./routes/printful.js";
import ordersRoutes from "./routes/orders.js";
import adminUserRoutes from "./routes/adminUserRoutes.js";
import adminOrderRoutes from "./routes/adminOrderRoutes.js";
import adminDesignRoutes from "./routes/adminDesignRoutes.js";
import adminProductRoutes from "./routes/adminProductRoutes.js";
import adminSessionRoutes from "./routes/adminSessionRoutes.js";
import adminAuditRoutes from "./routes/adminAuditRoutes.js";
import contestRoutes from "./routes/contest.js";
import formRoutes from "./routes/formRoutes.js";
import configRoutes from "./routes/configRoutes.js";
import cloudinaryDirectUploadRoutes from "./routes/cloudinaryDirectUploadRoutes.js"; // <-- NEW

const app = express();
app.set("trust proxy", 1);

app.get("/health", (_req, res) => res.status(200).send("OK"));

/* CORS + other middleware (keep your existing implementation) */

app.use("/api/stripe", stripeWebhookRoutes);
app.use(express.json({ limit: `${JSON_BODY_LIMIT_MB}mb` }));

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);

/* Rate limits */
const contactLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false
});
app.use("/api/forms/contact", contactLimiter);
app.use("/api/auth/login", rateLimitLogin);

app.use(requestId);
app.use(requestLogger);

/* New route for signed direct upload */
app.use("/api/cloudinary", cloudinaryDirectUploadRoutes);

/* Config limits route */
app.use("/api/config", configRoutes);

/* Your existing routes */
app.use("/api/auth", authRoutes);
app.use("/api/auth", emailVerificationRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/mydesigns", designsRoutes);
app.use("/api/storefront", storefrontRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use("/api/printful", printfulRoutes);
app.use("/api/orders", ordersRoutes);

/* Admin */
app.use("/api/admin/users", adminUserRoutes);
app.use("/api/admin/orders", adminOrderRoutes);
app.use("/api/admin/designs", adminDesignRoutes);
app.use("/api/admin/products", adminProductRoutes);
app.use("/api/admin/sessions", adminSessionRoutes);
app.use("/api/admin/audit", adminAuditRoutes);

/* Public extras */
app.use("/api/contest", contestRoutes);
app.use("/api/forms", formRoutes);

/* 404 & error handlers (keep your existing) */
app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: { code: "NOT_FOUND", message: "Resource not found." },
    requestId: req.id
  });
});
app.use((err, req, res, next) => {
  console.error("[Unhandled Error]", err);
  if (res.headersSent) return next(err);
  res.status(500).json({
    ok: false,
    error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred." },
    requestId: req.id
  });
});

export default app;
