// backend/tests/adminDynamic.test.js
/**
 * Tests for Dynamic Admin Console functionality
 * 
 * Tests all dynamic configuration endpoints, validation, 
 * middleware integration, and audit logging functionality.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { 
  getDynamicConfig, 
  updateRateLimitConfig, 
  updateSecurityConfig,
  pushAuditLog,
  getAuditCategories,
  getAuditLogs,
  setVersionInfo,
  pushRequestId
} from '../config/dynamicConfig.js';
import adminDynamicRoutes from '../routes/adminDynamic.js';
import { protect } from '../middleware/authMiddleware.js';

// Mock middleware setup for tests
const app = express();
app.use(express.json());

// Mock user for tests
const adminUser = {
  _id: 'admin123',
  username: 'admin',
  email: 'admin@test.com',
  isAdmin: true
};

const regularUser = {
  _id: 'user123', 
  username: 'user',
  email: 'user@test.com',
  isAdmin: false
};

// Mock JWT secret for tests
const JWT_SECRET = 'test-secret-key-for-dynamic-admin-tests';

// Helper to create auth header
const createAuthHeader = (user) => {
  const token = jwt.sign(user, JWT_SECRET, { expiresIn: '1h' });
  return `Bearer ${token}`;
};

// Mock auth middleware for tests
const mockAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: { code: 'NO_TOKEN', message: 'No token provided' } });
  }
  
  try {
    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Invalid token' } });
  }
};

app.use(mockAuth);
app.use('/api/admin', adminDynamicRoutes);

describe('Dynamic Admin Console', () => {
  beforeAll(() => {
    // Set test version info
    setVersionInfo({
      commit: 'test-commit-123',
      buildTime: '2024-01-01T00:00:00Z',
      version: '1.0.0-test'
    });
  });

  beforeEach(() => {
    // Reset to default configuration before each test
    updateRateLimitConfig({
      algorithm: 'fixed',
      globalMax: 120,
      windowMs: 60000,
      overrides: [],
      roleOverrides: []
    });
    
    updateSecurityConfig({
      cspReportOnly: true,
      enableCOEP: false
    });
  });

  describe('GET /api/admin/runtime/config', () => {
    it('should return current runtime configuration for admin user', async () => {
      const response = await request(app)
        .get('/api/admin/runtime/config')
        .set('Authorization', createAuthHeader(adminUser))
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        ephemeral: true,
        data: {
          rateLimit: {
            algorithm: 'fixed',
            globalMax: 120,
            windowMs: 60000,
            overrides: [],
            roleOverrides: []
          },
          security: {
            cspReportOnly: true,
            enableCOEP: false
          },
          tracing: {
            requestIdHeader: 'X-Request-Id'
          },
          metrics: {
            enabled: expect.any(Boolean)
          },
          version: {
            commit: 'test-commit-123',
            buildTime: '2024-01-01T00:00:00Z',
            version: '1.0.0-test'
          }
        }
      });
      expect(response.body.timestamp).toBeDefined();
    });

    it('should reject non-admin users', async () => {
      await request(app)
        .get('/api/admin/runtime/config')
        .set('Authorization', createAuthHeader(regularUser))
        .expect(403);
    });

    it('should reject unauthenticated requests', async () => {
      await request(app)
        .get('/api/admin/runtime/config')
        .expect(401);
    });
  });

  describe('PUT /api/admin/runtime/rate-limit', () => {
    it('should update rate limit configuration with valid data', async () => {
      const updates = {
        algorithm: 'sliding',
        globalMax: 200,
        windowMs: 30000,
        overrides: [
          { pathPrefix: '/api/upload', max: 10, algorithm: 'token_bucket' }
        ],
        roleOverrides: [
          { role: 'premium', pathPrefix: '/api', max: 500 }
        ]
      };

      const response = await request(app)
        .put('/api/admin/runtime/rate-limit')
        .set('Authorization', createAuthHeader(adminUser))
        .send(updates)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Rate limit configuration updated successfully',
        data: {
          algorithm: 'sliding',
          globalMax: 200,
          windowMs: 30000,
          overrides: [
            { pathPrefix: '/api/upload', max: 10, algorithm: 'token_bucket' }
          ],
          roleOverrides: [
            { role: 'premium', pathPrefix: '', max: 500, algorithm: 'fixed' }
          ]
        }
      });
    });

    it('should reject invalid algorithm', async () => {
      const response = await request(app)
        .put('/api/admin/runtime/rate-limit')
        .set('Authorization', createAuthHeader(adminUser))
        .send({ algorithm: 'invalid_algorithm' })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toContain('Invalid algorithm. Must be: fixed, sliding, or token_bucket');
    });

    it('should reject negative globalMax', async () => {
      const response = await request(app)
        .put('/api/admin/runtime/rate-limit')
        .set('Authorization', createAuthHeader(adminUser))
        .send({ globalMax: -1 })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toContain('globalMax must be a positive integer');
    });

    it('should reject malformed overrides', async () => {
      const response = await request(app)
        .put('/api/admin/runtime/rate-limit')
        .set('Authorization', createAuthHeader(adminUser))
        .send({ 
          overrides: [
            { pathPrefix: '/api/test', max: 'invalid' }
          ]
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toContain('overrides[0].max must be a positive number');
    });

    it('should reject non-admin users', async () => {
      await request(app)
        .put('/api/admin/runtime/rate-limit')
        .set('Authorization', createAuthHeader(regularUser))
        .send({ algorithm: 'sliding' })
        .expect(403);
    });
  });

  describe('PUT /api/admin/runtime/security', () => {
    it('should update security configuration with valid boolean values', async () => {
      const updates = {
        cspReportOnly: false,
        enableCOEP: true
      };

      const response = await request(app)
        .put('/api/admin/runtime/security')
        .set('Authorization', createAuthHeader(adminUser))
        .send(updates)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Security configuration updated successfully',
        data: {
          cspReportOnly: false,
          enableCOEP: true
        }
      });
    });

    it('should reject non-boolean values', async () => {
      const response = await request(app)
        .put('/api/admin/runtime/security')
        .set('Authorization', createAuthHeader(adminUser))
        .send({ cspReportOnly: 'true' })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toContain('cspReportOnly must be a boolean');
    });

    it('should handle partial updates', async () => {
      const response = await request(app)
        .put('/api/admin/runtime/security')
        .set('Authorization', createAuthHeader(adminUser))
        .send({ enableCOEP: true })
        .expect(200);

      expect(response.body.data).toMatchObject({
        cspReportOnly: true, // unchanged
        enableCOEP: true     // updated
      });
    });
  });

  describe('Audit Log Ring Buffer', () => {
    beforeEach(() => {
      // Seed some test audit logs
      pushAuditLog({
        category: 'AUTH',
        message: 'User login successful',
        meta: { userId: 'user123' },
        actor: 'user123',
        level: 'info'
      });

      pushAuditLog({
        category: 'ADMIN',
        message: 'Configuration updated',
        meta: { section: 'rate-limit' },
        actor: 'admin123',
        level: 'info'
      });

      pushAuditLog({
        category: 'ERROR',
        message: 'Database connection failed',
        meta: { error: 'timeout' },
        level: 'error'
      });
    });

    describe('GET /api/admin/audit/categories', () => {
      it('should return available audit categories', async () => {
        const response = await request(app)
          .get('/api/admin/audit/categories')
          .set('Authorization', createAuthHeader(adminUser))
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          count: expect.any(Number),
          data: expect.arrayContaining(['AUTH', 'ADMIN', 'ERROR'])
        });
      });
    });

    describe('GET /api/admin/audit/logs', () => {
      it('should return all audit logs by default', async () => {
        const response = await request(app)
          .get('/api/admin/audit/logs')
          .set('Authorization', createAuthHeader(adminUser))
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(0);
        expect(response.body.data[0]).toMatchObject({
          timestamp: expect.any(String),
          category: expect.any(String),
          message: expect.any(String),
          meta: expect.any(Object),
          level: expect.any(String)
        });
      });

      it('should filter logs by category', async () => {
        const response = await request(app)
          .get('/api/admin/audit/logs?category=AUTH')
          .set('Authorization', createAuthHeader(adminUser))
          .expect(200);

        expect(response.body.data.every(log => log.category === 'AUTH')).toBe(true);
      });

      it('should filter logs by search query', async () => {
        const response = await request(app)
          .get('/api/admin/audit/logs?q=login')
          .set('Authorization', createAuthHeader(adminUser))
          .expect(200);

        expect(response.body.data.every(log => 
          log.message.toLowerCase().includes('login') ||
          JSON.stringify(log.meta).toLowerCase().includes('login')
        )).toBe(true);
      });

      it('should limit results', async () => {
        const response = await request(app)
          .get('/api/admin/audit/logs?limit=1')
          .set('Authorization', createAuthHeader(adminUser))
          .expect(200);

        expect(response.body.data.length).toBeLessThanOrEqual(1);
      });

      it('should reject invalid limit values', async () => {
        await request(app)
          .get('/api/admin/audit/logs?limit=invalid')
          .set('Authorization', createAuthHeader(adminUser))
          .expect(400);

        await request(app)
          .get('/api/admin/audit/logs?limit=2000')
          .set('Authorization', createAuthHeader(adminUser))
          .expect(400);
      });

      it('should filter by timestamp', async () => {
        const futureTime = new Date(Date.now() + 1000).toISOString();
        
        const response = await request(app)
          .get(`/api/admin/audit/logs?since=${encodeURIComponent(futureTime)}`)
          .set('Authorization', createAuthHeader(adminUser))
          .expect(200);

        expect(response.body.data.length).toBe(0);
      });
    });
  });

  describe('Configuration Integration Tests', () => {
    it('should reflect rate limit changes in runtime config', async () => {
      // Update rate limit config
      await request(app)
        .put('/api/admin/runtime/rate-limit')
        .set('Authorization', createAuthHeader(adminUser))
        .send({ algorithm: 'token_bucket', globalMax: 300 })
        .expect(200);

      // Verify changes in runtime config
      const response = await request(app)
        .get('/api/admin/runtime/config')
        .set('Authorization', createAuthHeader(adminUser))
        .expect(200);

      expect(response.body.data.rateLimit).toMatchObject({
        algorithm: 'token_bucket',
        globalMax: 300
      });
    });

    it('should reflect security changes in runtime config', async () => {
      // Update security config
      await request(app)
        .put('/api/admin/runtime/security')
        .set('Authorization', createAuthHeader(adminUser))
        .send({ cspReportOnly: false, enableCOEP: true })
        .expect(200);

      // Verify changes in runtime config
      const response = await request(app)
        .get('/api/admin/runtime/config')
        .set('Authorization', createAuthHeader(adminUser))
        .expect(200);

      expect(response.body.data.security).toMatchObject({
        cspReportOnly: false,
        enableCOEP: true
      });
    });
  });

  describe('Tracing Integration', () => {
    it('should track request IDs in ring buffer', async () => {
      // Push some request IDs
      pushRequestId('req-test-001');
      pushRequestId('req-test-002');
      pushRequestId('req-test-003');

      const response = await request(app)
        .get('/api/admin/runtime/config')
        .set('Authorization', createAuthHeader(adminUser))
        .expect(200);

      const recentIds = response.body.data.tracing.recentRequestIds;
      expect(recentIds.length).toBeGreaterThan(0);
      expect(recentIds.some(item => item.id === 'req-test-003')).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid request bodies gracefully', async () => {
      await request(app)
        .put('/api/admin/runtime/rate-limit')
        .set('Authorization', createAuthHeader(adminUser))
        .send('invalid json')
        .expect(400);
    });

    it('should handle missing request bodies', async () => {
      const response = await request(app)
        .put('/api/admin/runtime/security')
        .set('Authorization', createAuthHeader(adminUser))
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_REQUEST_BODY');
    });
  });
});

describe('Dynamic Configuration Module', () => {
  describe('Rate Limit Configuration', () => {
    it('should validate algorithms correctly', () => {
      const result = updateRateLimitConfig({ algorithm: 'invalid' });
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid algorithm. Must be: fixed, sliding, or token_bucket');
    });

    it('should handle complex override configurations', () => {
      const overrides = [
        { pathPrefix: '/api/auth', max: 10, algorithm: 'sliding' },
        { pathPrefix: '/api/upload', max: 5, algorithm: 'token_bucket' }
      ];
      
      const roleOverrides = [
        { role: 'admin', pathPrefix: '/api', max: 1000 },
        { role: 'premium', pathPrefix: '/api/upload', max: 50 }
      ];

      const result = updateRateLimitConfig({ overrides, roleOverrides });
      expect(result.success).toBe(true);

      const config = getDynamicConfig();
      expect(config.rateLimit.overrides).toHaveLength(2);
      expect(config.rateLimit.roleOverrides).toHaveLength(2);
    });
  });

  describe('Audit Ring Buffer', () => {
    it('should maintain ring buffer size limits', () => {
      // Push more entries than buffer size
      for (let i = 0; i < 600; i++) {
        pushAuditLog({
          category: 'TEST',
          message: `Test message ${i}`,
          level: 'info'
        });
      }

      const logs = getAuditLogs({ limit: 1000 });
      expect(logs.length).toBeLessThanOrEqual(500); // Default max size
    });

    it('should return logs in newest-first order', () => {
      const now = Date.now();
      pushAuditLog({ 
        timestamp: new Date(now - 2000).toISOString(),
        category: 'OLDER', 
        message: 'Older message' 
      });
      pushAuditLog({ 
        timestamp: new Date(now - 1000).toISOString(),
        category: 'NEWER', 
        message: 'Newer message' 
      });

      const logs = getAuditLogs({ limit: 10 });
      expect(logs[0].category).toBe('NEWER');
      expect(logs[1].category).toBe('OLDER');
    });
  });
});