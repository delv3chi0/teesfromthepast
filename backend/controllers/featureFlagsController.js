// backend/controllers/featureFlagsController.js
// Feature flags management endpoints (Task 8)
import asyncHandler from "express-async-handler";
import featureFlags, { getAllFlags, getFlagsByCategory, getFlag } from "../flags/FeatureFlags.js";
import { logger } from "../utils/logger.js";

/** GET /api/flags - Get all feature flags */
export const getFeatureFlags = asyncHandler(async (req, res) => {
  const { category } = req.query;
  
  try {
    let flags;
    
    if (category) {
      flags = getFlagsByCategory(category);
    } else {
      flags = getAllFlags();
    }
    
    const response = {
      message: "Feature flags retrieved successfully",
      flags,
      total: Object.keys(flags).length,
      requestedBy: req.auth?.userId || req.user?._id?.toString() || 'anonymous'
    };
    
    if (category) {
      response.category = category;
    }
    
    logger.debug('Feature flags requested', {
      category,
      flagCount: response.total,
      requestedBy: response.requestedBy
    });
    
    res.json(response);
    
  } catch (error) {
    logger.error('Error retrieving feature flags', { 
      error: error.message,
      category,
      requestedBy: req.auth?.userId || req.user?._id?.toString()
    });
    
    res.status(500).json({
      message: "Failed to retrieve feature flags",
      code: "FLAGS_ERROR",
      error: error.message
    });
  }
});

/** GET /api/flags/:key - Get a specific feature flag */
export const getFeatureFlag = asyncHandler(async (req, res) => {
  const { key } = req.params;
  
  if (!key) {
    return res.status(400).json({
      message: "Flag key is required",
      code: "FLAG_KEY_REQUIRED"
    });
  }
  
  try {
    const value = getFlag(key);
    const allFlags = getAllFlags();
    const flagConfig = allFlags[key];
    
    if (flagConfig) {
      res.json({
        message: "Feature flag retrieved successfully",
        flag: {
          key,
          value: flagConfig.value,
          source: flagConfig.source,
          type: flagConfig.type,
          category: flagConfig.category,
          description: flagConfig.description
        }
      });
    } else {
      res.status(404).json({
        message: "Feature flag not found",
        code: "FLAG_NOT_FOUND",
        key
      });
    }
    
  } catch (error) {
    logger.error('Error retrieving feature flag', { 
      error: error.message,
      key,
      requestedBy: req.auth?.userId || req.user?._id?.toString()
    });
    
    res.status(500).json({
      message: "Failed to retrieve feature flag",
      code: "FLAG_ERROR",
      error: error.message,
      key
    });
  }
});

/** POST /api/flags/:key - Set a feature flag value (runtime only) */
export const setFeatureFlag = asyncHandler(async (req, res) => {
  const { key } = req.params;
  const { value } = req.body;
  
  if (!key) {
    return res.status(400).json({
      message: "Flag key is required",
      code: "FLAG_KEY_REQUIRED"
    });
  }
  
  if (value === undefined) {
    return res.status(400).json({
      message: "Flag value is required",
      code: "FLAG_VALUE_REQUIRED"
    });
  }
  
  try {
    const userId = req.auth?.userId || req.user?._id?.toString() || 'anonymous';
    
    featureFlags.set(key, value, `admin:${userId}`);
    
    logger.info('Feature flag set at runtime', {
      key,
      value,
      type: typeof value,
      setBy: userId
    });
    
    res.json({
      message: "Feature flag set successfully",
      flag: {
        key,
        value,
        source: `admin:${userId}`,
        type: typeof value,
        setAt: new Date().toISOString()
      },
      warning: "This is a runtime change and will not persist across server restarts"
    });
    
  } catch (error) {
    logger.error('Error setting feature flag', { 
      error: error.message,
      key,
      value,
      setBy: req.auth?.userId || req.user?._id?.toString()
    });
    
    res.status(500).json({
      message: "Failed to set feature flag",
      code: "FLAG_SET_ERROR",
      error: error.message,
      key
    });
  }
});

/** POST /api/flags/reload - Reload feature flags from file (admin only) */
export const reloadFeatureFlags = asyncHandler(async (req, res) => {
  try {
    await featureFlags.reloadFromFile();
    
    const userId = req.auth?.userId || req.user?._id?.toString() || 'anonymous';
    
    logger.info('Feature flags reloaded manually', {
      reloadedBy: userId,
      timestamp: new Date().toISOString()
    });
    
    res.json({
      message: "Feature flags reloaded successfully",
      reloadedAt: new Date().toISOString(),
      reloadedBy: userId,
      totalFlags: Object.keys(getAllFlags()).length
    });
    
  } catch (error) {
    logger.error('Error reloading feature flags', { 
      error: error.message,
      reloadedBy: req.auth?.userId || req.user?._id?.toString()
    });
    
    res.status(500).json({
      message: "Failed to reload feature flags",
      code: "FLAGS_RELOAD_ERROR",
      error: error.message
    });
  }
});

// TODO: Task 8 - Additional feature flag endpoints to implement later:
// TODO: - POST /flags/validate - Validate flag configuration without applying
// TODO: - GET /flags/history - Get flag change history
// TODO: - POST /flags/rollback - Rollback to previous flag configuration
// TODO: - GET /flags/categories - Get available flag categories
// TODO: - PUT /flags/bulk - Bulk update multiple flags
// TODO: - GET /flags/usage - Get flag usage analytics

export default {
  getFeatureFlags,
  getFeatureFlag,
  setFeatureFlag,
  reloadFeatureFlags
};