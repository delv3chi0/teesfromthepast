// backend/__tests__/validateEnv.test.js
import { validateEnv } from '../utils/validateEnv.js';

describe('Environment Validation', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('should pass when all required variables are present', () => {
    process.env = {
      ...originalEnv,
      MONGO_URI: 'mongodb://localhost:27017/test',
      JWT_SECRET: 'test-jwt-secret-minimum-24-chars-long',
      STRIPE_SECRET_KEY: 'sk_test_example',
      STRIPE_WEBHOOK_SECRET: 'whsec_test_example',
      HCAPTCHA_SECRET: '0x0000000000000000000000000000000000000000',
      RESEND_API_KEY: 're_test_example',
    };

    expect(() => validateEnv()).not.toThrow();
  });

  it('should throw when required variables are missing', () => {
    process.env = {
      ...originalEnv,
      MONGO_URI: 'mongodb://localhost:27017/test',
      // Missing other required vars
    };

    expect(() => validateEnv()).toThrow('Startup aborted due to missing env vars.');
  });

  it('should warn about short JWT secrets', () => {
    process.env = {
      ...originalEnv,
      MONGO_URI: 'mongodb://localhost:27017/test',
      JWT_SECRET: 'short',
      STRIPE_SECRET_KEY: 'sk_test_example',
      STRIPE_WEBHOOK_SECRET: 'whsec_test_example',
      HCAPTCHA_SECRET: '0x0000000000000000000000000000000000000000',
      RESEND_API_KEY: 're_test_example',
    };

    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    validateEnv();
    expect(consoleSpy).toHaveBeenCalledWith('[env] JWT_SECRET is short (<24 chars). Recommend >=32 random characters.');
    consoleSpy.mockRestore();
  });

  it('should handle empty string variables as missing', () => {
    process.env = {
      ...originalEnv,
      MONGO_URI: '',
      JWT_SECRET: 'test-jwt-secret-minimum-24-chars-long',
      STRIPE_SECRET_KEY: 'sk_test_example',
      STRIPE_WEBHOOK_SECRET: 'whsec_test_example',
      HCAPTCHA_SECRET: '0x0000000000000000000000000000000000000000',
      RESEND_API_KEY: 're_test_example',
    };

    expect(() => validateEnv()).toThrow('Startup aborted due to missing env vars.');
  });
});