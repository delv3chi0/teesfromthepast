// backend/routes/adminDynamic.js
// Consolidated routes for runtime config & audit operations

import express from 'express';
import { protect, admin as adminOnly } from '../middleware/authMiddleware.js';
import { 
  getAllRuntimeConfig, 
  updateRateLimitConfig, 
  updateSecurityConfig,
  getDynamicOverrides
} from '../config/dynamicConfig.js';
import { getRecentAuditLogs, getAuditCategories } from '../utils/audit.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * GET /api/admin/runtime/config
 * Returns structured runtime configuration with dynamic overrides
 */
router.get('/runtime/config', protect, adminOnly, async (req, res) => {
  try {
    const config = getAllRuntimeConfig();
    
    res.json({
      ok: true,
      config,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting runtime config', { error: error.message });
    res.status(500).json({
      ok: false,
      error: {
        code: 'CONFIG_ERROR',
        message: 'Failed to get runtime configuration'
      }
    });
  }
});

/**
 * PUT /api/admin/runtime/rate-limit
 * Update rate limiting configuration (memory-only overrides)
 */
router.put('/runtime/rate-limit', protect, adminOnly, async (req, res) => {
  try {
    const { algorithm, globalMax, windowMs, overrides, roleOverrides } = req.body;
    
    // Validate input
    if (algorithm && !['fixed', 'sliding', 'token_bucket'].includes(algorithm)) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_ALGORITHM',
          message: 'Algorithm must be one of: fixed, sliding, token_bucket'
        }
      });
    }
    
    if (globalMax !== undefined && (typeof globalMax !== 'number' || globalMax < 1 || globalMax > 1000000)) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_GLOBAL_MAX',
          message: 'globalMax must be a number between 1 and 1,000,000'
        }
      });
    }
    
    if (windowMs !== undefined && (typeof windowMs !== 'number' || windowMs < 1000 || windowMs > 3600000)) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_WINDOW_MS',
          message: 'windowMs must be a number between 1,000 and 3,600,000 (1s to 1hr)'
        }
      });
    }
    
    const updates = {};
    if (algorithm !== undefined) updates.algorithm = algorithm;
    if (globalMax !== undefined) updates.globalMax = globalMax;
    if (windowMs !== undefined) updates.windowMs = windowMs;
    if (overrides !== undefined) updates.overrides = overrides;
    if (roleOverrides !== undefined) updates.roleOverrides = roleOverrides;
    
    const updatedConfig = updateRateLimitConfig(updates);
    
    res.json({
      ok: true,
      config: { rateLimit: updatedConfig },
      applied: updates,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error updating rate limit config', { error: error.message });
    res.status(500).json({
      ok: false,
      error: {
        code: 'UPDATE_ERROR',
        message: 'Failed to update rate limit configuration'
      }
    });
  }
});

/**
 * PUT /api/admin/runtime/security
 * Update security configuration (memory-only overrides)
 */
router.put('/runtime/security', protect, adminOnly, async (req, res) => {
  try {
    const { CSP_REPORT_ONLY, ENABLE_COEP } = req.body;
    
    const updates = {};
    if (CSP_REPORT_ONLY !== undefined) updates.CSP_REPORT_ONLY = CSP_REPORT_ONLY;
    if (ENABLE_COEP !== undefined) updates.ENABLE_COEP = ENABLE_COEP;
    
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'NO_UPDATES',
          message: 'No valid security configuration updates provided'
        }
      });
    }
    
    const updatedConfig = updateSecurityConfig(updates);
    
    res.json({
      ok: true,
      config: { security: updatedConfig },
      applied: updates,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error updating security config', { error: error.message });
    res.status(500).json({
      ok: false,
      error: {
        code: 'UPDATE_ERROR',
        message: 'Failed to update security configuration'
      }
    });
  }
});

/**
 * GET /api/admin/audit/categories
 * Returns unique category list from audit logger
 */
router.get('/audit/categories', protect, adminOnly, async (req, res) => {
  try {
    const categories = await getAuditCategories();
    
    res.json({
      ok: true,
      categories,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting audit categories', { error: error.message });
    
    // Fallback to static seed categories
    const fallbackCategories = [
      'LOGIN', 'LOGOUT', 'USER_CREATE', 'USER_UPDATE', 'USER_DELETE',
      'ORDER_CREATE', 'ORDER_UPDATE', 'DESIGN_CREATE', 'DESIGN_DELETE',
      'ADMIN_ACTION', 'SESSION_REVOKE', 'CONFIG_UPDATE'
    ];
    
    res.json({
      ok: true,
      categories: fallbackCategories,
      fallback: true,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/admin/audit/logs
 * Returns filtered audit logs with search capability
 */
router.get('/audit/logs', protect, adminOnly, async (req, res) => {
  try {
    const { category, q, limit = 100, since } = req.query;
    
    const parsedLimit = Math.min(parseInt(limit, 10) || 100, 500); // Max 500 entries
    const sinceDate = since ? new Date(since) : null;
    
    const logs = await getRecentAuditLogs({
      category,
      search: q,
      limit: parsedLimit,
      since: sinceDate
    });
    
    res.json({
      ok: true,
      logs,
      meta: {
        count: logs.length,
        limit: parsedLimit,
        category: category || null,
        search: q || null,
        since: since || null
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting audit logs', { error: error.message });
    res.status(500).json({
      ok: false,
      error: {
        code: 'AUDIT_ERROR',
        message: 'Failed to retrieve audit logs'
      }
    });
  }
});

/**
 * GET /api/admin/runtime/overrides
 * Debug endpoint to view current dynamic overrides
 */
router.get('/runtime/overrides', protect, adminOnly, async (req, res) => {
  try {
    const overrides = getDynamicOverrides();
    
    res.json({
      ok: true,
      overrides,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting dynamic overrides', { error: error.message });
    res.status(500).json({
      ok: false,
      error: {
        code: 'OVERRIDES_ERROR',
        message: 'Failed to get dynamic overrides'
      }
    });
  }
});

export default router;