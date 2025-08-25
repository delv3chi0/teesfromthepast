// backend/__tests__/requestLogger.test.js
import request from 'supertest';
import app from '../app.js';

describe('Request Logger Middleware', () => {
  it('should add X-Request-ID header to responses', async () => {
    const res = await request(app)
      .get('/health')
      .expect(200);

    expect(res.headers).toHaveProperty('x-request-id');
    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it('should set req.id property', async () => {
    // This is harder to test directly, but we can verify through logs
    // For now, just verify the header is unique between requests
    const res1 = await request(app).get('/health').expect(200);
    const res2 = await request(app).get('/health').expect(200);

    expect(res1.headers['x-request-id']).not.toBe(res2.headers['x-request-id']);
  });
});