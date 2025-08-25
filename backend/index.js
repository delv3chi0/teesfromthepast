// backend/index.js
import mongoose from "mongoose";
import config from "./config/index.js";
import app from "./app.js";

process.on("uncaughtException", (err) => {
  console.error("[Backend Log] Uncaught Exception:", err?.stack || err);
  process.exit(1);
});
process.on("unhandledRejection", (reason, p) => {
  console.error("[Backend Log] Unhandled Rejection at:", p, "reason:", reason?.stack || reason);
  process.exit(1);
});

console.log("[Backend Log] Server starting…");

// Start HTTP server immediately so Render health check can succeed even if DB is slow.
const server = app.listen(config.port, "0.0.0.0", () => {
  console.log(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
  console.log(`[Backend Log] Server successfully bound and listening on http://0.0.0.0:${config.port}`);
});

// Connect Mongo (non-blocking for health)
if (!config.mongoUri) {
  console.error("[Startup] Missing MONGO_URI");
} else {
  console.log("[Startup] Using MONGO_URI for Mongo connection");
  mongoose
    .connect(config.mongoUri, {
      // reasonable defaults; no deprecations for modern mongoose
      serverSelectionTimeoutMS: 12000,
      maxPoolSize: 10,
    })
    .then(() => {
      console.log("MongoDB connected successfully");
    })
    .catch((err) => {
      console.error("MongoDB connection error:", err?.message || err);
      // Do NOT exit here — keep serving health checks so Render doesn't kill us.
    });
}

// Graceful shutdown (Render sends SIGTERM on redeploy)
const shutdown = async () => {
  try {
    console.log("[Shutdown] Received SIGTERM. Closing server…");
    server.close(() => {
      console.log("[Shutdown] HTTP server closed");
    });
    await mongoose.connection.close();
    console.log("[Shutdown] MongoDB connection closed");
  } catch (e) {
    console.error("[Shutdown] Error during shutdown:", e?.stack || e);
  } finally {
    process.exit(0);
  }
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
