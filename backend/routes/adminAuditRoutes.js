// backend/routes/adminAuditRoutes.js
import express from "express";
import mongoose from "mongoose";
import { protect } from "../middleware/authMiddleware.js";
import AuditLogModel from "../models/AuditLog.js";

const router = express.Router();
const AuditLog = mongoose.models.AuditLog || AuditLogModel;

function requireAdmin(req, res, next) {
  if (req?.user?.isAdmin) return next();
  return res.status(403).json({ message: "Admin access required" });
}

/**
 * GET /api/admin/audit
 * Query:
 *  - actor, action, targetType, targetId
 *  - page (default 1), limit (default 50, max 200)
 * Returns: { items, page, limit, total, hasMore }
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
        .populate({ path: "actor", select: "username email firstName lastName" })
        .lean()
        .exec(),
      AuditLog.countDocuments(q),
    ]);

    const normalized = items.map((i) => {
      const actorDisplay =
        i.actor?.username ||
        i.actor?.email ||
        i.actorDisplay ||
        "(unknown)";

      return {
        ...i,
        actorDisplay,
        actionLabel: i.action || "",
        meta: i.meta || {},
      };
    });

    const hasMore = page * limit < total;
    return res.json({ items: normalized, page, limit, total, hasMore });
  } catch (err) {
    console.error("[admin/audit] list error:", err);
    return res
      .status(500)
      .json({ message: "Failed to fetch audit logs", error: String(err?.message || err) });
  }
});

/**
 * GET /api/admin/audit/:id
 * Returns a single log with a friendlier payload for your “Details” modal.
 */
router.get("/:id", protect, requireAdmin, async (req, res) => {
  try {
    const log = await AuditLog.findById(req.params.id)
      .populate({ path: "actor", select: "username email firstName lastName" })
      .lean()
      .exec();

    if (!log) return res.status(404).json({ message: "Audit log not found" });

    const actor = log.actor || {};
    const payload = {
      id: log._id,
      when: log.createdAt,
      action: log.action,
      actor: {
        id: actor._id || null,
        username: actor.username || "(unknown)",
        email: actor.email || null,
        name:
          [actor.firstName, actor.lastName].filter(Boolean).join(" ") || null,
      },
      target: {
        type: log.targetType || "",
        id: log.targetId || "",
      },
      network: {
        ip: log.ip || "",
        userAgent: log.userAgent || "",
      },
      meta: log.meta || {},
    };

    return res.json(payload);
  } catch (err) {
    console.error("[admin/audit] get error:", err);
    return res
      .status(500)
      .json({ message: "Failed to fetch audit entry", error: String(err?.message || err) });
  }
});

/**
 * DELETE /api/admin/audit
 * Clears ALL audit logs.
 */
router.delete("/", protect, requireAdmin, async (_req, res) => {
  try {
    await AuditLog.deleteMany({});
    return res.status(204).end();
  } catch (err) {
    console.error("[admin/audit] clear error:", err);
    return res
      .status(500)
      .json({ message: "Failed to clear audit logs", error: String(err?.message || err) });
  }
});

export default router;
