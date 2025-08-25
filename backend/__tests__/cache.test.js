// backend/__tests__/cache.test.js
// Mock the config module
jest.mock('../config/index.js', () => ({
  getConfig: () => ({
    NODE_ENV: 'test',
    REDIS_URL: null // Use memory fallback for tests
  })
}));

// Mock the logger
jest.mock('../utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

describe('Cache System', () => {
  let cache;
  
  beforeEach(async () => {
    jest.resetModules();
    cache = await import('../utils/cache.js');
    cache.resetMetrics();
  });

  it('should handle cache miss when Redis not available', async () => {
    const result = await cache.get('test', 'key1');
    expect(result).toBeNull();
    
    const metrics = cache.getMetrics();
    expect(metrics.misses).toBe(1);
    expect(metrics.hits).toBe(0);
  });

  it('should return false when setting without Redis', async () => {
    const result = await cache.set('test', 'key1', { data: 'value1' });
    expect(result).toBe(false);
  });

  it('should work with withCache function', async () => {
    const fetchFn = jest.fn().mockResolvedValue({ data: 'fetched' });
    
    // First call should execute fetchFn
    const result1 = await cache.withCache('test', 'key1', fetchFn);
    expect(result1).toEqual({ data: 'fetched' });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    
    // Second call should also execute fetchFn since Redis is not available
    const result2 = await cache.withCache('test', 'key1', fetchFn);
    expect(result2).toEqual({ data: 'fetched' });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('should handle batch operations gracefully', async () => {
    const keys = ['key1', 'key2', 'key3'];
    const results = await cache.mget('test', keys);
    
    expect(results).toHaveLength(3);
    expect(results.every(r => r === null)).toBe(true);
  });

  it('should track metrics correctly', async () => {
    await cache.get('test', 'key1'); // miss
    await cache.get('test', 'key2'); // miss
    await cache.set('test', 'key3', 'value'); // set (will fail)
    
    const metrics = cache.getMetrics();
    expect(metrics.misses).toBe(2);
    expect(metrics.hits).toBe(0);
    expect(metrics.hitRate).toBe(0);
    expect(metrics.total).toBe(2);
  });
});

describe('Cache Middleware', () => {
  it('should create cache middleware function', async () => {
    const cache = await import('../utils/cache.js');
    
    const middleware = cache.cacheMiddleware('test', 'static-key');
    expect(typeof middleware).toBe('function');
  });

  it('should handle cache miss in middleware', async () => {
    const cache = await import('../utils/cache.js');
    
    const middleware = cache.cacheMiddleware('test', () => 'dynamic-key');
    
    const req = {
      log: {
        info: jest.fn(),
        error: jest.fn()
      }
    };
    
    const res = {
      setHeader: jest.fn(),
      json: jest.fn()
    };
    
    const next = jest.fn();
    
    await middleware(req, res, next);
    
    expect(res.setHeader).toHaveBeenCalledWith('X-Cache', 'MISS');
    expect(next).toHaveBeenCalled();
  });
});