// backend/__tests__/adminDynamic.test.js
// Tests for dynamic admin console endpoints

import request from 'supertest';
import app from '../app.js';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { 
  getRuntimeConfigSnapshot,
  updateRateLimit,
  updateSecurity,
  pushAuditLog,
  getAuditLogSlice,
  getAuditCategories,
  initializeDynamicConfig
} from '../config/dynamicConfig.js';

describe('Admin Dynamic Console', () => {
  let adminUser;
  let adminToken;
  let regularUser;
  let regularToken;

  beforeAll(async () => {
    // Re-initialize dynamic config for clean test state
    initializeDynamicConfig();
  });

  beforeEach(async () => {
    // Create admin user
    adminUser = await User.create({
      username: 'admin',
      email: 'admin@test.com',
      password: 'hashedpassword',
      isAdmin: true
    });

    // Create regular user  
    regularUser = await User.create({
      username: 'user',
      email: 'user@test.com', 
      password: 'hashedpassword',
      isAdmin: false
    });

    // Mock JWT tokens (simplified for testing)
    adminToken = 'mock-admin-jwt-token';
    regularToken = 'mock-regular-jwt-token';

    // Mock auth middleware by adding user to request
    app.use((req, res, next) => {
      if (req.headers.authorization === `Bearer ${adminToken}`) {
        req.user = adminUser;
      } else if (req.headers.authorization === `Bearer ${regularToken}`) {
        req.user = regularUser;
      }
      next();
    });
  });

  afterEach(async () => {
    await User.deleteMany({});
  });

  describe('GET /api/admin/runtime/config', () => {
    it('should return runtime config for admin users', async () => {
      const response = await request(app)
        .get('/api/admin/runtime/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('rateLimit');
      expect(response.body).toHaveProperty('security');
      expect(response.body).toHaveProperty('tracing');
      expect(response.body).toHaveProperty('metrics');
      expect(response.body).toHaveProperty('versions');
      expect(response.body).toHaveProperty('audit');

      // Check default values
      expect(response.body.rateLimit.algorithm).toBe('fixed');
      expect(response.body.rateLimit.globalMax).toBe(120);
      expect(response.body.security.cspReportOnly).toBe(true);
    });

    it('should deny access to non-admin users', async () => {
      await request(app)
        .get('/api/admin/runtime/config')
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(403);
    });

    it('should deny access to unauthenticated users', async () => {
      await request(app)
        .get('/api/admin/runtime/config')
        .expect(401);
    });
  });

  describe('PUT /api/admin/runtime/rate-limit', () => {
    it('should update rate limit configuration with valid data', async () => {
      const update = {
        algorithm: 'sliding',
        globalMax: 200,
        windowMs: 30000
      };

      const response = await request(app)
        .put('/api/admin/runtime/rate-limit')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(update)
        .expect(200);

      expect(response.body.algorithm).toBe('sliding');
      expect(response.body.globalMax).toBe(200);
      expect(response.body.windowMs).toBe(30000);

      // Verify changes are visible in subsequent GET
      const configResponse = await request(app)
        .get('/api/admin/runtime/config')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(configResponse.body.rateLimit.algorithm).toBe('sliding');
      expect(configResponse.body.rateLimit.globalMax).toBe(200);
    });

    it('should update rate limit overrides', async () => {
      const update = {
        overrides: [
          { pathPrefix: '/api/upload', max: 10 },
          { pathPrefix: '/api/auth', max: 5, algorithm: 'token_bucket' }
        ],
        roleOverrides: [
          { role: 'premium', pathPrefix: '/api', max: 500 }
        ]
      };

      const response = await request(app)
        .put('/api/admin/runtime/rate-limit')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(update)
        .expect(200);

      expect(response.body.overrides).toHaveLength(2);
      expect(response.body.roleOverrides).toHaveLength(1);
      expect(response.body.overrides[0].pathPrefix).toBe('/api/upload');
      expect(response.body.roleOverrides[0].role).toBe('premium');
    });

    it('should reject invalid algorithm', async () => {
      const update = { algorithm: 'invalid_algorithm' };

      const response = await request(app)
        .put('/api/admin/runtime/rate-limit')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(update)
        .expect(400);

      expect(response.body.error).toContain('Invalid algorithm');
    });

    it('should reject negative globalMax', async () => {
      const update = { globalMax: -10 };

      const response = await request(app)
        .put('/api/admin/runtime/rate-limit')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(update)
        .expect(400);

      expect(response.body.error).toContain('positive number');
    });

    it('should reject malformed overrides', async () => {
      const update = {
        overrides: [
          { pathPrefix: '/api/test' } // missing max
        ]
      };

      const response = await request(app)
        .put('/api/admin/runtime/rate-limit')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(update)
        .expect(400);

      expect(response.body.error).toContain('Invalid overrides format');
    });
  });

  describe('PUT /api/admin/runtime/security', () => {
    it('should update security configuration', async () => {
      const update = {
        cspReportOnly: false,
        enableCOEP: true
      };

      const response = await request(app)
        .put('/api/admin/runtime/security')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(update)
        .expect(200);

      expect(response.body.cspReportOnly).toBe(false);
      expect(response.body.enableCOEP).toBe(true);
    });

    it('should reject non-boolean values', async () => {
      const update = { cspReportOnly: 'not-a-boolean' };

      const response = await request(app)
        .put('/api/admin/runtime/security')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(update)
        .expect(400);

      expect(response.body.error).toContain('must be a boolean');
    });
  });

  describe('GET /api/admin/audit/categories', () => {
    beforeEach(() => {
      // Seed some audit logs
      pushAuditLog({
        category: 'config_change',
        message: 'Test config change',
        meta: { test: true },
        actor: { id: 'test' }
      });
      
      pushAuditLog({
        category: 'admin_access',
        message: 'Test admin access',
        meta: { test: true },
        actor: { id: 'test' }
      });
    });

    it('should return available audit categories', async () => {
      const response = await request(app)
        .get('/api/admin/audit/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toContain('config_change');
      expect(response.body).toContain('admin_access');
    });
  });

  describe('GET /api/admin/audit/logs', () => {
    beforeEach(() => {
      // Seed test audit logs
      pushAuditLog({
        category: 'config_change',
        message: 'Rate limit changed to sliding window',
        meta: { algorithm: 'sliding', user: 'admin' },
        actor: { id: 'admin-id', username: 'admin' },
        level: 'info'
      });

      pushAuditLog({
        category: 'admin_access',
        message: 'Admin accessed user management',
        meta: { section: 'users' },
        actor: { id: 'admin-id', username: 'admin' },
        level: 'info'
      });

      pushAuditLog({
        category: 'error',
        message: 'Failed to update configuration',
        meta: { error: 'Invalid input' },
        actor: { id: 'admin-id', username: 'admin' },
        level: 'error'
      });
    });

    it('should return audit logs with default limit', async () => {
      const response = await request(app)
        .get('/api/admin/audit/logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      
      // Check log structure
      const log = response.body[0];
      expect(log).toHaveProperty('timestamp');
      expect(log).toHaveProperty('category');
      expect(log).toHaveProperty('message');
      expect(log).toHaveProperty('meta');
      expect(log).toHaveProperty('actor');
      expect(log).toHaveProperty('level');
    });

    it('should filter logs by category', async () => {
      const response = await request(app)
        .get('/api/admin/audit/logs?category=config_change')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.every(log => log.category === 'config_change')).toBe(true);
    });

    it('should filter logs by search query', async () => {
      const response = await request(app)
        .get('/api/admin/audit/logs?q=sliding')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.some(log => 
        log.message.toLowerCase().includes('sliding') || 
        JSON.stringify(log.meta).toLowerCase().includes('sliding')
      )).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const response = await request(app)
        .get('/api/admin/audit/logs?limit=1')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.length).toBe(1);
    });

    it('should enforce maximum limit', async () => {
      const response = await request(app)
        .get('/api/admin/audit/logs?limit=1000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Should be capped at 500
      expect(response.body.length).toBeLessThanOrEqual(500);
    });
  });

  describe('Dynamic Config Integration', () => {
    it('should maintain configuration changes across requests', async () => {
      // Update rate limit
      await request(app)
        .put('/api/admin/runtime/rate-limit')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ algorithm: 'token_bucket', globalMax: 300 });

      // Update security
      await request(app)
        .put('/api/admin/runtime/security')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ cspReportOnly: false });

      // Verify both changes persist
      const response = await request(app)
        .get('/api/admin/runtime/config')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.body.rateLimit.algorithm).toBe('token_bucket');
      expect(response.body.rateLimit.globalMax).toBe(300);
      expect(response.body.security.cspReportOnly).toBe(false);
    });
  });
});