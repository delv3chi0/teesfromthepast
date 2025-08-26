// backend/routes/adminDynamic.js
// Admin endpoints for dynamic runtime configuration management
// All changes are ephemeral and revert on process restart

import express from "express";
import { protect, admin as adminOnly } from "../middleware/authMiddleware.js";
import {
  getSnapshot,
  getRateLimitConfig,
  updateRateLimitConfig,
  getSecurityConfig,
  updateSecurityConfig,
  listAuditCategories,
  queryAuditLogs
} from "../config/dynamicConfig.js";

const router = express.Router();

/**
 * GET /api/admin/runtime/config
 * Get complete runtime configuration snapshot
 * @returns {Object} Current ephemeral configuration state
 */
router.get("/runtime/config", protect, adminOnly, async (req, res) => {
  try {
    const snapshot = getSnapshot();
    res.json(snapshot);
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: error.message || "Failed to retrieve runtime configuration"
    });
  }
});

/**
 * PUT /api/admin/runtime/rate-limit
 * Update rate limiting configuration
 * @body {Object} Rate limiting configuration updates
 * @returns {Object} Updated rate limiting configuration
 */
router.put("/runtime/rate-limit", protect, adminOnly, async (req, res) => {
  try {
    // Validate and update rate limit configuration
    updateRateLimitConfig(req.body);
    
    // Return updated configuration
    const updatedConfig = getRateLimitConfig();
    res.json({
      ok: true,
      config: updatedConfig,
      message: "Rate limiting configuration updated successfully"
    });
  } catch (error) {
    if (error.status === 400 && error.code === 'VALIDATION_ERROR') {
      res.status(400).json({
        ok: false,
        code: error.code,
        message: error.message
      });
    } else {
      res.status(500).json({
        ok: false,
        message: error.message || "Failed to update rate limiting configuration"
      });
    }
  }
});

/**
 * PUT /api/admin/runtime/security
 * Update security configuration
 * @body {Object} Security configuration updates
 * @returns {Object} Updated security configuration
 */
router.put("/runtime/security", protect, adminOnly, async (req, res) => {
  try {
    // Validate and update security configuration
    updateSecurityConfig(req.body);
    
    // Return updated configuration
    const updatedConfig = getSecurityConfig();
    res.json({
      ok: true,
      config: updatedConfig,
      message: "Security configuration updated successfully"
    });
  } catch (error) {
    if (error.status === 400 && error.code === 'VALIDATION_ERROR') {
      res.status(400).json({
        ok: false,
        code: error.code,
        message: error.message
      });
    } else {
      res.status(500).json({
        ok: false,
        message: error.message || "Failed to update security configuration"
      });
    }
  }
});

/**
 * GET /api/admin/audit/categories
 * List discovered audit log categories
 * @returns {Array} Array of audit categories
 */
router.get("/audit/categories", protect, adminOnly, async (req, res) => {
  try {
    const categories = listAuditCategories();
    res.json(categories);
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: error.message || "Failed to retrieve audit categories"
    });
  }
});

/**
 * GET /api/admin/audit/logs
 * Query audit logs with filtering
 * @query {string} [category] - Filter by category
 * @query {string} [q] - Search query for message/meta
 * @query {number} [limit] - Limit number of results (default: 200)
 * @query {string} [since] - ISO timestamp to filter from
 * @returns {Array} Filtered audit entries
 */
router.get("/audit/logs", protect, adminOnly, async (req, res) => {
  try {
    const { category, q, limit, since } = req.query;
    
    // Parse and validate limit
    let parsedLimit = limit ? parseInt(limit, 10) : 200;
    if (isNaN(parsedLimit) || parsedLimit < 1) {
      parsedLimit = 200;
    }
    // Cap limit to prevent excessive memory usage
    if (parsedLimit > 1000) {
      parsedLimit = 1000;
    }

    // Validate since timestamp if provided
    let parsedSince = null;
    if (since) {
      parsedSince = new Date(since);
      if (isNaN(parsedSince.getTime())) {
        return res.status(400).json({
          ok: false,
          code: 'VALIDATION_ERROR',
          message: 'Invalid since timestamp format'
        });
      }
      parsedSince = parsedSince.toISOString();
    }

    const logs = queryAuditLogs({
      category: category || undefined,
      q: q || undefined,
      limit: parsedLimit,
      since: parsedSince
    });

    res.json({
      ok: true,
      logs,
      total: logs.length,
      filters: {
        category: category || null,
        q: q || null,
        limit: parsedLimit,
        since: parsedSince
      }
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: error.message || "Failed to query audit logs"
    });
  }
});

export default router;