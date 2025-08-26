// backend/utils/audit.js
import mongoose from "mongoose";
import { pushAuditLog } from "../config/dynamicConfig.js";

let AuditLog;
try {
  AuditLog = mongoose.model("AuditLog");
} catch {
  const AuditLogSchema = new mongoose.Schema(
    {
      action: { type: String, required: true, index: true },
      actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
      actorDisplay: { type: String, default: "" },
      targetType: { type: String, default: "", index: true },
      targetId: { type: String, default: "", index: true },
      ip: { type: String, default: "" },
      userAgent: { type: String, default: "" },
      meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
    { timestamps: true }
  );
  AuditLogSchema.index({ createdAt: -1, action: 1, targetType: 1 });
  AuditLog = mongoose.model("AuditLog", AuditLogSchema);
}

export async function logAudit(
  req,
  { action, targetType = "", targetId = "", meta = {}, actor = null }
) {
  try {
    const ip = (req.headers["x-forwarded-for"] || "").toString().split(",")[0].trim() || req.ip || "";
    const userAgent = req.headers["user-agent"] || "";
    const actorId = actor || req.user?._id || null;

    // Auto-capture current session id if present:
    const sid = req.headers["x-session-id"];
    const mergedMeta = { ...meta };
    if (sid && !mergedMeta.sessionId) mergedMeta.sessionId = String(sid);

    // Create database audit log
    await AuditLog.create({
      action,
      actor: actorId,
      targetType,
      targetId: String(targetId || ""),
      ip,
      userAgent,
      meta: mergedMeta,
    });

    // Also push to dynamic audit ring buffer
    try {
      pushAuditLog({
        timestamp: new Date().toISOString(),
        category: action,
        message: `${action} ${targetType ? `on ${targetType}` : ''}${targetId ? ` (${targetId})` : ''}`,
        meta: mergedMeta,
        actor: actorId ? String(actorId) : null,
        level: 'info'
      });
    } catch (ringBufferError) {
      console.warn('[audit] Failed to push to ring buffer:', ringBufferError.message);
    }
  } catch (err) {
    console.warn("[audit] failed:", err?.message);
  }
}

export async function logAdminAction(req, payload) {
  return logAudit(req, payload);
}
export async function logAuthLogin(req, user, meta = {}) {
  return logAudit(req, { action: "LOGIN", targetType: "Auth", targetId: user?._id, meta, actor: user?._id });
}
export async function logAuthLogout(req, user, meta = {}) {
  return logAudit(req, { action: "LOGOUT", targetType: "Auth", targetId: user?._id, meta, actor: user?._id });
}
