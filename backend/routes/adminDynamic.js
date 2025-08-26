// backend/routes/adminDynamic.js
// Runtime & Audit Routes for dynamic admin console
import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getRuntimeConfigSnapshot,
  updateRateLimit,
  updateSecurity,
  getAuditLogSlice,
  getAuditCategories
} from '../config/dynamicConfig.js';
import { logAdminAction } from '../utils/audit.js';

const router = express.Router();

// Middleware to ensure admin access
const requireAdmin = (req, res, next) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({
      error: 'Admin access required'
    });
  }
  next();
};

// Apply protection and admin check to all routes
router.use(protect);
router.use(requireAdmin);

/**
 * GET /api/admin/runtime/config
 * Get complete runtime configuration snapshot
 */
router.get('/runtime/config', async (req, res) => {
  try {
    const config = getRuntimeConfigSnapshot();
    
    await logAdminAction(req, {
      action: 'RUNTIME_CONFIG_READ',
      targetType: 'RuntimeConfig',
      meta: { endpoint: 'runtime/config' }
    });
    
    res.json(config);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get runtime configuration',
      details: error.message
    });
  }
});

/**
 * PUT /api/admin/runtime/rate-limit
 * Update rate limiting configuration with partial overrides
 */
router.put('/runtime/rate-limit', async (req, res) => {
  try {
    const updates = req.body;
    
    // Validate request body
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({
        error: 'Request body must be an object'
      });
    }
    
    const before = getRuntimeConfigSnapshot().rateLimit;
    const updated = updateRateLimit(updates);
    
    await logAdminAction(req, {
      action: 'RUNTIME_RATE_LIMIT_UPDATE',
      targetType: 'RuntimeConfig',
      meta: { before, after: updated, changes: updates }
    });
    
    res.json({
      success: true,
      config: updated
    });
  } catch (error) {
    res.status(400).json({
      error: 'Failed to update rate limit configuration',
      details: error.message
    });
  }
});

/**
 * PUT /api/admin/runtime/security
 * Toggle CSP report-only & COEP dynamically
 */
router.put('/runtime/security', async (req, res) => {
  try {
    const updates = req.body;
    
    // Validate request body
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({
        error: 'Request body must be an object'
      });
    }
    
    const before = getRuntimeConfigSnapshot().security;
    const updated = updateSecurity(updates);
    
    await logAdminAction(req, {
      action: 'RUNTIME_SECURITY_UPDATE',
      targetType: 'RuntimeConfig',
      meta: { before, after: updated, changes: updates }
    });
    
    res.json({
      success: true,
      config: updated
    });
  } catch (error) {
    res.status(400).json({
      error: 'Failed to update security configuration',
      details: error.message
    });
  }
});

/**
 * GET /api/admin/audit/categories
 * Get unique audit log categories
 */
router.get('/audit/categories', async (req, res) => {
  try {
    const categories = getAuditCategories();
    
    res.json({
      categories
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get audit categories',
      details: error.message
    });
  }
});

/**
 * GET /api/admin/audit/logs
 * Get audit logs with filtering support
 * Query parameters:
 * - category: filter by category
 * - q: search query (case-insensitive substring match)
 * - limit: maximum number of results (default: 100)
 * - since: ISO timestamp for filtering recent logs
 */
router.get('/audit/logs', async (req, res) => {
  try {
    const { category, q, limit, since } = req.query;
    
    // Validate limit parameter
    let parsedLimit = 100;
    if (limit) {
      parsedLimit = parseInt(limit, 10);
      if (isNaN(parsedLimit) || parsedLimit <= 0 || parsedLimit > 1000) {
        return res.status(400).json({
          error: 'Limit must be a positive integer between 1 and 1000'
        });
      }
    }
    
    // Validate since parameter
    let sinceDate = null;
    if (since) {
      sinceDate = new Date(since);
      if (isNaN(sinceDate.getTime())) {
        return res.status(400).json({
          error: 'Since parameter must be a valid ISO timestamp'
        });
      }
    }
    
    const filter = {
      category,
      q,
      limit: parsedLimit,
      since: sinceDate ? sinceDate.toISOString() : undefined
    };
    
    const logs = getAuditLogSlice(filter);
    
    res.json({
      logs,
      filter: {
        category: category || null,
        query: q || null,
        limit: parsedLimit,
        since: sinceDate ? sinceDate.toISOString() : null
      },
      total: logs.length
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get audit logs',
      details: error.message
    });
  }
});

export default router;