// backend/utils/logger.js
// Structured logging with Pino
import pino from 'pino';

const isDev = process.env.NODE_ENV === 'development';
const isPretty = process.env.LOG_PRETTY === '1' || isDev;

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  // Use pretty printing in development or when LOG_PRETTY=1
  transport: isPretty ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  } : undefined,
  // Add default context fields
  base: {
    env: process.env.NODE_ENV || 'development',
    service: 'teesfromthepast-backend'
  }
});

export default logger;