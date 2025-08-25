// backend/utils/cache.js
// Redis-based caching layer with namespaced keys and metrics
import Redis from 'ioredis';
import { getConfig } from '../config/index.js';
import { logger } from './logger.js';

let redis = null;
let isConnected = false;

// Cache metrics
const metrics = {
  hits: 0,
  misses: 0,
  sets: 0,
  deletes: 0,
  errors: 0
};

// Initialize Redis connection for caching
function initCacheRedis() {
  if (redis) return redis;
  
  const config = getConfig();
  
  if (!config.REDIS_URL) {
    logger.warn('Redis URL not provided, caching will be disabled');
    return null;
  }
  
  try {
    redis = new Redis(config.REDIS_URL, {
      keyPrefix: 'cache:v1:',
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
    
    redis.on('connect', () => {
      isConnected = true;
      logger.info('Redis connected for caching');
    });
    
    redis.on('error', (err) => {
      isConnected = false;
      logger.error('Redis cache connection error', { error: err.message });
    });
    
    return redis;
  } catch (error) {
    logger.error('Failed to initialize Redis cache', { error: error.message });
    return null;
  }
}

// Default TTL values (in seconds)
const DEFAULT_TTL = {
  short: 300,      // 5 minutes
  medium: 1800,    // 30 minutes
  long: 3600,      // 1 hour
  veryLong: 86400, // 24 hours
};

// Cache key builder with namespacing
function buildKey(namespace, key) {
  return `${namespace}:${key}`;
}

// Get value from cache
export async function get(namespace, key) {
  if (!redis || !isConnected) {
    metrics.misses++;
    return null;
  }
  
  try {
    const cacheKey = buildKey(namespace, key);
    const value = await redis.get(cacheKey);
    
    if (value !== null) {
      metrics.hits++;
      logger.debug('Cache hit', { namespace, key, cacheKey });
      return JSON.parse(value);
    } else {
      metrics.misses++;
      logger.debug('Cache miss', { namespace, key, cacheKey });
      return null;
    }
  } catch (error) {
    metrics.errors++;
    logger.error('Cache get error', { error: error.message, namespace, key });
    return null;
  }
}

// Set value in cache
export async function set(namespace, key, value, ttl = DEFAULT_TTL.medium) {
  if (!redis || !isConnected) {
    return false;
  }
  
  try {
    const cacheKey = buildKey(namespace, key);
    const serialized = JSON.stringify(value);
    
    await redis.setex(cacheKey, ttl, serialized);
    metrics.sets++;
    
    logger.debug('Cache set', { namespace, key, cacheKey, ttl });
    return true;
  } catch (error) {
    metrics.errors++;
    logger.error('Cache set error', { error: error.message, namespace, key });
    return false;
  }
}

// Delete value from cache
export async function del(namespace, key) {
  if (!redis || !isConnected) {
    return false;
  }
  
  try {
    const cacheKey = buildKey(namespace, key);
    const result = await redis.del(cacheKey);
    
    if (result > 0) {
      metrics.deletes++;
      logger.debug('Cache delete', { namespace, key, cacheKey });
    }
    
    return result > 0;
  } catch (error) {
    metrics.errors++;
    logger.error('Cache delete error', { error: error.message, namespace, key });
    return false;
  }
}

// Clear all keys in a namespace
export async function clearNamespace(namespace) {
  if (!redis || !isConnected) {
    return 0;
  }
  
  try {
    const pattern = buildKey(namespace, '*');
    const keys = await redis.keys(pattern);
    
    if (keys.length > 0) {
      const deleted = await redis.del(...keys);
      logger.info('Cache namespace cleared', { namespace, keysDeleted: deleted });
      return deleted;
    }
    
    return 0;
  } catch (error) {
    metrics.errors++;
    logger.error('Cache clear namespace error', { error: error.message, namespace });
    return 0;
  }
}

// Higher-level cache wrapper with automatic serialization
export async function withCache(namespace, key, fetchFn, ttl = DEFAULT_TTL.medium) {
  // Try to get from cache first
  const cached = await get(namespace, key);
  if (cached !== null) {
    return cached;
  }
  
  // Cache miss - fetch the data
  try {
    const data = await fetchFn();
    
    // Only cache non-null/undefined values
    if (data !== null && data !== undefined) {
      await set(namespace, key, data, ttl);
    }
    
    return data;
  } catch (error) {
    logger.error('Cache fetch function error', { error: error.message, namespace, key });
    throw error;
  }
}

// Batch operations
export async function mget(namespace, keys) {
  if (!redis || !isConnected || keys.length === 0) {
    return keys.map(() => null);
  }
  
  try {
    const cacheKeys = keys.map(key => buildKey(namespace, key));
    const values = await redis.mget(...cacheKeys);
    
    return values.map((value, index) => {
      if (value !== null) {
        metrics.hits++;
        return JSON.parse(value);
      } else {
        metrics.misses++;
        return null;
      }
    });
  } catch (error) {
    metrics.errors++;
    logger.error('Cache mget error', { error: error.message, namespace, keys });
    return keys.map(() => null);
  }
}

export async function mset(namespace, entries, ttl = DEFAULT_TTL.medium) {
  if (!redis || !isConnected || entries.length === 0) {
    return false;
  }
  
  try {
    const pipeline = redis.pipeline();
    
    for (const [key, value] of entries) {
      const cacheKey = buildKey(namespace, key);
      const serialized = JSON.stringify(value);
      pipeline.setex(cacheKey, ttl, serialized);
    }
    
    await pipeline.exec();
    metrics.sets += entries.length;
    
    logger.debug('Cache mset', { namespace, count: entries.length, ttl });
    return true;
  } catch (error) {
    metrics.errors++;
    logger.error('Cache mset error', { error: error.message, namespace, entries: entries.length });
    return false;
  }
}

// Cache metrics for monitoring
export function getMetrics() {
  const total = metrics.hits + metrics.misses;
  const hitRate = total > 0 ? (metrics.hits / total) * 100 : 0;
  
  return {
    ...metrics,
    hitRate: Math.round(hitRate * 100) / 100,
    total,
    isConnected
  };
}

// Reset metrics (useful for tests)
export function resetMetrics() {
  metrics.hits = 0;
  metrics.misses = 0;
  metrics.sets = 0;
  metrics.deletes = 0;
  metrics.errors = 0;
}

// Cache middleware for Express routes
export function cacheMiddleware(namespace, keyFn, ttl = DEFAULT_TTL.medium) {
  return async (req, res, next) => {
    try {
      const cacheKey = typeof keyFn === 'function' ? keyFn(req) : keyFn;
      const cached = await get(namespace, cacheKey);
      
      if (cached !== null) {
        // Add cache headers
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-Key', cacheKey);
        
        req.log?.info('Cache hit for request', { namespace, cacheKey });
        return res.json(cached);
      }
      
      // Cache miss - continue to route handler
      res.setHeader('X-Cache', 'MISS');
      res.setHeader('X-Cache-Key', cacheKey);
      
      // Store original json method
      const originalJson = res.json;
      
      // Override json method to cache the response
      res.json = function(data) {
        // Cache the response data
        set(namespace, cacheKey, data, ttl).catch(err => {
          req.log?.error('Failed to cache response', { error: err.message });
        });
        
        // Call original json method
        return originalJson.call(this, data);
      };
      
      next();
    } catch (error) {
      req.log?.error('Cache middleware error', { error: error.message });
      next(); // Continue without caching on error
    }
  };
}

// Initialize Redis on module load
initCacheRedis();

export { DEFAULT_TTL };
export default {
  get,
  set,
  del,
  clearNamespace,
  withCache,
  mget,
  mset,
  getMetrics,
  resetMetrics,
  cacheMiddleware,
  DEFAULT_TTL
};