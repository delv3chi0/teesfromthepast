// backend/middleware/csrfSelective.js
import crypto from "crypto";

/**
 * Double-submit CSRF:
 *  - GET /api/csrf issues a fresh token:
 *      - sets cookie: csrfToken=<random>; SameSite=None; Secure in prod; HttpOnly
 *      - returns { csrfToken } in JSON
 *  - For unsafe methods (POST/PUT/PATCH/DELETE):
 *      - middleware checks header 'x-csrf-token' equals cookie value
 *  - Safe methods (GET/HEAD/OPTIONS) are allowed
 *
 * Notes:
 *  - Works across origins with CORS+credentials
 *  - Cookie is HttpOnly (client cannot read it) — client sends token via header from the JSON body
 */

const CSRF_COOKIE = "csrfToken";
const CSRF_HEADER = "x-csrf-token";

function issueToken() {
  return crypto.randomBytes(24).toString("hex");
}

export function csrfTokenRoute(req, res) {
  const token = issueToken();

  // Cookie flags
  const isProd = process.env.NODE_ENV === "production";
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: true,                 // server-only cookie
    sameSite: isProd ? "none" : "lax",
    secure: isProd,                 // required for SameSite=None
    path: "/",
    maxAge: 2 * 60 * 60 * 1000,     // 2 hours
  });

  res.status(200).json({ csrfToken: token });
}

/**
 * Paths that do NOT require CSRF (idempotent, or external callbacks):
 *  - Stripe webhook (it uses its own signature verification)
 */
const CSRF_EXEMPT_PREFIXES = [
  "/api/stripe/",     // your webhook router
];

/**
 * Methods that DO require CSRF check
 */
const PROTECTED_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function csrfSelective(req, res, next) {
  // Allow safe methods
  if (!PROTECTED_METHODS.has(req.method)) return next();

  // Allow exempt routes
  const path = req.originalUrl || req.url || "";
  if (CSRF_EXEMPT_PREFIXES.some((p) => path.startsWith(p))) return next();

  // Require header to match cookie
  const header = (req.headers[CSRF_HEADER] || "").toString();
  const cookie = (req.cookies?.[CSRF_COOKIE] || "").toString();

  if (!header || !cookie || header !== cookie) {
    return res.status(403).json({ message: "CSRF token missing or invalid" });
  }
  return next();
}
