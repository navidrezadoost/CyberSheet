/**
 * AlphaVantageDriver Integration Tests (PR #4)
 *
 * Tests validate:
 * 1. Throttle enforcement (rate limit compliance)
 * 2. Quota exhaustion (hard limit enforcement)
 * 3. Retry × Quota interaction (accounting correctness)
 * 4. Determinism boundary preservation
 * 5. Error deduplication
 */

import { AlphaVantageDriver } from '../src/providers/AlphaVantageDriver';
import { ProviderRegistry } from '../src/providers/ProviderRegistry';
import { HttpProviderAdapter } from '../src/providers/HttpProviderAdapter';
import { WindowThrottle } from '../src/providers/ThrottlePolicy';
import { QuotaManager } from '../src/providers/QuotaManager';
import { HttpObservability } from '../src/providers/HttpObservability';

describe('AlphaVantageDriver - PR #4 Integration', () => {
  let registry: ProviderRegistry;
  let mockFetch: jest.Mock;
  let mockSleep: jest.Mock;
  let mockRandom: jest.Mock;

  beforeEach(() => {
    registry = new ProviderRegistry();
    
    // Mock fetch function
    mockFetch = jest.fn();
    
    // Mock sleep function (synchronous for testing)
    mockSleep = jest.fn().mockResolvedValue(undefined);
    
    // Mock random function (deterministic backoff)
    mockRandom = jest.fn().mockReturnValue(0.5);
  });

  //
  // TEST 1: Throttle Enforcement
  //

  describe('throttle enforcement', () => {
    it.skip('should respect 5 req/min rate limit', async () => {
      // SKIPPED: This test uses real time delays (20+ seconds).
      // Throttle enforcement is validated by "should not burst beyond throttle limit" test.
      // Real throttle behavior will be measured via observability hooks in production.
      // Setup: 5 req/min throttle with mock clock
      const throttle = new WindowThrottle(5, 60_000);
      const quota = new QuotaManager(500);
      
      // Track request timestamps
      const requestTimestamps: number[] = [];
      
      mockFetch.mockImplementation(async () => {
        requestTimestamps.push(Date.now());
        return {
          'Global Quote': {
            '01. symbol': 'TEST',
            '05. price': '100.00',
            '09. change': '1.50',
            '10. change percent': '1.5%',
            '06. volume': '1000000',
            '07. latest trading day': '2026-02-25'
          }
        };
      });

      const adapter = new HttpProviderAdapter(mockFetch, mockSleep, {}, mockRandom);
      const driver = new AlphaVantageDriver('test-key', registry, adapter, throttle, quota);

      // Generate 10 symbols (should take 2 windows: 5 in first minute, 5 in second)
      const symbols = Array.from({ length: 10 }, (_, i) => `SYM${i}`);

      // Execute prefetch
      await driver.prefetch(symbols, {} as any);

      // Assertions
      expect(requestTimestamps).toHaveLength(10);

      // Check that no more than 5 requests dispatched in any 60s window
      for (let i = 0; i < requestTimestamps.length; i++) {
        const windowStart = requestTimestamps[i];
        const windowEnd = windowStart + 60_000;
        const requestsInWindow = requestTimestamps.filter(
          t => t >= windowStart && t < windowEnd
        ).length;
        
        // Should never exceed 5
        expect(requestsInWindow).toBeLessThanOrEqual(5);
      }

      // Verify quota consumed correctly (10 requests = 10 quota)
      expect(quota.getUsed()).toBe(10);
      expect(quota.getRemaining()).toBe(490);
    });

    it('should not burst beyond throttle limit', async () => {
      const throttle = new WindowThrottle(3, 10_000); // 3 req per 10s (easier to test)
      const quota = new QuotaManager(100);
      const requestTimestamps: number[] = [];
      
      mockFetch.mockImplementation(async () => {
        requestTimestamps.push(Date.now());
        return {
          'Global Quote': {
            '01. symbol': 'TEST',
            '05. price': '100.00',
            '09. change': '0',
            '10. change percent': '0%',
            '06. volume': '100',
            '07. latest trading day': '2026-02-25'
          }
        };
      });

      const adapter = new HttpProviderAdapter(mockFetch, mockSleep, {}, mockRandom);
      const driver = new AlphaVantageDriver('test-key', registry, adapter, throttle, quota);

      // Exercise the actual WindowThrottle timer deterministically: three
      // dispatches fit in the first sliding window and the fourth waits until
      // the oldest timestamp expires (plus the implementation's 10ms buffer).
      jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
      try {
        const pending = driver.prefetch(['A', 'B', 'C', 'D', 'E', 'F'], {} as any);
        await jest.advanceTimersByTimeAsync(10_010);
        await pending;

        expect(mockFetch).toHaveBeenCalledTimes(6);
        expect(requestTimestamps).toHaveLength(6);
        for (const windowStart of requestTimestamps) {
          const requestsInWindow = requestTimestamps.filter(
            timestamp => timestamp >= windowStart && timestamp < windowStart + 10_000,
          ).length;
          expect(requestsInWindow).toBeLessThanOrEqual(3);
        }
        expect(requestTimestamps.slice(0, 3).every(timestamp => timestamp === requestTimestamps[0])).toBe(true);
        expect(requestTimestamps[3]).toBeGreaterThanOrEqual(requestTimestamps[0] + 10_000);
        expect(quota.getUsed()).toBe(6);
      } finally {
        jest.useRealTimers();
      }
    });
  });

  //
  // TEST 2: Quota Exhaustion
  //

  describe('quota exhaustion', () => {
    it('should hard-fail on 501st request with 500 quota', async () => {
      const throttle = new WindowThrottle(1000, 60_000); // High limit (no throttle interference)
      const quota = new QuotaManager(500);
      
      let requestCount = 0;
      mockFetch.mockImplementation(async () => {
        requestCount++;
        return {
          'Global Quote': {
            '01. symbol': `SYM${requestCount}`,
            '05. price': '100.00',
            '09. change': '0',
            '10. change percent': '0%',
            '06. volume': '100',
            '07. latest trading day': '2026-02-25'
          }
        };
      });

      const adapter = new HttpProviderAdapter(mockFetch, mockSleep, {}, mockRandom);
      const driver = new AlphaVantageDriver('test-key', registry, adapter, throttle, quota);

      // Request 501 symbols
      const symbols = Array.from({ length: 501 }, (_, i) => `SYM${i}`);

      // Execute - should process 500 then throw on 501st
      await driver.prefetch(symbols, {} as any);

      // Assertions
      expect(requestCount).toBe(500); // Only 500 HTTP calls made
      expect(quota.getUsed()).toBe(500); // Quota fully consumed
      expect(quota.getRemaining()).toBe(0);

      // 501st symbol should have cached error
      expect(registry.hasCachedValue({ type: 'stock', id: 'SYM500', field: 'Price' })).toBe(true);
      const cachedValue = registry.getValue('stock', 'SYM500', 'Price', {}, {} as any);
      expect(cachedValue).toBeInstanceOf(Error);
      expect((cachedValue as Error).message).toBe('#QUOTA!');
    });

    it('should not dispatch HTTP when quota exhausted', async () => {
      const throttle = new WindowThrottle(100, 60_000);
      const quota = new QuotaManager(5); // Very small quota
      
      mockFetch.mockResolvedValue({
        'Global Quote': {
          '01. symbol': 'TEST',
          '05. price': '100.00',
          '09. change': '0',
          '10. change percent': '0%',
          '06. volume': '100',
          '07. latest trading day': '2026-02-25'
        }
      });

      const adapter = new HttpProviderAdapter(mockFetch, mockSleep, {}, mockRandom);
      const driver = new AlphaVantageDriver('test-key', registry, adapter, throttle, quota);

      // Request 10 symbols with 5 quota
      await driver.prefetch(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'], {} as any);

      // Only first 5 should hit network
      expect(mockFetch).toHaveBeenCalledTimes(5);
      expect(quota.getUsed()).toBe(5);

      // Symbols F-J should have quota errors cached
      ['F', 'G', 'H', 'I', 'J'].forEach(symbol => {
        expect(registry.hasCachedValue({ type: 'stock', id: symbol, field: 'Price' })).toBe(true);
        const value = registry.getValue('stock', symbol, 'Price', {}, {} as any);
        expect(value).toBeInstanceOf(Error);
        expect((value as Error).message).toBe('#QUOTA!');
      });
    });

    it('should call observability hook when quota hit', async () => {
      const throttle = new WindowThrottle(100, 60_000);
      const quota = new QuotaManager(3);
      
      const observability: HttpObservability = {
        quotaHit: jest.fn()
      };
      
      mockFetch.mockResolvedValue({
        'Global Quote': {
          '01. symbol': 'TEST',
          '05. price': '100.00',
          '09. change': '0',
          '10. change percent': '0%',
          '06. volume': '100',
          '07. latest trading day': '2026-02-25'
        }
      });

      const adapter = new HttpProviderAdapter(mockFetch, mockSleep, {}, mockRandom);
      const driver = new AlphaVantageDriver('test-key', registry, adapter, throttle, quota, observability);

      // Request 5 symbols with 3 quota
      await driver.prefetch(['A', 'B', 'C', 'D', 'E'], {} as any);

      // Quota hit should be called for symbols D and E
      expect(observability.quotaHit).toHaveBeenCalledWith(3, 3);
      expect(observability.quotaHit).toHaveBeenCalledTimes(2); // D and E
    });
  });

  //
  // TEST 3: Retry × Quota Interaction (Phase 2 - Future)
  //
  // NOTE: Phase 1 disables retries (retries: 0) for linear quota accounting.
  // These tests document expected Phase 2 behavior after telemetry gathering.
  //

  describe('retry × quota interaction (Phase 2 - Future)', () => {
    it.skip('should consume quota for each retry attempt', async () => {
      const throttle = new WindowThrottle(100, 60_000);
      const quota = new QuotaManager(10);
      
      let attemptCount = 0;
      mockFetch.mockImplementation(async () => {
        attemptCount++;
        if (attemptCount <= 2) {
          // First 2 attempts fail (will trigger retries)
          throw new Error('Network timeout');
        }
        // Third attempt succeeds
        return {
          'Global Quote': {
            '01. symbol': 'AAPL',
            '05. price': '150.00',
            '09. change': '2.50',
            '10. change percent': '1.7%',
            '06. volume': '50000000',
            '07. latest trading day': '2026-02-25'
          }
        };
      });

      const adapter = new HttpProviderAdapter(
        mockFetch,
        mockSleep,
        { retries: 2, baseDelayMs: 100 },
        mockRandom
      );
      const driver = new AlphaVantageDriver('test-key', registry, adapter, throttle, quota);

      // Request 1 symbol (will retry twice then succeed)
      await driver.prefetch(['AAPL'], {} as any);

      // Quota should be consumed 3 times (initial + 2 retries)
      expect(quota.getUsed()).toBe(3);
      expect(quota.getRemaining()).toBe(7);

      // Final value should be cached (success on 3rd attempt)
      expect(registry.hasCachedValue({ type: 'stock', id: 'AAPL', field: 'Price' })).toBe(true);
      const price = registry.getValue('stock', 'AAPL', 'Price', {}, {} as any);
      expect(price).toBe(150);

      // HTTP should have been called 3 times
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should not double-count quota on successful first attempt (Phase 1)', async () => {
      const throttle = new WindowThrottle(100, 60_000);
      const quota = new QuotaManager(50);
      
      mockFetch.mockResolvedValue({
        'Global Quote': {
          '01. symbol': 'TEST',
          '05. price': '100.00',
          '09. change': '0',
          '10. change percent': '0%',
          '06. volume': '100',
          '07. latest trading day': '2026-02-25'
        }
      });

      const adapter = new HttpProviderAdapter(
        mockFetch,
        mockSleep,
        { retries: 0 },  // Phase 1: no retries
        mockRandom
      );
      const driver = new AlphaVantageDriver('test-key', registry, adapter, throttle, quota);

      // Request 10 symbols (all succeed first attempt)
      await driver.prefetch(
        ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
        {} as any
      );

      // Quota should be exactly 10 (linear accounting)
      expect(quota.getUsed()).toBe(10);
      expect(mockFetch).toHaveBeenCalledTimes(10);
    });

    it.skip('should account quota correctly with mixed success/retry', async () => {
      const throttle = new WindowThrottle(100, 60_000);
      const quota = new QuotaManager(20);
      
      // AAPL: succeeds first try
      // MSFT: fails once, succeeds second try
      // GOOG: fails twice, succeeds third try
      mockFetch.mockImplementation(async (url: string) => {
        const symbol = new URL(url).searchParams.get('symbol');
        
        if (symbol === 'AAPL') {
          return {
            'Global Quote': {
              '01. symbol': 'AAPL',
              '05. price': '150.00',
              '09. change': '0',
              '10. change percent': '0%',
              '06. volume': '100',
              '07. latest trading day': '2026-02-25'
            }
          };
        }
        
        if (symbol === 'MSFT') {
          // Fail first, succeed second
          if (mockFetch.mock.calls.filter((c: any) => c[0].includes('MSFT')).length === 1) {
            throw new Error('Timeout');
          }
          return {
            'Global Quote': {
              '01. symbol': 'MSFT',
              '05. price': '300.00',
              '09. change': '0',
              '10. change percent': '0%',
              '06. volume': '100',
              '07. latest trading day': '2026-02-25'
            }
          };
        }
        
        if (symbol === 'GOOG') {
          // Fail twice, succeed third
          const googCalls = mockFetch.mock.calls.filter((c: any) => c[0].includes('GOOG')).length;
          if (googCalls <= 2) {
            throw new Error('Timeout');
          }
          return {
            'Global Quote': {
              '01. symbol': 'GOOG',
              '05. price': '2500.00',
              '09. change': '0',
              '10. change percent': '0%',
              '06. volume': '100',
              '07. latest trading day': '2026-02-25'
            }
          };
        }
        
        throw new Error('Unknown symbol');
      });

      const adapter = new HttpProviderAdapter(
        mockFetch,
        mockSleep,
        { retries: 3, baseDelayMs: 10 },
        mockRandom
      );
      const driver = new AlphaVantageDriver('test-key', registry, adapter, throttle, quota);

      // Request 3 symbols with different retry patterns
      await driver.prefetch(['AAPL', 'MSFT', 'GOOG'], {} as any);

      // Quota accounting:
      // AAPL: 1 quota (1 attempt)
      // MSFT: 2 quota (1 fail + 1 success)
      // GOOG: 3 quota (2 fail + 1 success)
      // Total: 6 quota
      expect(quota.getUsed()).toBe(6);
      expect(quota.getRemaining()).toBe(14);

      // All values should be cached
      expect(registry.getValue('stock', 'AAPL', 'Price', {}, {} as any)).toBe(150);
      expect(registry.getValue('stock', 'MSFT', 'Price', {}, {} as any)).toBe(300);
      expect(registry.getValue('stock', 'GOOG', 'Price', {}, {} as any)).toBe(2500);
    });

    it('should fail fast without retries (Phase 1 behavior)', async () => {
      const throttle = new WindowThrottle(100, 60_000);
      const quota = new QuotaManager(10);
      
      // Simulate network failure
      mockFetch.mockImplementation(async () => {
        throw new Error('Network timeout');
      });

      const adapter = new HttpProviderAdapter(
        mockFetch,
        mockSleep,
        { retries: 0 },  // Phase 1: no retries
        mockRandom
      );
      const driver = new AlphaVantageDriver('test-key', registry, adapter, throttle, quota);

      // Request 1 symbol (will fail immediately)
      await driver.prefetch(['FAIL'], {} as any);

      // Network failure consumes 1 quota (no retries)
      expect(quota.getUsed()).toBe(1);
      
      // Error should be cached immediately
      expect(registry.hasCachedValue({ type: 'stock', id: 'FAIL', field: 'Price' })).toBe(true);
      const cachedError = registry.getValue('stock', 'FAIL', 'Price', {}, {} as any);
      expect(cachedError).toBeInstanceOf(Error);
      
      // Only 1 HTTP attempt (no retries)
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  //
  // TEST 4: Determinism Boundary Preservation
  //

  describe('determinism boundary', () => {
    it('should cache all values before prefetch returns', async () => {
      const throttle = new WindowThrottle(100, 60_000);
      const quota = new QuotaManager(50);
      
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          'Global Quote': {
            '01. symbol': 'AAPL',
            '05. price': '150.00',
            '09. change': '2.50',
            '10. change percent': '1.7%',
            '06. volume': '50000000',
            '07. latest trading day': '2026-02-25'
          }
        }),
        headers: { get: () => null }
      } as any);

      const adapter = new HttpProviderAdapter(mockFetch, mockSleep, {}, mockRandom);
      const driver = new AlphaVantageDriver('test-key', registry, adapter, throttle, quota);

      // Before prefetch - no values cached
      expect(registry.hasCachedValue({ type: 'stock', id: 'AAPL', field: 'Price' })).toBe(false);

      // Execute prefetch
      await driver.prefetch(['AAPL'], {} as any);

      // After prefetch - all fields cached
      expect(registry.hasCachedValue({ type: 'stock', id: 'AAPL', field: 'Price' })).toBe(true);
      expect(registry.hasCachedValue({ type: 'stock', id: 'AAPL', field: 'Change' })).toBe(true);
      expect(registry.hasCachedValue({ type: 'stock', id: 'AAPL', field: 'ChangePercent' })).toBe(true);
      expect(registry.hasCachedValue({ type: 'stock', id: 'AAPL', field: 'Volume' })).toBe(true);
      expect(registry.hasCachedValue({ type: 'stock', id: 'AAPL', field: 'LastTradeDate' })).toBe(true);

      // Values should be correct
      expect(registry.getValue('stock', 'AAPL', 'Price', {}, {} as any)).toBe(150);
      expect(registry.getValue('stock', 'AAPL', 'Change', {}, {} as any)).toBe(2.5);
      expect(registry.getValue('stock', 'AAPL', 'Volume', {}, {} as any)).toBe(50000000);
    });

    it('should cache errors before prefetch returns', async () => {
      const throttle = new WindowThrottle(100, 60_000);
      const quota = new QuotaManager(50);
      
      mockFetch.mockRejectedValue(new Error('Network error'));

      const adapter = new HttpProviderAdapter(mockFetch, mockSleep, { retries: 0 }, mockRandom);
      const driver = new AlphaVantageDriver('test-key', registry, adapter, throttle, quota);

      // Execute prefetch (will fail)
      await driver.prefetch(['FAIL'], {} as any);

      // Error should be cached for all fields
      expect(registry.hasCachedValue({ type: 'stock', id: 'FAIL', field: 'Price' })).toBe(true);
      expect(registry.hasCachedValue({ type: 'stock', id: 'FAIL', field: 'Change' })).toBe(true);
      
      const cachedError = registry.getValue('stock', 'FAIL', 'Price', {}, {} as any);
      expect(cachedError).toBeInstanceOf(Error);
    });
  });

  //
  // TEST 5: Error Deduplication
  //

  describe('error deduplication', () => {
    it('should not refetch quota errors from cache', async () => {
      const throttle = new WindowThrottle(100, 60_000);
      const quota = new QuotaManager(2); // Only 2 quota
      
      mockFetch.mockResolvedValue({
        'Global Quote': {
          '01. symbol': 'TEST',
          '05. price': '100.00',
          '09. change': '0',
          '10. change percent': '0%',
          '06. volume': '100',
          '07. latest trading day': '2026-02-25'
        }
      });

      const adapter = new HttpProviderAdapter(mockFetch, mockSleep, {}, mockRandom);
      const driver = new AlphaVantageDriver('test-key', registry, adapter, throttle, quota);

      // First prefetch: use both quota slots
      await driver.prefetch(['A', 'B'], {} as any);
      expect(quota.getUsed()).toBe(2);

      // Second prefetch: quota exhausted, error cached
      await driver.prefetch(['C'], {} as any);
      expect(quota.getUsed()).toBe(2); // No additional quota consumed
      expect(registry.hasCachedValue({ type: 'stock', id: 'C', field: 'Price' })).toBe(true);

      // Third prefetch: same symbol C, should use cached error (not refetch)
      const fetchCountBefore = mockFetch.mock.calls.length;
      await driver.prefetch(['C'], {} as any);
      const fetchCountAfter = mockFetch.mock.calls.length;

      // No additional fetch (cached error reused)
      expect(fetchCountAfter).toBe(fetchCountBefore);
      expect(quota.getUsed()).toBe(2); // Still 2
    });
  });

  //
  // TEST 6: Observability Hooks
  //

  describe('observability hooks', () => {
    it('should call requestStarted and requestFinished', async () => {
      const throttle = new WindowThrottle(100, 60_000);
      const quota = new QuotaManager(50);
      
      const observability: HttpObservability = {
        requestStarted: jest.fn(),
        requestFinished: jest.fn()
      };
      
      mockFetch.mockResolvedValue({
        'Global Quote': {
          '01. symbol': 'AAPL',
          '05. price': '150.00',
          '09. change': '0',
          '10. change percent': '0%',
          '06. volume': '100',
          '07. latest trading day': '2026-02-25'
        }
      });

      const adapter = new HttpProviderAdapter(mockFetch, mockSleep, {}, mockRandom);
      const driver = new AlphaVantageDriver('test-key', registry, adapter, throttle, quota, observability);

      await driver.prefetch(['AAPL'], {} as any);

      expect(observability.requestStarted).toHaveBeenCalledWith('AAPL', expect.any(Number));
      expect(observability.requestFinished).toHaveBeenCalledWith('AAPL', expect.any(Number), false);
    });
  });
});
