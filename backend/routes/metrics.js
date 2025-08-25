// backend/routes/metrics.js
// Metrics endpoint for monitoring cache, rate limiting, and performance
import express from 'express';
import { getMetrics as getCacheMetrics } from '../utils/cache.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Cache metrics endpoint (admin only)
router.get('/cache', protect, async (req, res) => {
  // Only allow admin users to access metrics
  if (!req.user?.isAdmin) {
    return res.status(403).json({
      ok: false,
      error: { code: 'FORBIDDEN', message: 'Admin access required' }
    });
  }
  
  const metrics = getCacheMetrics();
  
  res.json({
    ok: true,
    cache: metrics,
    timestamp: new Date().toISOString()
  });
});

// General metrics endpoint (admin only)
router.get('/', protect, async (req, res) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({
      ok: false,
      error: { code: 'FORBIDDEN', message: 'Admin access required' }
    });
  }
  
  const cacheMetrics = getCacheMetrics();
  
  // Basic system metrics
  const systemMetrics = {
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    pid: process.pid,
    nodeVersion: process.version,
    platform: process.platform
  };
  
  res.json({
    ok: true,
    metrics: {
      system: systemMetrics,
      cache: cacheMetrics
    },
    timestamp: new Date().toISOString()
  });
});

export default router;