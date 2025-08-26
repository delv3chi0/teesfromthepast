// backend/config/dynamicConfig.js
// Dynamic configuration layer for in-memory runtime overrides
// Provides getters/setters for runtime config without mutating process.env

import { logger } from '../utils/logger.js';

// In-memory store for dynamic overrides
const dynamicStore = {
  rateLimit: {
    algorithm: null,
    globalMax: null,
    windowMs: null,
    overrides: null,
    roleOverrides: null
  },
  security: {
    CSP_REPORT_ONLY: null,
    ENABLE_COEP: null
  },
  tracing: {
    REQUEST_ID_HEADER: null
  },
  metrics: {
    ENABLE_METRICS: null
  }
};

// Helper to validate and sanitize numeric limits
function sanitizeNumericLimit(value, min = 1, max = 1000000) {
  if (value === null || value === undefined) return null;
  const num = parseInt(value, 10);
  if (isNaN(num)) return null;
  return Math.max(min, Math.min(max, num));
}

// Helper to validate boolean values
function sanitizeBoolean(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }
  return Boolean(value);
}

/**
 * Get rate limiting configuration with dynamic overrides applied
 */
export function getRateLimitConfig() {
  const env = process.env;
  return {
    algorithm: dynamicStore.rateLimit.algorithm || env.RATE_LIMIT_ALGORITHM || 'fixed',
    globalMax: dynamicStore.rateLimit.globalMax || parseInt(env.RATE_LIMIT_MAX || '120', 10),
    windowMs: dynamicStore.rateLimit.windowMs || parseInt(env.RATE_LIMIT_WINDOW || '60000', 10),
    overrides: dynamicStore.rateLimit.overrides || env.RATE_LIMIT_OVERRIDES || '',
    roleOverrides: dynamicStore.rateLimit.roleOverrides || env.RATE_LIMIT_ROLE_OVERRIDES || ''
  };
}

/**
 * Update rate limiting configuration (in-memory only)
 */
export function updateRateLimitConfig(updates) {
  const sanitized = {};
  
  if (updates.algorithm && ['fixed', 'sliding', 'token_bucket'].includes(updates.algorithm)) {
    sanitized.algorithm = updates.algorithm;
  }
  
  if (updates.globalMax !== undefined) {
    sanitized.globalMax = sanitizeNumericLimit(updates.globalMax, 1, 1000000);
  }
  
  if (updates.windowMs !== undefined) {
    sanitized.windowMs = sanitizeNumericLimit(updates.windowMs, 1000, 3600000); // 1s to 1hr
  }
  
  if (updates.overrides !== undefined) {
    sanitized.overrides = typeof updates.overrides === 'string' ? updates.overrides : '';
  }
  
  if (updates.roleOverrides !== undefined) {
    sanitized.roleOverrides = typeof updates.roleOverrides === 'string' ? updates.roleOverrides : '';
  }
  
  // Apply sanitized updates
  Object.assign(dynamicStore.rateLimit, sanitized);
  
  logger.info('Rate limit config updated', { updates: sanitized });
  return getRateLimitConfig();
}

/**
 * Get security configuration with dynamic overrides applied
 */
export function getSecurityConfig() {
  const env = process.env;
  return {
    CSP_REPORT_ONLY: dynamicStore.security.CSP_REPORT_ONLY !== null 
      ? dynamicStore.security.CSP_REPORT_ONLY 
      : (env.CSP_REPORT_ONLY !== 'false'),
    ENABLE_COEP: dynamicStore.security.ENABLE_COEP !== null
      ? dynamicStore.security.ENABLE_COEP
      : (env.ENABLE_COEP === 'true')
  };
}

/**
 * Update security configuration (in-memory only)
 */
export function updateSecurityConfig(updates) {
  const sanitized = {};
  
  if (updates.CSP_REPORT_ONLY !== undefined) {
    sanitized.CSP_REPORT_ONLY = sanitizeBoolean(updates.CSP_REPORT_ONLY);
  }
  
  if (updates.ENABLE_COEP !== undefined) {
    sanitized.ENABLE_COEP = sanitizeBoolean(updates.ENABLE_COEP);
  }
  
  // Apply sanitized updates
  Object.assign(dynamicStore.security, sanitized);
  
  logger.info('Security config updated', { updates: sanitized });
  return getSecurityConfig();
}

/**
 * Get tracing configuration with dynamic overrides applied
 */
export function getTracingConfig() {
  const env = process.env;
  return {
    REQUEST_ID_HEADER: dynamicStore.tracing.REQUEST_ID_HEADER || env.REQUEST_ID_HEADER || 'X-Request-Id'
  };
}

/**
 * Get metrics configuration with dynamic overrides applied
 */
export function getMetricsConfig() {
  const env = process.env;
  const nodeEnv = env.NODE_ENV || 'development';
  
  let defaultEnabled;
  if (nodeEnv === 'production') {
    defaultEnabled = env.ENABLE_METRICS === 'true';
  } else {
    defaultEnabled = env.ENABLE_METRICS !== 'false';
  }
  
  return {
    ENABLE_METRICS: dynamicStore.metrics.ENABLE_METRICS !== null
      ? dynamicStore.metrics.ENABLE_METRICS
      : defaultEnabled
  };
}

/**
 * Get all runtime configuration
 */
export function getAllRuntimeConfig() {
  const env = process.env;
  
  return {
    rateLimit: getRateLimitConfig(),
    security: getSecurityConfig(),
    tracing: getTracingConfig(),
    metrics: getMetricsConfig(),
    versions: {
      nodeVersion: process.version,
      platform: process.platform,
      uptime: process.uptime(),
      pid: process.pid,
      env: env.NODE_ENV || 'development'
    }
  };
}

/**
 * Reset all dynamic overrides (for testing/debugging)
 */
export function resetDynamicConfig() {
  dynamicStore.rateLimit = {
    algorithm: null,
    globalMax: null,
    windowMs: null,
    overrides: null,
    roleOverrides: null
  };
  dynamicStore.security = {
    CSP_REPORT_ONLY: null,
    ENABLE_COEP: null
  };
  dynamicStore.tracing = {
    REQUEST_ID_HEADER: null
  };
  dynamicStore.metrics = {
    ENABLE_METRICS: null
  };
  
  logger.info('Dynamic config reset to defaults');
}

/**
 * Get current dynamic overrides (for debugging)
 */
export function getDynamicOverrides() {
  return JSON.parse(JSON.stringify(dynamicStore));
}