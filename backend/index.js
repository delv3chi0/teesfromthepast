// backend/config/index.js
// Central configuration validation with fail-fast startup
import { z } from 'zod';

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().regex(/^\d+$/).transform(Number).default('5000'),

  MONGO_URI: z.string().url(),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),

  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),

  REDIS_URL: z.string().url().optional(),

  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),

  RATE_LIMIT_WINDOW: z.string().regex(/^\d+$/).transform(Number).default('60000'),

  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  FEATURE_FLAG_FILE: z.string().optional(),

  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
  SENTRY_DSN: z.string().url().optional(),

  JSON_LIMIT_MB: z.string().regex(/^\d+$/).transform(Number).default('25'),
  PRINTFILE_MAX_MB: z.string().regex(/^\d+$/).transform(Number).default('22'),
  CLOUDINARY_IMAGE_MAX_MB: z.string().regex(/^\d+$/).transform(Number).default('10'),

  DB_SLOW_MS: z.string().regex(/^\d+$/).transform(Number).default('1000'),

  RESEND_API_KEY: z.string().optional(),
});

let _config;
let _validated = false;

export function validateConfig() {
  if (_validated && _config) return _config;
  try {
    _config = configSchema.parse(process.env);
    _validated = true;
    return _config;
  } catch (error) {
    console.error('❌ Configuration validation failed:');
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(e => `${e.path.join('.') || '(root)'}: ${e.message}`);
      errors.forEach(line => console.error('  ' + line));
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

export function isConfigReady() {
  return _validated && !!_config;
}

export function getConfig() {
  if (!_config) {
    throw new Error('Configuration not initialized. Call validateConfig() first.');
  }
  return _config;
}

export default { validateConfig, getConfig, isConfigReady };
