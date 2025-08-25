// backend/controllers/jobsController.js
// Job queue endpoints for testing and monitoring (Task 7)
import asyncHandler from "express-async-handler";
import crypto from "crypto";
import { getConfig } from "../config/index.js";
import { enqueueJob, getJobStatus, EMAIL_QUEUE } from "../queue/index.js";
import { logger } from "../utils/logger.js";
import { isEnabled } from "../flags/FeatureFlags.js";

/** POST /api/jobs/test - Enqueue a test job (guarded by ENABLE_JOB_TESTING) */
export const enqueueTestJob = asyncHandler(async (req, res) => {
  if (!isEnabled('jobs.enable_testing')) {
    return res.status(403).json({
      message: "Job testing is disabled",
      code: "JOB_TESTING_DISABLED",
      hint: "Enable 'jobs.enable_testing' feature flag to use test job endpoints"
    });
  }

  const { 
    to = "test@example.com", 
    subject = "Test Email Job", 
    message = "This is a test email from the job queue system.",
    delay = 0 
  } = req.body;

  // Generate trace ID for correlation
  const traceId = req.headers['x-trace-id'] || crypto.randomUUID();
  
  try {
    const jobData = {
      to,
      subject, 
      message,
      triggeredBy: req.auth?.userId || req.user?._id?.toString() || 'anonymous',
      triggeredAt: new Date().toISOString()
    };

    const jobOptions = {
      delay: Math.max(0, parseInt(delay) || 0), // Optional delay in ms
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    };

    const job = await enqueueJob(EMAIL_QUEUE, 'sendTest', jobData, jobOptions, traceId);

    logger.info('Test job enqueued via API', {
      jobId: job.id,
      traceId,
      triggeredBy: jobData.triggeredBy,
      to: jobData.to
    });

    res.status(201).json({
      message: "Test job enqueued successfully",
      job: {
        id: job.id,
        type: 'email.sendTest',
        queue: EMAIL_QUEUE,
        data: jobData,
        options: jobOptions,
        traceId,
        enqueuedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Failed to enqueue test job', {
      error: error.message,
      traceId,
      triggeredBy: req.auth?.userId || req.user?._id?.toString()
    });

    res.status(500).json({
      message: "Failed to enqueue test job",
      code: "JOB_ENQUEUE_FAILED",
      error: error.message,
      traceId
    });
  }
});

/** GET /api/jobs/:id/status - Get job status and progress */
export const getJobStatusById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { queue = EMAIL_QUEUE } = req.query;

  if (!id || isNaN(parseInt(id))) {
    return res.status(400).json({
      message: "Invalid job ID",
      code: "INVALID_JOB_ID"
    });
  }

  try {
    const status = await getJobStatus(queue, parseInt(id));
    
    logger.debug('Job status requested', {
      jobId: id,
      queue,
      requestedBy: req.auth?.userId || req.user?._id?.toString(),
      status: status.state
    });

    res.json({
      message: "Job status retrieved successfully",
      job: status
    });

  } catch (error) {
    logger.error('Failed to get job status', {
      error: error.message,
      jobId: id,
      queue,
      requestedBy: req.auth?.userId || req.user?._id?.toString()
    });

    if (error.message.includes('not found')) {
      return res.status(404).json({
        message: "Job not found",
        code: "JOB_NOT_FOUND",
        jobId: id,
        queue
      });
    }

    res.status(500).json({
      message: "Failed to retrieve job status",
      code: "JOB_STATUS_ERROR",
      error: error.message,
      jobId: id
    });
  }
});

/** POST /api/jobs/bulk-test - Enqueue multiple test jobs (for stress testing) */
export const enqueueBulkTestJobs = asyncHandler(async (req, res) => {
  if (!isEnabled('jobs.enable_testing')) {
    return res.status(403).json({
      message: "Job testing is disabled",
      code: "JOB_TESTING_DISABLED"
    });
  }

  const { 
    count = 1,
    emails = [],
    template = "test-bulk" 
  } = req.body;

  const jobCount = Math.min(Math.max(1, parseInt(count) || 1), 100); // Limit to 100 jobs
  const traceId = req.headers['x-trace-id'] || crypto.randomUUID();

  try {
    const emailList = emails.length > 0 ? emails : Array(jobCount).fill().map((_, i) => ({
      to: `test${i + 1}@example.com`,
      subject: `Bulk Test Email ${i + 1}`,
      message: `This is bulk test email #${i + 1}`
    }));

    const jobData = {
      emails: emailList,
      templateId: template,
      triggeredBy: req.auth?.userId || req.user?._id?.toString() || 'anonymous',
      triggeredAt: new Date().toISOString()
    };

    const job = await enqueueJob(EMAIL_QUEUE, 'sendBulk', jobData, {}, traceId);

    logger.info('Bulk test job enqueued via API', {
      jobId: job.id,
      traceId,
      emailCount: emailList.length,
      triggeredBy: jobData.triggeredBy
    });

    res.status(201).json({
      message: "Bulk test job enqueued successfully",
      job: {
        id: job.id,
        type: 'email.sendBulk',
        queue: EMAIL_QUEUE,
        emailCount: emailList.length,
        traceId,
        enqueuedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Failed to enqueue bulk test job', {
      error: error.message,
      traceId,
      jobCount
    });

    res.status(500).json({
      message: "Failed to enqueue bulk test job",
      code: "BULK_JOB_ENQUEUE_FAILED",
      error: error.message,
      traceId
    });
  }
});

// TODO: Task 7 - Additional job management endpoints to implement later:
// TODO: - GET /jobs/queues - List all queues with stats
// TODO: - GET /jobs/queue/:name/stats - Get detailed queue statistics
// TODO: - POST /jobs/:id/retry - Manually retry a failed job
// TODO: - DELETE /jobs/:id - Cancel a pending job
// TODO: - POST /jobs/queue/:name/pause - Pause a queue
// TODO: - POST /jobs/queue/:name/resume - Resume a paused queue
// TODO: - GET /jobs/failed - List failed jobs with filters
// TODO: - POST /jobs/cleanup - Clean up old completed/failed jobs

export default {
  enqueueTestJob,
  getJobStatusById,
  enqueueBulkTestJobs
};