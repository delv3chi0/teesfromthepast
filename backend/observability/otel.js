// backend/observability/otel.js
// OpenTelemetry tracing and metrics setup
// TODO: NEXT_10_BACKEND_TASKS Task 2 - Full OpenTelemetry implementation when import issues resolved

import { trace } from '@opentelemetry/api';
import { getConfig, isConfigReady } from '../config/index.js';
import { logger } from '../utils/logger.js';

let isInitialized = false;

/**
 * Initialize OpenTelemetry SDK with instrumentations
 * TODO: NEXT_10_BACKEND_TASKS Task 2 - Complete implementation with proper imports
 * 
 * Currently simplified due to ES module import issues with OpenTelemetry packages.
 * Full implementation should include:
 * - NodeSDK with auto-instrumentations
 * - OTLP and console exporters
 * - HTTP and Express instrumentation
 * - Custom job queue instrumentation
 */
export function initializeTracing() {
  if (isInitialized) {
    return;
  }

  try {
    const config = isConfigReady() ? getConfig() : null;
    const serviceName = 'teesfromthepast-backend';
    const nodeEnv = process.env.NODE_ENV || 'development';
    
    // For now, just log that tracing would be initialized
    logger.info('OpenTelemetry tracing initialized (simplified mode)', {
      serviceName,
      environment: nodeEnv,
      otlpEndpoint: config?.OTEL_EXPORTER_OTLP_ENDPOINT || 'not configured'
    });

    isInitialized = true;

  } catch (error) {
    logger.error('Failed to initialize OpenTelemetry', { error: error.message });
    // Don't throw - application should continue without tracing
  }
}

/**
 * Get trace and span IDs from active context for correlation
 * TODO: NEXT_10_BACKEND_TASKS Task 2 - Implement when full OTel SDK is working
 */
export function getTraceContext() {
  try {
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      const spanContext = activeSpan.spanContext();
      return {
        traceId: spanContext.traceId,
        spanId: spanContext.spanId,
      };
    }
  } catch (error) {
    // Silently fail if tracing not available
  }
  return { traceId: null, spanId: null };
}

/**
 * Create a custom span for manual instrumentation
 * TODO: NEXT_10_BACKEND_TASKS Task 2 - Implement when full OTel SDK is working
 */
export function createSpan(name, options = {}) {
  try {
    const tracer = trace.getTracer('teesfromthepast-backend');
    return tracer.startSpan(name, options);
  } catch (error) {
    logger.debug('Failed to create span', { name, error: error.message });
    // Return a no-op span that won't break code
    return {
      setAttributes: () => {},
      setStatus: () => {},
      recordException: () => {},
      end: () => {},
    };
  }
}

/**
 * Graceful shutdown - flush remaining spans
 * TODO: NEXT_10_BACKEND_TASKS Task 2 - Implement when full OTel SDK is working
 */
export async function shutdownTracing() {
  try {
    logger.info('OpenTelemetry shutdown completed (simplified mode)');
  } catch (error) {
    logger.error('Error during OpenTelemetry shutdown', { error: error.message });
  }
}

/**
 * Add database query instrumentation hook
 * TODO: NEXT_10_BACKEND_TASKS Task 2 - Implement when full OTel SDK is working
 */
export function instrumentDatabaseQuery(queryName, queryFn) {
  return async (...args) => {
    const start = Date.now();
    try {
      const result = await queryFn(...args);
      const duration = Date.now() - start;
      
      // Log slow queries (using config threshold)
      const config = isConfigReady() ? getConfig() : null;
      const slowThreshold = config?.DB_SLOW_MS || 1000;
      if (duration > slowThreshold) {
        logger.warn('Slow database query detected', {
          operation: queryName,
          duration,
          threshold: slowThreshold,
        });
      }
      
      return result;
    } catch (error) {
      logger.warn('Database query failed', {
        operation: queryName,
        error: error.message,
      });
      throw error;
    }
  };
}

export default {
  initializeTracing,
  getTraceContext,
  createSpan,
  shutdownTracing,
  instrumentDatabaseQuery,
};