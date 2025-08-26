// backend/__tests__/dynamicConfig.unit.test.js
// Unit tests for dynamic config module only (no MongoDB dependency)

import { jest } from '@jest/globals';
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

describe('Dynamic Config Module (Unit Tests)', () => {
  beforeEach(() => {
    // Reset state between tests by setting known defaults
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

  describe('Integration scenarios', () => {
    test('should immediately reflect dynamic changes', () => {
      // Initially set rate limit to 100
      updateRateLimitConfig({ globalMax: 100 });
      let config = getRateLimitConfig();
      expect(config.globalMax).toBe(100);
      
      // Update to 200
      updateRateLimitConfig({ globalMax: 200 });
      config = getRateLimitConfig();
      expect(config.globalMax).toBe(200);
      
      // Changes should be immediately visible in snapshot
      const snapshot = getSnapshot();
      expect(snapshot.rateLimit.globalMax).toBe(200);
    });

    test('should maintain separate config sections', () => {
      // Update rate limit
      updateRateLimitConfig({ algorithm: 'sliding' });
      
      // Update security
      updateSecurityConfig({ enableCOEP: true });
      
      // Both changes should be preserved
      const snapshot = getSnapshot();
      expect(snapshot.rateLimit.algorithm).toBe('sliding');
      expect(snapshot.security.enableCOEP).toBe(true);
    });
  });
});