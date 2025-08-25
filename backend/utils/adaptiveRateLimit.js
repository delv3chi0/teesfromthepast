// backend/utils/adaptiveRateLimit.js
// Adaptive rate limiting with abuse detection using Redis
import Redis from 'ioredis';
import { isConfigReady, getConfig } from '../config/index.js';
import { logger } from './logger.js';

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
      logger.error('Redis connection error', { error: err.message });
    });
    
    return redis;
  } catch (error) {
    logger.error('Failed to initialize Redis', { error: error.message });
    return null;
  }
}

// Token bucket implementation for rate limiting
export class TokenBucket {
  constructor(capacity, refillRate, refillInterval = 1000) {
    this.capacity = capacity;
    this.tokens = capacity;
    this.refillRate = refillRate;
    this.refillInterval = refillInterval;
    this.lastRefill = Date.now();
  }
  
  consume(tokens = 1) {
    this.refill();
    
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }
    
    return false;
  }
  
  refill() {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    const tokensToAdd = Math.floor((timePassed / this.refillInterval) * this.refillRate);
    
    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }
  
  getTokens() {
    this.refill();
    return this.tokens;
  }
}

// In-memory fallback for rate limiting
const memoryBuckets = new Map();

// Abuse score tracking
const abuseScores = new Map();

// Rate limit configuration by route group
const RATE_LIMITS = {
  default: { capacity: 100, refillRate: 10, window: 60000 }, // 100 requests per minute
  auth: { capacity: 10, refillRate: 1, window: 60000 },      // 10 requests per minute for auth
  api: { capacity: 60, refillRate: 6, window: 60000 },       // 60 requests per minute for API
  upload: { capacity: 20, refillRate: 2, window: 60000 },    // 20 requests per minute for uploads
};

// Abuse detection thresholds
const ABUSE_THRESHOLDS = {
  login_failures: 5,        // 5 failed logins in window
  error_4xx_burst: 20,      // 20 4xx errors in window
  generic_abuse: 100,       // Generic abuse score threshold
};

// Get rate limit key
function getRateLimitKey(ip, userId, routeGroup) {
  if (userId) {
    return `rate_limit:user:${userId}:${routeGroup}`;
  }
  return `rate_limit:ip:${ip}:${routeGroup}`;
}

// Get abuse score key
function getAbuseScoreKey(ip, userId) {
  if (userId) {
    return `abuse_score:user:${userId}`;
  }
  return `abuse_score:ip:${ip}`;
}

// Track abuse event
export async function trackAbuseEvent(ip, userId, eventType, weight = 1) {
  const key = getAbuseScoreKey(ip, userId);
  
  if (redis && isRedisConnected) {
    try {
      const pipeline = redis.pipeline();
      pipeline.hincrby(key, eventType, weight);
      pipeline.hincrby(key, 'total_score', weight);
      pipeline.expire(key, 300); // 5 minute TTL
      await pipeline.exec();
      
      // Get current total score
      const totalScore = await redis.hget(key, 'total_score');
      return parseInt(totalScore) || 0;
    } catch (error) {
      logger.error('Failed to track abuse event in Redis', { error: error.message });
    }
  }
  
  // Fallback to memory
  const now = Date.now();
  if (!abuseScores.has(key)) {
    abuseScores.set(key, { events: {}, totalScore: 0, expiry: now + 300000 });
  }
  
  const scoreData = abuseScores.get(key);
  if (now > scoreData.expiry) {
    scoreData.events = {};
    scoreData.totalScore = 0;
    scoreData.expiry = now + 300000;
  }
  
  scoreData.events[eventType] = (scoreData.events[eventType] || 0) + weight;
  scoreData.totalScore += weight;
  
  return scoreData.totalScore;
}

// Get abuse score
export async function getAbuseScore(ip, userId) {
  const key = getAbuseScoreKey(ip, userId);
  
  if (redis && isRedisConnected) {
    try {
      const score = await redis.hget(key, 'total_score');
      return parseInt(score) || 0;
    } catch (error) {
      logger.error('Failed to get abuse score from Redis', { error: error.message });
    }
  }
  
  // Fallback to memory
  const scoreData = abuseScores.get(key);
  if (!scoreData || Date.now() > scoreData.expiry) {
    return 0;
  }
  
  return scoreData.totalScore;
}

// Adaptive rate limiting middleware
export function createAdaptiveRateLimit(routeGroup = 'default') {
  const config = RATE_LIMITS[routeGroup] || RATE_LIMITS.default;
  
  return async (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || 'unknown';
    const userId = req.user?._id?.toString() || null;
    const key = getRateLimitKey(ip, userId, routeGroup);
    
    let bucket;
    let remaining;
    let resetTime;
    
    if (redis && isRedisConnected) {
      try {
        // Redis-based token bucket
        const bucketKey = `bucket:${key}`;
        const bucketData = await redis.hmget(bucketKey, 'tokens', 'lastRefill');
        
        const now = Date.now();
        let tokens = bucketData[0] ? parseInt(bucketData[0]) : config.capacity;
        let lastRefill = bucketData[1] ? parseInt(bucketData[1]) : now;
        
        // Refill tokens
        const timePassed = now - lastRefill;
        const tokensToAdd = Math.floor((timePassed / 1000) * (config.refillRate / 60)); // per minute to per second
        tokens = Math.min(config.capacity, tokens + tokensToAdd);
        
        if (tokens > 0) {
          tokens -= 1;
          await redis.hmset(bucketKey, 'tokens', tokens, 'lastRefill', now);
          await redis.expire(bucketKey, Math.ceil(config.window / 1000));
          remaining = tokens;
          resetTime = now + ((config.capacity - tokens) / config.refillRate) * 1000;
        } else {
          remaining = 0;
          resetTime = now + (1 / config.refillRate) * 1000;
        }
      } catch (error) {
        logger.error('Redis rate limit error, falling back to memory', { error: error.message });
        bucket = null;
      }
    }
    
    if (!bucket && !redis) {
      // Memory fallback
      if (!memoryBuckets.has(key)) {
        memoryBuckets.set(key, new TokenBucket(config.capacity, config.refillRate));
      }
      
      bucket = memoryBuckets.get(key);
      const allowed = bucket.consume(1);
      remaining = bucket.getTokens();
      resetTime = Date.now() + config.window;
      
      if (!allowed) {
        remaining = 0;
      }
    }
    
    // Get current abuse score
    const abuseScore = await getAbuseScore(ip, userId);
    
    // Apply adaptive limits based on abuse score
    let isBlocked = false;
    let adaptiveLimit = config.capacity;
    
    if (abuseScore > ABUSE_THRESHOLDS.generic_abuse) {
      adaptiveLimit = Math.floor(config.capacity * 0.1); // Reduce to 10% of normal limit
      isBlocked = remaining <= 0 || abuseScore > ABUSE_THRESHOLDS.generic_abuse * 2;
    } else if (abuseScore > ABUSE_THRESHOLDS.generic_abuse * 0.5) {
      adaptiveLimit = Math.floor(config.capacity * 0.5); // Reduce to 50% of normal limit
    }
    
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', adaptiveLimit);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, remaining));
    res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime / 1000));
    
    // Add abuse score header if elevated
    if (abuseScore > 0) {
      res.setHeader('X-Abuse-Score', abuseScore);
    }
    
    if (isBlocked || remaining <= 0) {
      const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
      res.setHeader('Retry-After', retryAfter);
      
      // Track rate limit violation as abuse
      await trackAbuseEvent(ip, userId, 'rate_limit_violation', 5);
      
      req.log?.warn('Rate limit exceeded', {
        ip,
        userId,
        routeGroup,
        abuseScore,
        adaptiveLimit,
        remaining
      });
      
      return res.status(429).json({
        ok: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Please slow down.'
        },
        retryAfter,
        abuseScore: abuseScore > 0 ? abuseScore : undefined
      });
    }
    
    // Log rate limit info if abuse score is elevated
    if (abuseScore > ABUSE_THRESHOLDS.generic_abuse * 0.3) {
      req.log?.info('Request with elevated abuse score', {
        abuseScore,
        adaptiveLimit,
        remaining,
        routeGroup
      });
    }
    
    next();
  };
}

// Track failed actions for abuse detection
export async function trackFailedAction(req, actionType, details = {}) {
  const ip = req.ip || req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || 'unknown';
  const userId = req.user?._id?.toString() || null;
  
  let weight = 1;
  
  // Different weights for different failure types
  switch (actionType) {
    case 'login_failure':
      weight = 10;
      break;
    case 'auth_failure':
      weight = 5;
      break;
    case 'validation_error':
      weight = 2;
      break;
    case '4xx_error':
      weight = 1;
      break;
    default:
      weight = 1;
  }
  
  const abuseScore = await trackAbuseEvent(ip, userId, actionType, weight);
  
  req.log?.info('Failed action tracked', {
    actionType,
    weight,
    abuseScore,
    details
  });
  
  return abuseScore;
}

// Initialize Redis on module load
initRedis();

export default {
  createAdaptiveRateLimit,
  trackAbuseEvent,
  getAbuseScore,
  trackFailedAction,
  ABUSE_THRESHOLDS
};