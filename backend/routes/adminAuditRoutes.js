// backend/routes/adminAuditRoutes.js
import express from "express";
import mongoose from "mongoose";
import { protect } from "../middleware/authMiddleware.js";
import { admin } from "../middleware/adminMiddleware.js";
import AuditLog from "../models/AuditLog.js";

const router = express.Router();

/**
 * GET /api/admin/audit
 * Query params:
 *  - actor (UserId) optional
 *  - action (string, case-insensitive)
 *  - targetType (string)
 *  - targetId (string)
 *  - page (default 1), limit (default 25, max 100)
 */
router.get("/", protect, admin, async (req, res) => {
  const {
    actor,
    action,
    targetType,
    targetId,
    page = 1,
    limit = 25,
  } = req.query;

  const q = {};
  if (actor && mongoose.isValidObjectId(actor)) q.actor = actor;
  if (action) q.action = String(action).toUpperCase();
  if (targetType) q.targetType = targetType;
  if (targetId) q.targetId = targetId;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const lim = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
  const skip = (pageNum - 1) * lim;

  const [items, total] = await Promise.all([
    AuditLog.find(q)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(lim)
      .populate("actor", "_id email username")
      .lean(),
    AuditLog.countDocuments(q),
  ]);

  res.json({
    items: items.map((i) => ({
      _id: i._id,
      when: i.createdAt,
      // Friendly actor presentation
      actor: i.actor
        ? { id: i.actor._id, label: i.actor.username || i.actor.email || String(i.actor._id), email: i.actor.email || null, username: i.actor.username || null }
        : null,
      action: i.action,
      target: i.targetType || i.targetId ? { type: i.targetType, id: i.targetId } : null,
      ip: i.ip || null,
      userAgent: i.userAgent || null,
      meta: i.meta || {},
    })),
    page: pageNum,
    limit: lim,
    total,
    hasMore: skip + items.length < total,
  });
});

export default router;
