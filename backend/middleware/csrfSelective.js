// backend/middleware/csrfSelective.js
import csurf from "csurf";

/**
 * We use cookie-based CSRF protection. The cookie contains the secret (HTTP-only),
 * and clients fetch a per-request token via GET /api/csrf and send it back in the
 * "X-CSRF-Token" header for state-changing requests (POST/PUT/PATCH/DELETE).
 *
 * Mount order in app.js:
 *   cookieParser -> JSON body parser -> csrfSelective -> routes...
 */

// Create csurf middleware with cookie storage
const csrf = csurf({
  cookie: {
    key: "__Host-csrf",
    httpOnly: true,          // not readable by JS (safer)
    sameSite: "none",        // because your frontend is on a different domain
    secure: true,            // required for sameSite: 'none'
  },
});

/**
 * We only want CSRF on "unsafe" methods (POST/PUT/PATCH/DELETE) under /api,
 * and we need to skip a few paths such as the token endpoint itself and Stripe webhooks.
 *
 * NOTE: This file exports **named** exports only.
 */
export function csrfSelective(req, res, next) {
  const method = (req.method || "GET").toUpperCase();
  const url = req.originalUrl || req.url || "";

  // 1) Skip Stripe webhooks (they use raw body and are verified by Stripe signature)
  if (url.startsWith("/api/stripe/")) return next();

  // 2) Skip fetching the token itself
  if (method === "GET" && url === "/api/csrf") return next();

  // 3) Only enforce CSRF on unsafe methods
  const unsafe = method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE";
  if (!unsafe) return next();

  // Run csurf for unsafe requests
  return csrf(req, res, (err) => {
    if (err) {
      // csurf throws a specific error for bad/missing token
      if (err.code === "EBADCSRFTOKEN") {
        return res.status(403).json({ message: "Invalid CSRF token" });
      }
      return next(err);
    }
    next();
  });
}

/**
 * GET /api/csrf
 * Issues a fresh token tied to the HTTP-only secret cookie.
 * Client must put this token in "X-CSRF-Token" for subsequent unsafe requests.
 */
export function csrfTokenRoute(req, res) {
  // We must run csurf here to ensure the secret cookie exists before calling req.csrfToken()
  csrf(req, res, (err) => {
    if (err) {
      const status = err.code === "EBADCSRFTOKEN" ? 403 : 500;
      return res.status(status).json({ message: "Could not issue CSRF token" });
    }
    try {
      const token = req.csrfToken();
      // You can also echo sameSite & secure cookie advice here if needed
      return res.status(200).json({ csrfToken: token });
    } catch (e) {
      return res.status(500).json({ message: "Could not issue CSRF token" });
    }
  });
}
