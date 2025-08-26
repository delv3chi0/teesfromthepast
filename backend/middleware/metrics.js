// backend/middleware/metrics.js
// Prometheus metrics collection middleware
import client from 'prom-client';
import { isConfigReady, getConfig } from '../config/index.js';
import { logger } from '../utils/logger.js';

// Initialize default metrics collection
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ timeout: 5000 });

// Define custom metrics
const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5, 10],
});

const rateLimitedTotal = new client.Counter({
  name: 'rate_limited_total',
  help: 'Total number of rate limited requests',
  labelNames: ['algorithm', 'route'],
});

const redisErrorsTotal = new client.Counter({
  name: 'redis_errors_total',
  help: 'Total number of Redis errors',
  labelNames: ['operation'],
});

// Export metrics for use by other modules
export { rateLimitedTotal, redisErrorsTotal };

// Check if metrics are enabled
function isMetricsEnabled() {
  if (isConfigReady()) {
    const config = getConfig();
    return config.ENABLE_METRICS !== false;
  }
  
  // Default to true in non-production, must be explicitly enabled in production
  const nodeEnv = process.env.NODE_ENV || 'development';
  if (nodeEnv === 'production') {
    return process.env.ENABLE_METRICS === 'true';
  }
  return process.env.ENABLE_METRICS !== 'false';
}

// Middleware to collect HTTP metrics
export function metricsMiddleware(req, res, next) {
  if (!isMetricsEnabled()) {
    return next();
  }

  const start = Date.now();
  
  // Extract route pattern for better labeling
  const routePattern = req.route?.path || req.path;
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const labels = {
      method: req.method,
      route: routePattern,
      status_code: res.statusCode,
    };
    
    httpRequestsTotal.inc(labels);
    httpRequestDuration.observe(labels, duration);
  });
  
  next();
}

// Metrics endpoint handler
export function getMetricsHandler(req, res) {
  if (!isMetricsEnabled()) {
    return res.status(404).json({
      error: {
        code: 'METRICS_DISABLED',
        message: 'Metrics collection is disabled'
      }
    });
  }
  
  try {
    res.set('Content-Type', client.register.contentType);
    res.end(client.register.metrics());
  } catch (error) {
    logger.error('Error generating metrics', { error: error.message });
    res.status(500).json({
      error: {
        code: 'METRICS_ERROR',
        message: 'Error generating metrics'
      }
    });
  }
}

// Helper function to increment rate limited counter
export function incrementRateLimited(algorithm, route) {
  if (isMetricsEnabled()) {
    rateLimitedTotal.inc({ algorithm, route });
  }
}

// Helper function to increment Redis errors counter
export function incrementRedisErrors(operation) {
  if (isMetricsEnabled()) {
    redisErrorsTotal.inc({ operation });
  }
}