// backend/index.js
// Entry point: starts the server, connects DB, and supports graceful shutdown

import dotenv from "dotenv";
dotenv.config();

import connectDB from "./config/db.js";
import logger from "./utils/logger.js";

// Graceful shutdown configuration
const SHUTDOWN_TIMEOUT_MS = parseInt(process.env.SHUTDOWN_TIMEOUT_MS) || 10000;

// Track active requests for graceful shutdown
let activeRequests = 0;

// Import default (preferred) but gracefully fall back if only named export exists.
let appModule;
try {
  appModule = await import("./app.js");
} catch (e) {
  logger.error({ error: e }, "[Startup] Failed importing ./app.js");
  process.exit(1);
}
const app = appModule.default || appModule.app;
if (!app) {
  logger.error("[Startup] Could not resolve app export (neither default nor named 'app').");
  process.exit(1);
}

// Middleware to track active requests
app.use((req, res, next) => {
  activeRequests++;
  res.on('finish', () => {
    activeRequests--;
  });
  next();
});

await connectDB();

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  logger.info({ port: PORT }, `[Server] Listening on port ${PORT}`);
});

// Graceful shutdown handling
function gracefulShutdown(signal) {
  logger.info({ signal, activeRequests }, `[Shutdown] Received ${signal}, beginning graceful shutdown...`);
  
  // Stop accepting new connections
  server.close(() => {
    logger.info('[Shutdown] HTTP server closed');
    
    // Wait for active requests to complete or timeout
    const shutdownTimer = setTimeout(() => {
      logger.warn({ activeRequests }, '[Shutdown] Timeout reached, forcing exit');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    
    // Check if all requests are done
    const checkActiveRequests = () => {
      if (activeRequests === 0) {
        clearTimeout(shutdownTimer);
        logger.info('[Shutdown] All requests completed, exiting gracefully');
        process.exit(0);
      } else {
        logger.info({ activeRequests }, '[Shutdown] Waiting for requests to complete...');
        setTimeout(checkActiveRequests, 100);
      }
    };
    
    checkActiveRequests();
  });
}

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions and rejections
process.on('uncaughtException', (error) => {
  logger.fatal({ error }, 'Uncaught exception');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.fatal({ reason, promise }, 'Unhandled promise rejection');
  process.exit(1);
});
