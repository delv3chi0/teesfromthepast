// backend/utils/audit.js
import AuditLog from "../models/AuditLog.js";

/**
 * Generic audit helper.
 * Stays compatible with prior `logAdminAction(req, {...})` usage.
 *
 * Example:
 *   await logAdminAction(req, {
 *     action: 'USER_UPDATE',
 *     targetType: 'User',
 *     targetId: user._id,
 *     meta: { before, after }
 *   });
 */
export async function logAdminAction(req, { action, targetType = null, targetId = null, meta = {} }) {
  try {
    await AuditLog.create({
      actor: req?.user?._id || null,
      action: String(action || "").toUpperCase(),
      targetType,
      targetId: targetId ? String(targetId) : null,
      meta: meta || {},
      ip: req?.ip || req?.headers?.["x-forwarded-for"] || null,
      userAgent: req?.headers?.["user-agent"] || null,
    });
  } catch (err) {
    console.error("[Audit] Failed to write audit log:", err?.message);
  }
}

/**
 * Convenience wrappers for auth-centric events.
 */
export async function logAuthLogin(req, user, meta = {}) {
  try {
    await AuditLog.create({
      actor: user?._id || null,
      action: "LOGIN",
      targetType: "User",
      targetId: user?._id ? String(user._id) : null,
      meta,
      ip: req?.ip || req?.headers?.["x-forwarded-for"] || null,
      userAgent: req?.headers?.["user-agent"] || null,
    });
  } catch (err) {
    console.error("[Audit] Failed to write LOGIN audit:", err?.message);
  }
}

export async function logAuthLogout(req, user, meta = {}) {
  try {
    await AuditLog.create({
      actor: user?._id || req?.user?._id || null,
      action: "LOGOUT",
      targetType: "User",
      targetId: (user?._id || req?.user?._id) ? String(user._id || req.user._id) : null,
      meta,
      ip: req?.ip || req?.headers?.["x-forwarded-for"] || null,
      userAgent: req?.headers?.["user-agent"] || null,
    });
  } catch (err) {
    console.error("[Audit] Failed to write LOGOUT audit:", err?.message);
  }
}
