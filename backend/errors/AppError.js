// backend/errors/AppError.js
// Unified error handling classes for consistent error responses
// TODO: NEXT_10_BACKEND_TASKS Task 3 - Base error classes for unified error handling

/**
 * Base application error class
 * All application errors should extend this class
 */
export class AppError extends Error {
  constructor(message, code, httpStatus = 500, isOperational = true) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.httpStatus = httpStatus;
    this.isOperational = isOperational;
    
    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error for request validation failures
 */
export class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 'VALIDATION_ERROR', 400, true);
    this.name = 'ValidationError';
    this.details = details;
  }
}

/**
 * Authentication error for auth failures
 */
export class AuthError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 'AUTH_ERROR', 401, true);
    this.name = 'AuthError';
  }
}

/**
 * Authorization error for permission failures
 */
export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 'FORBIDDEN', 403, true);
    this.name = 'ForbiddenError';
  }
}

/**
 * Not found error for missing resources
 */
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 'NOT_FOUND', 404, true);
    this.name = 'NotFoundError';
  }
}

/**
 * Rate limiting error
 */
export class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded') {
    super(message, 'RATE_LIMIT_EXCEEDED', 429, true);
    this.name = 'RateLimitError';
  }
}

/**
 * Internal server error for unexpected failures
 */
export class InternalError extends AppError {
  constructor(message = 'Internal server error', isOperational = false) {
    super(message, 'INTERNAL_ERROR', 500, isOperational);
    this.name = 'InternalError';
  }
}

/**
 * Database error for database-related failures
 */
export class DatabaseError extends AppError {
  constructor(message = 'Database error', isOperational = true) {
    super(message, 'DATABASE_ERROR', 500, isOperational);
    this.name = 'DatabaseError';
  }
}

/**
 * External service error for third-party API failures
 */
export class ExternalServiceError extends AppError {
  constructor(message = 'External service error', service = 'unknown') {
    super(message, 'EXTERNAL_SERVICE_ERROR', 502, true);
    this.name = 'ExternalServiceError';
    this.service = service;
  }
}

export default {
  AppError,
  ValidationError,
  AuthError,
  ForbiddenError,
  NotFoundError,
  RateLimitError,
  InternalError,
  DatabaseError,
  ExternalServiceError,
};