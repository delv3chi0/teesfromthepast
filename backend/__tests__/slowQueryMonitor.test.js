// backend/__tests__/slowQueryMonitor.test.js
// Mock the config module
jest.mock('../config/index.js', () => ({
  getConfig: () => ({
    NODE_ENV: 'test',
    DB_SLOW_MS: 1000
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

// Mock mongoose
const mockMongoose = {
  set: jest.fn()
};

jest.mock('mongoose', () => mockMongoose);

describe('Slow Query Monitor', () => {
  let slowQueryMonitor;
  
  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();
    slowQueryMonitor = await import('../utils/slowQueryMonitor.js');
  });

  describe('Initialization', () => {
    it('should initialize slow query monitoring', () => {
      slowQueryMonitor.initializeSlowQueryMonitoring();
      
      expect(mockMongoose.set).toHaveBeenCalledWith('debug', expect.any(Function));
    });

    it('should not initialize twice', () => {
      slowQueryMonitor.initializeSlowQueryMonitoring();
      slowQueryMonitor.initializeSlowQueryMonitoring();
      
      // Should only be called once despite multiple initialization attempts
      expect(mockMongoose.set).toHaveBeenCalledTimes(1);
    });
  });

  describe('Query Metrics', () => {
    it('should return initial metrics', () => {
      const metrics = slowQueryMonitor.getQueryMetrics();
      
      expect(metrics).toEqual({
        total: 0,
        slow: 0,
        slowThreshold: 1000,
        slowQueryRate: 0,
        averageResponseTime: 0,
        responseTimeBuckets: {
          '0-100ms': 0,
          '100-500ms': 0,
          '500-1000ms': 0,
          '1000-5000ms': 0,
          '5000ms+': 0
        },
        recentSlowQueries: []
      });
    });

    it('should reset metrics', () => {
      slowQueryMonitor.resetQueryMetrics();
      
      const metrics = slowQueryMonitor.getQueryMetrics();
      expect(metrics.total).toBe(0);
      expect(metrics.slow).toBe(0);
      expect(metrics.averageResponseTime).toBe(0);
    });

    it('should return slow queries', () => {
      const slowQueries = slowQueryMonitor.getSlowQueries();
      expect(Array.isArray(slowQueries)).toBe(true);
      expect(slowQueries.length).toBe(0);
    });
  });

  describe('Query Duration Histogram', () => {
    it('should return histogram data', () => {
      const histogram = slowQueryMonitor.getQueryDurationHistogram();
      
      expect(histogram).toEqual({
        buckets: {
          '0.1': 0,
          '0.5': 0,
          '1.0': 0,
          '5.0': 0,
          '+Inf': 0
        },
        count: 0,
        sum: 0
      });
    });
  });

  describe('Middleware', () => {
    it('should create query metrics middleware', () => {
      const middleware = slowQueryMonitor.queryMetricsMiddleware;
      expect(typeof middleware).toBe('function');
      
      const req = {};
      const res = {};
      const next = jest.fn();
      
      middleware(req, res, next);
      
      expect(req.queryMetrics).toBeDefined();
      expect(typeof req.queryMetrics.get).toBe('function');
      expect(typeof req.queryMetrics.getSlowQueries).toBe('function');
      expect(typeof req.queryMetrics.reset).toBe('function');
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Periodic Logging', () => {
    it('should start and stop periodic metrics logging', () => {
      // Use a short interval for testing
      slowQueryMonitor.startPeriodicMetricsLogging(100);
      
      // Should be able to stop without error
      slowQueryMonitor.stopPeriodicMetricsLogging();
      
      // Should handle multiple stops
      slowQueryMonitor.stopPeriodicMetricsLogging();
    });
  });
});