// backend/version/index.js
// Version information service for operational visibility

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cache the version info to avoid repeated file reads
let cachedVersionInfo = null;

/**
 * Get version information for operational visibility
 * @returns {Object} Version info containing commit, buildTime, version, env
 */
export async function getVersionInfo() {
  if (cachedVersionInfo) {
    return cachedVersionInfo;
  }

  try {
    // Read version from package.json
    const packageJsonPath = path.join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
    
    // Get commit SHA (try environment variable first, fallback to git if available)
    let commit = process.env.GIT_COMMIT || process.env.COMMIT_SHA || 'unknown';
    
    // If still unknown, try to read from .git if in development
    if (commit === 'unknown') {
      try {
        const gitHeadPath = path.join(__dirname, '..', '..', '.git', 'HEAD');
        const headContent = await fs.readFile(gitHeadPath, 'utf8');
        if (headContent.startsWith('ref: ')) {
          const refPath = headContent.slice(5).trim();
          const refFilePath = path.join(__dirname, '..', '..', '.git', refPath);
          const commitSha = await fs.readFile(refFilePath, 'utf8');
          commit = commitSha.trim().substring(0, 7);
        } else {
          // Detached HEAD
          commit = headContent.trim().substring(0, 7);
        }
      } catch {
        // Git info not available, keep 'unknown'
      }
    }

    // Build time (use environment variable if set, otherwise current startup time)
    const buildTime = process.env.BUILD_TIME || new Date().toISOString();

    // Environment info
    const env = {
      mode: process.env.NODE_ENV || 'development',
      node: process.version
    };

    cachedVersionInfo = {
      commit,
      buildTime,
      version: packageJson.version,
      env
    };

    return cachedVersionInfo;
  } catch (error) {
    // Fallback version info if anything fails
    return {
      commit: 'unknown',
      buildTime: new Date().toISOString(),
      version: 'unknown',
      env: {
        mode: process.env.NODE_ENV || 'development',
        node: process.version
      }
    };
  }
}

/**
 * Clear the cached version info (useful for testing)
 */
export function clearVersionCache() {
  cachedVersionInfo = null;
}