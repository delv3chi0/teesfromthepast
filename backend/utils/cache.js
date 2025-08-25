// backend/utils/cache.js
// Simple in-memory LRU cache implementation
// TODO: Replace with Redis in production for better scalability and persistence

class LRUCache {
  constructor(maxSize = 100, ttlMs = 60000) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
    this.cache = new Map();
  }

  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }
    
    // Check if item has expired
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, item);
    
    return item.value;
  }

  set(key, value, customTtl = null) {
    const ttl = customTtl || this.ttlMs;
    const expiresAt = Date.now() + ttl;
    
    // Remove oldest item if cache is full
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    // Remove existing entry to update position
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    
    this.cache.set(key, { value, expiresAt });
  }

  delete(key) {
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }

  // Clean up expired items
  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

// Create shared cache instances
export const publicConfigCache = new LRUCache(50, 60000); // 50 items, 60s TTL

// Cleanup expired items every 5 minutes
setInterval(() => {
  publicConfigCache.cleanup();
}, 5 * 60 * 1000);

/**
 * Cache middleware for public config endpoints
 */
export function cachePublicConfig(req, res, next) {
  const cacheKey = `config:${req.path}:${JSON.stringify(req.query)}`;
  const cached = publicConfigCache.get(cacheKey);
  
  if (cached) {
    res.set('X-Cache', 'HIT');
    return res.json(cached);
  }
  
  // Intercept res.json to cache the response
  const originalJson = res.json;
  res.json = function(data) {
    // Only cache successful responses
    if (res.statusCode === 200) {
      publicConfigCache.set(cacheKey, data);
      res.set('X-Cache', 'MISS');
    }
    return originalJson.call(this, data);
  };
  
  next();
}

export default LRUCache;