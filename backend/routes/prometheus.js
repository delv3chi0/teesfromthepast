// backend/routes/prometheus.js
// Prometheus metrics endpoint with basic authentication
import express from 'express';
import client from 'prom-client';
import { getConfig, isConfigReady } from '../config/index.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Enable default metrics collection
client.collectDefaultMetrics({
  prefix: 'teesfromthepast_',
  timeout: 5000,
});

// Custom metrics
export const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in milliseconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 5, 15, 50, 100, 200, 300, 400, 500, 1000, 2000, 5000], // milliseconds
});

/**
 * Basic authentication middleware for metrics endpoint
 */
function authenticateMetrics(req, res, next) {
  const config = isConfigReady() ? getConfig() : null;
  
  // Check if metrics are enabled
  if (!config?.ENABLE_METRICS) {
    return res.status(404).json({ error: 'Metrics endpoint not enabled' });
  }

  // If auth token is configured, require it
  if (config.METRICS_AUTH_TOKEN) {
    const authHeader = req.headers.authorization;
    const expectedToken = `Bearer ${config.METRICS_AUTH_TOKEN}`;
    
    if (!authHeader || authHeader !== expectedToken) {
      logger.warn('Unauthorized access to metrics endpoint', {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  // TODO: NEXT_10_BACKEND_TASKS Task 2 - Add IP allowlist check if configured
  
  next();
}

/**
 * GET /metrics - Prometheus format metrics
 */
router.get('/metrics', authenticateMetrics, async (req, res) => {
  try {
    const register = client.register;
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    logger.error('Error generating metrics', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Middleware to collect HTTP metrics
 * Should be added early in the middleware stack
 */
export function collectHttpMetrics(req, res, next) {
  const start = Date.now();
  
  // Skip metrics collection for the metrics endpoint itself and health checks
  if (req.path === '/metrics' || req.path === '/health') {
    return next();
  }

  res.on('finish', () => {
    const duration = Date.now() - start;
    const route = getRoutePattern(req);
    const labels = {
      method: req.method,
      route,
      status_code: res.statusCode.toString(),
    };

    // Increment request counter
    httpRequestsTotal.inc(labels);
    
    // Record request duration
    httpRequestDuration.observe(labels, duration);
  });

  next();
}

/**
 * Extract route pattern from request for consistent labeling
 * TODO: NEXT_10_BACKEND_TASKS Task 2 - Enhance route pattern extraction for better grouping
 */
function getRoutePattern(req) {
  // Try to get the route pattern from Express
  if (req.route) {
    return req.route.path;
  }
  
  // For unmatched routes, group by first path segment
  const path = req.path;
  const segments = path.split('/').filter(Boolean);
  
  if (segments.length === 0) {
    return '/';
  }
  
  // Group API routes by first two segments
  if (segments[0] === 'api' && segments[1]) {
    return `/api/${segments[1]}`;
  }
  
  // Group other routes by first segment
  return `/${segments[0]}`;
}

export default router;