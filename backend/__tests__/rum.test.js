// backend/__tests__/rum.test.js
import request from 'supertest';

// Mock the config module
jest.mock('../config/index.js', () => ({
  getConfig: () => ({
    NODE_ENV: 'test'
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

describe('RUM (Real User Monitoring)', () => {
  let app;
  
  beforeEach(async () => {
    jest.resetModules();
    process.env.NODE_ENV = 'test';
    process.env.RUM_SAMPLE_RATE = '1.0'; // 100% sampling for tests
    
    // Import app after mocking
    const appModule = await import('../app.js');
    app = appModule.default;
  });

  describe('POST /api/rum', () => {
    const validRumData = {
      metrics: [
        {
          name: 'LCP',
          value: 2500,
          rating: 'good'
        },
        {
          name: 'FID',
          value: 100,
          rating: 'good'
        }
      ],
      url: 'https://example.com/page',
      userAgent: 'Mozilla/5.0 Test Browser',
      timestamp: new Date().toISOString()
    };

    it('should accept valid RUM data', async () => {
      const res = await request(app)
        .post('/api/rum')
        .send(validRumData)
        .expect(200);

      expect(res.body.ok).toBe(true);
      expect(res.body.sampled).toBe(true);
      expect(res.body.eventId).toBeDefined();
    });

    it('should validate metric names', async () => {
      const invalidData = {
        ...validRumData,
        metrics: [
          {
            name: 'INVALID_METRIC',
            value: 100
          }
        ]
      };

      const res = await request(app)
        .post('/api/rum')
        .send(invalidData)
        .expect(400);

      expect(res.body.ok).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should validate metric values are numeric', async () => {
      const invalidData = {
        ...validRumData,
        metrics: [
          {
            name: 'LCP',
            value: 'not-a-number'
          }
        ]
      };

      const res = await request(app)
        .post('/api/rum')
        .send(invalidData)
        .expect(400);

      expect(res.body.ok).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should require valid URL', async () => {
      const invalidData = {
        ...validRumData,
        url: 'not-a-valid-url'
      };

      const res = await request(app)
        .post('/api/rum')
        .send(invalidData)
        .expect(400);

      expect(res.body.ok).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle sampling when rate is low', async () => {
      process.env.RUM_SAMPLE_RATE = '0.0'; // 0% sampling
      
      const res = await request(app)
        .post('/api/rum')
        .send(validRumData)
        .expect(200);

      expect(res.body.ok).toBe(true);
      expect(res.body.sampled).toBe(false);
    });
  });

  describe('GET /api/rum/health', () => {
    it('should return health status', async () => {
      const res = await request(app)
        .get('/api/rum/health')
        .expect(200);

      expect(res.body.ok).toBe(true);
      expect(res.body.health).toBeDefined();
      expect(res.body.health.status).toBe('ok');
      expect(res.body.health.totalEvents).toBeDefined();
      expect(res.body.health.memoryUsage).toBeDefined();
    });
  });

  describe('GET /api/rum/metrics', () => {
    it('should require admin access', async () => {
      const res = await request(app)
        .get('/api/rum/metrics')
        .expect(403);

      expect(res.body.ok).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should return metrics with admin key', async () => {
      process.env.ADMIN_API_KEY = 'test-admin-key';
      
      const res = await request(app)
        .get('/api/rum/metrics')
        .set('x-admin-key', 'test-admin-key')
        .expect(200);

      expect(res.body.ok).toBe(true);
      expect(res.body.stats).toBeDefined();
      expect(res.body.stats.totalSamples).toBeDefined();
      expect(res.body.stats.metrics).toBeDefined();
    });
  });
});

describe('RUM Metrics Export', () => {
  it('should export metrics in correct format', async () => {
    const { getRumMetricsForExport } = await import('../routes/rum.js');
    
    const metrics = getRumMetricsForExport();
    
    expect(typeof metrics).toBe('object');
    expect(metrics.rum_total_samples).toBeDefined();
    expect(metrics.rum_events_stored).toBeDefined();
  });
});