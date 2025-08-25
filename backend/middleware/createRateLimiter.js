// backend/middleware/createRateLimiter.js
import rateLimit from 'express-rate-limit';
import { getRedisClient, isRedisAvailable } from '../config/redis.js';

// Redis-based store for rate limiting
class RedisStore {
  constructor(options = {}) {
    this.redis = getRedisClient();
    this.prefix = options.prefix || 'rl:';
    this.windowMs = options.windowMs || 60000;
  }

  async increment(key) {
    if (!this.redis) {
      throw new Error('Redis client not available');
    }

    const redisKey = `${this.prefix}${key}`;
    const multi = this.redis.multi();
    
    multi.incr(redisKey);
    multi.expire(redisKey, Math.ceil(this.windowMs / 1000));
    
    const results = await multi.exec();
    const hits = results[0][1];
    
    const resetTime = new Date(Date.now() + this.windowMs);
    
    return {
      totalHits: hits,
      resetTime,
    };
  }

  async decrement(key) {
    if (!this.redis) {
      throw new Error('Redis client not available');
    }

    const redisKey = `${this.prefix}${key}`;
    await this.redis.decr(redisKey);
  }

  async resetKey(key) {
    if (!this.redis) {
      throw new Error('Redis client not available');
    }

    const redisKey = `${this.prefix}${key}`;
    await this.redis.del(redisKey);
  }
}

/**
 * Create a rate limiter with Redis backend (fallback to in-memory if Redis unavailable)
 * @param {Object} options Rate limiter configuration
 * @param {string} options.key Key generator function or string
 * @param {number} options.limit Maximum number of requests
 * @param {number} options.windowSec Window size in seconds
 * @param {string} options.prefix Redis key prefix
 * @param {boolean} options.failOpen Whether to allow requests when Redis fails
 * @returns {Function} Express middleware
 */
export function createRateLimiter({
  key = 'global',
  limit = 60,
  windowSec = 60,
  prefix = 'app:rl:',
  failOpen = false,
  message = 'Too many requests, please try again later.'
} = {}) {
  const windowMs = windowSec * 1000;
  const redis = getRedisClient();

  const options = {
    windowMs,
    limit,
    message: { 
      error: { 
        code: 'RATE_LIMIT_EXCEEDED',
        message 
      } 
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: typeof key === 'function' ? key : (req) => key,
  };

  // Add Redis store only if Redis is available
  if (redis) {
    try {
      options.store = new RedisStore({ prefix, windowMs });
      console.log(`[RateLimit] Using Redis store for rate limiting`);
    } catch (error) {
      console.warn(`[RateLimit] Failed to create Redis store, falling back to memory store:`, error.message);
    }
  } else {
    console.log(`[RateLimit] Using in-memory store for rate limiting (Redis not available)`);
  }

  return rateLimit(options);
}

// Specialized rate limiters
export const createLoginRateLimiter = (options = {}) => createRateLimiter({
  key: (req) => `login:${req.ip}`,
  limit: 5,
  windowSec: 300, // 5 minutes
  prefix: 'auth:',
  message: 'Too many login attempts, please try again in 5 minutes.',
  ...options
});

export const createContactRateLimiter = (options = {}) => createRateLimiter({
  key: (req) => `contact:${req.ip}`,
  limit: 3,
  windowSec: 60,
  prefix: 'forms:',
  message: 'Too many contact form submissions, please try again later.',
  ...options
});

export const createFailedLoginLockout = (options = {}) => createRateLimiter({
  key: (req) => `failed_login:${req.body?.email || req.ip}`,
  limit: 3,
  windowSec: 900, // 15 minutes
  prefix: 'auth:failed:',
  message: 'Account temporarily locked due to too many failed login attempts.',
  ...options
});

export default createRateLimiter;