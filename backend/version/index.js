// backend/version/index.js
// Version information helper module
import { readFile } from 'fs/promises';
import { execSync } from 'child_process';
import { logger } from '../utils/logger.js';

let cachedVersionInfo = null;

/**
 * Get version information for the /version endpoint
 * @returns {Object} Version information object
 */
export async function getVersionInfo() {
  if (cachedVersionInfo) {
    return cachedVersionInfo;
  }

  let commit = 'unknown';
  let buildTime = new Date().toISOString();
  let version = 'unknown';

  // Get commit from environment variable or try git command
  if (process.env.GIT_COMMIT) {
    commit = process.env.GIT_COMMIT;
  } else {
    try {
      commit = execSync('git rev-parse --short HEAD', { 
        encoding: 'utf8',
        timeout: 5000,
        stdio: ['ignore', 'pipe', 'ignore']
      }).trim();
    } catch (error) {
      logger.debug('Could not get git commit via command', { error: error.message });
    }
  }

  // Get build time from environment variable or use current time
  if (process.env.BUILD_TIME) {
    buildTime = process.env.BUILD_TIME;
  }

  // Get version from package.json
  try {
    const packageJsonPath = new URL('../package.json', import.meta.url);
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
    version = packageJson.version || 'unknown';
  } catch (error) {
    logger.debug('Could not read package.json for version', { error: error.message });
  }

  cachedVersionInfo = {
    commit,
    buildTime,
    version,
    env: {
      mode: process.env.NODE_ENV || 'development',
      node: process.version
    }
  };

  return cachedVersionInfo;
}

export default { getVersionInfo };