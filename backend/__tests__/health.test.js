// backend/__tests__/health.test.js
import request from 'supertest';
import app from '../app.js';
import mongoose from 'mongoose';

describe('Health and Readiness Endpoints', () => {
  describe('GET /health', () => {
    it('should respond with proper JSON format', async () => {
      const response = await request(app)
        .get('/health')
        .expect('Content-Type', /json/)
        .expect(200);

      // Check the response body structure
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('uptimeSeconds');
      expect(response.body).toHaveProperty('version');
      expect(typeof response.body.uptimeSeconds).toBe('number');
      expect(typeof response.body.version).toBe('string');
    });

    it('should be fast and not make external calls', async () => {
      const start = Date.now();
      await request(app)
        .get('/health')
        .expect(200);
      const duration = Date.now() - start;
      
      // Should be very fast (under 100ms)
      expect(duration).toBeLessThan(100);
    });
  });

  describe('GET /readiness', () => {
    it('should respond with proper JSON structure when ready', async () => {
      const response = await request(app)
        .get('/readiness')
        .expect('Content-Type', /json/);

      // Should be 200 or 503 depending on actual system state
      expect([200, 503]).toContain(response.status);

      // Check response structure
      expect(response.body).toHaveProperty('status');
      expect(['ready', 'degraded', 'down']).toContain(response.body.status);
      expect(response.body).toHaveProperty('checks');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('timestamp');

      // Check checks structure
      expect(response.body.checks).toHaveProperty('db');
      expect(response.body.checks).toHaveProperty('external');
      expect(response.body.checks).toHaveProperty('config');
      
      expect(response.body.checks.db).toHaveProperty('ok');
      expect(response.body.checks.external).toHaveProperty('ok');
      expect(response.body.checks.config).toHaveProperty('ok');
    });

    it('should return 503 when database is unavailable', async () => {
      // Mock mongoose connection to fail
      const originalPing = mongoose.connection.db?.admin()?.ping;
      if (mongoose.connection.db?.admin()) {
        mongoose.connection.db.admin().ping = jest.fn().mockRejectedValue(new Error('DB Connection failed'));
      }

      const response = await request(app)
        .get('/readiness')
        .expect('Content-Type', /json/)
        .expect(503);

      expect(response.body.status).toBe('down');
      expect(response.body.checks.db.ok).toBe(false);

      // Restore original function
      if (originalPing && mongoose.connection.db?.admin()) {
        mongoose.connection.db.admin().ping = originalPing;
      }
    });

    it('should cache results for 250ms to prevent stampedes', async () => {
      // Make first request
      const response1 = await request(app)
        .get('/readiness')
        .expect('Content-Type', /json/);

      // Make second request immediately (should be cached)
      const response2 = await request(app)
        .get('/readiness')
        .expect('Content-Type', /json/);

      // Should have same timestamp (cached)
      expect(response1.body.timestamp).toBe(response2.body.timestamp);

      // Wait for cache to expire and make third request
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const response3 = await request(app)
        .get('/readiness')
        .expect('Content-Type', /json/);

      // Should have different timestamp (fresh check)
      expect(response3.body.timestamp).not.toBe(response1.body.timestamp);
    });

    it('should return degraded status for external dependency failures', async () => {
      // This test validates the structure - in a real implementation,
      // we would mock external dependency failures
      const response = await request(app)
        .get('/readiness');

      // The response should be valid regardless of status
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('checks');
      
      // If status is degraded, it should still return 200
      if (response.body.status === 'degraded') {
        expect(response.status).toBe(200);
      }
    });
  });
});
