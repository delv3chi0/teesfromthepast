// backend/middleware/errorHandler.js
// Global error handling middleware

import logger from '../utils/logger.js';

// 404 handler - sets a 404 error
export function notFound(req, res, next) {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.status = 404;
  next(error);
}

// Global error handler
export function errorHandler(err, req, res, next) {
  // Use request logger if available, otherwise use default logger
  const log = req.log || logger;
  
  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  // Log the error with appropriate level
  const logData = {
    error: message,
    status: statusCode,
    method: req.method,
    path: req.path,
    url: req.url,
    userAgent: req.headers['user-agent'],
    ip: req.ip
  };

  // Add stack trace in development, but not in production
  if (process.env.NODE_ENV !== 'production' && err.stack) {
    logData.stack = err.stack;
  }

  if (statusCode >= 500) {
    log.error('request.error', logData);
  } else {
    log.warn('request.client_error', logData);
  }

  // Prepare response
  const errorResponse = {
    error: {
      message,
      status: statusCode
    }
  };

  // Include request ID if available
  if (req.id) {
    errorResponse.error.rid = req.id;
  }

  // Only include stack trace in development
  if (process.env.NODE_ENV !== 'production' && err.stack) {
    errorResponse.error.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
}