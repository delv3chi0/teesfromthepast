// backend/utils/slowQueryMonitor.js
// MongoDB slow query monitoring and metrics collection
import mongoose from 'mongoose';
import { getConfig } from '../config/index.js';
import { logger } from './logger.js';

let isMonitoringEnabled = false;
let queryStats = {
  total: 0,
  slow: 0,
  slowThreshold: 1000, // Default 1 second
  slowQueries: [],
  maxSlowQueries: 100, // Keep last 100 slow queries
};

// Query performance metrics
const queryMetrics = {
  totalQueries: 0,
  slowQueries: 0,
  averageResponseTime: 0,
  responseTimeBuckets: {
    '0-100ms': 0,
    '100-500ms': 0,
    '500-1000ms': 0,
    '1000-5000ms': 0,
    '5000ms+': 0
  }
};

export function initializeSlowQueryMonitoring() {
  if (isMonitoringEnabled) return;
  
  const config = getConfig();
  queryStats.slowThreshold = config.DB_SLOW_MS || 1000;
  
  // Enable mongoose debugging with custom function
  mongoose.set('debug', function(collectionName, method, query, doc, options) {
    const startTime = Date.now();
    
    // Create a unique identifier for this query
    const queryId = `${collectionName}.${method}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Store query start time
    const queryStart = process.hrtime.bigint();
    
    // Hook into the next tick to measure execution time
    process.nextTick(() => {
      const duration = Number(process.hrtime.bigint() - queryStart) / 1e6; // Convert to milliseconds
      
      trackQueryPerformance({
        queryId,
        collection: collectionName,
        method,
        query: sanitizeQuery(query),
        duration,
        timestamp: new Date()
      });
    });
  });
  
  isMonitoringEnabled = true;
  logger.info('Slow query monitoring enabled', { 
    threshold: queryStats.slowThreshold + 'ms' 
  });
}

function sanitizeQuery(query) {
  // Remove sensitive data from query logging
  if (!query || typeof query !== 'object') return query;
  
  const sanitized = JSON.parse(JSON.stringify(query));
  
  // Remove password fields
  if (sanitized.password) sanitized.password = '[REDACTED]';
  if (sanitized.$set?.password) sanitized.$set.password = '[REDACTED]';
  
  // Limit size of large objects
  const maxSize = 1000;
  const str = JSON.stringify(sanitized);
  if (str.length > maxSize) {
    return { ...sanitized, _truncated: `Query too large (${str.length} chars)` };
  }
  
  return sanitized;
}

function trackQueryPerformance(queryInfo) {
  queryStats.total++;
  queryMetrics.totalQueries++;
  
  const { duration, collection, method, query, timestamp } = queryInfo;
  
  // Update response time buckets
  if (duration < 100) {
    queryMetrics.responseTimeBuckets['0-100ms']++;
  } else if (duration < 500) {
    queryMetrics.responseTimeBuckets['100-500ms']++;
  } else if (duration < 1000) {
    queryMetrics.responseTimeBuckets['500-1000ms']++;
  } else if (duration < 5000) {
    queryMetrics.responseTimeBuckets['1000-5000ms']++;
  } else {
    queryMetrics.responseTimeBuckets['5000ms+']++;
  }
  
  // Update average response time
  queryMetrics.averageResponseTime = 
    (queryMetrics.averageResponseTime * (queryMetrics.totalQueries - 1) + duration) / 
    queryMetrics.totalQueries;
  
  // Track slow queries
  if (duration >= queryStats.slowThreshold) {
    queryStats.slow++;
    queryMetrics.slowQueries++;
    
    const slowQuery = {
      collection,
      method,
      query,
      duration: Math.round(duration * 100) / 100, // Round to 2 decimals
      timestamp,
      stack: getCallStack()
    };
    
    // Add to slow queries list
    queryStats.slowQueries.unshift(slowQuery);
    
    // Limit the number of stored slow queries
    if (queryStats.slowQueries.length > queryStats.maxSlowQueries) {
      queryStats.slowQueries = queryStats.slowQueries.slice(0, queryStats.maxSlowQueries);
    }
    
    // Log slow query
    logger.warn('Slow database query detected', {
      collection,
      method,
      duration: duration + 'ms',
      query: JSON.stringify(query),
      threshold: queryStats.slowThreshold + 'ms'
    });
    
    // Log critical slow queries (> 5 seconds)
    if (duration > 5000) {
      logger.error('Critical slow query detected', {
        collection,
        method,
        duration: duration + 'ms',
        query: JSON.stringify(query)
      });
    }
  }
}

function getCallStack() {
  // Capture call stack to help identify where slow queries originate
  const stack = new Error().stack;
  const lines = stack.split('\n').slice(1); // Remove the Error line
  
  // Filter out internal Node.js and mongoose frames
  const relevantLines = lines
    .filter(line => 
      !line.includes('node_modules/mongoose') &&
      !line.includes('node_modules/mongodb') &&
      !line.includes('node:internal') &&
      !line.includes('at processTicksAndRejections')
    )
    .slice(0, 5); // Keep top 5 relevant stack frames
  
  return relevantLines.map(line => line.trim());
}

export function getQueryMetrics() {
  const slowQueryRate = queryStats.total > 0 
    ? (queryStats.slow / queryStats.total) * 100 
    : 0;
  
  return {
    total: queryStats.total,
    slow: queryStats.slow,
    slowThreshold: queryStats.slowThreshold,
    slowQueryRate: Math.round(slowQueryRate * 100) / 100,
    averageResponseTime: Math.round(queryMetrics.averageResponseTime * 100) / 100,
    responseTimeBuckets: { ...queryMetrics.responseTimeBuckets },
    recentSlowQueries: queryStats.slowQueries.slice(0, 10) // Last 10 slow queries
  };
}

export function getSlowQueries(limit = 10) {
  return queryStats.slowQueries.slice(0, limit);
}

export function resetQueryMetrics() {
  queryStats.total = 0;
  queryStats.slow = 0;
  queryStats.slowQueries = [];
  
  queryMetrics.totalQueries = 0;
  queryMetrics.slowQueries = 0;
  queryMetrics.averageResponseTime = 0;
  
  Object.keys(queryMetrics.responseTimeBuckets).forEach(key => {
    queryMetrics.responseTimeBuckets[key] = 0;
  });
  
  logger.info('Query metrics reset');
}

// Express middleware to add query metrics to requests
export function queryMetricsMiddleware(req, res, next) {
  // Add query metrics to request for access in routes
  req.queryMetrics = {
    get: getQueryMetrics,
    getSlowQueries,
    reset: resetQueryMetrics
  };
  
  next();
}

// Periodic metrics logging (every 5 minutes)
let metricsInterval = null;

export function startPeriodicMetricsLogging(intervalMs = 300000) { // 5 minutes default
  if (metricsInterval) return;
  
  metricsInterval = setInterval(() => {
    const metrics = getQueryMetrics();
    
    if (metrics.total > 0) {
      logger.info('Database query metrics', {
        totalQueries: metrics.total,
        slowQueries: metrics.slow,
        slowQueryRate: metrics.slowQueryRate + '%',
        averageResponseTime: metrics.averageResponseTime + 'ms',
        threshold: metrics.slowThreshold + 'ms'
      });
      
      // Alert on high slow query rate
      if (metrics.slowQueryRate > 10) { // > 10% slow queries
        logger.warn('High slow query rate detected', {
          slowQueryRate: metrics.slowQueryRate + '%',
          recentSlowQueries: metrics.recentSlowQueries.length
        });
      }
    }
  }, intervalMs);
  
  logger.info('Periodic query metrics logging started', { 
    intervalMs: intervalMs + 'ms' 
  });
}

export function stopPeriodicMetricsLogging() {
  if (metricsInterval) {
    clearInterval(metricsInterval);
    metricsInterval = null;
    logger.info('Periodic query metrics logging stopped');
  }
}

// Export histogram data for Prometheus/OTel
export function getQueryDurationHistogram() {
  const buckets = {
    '0.1': queryMetrics.responseTimeBuckets['0-100ms'],
    '0.5': queryMetrics.responseTimeBuckets['0-100ms'] + queryMetrics.responseTimeBuckets['100-500ms'],
    '1.0': queryMetrics.responseTimeBuckets['0-100ms'] + queryMetrics.responseTimeBuckets['100-500ms'] + queryMetrics.responseTimeBuckets['500-1000ms'],
    '5.0': queryMetrics.totalQueries - queryMetrics.responseTimeBuckets['5000ms+'],
    '+Inf': queryMetrics.totalQueries
  };
  
  return {
    buckets,
    count: queryMetrics.totalQueries,
    sum: queryMetrics.averageResponseTime * queryMetrics.totalQueries
  };
}

export default {
  initializeSlowQueryMonitoring,
  getQueryMetrics,
  getSlowQueries,
  resetQueryMetrics,
  queryMetricsMiddleware,
  startPeriodicMetricsLogging,
  stopPeriodicMetricsLogging,
  getQueryDurationHistogram
};