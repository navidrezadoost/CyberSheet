/**
 * Phase 29b: GETPIVOTDATA Tests
 * 
 * Verifies:
 * - Deterministic 6-step algorithm
 * - Strict equality matching
 * - Error handling (#REF!, #VALUE!, #N/A)
 * - Edge cases (null, type coercion, missing fields)
 * - Performance sanity
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { GetPivotData } from '../src/GetPivotData';
import { PivotRegistryImpl, type PivotId } from '../src/PivotRegistry';
import { PivotSnapshotStore, type PivotSnapshot } from '../src/PivotSnapshotStore';
import type { PivotConfig } from '../src/PivotEngine';

describe('GetPivotData - Basic Query', () => {
  let registry: PivotRegistryImpl;
  let snapshotStore: PivotSnapshotStore;
  let engine: GetPivotData;
  let pivotId: PivotId;

  beforeEach(() => {
    registry = new PivotRegistryImpl();
    snapshotStore = new PivotSnapshotStore();
    engine = new GetPivotData(registry, snapshotStore);

    // Register pivot
    const config: PivotConfig = {
      rows: [{ column: 0, label: 'Region' }],
      columns: [],
      values: [{ type: 'aggregate', column: 1, aggregation: 'sum', label: 'Revenue' }],
      sourceRange: { start: { row: 0, col: 0 }, end: { row: 10, col: 1 } },
    };

    pivotId = registry.register({
      name: 'Sales Pivot',
      config,
      sourceRange: 'A1:B11',
      worksheetId: 'ws1',
    });

    // Store snapshot
    const snapshot: PivotSnapshot = {
      pivotId,
      computedAt: Date.now(),
      rows: [
        { Region: 'EU', Revenue: 1000 },
        { Region: 'US', Revenue: 2000 },
        { Region: 'APAC', Revenue: 1500 },
      ],
      fields: ['Region', 'Revenue'],
      valueFields: ['Revenue'],
    };

    snapshotStore.set(pivotId, snapshot);
  });

  test('basic match - single filter', () => {
    const result = engine.query(pivotId, 'Revenue', [
      { field: 'Region', value: 'EU' }
    ]);

    expect(result).toBe(1000);
  });

  test('basic match - exact value', () => {
    const result = engine.query(pivotId, 'Revenue', [
      { field: 'Region', value: 'US' }
    ]);

    expect(result).toBe(2000);
  });

  test('no filters - single row snapshot', () => {
    // Create single-row snapshot
    const singlePivotId = registry.register({
      name: 'Single',
      config: { rows: [], columns: [], values: [], sourceRange: { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } } },
      sourceRange: 'A1:A1',
      worksheetId: 'ws1',
    });

    const snapshot: PivotSnapshot = {
      pivotId: singlePivotId,
      computedAt: Date.now(),
      rows: [{ Total: 5000 }],
      fields: ['Total'],
      valueFields: ['Total'],
    };

    snapshotStore.set(singlePivotId, snapshot);

    const result = engine.query(singlePivotId, 'Total', []);

    expect(result).toBe(5000);
  });
});

describe('GetPivotData - Error Cases', () => {
  let registry: PivotRegistryImpl;
  let snapshotStore: PivotSnapshotStore;
  let engine: GetPivotData;

  beforeEach(() => {
    registry = new PivotRegistryImpl();
    snapshotStore = new PivotSnapshotStore();
    engine = new GetPivotData(registry, snapshotStore);
  });

  test('missing pivot returns #REF!', () => {
    const result = engine.query('pivot-999' as PivotId, 'Revenue', []);

    expect(result).toBe('#REF!');
  });

  test('missing snapshot returns #REF!', () => {
    // Register pivot but don't store snapshot
    const pivotId = registry.register({
      name: 'Unbuild',
      config: { rows: [], columns: [], values: [], sourceRange: { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } } },
      sourceRange: 'A1:A1',
      worksheetId: 'ws1',
    });

    const result = engine.query(pivotId, 'Revenue', []);

    expect(result).toBe('#REF!'); // No implicit rebuild
  });

  test('invalid value field returns #REF!', () => {
    const pivotId = registry.register({
      name: 'Test',
      config: { rows: [], columns: [], values: [], sourceRange: { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } } },
      sourceRange: 'A1:A1',
      worksheetId: 'ws1',
    });

    const snapshot: PivotSnapshot = {
      pivotId,
      computedAt: Date.now(),
      rows: [{ Region: 'EU', Revenue: 1000 }],
      fields: ['Region', 'Revenue'],
      valueFields: ['Revenue'],
    };

    snapshotStore.set(pivotId, snapshot);

    const result = engine.query(pivotId, 'Profit', []); // Field doesn't exist

    expect(result).toBe('#REF!');
  });

  test('invalid filter field returns #REF!', () => {
    const pivotId = registry.register({
      name: 'Test',
      config: { rows: [], columns: [], values: [], sourceRange: { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } } },
      sourceRange: 'A1:A1',
      worksheetId: 'ws1',
    });

    const snapshot: PivotSnapshot = {
      pivotId,
      computedAt: Date.now(),
      rows: [{ Region: 'EU', Revenue: 1000 }],
      fields: ['Region', 'Revenue'],
      valueFields: ['Revenue'],
    };

    snapshotStore.set(pivotId, snapshot);

    const result = engine.query(pivotId, 'Revenue', [
      { field: 'Country', value: 'France' } // Field doesn't exist
    ]);

    expect(result).toBe('#REF!');
  });

  test('no matching rows returns #N/A', () => {
    const pivotId = registry.register({
      name: 'Test',
      config: { rows: [], columns: [], values: [], sourceRange: { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } } },
      sourceRange: 'A1:A1',
      worksheetId: 'ws1',
    });

    const snapshot: PivotSnapshot = {
      pivotId,
      computedAt: Date.now(),
      rows: [
        { Region: 'EU', Revenue: 1000 },
        { Region: 'US', Revenue: 2000 },
      ],
      fields: ['Region', 'Revenue'],
      valueFields: ['Revenue'],
    };

    snapshotStore.set(pivotId, snapshot);

    const result = engine.query(pivotId, 'Revenue', [
      { field: 'Region', value: 'ASIA' } // No match
    ]);

    expect(result).toBe('#N/A');
  });

  test('multiple matching rows returns #VALUE!', () => {
    const pivotId = registry.register({
      name: 'Test',
      config: { rows: [], columns: [], values: [], sourceRange: { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } } },
      sourceRange: 'A1:A1',
      worksheetId: 'ws1',
    });

    const snapshot: PivotSnapshot = {
      pivotId,
      computedAt: Date.now(),
      rows: [
        { Year: 2024, Revenue: 1000 },
        { Year: 2024, Revenue: 2000 }, // Duplicate year
        { Year: 2025, Revenue: 1500 },
      ],
      fields: ['Year', 'Revenue'],
      valueFields: ['Revenue'],
    };

    snapshotStore.set(pivotId, snapshot);

    const result = engine.query(pivotId, 'Revenue', [
      { field: 'Year', value: 2024 } // Matches 2 rows
    ]);

    expect(result).toBe('#VALUE!'); // Ambiguous
  });

  test('empty filters with multiple rows returns #VALUE!', () => {
    const pivotId = registry.register({
      name: 'Test',
      config: { rows: [], columns: [], values: [], sourceRange: { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } } },
      sourceRange: 'A1:A1',
      worksheetId: 'ws1',
    });

    const snapshot: PivotSnapshot = {
      pivotId,
      computedAt: Date.now(),
      rows: [
        { Region: 'EU', Revenue: 1000 },
        { Region: 'US', Revenue: 2000 },
      ],
      fields: ['Region', 'Revenue'],
      valueFields: ['Revenue'],
    };

    snapshotStore.set(pivotId, snapshot);

    const result = engine.query(pivotId, 'Revenue', []); // No filters

    expect(result).toBe('#VALUE!'); // Multiple rows, no filter
  });

  test('empty snapshot returns #N/A', () => {
    const pivotId = registry.register({
      name: 'Test',
      config: { rows: [], columns: [], values: [], sourceRange: { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } } },
      sourceRange: 'A1:A1',
      worksheetId: 'ws1',
    });

    const snapshot: PivotSnapshot = {
      pivotId,
      computedAt: Date.now(),
      rows: [], // Empty
      fields: ['Revenue'],
      valueFields: ['Revenue'],
    };

    snapshotStore.set(pivotId, snapshot);

    const result = engine.query(pivotId, 'Revenue', []);

    expect(result).toBe('#N/A');
  });
});

describe('GetPivotData - Type Strictness', () => {
  let registry: PivotRegistryImpl;
  let snapshotStore: PivotSnapshotStore;
  let engine: GetPivotData;

  beforeEach(() => {
    registry = new PivotRegistryImpl();
    snapshotStore = new PivotSnapshotStore();
    engine = new GetPivotData(registry, snapshotStore);
  });

  test('string vs number - no match', () => {
    const pivotId = registry.register({
      name: 'Test',
      config: { rows: [], columns: [], values: [], sourceRange: { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } } },
      sourceRange: 'A1:A1',
      worksheetId: 'ws1',
    });

    const snapshot: PivotSnapshot = {
      pivotId,
      computedAt: Date.now(),
      rows: [
        { Year: 2024, Revenue: 1000 }, // Year is number
      ],
      fields: ['Year', 'Revenue'],
      valueFields: ['Revenue'],
    };

    snapshotStore.set(pivotId, snapshot);

    const result = engine.query(pivotId, 'Revenue', [
      { field: 'Year', value: '2024' } // String filter
    ]);

    expect(result).toBe('#N/A'); // No type coercion
  });

  test('number vs string - no match', () => {
    const pivotId = registry.register({
      name: 'Test',
      config: { rows: [], columns: [], values: [], sourceRange: { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } } },
      sourceRange: 'A1:A1',
      worksheetId: 'ws1',
    });

    const snapshot: PivotSnapshot = {
      pivotId,
      computedAt: Date.now(),
      rows: [
        { Product: 'Widget', Revenue: 1000 }, // Product is string
      ],
      fields: ['Product', 'Revenue'],
      valueFields: ['Revenue'],
    };

    snapshotStore.set(pivotId, snapshot);

    const result = engine.query(pivotId, 'Revenue', [
      { field: 'Product', value: 1 } // Number filter
    ]);

    expect(result).toBe('#N/A'); // No type coercion
  });

  test('exact string match', () => {
    const pivotId = registry.register({
      name: 'Test',
      config: { rows: [], columns: [], values: [], sourceRange: { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } } },
      sourceRange: 'A1:A1',
      worksheetId: 'ws1',
    });

    const snapshot: PivotSnapshot = {
      pivotId,
      computedAt: Date.now(),
      rows: [
        { Region: 'EU', Revenue: 1000 },
      ],
      fields: ['Region', 'Revenue'],
      valueFields: ['Revenue'],
    };

    snapshotStore.set(pivotId, snapshot);

    const result = engine.query(pivotId, 'Revenue', [
      { field: 'Region', value: 'EU' }
    ]);

    expect(result).toBe(1000);
  });

  test('exact number match', () => {
    const pivotId = registry.register({
      name: 'Test',
      config: { rows: [], columns: [], values: [], sourceRange: { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } } },
      sourceRange: 'A1:A1',
      worksheetId: 'ws1',
    });

    const snapshot: PivotSnapshot = {
      pivotId,
      computedAt: Date.now(),
      rows: [
        { Year: 2024, Revenue: 1000 },
      ],
      fields: ['Year', 'Revenue'],
      valueFields: ['Revenue'],
    };

    snapshotStore.set(pivotId, snapshot);

    const result = engine.query(pivotId, 'Revenue', [
      { field: 'Year', value: 2024 }
    ]);

    expect(result).toBe(1000);
  });
});

describe('GetPivotData - Null Handling', () => {
  let registry: PivotRegistryImpl;
  let snapshotStore: PivotSnapshotStore;
  let engine: GetPivotData;

  beforeEach(() => {
    registry = new PivotRegistryImpl();
    snapshotStore = new PivotSnapshotStore();
    engine = new GetPivotData(registry, snapshotStore);
  });

  test('null === null - match', () => {
    const pivotId = registry.register({
      name: 'Test',
      config: { rows: [], columns: [], values: [], sourceRange: { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } } },
      sourceRange: 'A1:A1',
      worksheetId: 'ws1',
    });

    const snapshot: PivotSnapshot = {
      pivotId,
      computedAt: Date.now(),
      rows: [
        { Region: null, Revenue: 1000 },
      ],
      fields: ['Region', 'Revenue'],
      valueFields: ['Revenue'],
    };

    snapshotStore.set(pivotId, snapshot);

    const result = engine.query(pivotId, 'Revenue', [
      { field: 'Region', value: null }
    ]);

    expect(result).toBe(1000);
  });

  test('missing field in row - no match against null filter', () => {
    const pivotId = registry.register({
      name: 'Test',
      config: { rows: [], columns: [], values: [], sourceRange: { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } } },
      sourceRange: 'A1:A1',
      worksheetId: 'ws1',
    });

    // Row has Region and Revenue, but missing Product field
    const snapshot: PivotSnapshot = {
      pivotId,
      computedAt: Date.now(),
      rows: [
        { Region: 'East', Revenue: 1000 }, // No Product field
      ],
      fields: ['Region', 'Revenue'], // Product not in fields
      valueFields: ['Revenue'],
    };

    snapshotStore.set(pivotId, snapshot);

    const result = engine.query(pivotId, 'Revenue', [
      { field: 'Region', value: 'East' }
    ]);

    // Should match because Region=East
    expect(result).toBe(1000);
  });

  test('null !== "null" - no match', () => {
    const pivotId = registry.register({
      name: 'Test',
      config: { rows: [], columns: [], values: [], sourceRange: { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } } },
      sourceRange: 'A1:A1',
      worksheetId: 'ws1',
    });

    const snapshot: PivotSnapshot = {
      pivotId,
      computedAt: Date.now(),
      rows: [
        { Region: null, Revenue: 1000 },
      ],
      fields: ['Region', 'Revenue'],
      valueFields: ['Revenue'],
    };

    snapshotStore.set(pivotId, snapshot);

    const result = engine.query(pivotId, 'Revenue', [
      { field: 'Region', value: 'null' as any }
    ]);

    expect(result).toBe('#N/A'); // null !== "null"
  });

  test('missing field in row - no match', () => {
    const pivotId = registry.register({
      name: 'Test',
      config: { rows: [], columns: [], values: [], sourceRange: { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } } },
      sourceRange: 'A1:A1',
      worksheetId: 'ws1',
    });

    const snapshot: PivotSnapshot = {
      pivotId,
      computedAt: Date.now(),
      rows: [
        { Revenue: 1000 }, // Region field missing
      ],
      fields: ['Region', 'Revenue'],
      valueFields: ['Revenue'],
    };

    snapshotStore.set(pivotId, snapshot);

    const result = engine.query(pivotId, 'Revenue', [
      { field: 'Region', value: 'EU' }
    ]);

    expect(result).toBe('#N/A'); // Missing field doesn't match
  });
});

describe('GetPivotData - Multiple Filters', () => {
  let registry: PivotRegistryImpl;
  let snapshotStore: PivotSnapshotStore;
  let engine: GetPivotData;

  beforeEach(() => {
    registry = new PivotRegistryImpl();
    snapshotStore = new PivotSnapshotStore();
    engine = new GetPivotData(registry, snapshotStore);
  });

  test('AND logic - all filters must match', () => {
    const pivotId = registry.register({
      name: 'Test',
      config: { rows: [], columns: [], values: [], sourceRange: { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } } },
      sourceRange: 'A1:A1',
      worksheetId: 'ws1',
    });

    const snapshot: PivotSnapshot = {
      pivotId,
      computedAt: Date.now(),
      rows: [
        { Region: 'EU', Year: 2024, Revenue: 1000 },
        { Region: 'EU', Year: 2025, Revenue: 1500 },
        { Region: 'US', Year: 2024, Revenue: 2000 },
      ],
      fields: ['Region', 'Year', 'Revenue'],
      valueFields: ['Revenue'],
    };

    snapshotStore.set(pivotId, snapshot);

    const result = engine.query(pivotId, 'Revenue', [
      { field: 'Region', value: 'EU' },
      { field: 'Year', value: 2024 }
    ]);

    expect(result).toBe(1000);
  });

  test('partial match - no result', () => {
    const pivotId = registry.register({
      name: 'Test',
      config: { rows: [], columns: [], values: [], sourceRange: { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } } },
      sourceRange: 'A1:A1',
      worksheetId: 'ws1',
    });

    const snapshot: PivotSnapshot = {
      pivotId,
      computedAt: Date.now(),
      rows: [
        { Region: 'EU', Year: 2024, Revenue: 1000 },
        { Region: 'US', Year: 2025, Revenue: 2000 },
      ],
      fields: ['Region', 'Year', 'Revenue'],
      valueFields: ['Revenue'],
    };

    snapshotStore.set(pivotId, snapshot);

    const result = engine.query(pivotId, 'Revenue', [
      { field: 'Region', value: 'EU' },
      { field: 'Year', value: 2025 } // EU + 2025 doesn't exist
    ]);

    expect(result).toBe('#N/A');
  });
});

describe('GetPivotData - Performance Sanity', () => {
  test('large dataset - O(n) filtering', () => {
    const registry = new PivotRegistryImpl();
    const snapshotStore = new PivotSnapshotStore();
    const engine = new GetPivotData(registry, snapshotStore);

    const pivotId = registry.register({
      name: 'Large',
      config: { rows: [], columns: [], values: [], sourceRange: { start: { row: 0, col: 0 }, end: { row: 10000, col: 1 } } },
      sourceRange: 'A1:B10001',
      worksheetId: 'ws1',
    });

    // Generate 10,000 rows
    const rows = [];
    for (let i = 0; i < 10000; i++) {
      rows.push({
        Region: `Region${i % 100}`,
        Revenue: i * 100,
      });
    }

    const snapshot: PivotSnapshot = {
      pivotId,
      computedAt: Date.now(),
      rows,
      fields: ['Region', 'Revenue'],
      valueFields: ['Revenue'],
    };

    snapshotStore.set(pivotId, snapshot);

    const start = Date.now();
    const result = engine.query(pivotId, 'Revenue', [
      { field: 'Region', value: 'Region50' }
    ]);
    const duration = Date.now() - start;

    // Should complete in reasonable time (< 100ms for 10k rows)
    expect(duration).toBeLessThan(100);
    
    // Verify correctness
    expect(result).toBe(5000); // First match: row 50
  });
});
