// backend/routes/adminAuditRoutes.js
import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { admin } from '../middleware/adminMiddleware.js';
import AuditLog from '../models/AuditLog.js';
import User from '../models/User.js';

const router = express.Router();

// GET /api/admin/audit?actor=...&action=...&targetType=...&targetId=...&page=&limit=
router.get('/', protect, admin, async (req, res) => {
  const { actor, action, targetType, targetId, page = 1, limit = 25 } = req.query;
  const q = {};
  if (actor) q.actor = actor;
  if (action) q.action = action;
  if (targetType) q.targetType = targetType;
  if (targetId) q.targetId = targetId;

  const skip = (Math.max(1, parseInt(page)) - 1) * Math.max(1, parseInt(limit));
  const items = await AuditLog.find(q)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Math.min(100, Math.max(1, parseInt(limit))))
    .lean();

  // attach actor basic info
  const actorIds = [...new Set(items.map(i => String(i.actor)).filter(Boolean))];
  const actors = await User.find({ _id: { $in: actorIds } }).select('_id email username').lean();
  const actorsById = Object.fromEntries(actors.map(u => [String(u._id), u]));

  res.json({
    items: items.map(i => ({
      _id: i._id,
      actor: actorsById[String(i.actor)] || null,
      action: i.action,
      targetType: i.targetType,
      targetId: i.targetId,
      ip: i.ip,
      userAgent: i.userAgent,
      meta: i.meta,
      createdAt: i.createdAt,
    })),
    page: Number(page),
    hasMore: items.length === Math.min(100, Math.max(1, parseInt(limit))),
  });
});

export default router;
