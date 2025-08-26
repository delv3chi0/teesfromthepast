// backend/__tests__/adminDynamic.test.js
// Tests for dynamic admin runtime configuration

import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// Mock auth middleware first
jest.mock('../middleware/authMiddleware.js', () => ({
  protect: (req, res, next) => {
    req.user = { _id: 'test-user-id', isAdmin: true };
    next();
  },
  admin: (req, res, next) => next()
}));

import {
  getSnapshot,
  getRateLimitConfig,
  updateRateLimitConfig,
  getSecurityConfig,
  updateSecurityConfig,
  pushTrace,
  getTracing,
  pushAuditLog,
  listAuditCategories,
  queryAuditLogs,
  setVersionInfo,
  getVersionInfo
} from '../config/dynamicConfig.js';
import adminDynamicRoutes from '../routes/adminDynamic.js';

// Create test app
function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/admin', adminDynamicRoutes);
  return app;
}

describe('Dynamic Config Module', () => {
  beforeEach(() => {
    // Reset state between tests by clearing and reinitializing
    const snapshot = getSnapshot();
    updateRateLimitConfig({
      algorithm: 'fixed',
      globalMax: 120,
      windowMs: 60000,
      overrides: {},
      roleOverrides: {},
      requestIdHeader: 'x-request-id'
    });
    updateSecurityConfig({
      cspReportOnly: true,
      enableCOEP: false
    });
  });

  describe('getSnapshot', () => {
    test('should return complete configuration snapshot', () => {
      const snapshot = getSnapshot();
      
      expect(snapshot).toMatchObject({
        ephemeral: true,
        timestamp: expect.any(String),
        version: expect.objectContaining({
          dynamicConfigVersion: '1.0.0'
        }),
        metrics: {
          enabled: expect.any(Boolean)
        },
        rateLimit: {
          algorithm: 'fixed',
          globalMax: 120,
          windowMs: 60000,
          overrides: {},
          roleOverrides: {},
          requestIdHeader: 'x-request-id'
        },
        security: {
          cspReportOnly: true,
          enableCOEP: false
        },
        tracing: {
          maxSize: 200,
          currentCount: expect.any(Number)
        },
        audit: {
          maxSize: expect.any(Number),
          currentCount: expect.any(Number),
          categoriesCount: expect.any(Number)
        }
      });
    });

    test('should include ephemeral flag', () => {
      const snapshot = getSnapshot();
      expect(snapshot.ephemeral).toBe(true);
    });
  });

  describe('Rate Limit Configuration', () => {
    test('should get current rate limit config', () => {
      const config = getRateLimitConfig();
      expect(config).toMatchObject({
        algorithm: 'fixed',
        globalMax: 120,
        windowMs: 60000,
        overrides: {},
        roleOverrides: {},
        requestIdHeader: 'x-request-id'
      });
    });

    test('should update valid rate limit config', () => {
      updateRateLimitConfig({
        algorithm: 'sliding',
        globalMax: 200,
        windowMs: 30000
      });

      const config = getRateLimitConfig();
      expect(config.algorithm).toBe('sliding');
      expect(config.globalMax).toBe(200);
      expect(config.windowMs).toBe(30000);
    });

    test('should reject invalid algorithm', () => {
      expect(() => {
        updateRateLimitConfig({ algorithm: 'invalid_algorithm' });
      }).toThrow(/Invalid algorithm/);
      
      try {
        updateRateLimitConfig({ algorithm: 'invalid_algorithm' });
      } catch (error) {
        expect(error.status).toBe(400);
        expect(error.code).toBe('VALIDATION_ERROR');
      }
    });

    test('should reject negative globalMax', () => {
      expect(() => {
        updateRateLimitConfig({ globalMax: -10 });
      }).toThrow(/must be a non-negative integer/);
    });

    test('should reject invalid overrides structure', () => {
      expect(() => {
        updateRateLimitConfig({
          overrides: {
            '/api/test': {
              algorithm: 'invalid_alg',
              max: 50
            }
          }
        });
      }).toThrow(/Invalid algorithm in override/);
    });

    test('should accept valid overrides', () => {
      updateRateLimitConfig({
        overrides: {
          '/api/test': {
            algorithm: 'token_bucket',
            max: 50
          }
        },
        roleOverrides: {
          premium: {
            max: 500
          }
        }
      });

      const config = getRateLimitConfig();
      expect(config.overrides['/api/test']).toMatchObject({
        algorithm: 'token_bucket',
        max: 50
      });
      expect(config.roleOverrides.premium).toMatchObject({
        max: 500
      });
    });
  });

  describe('Security Configuration', () => {
    test('should get current security config', () => {
      const config = getSecurityConfig();
      expect(config).toMatchObject({
        cspReportOnly: true,
        enableCOEP: false
      });
    });

    test('should update security config', () => {
      updateSecurityConfig({
        cspReportOnly: false,
        enableCOEP: true
      });

      const config = getSecurityConfig();
      expect(config.cspReportOnly).toBe(false);
      expect(config.enableCOEP).toBe(true);
    });

    test('should reject non-boolean values', () => {
      expect(() => {
        updateSecurityConfig({ cspReportOnly: 'true' });
      }).toThrow(/must be a boolean/);

      expect(() => {
        updateSecurityConfig({ enableCOEP: 1 });
      }).toThrow(/must be a boolean/);
    });
  });

  describe('Tracing', () => {
    test('should push and retrieve trace entries', () => {
      pushTrace('req-123');
      pushTrace('req-456');
      
      const traces = getTracing();
      expect(traces).toHaveLength(2);
      expect(traces[0].requestId).toBe('req-456'); // newest first
      expect(traces[1].requestId).toBe('req-123');
    });

    test('should respect ring buffer size', () => {
      // Push more than buffer size
      for (let i = 0; i < 250; i++) {
        pushTrace(`req-${i}`);
      }
      
      const traces = getTracing();
      expect(traces.length).toBeLessThanOrEqual(200); // ring buffer max size
      expect(traces[0].requestId).toBe('req-249'); // newest entry
    });

    test('should support limit parameter', () => {
      pushTrace('req-1');
      pushTrace('req-2');
      pushTrace('req-3');
      
      const traces = getTracing(2);
      expect(traces).toHaveLength(2);
      expect(traces[0].requestId).toBe('req-3');
      expect(traces[1].requestId).toBe('req-2');
    });
  });

  describe('Audit Logs', () => {
    test('should push and query audit entries', () => {
      pushAuditLog({
        category: 'TEST',
        message: 'Test message',
        actor: 'test-user',
        level: 'info'
      });

      const logs = queryAuditLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        category: 'TEST',
        message: 'Test message',
        actor: 'test-user',
        level: 'info'
      });
    });

    test('should track categories', () => {
      pushAuditLog({ category: 'LOGIN', message: 'User login' });
      pushAuditLog({ category: 'LOGOUT', message: 'User logout' });
      pushAuditLog({ category: 'LOGIN', message: 'Another login' });

      const categories = listAuditCategories();
      expect(categories).toEqual(['LOGIN', 'LOGOUT']); // sorted
    });

    test('should filter by category', () => {
      pushAuditLog({ category: 'LOGIN', message: 'User login' });
      pushAuditLog({ category: 'LOGOUT', message: 'User logout' });

      const loginLogs = queryAuditLogs({ category: 'LOGIN' });
      expect(loginLogs).toHaveLength(1);
      expect(loginLogs[0].category).toBe('LOGIN');
    });

    test('should filter by search query', () => {
      pushAuditLog({ category: 'TEST', message: 'Important message' });
      pushAuditLog({ category: 'TEST', message: 'Regular message' });

      const filtered = queryAuditLogs({ q: 'important' });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].message).toBe('Important message');
    });

    test('should filter by timestamp', () => {
      const now = new Date();
      const past = new Date(now.getTime() - 60000); // 1 minute ago
      
      pushAuditLog({ category: 'OLD', message: 'Old message' });
      
      // Query for logs since now (should be empty)
      const recentLogs = queryAuditLogs({ since: now.toISOString() });
      expect(recentLogs).toHaveLength(0);
      
      // Query for logs since past (should include the log)
      const allLogs = queryAuditLogs({ since: past.toISOString() });
      expect(allLogs.length).toBeGreaterThan(0);
    });

    test('should respect limit parameter', () => {
      for (let i = 0; i < 10; i++) {
        pushAuditLog({ category: 'TEST', message: `Message ${i}` });
      }

      const limited = queryAuditLogs({ limit: 5 });
      expect(limited).toHaveLength(5);
    });
  });

  describe('Version Info', () => {
    test('should set and get version info', () => {
      setVersionInfo({
        commit: 'abc123',
        buildTime: '2024-01-01T00:00:00Z'
      });

      const version = getVersionInfo();
      expect(version.commit).toBe('abc123');
      expect(version.buildTime).toBe('2024-01-01T00:00:00Z');
      expect(version.dynamicConfigVersion).toBe('1.0.0');
    });
  });
});

describe('Admin Dynamic Routes', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
    // Reset configuration
    updateRateLimitConfig({
      algorithm: 'fixed',
      globalMax: 120,
      windowMs: 60000,
      overrides: {},
      roleOverrides: {},
      requestIdHeader: 'x-request-id'
    });
    updateSecurityConfig({
      cspReportOnly: true,
      enableCOEP: false
    });
  });

  describe('GET /api/admin/runtime/config', () => {
    test('should return runtime config snapshot', async () => {
      const response = await request(app)
        .get('/api/admin/runtime/config')
        .expect(200);

      expect(response.body).toMatchObject({
        ephemeral: true,
        version: expect.any(Object),
        metrics: expect.any(Object),
        rateLimit: expect.any(Object),
        security: expect.any(Object),
        tracing: expect.any(Object),
        audit: expect.any(Object)
      });
    });
  });

  describe('PUT /api/admin/runtime/rate-limit', () => {
    test('should update rate limit config successfully', async () => {
      const response = await request(app)
        .put('/api/admin/runtime/rate-limit')
        .send({
          algorithm: 'sliding',
          globalMax: 200
        })
        .expect(200);

      expect(response.body).toMatchObject({
        ok: true,
        config: {
          algorithm: 'sliding',
          globalMax: 200
        },
        message: expect.any(String)
      });
    });

    test('should return 400 for invalid algorithm', async () => {
      const response = await request(app)
        .put('/api/admin/runtime/rate-limit')
        .send({
          algorithm: 'invalid_algorithm'
        })
        .expect(400);

      expect(response.body).toMatchObject({
        ok: false,
        code: 'VALIDATION_ERROR',
        message: expect.stringContaining('Invalid algorithm')
      });
    });
  });

  describe('PUT /api/admin/runtime/security', () => {
    test('should update security config successfully', async () => {
      const response = await request(app)
        .put('/api/admin/runtime/security')
        .send({
          enableCOEP: true
        })
        .expect(200);

      expect(response.body).toMatchObject({
        ok: true,
        config: {
          enableCOEP: true
        },
        message: expect.any(String)
      });
    });

    test('should return 400 for invalid boolean', async () => {
      const response = await request(app)
        .put('/api/admin/runtime/security')
        .send({
          enableCOEP: 'true'
        })
        .expect(400);

      expect(response.body).toMatchObject({
        ok: false,
        code: 'VALIDATION_ERROR',
        message: expect.stringContaining('must be a boolean')
      });
    });
  });

  describe('GET /api/admin/audit/categories', () => {
    test('should return audit categories', async () => {
      // Seed some categories
      pushAuditLog({ category: 'LOGIN', message: 'Test' });
      pushAuditLog({ category: 'LOGOUT', message: 'Test' });

      const response = await request(app)
        .get('/api/admin/audit/categories')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toContain('LOGIN');
      expect(response.body).toContain('LOGOUT');
    });

    test('should work even if empty', async () => {
      const response = await request(app)
        .get('/api/admin/audit/categories')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /api/admin/audit/logs', () => {
    beforeEach(() => {
      // Seed audit logs for testing
      pushAuditLog({ category: 'LOGIN', message: 'User logged in', actor: 'user1' });
      pushAuditLog({ category: 'LOGOUT', message: 'User logged out', actor: 'user1' });
      pushAuditLog({ category: 'LOGIN', message: 'Admin logged in', actor: 'admin1' });
    });

    test('should return audit logs', async () => {
      const response = await request(app)
        .get('/api/admin/audit/logs')
        .expect(200);

      expect(response.body).toMatchObject({
        ok: true,
        logs: expect.any(Array),
        total: expect.any(Number),
        filters: expect.any(Object)
      });

      expect(response.body.logs.length).toBeGreaterThan(0);
    });

    test('should filter by category', async () => {
      const response = await request(app)
        .get('/api/admin/audit/logs?category=LOGIN')
        .expect(200);

      expect(response.body.logs).toHaveLength(2);
      response.body.logs.forEach(log => {
        expect(log.category).toBe('LOGIN');
      });
    });

    test('should filter by search query', async () => {
      const response = await request(app)
        .get('/api/admin/audit/logs?q=admin')
        .expect(200);

      expect(response.body.logs).toHaveLength(1);
      expect(response.body.logs[0].message).toContain('Admin');
    });

    test('should respect limit parameter', async () => {
      const response = await request(app)
        .get('/api/admin/audit/logs?limit=2')
        .expect(200);

      expect(response.body.logs.length).toBeLessThanOrEqual(2);
      expect(response.body.filters.limit).toBe(2);
    });

    test('should return 400 for invalid since timestamp', async () => {
      const response = await request(app)
        .get('/api/admin/audit/logs?since=invalid-date')
        .expect(400);

      expect(response.body).toMatchObject({
        ok: false,
        code: 'VALIDATION_ERROR',
        message: expect.stringContaining('Invalid since timestamp')
      });
    });
  });
});

describe('Rate Limit Integration Test', () => {
  test('should immediately reflect dynamic changes in rate limit headers', async () => {
    // This test simulates how rate limit changes should be immediately effective
    // We'll mock the rate limit middleware integration
    
    // Initially set rate limit to 100
    updateRateLimitConfig({ globalMax: 100 });
    let config = getRateLimitConfig();
    expect(config.globalMax).toBe(100);
    
    // Update to 200
    updateRateLimitConfig({ globalMax: 200 });
    config = getRateLimitConfig();
    expect(config.globalMax).toBe(200);
    
    // The actual middleware integration will be tested separately
    // when we integrate with the existing rate limit middleware
  });
});