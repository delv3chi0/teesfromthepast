// backend/config/dynamicConfig.js
// In-Memory Dynamic Runtime Configuration Layer
// Provides mutable, in-process state for operational settings
// Note: This is ephemeral - changes are lost on restart

/**
 * Default configuration values
 */
const DEFAULT_CONFIG = {
  rateLimit: {
    algorithm: 'fixed', // fixed | sliding | token_bucket
    globalMax: 120,
    windowMs: 60000,
    overrides: [], // { pathPrefix, max, algorithm? }
    roleOverrides: [] // { role, pathPrefix, max, algorithm? }
  },
  security: {
    cspReportOnly: true,
    enableCOEP: false
  },
  tracing: {
    requestIdHeader: 'X-Request-Id',
    recentRequestIds: [] // Ring buffer of recent request IDs
  },
  metrics: {
    enabled: false
  },
  versions: {
    commit: 'unknown',
    buildTime: 'unknown'
  },
  audit: {
    ringSize: 500,
    logs: [] // Ring buffer for audit logs
  }
};

// In-memory runtime configuration (mutable)
let runtimeConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG));

// Ring buffer size configuration
const TRACING_RING_SIZE = parseInt(process.env.TRACING_RING_SIZE) || 200;
const AUDIT_RING_SIZE = parseInt(process.env.AUDIT_RING_SIZE) || 500;

/**
 * Initialize dynamic config with current environment values
 */
export function initializeDynamicConfig() {
  // Initialize from environment variables
  runtimeConfig.rateLimit.algorithm = process.env.RATE_LIMIT_ALGORITHM || 'fixed';
  runtimeConfig.rateLimit.globalMax = parseInt(process.env.RATE_LIMIT_MAX) || 120;
  runtimeConfig.rateLimit.windowMs = parseInt(process.env.RATE_LIMIT_WINDOW) || 60000;
  
  runtimeConfig.security.cspReportOnly = process.env.CSP_REPORT_ONLY !== 'false';
  runtimeConfig.security.enableCOEP = process.env.ENABLE_COEP === 'true';
  
  runtimeConfig.tracing.requestIdHeader = process.env.REQUEST_ID_HEADER || 'X-Request-Id';
  
  runtimeConfig.metrics.enabled = process.env.ENABLE_METRICS === 'true';
  
  runtimeConfig.audit.ringSize = AUDIT_RING_SIZE;
  
  // Initialize empty ring buffers
  runtimeConfig.tracing.recentRequestIds = [];
  runtimeConfig.audit.logs = [];
}

/**
 * Validate rate limit algorithm
 * @param {string} algorithm - The algorithm to validate
 * @returns {boolean} True if valid
 */
function isValidAlgorithm(algorithm) {
  return ['fixed', 'sliding', 'token_bucket'].includes(algorithm);
}

/**
 * Validate rate limit overrides array
 * @param {Array} overrides - Array of override objects
 * @returns {boolean} True if valid
 */
function validateOverrides(overrides) {
  if (!Array.isArray(overrides)) return false;
  
  return overrides.every(override => {
    return (
      override &&
      typeof override === 'object' &&
      typeof override.pathPrefix === 'string' &&
      typeof override.max === 'number' &&
      override.max > 0 &&
      (!override.algorithm || isValidAlgorithm(override.algorithm))
    );
  });
}

/**
 * Validate role overrides array
 * @param {Array} roleOverrides - Array of role override objects
 * @returns {boolean} True if valid
 */
function validateRoleOverrides(roleOverrides) {
  if (!Array.isArray(roleOverrides)) return false;
  
  return roleOverrides.every(override => {
    return (
      override &&
      typeof override === 'object' &&
      typeof override.role === 'string' &&
      typeof override.pathPrefix === 'string' &&
      typeof override.max === 'number' &&
      override.max > 0 &&
      (!override.algorithm || isValidAlgorithm(override.algorithm))
    );
  });
}

/**
 * Get complete runtime configuration snapshot
 * @returns {Object} Complete runtime configuration
 */
export function getRuntimeConfigSnapshot() {
  return JSON.parse(JSON.stringify(runtimeConfig));
}

/**
 * Update rate limiting configuration (partial updates allowed)
 * @param {Object} partial - Partial rate limit configuration
 * @returns {Object} Updated rate limit configuration
 * @throws {Error} If validation fails
 */
export function updateRateLimit(partial) {
  if (!partial || typeof partial !== 'object') {
    throw new Error('Rate limit update must be an object');
  }
  
  const updates = {};
  
  // Validate and prepare updates
  if (partial.algorithm !== undefined) {
    if (!isValidAlgorithm(partial.algorithm)) {
      throw new Error(`Invalid algorithm: ${partial.algorithm}. Must be one of: fixed, sliding, token_bucket`);
    }
    updates.algorithm = partial.algorithm;
  }
  
  if (partial.globalMax !== undefined) {
    if (typeof partial.globalMax !== 'number' || partial.globalMax <= 0) {
      throw new Error('globalMax must be a positive number');
    }
    updates.globalMax = partial.globalMax;
  }
  
  if (partial.windowMs !== undefined) {
    if (typeof partial.windowMs !== 'number' || partial.windowMs <= 0) {
      throw new Error('windowMs must be a positive number');
    }
    updates.windowMs = partial.windowMs;
  }
  
  if (partial.overrides !== undefined) {
    if (!validateOverrides(partial.overrides)) {
      throw new Error('Invalid overrides format. Each override must have pathPrefix (string) and max (positive number)');
    }
    updates.overrides = partial.overrides;
  }
  
  if (partial.roleOverrides !== undefined) {
    if (!validateRoleOverrides(partial.roleOverrides)) {
      throw new Error('Invalid roleOverrides format. Each override must have role (string), pathPrefix (string) and max (positive number)');
    }
    updates.roleOverrides = partial.roleOverrides;
  }
  
  // Apply updates
  Object.assign(runtimeConfig.rateLimit, updates);
  
  return getRateLimitConfig();
}

/**
 * Update security configuration (partial updates allowed)
 * @param {Object} partial - Partial security configuration
 * @returns {Object} Updated security configuration
 * @throws {Error} If validation fails
 */
export function updateSecurity(partial) {
  if (!partial || typeof partial !== 'object') {
    throw new Error('Security update must be an object');
  }
  
  const updates = {};
  
  if (partial.cspReportOnly !== undefined) {
    if (typeof partial.cspReportOnly !== 'boolean') {
      throw new Error('cspReportOnly must be a boolean');
    }
    updates.cspReportOnly = partial.cspReportOnly;
  }
  
  if (partial.enableCOEP !== undefined) {
    if (typeof partial.enableCOEP !== 'boolean') {
      throw new Error('enableCOEP must be a boolean');
    }
    updates.enableCOEP = partial.enableCOEP;
  }
  
  // Apply updates
  Object.assign(runtimeConfig.security, updates);
  
  return getSecurityConfig();
}

/**
 * Get current rate limiting configuration
 * @returns {Object} Rate limiting configuration
 */
export function getRateLimitConfig() {
  return JSON.parse(JSON.stringify(runtimeConfig.rateLimit));
}

/**
 * Get current security configuration
 * @returns {Object} Security configuration
 */
export function getSecurityConfig() {
  return JSON.parse(JSON.stringify(runtimeConfig.security));
}

/**
 * Get current tracing configuration
 * @returns {Object} Tracing configuration
 */
export function getTracingConfig() {
  return JSON.parse(JSON.stringify(runtimeConfig.tracing));
}

/**
 * Get current metrics configuration
 * @returns {Object} Metrics configuration
 */
export function getMetricsConfig() {
  return JSON.parse(JSON.stringify(runtimeConfig.metrics));
}

/**
 * Get current version information
 * @returns {Object} Version information
 */
export function getVersionInfo() {
  return JSON.parse(JSON.stringify(runtimeConfig.versions));
}

/**
 * Set version information (called at startup)
 * @param {Object} info - Version information
 */
export function setVersionInfo(info) {
  if (info && typeof info === 'object') {
    runtimeConfig.versions = { ...runtimeConfig.versions, ...info };
  }
}

/**
 * Push a request ID to the ring buffer
 * @param {string} id - Request ID to store
 */
export function pushRecentRequestId(id) {
  if (typeof id !== 'string') return;
  
  const entry = {
    id,
    timestamp: new Date().toISOString()
  };
  
  runtimeConfig.tracing.recentRequestIds.unshift(entry);
  
  // Maintain ring buffer size
  if (runtimeConfig.tracing.recentRequestIds.length > TRACING_RING_SIZE) {
    runtimeConfig.tracing.recentRequestIds = runtimeConfig.tracing.recentRequestIds.slice(0, TRACING_RING_SIZE);
  }
}

/**
 * Set request ID header name dynamically
 * @param {string} name - Header name
 */
export function setRequestIdHeaderDynamic(name) {
  if (typeof name === 'string' && name.trim()) {
    runtimeConfig.tracing.requestIdHeader = name.trim();
  }
}

/**
 * Set metrics enabled state dynamically
 * @param {boolean} enabled - Whether metrics are enabled
 */
export function setMetricsEnabledDynamic(enabled) {
  if (typeof enabled === 'boolean') {
    runtimeConfig.metrics.enabled = enabled;
  }
}

/**
 * Push an audit log entry to the ring buffer
 * @param {Object} entry - Audit log entry
 */
export function pushAuditLog(entry) {
  if (!entry || typeof entry !== 'object') return;
  
  const logEntry = {
    timestamp: new Date().toISOString(),
    category: entry.category || 'general',
    message: entry.message || '',
    meta: entry.meta || {},
    actor: entry.actor || {},
    level: entry.level || 'info'
  };
  
  runtimeConfig.audit.logs.unshift(logEntry);
  
  // Maintain ring buffer size
  if (runtimeConfig.audit.logs.length > runtimeConfig.audit.ringSize) {
    runtimeConfig.audit.logs = runtimeConfig.audit.logs.slice(0, runtimeConfig.audit.ringSize);
  }
}

/**
 * Get audit log slice with filtering
 * @param {Object} options - Filter options
 * @param {string} options.category - Filter by category (exact match)
 * @param {string} options.q - Search query (case-insensitive substring)
 * @param {number} options.limit - Maximum number of results (default 100, max 500)
 * @param {string} options.since - ISO timestamp to filter logs after
 * @returns {Array} Filtered audit log entries
 */
export function getAuditLogSlice({ category, q, limit = 100, since } = {}) {
  let logs = [...runtimeConfig.audit.logs];
  
  // Filter by category (exact match)
  if (category) {
    logs = logs.filter(log => log.category === category);
  }
  
  // Filter by search query (case-insensitive substring over message OR meta)
  if (q && typeof q === 'string') {
    const query = q.toLowerCase();
    logs = logs.filter(log => {
      const messageMatch = log.message.toLowerCase().includes(query);
      const metaMatch = JSON.stringify(log.meta).toLowerCase().includes(query);
      return messageMatch || metaMatch;
    });
  }
  
  // Filter by timestamp
  if (since) {
    const sinceDate = new Date(since);
    if (!isNaN(sinceDate.getTime())) {
      logs = logs.filter(log => new Date(log.timestamp) > sinceDate);
    }
  }
  
  // Apply limit (default 100, max 500)
  const effectiveLimit = Math.min(Math.max(parseInt(limit) || 100, 1), 500);
  logs = logs.slice(0, effectiveLimit);
  
  return logs;
}

/**
 * Get available audit log categories
 * @returns {Array} Array of unique category strings
 */
export function getAuditCategories() {
  const categories = new Set();
  runtimeConfig.audit.logs.forEach(log => {
    if (log.category) {
      categories.add(log.category);
    }
  });
  return Array.from(categories).sort();
}

// Initialize on module load
initializeDynamicConfig();