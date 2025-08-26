// backend/__tests__/adminDynamic.test.js
// Tests for admin dynamic runtime configuration endpoints

import { jest } from '@jest/globals';
import {
  getRuntimeConfigSnapshot,
  updateRateLimit,
  updateSecurity,
  getAuditCategories,
  getAuditLogs,
  resetDynamicConfig,
  pushAuditEntry
} from '../config/dynamicConfig.js';

// Mock version info
jest.mock('../version/index.js', () => ({
  getVersionInfo: () => ({
    commit: 'test-commit',
    buildTime: '2024-01-01T00:00:00Z',
    version: '1.0.0',
    env: { mode: 'test' }
  })
}));

describe('Dynamic Config Functions', () => {
  beforeEach(() => {
    resetDynamicConfig();
  });

  test('getRuntimeConfigSnapshot should return complete config', () => {
    const snapshot = getRuntimeConfigSnapshot();
    
    expect(snapshot).toHaveProperty('timestamp');
    expect(snapshot).toHaveProperty('version');
    expect(snapshot).toHaveProperty('rateLimit');
    expect(snapshot).toHaveProperty('security');
    expect(snapshot).toHaveProperty('tracing');
    expect(snapshot).toHaveProperty('metrics');
    expect(snapshot).toHaveProperty('audit');
    
    expect(snapshot.version.commit).toBe('test-commit');
    expect(snapshot.version.version).toBe('1.0.0');
  });

  test('updateRateLimit should update rate limiting config', () => {
    updateRateLimit({
      globalMax: 300,
      algorithm: 'sliding',
      pathOverrides: [{ path: '/test', max: 100 }],
      roleOverrides: [{ role: 'admin', max: 1000 }]
    });

    const snapshot = getRuntimeConfigSnapshot();
    expect(snapshot.rateLimit.globalMax).toBe(300);
    expect(snapshot.rateLimit.algorithm).toBe('sliding');
    expect(snapshot.rateLimit.pathOverrides['/test'].max).toBe(100);
    expect(snapshot.rateLimit.roleOverrides['admin'].max).toBe(1000);
  });

  test('updateRateLimit should reject invalid values', () => {
    updateRateLimit({
      globalMax: -1, // Should be ignored
      algorithm: 'invalid', // Should be ignored
      windowMs: 0 // Should be ignored
    });

    const snapshot = getRuntimeConfigSnapshot();
    expect(snapshot.rateLimit.globalMax).toBe(null);
    expect(snapshot.rateLimit.algorithm).toBe(null);
    expect(snapshot.rateLimit.windowMs).toBe(null);
  });

  test('updateSecurity should update security config', () => {
    updateSecurity({
      cspReportOnly: true,
      enableCOEP: false
    });

    const snapshot = getRuntimeConfigSnapshot();
    expect(snapshot.security.cspReportOnly).toBe(true);
    expect(snapshot.security.enableCOEP).toBe(false);
  });

  test('audit log functionality should work', () => {
    // Push some audit entries
    pushAuditEntry({
      category: 'auth',
      action: 'login',
      message: 'User login successful',
      actor: { username: 'testuser' }
    });
    
    pushAuditEntry({
      category: 'admin',
      action: 'user_delete',
      message: 'Admin deleted user',
      actor: { username: 'admin' }
    });

    // Test categories
    const categories = getAuditCategories();
    expect(categories).toContain('auth');
    expect(categories).toContain('admin');

    // Test logs retrieval
    const allLogs = getAuditLogs();
    expect(allLogs.length).toBe(2);

    // Test filtering by category
    const authLogs = getAuditLogs({ category: 'auth' });
    expect(authLogs.length).toBe(1);
    expect(authLogs[0].category).toBe('auth');

    // Test search filtering
    const loginLogs = getAuditLogs({ q: 'login' });
    expect(loginLogs.length).toBe(1);
    expect(loginLogs[0].message).toContain('login');

    // Test limit
    const limitedLogs = getAuditLogs({ limit: 1 });
    expect(limitedLogs.length).toBe(1);
  });

  test('resetDynamicConfig should reset all configurations', () => {
    // First, modify some config
    updateRateLimit({ globalMax: 500, algorithm: 'token_bucket' });
    updateSecurity({ cspReportOnly: false });

    // Reset the config
    resetDynamicConfig();

    const snapshot = getRuntimeConfigSnapshot();
    expect(snapshot.rateLimit.globalMax).toBe(null);
    expect(snapshot.rateLimit.algorithm).toBe(null);
    expect(snapshot.security.cspReportOnly).toBe(null);
  });
});