// frontend/src/utils/webVitals.js
// Web Vitals collection and reporting
import { getCLS, getFCP, getFID, getLCP, getTTFB } from 'web-vitals';

class WebVitalsCollector {
  constructor() {
    this.metrics = [];
    this.endpoint = '/api/rum';
    this.batchSize = 5;
    this.flushInterval = 10000; // 10 seconds
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
    
    // Start collecting metrics
    this.initializeCollection();
    
    // Set up batching and flushing
    this.startBatching();
    
    console.log('[WebVitals] Collection started', { sessionId: this.sessionId });
  }

  generateSessionId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  initializeCollection() {
    // Cumulative Layout Shift
    getCLS((metric) => {
      this.recordMetric(metric);
    });

    // First Contentful Paint
    getFCP((metric) => {
      this.recordMetric(metric);
    });

    // First Input Delay
    getFID((metric) => {
      this.recordMetric(metric);
    });

    // Largest Contentful Paint
    getLCP((metric) => {
      this.recordMetric(metric);
    });

    // Time to First Byte
    getTTFB((metric) => {
      this.recordMetric(metric);
    });

    // Interaction to Next Paint (manual implementation for browsers that support it)
    this.observeINP();
  }

  recordMetric(metric) {
    const processedMetric = {
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
      timestamp: new Date().toISOString()
    };

    console.log('[WebVitals] Metric recorded:', processedMetric);
    
    this.metrics.push(processedMetric);

    // Immediately send critical performance issues
    if (this.isCriticalMetric(processedMetric)) {
      this.flushImmediate([processedMetric]);
    }
  }

  observeINP() {
    // Interaction to Next Paint (INP) - manual implementation
    if (!('PerformanceEventTiming' in window)) return;

    let maxINP = 0;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.interactionId) {
          const inp = entry.processingStart - entry.startTime;
          if (inp > maxINP) {
            maxINP = inp;
            this.recordMetric({
              name: 'INP',
              value: inp,
              rating: this.classifyINP(inp),
              delta: inp - (this.lastINP || 0),
              id: `inp-${Date.now()}`,
              timestamp: new Date().toISOString()
            });
            this.lastINP = inp;
          }
        }
      }
    });

    observer.observe({ type: 'event', buffered: true });
  }

  classifyINP(value) {
    if (value <= 200) return 'good';
    if (value <= 500) return 'needs-improvement';
    return 'poor';
  }

  isCriticalMetric(metric) {
    // Send immediately if performance is very poor
    return metric.rating === 'poor' && (
      (metric.name === 'LCP' && metric.value > 4000) ||
      (metric.name === 'FID' && metric.value > 300) ||
      (metric.name === 'CLS' && metric.value > 0.25) ||
      (metric.name === 'INP' && metric.value > 500)
    );
  }

  startBatching() {
    // Flush metrics periodically
    this.flushTimer = setInterval(() => {
      if (this.metrics.length > 0) {
        this.flushMetrics();
      }
    }, this.flushInterval);

    // Flush on page unload
    window.addEventListener('beforeunload', () => {
      this.flushMetrics(true);
    });

    // Flush on visibility change (tab switch)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && this.metrics.length > 0) {
        this.flushMetrics(true);
      }
    });
  }

  async flushMetrics(useBeacon = false) {
    if (this.metrics.length === 0) return;

    const metricsToSend = [...this.metrics];
    this.metrics = []; // Clear metrics array

    await this.sendMetrics(metricsToSend, useBeacon);
  }

  async flushImmediate(metrics) {
    await this.sendMetrics(metrics, false);
  }

  async sendMetrics(metrics, useBeacon = false) {
    const payload = {
      metrics,
      url: window.location.href,
      userAgent: navigator.userAgent,
      connection: this.getConnectionInfo(),
      deviceMemory: navigator.deviceMemory,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      pageLoadTime: Date.now() - this.startTime
    };

    try {
      if (useBeacon && navigator.sendBeacon) {
        // Use sendBeacon for reliability during page unload
        const success = navigator.sendBeacon(
          this.endpoint,
          JSON.stringify(payload)
        );
        console.log('[WebVitals] Beacon sent:', success, { metricsCount: metrics.length });
      } else {
        // Use fetch for normal operation
        const response = await fetch(this.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const result = await response.json();
          console.log('[WebVitals] Metrics sent successfully:', {
            metricsCount: metrics.length,
            sampled: result.sampled,
            eventId: result.eventId
          });
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }
    } catch (error) {
      console.error('[WebVitals] Failed to send metrics:', error);
      
      // Retry once for critical metrics
      if (metrics.some(m => this.isCriticalMetric(m))) {
        setTimeout(() => {
          this.sendMetrics(metrics.filter(m => this.isCriticalMetric(m)), true);
        }, 5000);
      }
    }
  }

  getConnectionInfo() {
    if (!('connection' in navigator)) return null;
    
    const conn = navigator.connection;
    return {
      effectiveType: conn.effectiveType,
      downlink: conn.downlink,
      rtt: conn.rtt,
      saveData: conn.saveData
    };
  }

  // Manual metric recording for custom events
  recordCustomMetric(name, value, rating = null) {
    this.recordMetric({
      name: `custom_${name}`,
      value,
      rating: rating || 'unknown',
      delta: value,
      id: `custom-${name}-${Date.now()}`,
      timestamp: new Date().toISOString()
    });
  }

  // Get current session statistics
  getSessionStats() {
    return {
      sessionId: this.sessionId,
      startTime: this.startTime,
      duration: Date.now() - this.startTime,
      metricsCollected: this.metrics.length,
      url: window.location.href
    };
  }

  // Cleanup
  destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    // Send any remaining metrics
    if (this.metrics.length > 0) {
      this.flushMetrics(true);
    }
  }
}

// Global instance
let webVitalsCollector = null;

// Initialize web vitals collection
export function initWebVitals() {
  if (webVitalsCollector) return webVitalsCollector;
  
  // Only initialize if RUM is enabled
  const rumEnabled = window.RUM_ENABLED !== false; // Default to true
  if (!rumEnabled) {
    console.log('[WebVitals] RUM collection disabled');
    return null;
  }

  webVitalsCollector = new WebVitalsCollector();
  
  // Make available globally for debugging
  if (process.env.NODE_ENV === 'development') {
    window.webVitalsCollector = webVitalsCollector;
  }
  
  return webVitalsCollector;
}

// Record custom performance metrics
export function recordCustomMetric(name, value, rating = null) {
  if (webVitalsCollector) {
    webVitalsCollector.recordCustomMetric(name, value, rating);
  }
}

// Get session statistics
export function getWebVitalsStats() {
  return webVitalsCollector ? webVitalsCollector.getSessionStats() : null;
}

// Cleanup on app unmount
export function cleanupWebVitals() {
  if (webVitalsCollector) {
    webVitalsCollector.destroy();
    webVitalsCollector = null;
  }
}

export default { 
  initWebVitals, 
  recordCustomMetric, 
  getWebVitalsStats, 
  cleanupWebVitals 
};