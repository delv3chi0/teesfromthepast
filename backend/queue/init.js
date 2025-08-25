// backend/queue/init.js
// Initialize job queues and register processors
import { registerProcessor, EMAIL_QUEUE } from './index.js';
import { processTestEmail, processBulkEmail } from './processors/emailProcessor.js';
import { logger } from '../utils/logger.js';

/**
 * Initialize all job queues and processors
 * Called during application startup
 */
export function initializeJobQueues() {
  try {
    logger.info('Initializing job queues and processors...');

    // Register email processors
    registerProcessor(EMAIL_QUEUE, 'sendTest', processTestEmail, 1); // Process one at a time
    registerProcessor(EMAIL_QUEUE, 'sendBulk', processBulkEmail, 1);  // Process one bulk job at a time

    logger.info('Job queues initialized successfully', {
      queues: [EMAIL_QUEUE],
      processors: ['sendTest', 'sendBulk']
    });

    return true;
  } catch (error) {
    logger.error('Failed to initialize job queues', { error: error.message });
    return false;
  }
}

// TODO: Task 7 - Additional processors to register later:
// TODO: - Image processing queue for product photos
// TODO: - PDF generation queue for receipts/invoices  
// TODO: - Webhook delivery queue with retry logic
// TODO: - Analytics data processing queue
// TODO: - Cache warming queue for popular products
// TODO: - Backup and cleanup maintenance jobs

export default { initializeJobQueues };