// backend/routes/jobs.js
// Job queue testing and monitoring routes (Task 7)
import express from "express";
import { body, param, query } from "express-validator";
import { protect, ensureAuth, requireAdmin } from "../middleware/authMiddleware.js";
import * as jobs from "../controllers/jobsController.js";

const router = express.Router();

// Validation middleware
const vTestJob = [
  body("to").optional().isEmail().withMessage("Invalid email address"),
  body("subject").optional().isString().isLength({ max: 200 }).withMessage("Subject too long"),
  body("message").optional().isString().isLength({ max: 1000 }).withMessage("Message too long"),
  body("delay").optional().isInt({ min: 0, max: 300000 }).withMessage("Delay must be 0-300000ms")
];

const vBulkJob = [
  body("count").optional().isInt({ min: 1, max: 100 }).withMessage("Count must be 1-100"),
  body("emails").optional().isArray().withMessage("Emails must be an array"),
  body("emails.*.to").optional().isEmail().withMessage("Invalid email in emails array"),
  body("template").optional().isString().withMessage("Template must be a string")
];

const vJobId = [
  param("id").isInt({ min: 1 }).withMessage("Job ID must be a positive integer")
];

const vJobStatus = [
  ...vJobId,
  query("queue").optional().isString().withMessage("Queue name must be a string")
];

const safe = (name) => (typeof jobs[name] === "function" ? jobs[name] : (_req, res) => res.status(501).json({ message: `Missing ${name}` }));

// Test job endpoints (protected by ENABLE_JOB_TESTING env flag in controller)
router.post("/test", ensureAuth, vTestJob, safe("enqueueTestJob"));
router.post("/bulk-test", ensureAuth, requireAdmin, vBulkJob, safe("enqueueBulkTestJobs"));

// Job monitoring endpoints
router.get("/:id/status", protect, vJobStatus, safe("getJobStatusById"));

// TODO: Task 7 - Additional routes to implement later:
// TODO: router.get("/queues", protect, requireAdmin, safe("listQueues"));
// TODO: router.get("/queue/:name/stats", protect, requireAdmin, safe("getQueueStats"));
// TODO: router.post("/:id/retry", protect, requireAdmin, safe("retryJob"));
// TODO: router.delete("/:id", protect, requireAdmin, safe("cancelJob"));
// TODO: router.post("/queue/:name/pause", protect, requireAdmin, safe("pauseQueue"));
// TODO: router.post("/queue/:name/resume", protect, requireAdmin, safe("resumeQueue"));

export default router;