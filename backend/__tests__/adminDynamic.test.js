// backend/__tests__/adminDynamic.test.js
// Basic tests for dynamic admin configuration endpoints

import request from 'supertest';
import { app } from '../app.js';
import { resetDynamicConfig } from '../config/dynamicConfig.js';

// Mock authentication middleware for tests
jest.mock('../middleware/authMiddleware.js', () => ({
  protect: (req, res, next) => {
    req.user = { _id: 'test-user-id', isAdmin: true };
    next();
  },
  admin: (req, res, next) => next()
}));

describe('Admin Dynamic Config Endpoints', () => {
  beforeEach(() => {
    resetDynamicConfig();
  });

  describe('GET /api/admin/runtime/config', () => {
    it('should return runtime configuration', async () => {
      const response = await request(app)
        .get('/api/admin/runtime/config')
        .expect(200);

      expect(response.body.ok).toBe(true);
      expect(response.body.config).toBeDefined();
      expect(response.body.config.rateLimit).toBeDefined();
      expect(response.body.config.security).toBeDefined();
      expect(response.body.config.versions).toBeDefined();
    });
  });

  describe('PUT /api/admin/runtime/rate-limit', () => {
    it('should update rate limit configuration', async () => {
      const updates = {
        algorithm: 'sliding',
        globalMax: 200,
        windowMs: 30000
      };

      const response = await request(app)
        .put('/api/admin/runtime/rate-limit')
        .send(updates)
        .expect(200);

      expect(response.body.ok).toBe(true);
      expect(response.body.config.rateLimit.algorithm).toBe('sliding');
      expect(response.body.config.rateLimit.globalMax).toBe(200);
      expect(response.body.config.rateLimit.windowMs).toBe(30000);
    });

    it('should reject invalid algorithm', async () => {
      const updates = { algorithm: 'invalid' };

      const response = await request(app)
        .put('/api/admin/runtime/rate-limit')
        .send(updates)
        .expect(400);

      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toBe('INVALID_ALGORITHM');
    });

    it('should reject invalid globalMax', async () => {
      const updates = { globalMax: -1 };

      const response = await request(app)
        .put('/api/admin/runtime/rate-limit')
        .send(updates)
        .expect(400);

      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toBe('INVALID_GLOBAL_MAX');
    });
  });

  describe('PUT /api/admin/runtime/security', () => {
    it('should update security configuration', async () => {
      const updates = {
        CSP_REPORT_ONLY: false,
        ENABLE_COEP: true
      };

      const response = await request(app)
        .put('/api/admin/runtime/security')
        .send(updates)
        .expect(200);

      expect(response.body.ok).toBe(true);
      expect(response.body.config.security.CSP_REPORT_ONLY).toBe(false);
      expect(response.body.config.security.ENABLE_COEP).toBe(true);
    });

    it('should reject empty updates', async () => {
      const response = await request(app)
        .put('/api/admin/runtime/security')
        .send({})
        .expect(400);

      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toBe('NO_UPDATES');
    });
  });

  describe('GET /api/admin/audit/categories', () => {
    it('should return audit categories', async () => {
      const response = await request(app)
        .get('/api/admin/audit/categories')
        .expect(200);

      expect(response.body.ok).toBe(true);
      expect(Array.isArray(response.body.categories)).toBe(true);
    });
  });

  describe('GET /api/admin/audit/logs', () => {
    it('should return audit logs', async () => {
      const response = await request(app)
        .get('/api/admin/audit/logs')
        .expect(200);

      expect(response.body.ok).toBe(true);
      expect(Array.isArray(response.body.logs)).toBe(true);
      expect(response.body.meta).toBeDefined();
    });

    it('should respect limit parameter', async () => {
      const response = await request(app)
        .get('/api/admin/audit/logs?limit=10')
        .expect(200);

      expect(response.body.meta.limit).toBe(10);
    });
  });

  describe('GET /api/admin/runtime/overrides', () => {
    it('should return current dynamic overrides', async () => {
      const response = await request(app)
        .get('/api/admin/runtime/overrides')
        .expect(200);

      expect(response.body.ok).toBe(true);
      expect(response.body.overrides).toBeDefined();
      expect(response.body.overrides.rateLimit).toBeDefined();
      expect(response.body.overrides.security).toBeDefined();
    });
  });
});