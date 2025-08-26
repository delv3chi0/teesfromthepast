// frontend/src/api/adminRuntime.js
// API helper for runtime configuration and dynamic admin console features
import { client } from './client.js';

/**
 * Fetch complete runtime configuration snapshot
 */
export async function fetchRuntimeConfig() {
  try {
    const response = await client.get('/admin/runtime/config');
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || error.message,
      status: error.response?.status,
      backendAvailable: error.response?.status !== undefined
    };
  }
}

/**
 * Update rate limiting configuration
 */
export async function updateRateLimitConfig(patch) {
  try {
    const response = await client.put('/admin/runtime/rate-limit', patch);
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || error.message,
      details: error.response?.data?.details,
      status: error.response?.status,
      backendAvailable: error.response?.status !== undefined
    };
  }
}

/**
 * Update security configuration
 */
export async function updateSecurityConfig(patch) {
  try {
    const response = await client.put('/admin/runtime/security', patch);
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || error.message,
      details: error.response?.data?.details,
      status: error.response?.status,
      backendAvailable: error.response?.status !== undefined
    };
  }
}

/**
 * Fetch audit log categories
 */
export async function fetchAuditCategories() {
  try {
    const response = await client.get('/admin/audit/categories');
    return {
      success: true,
      data: response.data.categories || []
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || error.message,
      status: error.response?.status,
      backendAvailable: error.response?.status !== undefined
    };
  }
}

/**
 * Fetch audit logs with filtering
 */
export async function fetchAuditLogs(params = {}) {
  try {
    const response = await client.get('/admin/audit/logs', { params });
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || error.message,
      status: error.response?.status,
      backendAvailable: error.response?.status !== undefined
    };
  }
}

/**
 * Fetch health endpoint data
 */
export async function fetchHealth() {
  try {
    const response = await client.get('/health');
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || error.message,
      status: error.response?.status,
      backendAvailable: error.response?.status !== undefined
    };
  }
}

/**
 * Fetch readiness endpoint data
 */
export async function fetchReadiness() {
  try {
    const response = await client.get('/readiness');
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || error.message,
      status: error.response?.status,
      backendAvailable: error.response?.status !== undefined
    };
  }
}

/**
 * Fetch metrics data
 */
export async function fetchMetrics() {
  try {
    const response = await client.get('/metrics');
    return {
      success: true,
      data: response.data,
      contentType: response.headers['content-type']
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || error.message,
      status: error.response?.status,
      backendAvailable: error.response?.status !== undefined
    };
  }
}

/**
 * Check if backend runtime endpoints are available
 */
export async function checkBackendAvailability() {
  try {
    await client.get('/admin/runtime/config');
    return { available: true };
  } catch (error) {
    return { 
      available: false, 
      status: error.response?.status,
      isNetworkError: !error.response
    };
  }
}

/**
 * Simple Prometheus exposition format parser
 * Groups metrics by type (counter, gauge, histogram)
 */
export function parsePrometheusMetrics(textData) {
  if (!textData || typeof textData !== 'string') {
    return { counters: [], gauges: [], histograms: [], other: [] };
  }

  const lines = textData.split('\n');
  const metrics = { counters: [], gauges: [], histograms: [], other: [] };
  
  let currentMetric = null;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) {
      // Extract metric type from HELP comments
      if (trimmed.startsWith('# TYPE ')) {
        const parts = trimmed.split(' ');
        if (parts.length >= 4) {
          const metricName = parts[2];
          const metricType = parts[3];
          currentMetric = { name: metricName, type: metricType, values: [] };
        }
      }
      continue;
    }
    
    // Parse metric line
    const spaceIndex = trimmed.lastIndexOf(' ');
    if (spaceIndex === -1) continue;
    
    const metricPart = trimmed.substring(0, spaceIndex);
    const value = parseFloat(trimmed.substring(spaceIndex + 1));
    
    if (isNaN(value)) continue;
    
    // Extract metric name and labels
    const braceIndex = metricPart.indexOf('{');
    const metricName = braceIndex === -1 ? metricPart : metricPart.substring(0, braceIndex);
    const labels = braceIndex === -1 ? {} : parseLabels(metricPart.substring(braceIndex));
    
    const metricEntry = { name: metricName, labels, value };
    
    // Group by type
    if (currentMetric && metricName.startsWith(currentMetric.name)) {
      currentMetric.values.push(metricEntry);
    } else {
      // Guess type from name if no TYPE comment found
      if (metricName.includes('_total') || metricName.endsWith('_count')) {
        metrics.counters.push(metricEntry);
      } else if (metricName.includes('_bucket') || metricName.includes('_sum')) {
        metrics.histograms.push(metricEntry);
      } else {
        metrics.gauges.push(metricEntry);
      }
    }
  }
  
  // Add collected metrics from TYPE comments
  for (const line of textData.split('\n')) {
    if (line.startsWith('# TYPE ')) {
      const parts = line.split(' ');
      if (parts.length >= 4) {
        const metricType = parts[3];
        if (currentMetric && currentMetric.values.length > 0) {
          metrics[metricType + 's'] = metrics[metricType + 's'] || [];
          metrics[metricType + 's'].push(...currentMetric.values);
        }
      }
    }
  }
  
  return metrics;
}

/**
 * Parse Prometheus metric labels
 */
function parseLabels(labelString) {
  const labels = {};
  
  // Simple label parsing (doesn't handle all edge cases)
  const matches = labelString.match(/(\w+)="([^"]+)"/g);
  if (matches) {
    for (const match of matches) {
      const [, key, value] = match.match(/(\w+)="([^"]+)"/);
      labels[key] = value;
    }
  }
  
  return labels;
}

export default {
  fetchRuntimeConfig,
  updateRateLimitConfig,
  updateSecurityConfig,
  fetchAuditCategories,
  fetchAuditLogs,
  fetchHealth,
  fetchReadiness,
  fetchMetrics,
  checkBackendAvailability,
  parsePrometheusMetrics
};