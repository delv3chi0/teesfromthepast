// backend/index.js
import mongoose from "mongoose";
import "dotenv/config";
import app from "./app.js";

process.on("uncaughtException", (err) => {
  console.error("[Backend Log] Uncaught Exception:", err.stack || err);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("[Backend Log] Unhandled Rejection at:", promise, "reason:", reason?.stack || reason);
  process.exit(1);
});

const PORT = process.env.PORT || 10000; // Render provides PORT; fallback is fine locally
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("[Startup] Missing required env: MONGO_URI");
  process.exit(1);
}

console.log("[Backend Log] Server starting…");
console.log("[Startup] Using MONGO_URI for Mongo connection");

let server;

mongoose
  .connect(MONGO_URI, { autoIndex: true })
  .then(() => {
    console.log("MongoDB connected successfully");
    server = app.listen(PORT, "0.0.0.0", () => {
      console.log(
        `Server running on port ${PORT} in ${process.env.NODE_ENV || "development"} mode`
      );
      console.log(
        `[Backend Log] Server successfully bound and listening on http://0.0.0.0:${PORT}`
      );
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err?.stack || err);
    process.exit(1);
  });

// Graceful shutdown
async function shutdown(signal) {
  try {
    console.log(`[Shutdown] Received ${signal}. Closing server…`);
    if (server) {
      await new Promise((res) => server.close(res));
      console.log("[Shutdown] HTTP server closed");
    }
    await mongoose.connection.close();
    console.log("[Shutdown] MongoDB connection closed");
  } catch (e) {
    console.error("[Shutdown] Error during shutdown:", e?.stack || e);
  } finally {
    process.exit(0);
  }
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
