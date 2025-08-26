// backend/routes/adminDynamic.js
// Admin Dynamic Runtime Configuration and Audit Endpoints
import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getRuntimeConfigSnapshot,
  updateRateLimit,
  updateSecurity,
  getAuditCategories,
  getAuditLogs,
  resetDynamicConfig
} from '../config/dynamicConfig.js';
import { body, query, validationResult } from 'express-validator';

const router = express.Router();

// Admin middleware
function requireAdmin(req, res, next) {
  if (req?.user?.isAdmin) return next();
  return res.status(403).json({ 
    ok: false, 
    error: { code: 'FORBIDDEN', message: 'Admin access required' } 
  });
}

/**
 * GET /api/admin/runtime/config
 * Get complete runtime configuration snapshot
 */
router.get('/runtime/config', protect, requireAdmin, (req, res) => {
  try {
    const snapshot = getRuntimeConfigSnapshot();
    res.json({
      ok: true,
      config: snapshot,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get runtime config' }
    });
  }
});

/**
 * PUT /api/admin/runtime/rate-limit
 * Update in-memory rate limiting configuration
 */
router.put('/runtime/rate-limit', 
  protect, 
  requireAdmin,
  [
    body('globalMax').optional().isInt({ min: 1 }).withMessage('globalMax must be a positive integer'),
    body('windowMs').optional().isInt({ min: 1000 }).withMessage('windowMs must be at least 1000ms'),
    body('algorithm').optional().isIn(['fixed', 'sliding', 'token_bucket']).withMessage('algorithm must be fixed, sliding, or token_bucket'),
    body('pathOverrides').optional().isArray().withMessage('pathOverrides must be an array'),
    body('pathOverrides.*.path').if(body('pathOverrides').exists()).notEmpty().withMessage('path is required'),
    body('pathOverrides.*.max').if(body('pathOverrides').exists()).isInt({ min: 1 }).withMessage('max must be positive'),
    body('roleOverrides').optional().isArray().withMessage('roleOverrides must be an array'),
    body('roleOverrides.*.role').if(body('roleOverrides').exists()).notEmpty().withMessage('role is required'),
    body('roleOverrides.*.max').if(body('roleOverrides').exists()).isInt({ min: 1 }).withMessage('max must be positive'),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        ok: false,
        error: { 
          code: 'VALIDATION_ERROR', 
          message: 'Invalid request parameters',
          details: errors.array()
        }
      });
    }

    try {
      const { globalMax, windowMs, algorithm, pathOverrides, roleOverrides } = req.body;
      
      updateRateLimit({
        globalMax,
        windowMs,
        algorithm,
        pathOverrides,
        roleOverrides
      });

      // Get updated snapshot to return
      const snapshot = getRuntimeConfigSnapshot();
      
      res.json({
        ok: true,
        message: 'Rate limit configuration updated',
        config: snapshot.rateLimit,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update rate limit config' }
      });
    }
  }
);

/**
 * PUT /api/admin/runtime/security
 * Update security configuration toggles
 */
router.put('/runtime/security',
  protect,
  requireAdmin,
  [
    body('cspReportOnly').optional().isBoolean().withMessage('cspReportOnly must be boolean'),
    body('enableCOEP').optional().isBoolean().withMessage('enableCOEP must be boolean'),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        ok: false,
        error: { 
          code: 'VALIDATION_ERROR', 
          message: 'Invalid request parameters',
          details: errors.array()
        }
      });
    }

    try {
      const { cspReportOnly, enableCOEP } = req.body;
      
      updateSecurity({
        cspReportOnly,
        enableCOEP
      });

      // Get updated snapshot to return
      const snapshot = getRuntimeConfigSnapshot();
      
      res.json({
        ok: true,
        message: 'Security configuration updated',
        config: snapshot.security,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update security config' }
      });
    }
  }
);

/**
 * GET /api/admin/audit/categories
 * Get list of audit log categories
 */
router.get('/audit/categories', protect, requireAdmin, (req, res) => {
  try {
    const categories = getAuditCategories();
    
    res.json({
      ok: true,
      categories,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get audit categories' }
    });
  }
});

/**
 * GET /api/admin/audit/logs
 * Get audit logs with filtering
 * Query params: category, q (search), limit, since (ISO timestamp)
 */
router.get('/audit/logs',
  protect,
  requireAdmin,
  [
    query('category').optional().isString().withMessage('category must be string'),
    query('q').optional().isString().withMessage('q must be string'),
    query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('limit must be 1-1000'),
    query('since').optional().isISO8601().withMessage('since must be ISO8601 timestamp'),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        ok: false,
        error: { 
          code: 'VALIDATION_ERROR', 
          message: 'Invalid query parameters',
          details: errors.array()
        }
      });
    }

    try {
      const { category, q, limit = 50, since } = req.query;
      
      const logs = getAuditLogs({
        category,
        q,
        limit: parseInt(limit),
        since
      });
      
      res.json({
        ok: true,
        logs,
        count: logs.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get audit logs' }
      });
    }
  }
);

/**
 * POST /api/admin/runtime/reset
 * Reset dynamic configuration to defaults
 */
router.post('/runtime/reset', protect, requireAdmin, (req, res) => {
  try {
    resetDynamicConfig();
    
    const snapshot = getRuntimeConfigSnapshot();
    
    res.json({
      ok: true,
      message: 'Dynamic configuration reset to defaults',
      config: snapshot,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to reset configuration' }
    });
  }
});

export default router;