// backend/routes/metrics.js
import express from 'express';

const router = express.Router();

// Simple in-memory metrics storage
let metrics = {
  requestsTotal: 0,
  requestsByMethod: {},
  requestsByStatus: {},
  uptime: Date.now()
};

// Middleware to track metrics
export function metricsMiddleware(req, res, next) {
  const start = Date.now();
  
  res.on('finish', () => {
    metrics.requestsTotal++;
    metrics.requestsByMethod[req.method] = (metrics.requestsByMethod[req.method] || 0) + 1;
    metrics.requestsByStatus[res.statusCode] = (metrics.requestsByStatus[res.statusCode] || 0) + 1;
  });
  
  next();
}

// Prometheus-style metrics endpoint 
router.get('/', (req, res) => {
  const uptimeSeconds = Math.floor((Date.now() - metrics.uptime) / 1000);
  
  res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.send(`# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total ${metrics.requestsTotal}

# HELP nodejs_process_up Process up indicator
# TYPE nodejs_process_up gauge
nodejs_process_up 1

# HELP nodejs_process_uptime_seconds Process uptime in seconds
# TYPE nodejs_process_uptime_seconds gauge
nodejs_process_uptime_seconds ${uptimeSeconds}
`);
});

export default router;