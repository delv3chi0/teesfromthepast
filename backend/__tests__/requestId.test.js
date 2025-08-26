// backend/__tests__/requestId.test.js
// Tests for enhanced request ID middleware

import { jest } from '@jest/globals';
import { requestId } from '../middleware/requestId.js';

// Mock config
jest.mock('../config/index.js', () => ({
  isConfigReady: jest.fn(),
  getConfig: jest.fn()
}));

// Mock nanoid
jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'test-id-123')
}));

import { isConfigReady, getConfig } from '../config/index.js';
import { nanoid } from 'nanoid';

describe('Request ID Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.REQUEST_ID_HEADER;
  });

  test('should generate new request ID when not present', () => {
    const req = { headers: {} };
    const res = { setHeader: jest.fn() };
    const next = jest.fn();

    requestId(req, res, next);

    expect(req.id).toBe('test-id-123');
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', 'test-id-123');
    expect(next).toHaveBeenCalled();
  });

  test('should use existing request ID from header', () => {
    const req = { headers: { 'x-request-id': 'existing-id-456' } };
    const res = { setHeader: jest.fn() };
    const next = jest.fn();

    requestId(req, res, next);

    expect(req.id).toBe('existing-id-456');
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', 'existing-id-456');
    expect(nanoid).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  test('should use custom header name from environment', () => {
    process.env.REQUEST_ID_HEADER = 'X-Trace-Id';
    
    const req = { headers: { 'x-trace-id': 'trace-123' } };
    const res = { setHeader: jest.fn() };
    const next = jest.fn();

    requestId(req, res, next);

    expect(req.id).toBe('trace-123');
    expect(res.setHeader).toHaveBeenCalledWith('X-Trace-Id', 'trace-123');
  });

  test('should use custom header name from config', () => {
    isConfigReady.mockReturnValue(true);
    getConfig.mockReturnValue({
      REQUEST_ID_HEADER: 'X-Custom-Id'
    });
    
    const req = { headers: {} };
    const res = { setHeader: jest.fn() };
    const next = jest.fn();

    requestId(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith('X-Custom-Id', 'test-id-123');
  });

  test('should integrate with logger when available', () => {
    const mockChildLogger = { child: jest.fn() };
    const req = { 
      headers: {},
      log: mockChildLogger
    };
    const res = { setHeader: jest.fn() };
    const next = jest.fn();

    mockChildLogger.child.mockReturnValue('child-logger');

    requestId(req, res, next);

    expect(mockChildLogger.child).toHaveBeenCalledWith({ requestId: 'test-id-123' });
    expect(req.log).toBe('child-logger');
  });

  test('should handle missing logger gracefully', () => {
    const req = { headers: {} };
    const res = { setHeader: jest.fn() };
    const next = jest.fn();

    expect(() => requestId(req, res, next)).not.toThrow();
    expect(next).toHaveBeenCalled();
  });
});