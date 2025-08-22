import AuditLog from "../models/AuditLog.js";

/**
 * Pulls best-effort client info from request.
 * If your frontend sends a `client` object (locale, tz, screen, hints),
 * we’ll merge it under `client`.
 */
function extractRequestContext(req) {
  const ip =
    (req.headers["x-forwarded-for"] || "").toString().split(",")[0].trim() ||
    req.ip ||
    req.connection?.remoteAddress ||
    "";

  const userAgent = req.headers["user-agent"] || "";
  const method = req.method || "";
  const url = req.originalUrl || req.url || "";
  const referrer = req.headers["referer"] || req.headers["referrer"] || "";
  const origin = req.headers["origin"] || "";
  return { ip, userAgent, method, url, referrer, origin };
}

/**
 * Generic audit logger (fire-and-forget friendly).
 * Supply `sessionJti` in meta to tie entries to a session if you have it.
 */
export async function logAudit(req, {
  action,
  targetType = "",
  targetId = "",
  meta = {},
}) {
  try {
    const actorId = req.user?._id || null;
    const { ip, userAgent, method, url, referrer, origin } = extractRequestContext(req);

    // Optional front-end provided client blob (locale, tz, screen, hints…)
    const client = req.body?.client || req.clientInfo || {};

    const doc = {
      action,
      actor: actorId,
      actorDisplay: req.user?.username || req.user?.email || "",
      targetType,
      targetId: String(targetId || ""),
      ip,
      userAgent,
      method,
      url,
      referrer,
      origin,
      sessionJti: meta?.sessionJti || "",
      client,
      meta: meta || {},
    };

    await AuditLog.create(doc);
  } catch (err) {
    // Never throw from audit logging
    console.warn("[audit] failed:", err?.message);
  }
}

export const logAdminAction = (req, payload) => logAudit(req, payload);
export const logAuthLogin = (req, user, meta = {}) =>
  logAudit(req, { action: "LOGIN", targetType: "Auth", targetId: user?._id, meta });
export const logAuthLogout = (req, user, meta = {}) =>
  logAudit(req, { action: "LOGOUT", targetType: "Auth", targetId: user?._id, meta });
