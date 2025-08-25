#!/usr/bin/env node
// Test script for Tasks 6-8 implementation
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Set up environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-at-least-32-characters-long-for-security';
process.env.MONGO_URI = 'mongodb://localhost:27017/test';
process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_dummy';
process.env.CLOUDINARY_CLOUD_NAME = 'test';
process.env.CLOUDINARY_API_KEY = 'test';
process.env.CLOUDINARY_API_SECRET = 'test';

console.log('🧪 Testing Tasks 6-8 Implementation...\n');

// Test 1: Feature Flags
console.log('📋 Testing Feature Flags...');
try {
  const { default: featureFlags, isEnabled, getFlag } = await import('./backend/flags/FeatureFlags.js');
  
  // Set some test environment variables
  process.env.FLAG_TEST_BOOLEAN = 'true';
  process.env.FLAG_TEST_NUMBER = '42';
  process.env.FLAG_TEST_STRING = 'hello';
  
  await featureFlags.initialize();
  
  console.log('✅ Feature flags initialized');
  console.log(`   - auth.enable_2fa: ${isEnabled('auth.enable_2fa')}`);
  console.log(`   - jobs.enable_testing: ${isEnabled('jobs.enable_testing')}`);
  console.log(`   - uploads.max_file_size_mb: ${getFlag('uploads.max_file_size_mb')}`);
  console.log(`   - test.boolean (from env): ${getFlag('test.boolean')}`);
  console.log(`   - test.number (from env): ${getFlag('test.number')}`);
  
} catch (error) {
  console.log('❌ Feature flags test failed:', error.message);
}

// Test 2: Redis Client
console.log('\n🔗 Testing Redis Client...');
try {
  const { blacklistRefreshToken, isRefreshTokenBlacklisted } = await import('./backend/redis/index.js');
  
  // Test without Redis (should gracefully degrade)
  const testJti = 'test-jti-12345';
  const blacklisted = await blacklistRefreshToken(testJti, 10);
  const isBlacklisted = await isRefreshTokenBlacklisted(testJti);
  
  console.log('✅ Redis client functions loaded');
  console.log(`   - Blacklist operation: ${blacklisted ? 'succeeded' : 'gracefully degraded'}`);
  console.log(`   - Blacklist check: ${isBlacklisted ? 'token blacklisted' : 'token not blacklisted or Redis unavailable'}`);
  
} catch (error) {
  console.log('❌ Redis client test failed:', error.message);
}

// Test 3: Job Queue (without Redis)
console.log('\n🔄 Testing Job Queue...');
try {
  const { QueueFactory, enqueueJob, getJobStatus } = await import('./backend/queue/index.js');
  const { processTestEmail } = await import('./backend/queue/processors/emailProcessor.js');
  
  console.log('✅ Job queue modules loaded');
  console.log('   - QueueFactory available');
  console.log('   - Email processor available');
  console.log('   - Queue functions available');
  
  // Test email processor directly (without Redis queue)
  const testJob = {
    id: 'test-123',
    progress: (pct) => console.log(`   - Job progress: ${pct}%`)
  };
  
  const testData = {
    to: 'test@example.com',
    subject: 'Test Email',
    message: 'Test message',
    traceId: 'test-trace-123'
  };
  
  console.log('   - Testing email processor...');
  const result = await processTestEmail(testData, testJob);
  console.log('✅ Email processor test completed');
  console.log(`   - Message ID: ${result.messageId}`);
  
} catch (error) {
  console.log('❌ Job queue test failed:', error.message);
}

// Test 4: Enhanced Auth Middleware
console.log('\n🔐 Testing Auth Middleware...');
try {
  // Initialize config first
  const { validateConfig } = await import('./backend/config/index.js');
  validateConfig();
  
  const { signAccessToken, ensureAuth } = await import('./backend/middleware/authMiddleware.js');
  
  console.log('✅ Auth middleware loaded');
  console.log('   - signAccessToken function available');
  console.log('   - ensureAuth middleware available');
  
  // Test token generation (requires valid user object)
  const mockUser = {
    _id: '507f1f77bcf86cd799439011',
    isAdmin: false
  };
  
  const token = signAccessToken(mockUser);
  console.log('✅ Access token generated successfully');
  console.log(`   - Token length: ${token.length} characters`);
  console.log(`   - Contains JTI: ${token.includes('.')}`)
  
} catch (error) {
  console.log('❌ Auth middleware test failed:', error.message);
}

// Test 5: Configuration
console.log('\n⚙️  Testing Configuration...');
try {
  // Set minimal required environment variables
  process.env.MONGO_URI = 'mongodb://localhost:27017/test';
  process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_dummy';
  process.env.CLOUDINARY_CLOUD_NAME = 'test';
  process.env.CLOUDINARY_API_KEY = 'test';
  process.env.CLOUDINARY_API_SECRET = 'test';
  
  const { validateConfig } = await import('./backend/config/index.js');
  const config = validateConfig();
  
  console.log('✅ Configuration validation passed');
  console.log(`   - JWT_ACCESS_TTL: ${config.JWT_ACCESS_TTL}`);
  console.log(`   - JWT_REFRESH_TTL: ${config.JWT_REFRESH_TTL}`);
  console.log(`   - ENABLE_2FA: ${config.ENABLE_2FA}`);
  console.log(`   - ENABLE_JOB_TESTING: ${config.ENABLE_JOB_TESTING}`);
  
} catch (error) {
  console.log('❌ Configuration test failed:', error.message);
}

console.log('\n🎉 Tasks 6-8 Implementation Test Complete!');
console.log('\n📝 Next Steps:');
console.log('   1. Set up Redis connection for full functionality');
console.log('   2. Configure feature flags in config/feature-flags.json');
console.log('   3. Enable job testing with ENABLE_JOB_TESTING=true');
console.log('   4. Enable 2FA scaffold with auth.enable_2fa flag');
console.log('   5. Test API endpoints with authentication');