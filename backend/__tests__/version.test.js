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
});