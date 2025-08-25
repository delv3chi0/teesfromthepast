// backend/middleware/perfHeaders.js
// Performance and caching headers middleware

/**
 * Set default cache headers for API responses
 */
export function defaultCacheHeaders(req, res, next) {
  // Default to no-store for API endpoints to ensure fresh data
  if (req.path.startsWith('/api/')) {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  }
  next();
}

/**
 * Helper function to set public cache headers
 * Can be called from route handlers for static/image/thumb endpoints
 */
export function setPublicCache(res, seconds = 300, options = {}) {
  const {
    staleWhileRevalidate = 60,
    immutable = false,
    mustRevalidate = false
  } = options;

  let cacheControl = `public, max-age=${seconds}`;
  
  if (staleWhileRevalidate) {
    cacheControl += `, stale-while-revalidate=${staleWhileRevalidate}`;
  }
  
  if (immutable) {
    cacheControl += ', immutable';
  }
  
  if (mustRevalidate) {
    cacheControl += ', must-revalidate';
  }

  res.set('Cache-Control', cacheControl);
  
  // Set Expires header
  const expires = new Date(Date.now() + seconds * 1000);
  res.set('Expires', expires.toUTCString());
}

/**
 * Extend response object with helper method
 */
export function perfHeadersMiddleware(req, res, next) {
  // Add helper method to response object
  res.setPublicCache = (seconds, options) => setPublicCache(res, seconds, options);
  
  // Set default headers for API routes
  defaultCacheHeaders(req, res, next);
}

export default perfHeadersMiddleware;