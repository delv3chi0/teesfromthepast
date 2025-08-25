// backend/__tests__/validation.test.js
import request from 'supertest';
import app from '../app.js';
import { validate, commonSchemas } from '../middleware/validate.js';
import express from 'express';
import { z } from 'zod';

describe('Request Validation Middleware', () => {
  describe('Config Routes Validation Example', () => {
    it('should accept valid query parameters', async () => {
      const response = await request(app)
        .get('/api/config/limits?format=json&include=effectiveLimitMB')
        .expect(200);

      expect(response.body).toHaveProperty('ok', true);
      expect(response.body).toHaveProperty('data');
    });

    it('should default format to json when not provided', async () => {
      const response = await request(app)
        .get('/api/config/limits')
        .expect(200);

      expect(response.body).toHaveProperty('ok', true);
      expect(response.headers['content-type']).toMatch(/json/);
    });

    it('should return XML when format=xml is specified', async () => {
      const response = await request(app)
        .get('/api/config/limits?format=xml')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/xml/);
      expect(response.text).toContain('<config>');
    });

    it('should reject invalid format parameter', async () => {
      const response = await request(app)
        .get('/api/config/limits?format=invalid')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
      expect(response.body.error).toHaveProperty('message', 'Invalid query parameters');
      expect(response.body.error).toHaveProperty('details');
      expect(response.body.error.details[0]).toHaveProperty('field', 'query.format');
    });
  });

  describe('Validation Middleware Factory', () => {
    let testApp;

    beforeEach(() => {
      testApp = express();
      testApp.use(express.json());
    });

    it('should validate request body against schema', (done) => {
      const schema = z.object({
        name: z.string().min(1),
        age: z.number().min(0),
      });

      testApp.post('/test', validate({ body: schema }), (req, res) => {
        res.json({ validated: req.validated.body });
      });

      request(testApp)
        .post('/test')
        .send({ name: 'John', age: 25 })
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.validated).toEqual({ name: 'John', age: 25 });
          done();
        });
    });

    it('should reject invalid request body', (done) => {
      const schema = z.object({
        name: z.string().min(1),
        age: z.number().min(0),
      });

      testApp.post('/test', validate({ body: schema }), (req, res) => {
        res.json({ validated: req.validated.body });
      });

      // Add error handler
      testApp.use((err, req, res, next) => {
        if (err.name === 'ValidationError') {
          return res.status(400).json({
            error: {
              code: err.code,
              message: err.message,
              details: err.details
            }
          });
        }
        next(err);
      });

      request(testApp)
        .post('/test')
        .send({ name: '', age: -5 })
        .expect(400)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.error.code).toBe('VALIDATION_ERROR');
          expect(res.body.error.details).toEqual(
            expect.arrayContaining([
              expect.objectContaining({ field: 'body.name' }),
              expect.objectContaining({ field: 'body.age' })
            ])
          );
          done();
        });
    });

    it('should validate path parameters', (done) => {
      const schema = z.object({
        id: z.string().regex(/^[0-9a-fA-F]{24}$/),
      });

      testApp.get('/test/:id', validate({ params: schema }), (req, res) => {
        res.json({ validated: req.validated.params });
      });

      request(testApp)
        .get('/test/507f1f77bcf86cd799439011')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.validated.id).toBe('507f1f77bcf86cd799439011');
          done();
        });
    });
  });

  describe('Common Schemas', () => {
    it('should validate ObjectId format', () => {
      const validId = '507f1f77bcf86cd799439011';
      const invalidId = 'invalid-id';

      expect(() => commonSchemas.objectId.parse(validId)).not.toThrow();
      expect(() => commonSchemas.objectId.parse(invalidId)).toThrow();
    });

    it('should validate email format', () => {
      const validEmail = 'test@example.com';
      const invalidEmail = 'not-an-email';

      expect(() => commonSchemas.email.parse(validEmail)).not.toThrow();
      expect(() => commonSchemas.email.parse(invalidEmail)).toThrow();
    });

    it('should validate pagination with defaults', () => {
      const result1 = commonSchemas.pagination.parse({});
      expect(result1).toEqual({
        page: 1,
        limit: 20,
        order: 'desc'
      });

      const result2 = commonSchemas.pagination.parse({
        page: '3',
        limit: '50',
        sort: 'createdAt',
        order: 'asc'
      });
      expect(result2).toEqual({
        page: 3,
        limit: 50,
        sort: 'createdAt',
        order: 'asc'
      });
    });
  });
});