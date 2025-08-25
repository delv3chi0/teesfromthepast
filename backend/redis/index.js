// backend/redis/index.js
// Redis client wrapper for refresh token management and blacklisting
import Redis from 'ioredis';
import { isConfigReady, getConfig } from '../config/index.js';
import { logger } from '../utils/logger.js';

let redis = null;
let isConnected = false;

// Initialize Redis connection for session management
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
    logger.warn('Redis URL not provided, session token blacklisting will be disabled');
    return null;
  }
  
  try {
    redis = new Redis(redisUrl, {
      keyPrefix: 'session:v1:',
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
    
    redis.on('connect', () => {
      isConnected = true;
      logger.info('Redis connected for session management');
    });
    
    redis.on('error', (err) => {
      isConnected = false;
      logger.error('Redis session connection error', { error: err.message });
    });
    
    return redis;
  } catch (error) {
    logger.error('Failed to initialize Redis for sessions', { error: error.message });
    return null;
  }
}

// Blacklist a refresh token JTI
export async function blacklistRefreshToken(jti, ttlSeconds = 86400) {
  if (!redis || !isConnected) {
    logger.warn('Redis unavailable, cannot blacklist token', { jti });
    return false;
  }
  
  try {
    const key = `blacklist:${jti}`;
    await redis.setex(key, ttlSeconds, '1');
    logger.debug('Refresh token blacklisted', { jti, ttl: ttlSeconds });
    return true;
  } catch (error) {
    logger.error('Failed to blacklist refresh token', { error: error.message, jti });
    return false;
  }
}

// Check if a refresh token JTI is blacklisted
export async function isRefreshTokenBlacklisted(jti) {
  if (!redis || !isConnected) {
    // If Redis is unavailable, assume token is not blacklisted (graceful degradation)
    return false;
  }
  
  try {
    const key = `blacklist:${jti}`;
    const result = await redis.get(key);
    return result === '1';
  } catch (error) {
    logger.error('Failed to check token blacklist', { error: error.message, jti });
    // On error, assume not blacklisted for graceful degradation
    return false;
  }
}

// Store refresh token metadata (for tracking active sessions)
export async function storeRefreshTokenMetadata(jti, userId, metadata = {}, ttlSeconds = 2592000) { // 30 days default
  if (!redis || !isConnected) {
    logger.warn('Redis unavailable, cannot store token metadata', { jti, userId });
    return false;
  }
  
  try {
    const key = `token:${jti}`;
    const data = {
      userId,
      createdAt: new Date().toISOString(),
      ...metadata
    };
    await redis.setex(key, ttlSeconds, JSON.stringify(data));
    logger.debug('Refresh token metadata stored', { jti, userId });
    return true;
  } catch (error) {
    logger.error('Failed to store refresh token metadata', { error: error.message, jti, userId });
    return false;
  }
}

// Remove refresh token metadata
export async function removeRefreshTokenMetadata(jti) {
  if (!redis || !isConnected) {
    return false;
  }
  
  try {
    const key = `token:${jti}`;
    await redis.del(key);
    logger.debug('Refresh token metadata removed', { jti });
    return true;
  } catch (error) {
    logger.error('Failed to remove refresh token metadata', { error: error.message, jti });
    return false;
  }
}

// Get active session count for a user
export async function getUserActiveSessionCount(userId) {
  if (!redis || !isConnected) {
    logger.warn('Redis unavailable, cannot get session count for user', { userId });
    return 0;
  }
  
  try {
    const pattern = 'token:*';
    const keys = await redis.keys(pattern);
    let count = 0;
    
    for (const key of keys) {
      const data = await redis.get(key);
      if (data) {
        const metadata = JSON.parse(data);
        if (metadata.userId === userId) {
          count++;
        }
      }
    }
    
    return count;
  } catch (error) {
    logger.error('Failed to get user session count', { error: error.message, userId });
    return 0;
  }
}

// Initialize Redis connection
const sessionRedis = initRedis();

export { sessionRedis };
export default {
  blacklistRefreshToken,
  isRefreshTokenBlacklisted,
  storeRefreshTokenMetadata,
  removeRefreshTokenMetadata,
  getUserActiveSessionCount,
  redis: sessionRedis
};

// TODO: Task 6 - Advanced session management features to implement later:
// TODO: - Session device fingerprinting and anomaly detection
// TODO: - Geographic session tracking and alerts
// TODO: - Session concurrency limits per user
// TODO: - Automatic session cleanup for inactive users
// TODO: - Session analytics and reporting