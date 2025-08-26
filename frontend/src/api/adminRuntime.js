// frontend/src/api/adminRuntime.js
// API helper for admin runtime configuration endpoints

import { client } from './client.js';

/**
 * Get complete runtime configuration
 */
export const getRuntimeConfig = async () => {
  const response = await client.get('/admin/runtime/config');
  return response.data;
};

/**
 * Update rate limiting configuration
 */
export const updateRateLimitConfig = async (updates) => {
  const response = await client.put('/admin/runtime/rate-limit', updates);
  return response.data;
};

/**
 * Update security configuration
 */
export const updateSecurityConfig = async (updates) => {
  const response = await client.put('/admin/runtime/security', updates);
  return response.data;
};

/**
 * Get audit categories
 */
export const getAuditCategories = async () => {
  const response = await client.get('/admin/audit/categories');
  return response.data;
};

/**
 * Get audit logs with filtering
 */
export const getAuditLogs = async (params = {}) => {
  const response = await client.get('/admin/audit/logs', { params });
  return response.data;
};

/**
 * Get current dynamic overrides (debug)
 */
export const getDynamicOverrides = async () => {
  const response = await client.get('/admin/runtime/overrides');
  return response.data;
};

/**
 * Get Prometheus metrics
 */
export const getPrometheusMetrics = async () => {
  try {
    const response = await client.get('/metrics', {
      headers: { 'Accept': 'text/plain' }
    });
    return { success: true, data: response.data };
  } catch (error) {
    if (error.response?.status === 404) {
      return { success: false, error: 'Metrics disabled or endpoint not found' };
    }
    throw error;
  }
};

/**
 * Get admin metrics (JSON format)
 */
export const getAdminMetrics = async () => {
  const response = await client.get('/api/metrics');
  return response.data;
};