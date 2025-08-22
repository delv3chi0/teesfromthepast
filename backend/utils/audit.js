// backend/utils/audit.js
import AuditLog from "../models/AuditLog.js";

/**
 * Pull a compact fingerprint of the client from the request.
 */
function clientSnapshot(req) {
  const headers = req.headers || {};
  const ip =
    headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.ip ||
    req.connection?.remoteAddress ||
    "";
  const ua = headers["user-agent"] || "";

  // Useful-but-safe header subset (add/remove to taste)
  const headersSubset = {
    "accept-language": headers["accept-language"] || "",
    "sec-ch-ua": headers["sec-ch-ua"] || "",
    "sec-ch-ua-platform": headers["sec-ch-ua-platform"] || "",
    "sec-ch-ua-mobile": headers["sec-ch-ua-mobile"] || "",
    referer: headers["referer"] || "",
    origin: headers["origin"] || "",
  };

  return { ip, userAgent: ua, headers: headersSubset };
}

/**
 * Generic audit logger.
 * You can pass actor explicitly; otherwise we fall back to req.user._id.
 */
export async function logAudit(
  req,
  { action, targetType = "", targetId = "", meta = {}, actor = null }
) {
  try {
    const { ip, userAgent, headers } = clientSnapshot(req);
    const actorId = actor || req.user?._id || null;

    await AuditLog.create({
      action,
      actor: actorId,
      targetType,
      targetId: String(targetId || ""),
      ip,
      userAgent,
      meta: { ...meta, client: headers },
    });
  } catch (err) {
    console.warn("[audit] failed:", err?.message);
  }
}

// Convenience helpers
export async function logAdminAction(req, payload) {
  return logAudit(req, payload);
}
export async function logAuthLogin(req, user, meta = {}) {
  // pass actor explicitly so it’s never “(unknown)”
  return logAudit(req, {
    action: "LOGIN",
    targetType: "Auth",
    targetId: user?._id,
    meta,
    actor: user?._id,
  });
}
export async function logAuthLogout(req, user, meta = {}) {
  return logAudit(req, {
    action: "LOGOUT",
    targetType: "Auth",
    targetId: user?._id,
    meta,
    actor: user?._id,
  });
}
