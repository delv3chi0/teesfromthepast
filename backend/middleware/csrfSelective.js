// backend/middleware/csrfSelective.js
import csurf from "csurf";
import cookie from "cookie";

// We use cookie-based CSRF (double-submit) so we can be stateless (no server sessions).
// Cross-site (Vercel app → Render API) requires SameSite=None; Secure on the secret cookie.
const CSRF_COOKIE_NAME = process.env.CSRF_COOKIE_NAME || "XSRF-SECRET";
const CSRF_HEADER_NAME = "x-csrf-token"; // csurf accepts x-csrf-token / x-xsrf-token / csrf-token

// Create the csurf middleware instance with cookie storage
const _csurf = csurf({
  cookie: {
    key: CSRF_COOKIE_NAME,       // secret cookie name
    httpOnly: true,              // secret should NOT be readable by JS
    sameSite: "none",            // allow cross-site
    secure: true,                // required when SameSite=None
    path: "/",                   // all paths
  },
  value: (req) => {
    // Accept token from header (case-insensitive)
    return (
      req.headers[CSRF_HEADER_NAME] ||
      req.headers["x-xsrf-token"] ||
      req.headers["csrf-token"]
    );
  },
});

// Optional: skip CSRF for idempotent requests, enable for unsafe methods
function shouldApplyCsrf(req) {
  const m = String(req.method || "GET").toUpperCase();
  if (m === "GET" || m === "HEAD" || m === "OPTIONS") return false;
  return true;
}

// This middleware only applies csurf when needed, and ensures the secret cookie exists.
export function csrfSelective(req, res, next) {
  if (!shouldApplyCsrf(req)) {
    return next();
  }
  return _csurf(req, res, next);
}

// Route to fetch a fresh CSRF token. This must be mounted AFTER cookieParser and BEFORE your routes.
export function csrfTokenRoute(req, res) {
  // Ensure the csurf secret cookie exists by invoking the middleware on a safe request
  // For GET, we still need to ensure the secret cookie is set, so run csurf once:
  _csurf(req, res, () => {
    const token = req.csrfToken();
    // Expose a readable (non-HttpOnly) helper cookie for client frameworks if desired.
    // Not strictly necessary since we return JSON and set header in the frontend.
    const readableCookie = cookie.serialize("XSRF-TOKEN", token, {
      httpOnly: false,
      sameSite: "none",
      secure: true,
      path: "/",
    });
    res.setHeader("Set-Cookie", readableCookie);
    res.status(200).json({ csrfToken: token });
  });
}
