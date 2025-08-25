// backend/utils/errorMonitoring.js
// Error monitoring and alert ingestion using Sentry
import * as Sentry from '@sentry/node';
import { getConfig } from '../config/index.js';
import { logger } from './logger.js';

let initialized = false;

export function initializeErrorMonitoring() {
  if (initialized) return;
  
  const config = getConfig();
  
  // Only initialize if DSN is provided
  if (!process.env.SENTRY_DSN) {
    logger.info('Sentry DSN not provided, using mock error monitoring');
    return;
  }
  
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: config.NODE_ENV,
    // Performance Monitoring
    tracesSampleRate: config.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    beforeSend(event) {
      // Add custom context to all events
      if (event.request?.headers) {
        // Remove sensitive headers
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
      }
      
      return event;
    },
  });
  
  initialized = true;
  logger.info('Sentry error monitoring initialized', { 
    environment: config.NODE_ENV
  });
}

// Mock Sentry for development/testing when no DSN is provided
const mockSentry = {
  captureException: (error, context) => {
    logger.error('Exception captured (mock)', { 
      error: error.message, 
      stack: error.stack,
      context 
    });
    return 'mock-event-id-' + Date.now();
  },
  captureMessage: (message, level, context) => {
    logger[level] || logger.info('Message captured (mock)', { 
      message, 
      level, 
      context 
    });
    return 'mock-event-id-' + Date.now();
  },
  setUser: (user) => {
    logger.debug('User context set (mock)', { user });
  },
  setTag: (key, value) => {
    logger.debug('Tag set (mock)', { key, value });
  },
  setContext: (name, context) => {
    logger.debug('Context set (mock)', { name, context });
  },
  addBreadcrumb: (breadcrumb) => {
    logger.debug('Breadcrumb added (mock)', { breadcrumb });
  }
};

// Export either real Sentry or mock
export const sentry = process.env.SENTRY_DSN ? Sentry : mockSentry;

// Express error handler middleware
export function sentryErrorHandler(err, req, res, next) {
  // Capture the error with Sentry
  const eventId = sentry.captureException(err, {
    user: req.user ? {
      id: req.user._id?.toString(),
      username: req.user.username,
      email: req.user.email
    } : undefined,
    tags: {
      method: req.method,
      path: req.path,
      ip: req.ip
    },
    extra: {
      requestId: req.id,
      headers: {
        'user-agent': req.headers['user-agent'],
        'x-forwarded-for': req.headers['x-forwarded-for'],
      },
      body: req.body && Object.keys(req.body).length > 0 ? '[REDACTED]' : undefined
    }
  });
  
  // Log with our structured logger
  req.log?.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    eventId,
    statusCode: err.statusCode || 500
  });
  
  // Return error response with event ID
  const statusCode = err.statusCode || 500;
  const errorResponse = {
    ok: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: getConfig().NODE_ENV === 'development' ? err.message : 'Internal server error'
    },
    requestId: req.id,
    errorRef: eventId
  };
  
  // Include stack trace in development
  if (getConfig().NODE_ENV === 'development' && statusCode >= 500) {
    errorResponse.error.stack = err.stack;
  }
  
  res.status(statusCode).json(errorResponse);
}

// Wrap async route handlers to catch unhandled promise rejections
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Enhanced audit logging for failed actions
export function logFailedAction(req, action, error, details = {}) {
  const errorId = sentry.captureException(error, {
    tags: { 
      action: action,
      failed: true
    },
    user: req.user ? {
      id: req.user._id?.toString(),
      username: req.user.username
    } : undefined,
    extra: details
  });
  
  req.log?.error('Action failed', {
    action,
    error: error.message,
    details,
    errorRef: errorId
  });
  
  return errorId;
}

export default { 
  initializeErrorMonitoring, 
  sentry, 
  sentryErrorHandler, 
  asyncHandler, 
  logFailedAction 
};