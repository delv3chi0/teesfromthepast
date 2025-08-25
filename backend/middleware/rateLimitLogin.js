/**
 * Simple in-memory rate limiter for /api/auth/login
 * NOTE: Suitable for a single-instance deployment. Replace with Redis for multi-instance.
 */
const WINDOW_MS = 60_000; // 1 minute
const MAX_ATTEMPTS = 10;

const buckets = new Map(); // key -> { count, reset }

export function rateLimitLogin(req, res, next) {
  const ip = req.ip || req.connection?.remoteAddress || "unknown";
  const now = Date.now();
  let entry = buckets.get(ip);

  if (!entry || now > entry.reset) {
    entry = { count: 0, reset: now + WINDOW_MS };
    buckets.set(ip, entry);
  }

  entry.count += 1;

  const remaining = Math.max(0, MAX_ATTEMPTS - entry.count);
  res.setHeader("X-RateLimit-Limit", MAX_ATTEMPTS);
  res.setHeader("X-RateLimit-Remaining", remaining);
  res.setHeader("X-RateLimit-Reset", Math.floor(entry.reset / 1000));

  if (entry.count > MAX_ATTEMPTS) {
    const retryAfterSec = Math.ceil((entry.reset - now) / 1000);
    res.setHeader("Retry-After", retryAfterSec);
    return res.status(429).json({
      ok: false,
      error: {
        code: "RATE_LIMITED",
        message: "Too many login attempts. Please wait and try again."
      }
    });
  }

  next();
}

export default rateLimitLogin;
