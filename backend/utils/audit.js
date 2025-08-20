// backend/utils/audit.js
import AuditLog from '../models/AuditLog.js';

function getIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.ip ||
    req.connection?.remoteAddress ||
    undefined
  );
}

export async function logAdminAction(req, { action, targetType, targetId, meta }) {
  try {
    await AuditLog.create({
      actor: req.user?._id || null,
      action,
      targetType,
      targetId: targetId != null ? String(targetId) : undefined,
      ip: getIp(req),
      userAgent: req.headers['user-agent'],
      meta: meta || {},
    });
  } catch (e) {
    // Never block the main flow on audit failures
    console.error('[audit] failed to write log', e?.message);
  }
}
