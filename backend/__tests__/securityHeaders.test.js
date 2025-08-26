// backend/__tests__/securityHeaders.test.js
// Tests for security headers middleware

import { jest } from '@jest/globals';
import { securityHeaders, createSecurityHeaders } from '../middleware/securityHeaders.js';

// Mock config
jest.mock('../config/index.js', () => ({
  isConfigReady: jest.fn(),
  getConfig: jest.fn()
}));

// Mock logger
jest.mock('../utils/logger.js', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn()
  }
}));

import { isConfigReady, getConfig } from '../config/index.js';

describe('Security Headers Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.CSP_REPORT_ONLY;
    delete process.env.ENABLE_COEP;
  });

  test('should set default security headers', () => {
    const req = {};
    const res = { setHeader: jest.fn() };
    const next = jest.fn();

    securityHeaders(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Security-Policy-Report-Only', expect.stringContaining("default-src 'self'"));
    expect(res.setHeader).toHaveBeenCalledWith('Referrer-Policy', 'strict-origin-when-cross-origin');
    expect(res.setHeader).toHaveBeenCalledWith('Permissions-Policy', expect.stringContaining('accelerometer=()'));
    expect(res.setHeader).toHaveBeenCalledWith('Cross-Origin-Opener-Policy', 'same-origin');
    expect(res.setHeader).toHaveBeenCalledWith('Cross-Origin-Resource-Policy', 'same-site');
    expect(res.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
    expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
    expect(next).toHaveBeenCalled();
  });

  test('should use enforcing CSP when report-only disabled', () => {
    process.env.CSP_REPORT_ONLY = 'false';
    
    const req = {};
    const res = { setHeader: jest.fn() };
    const next = jest.fn();

    securityHeaders(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Security-Policy', expect.stringContaining("default-src 'self'"));
    expect(res.setHeader).not.toHaveBeenCalledWith('Content-Security-Policy-Report-Only', expect.any(String));
  });

  test('should enable COEP when configured', () => {
    process.env.ENABLE_COEP = 'true';
    
    const req = {};
    const res = { setHeader: jest.fn() };
    const next = jest.fn();

    securityHeaders(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith('Cross-Origin-Embedder-Policy', 'require-corp');
  });

  test('should not set COEP by default', () => {
    const req = {};
    const res = { setHeader: jest.fn() };
    const next = jest.fn();

    securityHeaders(req, res, next);

    expect(res.setHeader).not.toHaveBeenCalledWith('Cross-Origin-Embedder-Policy', expect.any(String));
  });

  test('should use config when available', () => {
    isConfigReady.mockReturnValue(true);
    getConfig.mockReturnValue({
      CSP_REPORT_ONLY: false,
      ENABLE_COEP: true
    });
    
    const req = {};
    const res = { setHeader: jest.fn() };
    const next = jest.fn();

    securityHeaders(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Security-Policy', expect.stringContaining("default-src 'self'"));
    expect(res.setHeader).toHaveBeenCalledWith('Cross-Origin-Embedder-Policy', 'require-corp');
  });

  describe('createSecurityHeaders', () => {
    test('should skip paths when configured', () => {
      const middleware = createSecurityHeaders({ skipPaths: ['/api/stripe'] });
      
      const req = { path: '/api/stripe/webhook' };
      const res = { setHeader: jest.fn() };
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.setHeader).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    test('should apply headers for non-skipped paths', () => {
      const middleware = createSecurityHeaders({ skipPaths: ['/api/stripe'] });
      
      const req = { path: '/api/other' };
      const res = { setHeader: jest.fn() };
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
      expect(next).toHaveBeenCalled();
    });
  });

  test('should set comprehensive permissions policy', () => {
    const req = {};
    const res = { setHeader: jest.fn() };
    const next = jest.fn();

    securityHeaders(req, res, next);

    const permissionsPolicy = res.setHeader.mock.calls.find(
      call => call[0] === 'Permissions-Policy'
    )[1];

    expect(permissionsPolicy).toContain('accelerometer=()');
    expect(permissionsPolicy).toContain('camera=()');
    expect(permissionsPolicy).toContain('geolocation=()');
    expect(permissionsPolicy).toContain('microphone=()');
    expect(permissionsPolicy).toContain('payment=()');
  });

  test('should set proper CSP directives', () => {
    const req = {};
    const res = { setHeader: jest.fn() };
    const next = jest.fn();

    securityHeaders(req, res, next);

    const csp = res.setHeader.mock.calls.find(
      call => call[0] === 'Content-Security-Policy-Report-Only'
    )[1];

    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    expect(csp).toContain("img-src 'self' data:");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
  });
});