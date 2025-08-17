// backend/routes/adminSessionRoutes.js
import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { admin } from '../middleware/adminMiddleware.js';
import RefreshToken from '../models/RefreshToken.js';
import User from '../models/User.js';
import { logAdminAction } from '../utils/audit.js';

const router = express.Router();

// GET /api/admin/sessions?userId=...
router.get('/', protect, admin, async (req, res) => {
  const { userId, page = 1, limit = 25 } = req.query;
  const q = {};
  if (userId) q.user = userId;

  const skip = (Math.max(1, parseInt(page)) - 1) * Math.max(1, parseInt(limit));
  const items = await RefreshToken.find(q)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Math.min(100, Math.max(1, parseInt(limit))))
    .lean();

  // decorate with user basic info
  const userIds = [...new Set(items.map(i => String(i.user)))];
  const users = await User.find({ _id: { $in: userIds } }).select('_id email username').lean();
  const usersById = Object.fromEntries(users.map(u => [String(u._id), u]));

  res.json({
    items: items.map(i => ({
      jti: i.jti,
      user: usersById[String(i.user)] || { _id: i.user },
      ip: i.ip,
      userAgent: i.userAgent,
      createdAt: i.createdAt,
      updatedAt: i.updatedAt,
      expiresAt: i.expiresAt,
      revokedAt: i.revokedAt || null,
      replaceOf: i.replaceOf || null,
    })),
    page: Number(page),
    hasMore: items.length === Math.min(100, Math.max(1, parseInt(limit))),
  });
});

// DELETE /api/admin/sessions/:jti  (revoke one device)
router.delete('/:jti', protect, admin, async (req, res) => {
  const { jti } = req.params;
  const rt = await RefreshToken.findOne({ jti });
  if (!rt) return res.status(404).json({ message: 'Session not found' });

  rt.revokedAt = new Date();
  await rt.save();

  await logAdminAction(req, {
    action: 'SESSION_REVOKE',
    targetType: 'RefreshToken',
    targetId: jti,
    meta: { user: String(rt.user) },
  });

  res.json({ message: 'Session revoked' });
});

// DELETE /api/admin/sessions/user/:userId (revoke all devices for a user)
router.delete('/user/:userId', protect, admin, async (req, res) => {
  const { userId } = req.params;
  await RefreshToken.updateMany(
    { user: userId, revokedAt: { $exists: false } },
    { $set: { revokedAt: new Date() } }
  );

  await logAdminAction(req, {
    action: 'SESSION_REVOKE_ALL',
    targetType: 'User',
    targetId: userId,
    meta: {},
  });

  res.json({ message: 'All sessions revoked for user' });
});

export default router;
