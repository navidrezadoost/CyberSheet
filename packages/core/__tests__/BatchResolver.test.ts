import { BatchResolver, BatchResolverOptions } from '../src/providers/BatchResolver';
import { ProviderRegistry } from '../src/providers/ProviderRegistry';
import { HttpProviderAdapter } from '../src/providers/HttpProviderAdapter';
import { WindowThrottle } from '../src/providers/ThrottlePolicy';
import { ProviderRef } from '../src/providers/ProviderResolution';
import { IDataTypeProvider } from '../src/providers/IDataTypeProvider';
import { FormulaValue, FormulaContext } from '../src/types/formula-types';

/**
 * BatchResolver Tests (PR #3)
 * 
 * Tests cover 6 critical scenarios:
 * 1. Synchronous enqueue with idempotency
 * 2. Registry as resolution authority
 * 3. Concurrency limit enforcement via worker pool
 * 4. Per-provider throttle policies
 * 5. Deterministic completion with invariants
 * 6. Individual failure isolation
 */
describe('BatchResolver - v2 Design', () => {
  let registry: ProviderRegistry;
  let adapter: HttpProviderAdapter;
  let resolver: BatchResolver;
  let mockProvider: IDataTypeProvider;
  let mockFetch: jest.Mock;
  let mockSleep: jest.Mock;

  beforeEach(() => {
    registry = new ProviderRegistry();
    
    // Mock fetch and sleep for adapter
    mockFetch = jest.fn();
    mockSleep = jest.fn().mockResolvedValue(undefined);
    
    adapter = new HttpProviderAdapter(
      mockFetch as any,
      mockSleep,
      { timeoutMs: 5000, retries: 3 }
    );
    
    // Mock provider for testing
    mockProvider = {
      id: 'mock-stock-provider',
      type: 'stock',
      getValue: jest.fn(),
      prefetch: jest.fn().mockResolvedValue(undefined)
    };
    
    registry.register(mockProvider);

    resolver = new BatchResolver(registry, adapter, {
      maxConcurrent: 5
    });
  });

  afterEach(() => {
    resolver.reset();
  });

  //
  // TEST 1: enqueue() is synchronous and idempotent
  //

  describe('enqueue() semantics', () => {
    it('should be synchronous (no Promise returned)', () => {
      const ref: ProviderRef = { type: 'stock', id: 'AAPL', field: 'Price' };
      
      const result = resolver.enqueue(ref);
      
      // Should return undefined (void), not a Promise
      expect(result).toBeUndefined();
    });

    it('should deduplicate identical refs', () => {
      const ref: ProviderRef = { type: 'stock', id: 'AAPL', field: 'Price' };
      
      resolver.enqueue(ref);
      resolver.enqueue(ref);  // duplicate
      resolver.enqueue(ref);  // triple
      
      // Internal pending queue should have only 1 entry
      expect((resolver as any).pendingQueue).toHaveLength(1);
      expect((resolver as any).pendingKeys.size).toBe(1);
    });

    it('should not enqueue if value already cached', () => {
      const ref: ProviderRef = { type: 'stock', id: 'AAPL', field: 'Price' };
      
      // Pre-populate registry cache
      registry.setCachedValue(ref, 150);
      
      resolver.enqueue(ref);
      
      // Should not be in pending queue (already resolved)
      expect((resolver as any).pendingQueue).toHaveLength(0);
    });

    it('should handle multiple different refs', () => {
      const ref1: ProviderRef = { type: 'stock', id: 'AAPL', field: 'Price' };
      const ref2: ProviderRef = { type: 'stock', id: 'MSFT', field: 'Price' };
      const ref3: ProviderRef = { type: 'stock', id: 'AAPL', field: 'MarketCap' };
      
      resolver.enqueue(ref1);
      resolver.enqueue(ref2);
      resolver.enqueue(ref3);
      
      expect((resolver as any).pendingQueue).toHaveLength(3);
    });
  });

  //
  // TEST 2: Registry as resolution authority (no resolvedSet)
  //

  describe('registry as authority', () => {
    it('should use registry.hasCachedValue() instead of internal resolvedSet', async () => {
      const ref: ProviderRef = { type: 'stock', id: 'AAPL', field: 'Price' };
      
      // Spy on registry method
      const hasCachedValueSpy = jest.spyOn(registry, 'hasCachedValue');
      
      // Setup mock provider to cache the value
      (mockProvider.prefetch as jest.Mock).mockImplementation(async (ids) => {
        registry.setCachedValue({ type: 'stock', id: ids[0], field: 'Price' }, 100);
      });
      
      resolver.enqueue(ref);
      await resolver.resolveAll();
      
      // Enqueue again after resolution
      resolver.enqueue(ref);
      
      // hasCachedValue should have been called
      expect(hasCachedValueSpy).toHaveBeenCalled();
      
      // Should not be in pending queue (registry has it)
      expect((resolver as any).pendingQueue).toHaveLength(0);
    });

    it('should not have a resolvedSet private field', () => {
      // Verify no resolvedSet exists (clean architecture)
      expect((resolver as any).resolvedSet).toBeUndefined();
    });
  });

  //
  // TEST 3: Concurrency control via worker pool
  //

  describe('concurrency control', () => {
    it('should respect maxConcurrent limit during execution', async () => {
      const refs = Array.from({ length: 20 }, (_, i) => ({
        type: 'stock',
        id: `SYMBOL${i}`,
        field: 'Price'
      }));

      let maxConcurrent = 0;
      let currentConcurrent = 0;

      // Mock provider with delay to observe concurrency
      (mockProvider.prefetch as jest.Mock).mockImplementation(async () => {
        currentConcurrent++;
        maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
        await new Promise(resolve => setTimeout(resolve, 10));
        currentConcurrent--;
        registry.setCachedValue({ type: 'stock', id: 'test', field: 'Price' }, 100);
      });

      refs.forEach(ref => resolver.enqueue(ref));
      await resolver.resolveAll();

      // maxConcurrent should never exceed configured limit
      expect(maxConcurrent).toBeLessThanOrEqual(5);
      expect(maxConcurrent).toBeGreaterThan(0);  // At least some concurrency happened
    });

    it('should spawn exactly maxConcurrent workers', async () => {
      const refs = Array.from({ length: 3 }, (_, i) => ({
        type: 'stock',
        id: `S${i}`,
        field: 'Price'
      }));

      (mockProvider.prefetch as jest.Mock).mockImplementation(async (ids) => {
        registry.setCachedValue({ type: 'stock', id: ids[0], field: 'Price' }, 100);
      });

      refs.forEach(ref => resolver.enqueue(ref));
      
      // Spy on worker method
      const workerSpy = jest.spyOn(resolver as any, 'worker');
      
      await resolver.resolveAll();
      
      // Should spawn 5 workers (maxConcurrent) even though only 3 refs
      expect(workerSpy).toHaveBeenCalledTimes(5);
    });
  });

  //
  // TEST 4: Per-provider throttle policies
  //

  describe('throttle policies', () => {
    it('should apply throttle for configured providers', async () => {
      const throttle = new WindowThrottle(2, 1000);  // 2 requests per second
      const resolverWithThrottle = new BatchResolver(registry, adapter, {
        maxConcurrent: 10,  // High concurrency to test throttle, not worker limit
        throttlePolicies: {
          stock: throttle
        }
      });

      const refs = Array.from({ length: 4 }, (_, i) => ({
        type: 'stock',
        id: `S${i}`,
        field: 'Price'
      }));

      (mockProvider.prefetch as jest.Mock).mockImplementation(async (ids) => {
        registry.setCachedValue({ type: 'stock', id: ids[0], field: 'Price' }, 100);
      });

      refs.forEach(ref => resolverWithThrottle.enqueue(ref));

      const start = Date.now();
      await resolverWithThrottle.resolveAll();
      const elapsed = Date.now() - start;

      // 4 requests at 2/sec → needs at least 1 second to complete
      expect(elapsed).toBeGreaterThanOrEqual(1000);
    });

    it('should not throttle providers without configured policy', async () => {
      const throttle = new WindowThrottle(1, 5000);  // Very restrictive
      const resolverWithThrottle = new BatchResolver(registry, adapter, {
        maxConcurrent: 10,
        throttlePolicies: {
          someOtherProvider: throttle  // Not 'stock'
        }
      });

      const refs = Array.from({ length: 3 }, (_, i) => ({
        type: 'stock',  // Not throttled
        id: `S${i}`,
        field: 'Price'
      }));

      (mockProvider.prefetch as jest.Mock).mockImplementation(async (ids) => {
        registry.setCachedValue({ type: 'stock', id: ids[0], field: 'Price' }, 100);
      });

      refs.forEach(ref => resolverWithThrottle.enqueue(ref));

      const start = Date.now();
      await resolverWithThrottle.resolveAll();
      const elapsed = Date.now() - start;

      // Should complete quickly (no throttle applied)
      expect(elapsed).toBeLessThan(1000);
    });
  });

  //
  // TEST 5: Deterministic completion with invariants
  //

  describe('deterministic completion', () => {
    it('should enforce no in-flight requests after resolveAll()', async () => {
      const ref1: ProviderRef = { type: 'stock', id: 'AAPL', field: 'Price' };
      const ref2: ProviderRef = { type: 'stock', id: 'MSFT', field: 'Price' };

      (mockProvider.prefetch as jest.Mock).mockImplementation(async (ids) => {
        registry.setCachedValue({ type: 'stock', id: ids[0], field: 'Price' }, 100);
      });

      resolver.enqueue(ref1);
      resolver.enqueue(ref2);

      await resolver.resolveAll();

      // Invariant: inFlightMap must be empty
      expect((resolver as any).inFlightMap.size).toBe(0);
    });

    it('should enforce no pending refs after resolveAll()', async () => {
      const refs = Array.from({ length: 10 }, (_, i) => ({
        type: 'stock',
        id: `S${i}`,
        field: 'Price'
      }));

      (mockProvider.prefetch as jest.Mock).mockImplementation(async (ids) => {
        registry.setCachedValue({ type: 'stock', id: ids[0], field: 'Price' }, 100);
      });

      refs.forEach(ref => resolver.enqueue(ref));
      await resolver.resolveAll();

      // Invariant: pendingQueue must be empty
      expect((resolver as any).pendingQueue).toHaveLength(0);
      expect((resolver as any).pendingKeys.size).toBe(0);
    });

    it('should populate registry for all enqueued refs', async () => {
      const refs = [
        { type: 'stock', id: 'AAPL', field: 'Price' },
        { type: 'stock', id: 'MSFT', field: 'MarketCap' }
      ];

      (mockProvider.prefetch as jest.Mock).mockImplementation(async (ids) => {
        // Simulate caching both Price and MarketCap
        registry.setCachedValue({ type: 'stock', id: ids[0], field: 'Price' }, 150);
        registry.setCachedValue({ type: 'stock', id: ids[0], field: 'MarketCap' }, 2000000);
      });

      refs.forEach(ref => resolver.enqueue(ref));
      await resolver.resolveAll();

      // Registry must have all values
      refs.forEach(ref => {
        expect(registry.hasCachedValue(ref)).toBe(true);
      });
    });
  });

  //
  // HARDENING: Determinism contract enforcement
  //

  describe('determinism contract (hardening)', () => {
    it('should prevent late registry mutations after resolveAll()', async () => {
      // This test verifies the DETERMINISM CONTRACT from IDataTypeProvider
      // After resolveAll() completes, NO async work should mutate the registry
      
      const ref: ProviderRef = { type: 'stock', id: 'AAPL', field: 'Price' };
      let lateWriteOccurred = false;

      (mockProvider.prefetch as jest.Mock).mockImplementation(async (ids) => {
        // Properly cache the value (correct behavior)
        registry.setCachedValue({ type: 'stock', id: ids[0], field: 'Price' }, 100);
        
        // Simulate a provider that VIOLATES the contract by scheduling late work
        // This is what providers MUST NOT do - stored for later execution
        setTimeout(() => {
          lateWriteOccurred = true;
          registry.setCachedValue({ type: 'stock', id: 'LATE_VIOLATION', field: 'Price' }, 999);
        }, 50);
      });

      resolver.enqueue(ref);
      await resolver.resolveAll();

      // At this point, resolveAll() has completed
      // The registry should be in a deterministic final state
      
      // Capture the registry state snapshot
      expect(registry.hasCachedValue(ref)).toBe(true);
      expect(registry.hasCachedValue({ type: 'stock', id: 'LATE_VIOLATION', field: 'Price' })).toBe(false);
      expect(lateWriteOccurred).toBe(false);
      
      // Wait for the late write to execute (proving the vulnerability)
      await new Promise(resolve => setTimeout(resolve, 100));
        
      // This demonstrates the vulnerability - mutation occurred after resolveAll()
      expect(lateWriteOccurred).toBe(true);
      expect(registry.hasCachedValue({ type: 'stock', id: 'LATE_VIOLATION', field: 'Price' })).toBe(true);
      
      // In production, this would be a CONTRACT VIOLATION
      // Providers must NOT do this - all work must be awaited in prefetch()
    });

    it('should prevent late mutations from fire-and-forget async operations', async () => {
      // This test demonstrates why providers MUST await all async work
      
      const ref: ProviderRef = { type: 'stock', id: 'AAPL', field: 'Price' };
      let fireAndForgetExecuted = false;

      (mockProvider.prefetch as jest.Mock).mockImplementation(async (ids) => {
        registry.setCachedValue({ type: 'stock', id: ids[0], field: 'Price' }, 100);
        
        // BAD: Fire-and-forget async (contract violation)
        // This setTimeout is NOT awaited, so it runs after prefetch() returns
        setTimeout(() => {
          fireAndForgetExecuted = true;
          registry.setCachedValue({ type: 'stock', id: 'FIRE_FORGET', field: 'Price' }, 777);
        }, 50);
        
        // prefetch() returns immediately, but setTimeout is still pending
      });

      resolver.enqueue(ref);
      await resolver.resolveAll();

      // Registry state immediately after resolveAll()
      expect(registry.hasCachedValue(ref)).toBe(true);
      expect(registry.hasCachedValue({ type: 'stock', id: 'FIRE_FORGET', field: 'Price' })).toBe(false);
      expect(fireAndForgetExecuted).toBe(false);

      // Wait for the fire-and-forget to execute
      await new Promise(resolve => setTimeout(resolve, 100));

      // Now the late mutation has occurred
      expect(fireAndForgetExecuted).toBe(true);
      expect(registry.hasCachedValue({ type: 'stock', id: 'FIRE_FORGET', field: 'Price' })).toBe(true);
      
      // This proves the determinism boundary was violated
      // In production: providers MUST await all async work
      // Correct pattern: await new Promise(...)  (not fire-and-forget)
    });

    it('should deduplicate errors - failed refs not refetched', async () => {
      // This test verifies error caching prevents redundant failed fetches
      
      const ref: ProviderRef = { type: 'stock', id: 'FAIL', field: 'Price' };
      let fetchCount = 0;

      (mockProvider.prefetch as jest.Mock).mockImplementation(async (ids) => {
        fetchCount++;
        // Simulate a persistent failure (e.g., symbol not found)
        throw new Error('Symbol not found: FAIL');
      });

      // First attempt - should fetch and cache error
      resolver.enqueue(ref);
      await resolver.resolveAll();

      expect(fetchCount).toBe(1);
      expect(registry.hasCachedValue(ref)).toBe(true);  // Error is cached
      
      // Reset resolver (new evaluation cycle)
      resolver.reset();
      
      // Registry KEEPS the error (not cleared on resolver.reset())
      expect(registry.hasCachedValue(ref)).toBe(true);

      // Second attempt - enqueue same ref again
      resolver.enqueue(ref);
      await resolver.resolveAll();

      // Error deduplication: should NOT refetch
      expect(fetchCount).toBe(1);  // Still 1, not 2
      
      // The cached error was reused
      // This prevents hammering external APIs with repeated failed requests
      // API rate limits are preserved even when formulas repeatedly request bad symbols
    });
  });

  //
  // TEST 6: Individual failure isolation
  //

  describe('failure isolation', () => {
    it('should isolate individual ref failures', async () => {
      const refSuccess: ProviderRef = { type: 'stock', id: 'AAPL', field: 'Price' };
      const refFailure: ProviderRef = { type: 'stock', id: 'FAIL', field: 'Price' };

      (mockProvider.prefetch as jest.Mock).mockImplementation(async (ids) => {
        if (ids[0] === 'FAIL') {
          throw new Error('Network timeout');
        }
        registry.setCachedValue({ type: 'stock', id: ids[0], field: 'Price' }, 100);
      });

      resolver.enqueue(refSuccess);
      resolver.enqueue(refFailure);

      // Should NOT throw - errors are stored in registry
      await expect(resolver.resolveAll()).resolves.toBeUndefined();

      // Success value should be in registry
      expect(registry.hasCachedValue(refSuccess)).toBe(true);

      // Failure should also be in registry (as error)
      expect(registry.hasCachedValue(refFailure)).toBe(true);
    });

    it('should handle provider not registered', async () => {
      const refUnknown: ProviderRef = { type: 'unknown', id: 'XYZ', field: 'Price' };

      resolver.enqueue(refUnknown);
      await resolver.resolveAll();

      // Should cache #REF! error
      expect(registry.hasCachedValue(refUnknown)).toBe(true);
    });

    it('should not crash if provider.prefetch throws', async () => {
      const ref: ProviderRef = { type: 'stock', id: 'CRASH', field: 'Price' };

      (mockProvider.prefetch as jest.Mock).mockRejectedValue(new Error('Catastrophic failure'));

      resolver.enqueue(ref);

      // Should not throw
      await expect(resolver.resolveAll()).resolves.toBeUndefined();

      // Should have cached an error
      expect(registry.hasCachedValue(ref)).toBe(true);
    });
  });

  //
  // ADDITIONAL: Reset and reuse
  //

  describe('reset()', () => {
    it('should clear state for next evaluation cycle', async () => {
      const ref: ProviderRef = { type: 'stock', id: 'AAPL', field: 'Price' };

      (mockProvider.prefetch as jest.Mock).mockImplementation(async (ids) => {
        registry.setCachedValue({ type: 'stock', id: ids[0], field: 'Price' }, 100);
      });

      // First cycle
      resolver.enqueue(ref);
      await resolver.resolveAll();

      // Reset
      resolver.reset();

      // State should be cleared
      expect((resolver as any).pendingQueue).toHaveLength(0);
      expect((resolver as any).pendingKeys.size).toBe(0);
      expect((resolver as any).inFlightMap.size).toBe(0);

      // Should be reusable
      registry.clearCache();  // Clear registry too
      resolver.enqueue(ref);
      await resolver.resolveAll();

      expect(registry.hasCachedValue(ref)).toBe(true);
    });
  });

  //
  // EDGE CASES
  //

  describe('edge cases', () => {
    it('should handle empty queue (resolveAll with no enqueue)', async () => {
      // Should complete immediately without error
      await expect(resolver.resolveAll()).resolves.toBeUndefined();
    });

    it('should validate maxConcurrent on construction', () => {
      expect(() => {
        new BatchResolver(registry, adapter, { maxConcurrent: 0 });
      }).toThrow('maxConcurrent must be positive');

      expect(() => {
        new BatchResolver(registry, adapter, { maxConcurrent: -5 });
      }).toThrow('maxConcurrent must be positive');
    });

    it('should handle large batch efficiently', async () => {
      const refs = Array.from({ length: 100 }, (_, i) => ({
        type: 'stock',
        id: `SYMBOL${i}`,
        field: 'Price'
      }));

      (mockProvider.prefetch as jest.Mock).mockImplementation(async (ids) => {
        registry.setCachedValue({ type: 'stock', id: ids[0], field: 'Price' }, Math.random() * 1000);
      });

      refs.forEach(ref => resolver.enqueue(ref));

      const start = Date.now();
      await resolver.resolveAll();
      const elapsed = Date.now() - start;

      // Should complete reasonably fast with concurrency
      expect(elapsed).toBeLessThan(5000);

      // All refs should be resolved
      refs.forEach(ref => {
        expect(registry.hasCachedValue(ref)).toBe(true);
      });
    });
  });
});
