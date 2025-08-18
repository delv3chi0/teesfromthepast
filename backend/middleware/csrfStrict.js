// backend/middleware/csrfStrict.js
// CSRF is fully disabled here to support pure JWT-in-header auth.
// Keep this file even if app.js imports/uses it — it's a no-op.

export function csrfStrict(_req, _res, next) {
  // Do nothing; allow all requests to pass through.
  return next();
}

// Optional helper route so the frontend can "fetch a token" without error.
// We return a stable payload; clients may ignore it.
export function csrfTokenRoute(_req, res) {
  res.status(200).json({ csrfToken: null, csrf: "disabled" });
}
