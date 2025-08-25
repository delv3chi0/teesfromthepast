// backend/index.js
import 'dotenv/config';
import { validateConfig } from './config/index.js';
import { initializeErrorMonitoring } from './utils/errorMonitoring.js';
import { initializeTracing, shutdownTracing } from './observability/otel.js';
import { logger } from './utils/logger.js';
import mongoose from 'mongoose';
import app from './app.js';

// Initialize configuration first
const config = validateConfig();

// Initialize OpenTelemetry tracing early
initializeTracing();

// Initialize error monitoring early
initializeErrorMonitoring();

process.on('uncaughtException', (err) => {
  logger.error('[Backend] Uncaught Exception:', err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('[Backend] Unhandled Rejection at:', promise, 'reason:', reason.stack || reason);
  process.exit(1);
});

const PORT = config.PORT;

logger.info('[Backend] Server starting...');

mongoose.connect(config.MONGO_URI)
  .then(() => {
    logger.info('MongoDB connected successfully');
    // Start listening for requests only after the DB connection is successful
    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Server running on port ${PORT} in ${config.NODE_ENV} mode`);
      logger.info(`[Backend] Server successfully bound and listening on http://0.0.0.0:${PORT}`);
    });

    // Graceful shutdown handlers
    const gracefulShutdown = async (signal) => {
      logger.info(`[Backend] Received ${signal}, starting graceful shutdown...`);
      
      // Stop accepting new connections
      server.close(async () => {
        logger.info('[Backend] HTTP server closed');
        
        try {
          // Close database connection
          await mongoose.connection.close();
          logger.info('[Backend] MongoDB connection closed');
          
          // Shutdown OpenTelemetry (flush remaining spans)
          await shutdownTracing();
          
          logger.info('[Backend] Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          logger.error('[Backend] Error during graceful shutdown:', error);
          process.exit(1);
        }
      });

      // Force exit if graceful shutdown takes too long
      setTimeout(() => {
        logger.error('[Backend] Graceful shutdown timeout, forcing exit');
        process.exit(1);
      }, 10000); // 10 second timeout
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  })
  .catch(err => {
    logger.error('MongoDB connection error:', err);
    process.exit(1);
  });
