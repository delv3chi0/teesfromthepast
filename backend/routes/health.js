// backend/routes/health.js
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Cache package.json version to avoid reading file on every request
let packageVersion = '1.0.0';
try {
  const packagePath = path.join(__dirname, '../package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  packageVersion = packageJson.version;
} catch (error) {
  console.warn('Failed to read package.json version:', error.message);
}

// Track server start time for uptime calculation
const serverStartTime = Date.now();

/**
 * Enhanced health endpoint with metrics
 * GET /healthz - Returns detailed health information
 */
router.get('/healthz', (req, res) => {
  const now = Date.now();
  const uptimeSec = Math.floor((now - serverStartTime) / 1000);
  
  const healthData = {
    ok: true,
    uptimeSec,
    version: packageVersion,
    gitSha: process.env.GIT_SHA || null,
    time: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    memory: {
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024), // MB
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) // MB
    }
  };
  
  // Set cache headers for health endpoint (short cache)
  res.set('Cache-Control', 'public, max-age=30, must-revalidate');
  res.json(healthData);
});

/**
 * Simple health check for load balancers
 * GET /health - Returns simple OK
 */
router.get('/health', (req, res) => {
  res.set('Cache-Control', 'public, max-age=30');
  res.status(200).send('OK');
});

export default router;