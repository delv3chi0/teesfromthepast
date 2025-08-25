// backend/middleware/validate.js
// Request and response schema validation middleware using Zod
// TODO: NEXT_10_BACKEND_TASKS Task 5 - Request validation middleware factory

import { z } from 'zod';
import { ValidationError } from '../errors/AppError.js';
import { logger } from '../utils/logger.js';

/**
 * Validation middleware factory
 * Creates middleware that validates request parameters, body, and query against Zod schemas
 * 
 * @param {Object} schemas - Object containing validation schemas
 * @param {z.ZodSchema} schemas.params - Schema for req.params
 * @param {z.ZodSchema} schemas.body - Schema for req.body  
 * @param {z.ZodSchema} schemas.query - Schema for req.query
 * @returns {Function} Express middleware function
 */
export function validate(schemas = {}) {
  return (req, res, next) => {
    try {
      const validated = {};
      
      // Validate params if schema provided
      if (schemas.params) {
        try {
          validated.params = schemas.params.parse(req.params);
        } catch (error) {
          if (error instanceof z.ZodError) {
            throw new ValidationError('Invalid request parameters', formatZodErrors(error, 'params'));
          }
          throw error;
        }
      }
      
      // Validate body if schema provided
      if (schemas.body) {
        try {
          validated.body = schemas.body.parse(req.body);
        } catch (error) {
          if (error instanceof z.ZodError) {
            throw new ValidationError('Invalid request body', formatZodErrors(error, 'body'));
          }
          throw error;
        }
      }
      
      // Validate query if schema provided
      if (schemas.query) {
        try {
          validated.query = schemas.query.parse(req.query);
        } catch (error) {
          if (error instanceof z.ZodError) {
            throw new ValidationError('Invalid query parameters', formatZodErrors(error, 'query'));
          }
          throw error;
        }
      }
      
      // Attach validated data to request
      req.validated = validated;
      
      // Log successful validation in development
      if (process.env.NODE_ENV === 'development') {
        logger.debug('Request validation passed', {
          url: req.originalUrl,
          method: req.method,
          validatedFields: Object.keys(validated),
        });
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Format Zod validation errors for better error messages
 */
function formatZodErrors(zodError, source) {
  return zodError.errors.map(err => ({
    field: `${source}.${err.path.join('.')}`,
    code: err.code,
    message: err.message,
    expected: err.expected || null,
    received: err.received || null,
  }));
}

/**
 * Common validation schemas for reuse across routes
 * TODO: NEXT_10_BACKEND_TASKS Task 5 - Expand common schemas for all route types
 */
export const commonSchemas = {
  // MongoDB ObjectId validation
  objectId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format'),
  
  // Pagination parameters
  pagination: z.object({
    page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
    limit: z.string().optional().transform(val => val ? Math.min(parseInt(val, 10) || 20, 100) : 20),
    sort: z.string().optional(),
    order: z.enum(['asc', 'desc']).optional().default('desc'),
  }),
  
  // Email validation
  email: z.string().email('Invalid email format'),
  
  // Password validation (basic)
  password: z.string().min(8, 'Password must be at least 8 characters'),
  
  // URL validation
  url: z.string().url('Invalid URL format'),
  
  // Search query
  search: z.object({
    q: z.string().min(1, 'Search query cannot be empty').max(100, 'Search query too long'),
  }),
};

/**
 * Example validation middleware usage on a route
 * TODO: NEXT_10_BACKEND_TASKS Task 5 - Apply to one existing route as demonstration
 */
export const exampleValidation = {
  // Example: GET /api/users/:id
  getUserById: validate({
    params: z.object({
      id: commonSchemas.objectId,
    }),
  }),
  
  // Example: POST /api/users
  createUser: validate({
    body: z.object({
      email: commonSchemas.email,
      password: commonSchemas.password,
      name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
      role: z.enum(['user', 'admin']).optional().default('user'),
    }),
  }),
  
  // Example: GET /api/users with pagination and search
  getUsers: validate({
    query: commonSchemas.pagination.merge(
      z.object({
        search: z.string().optional(),
        role: z.enum(['user', 'admin']).optional(),
      })
    ),
  }),
};

/**
 * Response validation middleware (optional)
 * Validates outgoing responses to ensure API contract compliance
 * TODO: NEXT_10_BACKEND_TASKS Task 5 - Response validation for API contract enforcement
 */
export function validateResponse(schema) {
  return (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);
    
    // Override json method to validate response
    res.json = function(data) {
      try {
        // Validate response data
        const validatedData = schema.parse(data);
        
        // Log response validation in development
        if (process.env.NODE_ENV === 'development') {
          logger.debug('Response validation passed', {
            url: req.originalUrl,
            method: req.method,
            statusCode: res.statusCode,
          });
        }
        
        // Send validated response
        return originalJson(validatedData);
      } catch (error) {
        // Log validation error but don't break the response
        logger.error('Response validation failed', {
          url: req.originalUrl,
          method: req.method,
          error: error.message,
          data: typeof data === 'object' ? JSON.stringify(data).substring(0, 500) : data,
        });
        
        // Send original data anyway in production to avoid breaking API
        return originalJson(data);
      }
    };
    
    next();
  };
}

export default {
  validate,
  commonSchemas,
  exampleValidation,
  validateResponse,
};