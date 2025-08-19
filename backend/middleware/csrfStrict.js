// backend/middleware/csrfStrict.js
// No-op CSRF for JWT-based APIs. We do NOT use cookie auth, so CSRF is unnecessary.
// Keeping the same exports so other code doesn't break.

export function csrfStrict(_req, _res, next) {
  // Do nothing, allow the request through.
  return next();
}

export function csrfTokenRoute(_req, res) {
  // For compatibility with any client call to /api/csrf
  return res.status(200).json({ csrfToken: null, source: "disabled" });
}
