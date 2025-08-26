// frontend/src/api/adminRuntime.js
// API helper for admin runtime configuration endpoints

import { client } from './client.js';

/**
 * Mark if runtime dynamic features are available
 * Set to false if backend doesn't support dynamic endpoints
 */
let runtimeDynamicAvailable = true;

/**
 * Check if runtime dynamic features are available
 */
export function isRuntimeDynamicAvailable() {
  return runtimeDynamicAvailable;
}

/**
 * Centralized error handling for admin runtime API calls
 */
function handleApiError(error, context) {
  // Check if this is a 404 - indicates dynamic endpoints not available
  if (error?.response?.status === 404 && context === 'runtime/config') {
    runtimeDynamicAvailable = false;
    return {
      error: 'Runtime dynamic features not available',
      fallback: true,
      originalError: error
    };
  }
  
  // Extract error message
  const message = error?.response?.data?.message || 
                  error?.response?.data?.error || 
                  error?.message || 
                  'Unknown error occurred';
  
  return {
    error: message,
    status: error?.response?.status,
    originalError: error
  };
}

/**
 * Fetch current runtime configuration
 * @returns {Promise<Object>} Runtime configuration object
 */
export async function fetchRuntimeConfig() {
  try {
    const response = await client.get('/admin/runtime/config');
    runtimeDynamicAvailable = true; // Mark as available on success
    return response.data;
  } catch (error) {
    const handled = handleApiError(error, 'runtime/config');
    throw handled;
  }
}

/**
 * Update rate limiting configuration
 * @param {Object} patch - Partial rate limit configuration
 * @returns {Promise<Object>} Updated rate limit configuration
 */
export async function updateRateLimitConfig(patch) {
  try {
    const response = await client.put('/admin/runtime/rate-limit', patch);
    return response.data;
  } catch (error) {
    const handled = handleApiError(error, 'rate-limit');
    throw handled;
  }
}

/**
 * Update security configuration
 * @param {Object} patch - Partial security configuration
 * @returns {Promise<Object>} Updated security configuration
 */
export async function updateSecurityConfig(patch) {
  try {
    const response = await client.put('/admin/runtime/security', patch);
    return response.data;
  } catch (error) {
    const handled = handleApiError(error, 'security');
    throw handled;
  }
}

/**
 * Fetch available audit log categories
 * @returns {Promise<Array>} Array of category strings
 */
export async function fetchAuditCategories() {
  try {
    const response = await client.get('/admin/audit/categories');
    return response.data;
  } catch (error) {
    const handled = handleApiError(error, 'audit/categories');
    throw handled;
  }
}

/**
 * Fetch audit logs with filtering
 * @param {Object} params - Filter parameters
 * @param {string} params.category - Filter by category (exact match)
 * @param {string} params.q - Search query (case-insensitive substring)
 * @param {number} params.limit - Maximum number of results (default 100, max 500)
 * @param {string} params.since - ISO timestamp to filter logs after
 * @returns {Promise<Array>} Array of audit log entries
 */
export async function fetchAuditLogs(params = {}) {
  try {
    const response = await client.get('/admin/audit/logs', { params });
    return response.data;
  } catch (error) {
    const handled = handleApiError(error, 'audit/logs');
    throw handled;
  }
}

/**
 * Fetch health endpoint data
 * @returns {Promise<Object>} Health information including runtime data
 */
export async function fetchHealthData() {
  try {
    const response = await client.get('/health');
    return response.data;
  } catch (error) {
    const handled = handleApiError(error, 'health');
    throw handled;
  }
}

/**
 * Fetch readiness endpoint data
 * @returns {Promise<Object>} Readiness information
 */
export async function fetchReadinessData() {
  try {
    const response = await client.get('/readiness');
    return response.data;
  } catch (error) {
    const handled = handleApiError(error, 'readiness');
    throw handled;
  }
}

/**
 * Fetch metrics data (Prometheus format)
 * @returns {Promise<string>} Metrics text data
 */
export async function fetchMetricsData() {
  try {
    const response = await client.get('/metrics', {
      headers: {
        'Accept': 'text/plain'
      }
    });
    return response.data;
  } catch (error) {
    const handled = handleApiError(error, 'metrics');
    throw handled;
  }
}