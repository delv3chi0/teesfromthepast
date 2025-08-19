// backend/middleware/csrfStrict.js
// CSRF is disabled because the API uses JWT in Authorization header (no cookies).
// We keep the same exports so existing imports don't break.

export function csrfStrict(_req, _res, next) {
  return next();
}

export function csrfTokenRoute(_req, res) {
  return res.status(200).json({ csrfToken: null, source: "disabled" });
}
