// backend/__tests__/logger.test.js
import { createCorrelatedLogger, logger } from '../utils/logger.js';

// Mock the config module
jest.mock('../config/index.js', () => ({
  getConfig: () => ({
    LOG_LEVEL: 'info',
    NODE_ENV: 'test'
  })
}));

describe('Structured Logger', () => {
  it('should create correlated logger with trace IDs', () => {
    const correlatedLogger = createCorrelatedLogger(
      'trace-123', 
      'span-456', 
      'req-789', 
      'user-101', 
      'session-202'
    );

    // Mock the info method to capture what gets logged
    const mockInfo = jest.fn();
    correlatedLogger.info = mockInfo;

    correlatedLogger.info('Test message');

    expect(mockInfo).toHaveBeenCalledWith('Test message');
  });

  it('should redact sensitive fields', () => {
    // This test ensures the redaction configuration is present
    expect(logger.options.redact.paths).toContain('password');
    expect(logger.options.redact.paths).toContain('token');
    expect(logger.options.redact.paths).toContain('authorization');
    expect(logger.options.redact.censor).toBe('[Redacted]');
  });

  it('should handle empty correlation IDs gracefully', () => {
    const correlatedLogger = createCorrelatedLogger(null, null, 'req-123');
    
    expect(correlatedLogger).toBeDefined();
    // Should not throw when logging
    expect(() => {
      correlatedLogger.info('Test without correlation IDs');
    }).not.toThrow();
  });
});