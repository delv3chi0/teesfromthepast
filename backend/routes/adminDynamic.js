// backend/routes/adminDynamic.js
// Dynamic Admin Console Routes
// Provides runtime configuration and operational monitoring endpoints

import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { admin } from "../middleware/adminMiddleware.js";
import {
  getRuntimeConfigSnapshot,
  updateRateLimit,
  updateSecurity,
  getRateLimitConfig,
  getSecurityConfig,
  getAuditLogSlice,
  getAuditCategories,
  pushAuditLog
} from "../config/dynamicConfig.js";

const router = express.Router();

/**
 * GET /api/admin/runtime/config
 * Get complete runtime configuration snapshot
 */
router.get("/runtime/config", protect, admin, async (req, res) => {
  try {
    const config = getRuntimeConfigSnapshot();
    
    // Log access to runtime config
    pushAuditLog({
      category: 'admin_access',
      message: 'Runtime configuration accessed',
      meta: {
        endpoint: '/api/admin/runtime/config',
        userId: req.user._id,
        username: req.user.username
      },
      actor: {
        id: req.user._id,
        username: req.user.username,
        displayName: req.user.username || req.user.email
      },
      level: 'info'
    });
    
    res.json(config);
  } catch (error) {
    console.error('Error getting runtime config:', error);
    res.status(500).json({ 
      error: 'Failed to get runtime configuration',
      message: error.message 
    });
  }
});

/**
 * PUT /api/admin/runtime/rate-limit
 * Update rate limiting configuration
 */
router.put("/runtime/rate-limit", protect, admin, async (req, res) => {
  try {
    const before = getRateLimitConfig();
    const updated = updateRateLimit(req.body);
    
    // Log the configuration change
    pushAuditLog({
      category: 'config_change',
      message: `Rate limiting configuration updated`,
      meta: {
        endpoint: '/api/admin/runtime/rate-limit',
        before,
        after: updated,
        changes: req.body,
        userId: req.user._id,
        username: req.user.username
      },
      actor: {
        id: req.user._id,
        username: req.user.username,
        displayName: req.user.username || req.user.email
      },
      level: 'info'
    });
    
    res.json(updated);
  } catch (error) {
    console.error('Error updating rate limit config:', error);
    
    // Log the failed attempt
    pushAuditLog({
      category: 'config_error',
      message: `Failed to update rate limiting configuration: ${error.message}`,
      meta: {
        endpoint: '/api/admin/runtime/rate-limit',
        attempted_changes: req.body,
        error: error.message,
        userId: req.user._id,
        username: req.user.username
      },
      actor: {
        id: req.user._id,
        username: req.user.username,
        displayName: req.user.username || req.user.email
      },
      level: 'error'
    });
    
    res.status(400).json({ 
      error: 'Invalid rate limit configuration',
      message: error.message 
    });
  }
});

/**
 * PUT /api/admin/runtime/security
 * Update security configuration
 */
router.put("/runtime/security", protect, adminOnly, async (req, res) => {
  try {
    const before = getSecurityConfig();
    const updated = updateSecurity(req.body);
    
    // Log the configuration change
    pushAuditLog({
      category: 'config_change',
      message: `Security configuration updated`,
      meta: {
        endpoint: '/api/admin/runtime/security',
        before,
        after: updated,
        changes: req.body,
        userId: req.user._id,
        username: req.user.username
      },
      actor: {
        id: req.user._id,
        username: req.user.username,
        displayName: req.user.username || req.user.email
      },
      level: 'info'
    });
    
    res.json(updated);
  } catch (error) {
    console.error('Error updating security config:', error);
    
    // Log the failed attempt
    pushAuditLog({
      category: 'config_error',
      message: `Failed to update security configuration: ${error.message}`,
      meta: {
        endpoint: '/api/admin/runtime/security',
        attempted_changes: req.body,
        error: error.message,
        userId: req.user._id,
        username: req.user.username
      },
      actor: {
        id: req.user._id,
        username: req.user.username,
        displayName: req.user.username || req.user.email
      },
      level: 'error'
    });
    
    res.status(400).json({ 
      error: 'Invalid security configuration',
      message: error.message 
    });
  }
});

/**
 * GET /api/admin/audit/categories
 * Get available audit log categories
 */
router.get("/audit/categories", protect, adminOnly, async (req, res) => {
  try {
    const categories = getAuditCategories();
    res.json(categories);
  } catch (error) {
    console.error('Error getting audit categories:', error);
    res.status(500).json({ 
      error: 'Failed to get audit categories',
      message: error.message 
    });
  }
});

/**
 * GET /api/admin/audit/logs
 * Get filtered audit logs
 * Query parameters:
 * - category: Filter by category (exact match)
 * - q: Search query (case-insensitive substring)
 * - limit: Maximum number of results (default 100, max 500)
 * - since: ISO timestamp to filter logs after
 */
router.get("/audit/logs", protect, adminOnly, async (req, res) => {
  try {
    const { category, q, limit, since } = req.query;
    
    const logs = getAuditLogSlice({
      category,
      q,
      limit: limit ? parseInt(limit) : undefined,
      since
    });
    
    // Log audit access (but don't create infinite loop)
    if (category !== 'audit_access') {
      pushAuditLog({
        category: 'audit_access',
        message: `Audit logs accessed`,
        meta: {
          endpoint: '/api/admin/audit/logs',
          filters: { category, q, limit, since },
          resultCount: logs.length,
          userId: req.user._id,
          username: req.user.username
        },
        actor: {
          id: req.user._id,
          username: req.user.username,
          displayName: req.user.username || req.user.email
        },
        level: 'info'
      });
    }
    
    res.json(logs);
  } catch (error) {
    console.error('Error getting audit logs:', error);
    res.status(500).json({ 
      error: 'Failed to get audit logs',
      message: error.message 
    });
  }
});

export default router;