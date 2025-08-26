// backend/routes/health.js
// Health and readiness endpoints with detailed system information
import express from 'express';
import { isConfigReady, getConfig } from '../config/index.js';
import { getRateLimitConfig, getMetricsConfig } from '../config/dynamicConfig.js';
import { getVersionInfo } from '../version/index.js';
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
    
    // Get rate limiter configuration from dynamic config
    let rateLimiterInfo;
    let metricsEnabled;
    try {
      const rateLimitConfig = getRateLimitConfig();
      const metricsConfig = getMetricsConfig();
      rateLimiterInfo = {
        algorithm: rateLimitConfig.algorithm,
        enabled: !!process.env.REDIS_URL || !!getConfig()?.REDIS_URL
      };
      metricsEnabled = metricsConfig.enabled;
    } catch {
      // Fallback to static configuration
      if (isConfigReady()) {
        const config = getConfig();
        rateLimiterInfo = {
          algorithm: config.RATE_LIMIT_ALGORITHM || 'fixed',
          enabled: !!config.REDIS_URL
        };
        metricsEnabled = config.ENABLE_METRICS !== false;
      } else {
        rateLimiterInfo = {
          algorithm: process.env.RATE_LIMIT_ALGORITHM || 'fixed',
          enabled: !!process.env.REDIS_URL
        };
        const nodeEnv = process.env.NODE_ENV || 'development';
        metricsEnabled = nodeEnv === 'production' 
          ? process.env.ENABLE_METRICS === 'true'
          : process.env.ENABLE_METRICS !== 'false';
      }
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
      runtime: {
        rateLimitAlgorithm: rateLimiterInfo.algorithm,
        metricsEnabled
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
    
    // Get runtime information for readiness
    let runtime = {};
    try {
      const rateLimitConfig = getRateLimitConfig();
      const metricsConfig = getMetricsConfig();
      runtime = {
        rateLimitAlgorithm: rateLimitConfig.algorithm,
        metricsEnabled: metricsConfig.enabled
      };
    } catch {
      // Use defaults if dynamic config fails
      runtime = {
        rateLimitAlgorithm: 'fixed',
        metricsEnabled: true
      };
    }
    
    const readinessData = {
      ready,
      timestamp: new Date().toISOString(),
      checks,
      requirements: {
        redisRequired: redisRequiredForReadiness
      },
      runtime
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