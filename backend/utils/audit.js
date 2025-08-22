// backend/utils/audit.js
import mongoose from "mongoose";
import AuditLogModel from "../models/AuditLog.js";

const AuditLog = mongoose.models.AuditLog || AuditLogModel;

/**
 * Generic audit logger.
 * You may pass `actor` (ObjectId or string) to override req.user; otherwise falls back to req.user?._id.
 *
 * Example:
 *   await logAudit(req, { action: 'LOGIN', targetType: 'Auth', targetId: user._id, actor: user._id, meta: {...} })
 */
export async function logAudit(
  req,
  { action, targetType = "", targetId = "", meta = {}, actor = null }
) {
  try {
    const actorId = actor || req.user?._id || null;
    const ip =
      (req.headers["x-forwarded-for"] || "")
        .toString()
        .split(",")[0]
        .trim() ||
      req.ip ||
      "";
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
    // never throw from audit logging
    console.warn("[audit] failed:", err?.message);
  }
}

export async function logAdminAction(req, payload) {
  return logAudit(req, payload);
}
export async function logAuthLogin(req, user, meta = {}) {
  return logAudit(req, {
    action: "LOGIN",
    targetType: "Auth",
    targetId: user?._id,
    actor: user?._id,   // <- important so actor isn’t (unknown)
    meta,
  });
}
export async function logAuthLogout(req, user, meta = {}) {
  return logAudit(req, {
    action: "LOGOUT",
    targetType: "Auth",
    targetId: user?._id,
    actor: user?._id,   // <- important
    meta,
  });
}
