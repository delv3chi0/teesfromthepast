// backend/utils/logger.js
import pino from 'pino';
import pretty from 'pino-pretty';

// Configuration from environment
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOG_PRETTY = process.env.LOG_PRETTY === '1';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Create transport for pretty printing in development
const transport = LOG_PRETTY && NODE_ENV !== 'production'
  ? pretty({
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
      singleLine: false
    })
  : undefined;

// Create logger instance
const logger = pino(
  {
    level: LOG_LEVEL,
    // Base logger configuration
    base: {
      pid: process.pid,
      hostname: process.env.HOSTNAME || 'unknown'
    },
    // Timestamp formatting
    timestamp: () => `,"ts":"${new Date().toISOString()}"`,
    // Custom serializers
    serializers: {
      req: (req) => ({
        id: req.id,
        method: req.method,
        url: req.url,
        path: req.path,
        userId: req.user?.id,
        ip: req.client?.ip || req.ip
      }),
      res: (res) => ({
        statusCode: res.statusCode
      }),
      err: pino.stdSerializers.err
    }
  },
  transport
);

// Helper function to create child loggers with context
export function createLogger(context = {}) {
  return logger.child(context);
}

// Request logger middleware
export function createRequestLogger() {
  return (req, res, next) => {
    // Skip health check to reduce noise
    if (req.path === '/health' || req.path === '/healthz') {
      return next();
    }

    const start = process.hrtime.bigint();
    const reqId = req.id || 'unknown';
    
    // Create request-scoped logger
    req.logger = logger.child({ reqId });

    res.on('finish', () => {
      const durationNs = process.hrtime.bigint() - start;
      const durationMs = Number(durationNs) / 1e6;

      const logData = {
        reqId,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: Math.round(durationMs * 100) / 100,
        userId: req.user?.id,
        ip: req.client?.ip || req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim()
      };

      if (res.statusCode >= 400) {
        req.logger.warn(logData, 'HTTP request completed with error');
      } else {
        req.logger.info(logData, 'HTTP request completed');
      }
    });

    next();
  };
}

// Security event logger
export function logSecurityEvent(event, details = {}) {
  logger.warn({
    event: 'security',
    type: event,
    ...details,
    timestamp: new Date().toISOString()
  }, `Security event: ${event}`);
}

// Error logger for global error handler
export function logError(error, context = {}) {
  const errorData = {
    error: {
      name: error.name,
      message: error.message,
      stack: NODE_ENV !== 'production' ? error.stack : undefined
    },
    ...context
  };

  logger.error(errorData, `Error: ${error.message}`);
}

export default logger;