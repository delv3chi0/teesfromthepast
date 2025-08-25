// backend/utils/validateEnv.js
// Environment validation utility to enforce presence of critical environment variables

import logger from './logger.js';

const REQUIRED_ENV_VARS = [
  'MONGO_URI',
  'JWT_SECRET', 
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET'
];

const OPTIONAL_ENV_VARS = [
  'PORT',
  'NODE_ENV',
  'CORS_ORIGINS',
  'LOG_LEVEL',
  'RESEND_API_KEY',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'OPENAI_API_KEY'
];

export function validateEnv() {
  let hasErrors = false;
  const missing = [];
  const present = [];
  const optional = [];

  // Check required variables
  for (const envVar of REQUIRED_ENV_VARS) {
    if (!process.env[envVar]) {
      missing.push(envVar);
      hasErrors = true;
    } else {
      present.push(envVar);
    }
  }

  // Check optional variables and warn if missing
  for (const envVar of OPTIONAL_ENV_VARS) {
    if (!process.env[envVar]) {
      optional.push(envVar);
    }
  }

  // Log results
  if (present.length > 0) {
    logger.info('env.validation.required_present', { 
      variables: present,
      count: present.length 
    });
  }

  if (missing.length > 0) {
    logger.error('env.validation.required_missing', { 
      variables: missing,
      count: missing.length 
    });
  }

  if (optional.length > 0) {
    logger.warn('env.validation.optional_missing', { 
      variables: optional,
      count: optional.length 
    });
  }

  if (hasErrors) {
    logger.error('env.validation.failed', { 
      requiredMissing: missing.length,
      totalRequired: REQUIRED_ENV_VARS.length
    });
    return false;
  }

  logger.info('env.validation.passed', { 
    requiredPresent: present.length,
    totalRequired: REQUIRED_ENV_VARS.length,
    optionalMissing: optional.length
  });
  
  return true;
}