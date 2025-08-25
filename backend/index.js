// backend/index.js
// Entry point: starts the server, connects DB, and supports both default & named app export forms.

import dotenv from "dotenv";
dotenv.config();

// Initialize telemetry first
import { initTelemetry, shutdownTelemetry } from "./config/telemetry.js";
import { shutdownRedis } from "./config/redis.js";
import { shutdownQueues } from "./queues/index.js";
initTelemetry();

import connectDB from "./config/db.js";

// Import default (preferred) but gracefully fall back if only named export exists.
let appModule;
try {
  appModule = await import("./app.js");
} catch (e) {
  console.error("[Startup] Failed importing ./app.js", e);
  process.exit(1);
}
const app = appModule.default || appModule.app;
if (!app) {
  console.error(
    "[Startup] Could not resolve app export (neither default nor named 'app')."
  );
  process.exit(1);
}

await connectDB();

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`[Server] Listening on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Server] Shutting down gracefully...');
  server.close(async () => {
    await Promise.all([
      shutdownTelemetry(),
      shutdownQueues(),
      shutdownRedis()
    ]);
    process.exit(0);
  });
});
