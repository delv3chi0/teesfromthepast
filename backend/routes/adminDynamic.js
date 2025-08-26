// backend/routes/adminDynamic.js
/**
 * Dynamic Admin API routes for runtime configuration management
 * 
 * All endpoints require admin authentication and provide in-memory
 * configuration management without persistence.
 * 
 * Endpoints:
 * - GET /api/admin/runtime/config - Get current runtime configuration
 * - PUT /api/admin/runtime/rate-limit - Update rate limiting configuration
 * - PUT /api/admin/runtime/security - Update security configuration
 * - GET /api/admin/audit/categories - Get available audit log categories
 * - GET /api/admin/audit/logs - Get filtered audit logs from ring buffer
 */

import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getDynamicConfig,
  updateRateLimitConfig,
  updateSecurityConfig,
  getAuditCategories,
  getAuditLogs
} from '../config/dynamicConfig.js';

const router = express.Router();

/**
 * Middleware to require admin role
 */
function requireAdmin(req, res, next) {
  if (!req.user?.isAdmin) {
    return res.status(403).json({
      error: {
        code: 'INSUFFICIENT_PERMISSIONS',
        message: 'Admin role required'
      }
    });
  }
  next();
}

/**
 * GET /api/admin/runtime/config
 * 
 * Get current runtime configuration snapshot including:
 * - Rate limiting settings and overrides
 * - Security header configuration
 * - Tracing configuration and recent request IDs
 * - Metrics enablement status
 * - Audit ring buffer status
 * - Version information
 */
router.get('/runtime/config', protect, requireAdmin, (req, res) => {
  try {
    const config = getDynamicConfig();
    
    res.json({
      success: true,
      data: config,
      timestamp: new Date().toISOString(),
      ephemeral: true // Indicate this is in-memory only
    });
  } catch (error) {
    console.error('[adminDynamic] Error fetching runtime config:', error);
    res.status(500).json({
      error: {
        code: 'RUNTIME_CONFIG_ERROR',
        message: 'Failed to fetch runtime configuration'
      }
    });
  }
});

/**
 * PUT /api/admin/runtime/rate-limit
 * 
 * Update rate limiting configuration in memory.
 * 
 * Request body can include:
 * - algorithm: 'fixed' | 'sliding' | 'token_bucket'
 * - globalMax: positive integer
 * - windowMs: positive integer (milliseconds)
 * - overrides: [{ pathPrefix, max, algorithm? }]
 * - roleOverrides: [{ role, pathPrefix?, max, algorithm? }]
 * 
 * Changes take effect immediately for new requests.
 */
router.put('/runtime/rate-limit', protect, requireAdmin, (req, res) => {
  try {
    const updates = req.body;
    
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({
        error: {
          code: 'INVALID_REQUEST_BODY',
          message: 'Request body must be a valid object'
        }
      });
    }
    
    const result = updateRateLimitConfig(updates);
    
    if (!result.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Rate limit configuration validation failed',
          details: result.errors
        }
      });
    }
    
    // Get updated configuration
    const updatedConfig = getDynamicConfig();
    
    res.json({
      success: true,
      message: 'Rate limit configuration updated successfully',
      data: updatedConfig.rateLimit,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[adminDynamic] Error updating rate limit config:', error);
    res.status(500).json({
      error: {
        code: 'RATE_LIMIT_UPDATE_ERROR',
        message: 'Failed to update rate limit configuration'
      }
    });
  }
});

/**
 * PUT /api/admin/runtime/security
 * 
 * Update security configuration in memory.
 * 
 * Request body can include:
 * - cspReportOnly: boolean (true = CSP report-only mode, false = enforcing)
 * - enableCOEP: boolean (Cross-Origin Embedder Policy header)
 * 
 * Changes take effect immediately for new requests.
 */
router.put('/runtime/security', protect, requireAdmin, (req, res) => {
  try {
    const updates = req.body;
    
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({
        error: {
          code: 'INVALID_REQUEST_BODY',
          message: 'Request body must be a valid object'
        }
      });
    }
    
    const result = updateSecurityConfig(updates);
    
    if (!result.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Security configuration validation failed',
          details: result.errors
        }
      });
    }
    
    // Get updated configuration
    const updatedConfig = getDynamicConfig();
    
    res.json({
      success: true,
      message: 'Security configuration updated successfully',
      data: updatedConfig.security,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[adminDynamic] Error updating security config:', error);
    res.status(500).json({
      error: {
        code: 'SECURITY_UPDATE_ERROR',
        message: 'Failed to update security configuration'
      }
    });
  }
});

/**
 * GET /api/admin/audit/categories
 * 
 * Get list of available audit log categories from the ring buffer.
 * Categories are dynamically determined from recent audit entries.
 */
router.get('/audit/categories', protect, requireAdmin, (req, res) => {
  try {
    const categories = getAuditCategories();
    
    res.json({
      success: true,
      data: categories,
      count: categories.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[adminDynamic] Error fetching audit categories:', error);
    res.status(500).json({
      error: {
        code: 'AUDIT_CATEGORIES_ERROR',
        message: 'Failed to fetch audit categories'
      }
    });
  }
});

/**
 * GET /api/admin/audit/logs
 * 
 * Get filtered audit logs from the ring buffer.
 * 
 * Query parameters:
 * - category: Filter by category (partial match)
 * - q: Search query (searches message and meta)
 * - limit: Maximum number of entries to return (default: 50)
 * - since: ISO timestamp, only return entries after this time
 * 
 * Returns entries sorted by timestamp (newest first).
 */
router.get('/audit/logs', protect, requireAdmin, (req, res) => {
  try {
    const {
      category = '',
      q = '',
      limit = '50',
      since = null
    } = req.query;
    
    // Validate limit parameter
    const parsedLimit = parseInt(limit, 10);
    if (isNaN(parsedLimit) || parsedLimit <= 0 || parsedLimit > 1000) {
      return res.status(400).json({
        error: {
          code: 'INVALID_LIMIT',
          message: 'Limit must be a positive integer between 1 and 1000'
        }
      });
    }
    
    // Validate since parameter if provided
    if (since && isNaN(new Date(since).getTime())) {
      return res.status(400).json({
        error: {
          code: 'INVALID_SINCE',
          message: 'Since parameter must be a valid ISO timestamp'
        }
      });
    }
    
    const filters = {
      category: category.trim(),
      q: q.trim(),
      limit: parsedLimit,
      since: since ? since.trim() : null
    };
    
    const logs = getAuditLogs(filters);
    
    res.json({
      success: true,
      data: logs,
      count: logs.length,
      filters,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[adminDynamic] Error fetching audit logs:', error);
    res.status(500).json({
      error: {
        code: 'AUDIT_LOGS_ERROR',
        message: 'Failed to fetch audit logs'
      }
    });
  }
});

export default router;