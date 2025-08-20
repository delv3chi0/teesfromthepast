// backend/utils/audit.js
import AuditLog from "../models/AuditLog.js";

/**
 * Generic audit logger. Safe to call "fire-and-forget"; do not await if you don't want to block.
 * Usage:
 *   await logAudit(req, { action: 'LOGIN', targetType: 'Auth', targetId: user._id, meta: {...} })
 */
export async function logAudit(req, { action, targetType = "", targetId = "", meta = {} }) {
  try {
    const actorId = req.user?._id || null;
    const ip = (req.headers["x-forwarded-for"] || "").toString().split(",")[0].trim() || req.ip || "";
    const userAgent = req.headers["user-agent"] || "";

    await AuditLog.create({
      action,
      actor: actorId,
      targetType,
      targetId: String(targetId || ""),
      ip,
      userAgent,
      meta,
    });
  } catch (err) {
    // Never throw from audit logging — keep it non-blocking for the app.
    console.warn("[audit] failed:", err?.message);
  }
}

// Convenience helpers (optional)
export async function logAdminAction(req, payload) {
  return logAudit(req, payload);
}
export async function logAuthLogin(req, user, meta = {}) {
  return logAudit(req, { action: "LOGIN", targetType: "Auth", targetId: user?._id, meta });
}
export async function logAuthLogout(req, user, meta = {}) {
  return logAudit(req, { action: "LOGOUT", targetType: "Auth", targetId: user?._id, meta });
}
