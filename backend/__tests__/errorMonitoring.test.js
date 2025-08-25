// backend/__tests__/errorMonitoring.test.js
import request from 'supertest';

// Mock the config module to avoid validation
jest.mock('../config/index.js', () => ({
  getConfig: () => ({
    NODE_ENV: 'test',
    LOG_LEVEL: 'info'
  })
}));

// Mock the logger
jest.mock('../utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  },
  createRequestLogger: (req, res, next) => {
    req.log = {
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    };
    next();
  }
}));

describe('Error Monitoring', () => {
  let app;
  
  beforeEach(async () => {
    jest.resetModules();
    process.env.NODE_ENV = 'test';
    
    // Import app after mocking
    const appModule = await import('../app.js');
    app = appModule.default;
  });

  it('should capture and return error with errorRef for /dev/boom', async () => {
    const res = await request(app)
      .get('/api/dev/boom')
      .expect(500);

    expect(res.body).toHaveProperty('ok', false);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toHaveProperty('code', 'TEST_ERROR');
    expect(res.body).toHaveProperty('errorRef');
    expect(res.body.errorRef).toMatch(/^mock-event-id-/);
    expect(res.body).toHaveProperty('requestId');
  });

  it('should handle 404 errors without Sentry capture', async () => {
    const res = await request(app)
      .get('/api/nonexistent')
      .expect(404);

    expect(res.body).toHaveProperty('ok', false);
    expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
    expect(res.body).not.toHaveProperty('errorRef'); // 404s don't get captured
  });
});

describe('Error Monitoring Utils', () => {
  it('should initialize without crashing when no Sentry DSN provided', async () => {
    delete process.env.SENTRY_DSN;
    
    const { initializeErrorMonitoring } = await import('../utils/errorMonitoring.js');
    
    expect(() => {
      initializeErrorMonitoring();
    }).not.toThrow();
  });

  it('should use mock Sentry when no DSN provided', async () => {
    delete process.env.SENTRY_DSN;
    
    const { sentry } = await import('../utils/errorMonitoring.js');
    
    const eventId = sentry.captureException(new Error('test error'));
    expect(eventId).toMatch(/^mock-event-id-/);
  });
});