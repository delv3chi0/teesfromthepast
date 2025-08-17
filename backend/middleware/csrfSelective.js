// backend/middleware/csrfSelective.js
import csurf from "csurf";

/**
 * Best-practice CSRF posture for your app:
 * - Your API is JWT/Bearer-based → CSRF protection is not required for those endpoints.
 * - We keep a selective middleware that currently SKIPS everything.
 *   When/if you add cookie-backed HTML forms, flip the default to enforce.
 */

const csrfProtection = csurf({
  cookie: {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    secure: process.env.NODE_ENV === "production",
  },
});

function shouldSkip(req) {
  // Skip idempotent methods
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return true;

  const p = req.path || req.originalUrl || "";

  // Skip JWT auth API (Bearer tokens → not CSRF-sensitive)
  if (p.startsWith("/api/auth")) return true;

  // Skip third-party webhooks
  if (p.startsWith("/api/stripe/webhook")) return true;

  // Current app: pure API + JWT → skip everything.
  // When you add cookie/form endpoints, change this to: `return false;`
  // and keep only specific exceptions above.
  return true;
}

export default function csrfSelective(req, res, next) {
  if (shouldSkip(req)) return next();
  return csrfProtection(req, res, next);
}

// Optional helper to fetch a CSRF token (useful if you later enforce CSRF on some endpoints)
export function csrfTokenRoute(req, res) {
  try {
    // If csrfProtection isn't run, req.csrfToken may not exist; guard it.
    const token = req.csrfToken ? req.csrfToken() : null;
    res.json({ csrfToken: token });
  } catch {
    res.json({ csrfToken: null });
  }
}
