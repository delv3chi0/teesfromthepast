// backend/config/redis.js
import { Redis } from 'ioredis';

const {
  REDIS_URL,
  NODE_ENV = 'development'
} = process.env;

let redisClient = null;

// Create Redis client with graceful error handling
export function createRedisClient() {
  if (redisClient) {
    return redisClient;
  }

  if (!REDIS_URL) {
    console.log('[Redis] REDIS_URL not provided, Redis features will be disabled');
    return null;
  }

  try {
    redisClient = new Redis(REDIS_URL, {
      lazyConnect: true,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      showFriendlyErrorStack: NODE_ENV === 'development',
    });

    redisClient.on('connect', () => {
      console.log('[Redis] Connected to Redis server');
    });

    redisClient.on('error', (err) => {
      console.error('[Redis] Connection error:', err.message);
    });

    redisClient.on('close', () => {
      console.log('[Redis] Connection closed');
    });

    redisClient.on('reconnecting', () => {
      console.log('[Redis] Reconnecting to Redis...');
    });

    return redisClient;
  } catch (error) {
    console.error('[Redis] Failed to create Redis client:', error.message);
    return null;
  }
}

// Get the Redis client instance
export function getRedisClient() {
  return redisClient || createRedisClient();
}

// Check if Redis is available and connected
export async function isRedisAvailable() {
  const client = getRedisClient();
  if (!client) return false;
  
  try {
    await client.ping();
    return true;
  } catch (error) {
    console.error('[Redis] Health check failed:', error.message);
    return false;
  }
}

// Graceful shutdown
export async function shutdownRedis() {
  if (redisClient) {
    console.log('[Redis] Shutting down Redis connection...');
    try {
      await redisClient.quit();
      redisClient = null;
    } catch (error) {
      console.error('[Redis] Error during shutdown:', error.message);
    }
  }
}

export default getRedisClient;