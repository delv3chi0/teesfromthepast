// backend/utils/audit.js
import AuditLog from "../models/AuditLog.js";

/**
 * Extract client info from a custom header (JSON string), plus hints.
 */
function extractClientInfo(req) {
  let client = {};
  try {
    const hdr = req.headers["x-client-info"];
    if (hdr) {
      client = JSON.parse(hdr);
    }
  } catch {
    // ignore bad JSON
  }

  // Also capture some extra CH hints if present
  const hints = {
    secChUa: req.headers["sec-ch-ua"] || "",
    secChUaMobile: req.headers["sec-ch-ua-mobile"] || "",
    secChUaPlatform: req.headers["sec-ch-ua-platform"] || "",
    acceptLanguage: req.headers["accept-language"] || "",
  };

  return { ...client, hints };
}

/**
 * Generic audit logger (safe).
 * You can provide `actorId` to override req.user fallbacks.
 *
 * Example:
 * await logAudit(req, { action:'LOGIN', targetType:'Auth', targetId:user._id, actorId:user._id, meta:{ email:user.email } })
 */
export async function logAudit(
  req,
  {
    action,
    actionLabel = "",
    targetType = "",
    targetId = "",
    meta = {},
    actorId = null,
    sessionJti = "",
  }
) {
  try {
    const actor = actorId || req.user?._id || null;

    const ip =
      (req.headers["x-forwarded-for"] || "")
        .toString()
        .split(",")[0]
        .trim() ||
      req.ip ||
      req.connection?.remoteAddress ||
      "";

    const userAgent = req.headers["user-agent"] || "";
    const method = req.method || "";
    const url = req.originalUrl || req.url || "";
    const origin = req.headers.origin || "";
    const referrer = req.headers.referer || req.headers.referrer || "";

    const client = extractClientInfo(req);

    await AuditLog.create({
      action,
      actionLabel,
      actor,
      actorDisplay:
        req.user?.username ||
        req.user?.email ||
        (typeof actor === "string" ? actor : ""),
      targetType,
      targetId: String(targetId || ""),
      ip,
      userAgent,
      method,
      url,
      origin,
      referrer,
      sessionJti,
      meta,
      client,
    });
  } catch (err) {
    console.warn("[audit] failed:", err?.message);
  }
}

// Convenience helpers
export async function logAdminAction(req, payload) {
  return logAudit(req, payload);
}
export async function logAuthLogin(req, user, meta = {}, sessionJti = "") {
  return logAudit(req, {
    action: "LOGIN",
    targetType: "Auth",
    targetId: user?._id,
    meta,
    actorId: user?._id,
    sessionJti,
  });
}
export async function logAuthLogout(req, user, meta = {}, sessionJti = "") {
  return logAudit(req, {
    action: "LOGOUT",
    targetType: "Auth",
    targetId: user?._id,
    meta,
    actorId: user?._id,
    sessionJti,
  });
}
