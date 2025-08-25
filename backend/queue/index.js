// backend/queue/index.js
// BullMQ integration with QueueFactory for standardized job processing
import Bull from 'bull';
import { isConfigReady, getConfig } from '../config/index.js';
import { logger } from '../utils/logger.js';
import crypto from 'crypto';

let queueConnection = null;
let isConnected = false;
const activeQueues = new Map();
const processors = new Map();

// Initialize Redis connection for job queues
function initQueueConnection() {
  if (queueConnection) return queueConnection;
  
  let redisUrl;
  
  if (isConfigReady()) {
    const config = getConfig();
    redisUrl = config.REDIS_URL;
  } else {
    redisUrl = process.env.REDIS_URL;
  }
  
  if (!redisUrl) {
    logger.warn('Redis URL not provided, job queues will be disabled');
    return null;
  }
  
  try {
    queueConnection = {
      redis: redisUrl,
      settings: {
        stalledInterval: 30 * 1000, // 30 seconds
        maxStalledCount: 1,
        retryProcessDelay: 5 * 1000, // 5 seconds
      }
    };
    
    isConnected = true;
    logger.info('Queue connection initialized');
    return queueConnection;
  } catch (error) {
    logger.error('Failed to initialize queue connection', { error: error.message });
    return null;
  }
}

/**
 * QueueFactory for creating and managing named queues with standardized options
 */
export class QueueFactory {
  static create(queueName, options = {}) {
    if (activeQueues.has(queueName)) {
      return activeQueues.get(queueName);
    }

    const connection = initQueueConnection();
    if (!connection) {
      logger.error('Queue connection not available', { queueName });
      return null;
    }

    const defaultOptions = {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000, // Start with 2 seconds
      },
      removeOnComplete: 10, // Keep 10 completed jobs
      removeOnFail: 20,     // Keep 20 failed jobs for debugging
    };

    const queueOptions = {
      ...defaultOptions,
      ...options,
      redis: connection.redis,
      settings: connection.settings
    };

    try {
      const queue = new Bull(queueName, queueOptions);
      
      // Add event listeners for monitoring
      queue.on('active', (job) => {
        logger.info('Job started', { 
          queueName, 
          jobId: job.id, 
          jobType: job.name,
          traceId: job.data.traceId 
        });
      });

      queue.on('completed', (job) => {
        logger.info('Job completed', { 
          queueName, 
          jobId: job.id, 
          jobType: job.name,
          duration: Date.now() - job.processedOn,
          traceId: job.data.traceId 
        });
      });

      queue.on('failed', (job, err) => {
        logger.error('Job failed', { 
          queueName, 
          jobId: job.id, 
          jobType: job.name,
          error: err.message,
          attemptsMade: job.attemptsMade,
          traceId: job.data.traceId 
        });
      });

      queue.on('stalled', (job) => {
        logger.warn('Job stalled', { 
          queueName, 
          jobId: job.id, 
          jobType: job.name,
          traceId: job.data.traceId 
        });
      });

      activeQueues.set(queueName, queue);
      logger.info('Queue created', { queueName, options: queueOptions });
      
      return queue;
    } catch (error) {
      logger.error('Failed to create queue', { error: error.message, queueName });
      return null;
    }
  }

  static getQueue(queueName) {
    return activeQueues.get(queueName);
  }

  static async closeAll() {
    logger.info('Closing all queues...');
    
    for (const [queueName, queue] of activeQueues.entries()) {
      try {
        await queue.close();
        logger.info('Queue closed', { queueName });
      } catch (error) {
        logger.error('Error closing queue', { error: error.message, queueName });
      }
    }
    
    activeQueues.clear();
    logger.info('All queues closed');
  }
}

/**
 * Register a job processor for a specific job type
 */
export function registerProcessor(queueName, jobType, processor, concurrency = 1) {
  const processorKey = `${queueName}:${jobType}`;
  
  if (processors.has(processorKey)) {
    logger.warn('Processor already registered, overwriting', { queueName, jobType });
  }

  processors.set(processorKey, { processor, concurrency });
  
  const queue = QueueFactory.getQueue(queueName) || QueueFactory.create(queueName);
  if (queue) {
    queue.process(jobType, concurrency, async (job) => {
      const traceId = job.data.traceId || crypto.randomUUID();
      
      try {
        logger.info('Processing job', { 
          queueName, 
          jobType, 
          jobId: job.id,
          traceId,
          data: job.data 
        });

        const result = await processor(job.data, job);
        
        logger.info('Job processed successfully', { 
          queueName, 
          jobType, 
          jobId: job.id,
          traceId,
          result 
        });

        return result;
      } catch (error) {
        logger.error('Job processing failed', { 
          queueName, 
          jobType, 
          jobId: job.id,
          traceId,
          error: error.message,
          stack: error.stack 
        });
        throw error;
      }
    });

    logger.info('Processor registered', { queueName, jobType, concurrency });
  }
}

/**
 * Add a job to a queue with traceId propagation
 */
export async function enqueueJob(queueName, jobType, data, options = {}, traceId = null) {
  const queue = QueueFactory.getQueue(queueName) || QueueFactory.create(queueName);
  
  if (!queue) {
    throw new Error(`Queue ${queueName} not available`);
  }

  const jobData = {
    ...data,
    traceId: traceId || crypto.randomUUID(),
    enqueuedAt: new Date().toISOString()
  };

  const jobOptions = {
    attempts: 3,
    backoff: 'exponential',
    ...options
  };

  try {
    const job = await queue.add(jobType, jobData, jobOptions);
    
    logger.info('Job enqueued', { 
      queueName, 
      jobType, 
      jobId: job.id,
      traceId: jobData.traceId 
    });

    return job;
  } catch (error) {
    logger.error('Failed to enqueue job', { 
      error: error.message, 
      queueName, 
      jobType,
      traceId: jobData.traceId 
    });
    throw error;
  }
}

/**
 * Get job status by ID
 */
export async function getJobStatus(queueName, jobId) {
  const queue = QueueFactory.getQueue(queueName);
  
  if (!queue) {
    throw new Error(`Queue ${queueName} not found`);
  }

  try {
    const job = await queue.getJob(jobId);
    
    if (!job) {
      return { id: jobId, state: 'not_found', error: 'Job not found' };
    }

    const state = await job.getState();
    
    return {
      id: job.id,
      state,
      data: job.data,
      progress: job.progress(),
      attemptsMade: job.attemptsMade,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      failedReason: job.failedReason,
      returnvalue: job.returnvalue,
      traceId: job.data?.traceId
    };
  } catch (error) {
    logger.error('Failed to get job status', { error: error.message, queueName, jobId });
    throw error;
  }
}

// Graceful shutdown handler
let shutdownInProgress = false;

export async function gracefulShutdown() {
  if (shutdownInProgress) {
    logger.warn('Shutdown already in progress');
    return;
  }
  
  shutdownInProgress = true;
  logger.info('Starting graceful shutdown of job queues');
  
  try {
    // Pause all queues to stop accepting new jobs
    for (const [queueName, queue] of activeQueues.entries()) {
      try {
        await queue.pause(true); // true = pause locally only
        logger.info('Queue paused', { queueName });
      } catch (error) {
        logger.error('Error pausing queue', { error: error.message, queueName });
      }
    }

    // Wait for active jobs to complete (with timeout)
    const timeout = 30000; // 30 seconds
    const checkInterval = 1000; // 1 second
    let elapsed = 0;

    while (elapsed < timeout) {
      let activeJobsCount = 0;
      
      for (const queue of activeQueues.values()) {
        try {
          const active = await queue.getActive();
          activeJobsCount += active.length;
        } catch (error) {
          logger.error('Error checking active jobs', { error: error.message });
        }
      }

      if (activeJobsCount === 0) {
        logger.info('All active jobs completed');
        break;
      }

      logger.info('Waiting for active jobs to complete', { 
        activeJobsCount, 
        elapsed: elapsed / 1000 
      });
      
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      elapsed += checkInterval;
    }

    // Close all queues
    await QueueFactory.closeAll();
    
    logger.info('Graceful shutdown completed');
  } catch (error) {
    logger.error('Error during graceful shutdown', { error: error.message });
  } finally {
    shutdownInProgress = false;
  }
}

// Initialize default email queue and processor
const EMAIL_QUEUE = 'email-processing';

// TODO: Task 7 - Advanced queue features to implement later:
// TODO: - Queue monitoring dashboard with real-time metrics
// TODO: - Job retry policies with custom backoff strategies
// TODO: - Queue priorities and weighted job processing
// TODO: - Dead letter queue for permanently failed jobs
// TODO: - Job scheduling with cron-like syntax
// TODO: - Queue health checks and automatic recovery
// TODO: - Distributed locking for singleton jobs
// TODO: - Job result caching and deduplication

export { EMAIL_QUEUE };
export default {
  QueueFactory,
  registerProcessor,
  enqueueJob,
  getJobStatus,
  gracefulShutdown,
  EMAIL_QUEUE
};