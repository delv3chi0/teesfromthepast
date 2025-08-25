// backend/middleware/cacheHeaders.js

/**
 * Middleware to set appropriate cache headers based on route type
 */

// For static assets (already hashed via frontend build)
export function cacheStatic(req, res, next) {
  res.set({
    'Cache-Control': 'public, max-age=31536000, immutable', // 1 year for hashed assets
    'ETag': true // Express default ETag generation
  });
  next();
}

// For public product/design thumbnails
export function cachePublicThumbnails(req, res, next) {
  res.set({
    'Cache-Control': 'public, max-age=300, stale-while-revalidate=60', // 5 min cache, 1 min stale
    'ETag': true
  });
  next();
}

// For authenticated/personalized API responses
export function cacheNoStore(req, res, next) {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  next();
}

// For public API endpoints that can be cached briefly
export function cachePublicShort(req, res, next) {
  res.set({
    'Cache-Control': 'public, max-age=60', // 1 minute
    'ETag': true
  });
  next();
}