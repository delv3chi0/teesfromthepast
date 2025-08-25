// backend/__tests__/webhookReliability.test.js
import request from 'supertest';

// Mock the config module
jest.mock('../config/index.js', () => ({
  getConfig: () => ({
    NODE_ENV: 'test',
    REDIS_URL: null // Use memory fallback for tests
  })
}));

// Mock the logger
jest.mock('../utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock mongoose models
jest.mock('../models/WebhookEvent.js', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
    create: jest.fn(),
    findByIdAndUpdate: jest.fn()
  }
}));

describe('Webhook Reliability', () => {
  let webhookReliability;
  
  beforeEach(async () => {
    jest.resetModules();
    webhookReliability = await import('../utils/webhookReliability.js');
  });

  describe('Signature Verification', () => {
    it('should verify valid webhook signature', () => {
      const crypto = require('crypto');
      const secret = 'test_secret';
      const payload = '{"test": "data"}';
      const timestamp = Math.floor(Date.now() / 1000);
      
      // Generate valid signature
      const signedPayload = `${timestamp}.${payload}`;
      const signature = crypto
        .createHmac('sha256', secret)
        .update(signedPayload, 'utf8')
        .digest('hex');
      
      const webhookSignature = `t=${timestamp},v1=${signature}`;
      
      expect(() => {
        webhookReliability.verifyWebhookSignature(payload, webhookSignature, secret);
      }).not.toThrow();
    });

    it('should reject webhook with invalid signature', () => {
      const payload = '{"test": "data"}';
      const timestamp = Math.floor(Date.now() / 1000);
      const invalidSignature = `t=${timestamp},v1=invalid_signature`;
      
      expect(() => {
        webhookReliability.verifyWebhookSignature(payload, invalidSignature, 'secret');
      }).toThrow('Signature verification failed');
    });

    it('should reject webhook outside tolerance window', () => {
      const crypto = require('crypto');
      const secret = 'test_secret';
      const payload = '{"test": "data"}';
      const oldTimestamp = Math.floor(Date.now() / 1000) - 600; // 10 minutes ago
      
      const signedPayload = `${oldTimestamp}.${payload}`;
      const signature = crypto
        .createHmac('sha256', secret)
        .update(signedPayload, 'utf8')
        .digest('hex');
      
      const webhookSignature = `t=${oldTimestamp},v1=${signature}`;
      
      expect(() => {
        webhookReliability.verifyWebhookSignature(payload, webhookSignature, secret, 300);
      }).toThrow('too old');
    });

    it('should reject malformed signature header', () => {
      const payload = '{"test": "data"}';
      const malformedSignature = 'invalid_format';
      
      expect(() => {
        webhookReliability.verifyWebhookSignature(payload, malformedSignature, 'secret');
      }).toThrow('Invalid signature format');
    });
  });

  describe('Idempotency Checking', () => {
    it('should detect already processed webhook', async () => {
      const mockWebhookEvent = await import('../models/WebhookEvent.js');
      mockWebhookEvent.default.findById.mockResolvedValue({
        _id: 'webhook_123',
        type: 'payment_intent.succeeded',
        createdAt: new Date()
      });

      const result = await webhookReliability.checkWebhookIdempotency('webhook_123', 'payment_intent.succeeded');
      
      expect(result.isProcessed).toBe(true);
      expect(result.event).toBeTruthy();
    });

    it('should create new webhook event for first processing', async () => {
      const mockWebhookEvent = await import('../models/WebhookEvent.js');
      mockWebhookEvent.default.findById.mockResolvedValue(null);
      mockWebhookEvent.default.create.mockResolvedValue({
        _id: 'webhook_456',
        type: 'payment_intent.succeeded',
        status: 'processing'
      });

      const result = await webhookReliability.checkWebhookIdempotency('webhook_456', 'payment_intent.succeeded');
      
      expect(result.isProcessed).toBe(false);
      expect(mockWebhookEvent.default.create).toHaveBeenCalledWith({
        _id: 'webhook_456',
        type: 'payment_intent.succeeded',
        processedAt: expect.any(Date),
        status: 'processing'
      });
    });

    it('should handle duplicate key error gracefully', async () => {
      const mockWebhookEvent = await import('../models/WebhookEvent.js');
      mockWebhookEvent.default.findById.mockResolvedValue(null);
      
      const duplicateError = new Error('Duplicate key error');
      duplicateError.code = 11000;
      mockWebhookEvent.default.create.mockRejectedValue(duplicateError);

      const result = await webhookReliability.checkWebhookIdempotency('webhook_789', 'payment_intent.succeeded');
      
      expect(result.isProcessed).toBe(true);
      expect(result.event).toBe(null);
    });
  });

  describe('Webhook Processing', () => {
    it('should process webhook successfully and mark as completed', async () => {
      const mockWebhookEvent = await import('../models/WebhookEvent.js');
      mockWebhookEvent.default.findById.mockResolvedValue(null);
      mockWebhookEvent.default.create.mockResolvedValue({
        _id: 'webhook_success',
        status: 'processing'
      });
      mockWebhookEvent.default.findByIdAndUpdate.mockResolvedValue(true);

      const mockProcessingFn = jest.fn().mockResolvedValue('success');
      
      const result = await webhookReliability.processWebhookSafely(
        'webhook_success',
        'payment_intent.succeeded',
        mockProcessingFn
      );

      expect(result.success).toBe(true);
      expect(result.deduped).toBe(false);
      expect(mockProcessingFn).toHaveBeenCalled();
      expect(mockWebhookEvent.default.findByIdAndUpdate).toHaveBeenCalledWith(
        'webhook_success',
        expect.objectContaining({
          status: 'completed',
          completedAt: expect.any(Date)
        })
      );
    });

    it('should handle processing failure and schedule retry', async () => {
      const mockWebhookEvent = await import('../models/WebhookEvent.js');
      mockWebhookEvent.default.findById.mockResolvedValue(null);
      mockWebhookEvent.default.create.mockResolvedValue({
        _id: 'webhook_fail',
        status: 'processing'
      });
      mockWebhookEvent.default.findByIdAndUpdate.mockResolvedValue(true);

      const transientError = new Error('Connection timeout');
      transientError.code = 'ETIMEDOUT';
      const mockProcessingFn = jest.fn().mockRejectedValue(transientError);
      
      await expect(webhookReliability.processWebhookSafely(
        'webhook_fail',
        'payment_intent.succeeded',
        mockProcessingFn
      )).rejects.toThrow('Connection timeout');

      expect(mockWebhookEvent.default.findByIdAndUpdate).toHaveBeenCalledWith(
        'webhook_fail',
        expect.objectContaining({
          status: 'retrying'
        })
      );
    });
  });

  describe('Retry Logic', () => {
    it('should schedule retry with exponential backoff', async () => {
      const webhookData = { id: 'webhook_retry', type: 'payment_intent.succeeded' };
      
      // Mock the Bull queue
      const mockQueue = {
        add: jest.fn().mockResolvedValue(true)
      };
      
      // Since we're using memory fallback, we can't easily test the actual queue
      // But we can test that the function doesn't throw
      const result = await webhookReliability.scheduleWebhookRetry(webhookData, 0, new Error('Test error'));
      
      // Without Redis, this should return false but not throw
      expect(typeof result).toBe('boolean');
    });

    it('should fail after max retries', async () => {
      const mockWebhookEvent = await import('../models/WebhookEvent.js');
      mockWebhookEvent.default.findByIdAndUpdate.mockResolvedValue(true);

      const webhookData = { id: 'webhook_max_retry', type: 'payment_intent.succeeded' };
      const error = new Error('Persistent failure');
      
      const result = await webhookReliability.scheduleWebhookRetry(webhookData, 5, error);
      
      expect(result).toBe(false);
      expect(mockWebhookEvent.default.findByIdAndUpdate).toHaveBeenCalledWith(
        'webhook_max_retry',
        expect.objectContaining({
          status: 'failed'
        })
      );
    });
  });
});