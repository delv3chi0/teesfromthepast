// backend/observability/otel.js
// OpenTelemetry tracing and metrics setup
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-node';
import { trace, context } from '@opentelemetry/api';
import { getConfig, isConfigReady } from '../config/index.js';
import { logger } from '../utils/logger.js';

let sdk;
let isInitialized = false;

/**
 * Initialize OpenTelemetry SDK with instrumentations
 * TODO: NEXT_10_BACKEND_TASKS Task 2 - Add custom job queue instrumentation when implemented
 */
export function initializeTracing() {
  if (isInitialized) {
    return;
  }

  try {
    const config = isConfigReady() ? getConfig() : null;
    const serviceName = 'teesfromthepast-backend';
    const serviceVersion = '1.0.0'; // TODO: Read from package.json
    
    // Configure exporters based on environment
    const exporters = [];
    
    // Add OTLP exporter if endpoint is configured
    if (config?.OTEL_EXPORTER_OTLP_ENDPOINT) {
      exporters.push(
        new OTLPTraceExporter({
          url: config.OTEL_EXPORTER_OTLP_ENDPOINT,
        })
      );
      logger.info('OpenTelemetry OTLP exporter configured', { 
        endpoint: config.OTEL_EXPORTER_OTLP_ENDPOINT 
      });
    }
    
    // Add console exporter in development
    const nodeEnv = process.env.NODE_ENV || 'development';
    if (nodeEnv === 'development') {
      exporters.push(new ConsoleSpanExporter());
    }

    // Create resource information
    const resource = new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
      [SemanticResourceAttributes.SERVICE_VERSION]: serviceVersion,
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: nodeEnv,
    });

    // Initialize SDK with instrumentations
    sdk = new NodeSDK({
      resource,
      traceExporter: exporters.length > 0 ? exporters[0] : undefined, // NodeSDK accepts single exporter
      instrumentations: [
        // Auto-instrumentations for common libraries
        getNodeAutoInstrumentations({
          // Disable some instrumentations we'll configure manually
          '@opentelemetry/instrumentation-http': false,
          '@opentelemetry/instrumentation-express': false,
          // TODO: Enable pg instrumentation when database queries need monitoring
          '@opentelemetry/instrumentation-pg': false,
        }),
        
        // Manual instrumentations with custom config
        new HttpInstrumentation({
          // Filter out health check noise
          ignoreIncomingRequestHook: (req) => {
            return req.url === '/health';
          },
        }),
        
        new ExpressInstrumentation({
          // Add custom attributes
          requestHook: (span, info) => {
            span.setAttributes({
              'http.route': info.route,
            });
          },
        }),
      ],
    });

    // Start the SDK
    sdk.start();
    isInitialized = true;
    
    logger.info('OpenTelemetry initialized successfully', {
      serviceName,
      serviceVersion,
      exporters: exporters.length,
      environment: nodeEnv
    });

  } catch (error) {
    logger.error('Failed to initialize OpenTelemetry', { error: error.message });
    // Don't throw - application should continue without tracing
  }
}

/**
 * Get trace and span IDs from active context for correlation
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
 * TODO: NEXT_10_BACKEND_TASKS Task 2 - Use for job queue operations when implemented
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
 */
export async function shutdownTracing() {
  if (sdk) {
    try {
      await sdk.shutdown();
      logger.info('OpenTelemetry shutdown completed');
    } catch (error) {
      logger.error('Error during OpenTelemetry shutdown', { error: error.message });
    }
  }
}

/**
 * Add database query instrumentation hook
 * TODO: NEXT_10_BACKEND_TASKS Task 2 - Implement actual DB query timing when DB hooks available
 */
export function instrumentDatabaseQuery(queryName, queryFn) {
  return async (...args) => {
    const span = createSpan(`db.${queryName}`, {
      kind: 1, // SPAN_KIND_CLIENT
      attributes: {
        'db.system': 'mongodb',
        'db.operation': queryName,
      },
    });

    const start = Date.now();
    try {
      const result = await queryFn(...args);
      const duration = Date.now() - start;
      
      span.setAttributes({
        'db.duration_ms': duration,
      });
      
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
      
      span.setStatus({ code: 1 }); // OK
      return result;
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: 2, message: error.message }); // ERROR
      throw error;
    } finally {
      span.end();
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