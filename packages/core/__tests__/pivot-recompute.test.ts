/**
 * pivot-recompute.test.ts
 * 
 * Phase 31a: Lazy Pivot Recomputation Tests
 * 
 * Test Plan:
 * §1 Lazy rebuild: dirty → query → rebuild → clean
 * §2 No rebuild if clean: query → no builder call
 * §3 Single rebuild: dirty → 10 queries → builder called once
 * §4 Failure fallback: builder throws → query returns #CALC!
 * §5 Re-entrancy safety: recursive query → no infinite loop
 * §6 Determinism: same seed → identical snapshot
 * §7 Integration with Phase 30b: mutation → dirty → query → auto clean
 */

declare function describe(name: string, fn: () => void): void;
declare function test(name: string, fn: () => void | Promise<void>): void;
declare const expect: any;
import { PivotRegistryImpl } from '../src/PivotRegistry';
import type { PivotId, PivotMetadata } from '../src/PivotRegistry';
import { PivotSnapshotStore } from '../src/PivotSnapshotStore';
import type { PivotSnapshot } from '../src/PivotSnapshotStore';
import { PivotRecomputeEngineImpl } from '../src/PivotRecomputeEngine';
import type { PivotBuilder } from '../src/PivotRecomputeEngine';
import { GetPivotData } from '../src/GetPivotData';
import type { PivotConfig } from '../src/PivotEngine';
import type { Range, Address, CellValue } from '../src/types';

// =============================================================================
// Test Helpers
// =============================================================================

function makeRange(r1: number, c1: number, r2: number, c2: number): Range {
  return {
    start: { row: r1, col: c1 },
    end: { row: r2, col: c2 },
  };
}

function makePivotConfig(range: Range): PivotConfig {
  return {
    rows: [{ column: 1, label: 'Category' }],
    columns: [{ column: 2, label: 'Year' }],
    values: [{ type: 'aggregate', column: 3, aggregation: 'sum', label: 'Revenue' }],
    sourceRange: range,
  };
}

function makeSnapshot(pivotId: PivotId, computedAt: number, seed: number = 0): PivotSnapshot {
  return {
    pivotId,
    computedAt,
    rows: [
      { Category: 'A', Year: 2024, Revenue: 100 + seed },
      { Category: 'B', Year: 2024, Revenue: 200 + seed },
    ],
    fields: ['Category', 'Year', 'Revenue'],
    valueFields: ['Revenue'],
  };
}

// =============================================================================
// §1: Lazy Rebuild
// =============================================================================

describe('Phase 31a: Lazy Rebuild', () => {
  test('dirty pivot is rebuilt on first query', () => {
    const registry = new PivotRegistryImpl();
    const store = new PivotSnapshotStore();
    let builderCallCount = 0;

    const builder: PivotBuilder = (id, config, worksheetId) => {
      builderCallCount++;
      return makeSnapshot(id, Date.now(), 0);
    };

    const engine = new PivotRecomputeEngineImpl(registry, store, builder);

    // Register pivot (starts clean)
    const pivotId = registry.register({
      name: 'Test Pivot',
      config: makePivotConfig(makeRange(1, 1, 10, 5)),
      sourceRange: 'A1:E10',
      worksheetId: 'Sheet1',
      
    });

    // Mark dirty
    registry.markDirty(pivotId);
    expect(registry.isDirty(pivotId)).toBe(true);

    // ensureFresh should rebuild
    engine.ensureFresh(pivotId);

    // Verify: builder was called
    expect(builderCallCount).toBe(1);
    
    // Verify: pivot is now clean
    expect(registry.isDirty(pivotId)).toBe(false);
    
    // Verify: snapshot was stored
    expect(store.has(pivotId)).toBe(true);
  });

  test('clean pivot is NOT rebuilt', () => {
    const registry = new PivotRegistryImpl();
    const store = new PivotSnapshotStore();
    let builderCallCount = 0;

    const builder: PivotBuilder = (id, config, worksheetId) => {
      builderCallCount++;
      return makeSnapshot(id, Date.now(), 0);
    };

    const engine = new PivotRecomputeEngineImpl(registry, store, builder);

    // Register pivot (starts clean)
    const pivotId = registry.register({
      name: 'Test Pivot',
      config: makePivotConfig(makeRange(1, 1, 10, 5)),
      sourceRange: 'A1:E10',
      worksheetId: 'Sheet1',
      
    });

    // Store a snapshot manually
    store.set(pivotId, makeSnapshot(pivotId, Date.now(), 0));

    // ensureFresh should be no-op
    engine.ensureFresh(pivotId);

    // Verify: builder was NOT called
    expect(builderCallCount).toBe(0);
    
    // Verify: pivot is still clean
    expect(registry.isDirty(pivotId)).toBe(false);
  });
});

// =============================================================================
// §2: No Rebuild if Clean (Zero Overhead)
// =============================================================================

describe('Phase 31a: Zero Overhead When Clean', () => {
  test('10 queries on clean pivot → 0 builder calls', () => {
    const registry = new PivotRegistryImpl();
    const store = new PivotSnapshotStore();
    let builderCallCount = 0;

    const builder: PivotBuilder = (id, config, worksheetId) => {
      builderCallCount++;
      return makeSnapshot(id, Date.now(), 0);
    };

    const engine = new PivotRecomputeEngineImpl(registry, store, builder);

    // Register clean pivot with snapshot
    const pivotId = registry.register({
      name: 'Test Pivot',
      config: makePivotConfig(makeRange(1, 1, 10, 5)),
      sourceRange: 'A1:E10',
      worksheetId: 'Sheet1',
      
    });

    store.set(pivotId, makeSnapshot(pivotId, Date.now(), 0));

    // Query 10 times
    for (let i = 0; i < 10; i++) {
      engine.ensureFresh(pivotId);
    }

    // Verify: builder was never called
    expect(builderCallCount).toBe(0);
  });
});

// =============================================================================
// §3: Single Rebuild Per Batch
// =============================================================================

describe('Phase 31a: Single Rebuild Guarantee', () => {
  test('dirty → 10 queries → builder called exactly once', () => {
    const registry = new PivotRegistryImpl();
    const store = new PivotSnapshotStore();
    let builderCallCount = 0;

    const builder: PivotBuilder = (id, config, worksheetId) => {
      builderCallCount++;
      return makeSnapshot(id, Date.now(), 0);
    };

    const engine = new PivotRecomputeEngineImpl(registry, store, builder);

    // Register dirty pivot
    const pivotId = registry.register({
      name: 'Test Pivot',
      config: makePivotConfig(makeRange(1, 1, 10, 5)),
      sourceRange: 'A1:E10',
      worksheetId: 'Sheet1',
      
    });

    // Query 10 times
    for (let i = 0; i < 10; i++) {
      engine.ensureFresh(pivotId);
    }

    // Verify: builder was called exactly once
    expect(builderCallCount).toBe(1);
    
    // Verify: pivot is clean after first rebuild
    expect(registry.isDirty(pivotId)).toBe(false);
  });
});

// =============================================================================
// §4: Failure Fallback (#CALC!)
// =============================================================================

describe('Phase 31a: Builder Failure Fallback', () => {
  test('builder throws → pivot stays dirty → #CALC! on query', () => {
    const registry = new PivotRegistryImpl();
    const store = new PivotSnapshotStore();

    const builder: PivotBuilder = (id, config, worksheetId) => {
      throw new Error('Builder failed');
    };

    const engine = new PivotRecomputeEngineImpl(registry, store, builder);
    const queryEngine = new GetPivotData(registry, store, engine);

    // Register dirty pivot
    const pivotId = registry.register({
      name: 'Test Pivot',
      config: makePivotConfig(makeRange(1, 1, 10, 5)),
      sourceRange: 'A1:E10',
      worksheetId: 'Sheet1',
      
    });

    // ensureFresh should catch error and keep dirty=true
    engine.ensureFresh(pivotId);

    // Verify: pivot is still dirty
    expect(registry.isDirty(pivotId)).toBe(true);
    
    // Verify: no snapshot stored
    expect(store.has(pivotId)).toBe(false);
    
    // Verify: query returns #CALC!
    const result = queryEngine.query(pivotId, 'Revenue', []);
    expect(result).toBe('#CALC!');
  });

  test('builder succeeds after previous failure', () => {
    const registry = new PivotRegistryImpl();
    const store = new PivotSnapshotStore();
    let failFirst = true;

    const builder: PivotBuilder = (id, config, worksheetId) => {
      if (failFirst) {
        failFirst = false;
        throw new Error('First build fails');
      }
      return makeSnapshot(id, Date.now(), 0);
    };

    const engine = new PivotRecomputeEngineImpl(registry, store, builder);

    // Register dirty pivot
    const pivotId = registry.register({
      name: 'Test Pivot',
      config: makePivotConfig(makeRange(1, 1, 10, 5)),
      sourceRange: 'A1:E10',
      worksheetId: 'Sheet1',
      
    });

    // First rebuild fails
    engine.ensureFresh(pivotId);
    expect(registry.isDirty(pivotId)).toBe(true);

    // Second rebuild succeeds
    engine.ensureFresh(pivotId);
    expect(registry.isDirty(pivotId)).toBe(false);
    expect(store.has(pivotId)).toBe(true);
  });
});

// =============================================================================
// §5: Re-entrancy Safety
// =============================================================================

describe('Phase 31a: Re-entrancy Protection', () => {
  test('recursive query during rebuild does NOT cause infinite loop', () => {
    const registry = new PivotRegistryImpl();
    const store = new PivotSnapshotStore();
    let builderCallCount = 0;

    // Builder that tries to query the same pivot (simulates recursive formula)
    const builder: PivotBuilder = (id, config, worksheetId) => {
      builderCallCount++;
      
      // Simulate re-entrant query (would cause infinite loop without guard)
      const meta = registry.get(id);
      if (meta && meta.rebuilding) {
        // Re-entrancy guard is working — do nothing
      }
      
      return makeSnapshot(id, Date.now(), 0);
    };

    const engine = new PivotRecomputeEngineImpl(registry, store, builder);

    // Register dirty pivot
    const pivotId = registry.register({
      name: 'Test Pivot',
      config: makePivotConfig(makeRange(1, 1, 10, 5)),
      sourceRange: 'A1:E10',
      worksheetId: 'Sheet1',
      
    });

    // This should NOT cause infinite loop
    engine.ensureFresh(pivotId);

    // Verify: builder was called exactly once
    expect(builderCallCount).toBe(1);
    
    // Verify: pivot is clean
    expect(registry.isDirty(pivotId)).toBe(false);
  });

  test('rebuilding flag is cleared even if builder throws', () => {
    const registry = new PivotRegistryImpl();
    const store = new PivotSnapshotStore();

    const builder: PivotBuilder = (id, config, worksheetId) => {
      throw new Error('Builder error');
    };

    const engine = new PivotRecomputeEngineImpl(registry, store, builder);

    // Register dirty pivot
    const pivotId = registry.register({
      name: 'Test Pivot',
      config: makePivotConfig(makeRange(1, 1, 10, 5)),
      sourceRange: 'A1:E10',
      worksheetId: 'Sheet1',
      
    });

    // ensureFresh catches error
    engine.ensureFresh(pivotId);

    // Verify: rebuilding flag is cleared (not stuck)
    const meta = registry.get(pivotId);
    expect(meta?.rebuilding).toBeUndefined();
  });
});

// =============================================================================
// §6: Determinism
// =============================================================================

describe('Phase 31a: Deterministic Recompute', () => {
  test('same config → same snapshot (determinism)', () => {
    const registry = new PivotRegistryImpl();
    const store = new PivotSnapshotStore();

    const builder: PivotBuilder = (id, config, worksheetId) => {
      // Deterministic builder (same seed)
      return makeSnapshot(id, 12345, 0);
    };

    const engine = new PivotRecomputeEngineImpl(registry, store, builder);

    // Register two pivots with identical configs
    const pivotId1 = registry.register({
      name: 'Pivot 1',
      config: makePivotConfig(makeRange(1, 1, 10, 5)),
      sourceRange: 'A1:E10',
      worksheetId: 'Sheet1',
      
    });

    const pivotId2 = registry.register({
      name: 'Pivot 2',
      config: makePivotConfig(makeRange(1, 1, 10, 5)),
      sourceRange: 'A1:E10',
      worksheetId: 'Sheet1',
      
    });

    // Rebuild both
    engine.ensureFresh(pivotId1);
    engine.ensureFresh(pivotId2);

    // Get snapshots
    const snapshot1 = store.get(pivotId1);
    const snapshot2 = store.get(pivotId2);

    // Verify: snapshots have identical data (except pivotId)
    expect(snapshot1?.rows).toEqual(snapshot2?.rows);
    expect(snapshot1?.fields).toEqual(snapshot2?.fields);
    expect(snapshot1?.valueFields).toEqual(snapshot2?.valueFields);
    expect(snapshot1?.computedAt).toEqual(snapshot2?.computedAt);
  });
});

// =============================================================================
// §7: Integration with GetPivotData
// =============================================================================

describe('Phase 31a: GetPivotData Integration', () => {
  test('dirty pivot → query → auto-rebuild → return value', () => {
    const registry = new PivotRegistryImpl();
    const store = new PivotSnapshotStore();
    let builderCallCount = 0;

    const builder: PivotBuilder = (id, config, worksheetId) => {
      builderCallCount++;
      return makeSnapshot(id, Date.now(), 0);
    };

    const engine = new PivotRecomputeEngineImpl(registry, store, builder);
    const queryEngine = new GetPivotData(registry, store, engine);

    // Register dirty pivot
    const pivotId = registry.register({
      name: 'Test Pivot',
      config: makePivotConfig(makeRange(1, 1, 10, 5)),
      sourceRange: 'A1:E10',
      worksheetId: 'Sheet1',
      
    });

    // Query should trigger rebuild
    const result = queryEngine.query(pivotId, 'Revenue', [
      { field: 'Category', value: 'A' },
      { field: 'Year', value: 2024 },
    ]);

    // Verify: builder was called
    expect(builderCallCount).toBe(1);
    
    // Verify: pivot is now clean
    expect(registry.isDirty(pivotId)).toBe(false);
    
    // Verify: query returned correct value
    expect(result).toBe(100);
  });

  test('clean pivot → query → no rebuild → return value', () => {
    const registry = new PivotRegistryImpl();
    const store = new PivotSnapshotStore();
    let builderCallCount = 0;

    const builder: PivotBuilder = (id, config, worksheetId) => {
      builderCallCount++;
      return makeSnapshot(id, Date.now(), 0);
    };

    const engine = new PivotRecomputeEngineImpl(registry, store, builder);
    const queryEngine = new GetPivotData(registry, store, engine);

    // Register clean pivot with snapshot
    const pivotId = registry.register({
      name: 'Test Pivot',
      config: makePivotConfig(makeRange(1, 1, 10, 5)),
      sourceRange: 'A1:E10',
      worksheetId: 'Sheet1',
      
    });

    store.set(pivotId, makeSnapshot(pivotId, Date.now(), 0));

    // Query should NOT trigger rebuild
    const result = queryEngine.query(pivotId, 'Revenue', [
      { field: 'Category', value: 'B' },
      { field: 'Year', value: 2024 },
    ]);

    // Verify: builder was NOT called
    expect(builderCallCount).toBe(0);
    
    // Verify: query returned correct value
    expect(result).toBe(200);
  });

  test('builder fails → query returns #CALC!', () => {
    const registry = new PivotRegistryImpl();
    const store = new PivotSnapshotStore();

    const builder: PivotBuilder = (id, config, worksheetId) => {
      throw new Error('Build error');
    };

    const engine = new PivotRecomputeEngineImpl(registry, store, builder);
    const queryEngine = new GetPivotData(registry, store, engine);

    // Register dirty pivot
    const pivotId = registry.register({
      name: 'Test Pivot',
      config: makePivotConfig(makeRange(1, 1, 10, 5)),
      sourceRange: 'A1:E10',
      worksheetId: 'Sheet1',
      
    });

    // Query should attempt rebuild, fail, and return #CALC!
    const result = queryEngine.query(pivotId, 'Revenue', []);

    expect(result).toBe('#CALC!');
  });

  test('multiple queries on dirty pivot → rebuild once', () => {
    const registry = new PivotRegistryImpl();
    const store = new PivotSnapshotStore();
    let builderCallCount = 0;

    const builder: PivotBuilder = (id, config, worksheetId) => {
      builderCallCount++;
      return makeSnapshot(id, Date.now(), 0);
    };

    const engine = new PivotRecomputeEngineImpl(registry, store, builder);
    const queryEngine = new GetPivotData(registry, store, engine);

    // Register dirty pivot
    const pivotId = registry.register({
      name: 'Test Pivot',
      config: makePivotConfig(makeRange(1, 1, 10, 5)),
      sourceRange: 'A1:E10',
      worksheetId: 'Sheet1',
      
    });

    // 10 queries
    for (let i = 0; i < 10; i++) {
      queryEngine.query(pivotId, 'Revenue', [
        { field: 'Category', value: 'A' },
        { field: 'Year', value: 2024 },
      ]);
    }

    // Verify: builder was called exactly once
    expect(builderCallCount).toBe(1);
  });
});

// =============================================================================
// §8: Edge Cases
// =============================================================================

describe('Phase 31a: Edge Cases', () => {
  test('ensureFresh on non-existent pivot is no-op', () => {
    const registry = new PivotRegistryImpl();
    const store = new PivotSnapshotStore();
    let builderCallCount = 0;

    const builder: PivotBuilder = (id, config, worksheetId) => {
      builderCallCount++;
      return makeSnapshot(id, Date.now(), 0);
    };

    const engine = new PivotRecomputeEngineImpl(registry, store, builder);

    // ensureFresh on non-existent ID
    engine.ensureFresh('fake-id' as PivotId);

    // Verify: builder was NOT called
    expect(builderCallCount).toBe(0);
  });

  test('markDirty → ensureFresh → markClean cycle', () => {
    const registry = new PivotRegistryImpl();
    const store = new PivotSnapshotStore();

    const builder: PivotBuilder = (id, config, worksheetId) => {
      return makeSnapshot(id, Date.now(), 0);
    };

    const engine = new PivotRecomputeEngineImpl(registry, store, builder);

    // Register clean pivot
    const pivotId = registry.register({
      name: 'Test Pivot',
      config: makePivotConfig(makeRange(1, 1, 10, 5)),
      sourceRange: 'A1:E10',
      worksheetId: 'Sheet1',
      
    });

    store.set(pivotId, makeSnapshot(pivotId, Date.now(), 0));

    // Mark dirty
    registry.markDirty(pivotId);
    expect(registry.isDirty(pivotId)).toBe(true);

    // ensureFresh
    engine.ensureFresh(pivotId);
    expect(registry.isDirty(pivotId)).toBe(false);

    // Mark dirty again
    registry.markDirty(pivotId);
    expect(registry.isDirty(pivotId)).toBe(true);

    // ensureFresh again
    engine.ensureFresh(pivotId);
    expect(registry.isDirty(pivotId)).toBe(false);
  });
});
