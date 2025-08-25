// backend/utils/logger.js
// Structured logging with safe lazy initialization & correlation support.
import pino from 'pino';
import { isConfigReady, getConfig } from '../config/index.js';

// Internal singleton
let baseLogger;

/**
 * Build the pino logger using validated config if present; otherwise fall back
 * to environment LOG_LEVEL (so early imports in tests/scripts do not crash).
 */
function buildLogger() {
  let level = process.env.LOG_LEVEL || 'info';
  let nodeEnv = process.env.NODE_ENV || 'development';

  if (isConfigReady()) {
    try {
      const cfg = getConfig();
      level = cfg.LOG_LEVEL;
      nodeEnv = cfg.NODE_ENV;
    } catch {
      // Intentionally ignore; strict getConfig throwing means not validated yet.
    }
  }

  const loggerConfig = {
    level,
    formatters: {
      level: (label) => ({ level: label }),
    },
    redact: {
      paths: [
        'password',
        'token',
        'authorization',
        'cookie',
        'cookies',
        'req.headers.authorization',
        'req.headers.cookie',
        'res.headers["set-cookie"]',
        '*.password',
        '*.token',
        '*.secret',
        'payload.password',
        'payload.token',
        'meta.password',
        'meta.token'
      ],
      censor: '[Redacted]'
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  };

  if (nodeEnv === 'development') {
    loggerConfig.transport = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss.l',
        ignore: 'pid,hostname',
      }
    };
  }

  return pino(loggerConfig);
}

function getBaseLogger() {
  if (!baseLogger) {
    baseLogger = buildLogger();
  }
  return baseLogger;
}

/**
 * Create a child logger with optional correlation/meta fields.
 */
export function createCorrelatedLogger(traceId, spanId, requestId, userId = null, sessionJti = null) {
  const childContext = {};
  if (traceId) childContext.traceId = traceId;
  if (spanId) childContext.spanId = spanId;
  if (requestId) childContext.requestId = requestId;
  if (userId) childContext.userId = userId;
  if (sessionJti) childContext.sessionJti = sessionJti;
  return getBaseLogger().child(childContext);
}

/**
 * Express middleware to attach a request-scoped logger.
 */
export function createRequestLogger(req, res, next) {
  const requestId = req.id || 'unknown';
  const userId = req.user?._id?.toString() || null;
  const sessionJti = req.headers['x-session-id'] || null;

  // Placeholder until integrated with actual OpenTelemetry context extraction.
  const traceId = req.headers['x-trace-id'] || null;
  const spanId = req.headers['x-span-id'] || null;

  req.log = createCorrelatedLogger(traceId, spanId, requestId, userId, sessionJti);

  if (req.path !== '/health') {
    req.log.info({
      msg: 'Request started',
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
  }

  const start = process.hrtime.bigint();
  res.on('finish', () => {
    if (req.path !== '/health') {
      const duration = Number(process.hrtime.bigint() - start) / 1e6;
      req.log.info({
        msg: 'Request completed',
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration: Math.round(duration * 100) / 100,
        contentLength: res.get('content-length') || 0
      });
    }
  });

  next();
}

// Named export maintaining your original import style (import { logger } ...).
export const logger = getBaseLogger();
export default logger;
