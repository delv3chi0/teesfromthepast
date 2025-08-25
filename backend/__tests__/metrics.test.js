// backend/__tests__/metrics.test.js
import request from 'supertest';
import app from '../app.js';

describe('Prometheus Metrics Endpoint', () => {
  beforeAll(() => {
    // Enable metrics for testing
    process.env.ENABLE_METRICS = 'true';
  });

  afterAll(() => {
    // Clean up
    delete process.env.ENABLE_METRICS;
    delete process.env.METRICS_AUTH_TOKEN;
  });

  describe('GET /metrics', () => {
    it('should return 404 when metrics are disabled', async () => {
      delete process.env.ENABLE_METRICS;
      
      const response = await request(app)
        .get('/metrics')
        .expect(404);

      expect(response.body.error).toBe('Metrics endpoint not enabled');
    });

    it('should return metrics when enabled without auth token', async () => {
      process.env.ENABLE_METRICS = 'true';
      
      // Make a request to generate some metrics
      await request(app).get('/health');
      
      const response = await request(app)
        .get('/metrics')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/text\/plain/);
      expect(response.text).toContain('# TYPE');
      expect(response.text).toContain('teesfromthepast_');
    });

    it('should require auth token when configured', async () => {
      process.env.ENABLE_METRICS = 'true';
      process.env.METRICS_AUTH_TOKEN = 'test-token';
      
      // Without token
      await request(app)
        .get('/metrics')
        .expect(401);

      // With wrong token
      await request(app)
        .get('/metrics')
        .set('Authorization', 'Bearer wrong-token')
        .expect(401);

      // With correct token
      await request(app)
        .get('/metrics')
        .set('Authorization', 'Bearer test-token')
        .expect(200);
    });

    it('should include custom HTTP metrics after requests', async () => {
      process.env.ENABLE_METRICS = 'true';
      delete process.env.METRICS_AUTH_TOKEN;
      
      // Make some test requests to generate metrics
      await request(app).get('/health').expect(200);
      await request(app).get('/nonexistent').expect(404);
      
      const response = await request(app)
        .get('/metrics')
        .expect(200);

      // Should contain our custom metrics
      expect(response.text).toContain('http_requests_total');
      expect(response.text).toContain('http_request_duration_ms');
    });
  });
});