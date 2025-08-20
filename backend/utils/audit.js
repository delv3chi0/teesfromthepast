// backend/utils/audit.js
import AuditLog from '../models/AuditLog.js';

/**
 * Writes an admin audit log entry.
 * Usage:
 *   await logAdminAction(req, { action: 'ORDER_DELETE', targetType: 'Order', targetId: orderId, meta: {...} })
 */
export async function logAdminAction(req, { action, targetType, targetId, meta = {} }) {
  try {
    const actorId = req.user?._id || null;
    const ip = (req.headers['x-forwarded-for'] || req.ip || '').toString().split(',')[0].trim();
    const userAgent = req.headers['user-agent'] || '';

    await AuditLog.create({
      actor: actorId,
      action,
      targetType,
      targetId: targetId?.toString?.() || String(targetId || ''),
      ip,
      userAgent,
      meta,
    });
  } catch (e) {
    // Never throw from audit — keep business flow healthy
    console.error('[audit] failed to write log:', e.message);
  }
}
