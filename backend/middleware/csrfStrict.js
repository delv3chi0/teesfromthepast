// backend/middleware/csrfStrict.js
import crypto from "crypto";

/**
 * Strict double-submit cookie CSRF with explicit exemptions
 * for unauthenticated auth endpoints + webhook + health + token fetch.
 */

const COOKIE = "csrfToken";
const TTL_MS = 6 * 60 * 60 * 1000; // 6h

// NEVER CSRF-check these paths:
const EXEMPT_PREFIXES = [
  "/api/stripe",       // webhooks (raw body)
  "/health",
  "/api/csrf",         // token fetch
  // unauthenticated auth endpoints — allow without CSRF to avoid cross-origin cookie headaches
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
];

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function needsCheck(req) {
  if (SAFE_METHODS.has(String(req.method).toUpperCase())) return false;
  const p = req.path || req.originalUrl || "";
  return !EXEMPT_PREFIXES.some((pre) => p.startsWith(pre));
}

function setTokenCookie(res) {
  const token = crypto.randomBytes(24).toString("hex");
  res.cookie(COOKIE, token, {
    httpOnly: false,      // readable by SPA to mirror into header
    secure: true,         // required for SameSite=None
    sameSite: "none",     // cross-site (Vercel -> Render)
    path: "/",
    maxAge: TTL_MS,
  });
  return token;
}

export function csrfTokenRoute(_req, res) {
  const existing = _req.cookies?.[COOKIE];
  if (existing) return res.json({ csrfToken: existing, source: "existing" });
  const token = setTokenCookie(res);
  return res.json({ csrfToken: token, source: "new" });
}

export function csrfStrict(req, res, next) {
  // Always ensure a token exists for the SPA to read
  if (!req.cookies?.[COOKIE]) setTokenCookie(res);

  if (!needsCheck(req)) return next();

  const cookieToken = req.cookies?.[COOKIE];
  const headerToken =
    req.get("x-csrf-token") || req.get("X-CSRF-Token") || req.get("csrf-token");

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ message: "Invalid CSRF token" });
  }
  return next();
}
