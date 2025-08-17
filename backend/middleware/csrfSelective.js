// backend/middleware/csrfSelective.js
import csrf from 'csurf';

// Double-submit cookie style; cookie token is readable by client to set header.
const csrfProtection = csrf({
  cookie: {
    httpOnly: false,               // allow frontend to read and send token
    sameSite: 'none',
    secure: process.env.NODE_ENV === 'production',
  },
});

// Skip CSRF for routes where you don't need it (Bearer JWT APIs, auth)
const SKIP = [
  /^\/api\/auth\/login$/,
  /^\/api\/auth\/register$/,
  /^\/api\/auth\/logout$/,
  /^\/api\/stripe\/webhook/,  // Stripe needs raw body + no CSRF
];

export function csrfSelective(req, res, next) {
  if (SKIP.some(rx => rx.test(req.path))) return next();
  return csrfProtection(req, res, next);
}

// Small helper to expose a token if you ever need it
export function csrfTokenRoute(req, res) {
  // req.csrfToken() is available only when csrf middleware is in the chain
  try {
    res.json({ csrfToken: req.csrfToken?.() });
  } catch {
    res.json({ csrfToken: null });
  }
}
