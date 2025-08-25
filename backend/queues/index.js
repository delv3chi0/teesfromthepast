// backend/queues/index.js
import { Queue } from 'bullmq';
import { getRedisClient } from '../config/redis.js';

const {
  QUEUE_PREFIX = 'tftp',
  WORKER_CONCURRENCY = '5',
} = process.env;

// Queue configurations
function createQueueConfig() {
  const redisConnection = getRedisClient();
  
  if (!redisConnection) {
    console.warn('[Queue] Redis not available, queues will not be functional');
    return null;
  }
  
  return {
    connection: redisConnection,
    defaultJobOptions: {
      removeOnComplete: 10,
      removeOnFail: 20,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    },
  };
}

const queueConfig = createQueueConfig();

// Initialize queues only if Redis is available
let emailQueue, thumbnailQueue, sitemapQueue;

if (queueConfig) {
  emailQueue = new Queue(`${QUEUE_PREFIX}:email`, queueConfig);
  thumbnailQueue = new Queue(`${QUEUE_PREFIX}:thumbnail`, queueConfig);
  sitemapQueue = new Queue(`${QUEUE_PREFIX}:sitemap`, queueConfig);
  console.log('[Queue] Queues initialized with Redis backend');
} else {
  console.log('[Queue] Queues not initialized (Redis not available)');
}

export { emailQueue, thumbnailQueue, sitemapQueue };

// Queue management functions
export async function addEmailJob(type, data, options = {}) {
  if (!emailQueue) {
    console.warn('[Queue] Email queue not available, skipping job');
    return null;
  }

  try {
    const job = await emailQueue.add(type, data, {
      priority: options.priority || 5,
      delay: options.delay || 0,
      ...options,
    });
    console.log(`[Queue] Email job added: ${job.id} (${type})`);
    return job;
  } catch (error) {
    console.error('[Queue] Failed to add email job:', error.message);
    throw error;
  }
}

export async function addThumbnailJob(data, options = {}) {
  if (!thumbnailQueue) {
    console.warn('[Queue] Thumbnail queue not available, skipping job');
    return null;
  }

  try {
    const job = await thumbnailQueue.add('generate-thumbnail', data, {
      priority: options.priority || 3,
      ...options,
    });
    console.log(`[Queue] Thumbnail job added: ${job.id}`);
    return job;
  } catch (error) {
    console.error('[Queue] Failed to add thumbnail job:', error.message);
    throw error;
  }
}

export async function addSitemapJob(options = {}) {
  if (!sitemapQueue) {
    console.warn('[Queue] Sitemap queue not available, skipping job');
    return null;
  }

  try {
    const job = await sitemapQueue.add('regenerate-sitemap', {}, {
      priority: options.priority || 1,
      ...options,
    });
    console.log(`[Queue] Sitemap job added: ${job.id}`);
    return job;
  } catch (error) {
    console.error('[Queue] Failed to add sitemap job:', error.message);
    throw error;
  }
}

// Get queue statistics
export async function getQueueStats() {
  if (!emailQueue || !thumbnailQueue || !sitemapQueue) {
    return { error: 'Queues not available' };
  }

  try {
    const [emailStats, thumbnailStats, sitemapStats] = await Promise.all([
      emailQueue.getJobCounts(),
      thumbnailQueue.getJobCounts(),
      sitemapQueue.getJobCounts(),
    ]);

    return {
      email: emailStats,
      thumbnail: thumbnailStats,
      sitemap: sitemapStats,
    };
  } catch (error) {
    console.error('[Queue] Failed to get queue stats:', error.message);
    return { error: error.message };
  }
}

// Graceful shutdown
export async function shutdownQueues() {
  if (!emailQueue || !thumbnailQueue || !sitemapQueue) {
    console.log('[Queue] Queues not initialized, skipping shutdown');
    return;
  }

  console.log('[Queue] Shutting down queues...');
  try {
    await Promise.all([
      emailQueue.close(),
      thumbnailQueue.close(),
      sitemapQueue.close(),
    ]);
    console.log('[Queue] All queues closed');
  } catch (error) {
    console.error('[Queue] Error during queue shutdown:', error.message);
  }
}

// Health check
export async function areQueuesHealthy() {
  if (!emailQueue || !thumbnailQueue || !sitemapQueue) {
    return false;
  }

  try {
    // Simple check if queues are accessible
    await Promise.all([
      emailQueue.getJobCounts(),
      thumbnailQueue.getJobCounts(),
      sitemapQueue.getJobCounts(),
    ]);
    return true;
  } catch (error) {
    console.error('[Queue] Queue health check failed:', error.message);
    return false;
  }
}

export { queueConfig };