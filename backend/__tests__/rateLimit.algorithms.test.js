// backend/__tests__/rateLimit.algorithms.test.js
// Tests for advanced rate limiting algorithms

import { jest } from '@jest/globals';

// Mock the metrics middleware to avoid circular imports
jest.mock('../middleware/metrics.js', () => ({
  incrementRateLimited: jest.fn(),
  incrementRedisErrors: jest.fn()
}));

import { createRateLimit } from '../middleware/rateLimit.js';

// Mock Redis with more complete implementation
const mockRedis = {
  incr: jest.fn(),
  pexpire: jest.fn(),
  pipeline: jest.fn(() => ({
    incr: jest.fn(),
    ttl: jest.fn(),
    get: jest.fn(),
    hmset: jest.fn(),
    expire: jest.fn(),
    exec: jest.fn()
  })),
  hmget: jest.fn(),
  on: jest.fn()
};

// Mock ioredis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => mockRedis);
});

// Mock config
jest.mock('../config/index.js', () => ({
  isConfigReady: jest.fn(() => false),
  getConfig: jest.fn()
}));

describe('Advanced Rate Limiting Algorithms', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables
    delete process.env.REDIS_URL;
    delete process.env.RATE_LIMIT_ALGORITHM;
    delete process.env.RATE_LIMIT_OVERRIDES;
    delete process.env.RATE_LIMIT_ROLE_OVERRIDES;
    
    // Set up Redis URL so middleware doesn't fall back to disabled mode
    process.env.REDIS_URL = 'redis://localhost:6379';
  });

  describe('Fixed Window Algorithm', () => {
    test('should use fixed window by default', async () => {
      const middleware = createRateLimit();
      
      mockRedis.incr.mockResolvedValue(1);
      
      const req = { path: '/api/test', ip: '127.0.0.1' };
      const res = { setHeader: jest.fn() };
      const next = jest.fn();
      
      await middleware(req, res, next);
      
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Algorithm', 'fixed');
      expect(next).toHaveBeenCalled();
    });

    test('should rate limit when fixed window exceeded', async () => {
      process.env.RATE_LIMIT_MAX = '5';
      const middleware = createRateLimit();
      
      mockRedis.incr.mockResolvedValue(6); // Exceeds limit of 5
      
      const req = { path: '/api/test', ip: '127.0.0.1' };
      const res = { 
        setHeader: jest.fn(),
        status: jest.fn(() => ({ json: jest.fn() }))
      };
      const next = jest.fn();
      
      await middleware(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(429);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Sliding Window Algorithm', () => {
    test('should use sliding window when configured', async () => {
      process.env.RATE_LIMIT_ALGORITHM = 'sliding';
      const middleware = createRateLimit();
      
      const mockPipeline = {
        incr: jest.fn(),
        ttl: jest.fn(),
        get: jest.fn(),
        exec: jest.fn().mockResolvedValue([
          [null, 1], // incr result
          [null, -1], // ttl result
          [null, '0'] // get previous window result
        ])
      };
      mockRedis.pipeline.mockReturnValue(mockPipeline);
      mockRedis.pexpire.mockResolvedValue(1);
      
      const req = { path: '/api/test', ip: '127.0.0.1' };
      const res = { setHeader: jest.fn() };
      const next = jest.fn();
      
      await middleware(req, res, next);
      
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Algorithm', 'sliding');
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Token Bucket Algorithm', () => {
    test('should use token bucket when configured', async () => {
      process.env.RATE_LIMIT_ALGORITHM = 'token_bucket';
      const middleware = createRateLimit();
      
      // Mock bucket state - initial full bucket
      mockRedis.hmget.mockResolvedValue([null, null]); // No existing bucket
      
      const mockPipeline = {
        hmset: jest.fn(),
        expire: jest.fn(),
        exec: jest.fn().mockResolvedValue([])
      };
      mockRedis.pipeline.mockReturnValue(mockPipeline);
      
      const req = { path: '/api/test', ip: '127.0.0.1' };
      const res = { setHeader: jest.fn() };
      const next = jest.fn();
      
      await middleware(req, res, next);
      
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Algorithm', 'token_bucket');
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Rate Limit Overrides', () => {
    test('should apply path-based overrides', async () => {
      process.env.RATE_LIMIT_OVERRIDES = '/api/upload:30:token_bucket';
      process.env.RATE_LIMIT_MAX = '100'; // Global default
      
      const middleware = createRateLimit();
      
      mockRedis.hmget.mockResolvedValue([null, null]);
      const mockPipeline = {
        hmset: jest.fn(),
        expire: jest.fn(),
        exec: jest.fn().mockResolvedValue([])
      };
      mockRedis.pipeline.mockReturnValue(mockPipeline);
      
      const req = { path: '/api/upload/image', ip: '127.0.0.1' };
      const res = { setHeader: jest.fn() };
      const next = jest.fn();
      
      await middleware(req, res, next);
      
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 30); // Override limit
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Algorithm', 'token_bucket'); // Override algorithm
    });

    test('should apply role-based overrides with priority', async () => {
      process.env.RATE_LIMIT_ROLE_OVERRIDES = 'admin|/api/admin:500:fixed';
      process.env.RATE_LIMIT_OVERRIDES = '/api/admin:100:sliding'; // Path override
      
      const middleware = createRateLimit();
      
      mockRedis.incr.mockResolvedValue(1);
      
      const req = { 
        path: '/api/admin/users', 
        ip: '127.0.0.1',
        user: { role: 'admin' } // User has admin role
      };
      const res = { setHeader: jest.fn() };
      const next = jest.fn();
      
      await middleware(req, res, next);
      
      // Role override should take priority over path override
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 500);
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Algorithm', 'fixed');
    });
  });

  describe('Error Handling', () => {
    test('should fall back gracefully on Redis errors', async () => {
      const middleware = createRateLimit();
      
      mockRedis.incr.mockRejectedValue(new Error('Redis connection error'));
      
      const req = { path: '/api/test', ip: '127.0.0.1' };
      const res = { setHeader: jest.fn() };
      const next = jest.fn();
      
      await middleware(req, res, next);
      
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Disabled', 'true');
      expect(next).toHaveBeenCalled();
    });
  });
});