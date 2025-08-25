// backend/utils/logger.js
import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';
const usePretty = process.env.LOG_PRETTY === '1' || isDev;

// Create logger with appropriate configuration
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  // Use pretty printing in development or when LOG_PRETTY=1
  ...(usePretty && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard'
      }
    }
  }),
  // Structured logging format for production
  ...(!usePretty && {
    formatters: {
      level: (label) => {
        return { level: label };
      }
    },
    timestamp: pino.stdTimeFunctions.isoTime
  })
});

export default logger;