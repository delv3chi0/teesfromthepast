// backend/middleware/perfHeaders.js
// Performance headers middleware for caching and optimization
import logger from '../utils/logger.js';

/**
 * Performance headers middleware
 * Sets Cache-Control headers with sensible defaults:
 * - API responses: no-store (no caching by default)
 * - Public assets/thumbnails: 5min cache with stale-while-revalidate
 */
export function perfHeaders(req, res, next) {
  // Set default no-cache for API responses
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  // Override for public assets and thumbnails
  const isPublicAsset = req.path.includes('/uploads/') || 
                       req.path.includes('/thumbnails/') ||
                       req.path.includes('/public/');
  
  if (isPublicAsset) {
    // 5 minutes cache with stale-while-revalidate for 60 seconds
    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
    logger.debug('Public asset cache headers set', { path: req.path });
  }

  next();
}

export default perfHeaders;