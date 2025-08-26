// backend/middleware/rateLimit.js
// Redis-backed global rate limiting middleware with multiple algorithms
import Redis from 'ioredis';
import { isConfigReady, getConfig } from '../config/index.js';
import { getRateLimitConfig } from '../config/dynamicConfig.js';
import { logger } from '../utils/logger.js';
import { incrementRateLimited, incrementRedisErrors } from './metrics.js';

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
 * Parse rate limit overrides from environment variables
 */
function parseRateLimitOverrides(overrideString) {
  if (!overrideString) return [];
  
  return overrideString.split(';').map(entry => {
    const trimmed = entry.trim();
    if (!trimmed) return null;
    
    const parts = trimmed.split(':');
    if (parts.length < 2) return null;
    
    const pathPrefix = parts[0].trim();
    const max = parseInt(parts[1], 10);
    const algorithm = parts[2]?.trim() || 'fixed';
    
    if (isNaN(max) || max <= 0) return null;
    
    return { pathPrefix, max, algorithm };
  }).filter(Boolean);
}

/**
 * Parse role-based rate limit overrides
 */
function parseRoleRateLimitOverrides(overrideString) {
  if (!overrideString) return [];
  
  return overrideString.split(';').map(entry => {
    const trimmed = entry.trim();
    if (!trimmed) return null;
    
    const [roleAndPath, maxStr, algorithm = 'fixed'] = trimmed.split(':');
    if (!roleAndPath || !maxStr) return null;
    
    const [role, pathPrefix] = roleAndPath.split('|');
    if (!role || !pathPrefix) return null;
    
    const max = parseInt(maxStr, 10);
    if (isNaN(max) || max <= 0) return null;
    
    return { role: role.trim(), pathPrefix: pathPrefix.trim(), max, algorithm: algorithm.trim() };
  }).filter(Boolean);
}

/**
 * Find the best matching override for a request
 * Priority: role override > path override > global
 */
function findRateLimitOverride(req, pathOverrides, roleOverrides) {
  const userRole = req.user?.role;
  const path = req.path;
  
  // Check role-based overrides first (highest priority)
  if (userRole && roleOverrides.length > 0) {
    for (const override of roleOverrides) {
      if (override.role === userRole && path.startsWith(override.pathPrefix)) {
        return { max: override.max, algorithm: override.algorithm, source: 'role' };
      }
    }
  }
  
  // Check path-based overrides
  if (pathOverrides.length > 0) {
    for (const override of pathOverrides) {
      if (path.startsWith(override.pathPrefix)) {
        return { max: override.max, algorithm: override.algorithm, source: 'path' };
      }
    }
  }
  
  // Return null for global defaults
  return null;
}

/**
 * Sliding window rate limiting using two adjacent windows
 */
async function slidingWindowRateLimit(redisClient, key, max, windowMs) {
  const now = Date.now();
  const currentWindow = Math.floor(now / windowMs);
  const previousWindow = currentWindow - 1;
  
  const currentKey = `${key}:${currentWindow}`;
  const previousKey = `${key}:${previousWindow}`;
  
  // Get counts from both windows
  const pipeline = redisClient.pipeline();
  pipeline.incr(currentKey);
  pipeline.ttl(currentKey);
  pipeline.get(previousKey);
  
  const results = await pipeline.exec();
  const currentCount = results[0][1];
  const currentTtl = results[1][1];
  const previousCount = parseInt(results[2][1] || '0', 10);
  
  // Set expiry on first increment
  if (currentCount === 1) {
    await redisClient.pexpire(currentKey, windowMs);
  }
  
  // Calculate sliding window count
  const timeIntoWindow = now % windowMs;
  const weightedPreviousCount = previousCount * (1 - timeIntoWindow / windowMs);
  const totalCount = currentCount + weightedPreviousCount;
  
  const remaining = Math.max(0, max - Math.ceil(totalCount));
  const resetTime = (currentWindow + 1) * windowMs;
  
  return {
    count: Math.ceil(totalCount),
    remaining,
    resetTime,
    isLimited: totalCount > max
  };
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
 * Fixed window rate limiting (original implementation)
 */
async function fixedWindowRateLimit(redisClient, key, max, windowMs) {
  const windowStart = Math.floor(Date.now() / windowMs) * windowMs;
  const windowKey = `${key}:${windowStart}`;
  
  // Use Redis INCR for atomic increment with expiry
  const count = await redisClient.incr(windowKey);
  
  // Set expiry on first increment
  if (count === 1) {
    await redisClient.pexpire(windowKey, windowMs);
  }
  
  const remaining = Math.max(0, max - count);
  const resetTime = windowStart + windowMs;
  
  return {
    count,
    remaining,
    resetTime,
    isLimited: count > max
  };
}

/**
 * Redis-backed global rate limiting middleware with multiple algorithms
 * Supports fixed window (default), sliding window, and token bucket algorithms
 * Includes per-route and per-role override capabilities
 */
export function createRateLimit() {
  // Initialize Redis connection
  const redisClient = initRateLimitRedis();
  
  return async (req, res, next) => {
    try {
      let rateLimitMax;
      let rateLimitWindow;
      let exemptPaths;
      let algorithm;
      let pathOverrides;
      let roleOverrides;
      
      // Get configuration with dynamic overrides applied
      const dynamicConfig = getRateLimitConfig();
      rateLimitMax = dynamicConfig.globalMax;
      rateLimitWindow = dynamicConfig.windowMs;
      algorithm = dynamicConfig.algorithm;
      pathOverrides = parseRateLimitOverrides(dynamicConfig.overrides);
      roleOverrides = parseRoleRateLimitOverrides(dynamicConfig.roleOverrides);
      
      // Get exempt paths from static config (not overrideable for security)
      if (isConfigReady()) {
        const config = getConfig();
        exemptPaths = config.RATE_LIMIT_EXEMPT_PATHS;
      } else {
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
      
      // Find applicable override
      const override = findRateLimitOverride(req, pathOverrides, roleOverrides);
      const effectiveMax = override?.max || rateLimitMax;
      const effectiveAlgorithm = override?.algorithm || algorithm;
      
      const userIdentifier = getUserIdentifier(req);
      const key = `${userIdentifier}:${req.path}`;
      
      // Apply rate limiting based on algorithm
      let result;
      try {
        switch (effectiveAlgorithm) {
          case 'sliding':
            result = await slidingWindowRateLimit(redisClient, key, effectiveMax, rateLimitWindow);
            break;
          case 'token_bucket':
            result = await tokenBucketRateLimit(redisClient, key, effectiveMax, rateLimitWindow);
            break;
          case 'fixed':
          default:
            result = await fixedWindowRateLimit(redisClient, key, effectiveMax, rateLimitWindow);
            break;
        }
      } catch (redisError) {
        incrementRedisErrors('rate_limit');
        throw redisError;
      }
      
      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', effectiveMax);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', Math.floor(result.resetTime / 1000));
      res.setHeader('X-RateLimit-Algorithm', effectiveAlgorithm);
      
      // Check if limit exceeded
      if (result.isLimited) {
        const retryAfterSeconds = Math.ceil((result.resetTime - Date.now()) / 1000);
        res.setHeader('Retry-After', retryAfterSeconds);
        
        // Increment rate limited metric
        incrementRateLimited(effectiveAlgorithm, req.path);
        
        return res.status(429).json({
          error: {
            code: 'RATE_LIMITED',
            message: 'Rate limit exceeded',
            retryAfterSeconds,
            algorithm: effectiveAlgorithm
          }
        });
      }
      
      next();
    } catch (error) {
      logger.error('Rate limiting error', { error: error.message, path: req.path });
      
      // On error, add disabled header and continue (fail-safe)
      res.setHeader('X-RateLimit-Disabled', 'true');
      next();
    }
  };
}

export default createRateLimit;