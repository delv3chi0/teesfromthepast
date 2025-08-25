// backend/__tests__/logger.test.js
import logger from '../utils/logger.js';

describe('Structured Logger', () => {
  test('logger is defined and has required methods', () => {
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  test('logger accepts structured data', () => {
    // This should not throw
    expect(() => {
      logger.info({
        reqId: 'test-123',
        method: 'GET',
        path: '/test',
        status: 200,
        durationMs: 50.5,
        userId: 'user-456',
        ip: '127.0.0.1'
      }, 'Test request completed');
    }).not.toThrow();
  });
});