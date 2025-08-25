// backend/routes/rum.js
// Real User Monitoring endpoint for Core Web Vitals collection
import express from 'express';
import { body, validationResult } from 'express-validator';
import { getConfig } from '../config/index.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// In-memory storage for RUM data (in production, use Redis or database)
const rumData = {
  metrics: [],
  aggregated: {
    cls: { values: [], p75: 0, p95: 0, p99: 0 },
    lcp: { values: [], p75: 0, p95: 0, p99: 0 },
    fid: { values: [], p75: 0, p95: 0, p99: 0 },
    inp: { values: [], p75: 0, p95: 0, p99: 0 },
    ttfb: { values: [], p75: 0, p95: 0, p99: 0 }
  },
  lastAggregation: null,
  totalSamples: 0
};

// Validation middleware for RUM data
const validateRumData = [
  body('metrics').isArray().withMessage('Metrics must be an array'),
  body('metrics.*.name').isIn(['CLS', 'LCP', 'FID', 'INP', 'TTFB']).withMessage('Invalid metric name'),
  body('metrics.*.value').isNumeric().withMessage('Metric value must be numeric'),
  body('metrics.*.rating').optional().isIn(['good', 'needs-improvement', 'poor']).withMessage('Invalid rating'),
  body('url').isURL().withMessage('Invalid URL'),
  body('userAgent').optional().isString(),
  body('connection').optional().isString(),
  body('deviceMemory').optional().isNumeric(),
  body('timestamp').optional().isISO8601().withMessage('Invalid timestamp')
];

// RUM data collection endpoint
router.post('/', validateRumData, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid RUM data',
        details: errors.array()
      }
    });
  }

  const { metrics, url, userAgent, connection, deviceMemory, timestamp } = req.body;
  
  // Apply sampling to avoid volume explosion
  const sampleRate = getSampleRate();
  if (Math.random() > sampleRate) {
    return res.status(200).json({ ok: true, sampled: false });
  }

  const rumEvent = {
    id: generateId(),
    timestamp: timestamp || new Date().toISOString(),
    url,
    userAgent: userAgent || req.headers['user-agent'],
    connection,
    deviceMemory,
    metrics: metrics.map(metric => ({
      name: metric.name,
      value: parseFloat(metric.value),
      rating: metric.rating || classifyMetric(metric.name, metric.value)
    })),
    ip: req.ip,
    sessionId: req.headers['x-session-id'] || null,
    userId: req.user?._id?.toString() || null
  };

  // Store the event
  storeRumEvent(rumEvent);

  req.log?.info('RUM data collected', {
    metricsCount: metrics.length,
    url,
    sampleRate,
    userId: rumEvent.userId
  });

  res.json({ 
    ok: true, 
    sampled: true,
    eventId: rumEvent.id
  });
});

// Aggregated metrics endpoint (admin only)
router.get('/metrics', (req, res) => {
  // Simple protection - in production, use proper auth middleware
  const isAdmin = req.user?.isAdmin || req.headers['x-admin-key'] === process.env.ADMIN_API_KEY;
  
  if (!isAdmin) {
    return res.status(403).json({
      ok: false,
      error: { code: 'FORBIDDEN', message: 'Admin access required' }
    });
  }

  // Trigger aggregation if needed
  if (shouldAggregateMetrics()) {
    aggregateMetrics();
  }

  const stats = {
    totalSamples: rumData.totalSamples,
    lastAggregation: rumData.lastAggregation,
    sampleRate: getSampleRate(),
    metrics: Object.fromEntries(
      Object.entries(rumData.aggregated).map(([key, data]) => [
        key,
        {
          samples: data.values.length,
          p75: data.p75,
          p95: data.p95,
          p99: data.p99,
          latest: data.values.slice(-10) // Last 10 samples
        }
      ])
    )
  };

  res.json({
    ok: true,
    stats,
    timestamp: new Date().toISOString()
  });
});

// Health check for RUM system
router.get('/health', (req, res) => {
  const health = {
    status: 'ok',
    totalEvents: rumData.metrics.length,
    totalSamples: rumData.totalSamples,
    lastEvent: rumData.metrics.length > 0 ? rumData.metrics[rumData.metrics.length - 1].timestamp : null,
    memoryUsage: {
      events: rumData.metrics.length,
      aggregatedMetrics: Object.values(rumData.aggregated).reduce((sum, metric) => sum + metric.values.length, 0)
    }
  };

  res.json({
    ok: true,
    health,
    timestamp: new Date().toISOString()
  });
});

// Helper functions

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function getSampleRate() {
  const config = getConfig();
  // Adjust sample rate based on environment
  if (config.NODE_ENV === 'development') return 1.0; // 100% in dev
  if (config.NODE_ENV === 'test') return 0.0; // 0% in test
  return parseFloat(process.env.RUM_SAMPLE_RATE || '0.1'); // 10% in production
}

function classifyMetric(name, value) {
  // Web Vitals thresholds
  const thresholds = {
    CLS: { good: 0.1, poor: 0.25 },
    LCP: { good: 2500, poor: 4000 },
    FID: { good: 100, poor: 300 },
    INP: { good: 200, poor: 500 },
    TTFB: { good: 800, poor: 1800 }
  };

  const threshold = thresholds[name];
  if (!threshold) return 'unknown';

  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

function storeRumEvent(event) {
  // Add to events array
  rumData.metrics.push(event);
  rumData.totalSamples++;

  // Keep only last 1000 events in memory
  if (rumData.metrics.length > 1000) {
    rumData.metrics = rumData.metrics.slice(-1000);
  }

  // Add metrics to aggregation buckets
  for (const metric of event.metrics) {
    const aggregatedMetric = rumData.aggregated[metric.name.toLowerCase()];
    if (aggregatedMetric) {
      aggregatedMetric.values.push(metric.value);
      
      // Keep only last 100 values per metric for aggregation
      if (aggregatedMetric.values.length > 100) {
        aggregatedMetric.values = aggregatedMetric.values.slice(-100);
      }
    }
  }
}

function shouldAggregateMetrics() {
  const lastAggregation = rumData.lastAggregation;
  if (!lastAggregation) return true;
  
  const timeSinceLastAggregation = Date.now() - new Date(lastAggregation).getTime();
  return timeSinceLastAggregation > 5 * 60 * 1000; // 5 minutes
}

function aggregateMetrics() {
  for (const [metricName, data] of Object.entries(rumData.aggregated)) {
    if (data.values.length === 0) continue;

    const sorted = [...data.values].sort((a, b) => a - b);
    data.p75 = calculatePercentile(sorted, 75);
    data.p95 = calculatePercentile(sorted, 95);
    data.p99 = calculatePercentile(sorted, 99);
  }

  rumData.lastAggregation = new Date().toISOString();
  
  logger.info('RUM metrics aggregated', {
    totalSamples: rumData.totalSamples,
    activeMetrics: Object.keys(rumData.aggregated).filter(
      key => rumData.aggregated[key].values.length > 0
    )
  });
}

function calculatePercentile(sortedValues, percentile) {
  if (sortedValues.length === 0) return 0;
  
  const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))];
}

// Export metrics for Prometheus/OTel
export function getRumMetricsForExport() {
  const metrics = {};
  
  for (const [metricName, data] of Object.entries(rumData.aggregated)) {
    if (data.values.length === 0) continue;
    
    metrics[`web_vitals_${metricName}_p75`] = data.p75;
    metrics[`web_vitals_${metricName}_p95`] = data.p95;
    metrics[`web_vitals_${metricName}_p99`] = data.p99;
    metrics[`web_vitals_${metricName}_samples`] = data.values.length;
  }
  
  metrics['rum_total_samples'] = rumData.totalSamples;
  metrics['rum_events_stored'] = rumData.metrics.length;
  
  return metrics;
}

export default router;