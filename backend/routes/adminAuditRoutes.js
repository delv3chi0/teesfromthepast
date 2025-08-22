// backend/routes/adminAuditRoutes.js
import express from "express";
import mongoose from "mongoose";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

function requireAdmin(req, res, next) {
  if (req?.user?.isAdmin) return next();
  return res.status(403).json({ message: "Admin access required" });
}

let AuditLog;
try {
  AuditLog = mongoose.model("AuditLog");
} catch {
  const AuditLogSchema = new mongoose.Schema(
    {
      action: { type: String, required: true, index: true },
      actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
      targetType: { type: String, index: true, default: "" },
      targetId: { type: String, index: true, default: "" },
      ip: { type: String, default: "" },
      userAgent: { type: String, default: "" },
      meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
    { timestamps: true }
  );
  AuditLogSchema.index({ createdAt: -1, action: 1, targetType: 1 });
  mongoose.model("AuditLog", AuditLogSchema);
  AuditLog = mongoose.model("AuditLog");
}

/** LIST */
router.get("/", protect, requireAdmin, async (req, res) => {
  try {
    const { actor = "", action = "", targetType = "", targetId = "", page: pageRaw = "1", limit: limitRaw = "100" } = req.query;
    const page = Math.max(parseInt(pageRaw, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(limitRaw, 10) || 100, 1), 200);
    const skip = (page - 1) * limit;

    const q = {};
    if (actor) q.actor = actor;
    if (action) q.action = action;
    if (targetType) q.targetType = targetType;
    if (targetId) q.targetId = targetId;

    const [items, total] = await Promise.all([
      AuditLog.find(q)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: "actor", select: "username email" })
        .lean(),
      AuditLog.countDocuments(q),
    ]);

    const normalized = items.map((i) => ({
      ...i,
      actorDisplay: i.actor?.username || i.actor?.email || (typeof i.actor === "string" ? i.actor : "(unknown)"),
      actionLabel: i.action,
      meta: i.meta || {},
    }));

    res.json({ items: normalized, page, limit, total });
  } catch (err) {
    console.error("[admin/audit] list error:", err);
    res.status(500).json({ message: "Failed to fetch audit logs" });
  }
});

/** DETAILS (full meta) */
router.get("/:id", protect, requireAdmin, async (req, res) => {
  try {
    const item = await AuditLog.findById(req.params.id)
      .populate({ path: "actor", select: "username email firstName lastName" })
      .lean();
    if (!item) return res.status(404).json({ message: "Not found" });
    res.json(item);
  } catch (err) {
    console.error("[admin/audit] details error:", err);
    res.status(500).json({ message: "Failed to fetch audit item" });
  }
});

/** CLEAR (optionally filtered) */
router.delete("/", protect, requireAdmin, async (req, res) => {
  try {
    const { actor = "", action = "", targetType = "", targetId = "" } = req.query;
    const q = {};
    if (actor) q.actor = actor;
    if (action) q.action = action;
    if (targetType) q.targetType = targetType;
    if (targetId) q.targetId = targetId;

    await AuditLog.deleteMany(q).exec();
    res.status(204).end();
  } catch (err) {
    console.error("[admin/audit] delete error:", err);
    res.status(500).json({ message: "Failed to clear audit logs" });
  }
});

export default router;
