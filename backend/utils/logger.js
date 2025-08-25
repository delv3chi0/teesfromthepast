// backend/utils/logger.js
// Structured logging with trace correlation using pino
import pino from 'pino';
import { getConfig } from '../config/index.js';

const config = getConfig();

// Create base logger configuration
const loggerConfig = {
  level: config.LOG_LEVEL,
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

// In development, use pretty printing; in production, use JSON
if (config.NODE_ENV === 'development') {
  loggerConfig.transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss.l',
      ignore: 'pid,hostname',
    }
  };
}

const logger = pino(loggerConfig);

// Create child logger with correlation IDs from OpenTelemetry context
export function createCorrelatedLogger(traceId, spanId, requestId, userId = null, sessionJti = null) {
  const childContext = {};
  
  if (traceId) childContext.traceId = traceId;
  if (spanId) childContext.spanId = spanId;
  if (requestId) childContext.requestId = requestId;
  if (userId) childContext.userId = userId;
  if (sessionJti) childContext.sessionJti = sessionJti;
  
  return logger.child(childContext);
}

// Request-scoped logger middleware
export function createRequestLogger(req, res, next) {
  // Extract or generate correlation IDs
  const requestId = req.id || 'unknown';
  const userId = req.user?._id?.toString() || null;
  const sessionJti = req.headers['x-session-id'] || null;
  
  // TODO: Extract from OpenTelemetry context when available
  // For now, generate simple IDs
  const traceId = req.headers['x-trace-id'] || null;
  const spanId = req.headers['x-span-id'] || null;
  
  // Create request-scoped logger
  req.log = createCorrelatedLogger(traceId, spanId, requestId, userId, sessionJti);
  
  // Log request start
  if (req.path !== '/health') {
    req.log.info({
      msg: 'Request started',
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
  }
  
  // Log response on finish
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    if (req.path !== '/health') {
      const duration = Number(process.hrtime.bigint() - start) / 1e6; // Convert to milliseconds
      
      req.log.info({
        msg: 'Request completed',
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration: Math.round(duration * 100) / 100, // Round to 2 decimals
        contentLength: res.get('content-length') || 0
      });
    }
  });
  
  next();
}

export { logger };
export default logger;