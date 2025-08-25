// backend/utils/logger.js
// Lightweight structured logger utility (no external dependencies)
// Exposes info/warn/error/debug/child returning JSON log lines with common fields

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

class Logger {
  constructor(context = {}) {
    this.context = context;
    this.level = LOG_LEVELS[process.env.LOG_LEVEL?.toLowerCase()] ?? LOG_LEVELS.info;
  }

  _log(level, event, data = {}) {
    if (LOG_LEVELS[level] < this.level) return;

    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      event,
      ...this.context,
      ...data
    };

    // Add process info for non-request logs
    if (!this.context.rid) {
      logEntry.pid = process.pid;
      logEntry.service = 'backend';
    }

    const output = level === 'error' ? process.stderr : process.stdout;
    output.write(JSON.stringify(logEntry) + '\n');
  }

  debug(event, data) {
    this._log('debug', event, data);
  }

  info(event, data) {
    this._log('info', event, data);
  }

  warn(event, data) {
    this._log('warn', event, data);
  }

  error(event, data) {
    this._log('error', event, data);
  }

  child(additionalContext) {
    return new Logger({ ...this.context, ...additionalContext });
  }
}

// Default logger instance
const logger = new Logger();

export default logger;
export { Logger };