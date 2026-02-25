import { MetricsCollector, formatMetricsReport } from '../src/providers/MetricsCollector';

describe('MetricsCollector', () => {
  let collector: MetricsCollector;

  beforeEach(() => {
    collector = new MetricsCollector();
  });

  describe('Request Metrics', () => {
    it('should increment total requests', () => {
      collector.requestStarted('AAPL', Date.now());
      collector.requestFinished('AAPL', 50, false);

      const report = collector.getReport(10, 500);
      expect(report.totalRequests).toBe(1);
    });

    it('should track peak concurrency', () => {
      const now = Date.now();
      
      collector.requestStarted('AAPL', now);
      collector.requestStarted('GOOGL', now);
      collector.requestStarted('MSFT', now);
      
      collector.requestFinished('AAPL', 50, false);
      
      const report = collector.getReport(3, 500);
      expect(report.peakConcurrency).toBe(3);
    });

    it('should track requests per minute', () => {
      const now = Date.now();
      
      for (let i = 0; i < 5; i++) {
        collector.requestStarted('SYM' + i, now);
        collector.requestFinished('SYM' + i, 10, false);
      }
      
      const report = collector.getReport(5, 500);
      expect(report.peakRequestsPerMinute).toBe(5);
    });

    it('should track symbol distribution', () => {
      collector.requestStarted('AAPL', Date.now());
      collector.requestFinished('AAPL', 50, false);
      
      collector.requestStarted('AAPL', Date.now());
      collector.requestFinished('AAPL', 60, false);
      
      collector.requestStarted('GOOGL', Date.now());
      collector.requestFinished('GOOGL', 55, false);

      const report = collector.getReport(3, 500);
      expect(report.uniqueSymbols).toBe(2);
      expect(report.topSymbols.length).toBeGreaterThan(0);
    });
  });

  describe('Latency Metrics', () => {
    it('should record latencies', () => {
      collector.requestStarted('AAPL', Date.now());
      collector.requestFinished('AAPL', 100, false);
      
      collector.requestStarted('GOOGL', Date.now());
      collector.requestFinished('GOOGL', 200, false);

      const report = collector.getReport(2, 500);
      expect(report.latencyP50).toBeDefined();
      expect(report.latencyP95).toBeDefined();
      expect(report.latencyMax).toBe(200);
    });

    it('should calculate percentiles correctly', () => {
      const latencies = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      
      latencies.forEach((latency, i) => {
        collector.requestStarted('SYM' + i, Date.now());
        collector.requestFinished('SYM' + i, latency, false);
      });

      const report = collector.getReport(10, 500);
      
      // p50 should be around 50-60 (median)
      expect(report.latencyP50).toBeGreaterThanOrEqual(50);
      expect(report.latencyP50).toBeLessThanOrEqual(60);
      
      // p95 should be around 95-100
      expect(report.latencyP95).toBeGreaterThanOrEqual(90);
      expect(report.latencyP95).toBeLessThanOrEqual(100);
      
      // p99 should be 100 (max)
      expect(report.latencyP99).toBe(100);
      expect(report.latencyMax).toBe(100);
    });

    it('should handle circular buffer overflow', () => {
      // Record more than MAX_LATENCY_SAMPLES (10,000)
      for (let i = 0; i < 10005; i++) {
        collector.requestStarted('SYM' + i, Date.now());
        collector.requestFinished('SYM' + i, i, false);
      }

      const report = collector.getReport(10005, 500);
      
      // Should still report metrics even with overflow
      expect(report.totalRequests).toBe(10005);
      expect(report.latencyP50).toBeDefined();
      expect(report.latencyMax).toBeDefined();
    });
  });

  describe('Failure Classification', () => {
    it('should classify network failures', () => {
      const networkError = new Error('ECONNREFUSED');
      collector.recordFailure(networkError);

      const report = collector.getReport(0, 500);
      expect(report.networkFailures).toBe(1);
    });

    it('should classify timeouts', () => {
      const timeoutError = new Error('ETIMEDOUT');
      collector.recordFailure(timeoutError);

      const report = collector.getReport(0, 500);
      expect(report.timeouts).toBe(1);
    });

    it('should classify HTTP 4xx errors', () => {
      const error404 = new Error('HTTP 404');
      (error404 as any).status = 404;
      collector.recordFailure(error404);

      const report = collector.getReport(0, 500);
      expect(report.http4xx).toBe(1);
    });

    it('should classify HTTP 5xx errors', () => {
      const error500 = new Error('HTTP 500');
      (error500 as any).status = 500;
      collector.recordFailure(error500);

      const report = collector.getReport(0, 500);
      expect(report.http5xx).toBe(1);
    });

    it('should classify rate limit errors', () => {
      const rateLimitError = new Error('HTTP 429');
      (rateLimitError as any).status = 429;
      collector.recordFailure(rateLimitError);

      const report = collector.getReport(0, 500);
      expect(report.rateLimitHits).toBe(1);
    });
  });

  describe('Quota Metrics', () => {
    it('should track quota hits', () => {
      collector.quotaHit(500, 500);
      collector.quotaHit(500, 500);

      const report = collector.getReport(500, 500);
      expect(report.quotaHits).toBe(2);
    });

    it('should calculate burn rate', async () => {
      // Wait a few milliseconds to ensure uptimeDays > 0
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const report = collector.getReport(100, 500);
      
      // quotaBurnRatePerDay = quotaUsed / uptimeDays
      expect(report.quotaBurnRatePerDay).toBeGreaterThan(0);
    });

    it('should project time to exhaustion', () => {
      const report = collector.getReport(100, 500);
      
      // projectedDaysToExhaustion = remainingQuota / burnRate
      expect(report.projectedDaysToExhaustion).toBeGreaterThan(0);
    });

    it('should handle zero burn rate', () => {
      const report = collector.getReport(0, 500);
      
      // If no quota used, projectedDaysToExhaustion should be Infinity
      expect(report.projectedDaysToExhaustion).toBe(Infinity);
    });
  });

  describe('Report Generation', () => {
    it('should generate structured report', () => {
      collector.requestStarted('AAPL', Date.now());
      collector.requestFinished('AAPL', 100, false);

      const report = collector.getReport(1, 500);
      
      expect(report).toHaveProperty('totalRequests');
      expect(report).toHaveProperty('peakConcurrency');
      expect(report).toHaveProperty('topSymbols');
      expect(report).toHaveProperty('latencyP50');
      expect(report).toHaveProperty('networkFailures');
      expect(report).toHaveProperty('quotaBurnRatePerDay');
    });

    it('should format human-readable report', () => {
      collector.requestStarted('AAPL', Date.now());
      collector.requestFinished('AAPL', 100, false);

      const report = collector.getReport(1, 500);
      const formatted = formatMetricsReport(report);
      
      expect(formatted).toContain('REQUEST METRICS');
      expect(formatted).toContain('LATENCY DISTRIBUTION');
      expect(formatted).toContain('FAILURE CLASSIFICATION');
      expect(formatted).toContain('QUOTA BURN VELOCITY');
    });
  });

  describe('Reset Functionality', () => {
    it('should reset all metrics', () => {
      collector.requestStarted('AAPL', Date.now());
      collector.requestFinished('AAPL', 100, false);
      collector.recordFailure(new Error('Test'));
      collector.quotaHit(10, 500);

      collector.reset();

      const report = collector.getReport(0, 500);
      expect(report.totalRequests).toBe(0);
      expect(report.peakConcurrency).toBe(0);
      expect(report.networkFailures).toBe(0);
      expect(report.quotaHits).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle no requests', () => {
      const report = collector.getReport(0, 500);
      
      expect(report.totalRequests).toBe(0);
      expect(report.latencyP50).toBe(0);
      expect(report.latencyMax).toBe(0);
    });

    it('should handle cached responses', () => {
      collector.requestStarted('AAPL', Date.now());
      collector.requestFinished('AAPL', 50, true);
      
      collector.requestStarted('AAPL', Date.now());
      collector.requestFinished('AAPL', 5, true); // Cached, very fast

      const report = collector.getReport(1, 500);
      
      // Should still track both requests
      expect(report.totalRequests).toBe(2);
    });

    it('should handle throttle delays', () => {
      collector.throttleDelayed('AlphaVantage', 12000);
      
      // Should not throw, just track internally
      expect(() => collector.getReport(0, 500)).not.toThrow();
    });

    it('should handle retry triggers', () => {
      collector.retryTriggered('AAPL', 1, 1000);
      
      // Should not throw (Phase 2 functionality)
      expect(() => collector.getReport(0, 500)).not.toThrow();
    });
  });
});
