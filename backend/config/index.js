// backend/config/index.js
// Central configuration validation with fail-fast startup
import { z } from 'zod';

// Define schema for all required environment variables
const configSchema = z.object({
  // Core application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().regex(/^\d+$/).transform(Number).default('5000'),
  
  // Database
  MONGO_URI: z.string().url(),
  
  // Authentication & Security
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  
  // Stripe
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),
  
  // Redis
  REDIS_URL: z.string().url().optional(),
  
  // Cloudinary
  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),
  
  // Rate limiting
  RATE_LIMIT_WINDOW: z.string().regex(/^\d+$/).transform(Number).default('60000'),
  RATE_LIMIT_MAX: z.string().regex(/^\d+$/).transform(Number).default('120'),
  RATE_LIMIT_EXEMPT_PATHS: z.string().default('/health,/readiness'),
  RATE_LIMIT_REDIS_PREFIX: z.string().default('rl:'),
  
  // Version info (optional)
  GIT_COMMIT: z.string().optional(),
  BUILD_TIME: z.string().optional(),
  
  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  
  // Feature flags
  FEATURE_FLAG_FILE: z.string().optional(),
  
  // OpenTelemetry
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
  
  // Error monitoring
  SENTRY_DSN: z.string().url().optional(),
  
  // Application limits
  JSON_LIMIT_MB: z.string().regex(/^\d+$/).transform(Number).default('25'),
  PRINTFILE_MAX_MB: z.string().regex(/^\d+$/).transform(Number).default('22'),
  CLOUDINARY_IMAGE_MAX_MB: z.string().regex(/^\d+$/).transform(Number).default('10'),
  
  // Database performance
  DB_SLOW_MS: z.string().regex(/^\d+$/).transform(Number).default('1000'),
  
  // Email (optional)
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
      const errors = error.errors.map(err => {
        const path = err.path.join('.');
        return `  ${path}: ${err.message}`;
      });
      
      console.error('\nMissing or invalid environment variables:');
      console.error(errors.join('\n'));
      console.error('\nPlease check your .env file or environment variables.');
    } else {
      console.error('  ', error.message);
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