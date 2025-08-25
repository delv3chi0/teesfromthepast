// backend/utils/webhookReliability.js
// Enhanced webhook reliability with idempotency, retry logic, and verification
import { logger } from './logger.js';
import Bull from 'bull';
import { getConfig } from '../config/index.js';

let webhookQueue = null;

// Initialize webhook processing queue
function initWebhookQueue() {
  if (webhookQueue) return webhookQueue;
  
  const config = getConfig();
  
  try {
    // Use Redis for queue if available, otherwise use in-memory
    const queueConfig = config.REDIS_URL 
      ? { redis: config.REDIS_URL }
      : {}; // In-memory fallback
    
    webhookQueue = new Bull('webhook processing', queueConfig);
    
    // Process webhook retry jobs
    webhookQueue.process('WEBHOOK_RETRY', async (job) => {
      const { webhookData, retryCount } = job.data;
      
      try {
        await processWebhookWithRetry(webhookData, retryCount);
        logger.info('Webhook retry processed successfully', { 
          webhookId: webhookData.id,
          retryCount 
        });
      } catch (error) {
        logger.error('Webhook retry failed', { 
          webhookId: webhookData.id,
          retryCount,
          error: error.message 
        });
        throw error; // Will trigger Bull's retry mechanism
      }
    });
    
    logger.info('Webhook processing queue initialized');
    return webhookQueue;
  } catch (error) {
    logger.error('Failed to initialize webhook queue', { error: error.message });
    return null;
  }
}

// Improved webhook signature verification
export function verifyWebhookSignature(payload, signature, secret, tolerance = 300) {
  const crypto = require('crypto');
  
  if (!signature || !secret) {
    throw new Error('Missing webhook signature or secret');
  }
  
  // Parse signature header
  const elements = signature.split(',');
  const timestamp = elements.find(e => e.startsWith('t='))?.substring(2);
  const sig = elements.find(e => e.startsWith('v1='))?.substring(3);
  
  if (!timestamp || !sig) {
    throw new Error('Invalid signature format');
  }
  
  // Check timestamp tolerance
  const currentTime = Math.floor(Date.now() / 1000);
  const webhookTime = parseInt(timestamp);
  
  if (Math.abs(currentTime - webhookTime) > tolerance) {
    const reason = currentTime > webhookTime ? 'too old' : 'from future';
    logger.warn('Webhook timestamp outside tolerance', { 
      webhookTime, 
      currentTime, 
      tolerance,
      reason 
    });
    throw new Error(`Webhook timestamp ${reason} (tolerance: ${tolerance}s)`);
  }
  
  // Verify signature
  const signedPayload = `${timestamp}.${payload}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload, 'utf8')
    .digest('hex');
  
  if (!crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expectedSignature, 'hex'))) {
    logger.error('Webhook signature verification failed', {
      expectedLength: expectedSignature.length,
      receivedLength: sig.length,
      timestamp
    });
    throw new Error('Signature verification failed');
  }
  
  logger.debug('Webhook signature verified', { timestamp, tolerance });
  return true;
}

// Enhanced idempotency checking with Redis/database
export async function checkWebhookIdempotency(webhookId, eventType) {
  try {
    // Import WebhookEvent model
    const { default: WebhookEvent } = await import('../models/WebhookEvent.js');
    
    // Check if webhook already exists
    const existingEvent = await WebhookEvent.findById(webhookId);
    
    if (existingEvent) {
      logger.info('Webhook already processed (idempotency)', { 
        webhookId, 
        eventType,
        processedAt: existingEvent.createdAt 
      });
      return { isProcessed: true, event: existingEvent };
    }
    
    // Create new webhook event record
    const webhookEvent = await WebhookEvent.create({
      _id: webhookId,
      type: eventType,
      processedAt: new Date(),
      status: 'processing'
    });
    
    logger.debug('Webhook marked as processing', { webhookId, eventType });
    return { isProcessed: false, event: webhookEvent };
    
  } catch (error) {
    if (error.code === 11000) {
      // Duplicate key error - webhook was already being processed
      logger.info('Webhook already being processed by another instance', { webhookId, eventType });
      return { isProcessed: true, event: null };
    }
    
    logger.error('Idempotency check failed', { 
      webhookId, 
      eventType, 
      error: error.message 
    });
    throw error;
  }
}

// Mark webhook as completed or failed
export async function updateWebhookStatus(webhookId, status, error = null) {
  try {
    const { default: WebhookEvent } = await import('../models/WebhookEvent.js');
    
    const updateData = { 
      status, 
      completedAt: new Date() 
    };
    
    if (error) {
      updateData.error = {
        message: error.message,
        stack: error.stack,
        code: error.code
      };
    }
    
    await WebhookEvent.findByIdAndUpdate(webhookId, updateData);
    
    logger.debug('Webhook status updated', { webhookId, status });
  } catch (updateError) {
    logger.error('Failed to update webhook status', { 
      webhookId, 
      status, 
      error: updateError.message 
    });
  }
}

// Exponential backoff retry logic
export async function scheduleWebhookRetry(webhookData, retryCount = 0, error = null) {
  const maxRetries = 5;
  const baseDelay = 1000; // 1 second
  
  if (retryCount >= maxRetries) {
    logger.error('Webhook max retries exceeded', { 
      webhookId: webhookData.id,
      retryCount,
      maxRetries 
    });
    
    await updateWebhookStatus(webhookData.id, 'failed', error);
    return false;
  }
  
  // Calculate exponential backoff delay
  const delay = baseDelay * Math.pow(2, retryCount);
  const jitter = Math.random() * 1000; // Add jitter to prevent thundering herd
  const totalDelay = delay + jitter;
  
  try {
    const queue = initWebhookQueue();
    
    if (queue) {
      await queue.add('WEBHOOK_RETRY', {
        webhookData,
        retryCount: retryCount + 1
      }, {
        delay: totalDelay,
        attempts: 1, // Each retry job should only attempt once
        removeOnComplete: 10, // Keep last 10 completed jobs
        removeOnFail: 50 // Keep last 50 failed jobs for debugging
      });
      
      logger.info('Webhook retry scheduled', { 
        webhookId: webhookData.id,
        retryCount: retryCount + 1,
        delay: totalDelay 
      });
      
      return true;
    } else {
      logger.error('Failed to schedule webhook retry - queue not available', { 
        webhookId: webhookData.id 
      });
      return false;
    }
  } catch (error) {
    logger.error('Failed to schedule webhook retry', { 
      webhookId: webhookData.id,
      retryCount,
      error: error.message 
    });
    return false;
  }
}

// Process webhook with retry logic (placeholder for actual implementation)
async function processWebhookWithRetry(webhookData, retryCount) {
  // This would contain the actual webhook processing logic
  // For now, we'll simulate processing
  logger.info('Processing webhook retry', { 
    webhookId: webhookData.id,
    retryCount 
  });
  
  // Simulate processing logic here
  // throw new Error('Simulated processing failure'); // Uncomment to test retries
}

// Webhook processing wrapper with error handling and retry
export async function processWebhookSafely(webhookId, eventType, processingFn) {
  try {
    // Check idempotency
    const { isProcessed } = await checkWebhookIdempotency(webhookId, eventType);
    if (isProcessed) {
      return { success: true, deduped: true };
    }
    
    // Process the webhook
    await processingFn();
    
    // Mark as completed
    await updateWebhookStatus(webhookId, 'completed');
    
    logger.info('Webhook processed successfully', { webhookId, eventType });
    return { success: true, deduped: false };
    
  } catch (error) {
    logger.error('Webhook processing failed', { 
      webhookId, 
      eventType, 
      error: error.message 
    });
    
    // Schedule retry for transient failures
    if (isTransientError(error)) {
      await scheduleWebhookRetry({ id: webhookId, type: eventType }, 0, error);
      await updateWebhookStatus(webhookId, 'retrying', error);
    } else {
      await updateWebhookStatus(webhookId, 'failed', error);
    }
    
    throw error;
  }
}

// Determine if error is transient and worth retrying
function isTransientError(error) {
  const transientErrors = [
    'ECONNRESET',
    'ECONNREFUSED', 
    'ETIMEDOUT',
    'ENOTFOUND',
    'MongoNetworkError',
    'MongoTimeoutError'
  ];
  
  return transientErrors.some(transientError => 
    error.code === transientError || 
    error.name === transientError ||
    error.message.includes(transientError)
  );
}

// Initialize queue on module load (only if not in test environment)
if (process.env.NODE_ENV !== 'test') {
  initWebhookQueue();
}

export default {
  verifyWebhookSignature,
  checkWebhookIdempotency,
  updateWebhookStatus,
  scheduleWebhookRetry,
  processWebhookSafely,
  initWebhookQueue
};