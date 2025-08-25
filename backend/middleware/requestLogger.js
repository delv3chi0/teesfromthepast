// backend/middleware/requestLogger.js
// Lightweight request logging with duration and request ID

/**
 * Middleware to log requests after response finish
 * Logs: method, path, status, duration, request ID
 * Skips: /health endpoint
 */
export function requestLogger(req, res, next) {
  // Skip health checks
  if (req.path === '/health') {
    return next();
  }
  
  const startTime = Date.now();
  
  // Log after response finishes
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const { method, path } = req;
    const { statusCode } = res;
    const reqId = req.id || 'unknown';
    
    console.log(`${method} ${path} ${statusCode} ${duration}ms [${reqId}]`);
  });
  
  next();
}