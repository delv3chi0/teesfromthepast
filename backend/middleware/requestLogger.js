// Structured request logging middleware
import logger from '../utils/logger.js';

export function requestLogger(req, res, next) {
  if (req.path === "/health") return next();
  
  const startTime = Date.now();
  
  // Generate request metadata
  const reqMeta = {
    reqId: req.id || "-",
    method: req.method,
    path: req.originalUrl,
    userAgent: req.get('User-Agent'),
    ip: req.ip || 
        req.get('x-forwarded-for')?.split(',')[0]?.trim() || 
        req.connection?.remoteAddress || 
        'unknown'
  };

  // Log request start
  logger.info('Request started', reqMeta);

  res.on("finish", () => {
    const durationMs = Date.now() - startTime;
    
    const resMeta = {
      ...reqMeta,
      status: res.statusCode,
      durationMs,
      userId: req.user?._id?.toString() || null,
      sessionId: req.sessionId || null
    };

    // Log based on status code
    if (res.statusCode >= 500) {
      logger.error('Request completed with server error', resMeta);
    } else if (res.statusCode >= 400) {
      logger.warn('Request completed with client error', resMeta);
    } else {
      logger.info('Request completed successfully', resMeta);
    }
  });
  
  next();
}

export default requestLogger;
