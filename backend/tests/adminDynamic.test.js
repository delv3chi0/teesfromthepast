// backend/tests/adminDynamic.test.js
// Basic tests for dynamic admin console functionality
import { 
  getRuntimeConfigSnapshot,
  updateRateLimit,
  updateSecurity,
  getAuditLogSlice,
  pushAuditLog,
  getAuditCategories
} from '../config/dynamicConfig.js';

describe('Dynamic Admin Console', () => {
  beforeEach(() => {
    // Reset to clean state for each test
    const cleanConfig = {
      rateLimit: {
        algorithm: 'fixed',
        globalMax: null,
        windowMs: null,
        overrides: [],
        roleOverrides: []
      },
      security: {
        cspReportOnly: true,
        enableCOEP: false
      }
    };
  });

  describe('Runtime Config', () => {
    test('should return runtime config snapshot with expected shape', () => {
      const config = getRuntimeConfigSnapshot();
      
      expect(config).toHaveProperty('rateLimit');
      expect(config).toHaveProperty('security');
      expect(config).toHaveProperty('tracing');
      expect(config).toHaveProperty('metrics');
      expect(config).toHaveProperty('versions');
      
      expect(config.rateLimit).toHaveProperty('algorithm');
      expect(config.rateLimit).toHaveProperty('globalMax');
      expect(config.rateLimit).toHaveProperty('windowMs');
      expect(config.rateLimit).toHaveProperty('overrides');
      expect(config.rateLimit).toHaveProperty('roleOverrides');
    });
  });

  describe('Rate Limit Updates', () => {
    test('should update rate limit config with valid data', () => {
      const update = {
        algorithm: 'sliding',
        globalMax: 200,
        windowMs: 30000
      };
      
      const result = updateRateLimit(update);
      
      expect(result.algorithm).toBe('sliding');
      expect(result.globalMax).toBe(200);
      expect(result.windowMs).toBe(30000);
    });

    test('should validate algorithm values', () => {
      expect(() => {
        updateRateLimit({ algorithm: 'invalid' });
      }).toThrow('Invalid algorithm');
    });

    test('should validate globalMax as positive integer', () => {
      expect(() => {
        updateRateLimit({ globalMax: -1 });
      }).toThrow('globalMax must be a positive integer');
      
      expect(() => {
        updateRateLimit({ globalMax: 'invalid' });
      }).toThrow('globalMax must be a positive integer');
    });

    test('should allow null values for globalMax and windowMs', () => {
      const result = updateRateLimit({ 
        globalMax: null, 
        windowMs: null 
      });
      
      expect(result.globalMax).toBeNull();
      expect(result.windowMs).toBeNull();
    });

    test('should validate overrides array format', () => {
      expect(() => {
        updateRateLimit({ overrides: 'invalid' });
      }).toThrow('overrides must be an array');
      
      expect(() => {
        updateRateLimit({ 
          overrides: [{ pathPrefix: '/api/test', max: -1 }] 
        });
      }).toThrow('positive integer max');
      
      // Valid override should work
      const result = updateRateLimit({
        overrides: [
          { pathPrefix: '/api/test', max: 100, algorithm: 'fixed' }
        ]
      });
      
      expect(result.overrides).toHaveLength(1);
      expect(result.overrides[0].pathPrefix).toBe('/api/test');
    });
  });

  describe('Security Updates', () => {
    test('should update security config with valid data', () => {
      const update = {
        cspReportOnly: false,
        enableCOEP: true
      };
      
      const result = updateSecurity(update);
      
      expect(result.cspReportOnly).toBe(false);
      expect(result.enableCOEP).toBe(true);
    });

    test('should validate boolean values', () => {
      expect(() => {
        updateSecurity({ cspReportOnly: 'invalid' });
      }).toThrow('cspReportOnly must be a boolean');
      
      expect(() => {
        updateSecurity({ enableCOEP: 'invalid' });
      }).toThrow('enableCOEP must be a boolean');
    });
  });

  describe('Audit Logs', () => {
    test('should push and retrieve audit logs', () => {
      const testEntry = {
        category: 'test',
        message: 'Test audit entry',
        meta: { key: 'value' },
        user: 'test-user'
      };
      
      pushAuditLog(testEntry);
      
      const logs = getAuditLogSlice({ limit: 1 });
      expect(logs).toHaveLength(1);
      expect(logs[0].category).toBe('test');
      expect(logs[0].message).toBe('Test audit entry');
    });

    test('should filter audit logs by category', () => {
      pushAuditLog({ category: 'auth', message: 'Login' });
      pushAuditLog({ category: 'admin', message: 'Config change' });
      
      const authLogs = getAuditLogSlice({ category: 'auth' });
      expect(authLogs).toHaveLength(1);
      expect(authLogs[0].category).toBe('auth');
    });

    test('should filter audit logs by search query', () => {
      pushAuditLog({ category: 'test', message: 'User login successful' });
      pushAuditLog({ category: 'test', message: 'Password reset' });
      
      const loginLogs = getAuditLogSlice({ q: 'login' });
      expect(loginLogs).toHaveLength(1);
      expect(loginLogs[0].message).toContain('login');
    });

    test('should return unique audit categories', () => {
      pushAuditLog({ category: 'auth' });
      pushAuditLog({ category: 'admin' });
      pushAuditLog({ category: 'auth' }); // duplicate
      
      const categories = getAuditCategories();
      expect(categories).toContain('auth');
      expect(categories).toContain('admin');
      expect(categories.length).toBe(2); // no duplicates
    });
  });
});