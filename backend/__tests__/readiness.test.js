// backend/__tests__/readiness.test.js
// Tests for readiness endpoint with Redis connectivity checks

import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// Mock config
jest.mock('../config/index.js', () => ({
  isConfigReady: jest.fn(),
  getConfig: jest.fn()
}));

// Mock version info
jest.mock('../version/index.js', () => ({
  getVersionInfo: jest.fn(() => ({
    version: '1.0.0',
    commit: 'abc123',
    buildTime: '2024-01-01T00:00:00Z',
    environment: 'test'
  }))
}));

// Mock logger
jest.mock('../utils/logger.js', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn()
  }
}));

import { isConfigReady, getConfig } from '../config/index.js';
import healthRoutes from '../routes/health.js';

describe('Readiness Endpoint', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(healthRoutes);
    
    delete process.env.REDIS_URL;
    delete process.env.REDIS_REQUIRED_FOR_READINESS;
  });

  test('should return ready when Redis not required', async () => {
    // No Redis URL set, but not required for readiness
    const response = await request(app)
      .get('/readiness')
      .expect(200);

    expect(response.body.ready).toBe(true);
    expect(response.body.checks).toHaveProperty('redis');
    expect(response.body.requirements.redisRequired).toBe(false);
  });

  test('should return not ready when Redis required but unavailable', async () => {
    process.env.REDIS_REQUIRED_FOR_READINESS = 'true';
    // No Redis URL set
    
    const response = await request(app)
      .get('/readiness')
      .expect(503);

    expect(response.body.ready).toBe(false);
    expect(response.body.checks.redis.connected).toBe(false);
    expect(response.body.requirements.redisRequired).toBe(true);
  });

  test('should use config when available', async () => {
    isConfigReady.mockReturnValue(true);
    getConfig.mockReturnValue({
      REDIS_REQUIRED_FOR_READINESS: true,
      REDIS_URL: 'redis://localhost:6379'
    });

    // Mock Redis connection to succeed
    const mockRedis = {
      ping: jest.fn().mockResolvedValue('PONG'),
      quit: jest.fn().mockResolvedValue(undefined)
    };

    jest.doMock('ioredis', () => {
      return jest.fn().mockImplementation(() => mockRedis);
    });

    const response = await request(app)
      .get('/readiness')
      .expect(200);

    expect(response.body.ready).toBe(true);
    expect(response.body.requirements.redisRequired).toBe(true);
  });

  test('should handle Redis connection errors gracefully', async () => {
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.REDIS_REQUIRED_FOR_READINESS = 'true';

    // Mock Redis to throw connection error
    const mockRedis = {
      ping: jest.fn().mockRejectedValue(new Error('Connection refused')),
      quit: jest.fn().mockResolvedValue(undefined)
    };

    jest.doMock('ioredis', () => {
      return jest.fn().mockImplementation(() => mockRedis);
    });

    const response = await request(app)
      .get('/readiness')
      .expect(503);

    expect(response.body.ready).toBe(false);
    expect(response.body.checks.redis.connected).toBe(false);
    expect(response.body.checks.redis.error).toBe('Connection refused');
  });

  test('should include timestamp in response', async () => {
    const response = await request(app)
      .get('/readiness')
      .expect(200);

    expect(response.body.timestamp).toBeDefined();
    expect(new Date(response.body.timestamp).getTime()).not.toBeNaN();
  });
});