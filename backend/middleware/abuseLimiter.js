// backend/middleware/abuseLimiter.js
// Route-specific sliding window rate limiter with failed attempt tracking
import logger from '../utils/logger.js';

// In-memory storage for rate limiting (replace with Redis for production scaling)
const buckets = new Map(); // key -> { count, reset, failedAttempts }

/**
 * Default rate limiting configurations
 * Format: { windowMs, maxAttempts, maxFailedAttempts }
 */
const DEFAULT_CONFIGS = {
  register: { windowMs: 60 * 60 * 1000, maxAttempts: 5 }, // 5 attempts per hour
  login: { windowMs: 60 * 1000, maxAttempts: 10, maxFailedAttempts: 5 }, // 10 attempts per minute, 5 failed per IP+email
  passwordReset: { windowMs: 15 * 60 * 1000, maxAttempts: 3 } // 3 attempts per 15 minutes
};

/**
 * Create an abuse limiter for specific routes
 * @param {string} type - Type of limiter ('register', 'login', 'passwordReset')
 * @param {Object} options - Custom configuration overrides
 * @returns {Function} Express middleware function
 */
export function createAbuseLimiter(type, options = {}) {
  const config = { ...DEFAULT_CONFIGS[type], ...options };
  
  if (!config) {
    throw new Error(`Unknown abuse limiter type: ${type}`);
  }

  return (req, res, next) => {
    const ip = req.ip || 
               req.get('x-forwarded-for')?.split(',')[0]?.trim() || 
               req.connection?.remoteAddress || 
               'unknown';
    
    const email = req.body?.email?.toLowerCase().trim() || '';
    
    // Create keys for IP-based and IP+email-based tracking
    const ipKey = `${type}:ip:${ip}`;
    const emailKey = email ? `${type}:email:${ip}:${email}` : null;
    
    const now = Date.now();
    
    // Check IP-based rate limit
    let ipBucket = buckets.get(ipKey);
    if (!ipBucket || now >= ipBucket.reset) {
      ipBucket = { count: 0, failedAttempts: 0, reset: now + config.windowMs };
      buckets.set(ipKey, ipBucket);
    }
    
    // Check email-specific failed attempts (for login)
    let emailBucket = null;
    if (emailKey && config.maxFailedAttempts) {
      emailBucket = buckets.get(emailKey);
      if (!emailBucket || now >= emailBucket.reset) {
        emailBucket = { count: 0, failedAttempts: 0, reset: now + config.windowMs };
        buckets.set(emailKey, emailBucket);
      }
    }
    
    // Increment counters
    ipBucket.count += 1;
    if (emailBucket) emailBucket.count += 1;
    
    // Check if limits exceeded
    const ipExceeded = ipBucket.count > config.maxAttempts;
    const emailExceeded = emailBucket && config.maxFailedAttempts && 
                         emailBucket.failedAttempts >= config.maxFailedAttempts;
    
    if (ipExceeded || emailExceeded) {
      const retryAfterSec = Math.ceil((ipBucket.reset - now) / 1000);
      
      res.setHeader('Retry-After', retryAfterSec);
      res.setHeader('X-RateLimit-Limit', config.maxAttempts);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader('X-RateLimit-Reset', Math.floor(ipBucket.reset / 1000));
      
      logger.warn('Rate limit exceeded', {
        type,
        ip,
        email: email || null,
        ipCount: ipBucket.count,
        emailFailedAttempts: emailBucket?.failedAttempts || 0,
        retryAfterSec
      });
      
      return res.status(429).json({
        ok: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Please wait and try again.'
        },
        retryAfter: retryAfterSec
      });
    }
    
    // Set rate limit headers
    const remaining = Math.max(0, config.maxAttempts - ipBucket.count);
    res.setHeader('X-RateLimit-Limit', config.maxAttempts);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', Math.floor(ipBucket.reset / 1000));
    
    // Store buckets in request for potential failed attempt tracking
    req.rateLimitBuckets = { ipBucket, emailBucket };
    
    next();
  };
}

/**
 * Middleware to track failed authentication attempts
 * Call this after authentication fails to increment failed attempt counters
 */
export function trackFailedAttempt(req) {
  if (req.rateLimitBuckets?.emailBucket) {
    req.rateLimitBuckets.emailBucket.failedAttempts += 1;
  }
  if (req.rateLimitBuckets?.ipBucket) {
    req.rateLimitBuckets.ipBucket.failedAttempts += 1;
  }
}

// Pre-configured limiters for common use cases
export const registerLimiter = createAbuseLimiter('register');
export const loginLimiter = createAbuseLimiter('login');
export const passwordResetLimiter = createAbuseLimiter('passwordReset');

export default createAbuseLimiter;