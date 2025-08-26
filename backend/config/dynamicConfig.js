// backend/config/dynamicConfig.js
// In-Memory Dynamic Runtime Config Layer
import { isConfigReady, getConfig } from './index.js';

// Default configurations
const DEFAULT_AUDIT_RING_SIZE = 500;
const DEFAULT_RECENT_REQUEST_IDS_SIZE = 100;

// In-memory runtime configuration state
let runtimeConfig = {
  rateLimit: {
    algorithm: 'fixed',
    globalMax: null,
    windowMs: null,
    overrides: [],
    roleOverrides: []
  },
  security: {
    cspReportOnly: true,
    enableCOEP: false
  },
  tracing: {
    requestIdHeader: 'X-Request-Id',
    recentRequestIds: []
  },
  metrics: {
    enabled: true
  },
  versions: {
    commit: null,
    buildTime: null,
    version: null
  },
  audit: {
    ringBuffer: [],
    ringSize: DEFAULT_AUDIT_RING_SIZE
  }
};

// Initialize from environment/config
function initializeRuntimeConfig() {
  if (isConfigReady()) {
    const config = getConfig();
    
    // Initialize rate limiting from static config
    runtimeConfig.rateLimit.algorithm = config.RATE_LIMIT_ALGORITHM || 'fixed';
    runtimeConfig.rateLimit.globalMax = config.RATE_LIMIT_MAX_GLOBAL || null;
    runtimeConfig.rateLimit.windowMs = config.RATE_LIMIT_WINDOW_MS || null;
    
    // Initialize security from static config
    runtimeConfig.security.cspReportOnly = config.CSP_REPORT_ONLY !== false;
    runtimeConfig.security.enableCOEP = config.ENABLE_COEP === true;
    
    // Initialize tracing from static config
    runtimeConfig.tracing.requestIdHeader = config.REQUEST_ID_HEADER || 'X-Request-Id';
    
    // Initialize metrics from static config
    runtimeConfig.metrics.enabled = config.METRICS_ENABLED !== false;
    
    // Initialize audit ring size
    runtimeConfig.audit.ringSize = parseInt(process.env.AUDIT_RING_SIZE || DEFAULT_AUDIT_RING_SIZE, 10);
  } else {
    // Fallback to environment variables
    runtimeConfig.rateLimit.algorithm = process.env.RATE_LIMIT_ALGORITHM || 'fixed';
    runtimeConfig.rateLimit.globalMax = process.env.RATE_LIMIT_MAX_GLOBAL ? parseInt(process.env.RATE_LIMIT_MAX_GLOBAL, 10) : null;
    runtimeConfig.rateLimit.windowMs = process.env.RATE_LIMIT_WINDOW_MS ? parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) : null;
    
    runtimeConfig.security.cspReportOnly = process.env.CSP_REPORT_ONLY !== 'false';
    runtimeConfig.security.enableCOEP = process.env.ENABLE_COEP === 'true';
    
    runtimeConfig.tracing.requestIdHeader = process.env.REQUEST_ID_HEADER || 'X-Request-Id';
    
    runtimeConfig.metrics.enabled = process.env.METRICS_ENABLED !== 'false';
    
    runtimeConfig.audit.ringSize = parseInt(process.env.AUDIT_RING_SIZE || DEFAULT_AUDIT_RING_SIZE, 10);
  }
}

// Initialize on module load
initializeRuntimeConfig();

/**
 * Get complete runtime configuration snapshot
 */
export function getRuntimeConfigSnapshot() {
  return {
    rateLimit: { ...runtimeConfig.rateLimit },
    security: { ...runtimeConfig.security },
    tracing: {
      requestIdHeader: runtimeConfig.tracing.requestIdHeader,
      recentRequestIds: [...runtimeConfig.tracing.recentRequestIds]
    },
    metrics: { ...runtimeConfig.metrics },
    versions: { ...runtimeConfig.versions }
  };
}

/**
 * Update rate limiting configuration (partial update)
 */
export function updateRateLimit(partial) {
  if (typeof partial !== 'object' || partial === null) {
    throw new Error('Rate limit update must be an object');
  }
  
  // Validate and apply updates
  if (partial.algorithm !== undefined) {
    if (!['fixed', 'sliding', 'token-bucket'].includes(partial.algorithm)) {
      throw new Error('Invalid algorithm. Must be one of: fixed, sliding, token-bucket');
    }
    runtimeConfig.rateLimit.algorithm = partial.algorithm;
  }
  
  if (partial.globalMax !== undefined) {
    if (partial.globalMax !== null && (!Number.isInteger(partial.globalMax) || partial.globalMax <= 0)) {
      throw new Error('globalMax must be a positive integer or null');
    }
    runtimeConfig.rateLimit.globalMax = partial.globalMax;
  }
  
  if (partial.windowMs !== undefined) {
    if (partial.windowMs !== null && (!Number.isInteger(partial.windowMs) || partial.windowMs <= 0)) {
      throw new Error('windowMs must be a positive integer or null');
    }
    runtimeConfig.rateLimit.windowMs = partial.windowMs;
  }
  
  if (partial.overrides !== undefined) {
    if (!Array.isArray(partial.overrides)) {
      throw new Error('overrides must be an array');
    }
    // Validate override format
    for (const override of partial.overrides) {
      if (!override.pathPrefix || typeof override.pathPrefix !== 'string') {
        throw new Error('Each override must have a pathPrefix string');
      }
      if (!Number.isInteger(override.max) || override.max <= 0) {
        throw new Error('Each override must have a positive integer max');
      }
      if (override.algorithm && !['fixed', 'sliding', 'token-bucket'].includes(override.algorithm)) {
        throw new Error('Override algorithm must be one of: fixed, sliding, token-bucket');
      }
    }
    runtimeConfig.rateLimit.overrides = partial.overrides;
  }
  
  if (partial.roleOverrides !== undefined) {
    if (!Array.isArray(partial.roleOverrides)) {
      throw new Error('roleOverrides must be an array');
    }
    // Validate role override format
    for (const override of partial.roleOverrides) {
      if (!override.role || typeof override.role !== 'string') {
        throw new Error('Each role override must have a role string');
      }
      if (!override.pathPrefix || typeof override.pathPrefix !== 'string') {
        throw new Error('Each role override must have a pathPrefix string');
      }
      if (!Number.isInteger(override.max) || override.max <= 0) {
        throw new Error('Each role override must have a positive integer max');
      }
      if (override.algorithm && !['fixed', 'sliding', 'token-bucket'].includes(override.algorithm)) {
        throw new Error('Role override algorithm must be one of: fixed, sliding, token-bucket');
      }
    }
    runtimeConfig.rateLimit.roleOverrides = partial.roleOverrides;
  }
  
  return getRateLimitConfig();
}

/**
 * Update security configuration (partial update)
 */
export function updateSecurity(partial) {
  if (typeof partial !== 'object' || partial === null) {
    throw new Error('Security update must be an object');
  }
  
  if (partial.cspReportOnly !== undefined) {
    if (typeof partial.cspReportOnly !== 'boolean') {
      throw new Error('cspReportOnly must be a boolean');
    }
    runtimeConfig.security.cspReportOnly = partial.cspReportOnly;
  }
  
  if (partial.enableCOEP !== undefined) {
    if (typeof partial.enableCOEP !== 'boolean') {
      throw new Error('enableCOEP must be a boolean');
    }
    runtimeConfig.security.enableCOEP = partial.enableCOEP;
  }
  
  return getSecurityConfig();
}

/**
 * Get rate limiting configuration
 */
export function getRateLimitConfig() {
  return { ...runtimeConfig.rateLimit };
}

/**
 * Get security configuration
 */
export function getSecurityConfig() {
  return { ...runtimeConfig.security };
}

/**
 * Get tracing configuration
 */
export function getTracingConfig() {
  return {
    requestIdHeader: runtimeConfig.tracing.requestIdHeader,
    recentRequestIds: [...runtimeConfig.tracing.recentRequestIds]
  };
}

/**
 * Push a new request ID to the recent requests ring buffer
 */
export function pushRecentRequestId(id) {
  if (!id || typeof id !== 'string') {
    return;
  }
  
  const recentIds = runtimeConfig.tracing.recentRequestIds;
  
  // Add timestamp and limit buffer size
  const entry = {
    id,
    timestamp: new Date().toISOString()
  };
  
  recentIds.unshift(entry);
  
  // Keep only recent entries (limit to DEFAULT_RECENT_REQUEST_IDS_SIZE)
  if (recentIds.length > DEFAULT_RECENT_REQUEST_IDS_SIZE) {
    recentIds.splice(DEFAULT_RECENT_REQUEST_IDS_SIZE);
  }
}

/**
 * Set request ID header name dynamically
 */
export function setRequestIdHeaderDynamic(name) {
  if (!name || typeof name !== 'string') {
    throw new Error('Request ID header name must be a non-empty string');
  }
  runtimeConfig.tracing.requestIdHeader = name;
}

/**
 * Get metrics configuration
 */
export function getMetricsConfig() {
  return { ...runtimeConfig.metrics };
}

/**
 * Set metrics enabled dynamically
 */
export function setMetricsEnabledDynamic(enabled) {
  if (typeof enabled !== 'boolean') {
    throw new Error('Metrics enabled must be a boolean');
  }
  runtimeConfig.metrics.enabled = enabled;
}

/**
 * Set version information
 */
export function setVersionInfo(info) {
  if (typeof info !== 'object' || info === null) {
    throw new Error('Version info must be an object');
  }
  
  runtimeConfig.versions = {
    commit: info.commit || null,
    buildTime: info.buildTime || null,
    version: info.version || null
  };
}

/**
 * Get version information
 */
export function getVersionInfo() {
  return { ...runtimeConfig.versions };
}

/**
 * Get audit log slice with filtering
 */
export function getAuditLogSlice(filter = {}) {
  const { category, q, limit = 100, since } = filter;
  let logs = [...runtimeConfig.audit.ringBuffer];
  
  // Filter by category
  if (category) {
    logs = logs.filter(log => log.category === category);
  }
  
  // Filter by search query (case-insensitive substring match on message + meta JSON)
  if (q) {
    const query = q.toLowerCase();
    logs = logs.filter(log => {
      const message = (log.message || '').toLowerCase();
      const meta = JSON.stringify(log.meta || {}).toLowerCase();
      return message.includes(query) || meta.includes(query);
    });
  }
  
  // Filter by since timestamp
  if (since) {
    const sinceDate = new Date(since);
    logs = logs.filter(log => new Date(log.timestamp) >= sinceDate);
  }
  
  // Sort newest first and limit
  logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  return logs.slice(0, limit);
}

/**
 * Push audit log entry to ring buffer
 */
export function pushAuditLog(entry) {
  if (typeof entry !== 'object' || entry === null) {
    return;
  }
  
  const logEntry = {
    timestamp: new Date().toISOString(),
    category: entry.category || 'general',
    message: entry.message || '',
    meta: entry.meta || {},
    user: entry.user || null,
    ip: entry.ip || null,
    userAgent: entry.userAgent || null,
    ...entry
  };
  
  runtimeConfig.audit.ringBuffer.unshift(logEntry);
  
  // Maintain ring buffer size
  if (runtimeConfig.audit.ringBuffer.length > runtimeConfig.audit.ringSize) {
    runtimeConfig.audit.ringBuffer.splice(runtimeConfig.audit.ringSize);
  }
}

/**
 * Get unique audit log categories
 */
export function getAuditCategories() {
  const categories = new Set();
  for (const log of runtimeConfig.audit.ringBuffer) {
    if (log.category) {
      categories.add(log.category);
    }
  }
  return Array.from(categories).sort();
}

export default {
  getRuntimeConfigSnapshot,
  updateRateLimit,
  updateSecurity,
  getRateLimitConfig,
  getSecurityConfig,
  getTracingConfig,
  pushRecentRequestId,
  setRequestIdHeaderDynamic,
  getMetricsConfig,
  setMetricsEnabledDynamic,
  setVersionInfo,
  getVersionInfo,
  getAuditLogSlice,
  pushAuditLog,
  getAuditCategories
};