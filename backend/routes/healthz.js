// backend/routes/healthz.js
import express from 'express';
import { isRedisAvailable } from '../config/redis.js';
import { areQueuesHealthy } from '../queues/index.js';
import mongoose from 'mongoose';

const router = express.Router();

// Basic health check
router.get('/', (req, res) => {
  res.status(200).send('OK');
});

// Detailed health check with dependencies
router.get('/detailed', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {}
  };

  // Check MongoDB
  try {
    if (mongoose.connection.readyState === 1) {
      health.services.mongodb = { status: 'healthy' };
    } else {
      health.services.mongodb = { status: 'unhealthy', message: 'Not connected' };
      health.status = 'degraded';
    }
  } catch (error) {
    health.services.mongodb = { status: 'unhealthy', message: error.message };
    health.status = 'degraded';
  }

  // Check Redis
  try {
    const redisHealthy = await isRedisAvailable();
    if (redisHealthy) {
      health.services.redis = { status: 'healthy' };
    } else {
      health.services.redis = { status: 'unhealthy', message: 'Connection failed' };
      health.status = 'degraded';
    }
  } catch (error) {
    health.services.redis = { status: 'unhealthy', message: error.message };
    health.status = 'degraded';
  }

  // Check Queues
  try {
    const queuesHealthy = await areQueuesHealthy();
    if (queuesHealthy) {
      health.services.queues = { status: 'healthy' };
    } else {
      health.services.queues = { status: 'unhealthy', message: 'Queue connection failed' };
      health.status = 'degraded';
    }
  } catch (error) {
    health.services.queues = { status: 'unhealthy', message: error.message };
    health.status = 'degraded';
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

export default router;