#!/usr/bin/env node
// backend/scripts/worker.js
import dotenv from 'dotenv';
dotenv.config();

import { Worker } from 'bullmq';
import { getRedisClient } from '../config/redis.js';
import { processEmailJob } from '../queues/processors/emailProcessor.js';
import { processThumbnailJob } from '../queues/processors/thumbnailProcessor.js';
import { processSitemapJob } from '../queues/processors/sitemapProcessor.js';

const {
  QUEUE_PREFIX = 'tftp',
  WORKER_CONCURRENCY = '5',
} = process.env;

const concurrency = parseInt(WORKER_CONCURRENCY, 10);
let workers = [];
let isShuttingDown = false;

// Worker configurations
const workerConfig = {
  connection: getRedisClient(),
  concurrency,
};

async function startWorkers() {
  if (!getRedisClient()) {
    console.error('[Worker] Redis connection not available. Cannot start workers.');
    process.exit(1);
  }

  console.log(`[Worker] Starting workers with concurrency: ${concurrency}`);

  // Email worker
  const emailWorker = new Worker(
    `${QUEUE_PREFIX}:email`,
    async (job) => {
      return await processEmailJob(job);
    },
    workerConfig
  );

  // Thumbnail worker
  const thumbnailWorker = new Worker(
    `${QUEUE_PREFIX}:thumbnail`,
    async (job) => {
      return await processThumbnailJob(job);
    },
    workerConfig
  );

  // Sitemap worker
  const sitemapWorker = new Worker(
    `${QUEUE_PREFIX}:sitemap`,
    async (job) => {
      return await processSitemapJob(job);
    },
    workerConfig
  );

  workers = [emailWorker, thumbnailWorker, sitemapWorker];

  // Set up event listeners for each worker
  workers.forEach((worker, index) => {
    const workerName = ['email', 'thumbnail', 'sitemap'][index];
    
    worker.on('ready', () => {
      console.log(`[Worker] ${workerName} worker ready`);
    });

    worker.on('active', (job) => {
      console.log(`[Worker] ${workerName} job ${job.id} started`);
    });

    worker.on('completed', (job, result) => {
      console.log(`[Worker] ${workerName} job ${job.id} completed:`, result);
    });

    worker.on('failed', (job, err) => {
      console.error(`[Worker] ${workerName} job ${job?.id} failed:`, err.message);
    });

    worker.on('error', (err) => {
      console.error(`[Worker] ${workerName} worker error:`, err.message);
    });
  });

  console.log('[Worker] All workers started successfully');
  return workers;
}

async function shutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log('[Worker] Graceful shutdown initiated...');

  try {
    // Close all workers
    await Promise.all(workers.map(async (worker, index) => {
      const workerName = ['email', 'thumbnail', 'sitemap'][index];
      console.log(`[Worker] Closing ${workerName} worker...`);
      await worker.close();
      console.log(`[Worker] ${workerName} worker closed`);
    }));

    console.log('[Worker] All workers shut down gracefully');
    process.exit(0);
  } catch (error) {
    console.error('[Worker] Error during shutdown:', error.message);
    process.exit(1);
  }
}

// Graceful shutdown handling
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('[Worker] Uncaught Exception:', error);
  shutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Worker] Unhandled Rejection at:', promise, 'reason:', reason);
  shutdown();
});

// Start workers
async function main() {
  try {
    await startWorkers();
    console.log('[Worker] Worker process running. Press Ctrl+C to stop.');
  } catch (error) {
    console.error('[Worker] Failed to start workers:', error.message);
    process.exit(1);
  }
}

main();