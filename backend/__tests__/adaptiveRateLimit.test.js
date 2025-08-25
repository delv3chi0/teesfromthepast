// backend/__tests__/adaptiveRateLimit.test.js
import request from 'supertest';

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

describe('Adaptive Rate Limiting', () => {
  let app;
  
  beforeEach(async () => {
    jest.resetModules();
    process.env.NODE_ENV = 'test';
    
    // Import app after mocking
    const appModule = await import('../app.js');
    app = appModule.default;
  });

  it('should allow requests under rate limit', async () => {
    const res = await request(app)
      .get('/api/dev/boom')
      .expect(500);

    expect(res.headers).toHaveProperty('x-ratelimit-limit');
    expect(res.headers).toHaveProperty('x-ratelimit-remaining');
    expect(res.headers).toHaveProperty('x-ratelimit-reset');
  });

  it('should include abuse score in headers when elevated', async () => {
    // Import rate limiting functions
    const { trackAbuseEvent } = await import('../utils/adaptiveRateLimit.js');
    
    // Simulate abuse events
    await trackAbuseEvent('127.0.0.1', null, 'login_failure', 10);
    await trackAbuseEvent('127.0.0.1', null, '4xx_error', 5);
    
    const res = await request(app)
      .get('/api/dev/boom')
      .expect(500);

    expect(res.headers).toHaveProperty('x-abuse-score');
    expect(parseInt(res.headers['x-abuse-score'])).toBeGreaterThan(0);
  });

  it('should block requests when abuse threshold exceeded', async () => {
    const { trackAbuseEvent, ABUSE_THRESHOLDS } = await import('../utils/adaptiveRateLimit.js');
    
    // Generate high abuse score
    await trackAbuseEvent('127.0.0.1', null, 'login_failure', ABUSE_THRESHOLDS.generic_abuse * 3);
    
    const res = await request(app)
      .get('/api/dev/boom')
      .expect(429);

    expect(res.body.error.code).toBe('RATE_LIMITED');
    expect(res.headers).toHaveProperty('retry-after');
  });
});

describe('Abuse Tracking', () => {
  it('should track and retrieve abuse scores', async () => {
    const { trackAbuseEvent, getAbuseScore } = await import('../utils/adaptiveRateLimit.js');
    
    const initialScore = await getAbuseScore('192.168.1.1', null);
    expect(initialScore).toBe(0);
    
    await trackAbuseEvent('192.168.1.1', null, 'login_failure', 5);
    await trackAbuseEvent('192.168.1.1', null, '4xx_error', 2);
    
    const finalScore = await getAbuseScore('192.168.1.1', null);
    expect(finalScore).toBe(7);
  });

  it('should handle user-based tracking', async () => {
    const { trackAbuseEvent, getAbuseScore } = await import('../utils/adaptiveRateLimit.js');
    
    await trackAbuseEvent('10.0.0.1', 'user123', 'auth_failure', 3);
    
    const score = await getAbuseScore('10.0.0.1', 'user123');
    expect(score).toBe(3);
    
    // Different user should have different score
    const otherScore = await getAbuseScore('10.0.0.1', 'user456');
    expect(otherScore).toBe(0);
  });
});