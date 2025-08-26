// frontend/src/api/adminRuntime.js
// API helper functions for admin runtime configuration endpoints
import { client } from './client';

/**
 * Fetch complete runtime configuration snapshot
 */
export async function fetchRuntimeConfig() {
  const response = await client.get('/admin/runtime/config');
  return response.data;
}

/**
 * Update rate limiting configuration
 */
export async function updateRateLimitConfig(config) {
  const response = await client.put('/admin/runtime/rate-limit', config);
  return response.data;
}

/**
 * Update security configuration toggles
 */
export async function updateSecurityConfig(config) {
  const response = await client.put('/admin/runtime/security', config);
  return response.data;
}

/**
 * Fetch available audit categories
 */
export async function fetchAuditCategories() {
  const response = await client.get('/admin/audit/categories');
  return response.data;
}

/**
 * Fetch audit logs with optional filtering
 * @param {Object} params - Query parameters
 * @param {string} params.category - Filter by category
 * @param {string} params.q - Search query
 * @param {number} params.limit - Maximum number of results
 * @param {string} params.since - ISO timestamp for filtering
 */
export async function fetchAuditLogs(params = {}) {
  const response = await client.get('/admin/audit/logs', { params });
  return response.data;
}

/**
 * Reset dynamic configuration to defaults
 */
export async function resetRuntimeConfig() {
  const response = await client.post('/admin/runtime/reset');
  return response.data;
}

export default {
  fetchRuntimeConfig,
  updateRateLimitConfig,
  updateSecurityConfig,
  fetchAuditCategories,
  fetchAuditLogs,
  resetRuntimeConfig,
};