// backend/middleware/rateLimit.js
// Redis-backed rate limiting middleware with baseline functionality

import Redis from 'ioredis';
import { isConfigReady, getConfig } from '../config/index.js';
import { logger } from '../utils/logger.js';

let redis = null;
let isRedisConnected = false;

// Initialize Redis connection
function initRedis() {
  if (redis) return redis;
  
  let redisUrl;
  
  if (isConfigReady()) {
    const config = getConfig();
    redisUrl = config.REDIS_URL;
  } else {
    redisUrl = process.env.REDIS_URL;
  }
  
  if (!redisUrl) {
    logger.warn('Redis URL not provided, rate limiting will use in-memory fallback');
    return null;
  }
  
  try {
    redis = new Redis(redisUrl, {
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
    
    redis.on('connect', () => {
      isRedisConnected = true;
      logger.info('Redis connected for rate limiting');
    });
    
    redis.on('error', (err) => {
      isRedisConnected = false;
      logger.error('Redis connection error for rate limiting', { error: err.message });
    });
    
    return redis;
  } catch (error) {
    logger.error('Failed to initialize Redis for rate limiting', { error: error.message });
    return null;
  }
}

// In-memory fallback for rate limiting when Redis is unavailable
const memoryStore = new Map();

// Abuse tracking (simple in-memory counter with TTL)
const abuseTracking = new Map();

/**
 * Clean up expired entries from in-memory stores
 */
function cleanupMemoryStores() {
  const now = Date.now();
  
  // Clean up memory store
  for (const [key, data] of memoryStore.entries()) {
    if (now > data.windowEnd) {
      memoryStore.delete(key);
    }
  }
  
  // Clean up abuse tracking
  for (const [key, data] of abuseTracking.entries()) {
    if (now > data.expiresAt) {
      abuseTracking.delete(key);
    }
  }
}

// Cleanup interval (every 60 seconds) - only in non-test environments
if (process.env.NODE_ENV !== 'test') {
  setInterval(cleanupMemoryStores, 60000);
}

/**
 * Get rate limit configuration
 */
function getRateLimitConfig() {
  let config;
  
  if (isConfigReady()) {
    config = getConfig();
  } else {
    // Fallback to environment variables
    config = {
      RATE_LIMIT_WINDOW_SEC: parseInt(process.env.RATE_LIMIT_WINDOW_SEC) || 60,
      RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX) || 120,
      RATE_LIMIT_EXEMPT_PATHS: process.env.RATE_LIMIT_EXEMPT_PATHS || '/health,/readiness',
      RATE_LIMIT_REDIS_PREFIX: process.env.RATE_LIMIT_REDIS_PREFIX || 'rl:'
    };
  }
  
  return {
    windowMs: config.RATE_LIMIT_WINDOW_SEC * 1000,
    maxRequests: config.RATE_LIMIT_MAX,
    exemptPaths: config.RATE_LIMIT_EXEMPT_PATHS.split(',').map(p => p.trim()),
    redisPrefix: config.RATE_LIMIT_REDIS_PREFIX
  };
}

/**
 * Track abuse and determine if we should log warnings
 */
function trackAbuse(key, config) {
  const now = Date.now();
  const windowDuration = config.windowMs * 5; // 5 windows for abuse tracking
  
  let abuseData = abuseTracking.get(key);
  if (!abuseData || now > abuseData.expiresAt) {
    abuseData = {
      count: 0,
      expiresAt: now + windowDuration
    };
  }
  
  abuseData.count += 1;
  abuseTracking.set(key, abuseData);
  
  // Log warning if exceeded threshold more than 3 times within 5 windows
  if (abuseData.count > 3) {
    logger.warn('Rate limit abuse detected', { 
      key, 
      abuseCount: abuseData.count,
      windowCount: 5
    });
    return true;
  }
  
  return false;
}

/**
 * Rate limiting middleware with Redis backing and in-memory fallback
 */
export function createRateLimit() {
  // Initialize Redis connection
  const redisClient = initRedis();
  
  return async (req, res, next) => {
    const config = getRateLimitConfig();
    
    // Check if path is exempt
    if (config.exemptPaths.includes(req.path)) {
      return next();
    }
    
    // Determine rate limit key (user ID if authenticated, otherwise IP)
    const userKey = req.user?.sub || req.user?.id;
    const ipKey = req.ip || 
                 req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
                 req.connection?.remoteAddress || 
                 'unknown';
    
    const rateLimitKey = userKey ? `user:${userKey}` : `ip:${ipKey}`;
    const redisKey = `${config.redisPrefix}${rateLimitKey}`;
    
    const now = Date.now();
    const windowStart = Math.floor(now / config.windowMs) * config.windowMs;
    const windowEnd = windowStart + config.windowMs;
    
    let current = 0;
    let isLimited = false;
    
    try {
      if (redisClient && isRedisConnected) {
        // Use Redis for rate limiting with atomic operations
        const multi = redisClient.multi();
        multi.incr(redisKey);
        multi.expire(redisKey, Math.ceil(config.windowMs / 1000));
        
        const results = await multi.exec();
        if (results && results[0] && results[0][1]) {
          current = parseInt(results[0][1]);
        }
      } else {
        // Fallback to in-memory rate limiting
        const memoryKey = `${rateLimitKey}:${windowStart}`;
        let windowData = memoryStore.get(memoryKey);
        
        if (!windowData) {
          windowData = {
            count: 0,
            windowEnd: windowEnd
          };
        }
        
        windowData.count += 1;
        current = windowData.count;
        memoryStore.set(memoryKey, windowData);
      }
      
      isLimited = current > config.maxRequests;
      
    } catch (error) {
      logger.error('Rate limiting error', { error: error.message, key: rateLimitKey });
      // On error, allow the request through to avoid blocking users
      return next();
    }
    
    // Set standard rate limit headers
    const remaining = Math.max(0, config.maxRequests - current);
    const resetTime = Math.ceil(windowEnd / 1000);
    
    res.set({
      'X-RateLimit-Limit': config.maxRequests.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': resetTime.toString()
    });
    
    if (isLimited) {
      const retryAfterSeconds = Math.ceil((windowEnd - now) / 1000);
      res.set('Retry-After', retryAfterSeconds.toString());
      
      // Track abuse for logging
      trackAbuse(rateLimitKey, config);
      
      // Increment metrics if available
      // TODO: Add rate_limit_requests_total metric
      try {
        // Placeholder for metrics - would integrate with existing metrics system
        // metrics.increment('rate_limited_total', 1);
      } catch (metricsError) {
        // Ignore metrics errors
      }
      
      return res.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Please try again later.',
          retryAfterSeconds
        }
      });
    }
    
    next();
  };
}

export default createRateLimit;