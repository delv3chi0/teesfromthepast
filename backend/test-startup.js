#!/usr/bin/env node
// backend/test-startup.js
// Quick test to see if config validation, logging, error monitoring, and caching work

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
  
  console.log('Testing caching system...');
  const cache = await import('./utils/cache.js');
  
  // Test cache operations (will use memory fallback since no Redis)
  await cache.set('test', 'key1', { data: 'value1' }, 300);
  const cached = await cache.get('test', 'key1');
  console.log('Cache get result:', cached);
  
  // Test withCache
  let callCount = 0;
  const fetchFn = async () => {
    callCount++;
    return { fetchedData: `call-${callCount}`, timestamp: Date.now() };
  };
  
  const result1 = await cache.withCache('test', 'expensive-op', fetchFn, 300);
  const result2 = await cache.withCache('test', 'expensive-op', fetchFn, 300);
  
  console.log('Cache withCache results:', { result1, result2, callCount });
  
  // Get cache metrics
  const metrics = cache.getMetrics();
  console.log('Cache metrics:', metrics);
  console.log('✅ Caching system test completed');
  
  console.log('Testing adaptive rate limiting...');
  const { trackAbuseEvent, getAbuseScore } = await import('./utils/adaptiveRateLimit.js');
  
  await trackAbuseEvent('127.0.0.1', null, 'login_failure', 5);
  const abuseScore = await getAbuseScore('127.0.0.1', null);
  console.log('Abuse score after login failure:', abuseScore);
  console.log('✅ Adaptive rate limiting test completed');
  
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
  
  console.log('✅ All tests completed successfully');
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
}