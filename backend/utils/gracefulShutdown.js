// backend/utils/gracefulShutdown.js
// Graceful shutdown handling for the Express server
import logger from './logger.js';

/**
 * Setup graceful shutdown for the HTTP server
 * @param {http.Server} server - HTTP server instance
 * @param {Object} options - Configuration options
 */
export function setupGracefulShutdown(server, options = {}) {
  const {
    timeout = parseInt(process.env.SHUTDOWN_TIMEOUT_MS) || 10000, // 10 seconds default
    signals = ['SIGTERM', 'SIGINT']
  } = options;

  let shutdownInProgress = false;

  const gracefulShutdown = (signal) => {
    if (shutdownInProgress) {
      logger.warn(`Shutdown already in progress, ignoring ${signal}`);
      return;
    }

    shutdownInProgress = true;
    logger.info(`Received ${signal}, starting graceful shutdown...`, {
      signal,
      timeout,
      pid: process.pid
    });

    const startTime = Date.now();

    // Start the shutdown timer
    const shutdownTimer = setTimeout(() => {
      logger.error('Graceful shutdown timeout exceeded, forcing exit', {
        timeout,
        elapsedMs: Date.now() - startTime
      });
      process.exit(1);
    }, timeout);

    // Close the HTTP server
    server.close((err) => {
      clearTimeout(shutdownTimer);
      const elapsedMs = Date.now() - startTime;

      if (err) {
        logger.error('Error during server shutdown', { 
          error: err.message,
          elapsedMs
        });
        process.exit(1);
      }

      logger.info('Graceful shutdown completed successfully', {
        signal,
        elapsedMs,
        pid: process.pid
      });
      
      process.exit(0);
    });

    // Stop accepting new connections immediately
    server.on('close', () => {
      logger.info('HTTP server stopped accepting new connections');
    });
  };

  // Register signal handlers
  signals.forEach(signal => {
    process.on(signal, () => gracefulShutdown(signal));
  });

  // Handle uncaught exceptions and unhandled rejections
  process.on('uncaughtException', (err) => {
    logger.fatal('Uncaught exception, shutting down', { error: err.message, stack: err.stack });
    gracefulShutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.fatal('Unhandled promise rejection, shutting down', { 
      reason: reason?.message || reason,
      promise: promise.toString()
    });
    gracefulShutdown('unhandledRejection');
  });

  logger.info('Graceful shutdown handlers registered', { 
    signals,
    timeout,
    pid: process.pid
  });
}

export default setupGracefulShutdown;