// backend/__tests__/version.test.js
// Basic test for /version endpoint functionality

import { getVersionInfo, clearVersionCache } from '../version/index.js';

describe('Version Module', () => {
  beforeEach(() => {
    clearVersionCache();
  });

  test('getVersionInfo returns required fields', async () => {
    const versionInfo = await getVersionInfo();
    
    expect(versionInfo).toHaveProperty('commit');
    expect(versionInfo).toHaveProperty('buildTime');
    expect(versionInfo).toHaveProperty('version');
    expect(versionInfo).toHaveProperty('env');
    expect(versionInfo.env).toHaveProperty('mode');
    expect(versionInfo.env).toHaveProperty('node');
    
    // Commit should be a string (either a SHA or 'unknown')
    expect(typeof versionInfo.commit).toBe('string');
    
    // BuildTime should be a valid ISO date string
    expect(() => new Date(versionInfo.buildTime)).not.toThrow();
    
    // Version should be a string
    expect(typeof versionInfo.version).toBe('string');
    
    // Node version should start with 'v'
    expect(versionInfo.env.node).toMatch(/^v\d+/);
  });

  test('caches version info on subsequent calls', async () => {
    const first = await getVersionInfo();
    const second = await getVersionInfo();
    
    // Should return the same object reference (cached)
    expect(first).toBe(second);
  });

  test('clearVersionCache clears the cache', async () => {
    const first = await getVersionInfo();
    clearVersionCache();
    const second = await getVersionInfo();
    
    // Should return different object references after cache clear
    expect(first).not.toBe(second);
    // But content should be the same
    expect(first.commit).toBe(second.commit);
    expect(first.version).toBe(second.version);
  });
});