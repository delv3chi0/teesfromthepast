#!/usr/bin/env node
// backend/test-startup.js
// Quick test to see if config validation, logging, and error monitoring work

import dotenv from "dotenv";
dotenv.config();

// Set up minimal test environment
process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'this-is-a-secure-jwt-secret-key-with-32-plus-characters';
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_example';
process.env.STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_example';
process.env.CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'test-cloud';
process.env.CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || 'test-key';
process.env.CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || 'test-secret';

try {
  console.log('Testing configuration validation...');
  const { validateConfig } = await import('./config/index.js');
  const config = validateConfig();
  console.log('✅ Configuration validation passed');
  
  console.log('Testing error monitoring initialization...');
  const { initializeErrorMonitoring, sentry } = await import('./utils/errorMonitoring.js');
  initializeErrorMonitoring();
  
  // Test mock Sentry capture
  const testError = new Error('Test error for monitoring');
  const eventId = sentry.captureException(testError, {
    tags: { test: true },
    user: { id: 'test-user' }
  });
  console.log('✅ Error monitoring initialized with event ID:', eventId);
  
  console.log('Testing structured logging...');
  const { logger, createCorrelatedLogger } = await import('./utils/logger.js');
  
  logger.info('🚀 Startup log with structured format');
  
  const correlatedLogger = createCorrelatedLogger(
    'trace-12345',
    'span-67890', 
    'req-abcdef',
    'user-123',
    'session-456'
  );
  
  correlatedLogger.info('Request processed', {
    method: 'GET',
    url: '/api/test',
    statusCode: 200,
    duration: 150.25
  });
  
  // Test redaction
  correlatedLogger.info('Login attempt', {
    username: 'testuser',
    password: 'secret123', // This should be redacted
    token: 'jwt-token-here' // This should be redacted
  });
  
  console.log('✅ All tests completed successfully');
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
}