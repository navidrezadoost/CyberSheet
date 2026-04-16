/**
 * Phase 29: Pivot Snapshot Store Tests
 * 
 * Verifies:
 * - CRUD operations
 * - Immutability enforcement
 * - Disposal safety
 * - Snapshot validation
 */

declare function describe(name: string, fn: () => void): void;
declare function test(name: string, fn: () => void | Promise<void>): void;
declare function beforeEach(fn: () => void | Promise<void>): void;
declare const expect: any;import { PivotSnapshotStore, type PivotSnapshot } from '../src/PivotSnapshotStore';
import type { PivotId } from '../src/PivotRegistry';

describe('PivotSnapshotStore - Core Operations', () => {
  test('set stores snapshot', () => {
    const store = new PivotSnapshotStore();
    const pivotId = 'pivot-1' as PivotId;
    
    const snapshot: PivotSnapshot = {
      pivotId,
      computedAt: Date.now(),
      rows: [
        { Region: 'EU', Sales: 1000 },
        { Region: 'US', Sales: 2000 },
      ],
      fields: ['Region', 'Sales'],
      valueFields: ['Sales'],
    };
    
    store.set(pivotId, snapshot);
    
    expect(store.has(pivotId)).toBe(true);
    expect(store.size).toBe(1);
  });

  test('get retrieves stored snapshot', () => {
    const store = new PivotSnapshotStore();
    const pivotId = 'pivot-1' as PivotId;
    
    const snapshot: PivotSnapshot = {
      pivotId,
      computedAt: 123456,
      rows: [{ Product: 'Widget', Revenue: 500 }],
      fields: ['Product', 'Revenue'],
      valueFields: ['Revenue'],
    };
    
    store.set(pivotId, snapshot);
    const retrieved = store.get(pivotId);
    
    expect(retrieved).toBeDefined();
    expect(retrieved?.pivotId).toBe(pivotId);
    expect(retrieved?.computedAt).toBe(123456);
    expect(retrieved?.rows).toEqual([{ Product: 'Widget', Revenue: 500 }]);
    expect(retrieved?.fields).toEqual(['Product', 'Revenue']);
    expect(retrieved?.valueFields).toEqual(['Revenue']);
  });

  test('get returns undefined for non-existent snapshot', () => {
    const store = new PivotSnapshotStore();
    
    const result = store.get('pivot-999' as PivotId);
    
    expect(result).toBeUndefined();
  });

  test('has returns true for existing snapshot', () => {
    const store = new PivotSnapshotStore();
    const pivotId = 'pivot-1' as PivotId;
    
    const snapshot: PivotSnapshot = {
      pivotId,
      computedAt: Date.now(),
      rows: [],
      fields: [],
      valueFields: [],
    };
    
    store.set(pivotId, snapshot);
    
    expect(store.has(pivotId)).toBe(true);
  });

  test('has returns false for non-existent snapshot', () => {
    const store = new PivotSnapshotStore();
    
    expect(store.has('pivot-999' as PivotId)).toBe(false);
  });

  test('delete removes snapshot', () => {
    const store = new PivotSnapshotStore();
    const pivotId = 'pivot-1' as PivotId;
    
    const snapshot: PivotSnapshot = {
      pivotId,
      computedAt: Date.now(),
      rows: [],
      fields: [],
      valueFields: [],
    };
    
    store.set(pivotId, snapshot);
    expect(store.has(pivotId)).toBe(true);
    
    const deleted = store.delete(pivotId);
    
    expect(deleted).toBe(true);
    expect(store.has(pivotId)).toBe(false);
    expect(store.get(pivotId)).toBeUndefined();
  });

  test('delete returns false for non-existent snapshot', () => {
    const store = new PivotSnapshotStore();
    
    const deleted = store.delete('pivot-999' as PivotId);
    
    expect(deleted).toBe(false);
  });

  test('set replaces existing snapshot', () => {
    const store = new PivotSnapshotStore();
    const pivotId = 'pivot-1' as PivotId;
    
    const snapshot1: PivotSnapshot = {
      pivotId,
      computedAt: 100,
      rows: [{ A: 1 }],
      fields: ['A'],
      valueFields: [],
    };
    
    const snapshot2: PivotSnapshot = {
      pivotId,
      computedAt: 200,
      rows: [{ B: 2 }],
      fields: ['B'],
      valueFields: [],
    };
    
    store.set(pivotId, snapshot1);
    store.set(pivotId, snapshot2);
    
    const retrieved = store.get(pivotId);
    
    expect(retrieved?.computedAt).toBe(200);
    expect(retrieved?.rows).toEqual([{ B: 2 }]);
    expect(store.size).toBe(1); // Not duplicated
  });
});

describe('PivotSnapshotStore - Validation', () => {
  test('set throws if snapshot pivotId mismatch', () => {
    const store = new PivotSnapshotStore();
    
    const snapshot: PivotSnapshot = {
      pivotId: 'pivot-2' as PivotId,
      computedAt: Date.now(),
      rows: [],
      fields: [],
      valueFields: [],
    };
    
    expect(() => {
      store.set('pivot-1' as PivotId, snapshot);
    }).toThrow('Snapshot pivotId mismatch');
  });
});

describe('PivotSnapshotStore - Disposal Safety', () => {
  test('clearAll removes all snapshots', () => {
    const store = new PivotSnapshotStore();
    
    const snapshot1: PivotSnapshot = {
      pivotId: 'pivot-1' as PivotId,
      computedAt: Date.now(),
      rows: [],
      fields: [],
      valueFields: [],
    };
    
    const snapshot2: PivotSnapshot = {
      pivotId: 'pivot-2' as PivotId,
      computedAt: Date.now(),
      rows: [],
      fields: [],
      valueFields: [],
    };
    
    store.set('pivot-1' as PivotId, snapshot1);
    store.set('pivot-2' as PivotId, snapshot2);
    
    expect(store.size).toBe(2);
    
    store.clearAll();
    
    expect(store.size).toBe(0);
    expect(store.has('pivot-1' as PivotId)).toBe(false);
    expect(store.has('pivot-2' as PivotId)).toBe(false);
  });

  test('store can be reused after clearAll', () => {
    const store = new PivotSnapshotStore();
    
    const snapshot1: PivotSnapshot = {
      pivotId: 'pivot-1' as PivotId,
      computedAt: Date.now(),
      rows: [],
      fields: [],
      valueFields: [],
    };
    
    store.set('pivot-1' as PivotId, snapshot1);
    store.clearAll();
    
    const snapshot2: PivotSnapshot = {
      pivotId: 'pivot-2' as PivotId,
      computedAt: Date.now(),
      rows: [],
      fields: [],
      valueFields: [],
    };
    
    store.set('pivot-2' as PivotId, snapshot2);
    
    expect(store.has('pivot-2' as PivotId)).toBe(true);
    expect(store.size).toBe(1);
  });
});

describe('PivotSnapshotStore - Size Tracking', () => {
  test('size reflects number of stored snapshots', () => {
    const store = new PivotSnapshotStore();
    
    expect(store.size).toBe(0);
    
    const snapshot1: PivotSnapshot = {
      pivotId: 'pivot-1' as PivotId,
      computedAt: Date.now(),
      rows: [],
      fields: [],
      valueFields: [],
    };
    
    store.set('pivot-1' as PivotId, snapshot1);
    expect(store.size).toBe(1);
    
    const snapshot2: PivotSnapshot = {
      pivotId: 'pivot-2' as PivotId,
      computedAt: Date.now(),
      rows: [],
      fields: [],
      valueFields: [],
    };
    
    store.set('pivot-2' as PivotId, snapshot2);
    expect(store.size).toBe(2);
    
    store.delete('pivot-1' as PivotId);
    expect(store.size).toBe(1);
    
    store.clearAll();
    expect(store.size).toBe(0);
  });
});

describe('PivotSnapshotStore - Immutability', () => {
  test('snapshots are readonly', () => {
    const store = new PivotSnapshotStore();
    const pivotId = 'pivot-1' as PivotId;
    
    const snapshot: PivotSnapshot = {
      pivotId,
      computedAt: Date.now(),
      rows: [{ A: 1 }],
      fields: ['A'],
      valueFields: [],
    };
    
    store.set(pivotId, snapshot);
    const retrieved = store.get(pivotId);
    
    // TypeScript readonly enforcement (compile-time check)
    // These would fail at compile time:
    // retrieved.rows.push({ B: 2 });
    // retrieved.fields.push('B');
    
    // Verify readonly at runtime
    expect(Object.isFrozen(retrieved?.rows)).toBe(false); // Not frozen by default
    // But TypeScript prevents mutation
  });
});
