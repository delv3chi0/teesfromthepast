// backend/middleware/rateLimit.js
// Baseline Redis-backed rate limiting middleware
import Redis from 'ioredis';
import { isConfigReady, getConfig } from '../config/index.js';
import { logger } from '../utils/logger.js';

let redis = null;
let isRedisConnected = false;

// Initialize Redis connection for rate limiting
function initRateLimitRedis() {
  if (redis) return redis;
  
  let redisUrl;
  
  if (isConfigReady()) {
    const config = getConfig();
    redisUrl = config.REDIS_URL;
  } else {
    redisUrl = process.env.REDIS_URL;
  }
  
  if (!redisUrl) {
    logger.warn('Redis URL not provided, rate limiting will be disabled (fail-open mode)');
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
      logger.error('Redis rate limiting connection error', { error: err.message });
    });
    
    return redis;
  } catch (error) {
    logger.error('Failed to initialize Redis for rate limiting', { error: error.message });
    return null;
  }
}

// Get rate limit key for user or IP
function getRateLimitKey(ip, userId, prefix) {
  if (userId) {
    return `${prefix}user:${userId}`;
  }
  return `${prefix}ip:${ip}`;
}

// Check if path is exempt from rate limiting
function isExemptPath(requestPath, exemptPaths) {
  const exemptList = exemptPaths.split(',').map(path => path.trim());
  return exemptList.some(exemptPath => requestPath.startsWith(exemptPath));
}

/**
 * Create baseline rate limiting middleware
 * @returns {Function} Express middleware function
 */
export function createRateLimit() {
  // Initialize Redis connection
  initRateLimitRedis();
  
  return async (req, res, next) => {
    const config = isConfigReady() ? getConfig() : {
      RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW || '60000', 10),
      RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '120', 10),
      RATE_LIMIT_EXEMPT_PATHS: process.env.RATE_LIMIT_EXEMPT_PATHS || '/health,/readiness',
      RATE_LIMIT_REDIS_PREFIX: process.env.RATE_LIMIT_REDIS_PREFIX || 'rl:'
    };

    const requestPath = req.path;
    const ip = req.ip || req.connection.remoteAddress || '127.0.0.1';
    const userId = req.user?.sub || req.user?._id?.toString();

    // Check if path is exempt
    if (isExemptPath(requestPath, config.RATE_LIMIT_EXEMPT_PATHS)) {
      return next();
    }

    // If Redis is not available, fail open with indication header
    if (!redis || !isRedisConnected) {
      res.setHeader('X-RateLimit-Disabled', 'true');
      return next();
    }

    const rateLimitKey = getRateLimitKey(ip, userId, config.RATE_LIMIT_REDIS_PREFIX);
    const windowStart = Math.floor(Date.now() / config.RATE_LIMIT_WINDOW) * config.RATE_LIMIT_WINDOW;
    const windowKey = `${rateLimitKey}:${windowStart}`;

    try {
      // Fixed window implementation using Redis INCR
      const count = await redis.incr(windowKey);
      
      // Set expiration only on first increment
      if (count === 1) {
        await redis.expire(windowKey, Math.ceil(config.RATE_LIMIT_WINDOW / 1000));
      }

      const remaining = Math.max(0, config.RATE_LIMIT_MAX - count);
      const resetTime = windowStart + config.RATE_LIMIT_WINDOW;

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', config.RATE_LIMIT_MAX);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime / 1000));

      // Check if rate limit exceeded
      if (count > config.RATE_LIMIT_MAX) {
        const retryAfterSeconds = Math.ceil((resetTime - Date.now()) / 1000);
        res.setHeader('Retry-After', retryAfterSeconds);
        
        return res.status(429).json({
          error: {
            code: 'RATE_LIMITED',
            message: 'Rate limit exceeded',
            retryAfterSeconds
          }
        });
      }

      next();
    } catch (error) {
      logger.error('Rate limiting error, failing open', { error: error.message, key: rateLimitKey });
      // Fail open on Redis errors
      res.setHeader('X-RateLimit-Disabled', 'true');
      next();
    }
  };
}

export default { createRateLimit };