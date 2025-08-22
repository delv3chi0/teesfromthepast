// backend/utils/audit.js
import mongoose from "mongoose";

let AuditLog;
try {
  AuditLog = mongoose.model("AuditLog");
} catch {
  // fall back to your existing model file if present
  const mod = await import("../models/AuditLog.js");
  AuditLog = mod.default || mod;
}

/**
 * Generic audit logger that captures server + client hints.
 * Supply { action, targetType, targetId, meta }.
 */
export async function logAudit(req, { action, targetType = "", targetId = "", meta = {} }) {
  try {
    const actorId = req.user?._id || null;

    // Merge client hints into meta; also compute actorDisplay
    const h = (req && req.clientInfo) ? req.clientInfo : {};
    const ip = h.ip || (req.headers?.["x-forwarded-for"] || "").toString().split(",")[0]?.trim() || req.ip || "";
    const userAgent = h.ua || req.headers?.["user-agent"] || "";

    const actorDisplay =
      req.user?.username ||
      req.user?.email ||
      meta.actorDisplay ||
      "";

    const mergedMeta = {
      ...meta,
      actorDisplay,
      client: {
        tz: h.tz || req.headers?.["x-client-timezone"] || "",
        lang: h.lang || req.headers?.["x-client-lang"] || "",
        viewport: h.viewport || req.headers?.["x-client-viewport"] || "",
        platform: h.platform || req.headers?.["x-client-platform"] || "",
        ua: userAgent,
        localTime: h.localTime || req.headers?.["x-client-localtime"] || "",
        deviceMemory: h.deviceMemory || req.headers?.["x-client-devicememory"] || "",
        cpuCores: h.cpuCores || req.headers?.["x-client-cpucores"] || "",
      },
    };

    await AuditLog.create({
      action,
      actor: actorId,
      targetType,
      targetId: String(targetId || ""),
      ip,
      userAgent,
      meta: mergedMeta,
    });
  } catch (err) {
    console.warn("[audit] failed:", err?.message);
  }
}

// convenience wrappers
export async function logAdminAction(req, payload) { return logAudit(req, payload); }
export async function logAuthLogin(req, user, meta = {}) {
  return logAudit(req, { action: "LOGIN", targetType: "Auth", targetId: user?._id, meta });
}
export async function logAuthLogout(req, user, meta = {}) {
  return logAudit(req, { action: "LOGOUT", targetType: "Auth", targetId: user?._id, meta });
}
