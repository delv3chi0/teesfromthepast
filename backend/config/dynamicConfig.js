// backend/config/dynamicConfig.js
/**
 * In-memory dynamic runtime configuration module
 * 
 * This module provides runtime configuration management for:
 * - Rate limiting (algorithm, global settings, path/role overrides)
 * - Security headers (CSP report-only, COEP enablement)
 * - Tracing (request ID tracking, ring buffer)
 * - Metrics (enabled state, dynamic reads)
 * - Audit logs (ring buffer for recent entries)
 * - Version information (commit, build time)
 * 
 * All changes are purely in-memory and ephemeral - no persistence.
 * When dynamic config is unchanged, existing behavior remains identical.
 */

import { getConfig } from './index.js';

// In-memory configuration state
let dynamicConfig = {
  rateLimit: {
    algorithm: 'fixed', // fixed | sliding | token_bucket
    globalMax: 120,
    windowMs: 60000,
    overrides: [], // [{ pathPrefix, max, algorithm? }]
    roleOverrides: [] // [{ role, pathPrefix?, max, algorithm? }]
  },
  security: {
    cspReportOnly: true,
    enableCOEP: false
  },
  tracing: {
    requestIdHeader: 'X-Request-Id',
    ringBuffer: []
  },
  metrics: {
    enabled: true // reflects startup state
  },
  audit: {
    ringBuffer: [],
    maxSize: 500
  },
  version: {
    commit: 'unknown',
    buildTime: 'unknown',
    version: '1.0.0'
  }
};

// Ring buffers
const tracingRingBuffer = [];
const auditRingBuffer = [];
const TRACING_RING_SIZE = 200;

/**
 * Initialize dynamic configuration with environment/static values
 */
export function initializeDynamicConfig() {
  try {
    const config = getConfig();
    
    // Initialize rate limiting from environment
    dynamicConfig.rateLimit = {
      algorithm: config.RATE_LIMIT_ALGORITHM || process.env.RATE_LIMIT_ALGORITHM || 'fixed',
      globalMax: parseInt(config.RATE_LIMIT_MAX || process.env.RATE_LIMIT_MAX || '120', 10),
      windowMs: parseInt(config.RATE_LIMIT_WINDOW || process.env.RATE_LIMIT_WINDOW || '60000', 10),
      overrides: parseOverrides(config.RATE_LIMIT_OVERRIDES || process.env.RATE_LIMIT_OVERRIDES || ''),
      roleOverrides: parseRoleOverrides(config.RATE_LIMIT_ROLE_OVERRIDES || process.env.RATE_LIMIT_ROLE_OVERRIDES || '')
    };
    
    // Initialize security from environment
    dynamicConfig.security = {
      cspReportOnly: (config.CSP_REPORT_ONLY || process.env.CSP_REPORT_ONLY) !== 'false',
      enableCOEP: (config.ENABLE_COEP || process.env.ENABLE_COEP) === 'true'
    };
    
    // Initialize tracing
    dynamicConfig.tracing = {
      requestIdHeader: config.REQUEST_ID_HEADER || process.env.REQUEST_ID_HEADER || 'X-Request-Id',
      ringBuffer: tracingRingBuffer
    };
    
    // Initialize metrics state
    const nodeEnv = process.env.NODE_ENV || 'development';
    const metricsEnabled = nodeEnv === 'production' 
      ? (config.ENABLE_METRICS || process.env.ENABLE_METRICS) === 'true'
      : (config.ENABLE_METRICS || process.env.ENABLE_METRICS) !== 'false';
    dynamicConfig.metrics.enabled = metricsEnabled;
    
    // Initialize audit ring buffer
    const auditRingSize = parseInt(process.env.AUDIT_RING_SIZE || '500', 10);
    dynamicConfig.audit = {
      ringBuffer: auditRingBuffer,
      maxSize: Math.max(auditRingSize, 50) // minimum 50, default 500
    };
    
  } catch (error) {
    console.warn('[dynamicConfig] Failed to initialize from config, using defaults:', error.message);
  }
}

/**
 * Parse rate limit path overrides from string format
 * Format: "pathPrefix:max[:algorithm];pathPrefix2:max2[:algorithm2]"
 */
function parseOverrides(overrideString) {
  if (!overrideString || typeof overrideString !== 'string') return [];
  
  return overrideString.split(';')
    .map(entry => {
      const trimmed = entry.trim();
      if (!trimmed) return null;
      
      const parts = trimmed.split(':');
      if (parts.length < 2) return null;
      
      const pathPrefix = parts[0].trim();
      const max = parseInt(parts[1], 10);
      const algorithm = parts[2]?.trim() || 'fixed';
      
      if (isNaN(max) || max <= 0) return null;
      if (!isValidAlgorithm(algorithm)) return null;
      
      return { pathPrefix, max, algorithm };
    })
    .filter(Boolean);
}

/**
 * Parse role-based rate limit overrides from string format
 * Format: "role|pathPrefix:max[:algorithm];role2|pathPrefix2:max2[:algorithm2]"
 */
function parseRoleOverrides(overrideString) {
  if (!overrideString || typeof overrideString !== 'string') return [];
  
  return overrideString.split(';')
    .map(entry => {
      const trimmed = entry.trim();
      if (!trimmed) return null;
      
      const [roleAndPath, maxStr, algorithm = 'fixed'] = trimmed.split(':');
      if (!roleAndPath || !maxStr) return null;
      
      const [role, pathPrefix] = roleAndPath.split('|');
      if (!role) return null;
      
      const max = parseInt(maxStr, 10);
      if (isNaN(max) || max <= 0) return null;
      if (!isValidAlgorithm(algorithm.trim())) return null;
      
      return { 
        role: role.trim(), 
        pathPrefix: pathPrefix?.trim() || '',
        max, 
        algorithm: algorithm.trim() 
      };
    })
    .filter(Boolean);
}

/**
 * Validate rate limiting algorithm
 */
function isValidAlgorithm(algorithm) {
  return ['fixed', 'sliding', 'token_bucket'].includes(algorithm);
}

/**
 * Get current dynamic configuration snapshot
 */
export function getDynamicConfig() {
  return {
    rateLimit: { ...dynamicConfig.rateLimit },
    security: { ...dynamicConfig.security },
    tracing: {
      requestIdHeader: dynamicConfig.tracing.requestIdHeader,
      recentRequestIds: [...tracingRingBuffer].reverse() // newest first
    },
    metrics: { ...dynamicConfig.metrics },
    audit: {
      maxSize: dynamicConfig.audit.maxSize,
      currentSize: auditRingBuffer.length
    },
    version: { ...dynamicConfig.version }
  };
}

/**
 * Update rate limiting configuration
 * @param {Object} updates - Rate limit configuration updates
 * @returns {Object} - { success: boolean, errors?: string[] }
 */
export function updateRateLimitConfig(updates) {
  const errors = [];
  
  // Validate algorithm
  if (updates.algorithm !== undefined) {
    if (!isValidAlgorithm(updates.algorithm)) {
      errors.push('Invalid algorithm. Must be: fixed, sliding, or token_bucket');
    }
  }
  
  // Validate numeric values
  if (updates.globalMax !== undefined) {
    const max = parseInt(updates.globalMax, 10);
    if (isNaN(max) || max <= 0) {
      errors.push('globalMax must be a positive integer');
    }
  }
  
  if (updates.windowMs !== undefined) {
    const window = parseInt(updates.windowMs, 10);
    if (isNaN(window) || window <= 0) {
      errors.push('windowMs must be a positive integer');
    }
  }
  
  // Validate overrides
  if (updates.overrides !== undefined) {
    if (!Array.isArray(updates.overrides)) {
      errors.push('overrides must be an array');
    } else {
      updates.overrides.forEach((override, index) => {
        if (!override.pathPrefix || typeof override.pathPrefix !== 'string') {
          errors.push(`overrides[${index}].pathPrefix is required and must be a string`);
        }
        if (typeof override.max !== 'number' || override.max <= 0) {
          errors.push(`overrides[${index}].max must be a positive number`);
        }
        if (override.algorithm && !isValidAlgorithm(override.algorithm)) {
          errors.push(`overrides[${index}].algorithm must be: fixed, sliding, or token_bucket`);
        }
      });
    }
  }
  
  // Validate role overrides
  if (updates.roleOverrides !== undefined) {
    if (!Array.isArray(updates.roleOverrides)) {
      errors.push('roleOverrides must be an array');
    } else {
      updates.roleOverrides.forEach((override, index) => {
        if (!override.role || typeof override.role !== 'string') {
          errors.push(`roleOverrides[${index}].role is required and must be a string`);
        }
        if (typeof override.max !== 'number' || override.max <= 0) {
          errors.push(`roleOverrides[${index}].max must be a positive number`);
        }
        if (override.algorithm && !isValidAlgorithm(override.algorithm)) {
          errors.push(`roleOverrides[${index}].algorithm must be: fixed, sliding, or token_bucket`);
        }
      });
    }
  }
  
  if (errors.length > 0) {
    return { success: false, errors };
  }
  
  // Apply updates
  if (updates.algorithm !== undefined) {
    dynamicConfig.rateLimit.algorithm = updates.algorithm;
  }
  if (updates.globalMax !== undefined) {
    dynamicConfig.rateLimit.globalMax = parseInt(updates.globalMax, 10);
  }
  if (updates.windowMs !== undefined) {
    dynamicConfig.rateLimit.windowMs = parseInt(updates.windowMs, 10);
  }
  if (updates.overrides !== undefined) {
    dynamicConfig.rateLimit.overrides = updates.overrides.map(override => ({
      pathPrefix: override.pathPrefix,
      max: override.max,
      algorithm: override.algorithm || 'fixed'
    }));
  }
  if (updates.roleOverrides !== undefined) {
    dynamicConfig.rateLimit.roleOverrides = updates.roleOverrides.map(override => ({
      role: override.role,
      pathPrefix: override.pathPrefix || '',
      max: override.max,
      algorithm: override.algorithm || 'fixed'
    }));
  }
  
  return { success: true };
}

/**
 * Update security configuration
 * @param {Object} updates - Security configuration updates
 * @returns {Object} - { success: boolean, errors?: string[] }
 */
export function updateSecurityConfig(updates) {
  const errors = [];
  
  // Validate boolean values
  if (updates.cspReportOnly !== undefined && typeof updates.cspReportOnly !== 'boolean') {
    errors.push('cspReportOnly must be a boolean');
  }
  
  if (updates.enableCOEP !== undefined && typeof updates.enableCOEP !== 'boolean') {
    errors.push('enableCOEP must be a boolean');
  }
  
  if (errors.length > 0) {
    return { success: false, errors };
  }
  
  // Apply updates
  if (updates.cspReportOnly !== undefined) {
    dynamicConfig.security.cspReportOnly = updates.cspReportOnly;
  }
  if (updates.enableCOEP !== undefined) {
    dynamicConfig.security.enableCOEP = updates.enableCOEP;
  }
  
  return { success: true };
}

/**
 * Push a request ID into the tracing ring buffer
 * @param {string} requestId - Request ID to track
 */
export function pushRequestId(requestId) {
  if (!requestId) return;
  
  tracingRingBuffer.push({
    id: requestId,
    timestamp: new Date().toISOString()
  });
  
  // Maintain ring buffer size
  while (tracingRingBuffer.length > TRACING_RING_SIZE) {
    tracingRingBuffer.shift();
  }
}

/**
 * Push an audit log entry into the ring buffer
 * @param {Object} entry - Audit log entry
 */
export function pushAuditLog(entry) {
  if (!entry) return;
  
  const auditEntry = {
    timestamp: entry.timestamp || new Date().toISOString(),
    category: entry.category || entry.action || 'unknown',
    message: entry.message || entry.action || '',
    meta: entry.meta || {},
    actor: entry.actor || null,
    level: entry.level || 'info'
  };
  
  auditRingBuffer.push(auditEntry);
  
  // Maintain ring buffer size
  const maxSize = dynamicConfig.audit.maxSize;
  while (auditRingBuffer.length > maxSize) {
    auditRingBuffer.shift();
  }
}

/**
 * Get audit log categories
 */
export function getAuditCategories() {
  const categories = new Set();
  auditRingBuffer.forEach(entry => {
    if (entry.category) {
      categories.add(entry.category);
    }
  });
  return Array.from(categories).sort();
}

/**
 * Get filtered audit logs
 * @param {Object} filters - Filter criteria
 * @returns {Array} - Filtered audit log entries
 */
export function getAuditLogs(filters = {}) {
  const {
    category = '',
    q = '',
    limit = 50,
    since = null
  } = filters;
  
  let filtered = [...auditRingBuffer];
  
  // Filter by category
  if (category) {
    filtered = filtered.filter(entry => 
      entry.category && entry.category.toLowerCase().includes(category.toLowerCase())
    );
  }
  
  // Filter by search query (message and meta)
  if (q) {
    const query = q.toLowerCase();
    filtered = filtered.filter(entry => {
      const searchText = [
        entry.message,
        JSON.stringify(entry.meta),
        entry.actor,
        entry.level
      ].join(' ').toLowerCase();
      return searchText.includes(query);
    });
  }
  
  // Filter by timestamp
  if (since) {
    const sinceDate = new Date(since);
    if (!isNaN(sinceDate.getTime())) {
      filtered = filtered.filter(entry => 
        new Date(entry.timestamp) >= sinceDate
      );
    }
  }
  
  // Sort by timestamp (newest first) and limit
  filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  const parsedLimit = parseInt(limit, 10);
  if (!isNaN(parsedLimit) && parsedLimit > 0) {
    filtered = filtered.slice(0, parsedLimit);
  }
  
  return filtered;
}

/**
 * Set version information
 * @param {Object} versionInfo - Version information
 */
export function setVersionInfo(versionInfo) {
  if (versionInfo.commit !== undefined) {
    dynamicConfig.version.commit = versionInfo.commit;
  }
  if (versionInfo.buildTime !== undefined) {
    dynamicConfig.version.buildTime = versionInfo.buildTime;
  }
  if (versionInfo.version !== undefined) {
    dynamicConfig.version.version = versionInfo.version;
  }
}

/**
 * Get current rate limiting configuration
 */
export function getRateLimitConfig() {
  return { ...dynamicConfig.rateLimit };
}

/**
 * Get current security configuration
 */
export function getSecurityConfig() {
  return { ...dynamicConfig.security };
}

/**
 * Get current tracing configuration
 */
export function getTracingConfig() {
  return {
    requestIdHeader: dynamicConfig.tracing.requestIdHeader,
    recentRequestIds: [...tracingRingBuffer].reverse()
  };
}

/**
 * Get metrics configuration
 */
export function getMetricsConfig() {
  return { ...dynamicConfig.metrics };
}

// Initialize on module load
initializeDynamicConfig();