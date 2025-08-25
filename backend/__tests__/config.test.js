// backend/__tests__/config.test.js
describe('Configuration Validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should fail with missing MONGO_URI', async () => {
    delete process.env.MONGO_URI;
    
    // Mock process.exit to prevent actual exit
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
    const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    const { validateConfig } = await import('../config/index.js');
    validateConfig();
    
    expect(mockExit).toHaveBeenCalledWith(1);
    expect(mockConsoleError).toHaveBeenCalledWith('❌ Configuration validation failed:');
    
    mockExit.mockRestore();
    mockConsoleError.mockRestore();
  });

  it('should fail with invalid JWT_SECRET', async () => {
    process.env.MONGO_URI = 'mongodb://localhost:27017/test';
    process.env.JWT_SECRET = 'too-short'; // Less than 32 chars
    
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
    const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    const { validateConfig } = await import('../config/index.js');
    validateConfig();
    
    expect(mockExit).toHaveBeenCalledWith(1);
    expect(mockConsoleError).toHaveBeenCalledWith('❌ Configuration validation failed:');
    
    mockExit.mockRestore();
    mockConsoleError.mockRestore();
  });

  it('should pass with valid configuration', async () => {
    process.env.MONGO_URI = 'mongodb://localhost:27017/test';
    process.env.JWT_SECRET = 'this-is-a-secure-jwt-secret-key-with-32-plus-characters';
    process.env.STRIPE_SECRET_KEY = 'sk_test_example';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_example';
    process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
    process.env.CLOUDINARY_API_KEY = 'test-key';
    process.env.CLOUDINARY_API_SECRET = 'test-secret';
    
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
    
    const { validateConfig } = await import('../config/index.js');
    const config = validateConfig();
    
    expect(mockExit).not.toHaveBeenCalled();
    expect(config.MONGO_URI).toBe('mongodb://localhost:27017/test');
    expect(config.NODE_ENV).toBe('development'); // default
    expect(config.LOG_LEVEL).toBe('info'); // default
    
    mockExit.mockRestore();
  });
});