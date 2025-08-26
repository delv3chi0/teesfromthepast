// backend/__tests__/version.test.js
// Tests for version endpoint and functionality

import { getVersionInfo } from '../version/index.js';

describe('Version functionality', () => {
  test('getVersionInfo returns expected structure', () => {
    const versionInfo = getVersionInfo();
    
    expect(versionInfo).toHaveProperty('commit');
    expect(versionInfo).toHaveProperty('buildTime');
    expect(versionInfo).toHaveProperty('version');
    expect(versionInfo).toHaveProperty('env');
    expect(versionInfo.env).toHaveProperty('mode');
    expect(versionInfo.env).toHaveProperty('node');
    
    // Commit should be either a git hash or 'unknown'
    expect(typeof versionInfo.commit).toBe('string');
    expect(versionInfo.commit.length).toBeGreaterThan(0);
    
    // Build time should be a valid ISO string
    expect(typeof versionInfo.buildTime).toBe('string');
    expect(() => new Date(versionInfo.buildTime)).not.toThrow();
    expect(!isNaN(new Date(versionInfo.buildTime).getTime())).toBe(true);
    
    // Version should be a string
    expect(typeof versionInfo.version).toBe('string');
    
    // Environment should have expected values
    expect(typeof versionInfo.env.mode).toBe('string');
    expect(typeof versionInfo.env.node).toBe('string');
    expect(versionInfo.env.node).toMatch(/^v\d+\.\d+\.\d+/);
  });
  
  test('version info is cached on subsequent calls', () => {
    const first = getVersionInfo();
    const second = getVersionInfo();
    
    // Should return exact same object (cached)
    expect(first).toBe(second);
  });

  test('respects environment variables when provided', () => {
    // Clear cache first by resetting module
    jest.resetModules();
    
    // Set environment variables
    process.env.GIT_COMMIT = 'abc1234';
    process.env.BUILD_TIME = '2025-01-01T00:00:00.000Z';
    
    // Re-import to get fresh instance
    return import('../version/index.js').then(({ getVersionInfo }) => {
      const versionInfo = getVersionInfo();
      
      expect(versionInfo.commit).toBe('abc1234');
      expect(versionInfo.buildTime).toBe('2025-01-01T00:00:00.000Z');
      
      // Clean up
      delete process.env.GIT_COMMIT;
      delete process.env.BUILD_TIME;
    });
  });
});

// TODO: Add integration test for GET /version endpoint when test infrastructure supports it