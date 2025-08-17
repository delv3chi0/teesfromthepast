// backend/utils/audit.js
import AuditLog from '../models/AuditLog.js';

export async function logAdminAction(req, { action, targetType, targetId, meta }) {
  try {
    await AuditLog.create({
      actor: req.user?._id,
      action,
      targetType,
      targetId: targetId?.toString?.() || String(targetId || ''),
      ip: req.ip,
      userAgent: (req.headers['user-agent'] || '').slice(0, 300),
      meta,
    });
  } catch (e) {
    // Don’t block the request if logging fails
    console.warn('[AuditLog] failed:', e?.message || e);
  }
}
