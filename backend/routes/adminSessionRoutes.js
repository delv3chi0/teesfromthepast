// backend/routes/adminSessionRoutes.js
import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { admin } from '../middleware/adminMiddleware.js';
import RefreshToken from '../models/RefreshToken.js';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';

const router = express.Router();

// GET /api/admin/sessions?userId=&page=&limit=
router.get('/', protect, admin, async (req, res) => {
  const { userId, page = 1, limit = 25 } = req.query;
  const q = {};
  if (userId) q.user = userId;

  const pg = Math.max(1, parseInt(page, 10) || 1);
  const lim = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
  const skip = (pg - 1) * lim;

  // Primary source: RefreshToken documents (if you issue them)
  const items = await RefreshToken.find(q).sort({ createdAt: -1 }).skip(skip).limit(lim).lean();

  if (items.length) {
    const userIds = [...new Set(items.map(i => String(i.user)))];
    const users = await User.find({ _id: { $in: userIds } }).select('_id email username').lean();
    const usersById = Object.fromEntries(users.map(u => [String(u._id), u]));
    return res.json({
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
      page: pg,
      hasMore: items.length === lim,
    });
  }

  // Fallback: synthesize sessions from LOGIN audit events
  const auditQ = { action: 'LOGIN' };
  if (userId) auditQ.actor = userId;

  const logins = await AuditLog.find(auditQ)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(lim)
    .lean();

  const actorIds = [...new Set(logins.map(l => String(l.actor)).filter(Boolean))];
  const actors = actorIds.length ? await User.find({ _id: { $in: actorIds } }).select('_id email username').lean() : [];
  const usersById = Object.fromEntries(actors.map(u => [String(u._id), u]));

  const synthesized = logins.map(l => ({
    jti: `audit:${l._id}`,           // synthetic id
    user: usersById[String(l.actor)] || { _id: l.actor },
    ip: l.ip,
    userAgent: l.userAgent,
    createdAt: l.createdAt,
    updatedAt: l.createdAt,
    // Show a 30-day notional expiry for display purposes
    expiresAt: new Date(new Date(l.createdAt).getTime() + 30 * 86400000),
    revokedAt: null,
    replaceOf: null,
  }));

  return res.json({
    items: synthesized,
    page: pg,
    hasMore: synthesized.length === lim,
  });
});

// DELETE /api/admin/sessions/:jti  (revoke one device) — only works for real RefreshToken rows
router.delete('/:jti', protect, admin, async (req, res) => {
  const { jti } = req.params;
  const rt = await RefreshToken.findOne({ jti });
  if (!rt) return res.status(404).json({ message: 'Session not found' });
  rt.revokedAt = new Date();
  await rt.save();
  return res.json({ message: 'Session revoked' });
});

// DELETE /api/admin/sessions/user/:userId (revoke all devices for a user)
router.delete('/user/:userId', protect, admin, async (req, res) => {
  const { userId } = req.params;
  await RefreshToken.updateMany(
    { user: userId, revokedAt: { $exists: false } },
    { $set: { revokedAt: new Date() } }
  );
  return res.json({ message: 'All sessions revoked for user' });
});

export default router;
