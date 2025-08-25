// backend/queue/processors/emailProcessor.js
// Sample job processor for email.sendTest with logging and traceId propagation
import { logger } from '../../utils/logger.js';

/**
 * Sample email job processor
 * Demonstrates job processing patterns with proper logging
 */
export async function processTestEmail(data, job) {
  const { to, subject, message, traceId } = data;
  
  logger.info('Starting test email job', { 
    to, 
    subject, 
    traceId,
    jobId: job.id 
  });

  // Simulate email processing with random delay (0.5-2 seconds)
  const processingTime = Math.random() * 1500 + 500;
  
  // Update job progress
  job.progress(25);
  
  await new Promise(resolve => setTimeout(resolve, processingTime / 4));
  job.progress(50);
  
  await new Promise(resolve => setTimeout(resolve, processingTime / 4));
  job.progress(75);
  
  await new Promise(resolve => setTimeout(resolve, processingTime / 2));
  job.progress(100);

  // Simulate occasional failures for testing retry logic
  if (Math.random() < 0.1) { // 10% failure rate
    throw new Error('Simulated email delivery failure');
  }

  const result = {
    messageId: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    to,
    subject,
    sentAt: new Date().toISOString(),
    processingTimeMs: processingTime,
    traceId
  };

  logger.info('Test email sent successfully', { 
    result,
    jobId: job.id,
    traceId 
  });

  return result;
}

/**
 * Process bulk email job (example of more complex job)
 */
export async function processBulkEmail(data, job) {
  const { emails, templateId, traceId } = data;
  
  logger.info('Starting bulk email job', { 
    emailCount: emails.length,
    templateId,
    traceId,
    jobId: job.id 
  });

  const results = [];
  const total = emails.length;
  
  for (let i = 0; i < total; i++) {
    const email = emails[i];
    
    // Update progress
    const progress = Math.round((i / total) * 100);
    job.progress(progress);
    
    // Simulate processing each email
    await new Promise(resolve => setTimeout(resolve, 100));
    
    results.push({
      to: email.to,
      status: Math.random() > 0.05 ? 'sent' : 'failed', // 95% success rate
      sentAt: new Date().toISOString()
    });
  }
  
  job.progress(100);
  
  const finalResult = {
    totalEmails: total,
    successCount: results.filter(r => r.status === 'sent').length,
    failureCount: results.filter(r => r.status === 'failed').length,
    results,
    completedAt: new Date().toISOString(),
    traceId
  };

  logger.info('Bulk email job completed', { 
    finalResult,
    jobId: job.id,
    traceId 
  });

  return finalResult;
}

// TODO: Task 7 - Additional email processors to implement later:
// TODO: - Welcome email with user onboarding sequence
// TODO: - Password reset email with secure token generation
// TODO: - Order confirmation emails with PDF attachments
// TODO: - Newsletter processing with unsubscribe handling
// TODO: - Email template compilation with dynamic content
// TODO: - Email analytics tracking (opens, clicks, bounces)

export default {
  processTestEmail,
  processBulkEmail
};