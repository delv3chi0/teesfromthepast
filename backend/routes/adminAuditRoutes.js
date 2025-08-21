// backend/routes/adminAuditRoutes.js
import express from "express";
import mongoose from "mongoose";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * Admin gate that relies ONLY on `protect` + `req.user.isAdmin`,
 * so we don’t depend on a specific middleware export name.
 */
function requireAdmin(req, res, next) {
  if (req?.user?.isAdmin) return next();
  return res.status(403).json({ message: "Admin access required" });
}

/**
 * Create or reuse a lightweight AuditLog model **inline** so we don’t require
 * any new files. If a model with the same name already exists (e.g. you have
 * a dedicated model file elsewhere), we reuse it and do NOT redefine it.
 */
let AuditLog;
try {
  AuditLog = mongoose.model("AuditLog");
} catch {
  const AuditLogSchema = new mongoose.Schema(
    {
      actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
      actorDisplay: { type: String, default: "" }, // fallback when actor doc isn’t populated
      action: { type: String, index: true, required: true }, // e.g. USER_DELETE, ORDER_UPDATE
      actionLabel: { type: String, default: "" },
      targetType: { type: String, index: true, default: "" }, // e.g. "User", "Order", "Design"
      targetId: { type: String, index: true, default: "" },   // string so we can store non-ObjectId ids too
      message: { type: String, default: "" },
      meta: { type: mongoose.Schema.Types.Mixed, default: {} },
      ip: { type: String, default: "" },
      userAgent: { type: String, default: "" },
    },
    { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
  );

  // Helpful compound index for common admin filters
  AuditLogSchema.index({ createdAt: -1, action: 1, targetType: 1 });

  AuditLog = mongoose.model("AuditLog", AuditLogSchema);
}

/**
 * GET /api/admin/audit
 * Query params:
 *  - actor: string (User _id)
 *  - action: string
 *  - targetType: string
 *  - targetId: string
 *  - page: number (default 1)
 *  - limit: number (default 100, max 200)
 *
 * Responds:
 *  { items: [], page, limit, total }
 */
router.get("/", protect, requireAdmin, async (req, res) => {
  try {
    const {
      actor = "",
      action = "",
      targetType = "",
      targetId = "",
      page: pageRaw = "1",
      limit: limitRaw = "100",
    } = req.query;

    const page = Math.max(parseInt(pageRaw, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(limitRaw, 10) || 100, 1), 200);
    const skip = (page - 1) * limit;

    const q = {};
    if (actor) q.actor = actor; // expecting a User _id string
    if (action) q.action = action;
    if (targetType) q.targetType = targetType;
    if (targetId) q.targetId = targetId;

    // Sort newest first; populate light actor info if present
    const [items, total] = await Promise.all([
      AuditLog.find(q)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: "actor", select: "username email" })
        .lean()
        .exec(),
      AuditLog.countDocuments(q),
    ]);

    // Normalize a couple of fields the UI expects (actor display fallback)
    const normalized = items.map((i) => ({
      ...i,
      actorDisplay:
        i.actorDisplay ||
        i.actor?.username ||
        i.actor?.email ||
        (typeof i.actor === "string" ? i.actor : "(unknown)"),
      actionLabel: i.actionLabel || i.action,
      meta: i.meta || {},
    }));

    return res.json({ items: normalized, page, limit, total });
  } catch (err) {
    // Return a safe, CORS-honoring error body (no opaque failures)
    console.error("[admin/audit] list error:", err);
    return res
      .status(500)
      .json({ message: "Failed to fetch audit logs", error: String(err?.message || err) });
  }
});

export default router;
