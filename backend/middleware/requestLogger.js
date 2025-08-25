// backend/middleware/requestLogger.js
// Request correlation and logging middleware

import { randomUUID } from 'crypto';
import logger from '../utils/logger.js';

export function requestLogger(req, res, next) {
  // Generate unique request ID
  const rid = randomUUID();
  const startTime = Date.now();
  
  // Attach request ID and child logger to request
  req.id = rid;
  req.log = logger.child({ 
    rid,
    ip: req.ip || req.connection?.remoteAddress || 'unknown'
  });

  // Set X-Request-ID header in response
  res.setHeader('X-Request-ID', rid);

  // Log request start
  req.log.info('request.start', {
    method: req.method,
    path: req.path,
    url: req.url,
    userAgent: req.headers['user-agent'],
    origin: req.headers.origin,
    contentLength: req.headers['content-length']
  });

  // Capture original res.end to log completion
  const originalEnd = res.end;
  let finished = false;

  res.end = function(chunk, encoding) {
    if (!finished) {
      finished = true;
      const durationMs = Date.now() - startTime;
      const contentLength = res.getHeader('content-length') || 
        (chunk ? Buffer.byteLength(chunk, encoding) : 0);

      req.log.info('request.finish', {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs,
        contentLength: contentLength || 0
      });
    }
    originalEnd.call(this, chunk, encoding);
  };

  // Handle premature connection close
  req.on('close', () => {
    if (!finished) {
      finished = true;
      const durationMs = Date.now() - startTime;
      req.log.warn('request.aborted', {
        method: req.method,
        path: req.path,
        durationMs
      });
    }
  });

  next();
}