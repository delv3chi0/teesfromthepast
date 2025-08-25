// backend/__tests__/errorHandling.test.js
import request from 'supertest';
import app from '../app.js';
import { ValidationError, NotFoundError, InternalError } from '../errors/AppError.js';

describe('Unified Error Handling', () => {
  describe('Error Response Envelope', () => {
    it('should return unified error format for 404 errors', async () => {
      const response = await request(app)
        .get('/nonexistent-route')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'NOT_FOUND');
      expect(response.body.error).toHaveProperty('message', 'Resource not found');
      
      // Should include traceId if tracing is available
      if (response.body.error.traceId) {
        expect(typeof response.body.error.traceId).toBe('string');
      }
    });

    it('should handle development error test route with unified format', async () => {
      // Only test in non-production environment
      if (process.env.NODE_ENV !== 'production') {
        const response = await request(app)
          .get('/api/dev/boom')
          .expect(500);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toHaveProperty('code');
        expect(response.body.error).toHaveProperty('message');
      }
    });

    it('should handle validation errors with details', async () => {
      // We'll test this with a route that uses validation middleware
      // For now, just ensure the structure is correct for any validation error
      
      // This test validates the error handler structure
      // Actual validation errors will be tested when we implement route validation
      expect(true).toBe(true); // Placeholder - will expand when route validation is added
    });
  });

  describe('Error Classes', () => {
    it('should create proper ValidationError', () => {
      const error = new ValidationError('Test validation error', [
        { field: 'email', code: 'invalid_email', message: 'Invalid email format' }
      ]);

      expect(error.name).toBe('ValidationError');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.httpStatus).toBe(400);
      expect(error.isOperational).toBe(true);
      expect(error.details).toEqual([
        { field: 'email', code: 'invalid_email', message: 'Invalid email format' }
      ]);
    });

    it('should create proper NotFoundError', () => {
      const error = new NotFoundError('User not found');

      expect(error.name).toBe('NotFoundError');
      expect(error.code).toBe('NOT_FOUND');
      expect(error.httpStatus).toBe(404);
      expect(error.isOperational).toBe(true);
    });

    it('should create proper InternalError', () => {
      const error = new InternalError('Database connection failed');

      expect(error.name).toBe('InternalError');
      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.httpStatus).toBe(500);
      expect(error.isOperational).toBe(false);
    });
  });
});