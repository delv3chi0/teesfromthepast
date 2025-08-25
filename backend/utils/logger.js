// backend/utils/logger.js
import config from "../config/index.js";

const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

const currentLevel = logLevels[config.logLevel] ?? logLevels.info;

function log(level, message, ...args) {
  if (logLevels[level] <= currentLevel) {
    const timestamp = new Date().toISOString();
    console[level === "warn" ? "warn" : level === "error" ? "error" : "log"](
      `[${timestamp}] [${level.toUpperCase()}]`,
      message,
      ...args
    );
  }
}

export const logger = {
  error: (message, ...args) => log("error", message, ...args),
  warn: (message, ...args) => log("warn", message, ...args),
  info: (message, ...args) => log("info", message, ...args),
  debug: (message, ...args) => log("debug", message, ...args),
};

export default logger;