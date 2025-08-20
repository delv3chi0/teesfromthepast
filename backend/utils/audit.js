// backend/utils/audit.js
import AuditLog from "../models/AuditLog.js";

/** Utility: get IP and UA safely */
function getClientNet(req) {
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.ip ||
    req.connection?.remoteAddress ||
    "";
  const userAgent = req.headers["user-agent"] || "";
  return { ip, userAgent };
}

/**
 * Generic audit logger for any action.
 * Use this when no special helper applies.
 */
export async function logAudit(req, { action, targetType = "", targetId = "", meta = {} }) {
  try {
    const { ip, userAgent } = getClientNet(req);
    const actor = req.user?._id || null;
    await AuditLog.create({
      actor,
      action,
      targetType,
      targetId: targetId?.toString?.() ?? String(targetId ?? ""),
      ip,
      userAgent,
      meta,
    });
  } catch (err) {
    console.warn("[audit] logAudit failed:", err?.message);
  }
}

/**
 * Admin-specific helper.
 */
export async function logAdminAction(req, { action, targetType = "", targetId = "", meta = {} }) {
  return logAudit(req, { action, targetType, targetId, meta });
}

/**
 * Auth helpers for consistent action names.
 */
export async function logAuthLogin(req, user, meta = {}) {
  return logAudit(req, {
    action: "LOGIN",
    targetType: "Auth",
    targetId: user?._id,
    meta: { email: user?.email, ...meta },
  });
}

export async function logAuthLogout(req, user, meta = {}) {
  return logAudit(req, {
    action: "LOGOUT",
    targetType: "Auth",
    targetId: user?._id,
    meta: { email: user?.email, ...meta },
  });
}
