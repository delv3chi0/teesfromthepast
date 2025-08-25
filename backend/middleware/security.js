// backend/middleware/security.js
// Security hardening middleware stack
// TODO: NEXT_10_BACKEND_TASKS Task 4 - Security middleware consolidation and enhancement

import helmet from 'helmet';
import cors from 'cors';
import { getConfig, isConfigReady } from '../config/index.js';
import { logger } from '../utils/logger.js';

/**
 * Configure Helmet security headers with sensible defaults
 * TODO: NEXT_10_BACKEND_TASKS Task 4 - Refine CSP policies for production
 */
export function configureHelmet() {
  return helmet({
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // TODO: Remove unsafe-inline in production
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"], // Allow external images for product photos
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    
    // Cross-Origin Embedder Policy
    crossOriginEmbedderPolicy: false, // TODO: Enable when frontend supports it
    
    // Cross-Origin Resource Policy
    crossOriginResourcePolicy: { policy: "cross-origin" },
    
    // DNS Prefetch Control
    dnsPrefetchControl: true,
    
    // Frame Options
    frameguard: { action: 'deny' },
    
    // Hide Powered-By header
    hidePoweredBy: true,
    
    // HTTP Strict Transport Security
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    
    // IE No Open
    ieNoOpen: true,
    
    // No Sniff
    noSniff: true,
    
    // Origin Agent Cluster
    originAgentCluster: true,
    
    // Permitted Cross-Domain Policies
    permittedCrossDomainPolicies: false,
    
    // Referrer Policy
    referrerPolicy: { policy: "no-referrer" },
    
    // X-XSS-Protection
    xssFilter: true,
  });
}

/**
 * Configure CORS with environment-based origins
 * TODO: NEXT_10_BACKEND_TASKS Task 4 - Enhanced CORS configuration
 */
export function configureCors() {
  const config = isConfigReady() ? getConfig() : null;
  const allowedOrigins = config?.ALLOWED_ORIGINS 
    ? config.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : ['http://localhost:3000']; // Default for development

  return cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn('CORS policy violation', { origin, allowedOrigins });
        callback(new Error(`CORS: Origin not allowed: ${origin}`), false);
      }
    },
    credentials: true,
    optionsSuccessStatus: 200, // Some legacy browsers choke on 204
    maxAge: 86400, // 24 hours preflight cache
  });
}

/**
 * Request size monitoring middleware
 * TODO: NEXT_10_BACKEND_TASKS Task 4 - Enhanced request size monitoring
 */
export function monitorRequestSize(thresholdMb = 10) {
  return (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    const thresholdBytes = thresholdMb * 1024 * 1024;
    
    if (contentLength > thresholdBytes) {
      logger.warn('Large request detected', {
        url: req.originalUrl,
        method: req.method,
        contentLength,
        thresholdMb,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
    }
    
    next();
  };
}

/**
 * Rate limiter placeholder
 * TODO: NEXT_10_BACKEND_TASKS Task 4 - Consolidate rate limiting middleware
 * 
 * Current rate limiting is scattered across:
 * - rateLimitLogin.js for login endpoints
 * - General rate limiting in app.js
 * - TODO: Unify into single configurable system with Redis backend
 */
export function configureRateLimiting() {
  // Placeholder for future rate limiting consolidation
  logger.info('Rate limiting configuration - using existing scattered implementation');
  
  // TODO: Implement unified rate limiter with:
  // - Redis backend for distributed rate limiting
  // - Different limits per endpoint type (auth, API, uploads)
  // - IP-based and user-based rate limiting
  // - Configurable windows and limits
  // - Rate limit headers (X-RateLimit-*)
  
  return (req, res, next) => {
    // Pass-through for now - existing rate limiters handle this
    next();
  };
}

/**
 * Input sanitization and injection protection
 * TODO: NEXT_10_BACKEND_TASKS Task 4 - Enhanced injection protection
 */
export function configureInjectionProtection() {
  // TODO: Implement enhanced protection against:
  // - SQL injection (already partially handled by mongoose)
  // - NoSQL injection (already handled by express-mongo-sanitize)
  // - XSS attacks (already handled by xss-clean)
  // - Command injection
  // - LDAP injection
  // - Path traversal
  
  logger.info('Injection protection - using existing middleware (mongo-sanitize, xss-clean)');
  
  return (req, res, next) => {
    // Existing protection is already wired in app.js
    // This is a placeholder for future enhancements
    next();
  };
}

/**
 * Assemble complete security middleware stack
 * TODO: NEXT_10_BACKEND_TASKS Task 4 - Complete security middleware assembly
 */
export function assembleSecurityMiddleware(app) {
  logger.info('Assembling security middleware stack');
  
  // 1. Helmet security headers
  app.use(configureHelmet());
  
  // 2. CORS configuration
  app.use(configureCors());
  
  // 3. Request size monitoring
  app.use(monitorRequestSize());
  
  // 4. Rate limiting (placeholder)
  app.use(configureRateLimiting());
  
  // 5. Injection protection (placeholder)
  app.use(configureInjectionProtection());
  
  logger.info('Security middleware stack assembled');
}

export default {
  configureHelmet,
  configureCors,
  monitorRequestSize,
  configureRateLimiting,
  configureInjectionProtection,
  assembleSecurityMiddleware,
};