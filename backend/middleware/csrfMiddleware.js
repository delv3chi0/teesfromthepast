// backend/middleware/csrfMiddleware.js
import crypto from 'crypto';

const CSRF_COOKIE = 'csrf';

export function ensureCsrfCookie(req, res, next) {
  // Set once per session (safe on GET)
  if (!req.cookies[CSRF_COOKIE]) {
    const token = crypto.randomBytes(24).toString('hex');
    // Non-httpOnly so the frontend can read & send in header
    res.cookie(CSRF_COOKIE, token, {
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: false,
      path: '/',
      maxAge: 30 * 24 * 3600 * 1000,
    });
  }
  next();
}

export function requireCsrf(req, res, next) {
  // Allow safe methods without CSRF
  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return next();

  // Exempt webhooks or explicitly opted-out paths if needed
  if (req.path.startsWith('/api/stripe')) return next();

  const cookieToken = req.cookies[CSRF_COOKIE];
  const headerToken = req.headers['x-csrf-token'];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ message: 'Invalid CSRF token' });
  }
  next();
}
