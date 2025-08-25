// backend/index.js
import 'dotenv/config';
import { validateConfig } from './config/index.js';
import { initializeErrorMonitoring } from './utils/errorMonitoring.js';
import { logger } from './utils/logger.js';
import mongoose from 'mongoose';
import app from './app.js';

// Initialize configuration first
const config = validateConfig();

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
    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Server running on port ${PORT} in ${config.NODE_ENV} mode`);
      logger.info(`[Backend] Server successfully bound and listening on http://0.0.0.0:${PORT}`);
    });
  })
  .catch(err => {
    logger.error('MongoDB connection error:', err);
    process.exit(1);
  });
