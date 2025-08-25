/**
 * Server bootstrap file.
 * Responsibilities:
 *  - Load env
 *  - Initialize DB connection (non-blocking for health)
 *  - Start HTTP server
 *  - Setup process-level error & shutdown handlers
 */
import "dotenv/config";
import mongoose from "mongoose";
import app from "./app.js";
import connectDB from "./config/db.js";

const PORT = process.env.PORT || 5000;

process.on("uncaughtException", (err) => {
  console.error("[Fatal] Uncaught Exception:", err?.stack || err);
  process.exit(1);
});

process.on("unhandledRejection", (reason, p) => {
  console.error("[Fatal] Unhandled Rejection at:", p, "reason:", reason?.stack || reason);
  process.exit(1);
});

console.log("[Startup] Beginning initialization…");

/**
 * Start HTTP server immediately (fast health responses while DB connects).
 */
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `[Startup] Server listening on http://0.0.0.0:${PORT} (${process.env.NODE_ENV || "development"})`
  );
});

/**
 * Connect to Mongo (separate async; do not block server).
 */
connectDB()
  .then(() => {
    console.log("[Startup] MongoDB connected successfully");
  })
  .catch((err) => {
    console.error("[Startup] MongoDB connection error:", err?.message || err);
    // Intentionally not exiting; app continues serving (health / static / etc.)
  });

/**
 * Graceful shutdown
 */
async function shutdown(signal) {
  console.log(`[Shutdown] Received ${signal}. Closing server…`);
  try {
    server.close(() => {
      console.log("[Shutdown] HTTP server closed");
    });
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log("[Shutdown] MongoDB connection closed");
    }
  } catch (e) {
    console.error("[Shutdown] Error during shutdown:", e?.stack || e);
  } finally {
    process.exit(0);
  }
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
