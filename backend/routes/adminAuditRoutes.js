// backend/routes/adminAuditRoutes.js
import express from 'express';
import mongoose from 'mongoose';
import { protect } from '../middleware/authMiddleware.js';
import { admin } from '../middleware/adminMiddleware.js';
import AuditLog from '../models/AuditLog.js';
import User from '../models/User.js';

const router = express.Router();
const { isValidObjectId } = mongoose;

// GET /api/admin/audit?actor=&action=&targetType=&targetId=&page=&limit=
router.get('/', protect, admin, async (req, res) => {
  try {
    // ---- sanitize/validate query ----
    const page = Math.max(1, parseInt(req.query.page ?? '1', 10) || 1);
    const limitRaw = Math.max(1, parseInt(req.query.limit ?? '25', 10) || 25);
    const limit = Math.min(100, limitRaw);

    const q = {};
    const { actor, action, targetType, targetId } = req.query;

    if (actor && typeof actor === 'string' && isValidObjectId(actor)) {
      q.actor = actor;
    }
    if (action && typeof action === 'string' && action.trim()) {
      q.action = action.trim();
    }
    if (targetType && typeof targetType === 'string' && targetType.trim()) {
      q.targetType = targetType.trim();
    }
    if (targetId && typeof targetId === 'string' && targetId.trim()) {
      q.targetId = targetId.trim();
    }

    const skip = (page - 1) * limit;

    const items = await AuditLog.find(q)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // attach actor basic info — make sure we DON'T turn null into "null"
    const actorIds = [
      ...new Set(
        items
          .map((i) => i.actor)        // keep as ObjectId or null
          .filter(Boolean)            // drop null/undefined
          .map((id) => String(id))    // stringify AFTER filtering
          .filter((id) => isValidObjectId(id))
      ),
    ];

    let actorsById = {};
    if (actorIds.length) {
      const actors = await User.find({ _id: { $in: actorIds } })
        .select('_id email username')
        .lean();
      actorsById = Object.fromEntries(actors.map((u) => [String(u._id), u]));
    }

    return res.json({
      items: items.map((i) => ({
        _id: i._id,
        actor: i.actor && actorsById[String(i.actor)] ? actorsById[String(i.actor)] : null,
        action: i.action,
        targetType: i.targetType,
        targetId: i.targetId,
        ip: i.ip,
        userAgent: i.userAgent,
        meta: i.meta,
        createdAt: i.createdAt,
      })),
      page,
      hasMore: items.length === limit,
    });
  } catch (err) {
    console.error('[adminAuditRoutes] list failed:', err?.message);
    // Normalize all casting/validation issues to a 400 for the UI
    return res.status(400).json({ message: 'Could not load audit logs' });
  }
});

export default router;
