import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import AuditLog from "../models/AuditLog.js";

const router = express.Router();

function requireAdmin(req, res, next) {
  if (req?.user?.isAdmin) return next();
  return res.status(403).json({ message: "Admin access required" });
}

/**
 * GET /api/admin/audit
 * Query: actor, action, targetType, targetId, page, limit
 * Responds: { items, page, limit, total, hasMore }
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
        "(unknown)",
      actionLabel: i.action, // reserved for future pretty labels
      meta: i.meta || {},
      client: i.client || {},
    }));

    const hasMore = skip + items.length < total;
    return res.json({ items: normalized, page, limit, total, hasMore });
  } catch (err) {
    console.error("[admin/audit] list error:", err);
    return res
      .status(500)
      .json({ message: "Failed to fetch audit logs", error: String(err?.message || err) });
  }
});

/**
 * GET /api/admin/audit/:id  - “Session Details”/full log detail view
 */
router.get("/:id", protect, requireAdmin, async (req, res) => {
  try {
    const doc = await AuditLog.findById(req.params.id)
      .populate({ path: "actor", select: "username email firstName lastName" })
      .lean()
      .exec();
    if (!doc) return res.status(404).json({ message: "Not found" });
    doc.actorDisplay =
      doc.actorDisplay ||
      doc.actor?.username ||
      doc.actor?.email ||
      "(unknown)";
    res.json(doc);
  } catch (err) {
    console.error("[admin/audit] detail error:", err);
    res.status(500).json({ message: "Failed to fetch log", error: String(err?.message || err) });
  }
});

/**
 * DELETE /api/admin/audit  - bulk clear (optional)
 * Body: { before?: ISOString, everything?: boolean }
 */
router.delete("/", protect, requireAdmin, async (req, res) => {
  try {
    const { before = "", everything = false } = req.body || {};
    if (!everything && !before) {
      return res.status(400).json({ message: "Provide {everything:true} or a {before} timestamp." });
    }
    const q = everything ? {} : { createdAt: { $lt: new Date(before) } };
    const r = await AuditLog.deleteMany(q);
    res.json({ deleted: r.deletedCount || 0 });
  } catch (err) {
    res.status(500).json({ message: "Failed to clear logs", error: String(err?.message || err) });
  }
});

export default router;
