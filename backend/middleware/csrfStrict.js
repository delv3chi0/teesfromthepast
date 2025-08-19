// backend/middleware/csrfStrict.js
export function csrfStrict(_req, _res, next) {
  return next(); // CSRF disabled: we use JWT in Authorization header only
}
export function csrfTokenRoute(_req, res) {
  return res.status(200).json({ csrfToken: null, source: "disabled" });
}
