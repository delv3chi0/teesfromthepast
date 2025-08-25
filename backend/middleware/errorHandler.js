// backend/middleware/errorHandler.js
// Central error handling middleware for unified error responses
// TODO: NEXT_10_BACKEND_TASKS Task 3 - Central error middleware with tracing integration

import { AppError } from '../errors/AppError.js';
import { logger } from '../utils/logger.js';
import { z } from 'zod';

// Import OpenTelemetry API for trace context
let otelTrace;
try {
  const otel = await import('@opentelemetry/api');
  otelTrace = otel.trace;
} catch {
  // OTel not available
  otelTrace = null;
}

/**
 * Get current trace ID for error correlation
 */
function getTraceId() {
  if (otelTrace) {
    try {
      const activeSpan = otelTrace.getActiveSpan();
      if (activeSpan) {
        return activeSpan.spanContext().traceId;
      }
    } catch {
      // Silently fail
    }
  }
  return null;
}

/**
 * Convert Zod validation errors to our error format
 */
function convertZodError(zodError) {
  const details = zodError.errors.map(err => ({
    field: err.path.join('.'),
    code: err.code,
    message: err.message,
  }));

  return {
    code: 'VALIDATION_ERROR',
    message: 'Request validation failed',
    details,
  };
}

/**
 * Convert Mongoose validation errors to our error format
 */
function convertMongooseError(mongooseError) {
  if (mongooseError.name === 'ValidationError') {
    const details = Object.values(mongooseError.errors).map(err => ({
      field: err.path,
      code: 'VALIDATION_ERROR',
      message: err.message,
    }));

    return {
      code: 'VALIDATION_ERROR',
      message: 'Database validation failed',
      details,
    };
  }

  if (mongooseError.name === 'CastError') {
    return {
      code: 'VALIDATION_ERROR',
      message: `Invalid ${mongooseError.path}: ${mongooseError.value}`,
    };
  }

  if (mongooseError.code === 11000) {
    const field = Object.keys(mongooseError.keyValue)[0];
    return {
      code: 'VALIDATION_ERROR',
      message: `${field} already exists`,
      details: [{ field, code: 'DUPLICATE_VALUE', message: 'Value must be unique' }],
    };
  }

  return {
    code: 'DATABASE_ERROR',
    message: 'Database operation failed',
  };
}

/**
 * Convert various error types to our unified format
 */
function normalizeError(err) {
  // Handle our AppError types
  if (err instanceof AppError) {
    return {
      code: err.code,
      message: err.message,
      httpStatus: err.httpStatus,
      isOperational: err.isOperational,
      details: err.details || null,
    };
  }

  // Handle Zod validation errors
  if (err instanceof z.ZodError) {
    const normalized = convertZodError(err);
    return {
      ...normalized,
      httpStatus: 400,
      isOperational: true,
    };
  }

  // Handle Mongoose errors
  if (err.name && ['ValidationError', 'CastError'].includes(err.name) || err.code === 11000) {
    const normalized = convertMongooseError(err);
    return {
      ...normalized,
      httpStatus: 400,
      isOperational: true,
    };
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return {
      code: 'AUTH_ERROR',
      message: 'Invalid or expired token',
      httpStatus: 401,
      isOperational: true,
    };
  }

  // Handle CORS errors
  if (err.message && /CORS/i.test(err.message)) {
    return {
      code: 'CORS_ERROR',
      message: 'CORS policy violation',
      httpStatus: 403,
      isOperational: true,
    };
  }

  // Handle unknown errors
  return {
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
    httpStatus: 500,
    isOperational: false,
    originalMessage: err.message,
  };
}

/**
 * Central error handling middleware
 * Should be placed after all routes and other middleware
 */
export function errorHandler(err, req, res, next) {
  // Normalize the error
  const normalized = normalizeError(err);
  const traceId = getTraceId();

  // Build error response
  const errorResponse = {
    error: {
      code: normalized.code,
      message: normalized.message,
    },
  };

  // Add details if present
  if (normalized.details) {
    errorResponse.error.details = normalized.details;
  }

  // Add trace ID for correlation
  if (traceId) {
    errorResponse.error.traceId = traceId;
  }

  // Log the error with appropriate level
  const logLevel = normalized.isOperational ? 'warn' : 'error';
  const logContext = {
    error: {
      name: err.name,
      message: err.message,
      code: normalized.code,
      httpStatus: normalized.httpStatus,
      isOperational: normalized.isOperational,
      stack: err.stack,
    },
    request: {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      userId: req.user?._id?.toString(),
    },
    traceId,
  };

  // Use request-scoped logger if available
  const contextLogger = req.log || logger;
  contextLogger[logLevel]('Request error', logContext);

  // Record exception in tracing if available
  if (otelTrace) {
    try {
      const activeSpan = otelTrace.getActiveSpan();
      if (activeSpan) {
        activeSpan.recordException(err);
        activeSpan.setStatus({ code: 2, message: normalized.message }); // ERROR
      }
    } catch {
      // Silently fail
    }
  }

  // Send error response
  if (!res.headersSent) {
    res.status(normalized.httpStatus).json(errorResponse);
  }
}

/**
 * 404 handler for unmatched routes
 * Should be placed after all routes but before error handler
 */
export function notFoundHandler(req, res, next) {
  const error = {
    error: {
      code: 'NOT_FOUND',
      message: 'Resource not found',
    },
  };

  // Add trace ID if available
  const traceId = getTraceId();
  if (traceId) {
    error.error.traceId = traceId;
  }

  // Log 404 with request context
  const contextLogger = req.log || logger;
  contextLogger.warn('Resource not found', {
    request: {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    },
    traceId,
  });

  res.status(404).json(error);
}

export default {
  errorHandler,
  notFoundHandler,
};