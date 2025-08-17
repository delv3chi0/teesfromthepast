// backend/middleware/csrfStrict.js
import crypto from "crypto";

const COOKIE = "csrfToken";
const TTL_MS = 6 * 60 * 60 * 1000; // 6h

// Paths that must never be CSRF-checked
const EXEMPT_PREFIXES = [
  "/api/stripe",        // webhooks (raw body)
  "/health",
  "/api/csrf",          // token fetch
];

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function needsCheck(req) {
  if (SAFE_METHODS.has(req.method)) return false;
  const p = req.path || req.originalUrl || "";
  return !EXEMPT_PREFIXES.some((pre) => p.startsWith(pre));
}

function setTokenCookie(res) {
  const token = crypto.randomBytes(24).toString("hex");
  res.cookie(COOKIE, token, {
    httpOnly: false,     // SPA reads it to mirror in header
    secure: true,        // required for SameSite=None
    sameSite: "none",    // cross-site (Vercel -> Render)
    path: "/",
    maxAge: TTL_MS,
  });
  return token;
}

export function csrfTokenRoute(req, res) {
  const current = req.cookies?.[COOKIE];
  if (current) return res.json({ csrfToken: current, source: "existing" });
  const token = setTokenCookie(res);
  return res.json({ csrfToken: token, source: "new" });
}

export function csrfStrict(req, res, next) {
  // Always ensure a token cookie exists (so the SPA can grab it any time)
  if (!req.cookies?.[COOKIE]) setTokenCookie(res);

  // Only enforce on non-safe methods and non-exempt paths
  if (!needsCheck(req)) return next();

  const cookieToken = req.cookies?.[COOKIE];
  const headerToken =
    req.get("x-csrf-token") || req.get("X-CSRF-Token") || req.get("csrf-token");

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    // Do not leak details; keep responses uniform
    return res.status(403).json({ message: "Invalid CSRF token" });
  }

  return next();
}
