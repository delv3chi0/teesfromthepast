// backend/config/dynamicConfig.js
// Dynamic Runtime Config Layer - In-memory overrides for various system configurations
import { getVersionInfo } from '../version/index.js';

// In-memory configuration overrides
let dynamicConfig = {
  rateLimit: {
    globalMax: null, // Override global max requests
    windowMs: null,  // Override window duration
    algorithm: null, // Override algorithm ('fixed', 'sliding', 'token_bucket')
    pathOverrides: new Map(), // path -> { max, algorithm?, windowMs? }
    roleOverrides: new Map(), // role -> { max, algorithm?, windowMs? }
  },
  security: {
    cspReportOnly: null, // Override CSP report-only mode
    enableCOEP: null,    // Override COEP enablement
  },
  tracing: {
    requestIdHeader: null, // Override request ID header name
    recentRequestIds: [], // Ring buffer of recent request IDs
    maxRecentRequests: 100, // Size of ring buffer
  },
  metrics: {
    enabled: null, // Override metrics collection
  },
  audit: {
    ringBufferSize: parseInt(process.env.AUDIT_RING_SIZE) || 500,
    entries: [], // Ring buffer for audit entries
    categories: new Set(), // Track all categories seen
  }
};

/**
 * Get a complete snapshot of current runtime configuration
 */
export function getRuntimeConfigSnapshot() {
  const versionInfo = getVersionInfo();
  
  return {
    timestamp: new Date().toISOString(),
    version: {
      commit: versionInfo.commit,
      buildTime: versionInfo.buildTime,
      version: versionInfo.version,
      environment: versionInfo.env?.mode || 'unknown',
    },
    rateLimit: {
      algorithm: dynamicConfig.rateLimit.algorithm,
      globalMax: dynamicConfig.rateLimit.globalMax,
      windowMs: dynamicConfig.rateLimit.windowMs,
      pathOverrides: Object.fromEntries(dynamicConfig.rateLimit.pathOverrides),
      roleOverrides: Object.fromEntries(dynamicConfig.rateLimit.roleOverrides),
    },
    security: {
      cspReportOnly: dynamicConfig.security.cspReportOnly,
      enableCOEP: dynamicConfig.security.enableCOEP,
    },
    tracing: {
      requestIdHeader: dynamicConfig.tracing.requestIdHeader,
      recentRequestCount: dynamicConfig.tracing.recentRequestIds.length,
      maxRecentRequests: dynamicConfig.tracing.maxRecentRequests,
    },
    metrics: {
      enabled: dynamicConfig.metrics.enabled,
    },
    audit: {
      ringBufferSize: dynamicConfig.audit.ringBufferSize,
      currentEntries: dynamicConfig.audit.entries.length,
      categories: Array.from(dynamicConfig.audit.categories),
    },
  };
}

/**
 * Update rate limiting configuration
 */
export function updateRateLimit(config) {
  const { globalMax, windowMs, algorithm, pathOverrides, roleOverrides } = config;
  
  if (globalMax !== undefined) {
    dynamicConfig.rateLimit.globalMax = typeof globalMax === 'number' && globalMax > 0 ? globalMax : null;
  }
  
  if (windowMs !== undefined) {
    dynamicConfig.rateLimit.windowMs = typeof windowMs === 'number' && windowMs > 0 ? windowMs : null;
  }
  
  if (algorithm !== undefined) {
    const validAlgorithms = ['fixed', 'sliding', 'token_bucket'];
    dynamicConfig.rateLimit.algorithm = validAlgorithms.includes(algorithm) ? algorithm : null;
  }
  
  if (pathOverrides !== undefined) {
    if (Array.isArray(pathOverrides)) {
      dynamicConfig.rateLimit.pathOverrides.clear();
      pathOverrides.forEach(({ path, max, algorithm: algo, windowMs: window }) => {
        if (path && typeof max === 'number' && max > 0) {
          const override = { max };
          if (algo && ['fixed', 'sliding', 'token_bucket'].includes(algo)) {
            override.algorithm = algo;
          }
          if (typeof window === 'number' && window > 0) {
            override.windowMs = window;
          }
          dynamicConfig.rateLimit.pathOverrides.set(path, override);
        }
      });
    }
  }
  
  if (roleOverrides !== undefined) {
    if (Array.isArray(roleOverrides)) {
      dynamicConfig.rateLimit.roleOverrides.clear();
      roleOverrides.forEach(({ role, max, algorithm: algo, windowMs: window }) => {
        if (role && typeof max === 'number' && max > 0) {
          const override = { max };
          if (algo && ['fixed', 'sliding', 'token_bucket'].includes(algo)) {
            override.algorithm = algo;
          }
          if (typeof window === 'number' && window > 0) {
            override.windowMs = window;
          }
          dynamicConfig.rateLimit.roleOverrides.set(role, override);
        }
      });
    }
  }
}

/**
 * Update security configuration
 */
export function updateSecurity(config) {
  const { cspReportOnly, enableCOEP } = config;
  
  if (cspReportOnly !== undefined) {
    dynamicConfig.security.cspReportOnly = typeof cspReportOnly === 'boolean' ? cspReportOnly : null;
  }
  
  if (enableCOEP !== undefined) {
    dynamicConfig.security.enableCOEP = typeof enableCOEP === 'boolean' ? enableCOEP : null;
  }
}

/**
 * Get current tracing configuration
 */
export function getTracingConfig() {
  return {
    requestIdHeader: dynamicConfig.tracing.requestIdHeader,
    recentRequestIds: [...dynamicConfig.tracing.recentRequestIds],
    maxRecentRequests: dynamicConfig.tracing.maxRecentRequests,
  };
}

/**
 * Push a new request ID to the recent requests ring buffer
 */
export function pushRecentRequestId(requestId, timestamp = new Date()) {
  const entry = {
    id: requestId,
    timestamp: timestamp.toISOString(),
  };
  
  dynamicConfig.tracing.recentRequestIds.push(entry);
  
  // Maintain ring buffer size
  if (dynamicConfig.tracing.recentRequestIds.length > dynamicConfig.tracing.maxRecentRequests) {
    dynamicConfig.tracing.recentRequestIds.shift();
  }
}

/**
 * Get rate limiting override for a request
 * Priority: role override > path override > global override
 */
export function getRateLimitOverride(req) {
  // Check role override first
  if (req.user?.isAdmin && dynamicConfig.rateLimit.roleOverrides.has('admin')) {
    return dynamicConfig.rateLimit.roleOverrides.get('admin');
  }
  
  if (req.user && dynamicConfig.rateLimit.roleOverrides.has('user')) {
    return dynamicConfig.rateLimit.roleOverrides.get('user');
  }
  
  // Check path overrides
  for (const [pathPrefix, override] of dynamicConfig.rateLimit.pathOverrides) {
    if (req.path.startsWith(pathPrefix)) {
      return override;
    }
  }
  
  // Return global overrides if any
  const globalOverride = {};
  if (dynamicConfig.rateLimit.globalMax !== null) {
    globalOverride.max = dynamicConfig.rateLimit.globalMax;
  }
  if (dynamicConfig.rateLimit.windowMs !== null) {
    globalOverride.windowMs = dynamicConfig.rateLimit.windowMs;
  }
  if (dynamicConfig.rateLimit.algorithm !== null) {
    globalOverride.algorithm = dynamicConfig.rateLimit.algorithm;
  }
  
  return Object.keys(globalOverride).length > 0 ? globalOverride : null;
}

/**
 * Get security configuration overrides
 */
export function getSecurityOverrides() {
  return {
    cspReportOnly: dynamicConfig.security.cspReportOnly,
    enableCOEP: dynamicConfig.security.enableCOEP,
  };
}

/**
 * Get metrics configuration
 */
export function getMetricsConfig() {
  return {
    enabled: dynamicConfig.metrics.enabled,
  };
}

/**
 * Push an audit entry to the ring buffer
 */
export function pushAuditEntry(entry) {
  // Add timestamp if not present
  if (!entry.timestamp) {
    entry.timestamp = new Date().toISOString();
  }
  
  // Track category
  if (entry.category) {
    dynamicConfig.audit.categories.add(entry.category);
  }
  
  // Add to ring buffer
  dynamicConfig.audit.entries.push(entry);
  
  // Maintain ring buffer size
  if (dynamicConfig.audit.entries.length > dynamicConfig.audit.ringBufferSize) {
    dynamicConfig.audit.entries.shift();
  }
}

/**
 * Get audit categories
 */
export function getAuditCategories() {
  return Array.from(dynamicConfig.audit.categories);
}

/**
 * Get audit logs with filtering
 */
export function getAuditLogs({ category, q, limit = 50, since } = {}) {
  let filtered = [...dynamicConfig.audit.entries];
  
  // Filter by category
  if (category) {
    filtered = filtered.filter(entry => entry.category === category);
  }
  
  // Filter by search query (check message, actor, target fields)
  if (q) {
    const query = q.toLowerCase();
    filtered = filtered.filter(entry => {
      const searchText = [
        entry.message,
        entry.actor?.username,
        entry.actor?.email,
        entry.target?.id,
        entry.action,
      ].filter(Boolean).join(' ').toLowerCase();
      
      return searchText.includes(query);
    });
  }
  
  // Filter by timestamp
  if (since) {
    const sinceDate = new Date(since);
    filtered = filtered.filter(entry => new Date(entry.timestamp) >= sinceDate);
  }
  
  // Sort by timestamp descending (newest first)
  filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  // Apply limit
  if (limit > 0) {
    filtered = filtered.slice(0, limit);
  }
  
  return filtered;
}

/**
 * Reset dynamic configuration to defaults
 */
export function resetDynamicConfig() {
  dynamicConfig.rateLimit.globalMax = null;
  dynamicConfig.rateLimit.windowMs = null;
  dynamicConfig.rateLimit.algorithm = null;
  dynamicConfig.rateLimit.pathOverrides.clear();
  dynamicConfig.rateLimit.roleOverrides.clear();
  
  dynamicConfig.security.cspReportOnly = null;
  dynamicConfig.security.enableCOEP = null;
  
  dynamicConfig.tracing.requestIdHeader = null;
  dynamicConfig.tracing.recentRequestIds = [];
  
  dynamicConfig.metrics.enabled = null;
  
  // Note: We don't reset audit entries to preserve history
}

export default {
  getRuntimeConfigSnapshot,
  updateRateLimit,
  updateSecurity,
  getTracingConfig,
  pushRecentRequestId,
  getRateLimitOverride,
  getSecurityOverrides,
  getMetricsConfig,
  pushAuditEntry,
  getAuditCategories,
  getAuditLogs,
  resetDynamicConfig,
};