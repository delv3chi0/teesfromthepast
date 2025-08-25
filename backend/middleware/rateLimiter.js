// backend/middleware/rateLimiter.js
// Generic rate limiting with token bucket/sliding window implementation

import { logSecurityEvent } from '../utils/logger.js';

// Configuration from environment variables
const RATE_LIMIT_LOGIN = process.env.RATE_LIMIT_LOGIN || '10/600'; // 10 requests per 10 minutes
const RATE_LIMIT_REGISTER = process.env.RATE_LIMIT_REGISTER || '5/3600'; // 5 requests per hour
const RATE_LIMIT_PWRESET = process.env.RATE_LIMIT_PWRESET || '5/1800'; // 5 requests per 30 minutes
const LOCKOUT_THRESHOLD = parseInt(process.env.LOCKOUT_THRESHOLD) || 5;
const LOCKOUT_SECONDS = parseInt(process.env.LOCKOUT_SECONDS) || 900; // 15 minutes

// In-memory storage for rate limiting (in production, use Redis)
const rateLimitStore = new Map();
const failedLoginStore = new Map();

/**
 * Parse rate limit string like "10/600" into {limit: 10, window: 600}
 */
function parseRateLimit(rateLimitStr) {
  const [limit, window] = rateLimitStr.split('/').map(Number);
  return { limit, window: window * 1000 }; // Convert to milliseconds
}

/**
 * Get rate limit key based on strategy
 */
function getRateLimitKey(req, strategy = 'ip') {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown';
  const email = req.body?.email?.toLowerCase()?.trim();
  
  switch (strategy) {
    case 'ip':
      return `ip:${ip}`;
    case 'ip+email':
      return email ? `ip+email:${ip}:${email}` : `ip:${ip}`;
    case 'email':
      return email ? `email:${email}` : `ip:${ip}`;
    default:
      return `ip:${ip}`;
  }
}

/**
 * Sliding window rate limiter
 */
function isRateLimited(key, limit, windowMs) {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, []);
  }
  
  const requests = rateLimitStore.get(key);
  
  // Remove old requests outside the window
  while (requests.length > 0 && requests[0] < windowStart) {
    requests.shift();
  }
  
  // Check if limit exceeded
  if (requests.length >= limit) {
    return true;
  }
  
  // Add current request
  requests.push(now);
  
  return false;
}

/**
 * Clean up old entries periodically
 */
function cleanupRateLimitStore() {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
  
  for (const [key, requests] of rateLimitStore.entries()) {
    if (requests.length === 0 || requests[requests.length - 1] < now - maxAge) {
      rateLimitStore.delete(key);
    }
  }
}

// Cleanup every hour
setInterval(cleanupRateLimitStore, 60 * 60 * 1000);

/**
 * Generic rate limiter middleware factory
 */
export function createRateLimiter(options = {}) {
  const {
    rateLimitStr = '100/3600', // Default: 100 requests per hour
    strategy = 'ip',
    message = 'Too many requests, please try again later.',
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = options;
  
  const { limit, window } = parseRateLimit(rateLimitStr);
  
  return (req, res, next) => {
    const key = getRateLimitKey(req, strategy);
    
    if (isRateLimited(key, limit, window)) {
      logSecurityEvent('rate_limit_exceeded', {
        key,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        path: req.path,
        method: req.method
      });
      
      return res.status(429).json({
        error: 'Too Many Requests',
        message,
        retryAfter: Math.ceil(window / 1000)
      });
    }
    
    next();
  };
}

/**
 * Failed login tracking and lockout
 */
export function trackFailedLogin(req, res, next) {
  const originalSend = res.send;
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown';
  const email = req.body?.email?.toLowerCase()?.trim();
  
  res.send = function(data) {
    // Check if this was a failed login (status 401 or specific error patterns)
    if (res.statusCode === 401 || (typeof data === 'string' && data.includes('Invalid credentials'))) {
      markFailedLogin(ip, email, req);
    } else if (res.statusCode === 200) {
      // Successful login - clear failed attempts
      clearFailedLogin(ip, email);
    }
    
    return originalSend.call(this, data);
  };
  
  next();
}

/**
 * Check if IP+email combination is locked out
 */
export function checkLoginLockout(req, res, next) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown';
  const email = req.body?.email?.toLowerCase()?.trim();
  const key = email ? `${ip}:${email}` : ip;
  
  const lockoutData = failedLoginStore.get(key);
  
  if (lockoutData && lockoutData.lockedUntil > Date.now()) {
    const remainingSeconds = Math.ceil((lockoutData.lockedUntil - Date.now()) / 1000);
    
    logSecurityEvent('login_lockout_active', {
      ip,
      email,
      failedAttempts: lockoutData.attempts,
      remainingSeconds
    });
    
    return res.status(429).json({
      error: 'Account Temporarily Locked',
      message: 'Too many failed login attempts. Please try again later.',
      retryAfter: remainingSeconds
    });
  }
  
  next();
}

function markFailedLogin(ip, email, req) {
  const key = email ? `${ip}:${email}` : ip;
  const now = Date.now();
  
  if (!failedLoginStore.has(key)) {
    failedLoginStore.set(key, { attempts: 0, firstAttempt: now });
  }
  
  const data = failedLoginStore.get(key);
  data.attempts++;
  data.lastAttempt = now;
  
  // If exceeded threshold, lock the account
  if (data.attempts >= LOCKOUT_THRESHOLD) {
    data.lockedUntil = now + (LOCKOUT_SECONDS * 1000);
    
    logSecurityEvent('login_lockout_triggered', {
      ip,
      email,
      failedAttempts: data.attempts,
      lockoutDurationSeconds: LOCKOUT_SECONDS,
      userAgent: req.headers['user-agent']
    });
  }
}

function clearFailedLogin(ip, email) {
  const key = email ? `${ip}:${email}` : ip;
  failedLoginStore.delete(key);
}

// Pre-configured rate limiters for common endpoints
export const loginRateLimit = createRateLimiter({
  rateLimitStr: RATE_LIMIT_LOGIN,
  strategy: 'ip+email',
  message: 'Too many login attempts, please try again later.'
});

export const registerRateLimit = createRateLimiter({
  rateLimitStr: RATE_LIMIT_REGISTER,
  strategy: 'ip',
  message: 'Too many registration attempts, please try again later.'
});

export const passwordResetRateLimit = createRateLimiter({
  rateLimitStr: RATE_LIMIT_PWRESET,
  strategy: 'ip+email',
  message: 'Too many password reset attempts, please try again later.'
});

export default createRateLimiter;