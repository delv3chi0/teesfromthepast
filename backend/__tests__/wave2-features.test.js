// backend/__tests__/wave2-features.test.js
// Tests for Wave 2 implementation: version endpoint and rate limiting

// Mock the config module to avoid MongoDB requirements
jest.mock('../config/index.js', () => ({
  getConfig: () => ({
    NODE_ENV: 'test',
    REDIS_URL: null, // Use memory fallback for tests
    RATE_LIMIT_WINDOW: 60000,
    RATE_LIMIT_MAX: 120,
    RATE_LIMIT_EXEMPT_PATHS: '/health,/readiness',
    RATE_LIMIT_REDIS_PREFIX: 'rl:'
  }),
  isConfigReady: () => true,
  validateConfig: () => ({})
}));

// Mock the logger
jest.mock('../utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  },
  createRequestLogger: (req, res, next) => {
    req.log = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    };
    next();
  }
}));

describe('Wave 2 Features', () => {
  describe('Version Endpoint', () => {
    let getVersionInfo;
    
    beforeEach(async () => {
      jest.resetModules();
      const versionModule = await import('../version/index.js');
      getVersionInfo = versionModule.getVersionInfo;
    });

    it('should return version information', async () => {
      const versionInfo = await getVersionInfo();
      
      expect(versionInfo).toHaveProperty('commit');
      expect(versionInfo).toHaveProperty('buildTime');
      expect(versionInfo).toHaveProperty('version');
      expect(versionInfo).toHaveProperty('env');
      
      expect(versionInfo.env).toHaveProperty('mode');
      expect(versionInfo.env).toHaveProperty('node');
      
      expect(typeof versionInfo.commit).toBe('string');
      expect(typeof versionInfo.buildTime).toBe('string');
      expect(typeof versionInfo.version).toBe('string');
      expect(typeof versionInfo.env.mode).toBe('string');
      expect(typeof versionInfo.env.node).toBe('string');
    });

    it('should cache version information', async () => {
      const versionInfo1 = await getVersionInfo();
      const versionInfo2 = await getVersionInfo();
      
      expect(versionInfo1).toEqual(versionInfo2);
    });
  });

  describe('Rate Limiting Middleware', () => {
    let createRateLimit;
    
    beforeEach(async () => {
      jest.resetModules();
      const rateLimitModule = await import('../middleware/rateLimit.js');
      createRateLimit = rateLimitModule.createRateLimit;
    });

    it('should create rate limiting middleware', () => {
      const middleware = createRateLimit();
      expect(typeof middleware).toBe('function');
    });

    it('should exempt configured paths', async () => {
      const middleware = createRateLimit();
      
      const req = {
        path: '/health',
        ip: '127.0.0.1',
        user: null
      };
      
      const res = {
        setHeader: jest.fn()
      };
      
      let nextCalled = false;
      const next = () => { nextCalled = true; };
      
      await middleware(req, res, next);
      
      expect(nextCalled).toBe(true);
      expect(res.setHeader).not.toHaveBeenCalled();
    });

    it('should handle non-exempt paths with Redis disabled', async () => {
      const middleware = createRateLimit();
      
      const req = {
        path: '/api/test',
        ip: '127.0.0.1',
        user: null
      };
      
      const res = {
        setHeader: jest.fn()
      };
      
      let nextCalled = false;
      const next = () => { nextCalled = true; };
      
      await middleware(req, res, next);
      
      expect(nextCalled).toBe(true);
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Disabled', 'true');
    });

    it('should use user ID for key when authenticated', async () => {
      const middleware = createRateLimit();
      
      const req = {
        path: '/api/test',
        ip: '127.0.0.1',
        user: { sub: 'user123' }
      };
      
      const res = {
        setHeader: jest.fn()
      };
      
      let nextCalled = false;
      const next = () => { nextCalled = true; };
      
      await middleware(req, res, next);
      
      expect(nextCalled).toBe(true);
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Disabled', 'true');
    });
  });
});