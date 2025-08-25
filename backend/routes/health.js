// backend/routes/health.js
// Health and readiness endpoints with caching and proper checks
import express from 'express';
import mongoose from 'mongoose';
import { getConfig } from '../config/index.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// In-memory cache for readiness probe results (250ms TTL)
let readinessCache = {
  result: null,
  timestamp: 0,
  ttl: 250 // milliseconds
};

// Get application version from package.json
const getVersion = () => {
  try {
    // Use import.meta.resolve to get package.json path
    return '1.0.0'; // Fallback version - could be enhanced to read from package.json
  } catch {
    return '1.0.0';
  }
};

// Get uptime in seconds
const getUptimeSeconds = () => Math.floor(process.uptime());

/**
 * GET /health - Liveness probe
 * Returns basic health status without external dependencies
 * Should be fast and not make any external calls
 */
router.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    uptimeSeconds: getUptimeSeconds(),
    version: getVersion()
  });
});

/**
 * Perform database connectivity check
 */
async function checkDatabase() {
  const start = Date.now();
  try {
    // Simple ping to check DB connectivity
    await mongoose.connection.db.admin().ping();
    const latencyMs = Date.now() - start;
    return { ok: true, latencyMs };
  } catch (error) {
    logger.warn('Database health check failed', { error: error.message });
    return { ok: false, error: error.message };
  }
}

/**
 * Perform external dependency check (placeholder)
 * TODO: NEXT_10_BACKEND_TASKS Task 1 - Add actual external dependency checks
 */
async function checkExternalDependencies() {
  // Placeholder for external service checks (Stripe, Cloudinary, etc.)
  // For now, return success - replace with actual checks in future tasks
  return { ok: true };
}

/**
 * Check configuration readiness
 */
function checkConfig() {
  try {
    const config = getConfig();
    // Basic validation that critical config values exist
    const hasRequiredConfig = !!(
      config.MONGO_URI &&
      config.JWT_SECRET &&
      config.STRIPE_SECRET_KEY
    );
    return { ok: hasRequiredConfig };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

/**
 * Perform all readiness checks
 */
async function performReadinessChecks() {
  const checks = {
    db: await checkDatabase(),
    external: await checkExternalDependencies(),
    config: checkConfig()
  };

  // Determine overall status
  const criticalFailures = !checks.db.ok || !checks.config.ok;
  const partialFailures = !checks.external.ok;

  let status;
  if (criticalFailures) {
    status = 'down';
  } else if (partialFailures) {
    status = 'degraded';
  } else {
    status = 'ready';
  }

  return {
    status,
    checks,
    version: getVersion(),
    timestamp: new Date().toISOString()
  };
}

/**
 * GET /readiness - Readiness probe with caching
 * Performs comprehensive health checks with 250ms caching to prevent stampedes
 */
router.get('/readiness', async (req, res) => {
  const now = Date.now();
  
  // Check if we have a valid cached result
  if (readinessCache.result && (now - readinessCache.timestamp) < readinessCache.ttl) {
    const result = readinessCache.result;
    const httpStatus = result.status === 'down' ? 503 : 200;
    return res.status(httpStatus).json(result);
  }

  try {
    // Perform fresh checks
    const result = await performReadinessChecks();
    
    // Cache the result
    readinessCache = {
      result,
      timestamp: now,
      ttl: 250
    };

    // Return appropriate HTTP status
    const httpStatus = result.status === 'down' ? 503 : 200;
    res.status(httpStatus).json(result);
  } catch (error) {
    logger.error('Readiness check failed', { error: error.message });
    
    // Return error response
    const errorResult = {
      status: 'down',
      checks: {
        db: { ok: false, error: 'Check failed' },
        external: { ok: false, error: 'Check failed' },
        config: { ok: false, error: 'Check failed' }
      },
      version: getVersion(),
      timestamp: new Date().toISOString(),
      error: 'Internal readiness check error'
    };

    res.status(503).json(errorResult);
  }
});

export default router;