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
      actorDisplay: { type: String, default: "" },
      targetType: { type: String, default: "", index: true },
      targetId: { type: String, default: "", index: true },
      ip: { type: String, default: "" },
      userAgent: { type: String, default: "" },
      message: { type: String, default: "" },
      meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
    { timestamps: true }
  );
  AuditLogSchema.index({ createdAt: -1, action: 1, targetType: 1 });
  AuditLog = mongoose.model("AuditLog", AuditLogSchema);
}

/**
 * GET /api/admin/audit
 * Query: actor, action, targetType, targetId, page=1, limit<=200
 * Resp: { items, page, limit, total }
 */
router.get("/", protect, requireAdmin, async (req, res) => {
  try {
    const {
      actor = "",
      action = "",
      targetType = "",
      targetId = "",
      page: pageRaw = "1",
      limit: limitRaw = "50",
    } = req.query;

    const page = Math.max(parseInt(pageRaw, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(limitRaw, 10) || 50, 1), 200);
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
        .lean()
        .exec(),
      AuditLog.countDocuments(q),
    ]);

    const normalized = items.map((i) => ({
      ...i,
      actorDisplay:
        i.actorDisplay ||
        i.actor?.username ||
        i.actor?.email ||
        (typeof i.actor === "string" ? i.actor : "(unknown)"),
      meta: i.meta || {},
    }));

    return res.json({ items: normalized, page, limit, total });
  } catch (err) {
    console.error("[admin/audit] list error:", err);
    return res.status(500).json({ message: "Failed to fetch audit logs" });
  }
});

/** GET /api/admin/audit/:id  — full details for modal */
router.get("/:id", protect, requireAdmin, async (req, res) => {
  try {
    const doc = await AuditLog.findById(req.params.id)
      .populate({ path: "actor", select: "username email" })
      .lean()
      .exec();
    if (!doc) return res.status(404).json({ message: "Not found" });
    doc.actorDisplay =
      doc.actorDisplay ||
      doc.actor?.username ||
      doc.actor?.email ||
      (typeof doc.actor === "string" ? doc.actor : "(unknown)");
    res.json(doc);
  } catch (e) {
    res.status(500).json({ message: "Failed to load details" });
  }
});

/**
 * DELETE /api/admin/audit
 * Body/Query: same filters as GET. Deletes matching logs.
 * Used by “Clear logs” with current filters.
 */
router.delete("/", protect, requireAdmin, async (req, res) => {
  try {
    const { actor = "", action = "", targetType = "", targetId = "" } = req.query;
    const q = {};
    if (actor) q.actor = actor;
    if (action) q.action = action;
    if (targetType) q.targetType = targetType;
    if (targetId) q.targetId = targetId;

    const result = await AuditLog.deleteMany(q);
    res.json({ deleted: result.deletedCount || 0 });
  } catch (e) {
    res.status(500).json({ message: "Failed to clear logs" });
  }
});

export default router;
