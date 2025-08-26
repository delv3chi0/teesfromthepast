// backend/utils/gracefulShutdown.js
// Graceful shutdown handling with configurable timeout
import { logger } from './logger.js';
import { isConfigReady, getConfig } from '../config/index.js';
import { getInFlightCount, setShutdownMode } from '../middleware/inFlightTracker.js';

let server = null;
let redisClients = [];
let isShuttingDown = false;

// Register the HTTP server for shutdown
export function registerServer(httpServer) {
  server = httpServer;
}

// Register Redis clients for cleanup
export function registerRedisClient(redisClient) {
  redisClients.push(redisClient);
}

// Graceful shutdown handler
export async function gracefulShutdown(signal) {
  if (isShuttingDown) {
    logger.warn('Shutdown already in progress, ignoring signal', { signal });
    return;
  }
  
  isShuttingDown = true;
  logger.info('Graceful shutdown initiated', { signal, inFlightRequests: getInFlightCount() });
  
  // Get shutdown timeout from config
  let shutdownTimeout;
  if (isConfigReady()) {
    const config = getConfig();
    shutdownTimeout = config.GRACEFUL_SHUTDOWN_TIMEOUT || 15000;
  } else {
    shutdownTimeout = parseInt(process.env.GRACEFUL_SHUTDOWN_TIMEOUT || '15000', 10);
  }
  
  // Set shutdown mode to reject new requests
  setShutdownMode(true);
  
  // Stop accepting new connections
  if (server) {
    server.close((err) => {
      if (err) {
        logger.error('Error closing HTTP server', { error: err.message });
      } else {
        logger.info('HTTP server closed');
      }
    });
  }
  
  // Wait for in-flight requests to complete or timeout
  const startTime = Date.now();
  const checkInterval = 100; // Check every 100ms
  
  const waitForInflight = () => {
    return new Promise((resolve) => {
      const check = () => {
        const inFlightCount = getInFlightCount();
        const elapsed = Date.now() - startTime;
        
        if (inFlightCount === 0) {
          logger.info('All in-flight requests completed', { elapsed });
          resolve();
        } else if (elapsed >= shutdownTimeout) {
          logger.warn('Shutdown timeout reached, forcing exit', { 
            inFlightCount, 
            elapsed, 
            timeout: shutdownTimeout 
          });
          resolve();
        } else {
          setTimeout(check, checkInterval);
        }
      };
      check();
    });
  };
  
  await waitForInflight();
  
  // Close Redis connections
  if (redisClients.length > 0) {
    logger.info('Closing Redis connections', { count: redisClients.length });
    await Promise.allSettled(
      redisClients.map(async (client, index) => {
        try {
          await client.quit();
          logger.debug('Redis client closed', { index });
        } catch (error) {
          logger.error('Error closing Redis client', { index, error: error.message });
        }
      })
    );
  }
  
  // Flush logs before exit
  if (logger.flush) {
    try {
      await logger.flush();
    } catch (error) {
      console.error('Error flushing logs:', error.message);
    }
  }
  
  logger.info('Graceful shutdown completed', { 
    finalInFlightCount: getInFlightCount(),
    totalShutdownTime: Date.now() - startTime
  });
  
  // Exit process
  process.exit(0);
}

// Setup signal handlers
export function setupGracefulShutdown() {
  // Handle SIGTERM (typical for container orchestrators)
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  
  // Handle SIGINT (Ctrl+C)
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  
  logger.info('Graceful shutdown handlers registered');
}