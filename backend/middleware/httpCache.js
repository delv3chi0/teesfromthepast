// backend/middleware/httpCache.js
// HTTP caching headers for static assets and API responses
import crypto from 'crypto';

// Generate ETag for response data
export function generateETag(data) {
  return crypto
    .createHash('md5')
    .update(JSON.stringify(data))
    .digest('hex');
}

// HTTP cache middleware for immutable static assets
export function staticCacheHeaders(maxAge = 31536000) { // 1 year default
  return (req, res, next) => {
    // Only apply to static asset routes
    if (req.path.match(/\.(jpg|jpeg|png|gif|ico|css|js|woff|woff2|ttf|svg)$/)) {
      res.setHeader('Cache-Control', `public, max-age=${maxAge}, immutable`);
      res.setHeader('Expires', new Date(Date.now() + maxAge * 1000).toUTCString());
    }
    next();
  };
}

// API response caching middleware
export function apiCacheHeaders(options = {}) {
  const {
    maxAge = 300, // 5 minutes default
    mustRevalidate = true,
    private: isPrivate = false,
    staleWhileRevalidate = 60
  } = options;
  
  return (req, res, next) => {
    // Store original json method
    const originalJson = res.json;
    
    // Override json method to add cache headers
    res.json = function(data) {
      // Generate ETag
      const etag = generateETag(data);
      res.setHeader('ETag', `"${etag}"`);
      
      // Check if client has matching ETag
      const clientETag = req.headers['if-none-match'];
      if (clientETag && clientETag === `"${etag}"`) {
        return res.status(304).end();
      }
      
      // Set cache control headers
      const cacheControl = [];
      
      if (isPrivate) {
        cacheControl.push('private');
      } else {
        cacheControl.push('public');
      }
      
      cacheControl.push(`max-age=${maxAge}`);
      
      if (mustRevalidate) {
        cacheControl.push('must-revalidate');
      }
      
      if (staleWhileRevalidate > 0) {
        cacheControl.push(`stale-while-revalidate=${staleWhileRevalidate}`);
      }
      
      res.setHeader('Cache-Control', cacheControl.join(', '));
      res.setHeader('Last-Modified', new Date().toUTCString());
      
      // Call original json method
      return originalJson.call(this, data);
    };
    
    next();
  };
}

// No-cache headers for sensitive endpoints
export function noCacheHeaders() {
  return (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
  };
}

export default {
  generateETag,
  staticCacheHeaders,
  apiCacheHeaders,
  noCacheHeaders
};