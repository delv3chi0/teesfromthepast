// backend/index.js
import mongoose from "mongoose";
import "dotenv/config";
import app from "./app.js";
import { validateEnv } from "./utils/validateEnv.js";
import connectDB from "./config/db.js";
import logger from "./utils/logger.js";

process.on("uncaughtException", (err) => {
  logger.error("process.uncaught_exception", { 
    error: err?.message || String(err),
    stack: err?.stack
  });
  process.exit(1);
});
process.on("unhandledRejection", (reason, p) => {
  logger.error("process.unhandled_rejection", { 
    reason: reason?.message || String(reason),
    stack: reason?.stack,
    promise: String(p)
  });
  process.exit(1);
});

const PORT = process.env.PORT || 5000;

// Main startup function
async function startup() {
  logger.info("startup.begin", { 
    port: PORT,
    nodeEnv: process.env.NODE_ENV || "development"
  });

  // Validate environment variables first
  if (!validateEnv()) {
    logger.error("startup.failed", { reason: "Environment validation failed" });
    process.exit(1);
  }

  // Connect to database before starting server (fail-fast)
  try {
    await connectDB();
    logger.info("startup.db_connected", { status: "success" });
  } catch (error) {
    logger.error("startup.db_failed", { 
      error: error?.message || String(error),
      stack: error?.stack
    });
    process.exit(1);
  }

  // Start HTTP server only after DB is connected
  const server = app.listen(PORT, "0.0.0.0", () => {
    logger.info("startup.listening", { 
      port: PORT,
      host: "0.0.0.0",
      nodeEnv: process.env.NODE_ENV || "development"
    });
  });

  return server;
}

// Start the application
const server = await startup();

// Graceful shutdown (Render sends SIGTERM on redeploy)
const shutdown = async () => {
  try {
    logger.info("shutdown.begin", { reason: "SIGTERM received" });
    server.close(() => {
      logger.info("shutdown.http_closed", { status: "success" });
    });
    await mongoose.connection.close();
    logger.info("shutdown.db_closed", { status: "success" });
  } catch (e) {
    logger.error("shutdown.error", { 
      error: e?.message || String(e),
      stack: e?.stack
    });
  } finally {
    logger.info("shutdown.complete", { exitCode: 0 });
    process.exit(0);
  }
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
