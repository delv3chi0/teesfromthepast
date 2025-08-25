// backend/middleware/traceCorrelation.js
import { nanoid } from 'nanoid';

export function traceCorrelation(req, res, next) {
  // Generate a simple trace ID if OpenTelemetry isn't available yet
  const traceId = nanoid(16);
  
  // Add trace ID to response header
  res.setHeader('X-Trace-Id', traceId);
  
  // Add trace ID to request for logging context
  req.traceId = traceId;
  
  next();
}

export default traceCorrelation;