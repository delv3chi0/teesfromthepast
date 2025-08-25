// backend/index.js
// Entry point: starts the server, connects DB, and supports both default & named app export forms.

import dotenv from "dotenv";
dotenv.config();

import connectDB from "./config/db.js";
import logger from "./utils/logger.js";
import { setupGracefulShutdown } from "./utils/gracefulShutdown.js";

// Import default (preferred) but gracefully fall back if only named export exists.
let appModule;
try {
  appModule = await import("./app.js");
} catch (e) {
  logger.fatal("Failed importing ./app.js", { error: e.message });
  process.exit(1);
}
const app = appModule.default || appModule.app;
if (!app) {
  logger.fatal("Could not resolve app export (neither default nor named 'app').");
  process.exit(1);
}

await connectDB();

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  logger.info(`Server listening on port ${PORT}`, { 
    port: PORT,
    env: process.env.NODE_ENV || "development",
    pid: process.pid
  });
});

// Setup graceful shutdown
setupGracefulShutdown(server);
