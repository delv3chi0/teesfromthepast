// backend/middleware/csrfStrict.js
import crypto from "crypto";

/**
 * We enforce CSRF on unsafe methods across the API, with explicit exemptions
 * for endpoints that either:
 *  - are auth flows (login/register/logout/password reset), or
 *  - must accept third-party callbacks/webhooks (Stripe),
 *  - or are safe/GET (implicitly skipped).
 *
 * This keeps you secure where it matters, while avoiding cross-site cookie edge
 * cases on login.
 */

const COOKIE = "csrfToken";
const TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** Prefixes completely exempt from CSRF enforcement */
const EXEMPT_PREFIXES = [
  "/api/stripe",                // webhooks (raw body)
  "/health",
  "/api/csrf",                  // token fetch endpoint
];

/** Exact paths exempt from CSRF (auth flows) */
const EXEMPT_EXACT = new Set([
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
  "/api/auth/request-password-reset",
  "/api/auth/reset-password",
]);

function isExempt(req) {
  const p = req.path || req.originalUrl || "";
  if (EXEMPT_EXACT.has(p)) return true;
  return EXEMPT_PREFIXES.some((pre) => p.startsWith(pre));
}

function needsCheck(req) {
  if (SAFE_METHODS.has((req.method || "").toUpperCase())) return false;
  if (isExempt(req)) return false;
  return true;
}

function setTokenCookie(res) {
  const token = crypto.randomBytes(24).toString("hex");
  res.cookie(COOKIE, token, {
    httpOnly: false,       // readable by SPA; header must mirror this value
    secure: true,          // required with SameSite=None on HTTPS
    sameSite: "none",      // allow cross-site (Vercel → Render)
    path: "/",
    maxAge: TTL_MS,
  });
  return token;
}

/** GET /api/csrf — returns { csrfToken } and (re)sets the cookie */
export function csrfTokenRoute(req, res) {
  const existing = req.cookies?.[COOKIE];
  if (existing) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[CSRF] token fetch (existing) for ${req.path}`);
    }
    return res.json({ csrfToken: existing, source: "existing" });
  }
  const token = setTokenCookie(res);
  if (process.env.NODE_ENV !== "production") {
    console.log(`[CSRF] token fetch (new) for ${req.path}`);
  }
  return res.json({ csrfToken: token, source: "new" });
}

/**
 * Strict CSRF middleware:
 * - Always ensure a cookie exists so the client can mirror it into a header.
 * - Enforce only on "unsafe" methods and non-exempt endpoints.
 */
export function csrfStrict(req, res, next) {
  // Always ensure token cookie exists (so SPA can pick it up from /api/csrf)
  if (!req.cookies?.[COOKIE]) {
    setTokenCookie(res);
    if (process.env.NODE_ENV !== "production") {
      console.log(`[CSRF] set new cookie on request: ${req.method} ${req.path}`);
    }
  }

  if (!needsCheck(req)) return next();

  const cookieToken = req.cookies?.[COOKIE];
  const headerToken =
    req.get("x-csrf-token") ||
    req.get("X-CSRF-Token") ||
    req.get("csrf-token");

  if (
    !cookieToken ||
    !headerToken ||
    String(cookieToken).trim() !== String(headerToken).trim()
  ) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[CSRF] MISMATCH", {
        path: req.path,
        method: req.method,
        haveCookie: !!cookieToken,
        haveHeader: !!headerToken,
      });
    }
    return res.status(403).json({ message: "Invalid CSRF token" });
  }

  return next();
}
