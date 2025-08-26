// backend/version/index.js
// Version information utilities with auto-detection
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { isConfigReady, getConfig } from '../config/index.js';
import { logger } from '../utils/logger.js';

let cachedVersionInfo = null;

/**
 * Auto-detect git commit hash using git command
 * Fails gracefully to 'unknown' if git is not available
 */
function detectGitCommit() {
  try {
    const commit = execSync('git rev-parse --short HEAD', { 
      encoding: 'utf8', 
      timeout: 5000,
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
    return commit;
  } catch (error) {
    logger.debug('Could not detect git commit', { error: error.message });
    return 'unknown';
  }
}

/**
 * Auto-detect build time as current timestamp
 * Used when BUILD_TIME env var is not provided
 */
function detectBuildTime() {
  return new Date().toISOString();
}

/**
 * Read version from package.json
 */
function getPackageVersion() {
  try {
    const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));
    return packageJson.version || 'unknown';
  } catch (error) {
    logger.warn('Could not read package.json version', { error: error.message });
    return 'unknown';
  }
}

/**
 * Get complete version information
 * Returns cached result on subsequent calls
 */
export function getVersionInfo() {
  if (cachedVersionInfo) {
    return cachedVersionInfo;
  }

  let config = null;
  if (isConfigReady()) {
    config = getConfig();
  }

  // Get commit - from env var or auto-detect
  const commit = config?.GIT_COMMIT || process.env.GIT_COMMIT || detectGitCommit();
  
  // Get build time - from env var or auto-detect
  const buildTime = config?.BUILD_TIME || process.env.BUILD_TIME || detectBuildTime();
  
  // Get version from package.json
  const version = getPackageVersion();
  
  // Environment info
  const env = {
    mode: process.env.NODE_ENV || 'development',
    node: process.version
  };

  cachedVersionInfo = {
    commit,
    buildTime,
    version,
    env
  };

  return cachedVersionInfo;
}

export default { getVersionInfo };