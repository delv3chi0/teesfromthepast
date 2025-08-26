// backend/routes/health.js
// Health and readiness endpoints with detailed system information
// Enhanced with dynamic runtime configuration info
import express from 'express';
import { isConfigReady, getConfig } from '../config/index.js';
import { getVersionInfo } from '../version/index.js';
import { getRateLimitConfig, getMetricsConfig } from '../config/dynamicConfig.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Redis connection checker
async function checkRedisConnection() {
  try {
    // Import Redis clients from cache or rate limiting
    const { default: Redis } = await import('ioredis');
    
    let redisUrl;
    if (isConfigReady()) {
      const config = getConfig();
      redisUrl = config.REDIS_URL;
    } else {
      redisUrl = process.env.REDIS_URL;
    }
    
    if (!redisUrl) {
      return { connected: false, error: 'No Redis URL configured' };
    }
    
    const testClient = new Redis(redisUrl, {
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      connectTimeout: 2000,
    });
    
    await testClient.ping();
    await testClient.quit();
    
    return { connected: true };
  } catch (error) {
    return { connected: false, error: error.message };
  }
}

// Enhanced health endpoint
router.get('/health', async (req, res) => {
  try {
    const versionInfo = getVersionInfo();
    const redisStatus = await checkRedisConnection();
    
    // Get runtime configuration info
    const dynamicRateLimit = getRateLimitConfig();
    const dynamicMetrics = getMetricsConfig();
    
    // Get rate limiter configuration (include dynamic info)
    let rateLimiterInfo;
    if (isConfigReady()) {
      const config = getConfig();
      rateLimiterInfo = {
        algorithm: dynamicRateLimit.algorithm || config.RATE_LIMIT_ALGORITHM || 'fixed',
        enabled: !!config.REDIS_URL
      };
    } else {
      rateLimiterInfo = {
        algorithm: dynamicRateLimit.algorithm || process.env.RATE_LIMIT_ALGORITHM || 'fixed',
        enabled: !!process.env.REDIS_URL
      };
    }
    
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      commit: versionInfo.commit,
      buildTime: versionInfo.buildTime,
      version: versionInfo.version,
      environment: versionInfo.environment,
      redis: redisStatus,
      rateLimiter: rateLimiterInfo,
      // Include runtime info for admin console
      runtime: {
        rateLimitAlgorithm: rateLimiterInfo.algorithm,
        metricsEnabled: dynamicMetrics.enabled
      }
    };
    
    res.status(200).json(healthData);
  } catch (error) {
    logger.error('Health check error', { error: error.message });
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Readiness endpoint with dependency checks
router.get('/readiness', async (req, res) => {
  try {
    let redisRequiredForReadiness;
    if (isConfigReady()) {
      const config = getConfig();
      redisRequiredForReadiness = config.REDIS_REQUIRED_FOR_READINESS === true;
    } else {
      redisRequiredForReadiness = process.env.REDIS_REQUIRED_FOR_READINESS === 'true';
    }
    
    const checks = {
      redis: await checkRedisConnection()
    };
    
    // Determine overall readiness
    let ready = true;
    let statusCode = 200;
    
    // If Redis is required for readiness and not connected, mark as not ready
    if (redisRequiredForReadiness && !checks.redis.connected) {
      ready = false;
      statusCode = 503;
    }
    
    const readinessData = {
      ready,
      timestamp: new Date().toISOString(),
      checks,
      requirements: {
        redisRequired: redisRequiredForReadiness
      }
    };
    
    res.status(statusCode).json(readinessData);
  } catch (error) {
    logger.error('Readiness check error', { error: error.message });
    res.status(503).json({
      ready: false,
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

export default router;