// backend/config/dynamicConfig.js
// Dynamic, in-memory (ephemeral) admin runtime configuration layer
// All state is lost on process restart - provides operational tuning capabilities

/**
 * In-memory state for dynamic configuration
 * All changes are ephemeral and revert on process restart
 */
const dynamicState = {
  version: {
    commit: null,
    buildTime: null,
    dynamicConfigVersion: '1.0.0'
  },
  
  metrics: {
    enabled: false  // Set from startup environment
  },
  
  rateLimit: {
    algorithm: 'fixed',           // fixed, sliding, token_bucket
    globalMax: 120,              // requests per window
    windowMs: 60000,             // window size in milliseconds
    overrides: {},               // path-based overrides: { "/api/path": { max: 50, algorithm: "sliding" } }
    roleOverrides: {},           // role-based overrides: { "premium": { max: 500 } }
    requestIdHeader: 'x-request-id'  // header name for request ID
  },
  
  security: {
    cspReportOnly: true,         // CSP enforcement mode
    enableCOEP: false            // Cross-Origin Embedder Policy
  },
  
  tracing: {
    ringBuffer: [],              // circular buffer of recent request IDs
    maxSize: 200                 // ring buffer size
  },
  
  audit: {
    ringBuffer: [],              // circular buffer of recent audit entries
    maxSize: 500,                // ring buffer size (can be overridden by AUDIT_RING_SIZE env)
    categories: new Set()        // discovered audit categories
  }
};

// Initialize from environment if available
if (process.env.AUDIT_RING_SIZE) {
  const size = parseInt(process.env.AUDIT_RING_SIZE, 10);
  if (size > 0) {
    dynamicState.audit.maxSize = size;
  }
}

/**
 * Get complete configuration snapshot
 * @returns {Object} Current dynamic configuration state
 */
export function getSnapshot() {
  return {
    ephemeral: true,
    timestamp: new Date().toISOString(),
    version: { ...dynamicState.version },
    metrics: { ...dynamicState.metrics },
    rateLimit: {
      ...dynamicState.rateLimit,
      overrides: { ...dynamicState.rateLimit.overrides },
      roleOverrides: { ...dynamicState.rateLimit.roleOverrides }
    },
    security: { ...dynamicState.security },
    tracing: {
      maxSize: dynamicState.tracing.maxSize,
      currentCount: dynamicState.tracing.ringBuffer.length
    },
    audit: {
      maxSize: dynamicState.audit.maxSize,
      currentCount: dynamicState.audit.ringBuffer.length,
      categoriesCount: dynamicState.audit.categories.size
    }
  };
}

/**
 * Get current rate limiting configuration
 * @returns {Object} Rate limiting config
 */
export function getRateLimitConfig() {
  return {
    ...dynamicState.rateLimit,
    overrides: { ...dynamicState.rateLimit.overrides },
    roleOverrides: { ...dynamicState.rateLimit.roleOverrides }
  };
}

/**
 * Update rate limiting configuration
 * @param {Object} config - New rate limiting configuration
 * @throws {Error} Validation error with status=400, code='VALIDATION_ERROR'
 */
export function updateRateLimitConfig(config) {
  // Validate algorithm
  const validAlgorithms = ['fixed', 'sliding', 'token_bucket'];
  if (config.algorithm && !validAlgorithms.includes(config.algorithm)) {
    const error = new Error(`Invalid algorithm. Must be one of: ${validAlgorithms.join(', ')}`);
    error.status = 400;
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  // Validate numeric values
  if (config.globalMax !== undefined) {
    if (!Number.isInteger(config.globalMax) || config.globalMax < 0) {
      const error = new Error('globalMax must be a non-negative integer');
      error.status = 400;
      error.code = 'VALIDATION_ERROR';
      throw error;
    }
  }

  if (config.windowMs !== undefined) {
    if (!Number.isInteger(config.windowMs) || config.windowMs < 0) {
      const error = new Error('windowMs must be a non-negative integer');
      error.status = 400;
      error.code = 'VALIDATION_ERROR';
      throw error;
    }
  }

  // Validate overrides structure
  if (config.overrides) {
    if (typeof config.overrides !== 'object' || Array.isArray(config.overrides)) {
      const error = new Error('overrides must be an object');
      error.status = 400;
      error.code = 'VALIDATION_ERROR';
      throw error;
    }

    for (const [path, override] of Object.entries(config.overrides)) {
      if (typeof override !== 'object' || Array.isArray(override)) {
        const error = new Error(`Override for path "${path}" must be an object`);
        error.status = 400;
        error.code = 'VALIDATION_ERROR';
        throw error;
      }

      if (override.algorithm && !validAlgorithms.includes(override.algorithm)) {
        const error = new Error(`Invalid algorithm in override for path "${path}"`);
        error.status = 400;
        error.code = 'VALIDATION_ERROR';
        throw error;
      }

      if (override.max !== undefined && (!Number.isInteger(override.max) || override.max < 0)) {
        const error = new Error(`Invalid max in override for path "${path}": must be non-negative integer`);
        error.status = 400;
        error.code = 'VALIDATION_ERROR';
        throw error;
      }
    }
  }

  // Validate role overrides structure
  if (config.roleOverrides) {
    if (typeof config.roleOverrides !== 'object' || Array.isArray(config.roleOverrides)) {
      const error = new Error('roleOverrides must be an object');
      error.status = 400;
      error.code = 'VALIDATION_ERROR';
      throw error;
    }

    for (const [role, override] of Object.entries(config.roleOverrides)) {
      if (typeof override !== 'object' || Array.isArray(override)) {
        const error = new Error(`Role override for "${role}" must be an object`);
        error.status = 400;
        error.code = 'VALIDATION_ERROR';
        throw error;
      }

      if (override.max !== undefined && (!Number.isInteger(override.max) || override.max < 0)) {
        const error = new Error(`Invalid max in role override for "${role}": must be non-negative integer`);
        error.status = 400;
        error.code = 'VALIDATION_ERROR';
        throw error;
      }
    }
  }

  // Apply validated changes
  if (config.algorithm !== undefined) dynamicState.rateLimit.algorithm = config.algorithm;
  if (config.globalMax !== undefined) dynamicState.rateLimit.globalMax = config.globalMax;
  if (config.windowMs !== undefined) dynamicState.rateLimit.windowMs = config.windowMs;
  if (config.requestIdHeader !== undefined) dynamicState.rateLimit.requestIdHeader = config.requestIdHeader;
  if (config.overrides !== undefined) dynamicState.rateLimit.overrides = { ...config.overrides };
  if (config.roleOverrides !== undefined) dynamicState.rateLimit.roleOverrides = { ...config.roleOverrides };
}

/**
 * Get current security configuration
 * @returns {Object} Security config
 */
export function getSecurityConfig() {
  return { ...dynamicState.security };
}

/**
 * Update security configuration
 * @param {Object} config - New security configuration
 * @throws {Error} Validation error with status=400, code='VALIDATION_ERROR'
 */
export function updateSecurityConfig(config) {
  // Validate boolean values
  if (config.cspReportOnly !== undefined && typeof config.cspReportOnly !== 'boolean') {
    const error = new Error('cspReportOnly must be a boolean');
    error.status = 400;
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  if (config.enableCOEP !== undefined && typeof config.enableCOEP !== 'boolean') {
    const error = new Error('enableCOEP must be a boolean');
    error.status = 400;
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  // Apply validated changes
  if (config.cspReportOnly !== undefined) dynamicState.security.cspReportOnly = config.cspReportOnly;
  if (config.enableCOEP !== undefined) dynamicState.security.enableCOEP = config.enableCOEP;
}

/**
 * Push a request ID to the tracing ring buffer
 * @param {string} requestId - Request ID to track
 * @param {Date} [timestamp] - Optional timestamp (defaults to now)
 */
export function pushTrace(requestId, timestamp = new Date()) {
  const entry = {
    requestId,
    timestamp: timestamp.toISOString(),
    timestampMs: timestamp.getTime()
  };

  dynamicState.tracing.ringBuffer.push(entry);

  // Maintain ring buffer size
  if (dynamicState.tracing.ringBuffer.length > dynamicState.tracing.maxSize) {
    dynamicState.tracing.ringBuffer.shift();
  }
}

/**
 * Get recent tracing data (newest first)
 * @param {number} [limit] - Optional limit on number of entries
 * @returns {Array} Array of trace entries
 */
export function getTracing(limit) {
  // Return newest first
  const traces = [...dynamicState.tracing.ringBuffer].reverse();
  
  if (limit && limit > 0) {
    return traces.slice(0, limit);
  }
  
  return traces;
}

/**
 * Push an audit log entry to the ring buffer
 * @param {Object} entry - Audit entry
 * @param {string} entry.category - Audit category
 * @param {string} entry.message - Audit message
 * @param {Object} [entry.meta] - Additional metadata
 * @param {string} [entry.actor] - Actor performing the action
 * @param {string} [entry.level] - Log level
 */
export function pushAuditLog(entry) {
  const auditEntry = {
    timestamp: new Date().toISOString(),
    category: entry.category || 'UNKNOWN',
    message: entry.message || '',
    meta: entry.meta || {},
    actor: entry.actor || null,
    level: entry.level || 'info'
  };

  dynamicState.audit.ringBuffer.push(auditEntry);
  dynamicState.audit.categories.add(auditEntry.category);

  // Maintain ring buffer size
  if (dynamicState.audit.ringBuffer.length > dynamicState.audit.maxSize) {
    dynamicState.audit.ringBuffer.shift();
  }
}

/**
 * List discovered audit categories
 * @returns {Array} Array of category strings
 */
export function listAuditCategories() {
  return Array.from(dynamicState.audit.categories).sort();
}

/**
 * Query audit logs with filtering
 * @param {Object} [options] - Query options
 * @param {string} [options.category] - Filter by category
 * @param {string} [options.q] - Search query for message/meta
 * @param {number} [options.limit] - Limit number of results
 * @param {string} [options.since] - ISO timestamp to filter from
 * @returns {Array} Filtered audit entries (newest first)
 */
export function queryAuditLogs(options = {}) {
  let logs = [...dynamicState.audit.ringBuffer];

  // Filter by timestamp if since provided
  if (options.since) {
    const sinceMs = new Date(options.since).getTime();
    logs = logs.filter(log => new Date(log.timestamp).getTime() >= sinceMs);
  }

  // Filter by category
  if (options.category && options.category.trim()) {
    logs = logs.filter(log => log.category === options.category.trim());
  }

  // Filter by search query
  if (options.q && options.q.trim()) {
    const query = options.q.trim().toLowerCase();
    logs = logs.filter(log => {
      const searchableText = [
        log.message,
        log.actor,
        JSON.stringify(log.meta)
      ].join(' ').toLowerCase();
      return searchableText.includes(query);
    });
  }

  // Sort newest first
  logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Apply limit
  if (options.limit && options.limit > 0) {
    logs = logs.slice(0, options.limit);
  }

  return logs;
}

/**
 * Set version information
 * @param {Object} versionInfo - Version information
 * @param {string} [versionInfo.commit] - Git commit hash
 * @param {string} [versionInfo.buildTime] - Build timestamp
 */
export function setVersionInfo(versionInfo) {
  if (versionInfo.commit !== undefined) {
    dynamicState.version.commit = versionInfo.commit;
  }
  if (versionInfo.buildTime !== undefined) {
    dynamicState.version.buildTime = versionInfo.buildTime;
  }
}

/**
 * Get version information
 * @returns {Object} Version information
 */
export function getVersionInfo() {
  return { ...dynamicState.version };
}

// Initialize metrics enabled state from startup environment
// This allows the metrics tab to show proper state even when dynamic config is not explicitly enabled
if (process.env.METRICS_ENABLED === 'true' || process.env.PROMETHEUS_ENABLED === 'true') {
  dynamicState.metrics.enabled = true;
}