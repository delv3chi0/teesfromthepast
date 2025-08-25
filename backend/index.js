// backend/index.js
// Entry point: starts the server, connects DB, and supports both default & named app export forms.

import dotenv from "dotenv";
dotenv.config();

// Validate configuration first (fail-fast)
import { validateConfig, getConfig } from "./config/index.js";
const config = validateConfig();

// Initialize error monitoring early
import { initializeErrorMonitoring } from "./utils/errorMonitoring.js";
initializeErrorMonitoring();

// Initialize structured logging
import { logger } from "./utils/logger.js";

import connectDB from "./config/db.js";

logger.info('🚀 Starting Tees From The Past backend', { 
  nodeEnv: config.NODE_ENV,
  port: config.PORT,
  logLevel: config.LOG_LEVEL 
});

// Import default (preferred) but gracefully fall back if only named export exists.
let appModule;
try {
  appModule = await import("./app.js");
} catch (e) {
  logger.error("Failed importing ./app.js", { error: e.message, stack: e.stack });
  process.exit(1);
}
const app = appModule.default || appModule.app;
if (!app) {
  logger.error("Could not resolve app export (neither default nor named 'app')");
  process.exit(1);
}

await connectDB();

const PORT = config.PORT;
app.listen(PORT, () => {
  logger.info(`✅ Server listening on port ${PORT}`, { port: PORT, env: config.NODE_ENV });
});
