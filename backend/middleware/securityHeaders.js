// backend/middleware/securityHeaders.js
// Security headers middleware with configurable CSP and COEP
import { isConfigReady, getConfig } from '../config/index.js';
import { getSecurityConfig } from '../config/dynamicConfig.js';
import { logger } from '../utils/logger.js';

// Build Content Security Policy
function buildCSP(reportOnly = true) {
  const baseCSP = [
    "default-src 'self'",
    "script-src 'self'", 
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'"
  ].join('; ');
  
  return reportOnly ? `${baseCSP}` : baseCSP;
}

// Security headers middleware
export function securityHeaders(req, res, next) {
  let cspReportOnly;
  let enableCoep;
  
  // Get configuration - check dynamic config first, then static config
  try {
    const dynamicConfig = getSecurityConfig();
    cspReportOnly = dynamicConfig.cspReportOnly;
    enableCoep = dynamicConfig.enableCOEP;
  } catch {
    // Fallback to static configuration
    if (isConfigReady()) {
      const config = getConfig();
      cspReportOnly = config.CSP_REPORT_ONLY !== false;
      enableCoep = config.ENABLE_COEP === true;
    } else {
      cspReportOnly = process.env.CSP_REPORT_ONLY !== 'false';
      enableCoep = process.env.ENABLE_COEP === 'true';
    }
  }
  
  // Content Security Policy
  const csp = buildCSP(cspReportOnly);
  if (cspReportOnly) {
    res.setHeader('Content-Security-Policy-Report-Only', csp);
  } else {
    res.setHeader('Content-Security-Policy', csp);
  }
  
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions Policy (restrictive baseline)
  res.setHeader('Permissions-Policy', [
    'accelerometer=()',
    'camera=()',
    'geolocation=()',
    'gyroscope=()',
    'magnetometer=()',
    'microphone=()',
    'payment=()',
    'usb=()'
  ].join(', '));
  
  // Cross-Origin headers
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  
  // Cross-Origin Embedder Policy (optional)
  if (enableCoep) {
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  }
  
  // Additional security headers (complementing helmet)
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  next();
}

// Check if security headers should be applied (skip for certain routes)
export function createSecurityHeaders(options = {}) {
  const { skipPaths = [] } = options;
  
  return (req, res, next) => {
    // Skip security headers for certain paths if needed
    if (skipPaths.some(path => req.path.startsWith(path))) {
      return next();
    }
    
    securityHeaders(req, res, next);
  };
}

export default securityHeaders;