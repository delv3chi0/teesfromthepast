// frontend/src/api/adminRuntime.js
/**
 * API helper functions for Dynamic Admin Console runtime configuration
 */

import { client } from './client.js';

/**
 * Check if runtime dynamic admin features are available
 * @returns {Promise<boolean>} - True if runtime endpoints are available
 */
export async function checkRuntimeAvailability() {
  try {
    await client.get('/admin/runtime/config');
    return true;
  } catch (error) {
    if (error.response?.status === 404) {
      return false;
    }
    // Other errors (auth, server) don't necessarily mean unavailable
    throw error;
  }
}

/**
 * Fetch current runtime configuration
 * @returns {Promise<Object>} - Current runtime configuration snapshot
 */
export async function fetchRuntimeConfig() {
  try {
    const response = await client.get('/admin/runtime/config');
    return response.data;
  } catch (error) {
    console.error('[adminRuntime] Failed to fetch runtime config:', error);
    throw error;
  }
}

/**
 * Update rate limiting configuration
 * @param {Object} updates - Rate limit configuration updates
 * @param {string} [updates.algorithm] - Rate limiting algorithm: 'fixed' | 'sliding' | 'token_bucket'
 * @param {number} [updates.globalMax] - Global maximum requests per window
 * @param {number} [updates.windowMs] - Window size in milliseconds
 * @param {Array} [updates.overrides] - Path-based overrides: [{ pathPrefix, max, algorithm? }]
 * @param {Array} [updates.roleOverrides] - Role-based overrides: [{ role, pathPrefix?, max, algorithm? }]
 * @returns {Promise<Object>} - Updated rate limit configuration
 */
export async function updateRateLimitConfig(updates) {
  try {
    const response = await client.put('/admin/runtime/rate-limit', updates);
    return response.data;
  } catch (error) {
    console.error('[adminRuntime] Failed to update rate limit config:', error);
    throw error;
  }
}

/**
 * Update security configuration  
 * @param {Object} updates - Security configuration updates
 * @param {boolean} [updates.cspReportOnly] - CSP report-only mode (true) vs enforcing (false)
 * @param {boolean} [updates.enableCOEP] - Enable Cross-Origin Embedder Policy header
 * @returns {Promise<Object>} - Updated security configuration
 */
export async function updateSecurityConfig(updates) {
  try {
    const response = await client.put('/admin/runtime/security', updates);
    return response.data;
  } catch (error) {
    console.error('[adminRuntime] Failed to update security config:', error);
    throw error;
  }
}

/**
 * Fetch available audit log categories
 * @returns {Promise<Array<string>>} - List of audit log categories
 */
export async function fetchAuditCategories() {
  try {
    const response = await client.get('/admin/audit/categories');
    return response.data.data || [];
  } catch (error) {
    console.error('[adminRuntime] Failed to fetch audit categories:', error);
    throw error;
  }
}

/**
 * Fetch filtered audit logs from ring buffer
 * @param {Object} filters - Filter parameters
 * @param {string} [filters.category] - Filter by category (partial match)
 * @param {string} [filters.q] - Search query (searches message and meta)
 * @param {number} [filters.limit] - Maximum number of entries to return (default: 50, max: 1000)
 * @param {string} [filters.since] - ISO timestamp, only return entries after this time
 * @returns {Promise<Array>} - Filtered audit log entries (newest first)
 */
export async function fetchAuditLogs(filters = {}) {
  try {
    const params = new URLSearchParams();
    
    if (filters.category) params.append('category', filters.category);
    if (filters.q) params.append('q', filters.q);
    if (filters.limit) params.append('limit', String(filters.limit));
    if (filters.since) params.append('since', filters.since);
    
    const response = await client.get(`/admin/audit/logs?${params.toString()}`);
    return response.data.data || [];
  } catch (error) {
    console.error('[adminRuntime] Failed to fetch audit logs:', error);
    throw error;
  }
}

/**
 * Helper to handle API errors consistently
 * @param {Error} error - The error object from API call
 * @returns {Object} - Standardized error object with user-friendly message
 */
export function handleRuntimeApiError(error) {
  if (!error.response) {
    return {
      code: 'NETWORK_ERROR',
      message: 'Network error occurred. Please check your connection.',
      details: error.message
    };
  }
  
  const { status, data } = error.response;
  
  switch (status) {
    case 400:
      return {
        code: data.error?.code || 'VALIDATION_ERROR',
        message: data.error?.message || 'Invalid request data',
        details: data.error?.details || []
      };
    case 401:
      return {
        code: 'UNAUTHORIZED',
        message: 'Authentication required. Please log in again.',
        details: []
      };
    case 403:
      return {
        code: 'FORBIDDEN',
        message: 'Admin privileges required for this action.',
        details: []
      };
    case 404:
      return {
        code: 'NOT_FOUND',
        message: 'Dynamic admin features not available.',
        details: []
      };
    case 500:
      return {
        code: 'SERVER_ERROR',
        message: 'Server error occurred. Please try again later.',
        details: data.error?.message || ''
      };
    default:
      return {
        code: 'UNKNOWN_ERROR',
        message: `Unexpected error occurred (${status})`,
        details: data.error?.message || ''
      };
  }
}

/**
 * Helper to format timestamps for display
 * @param {string} isoString - ISO timestamp string
 * @returns {string} - Formatted datetime string
 */
export function formatTimestamp(isoString) {
  if (!isoString) return '—';
  
  try {
    const date = new Date(isoString);
    return date.toLocaleString();
  } catch {
    return '—';
  }
}

/**
 * Helper to format relative time (e.g., "2 minutes ago")
 * @param {string} isoString - ISO timestamp string
 * @returns {string} - Relative time string
 */
export function formatRelativeTime(isoString) {
  if (!isoString) return '—';
  
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    
    return date.toLocaleDateString();
  } catch {
    return '—';
  }
}

/**
 * Helper to validate rate limit configuration before submission
 * @param {Object} config - Rate limit configuration object
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
export function validateRateLimitConfig(config) {
  const errors = [];
  
  if (config.algorithm && !['fixed', 'sliding', 'token_bucket'].includes(config.algorithm)) {
    errors.push('Algorithm must be: fixed, sliding, or token_bucket');
  }
  
  if (config.globalMax !== undefined) {
    const max = Number(config.globalMax);
    if (isNaN(max) || max <= 0) {
      errors.push('Global max must be a positive number');
    }
  }
  
  if (config.windowMs !== undefined) {
    const window = Number(config.windowMs);
    if (isNaN(window) || window <= 0) {
      errors.push('Window must be a positive number (milliseconds)');
    }
  }
  
  if (config.overrides && Array.isArray(config.overrides)) {
    config.overrides.forEach((override, index) => {
      if (!override.pathPrefix) {
        errors.push(`Override ${index + 1}: Path prefix is required`);
      }
      if (!override.max || Number(override.max) <= 0) {
        errors.push(`Override ${index + 1}: Max must be a positive number`);
      }
      if (override.algorithm && !['fixed', 'sliding', 'token_bucket'].includes(override.algorithm)) {
        errors.push(`Override ${index + 1}: Invalid algorithm`);
      }
    });
  }
  
  if (config.roleOverrides && Array.isArray(config.roleOverrides)) {
    config.roleOverrides.forEach((override, index) => {
      if (!override.role) {
        errors.push(`Role override ${index + 1}: Role is required`);
      }
      if (!override.max || Number(override.max) <= 0) {
        errors.push(`Role override ${index + 1}: Max must be a positive number`);
      }
      if (override.algorithm && !['fixed', 'sliding', 'token_bucket'].includes(override.algorithm)) {
        errors.push(`Role override ${index + 1}: Invalid algorithm`);
      }
    });
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Helper to validate security configuration before submission
 * @param {Object} config - Security configuration object
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
export function validateSecurityConfig(config) {
  const errors = [];
  
  if (config.cspReportOnly !== undefined && typeof config.cspReportOnly !== 'boolean') {
    errors.push('CSP Report Only must be true or false');
  }
  
  if (config.enableCOEP !== undefined && typeof config.enableCOEP !== 'boolean') {
    errors.push('Enable COEP must be true or false');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}