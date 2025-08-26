// backend/middleware/inFlightTracker.js
// Middleware to track in-flight requests for graceful shutdown
import { logger } from '../utils/logger.js';

let inFlightCount = 0;
let isShuttingDown = false;

// Get current in-flight request count
export function getInFlightCount() {
  return inFlightCount;
}

// Check if server is in shutdown mode
export function isShutdownMode() {
  return isShuttingDown;
}

// Set shutdown mode
export function setShutdownMode(shutdownMode = true) {
  isShuttingDown = shutdownMode;
  logger.info('Shutdown mode changed', { isShuttingDown: shutdownMode, inFlightCount });
}

// Middleware to track in-flight requests
export function inFlightTracker(req, res, next) {
  // If shutting down, reject new requests
  if (isShuttingDown) {
    return res.status(503).json({
      error: {
        code: 'SERVER_SHUTTING_DOWN',
        message: 'Server is shutting down, not accepting new requests'
      }
    });
  }
  
  // Increment in-flight counter
  inFlightCount++;
  
  // Decrement counter when request completes
  const cleanup = () => {
    inFlightCount--;
    if (inFlightCount < 0) {
      inFlightCount = 0; // Safety check
    }
  };
  
  // Listen for request completion
  res.on('finish', cleanup);
  res.on('close', cleanup);
  res.on('error', cleanup);
  
  next();
}

export default inFlightTracker;