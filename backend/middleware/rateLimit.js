// backend/middleware/rateLimit.js
// Redis-backed global fixed-window rate limiting middleware
import Redis from 'ioredis';
import { isConfigReady, getConfig } from '../config/index.js';
import { logger } from '../utils/logger.js';

let redis = null;
let isConnected = false;

/**
 * Initialize Redis connection for rate limiting
 */
function initRateLimitRedis() {
  if (redis) return redis;
  
  let redisUrl;
  let rateLimitRedisPrefix;
  
  if (isConfigReady()) {
    const config = getConfig();
    redisUrl = config.REDIS_URL;
    rateLimitRedisPrefix = config.RATE_LIMIT_REDIS_PREFIX;
  } else {
    redisUrl = process.env.REDIS_URL;
    rateLimitRedisPrefix = process.env.RATE_LIMIT_REDIS_PREFIX || 'rl:';
  }
  
  if (!redisUrl) {
    logger.info('Redis URL not provided, rate limiting will be disabled');
    return null;
  }
  
  try {
    redis = new Redis(redisUrl, {
      keyPrefix: rateLimitRedisPrefix,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
    
    redis.on('connect', () => {
      isConnected = true;
      logger.info('Redis connected for rate limiting');
    });
    
    redis.on('error', (err) => {
      isConnected = false;
      logger.error('Redis rate limit connection error', { error: err.message });
    });
    
    return redis;
  } catch (error) {
    logger.error('Failed to initialize Redis for rate limiting', { error: error.message });
    return null;
  }
}

/**
 * Get user identifier for rate limiting
 * Prefers user ID from auth, falls back to IP address
 */
function getUserIdentifier(req) {
  // Try to get user ID from auth middleware
  const userId = req.user?.id || req.user?._id;
  if (userId) {
    return `user:${userId}`;
  }
  
  // Fall back to IP address
  const ip = req.ip || 
    req.headers['x-forwarded-for']?.toString().split(',')[0].trim() ||
    req.connection?.remoteAddress ||
    'unknown';
  
  return `ip:${ip}`;
}

/**
 * Check if path is exempt from rate limiting
 */
function isExemptPath(path, exemptPaths) {
  if (!exemptPaths) return false;
  
  const paths = exemptPaths.split(',').map(p => p.trim());
  return paths.some(exemptPath => path.startsWith(exemptPath));
}

/**
 * Redis-backed global rate limiting middleware
 * Uses fixed-window rate limiting with INCR + EX for expiry
 */
export function createRateLimit() {
  // Initialize Redis connection
  const redisClient = initRateLimitRedis();
  
  return async (req, res, next) => {
    try {
      let rateLimitMax;
      let rateLimitWindow;
      let exemptPaths;
      
      // Get configuration
      if (isConfigReady()) {
        const config = getConfig();
        rateLimitMax = config.RATE_LIMIT_MAX;
        rateLimitWindow = config.RATE_LIMIT_WINDOW;
        exemptPaths = config.RATE_LIMIT_EXEMPT_PATHS;
      } else {
        rateLimitMax = parseInt(process.env.RATE_LIMIT_MAX || '120', 10);
        rateLimitWindow = parseInt(process.env.RATE_LIMIT_WINDOW || '60000', 10);
        exemptPaths = process.env.RATE_LIMIT_EXEMPT_PATHS || '/health,/readiness';
      }
      
      // Check if path is exempt
      if (isExemptPath(req.path, exemptPaths)) {
        return next();
      }
      
      // If Redis is not available, add disabled header and continue
      if (!redisClient || !isConnected) {
        res.setHeader('X-RateLimit-Disabled', 'true');
        return next();
      }
      
      const userIdentifier = getUserIdentifier(req);
      const windowStart = Math.floor(Date.now() / rateLimitWindow) * rateLimitWindow;
      const key = `${userIdentifier}:${windowStart}`;
      
      // Use Redis INCR for atomic increment with expiry
      const count = await redisClient.incr(key);
      
      // Set expiry on first increment
      if (count === 1) {
        await redisClient.pexpire(key, rateLimitWindow);
      }
      
      const remaining = Math.max(0, rateLimitMax - count);
      const resetTime = windowStart + rateLimitWindow;
      
      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', rateLimitMax);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', Math.floor(resetTime / 1000));
      
      // Check if limit exceeded
      if (count > rateLimitMax) {
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
      // TODO: Add rate_limited_total metric when metrics system is available
      logger.error('Rate limiting error', { error: error.message, path: req.path });
      
      // On error, add disabled header and continue (fail-safe)
      res.setHeader('X-RateLimit-Disabled', 'true');
      next();
    }
  };
}

export default createRateLimit;