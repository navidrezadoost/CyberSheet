/**
 * pivot-staleness.test.ts
 * 
 * Phase 30a: Staleness Tracking Tests
 * Validates dirty flag system and #CALC! error semantics
 * 
 * Test Coverage:
 * 1. Registry Staleness API (markDirty, markClean, isDirty)
 * 2. GETPIVOTDATA with stale pivots (#CALC! error)
 * 3. Lifecycle: register → build → dirty → rebuild
 * 4. Edge cases (missing pivots, multiple cycles)
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { PivotRegistryImpl } from '../src/PivotRegistry';
import { PivotSnapshotStore } from '../src/PivotSnapshotStore';
import { GetPivotData } from '../src/GetPivotData';
import type { PivotId } from '../src/PivotRegistry';
import type { PivotSnapshot } from '../src/PivotSnapshotStore';

describe('Phase 30a: Staleness Tracking', () => {
  let registry: PivotRegistryImpl;
  let snapshotStore: PivotSnapshotStore;
  let engine: GetPivotData;

  beforeEach(() => {
    registry = new PivotRegistryImpl();
    snapshotStore = new PivotSnapshotStore();
    engine = new GetPivotData(registry, snapshotStore);
  });

  // =========================================================================
  // Registry Staleness API
  // =========================================================================

  describe('Registry Staleness API', () => {
    test('new pivots start clean (dirty: false)', () => {
      const id = registry.register({
        name: 'Test',
        config: { rows: [], columns: [], values: [], sourceRange: { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } } },
        sourceRange: 'A1:A1',
        worksheetId: 'ws1',
      });

      const metadata = registry.get(id);
      expect(metadata?.dirty).toBe(false);
      expect(metadata?.lastBuiltAt).toBeUndefined();
    });

    test('markDirty sets dirty flag', () => {
      const id = registry.register({
        name: 'Test',
        config: { rows: [], columns: [], values: [], sourceRange: { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } } },
        sourceRange: 'A1:A1',
        worksheetId: 'ws1',
      });

      registry.markDirty(id);

      const metadata = registry.get(id);
      expect(metadata?.dirty).toBe(true);
    });

    test('markClean clears dirty flag and sets timestamp', () => {
      const id = registry.register({
        name: 'Test',
        config: { rows: [], columns: [], values: [], sourceRange: { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } } },
        sourceRange: 'A1:A1',
        worksheetId: 'ws1',
      });

      registry.markDirty(id);

      const timestamp = Date.now();
      registry.markClean(id, timestamp);

      const metadata = registry.get(id);
      expect(metadata?.dirty).toBe(false);
      expect(metadata?.lastBuiltAt).toBe(timestamp);
    });

    test('isDirty returns correct state', () => {
      const id = registry.register({
        name: 'Test',
        config: { rows: [], columns: [], values: [], sourceRange: { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } } },
        sourceRange: 'A1:A1',
        worksheetId: 'ws1',
      });

      expect(registry.isDirty(id)).toBe(false);

      registry.markDirty(id);
      expect(registry.isDirty(id)).toBe(true);

      registry.markClean(id, Date.now());
      expect(registry.isDirty(id)).toBe(false);
    });

    test('isDirty returns true for missing pivots (conservative)', () => {
      const missingId = 'pivot-999' as PivotId;
      expect(registry.isDirty(missingId)).toBe(true);
    });

    test('markDirty on missing pivot is no-op (graceful)', () => {
      const missingId = 'pivot-999' as PivotId;
      expect(() => registry.markDirty(missingId)).not.toThrow();
    });

    test('markClean on missing pivot is no-op (graceful)', () => {
      const missingId = 'pivot-999' as PivotId;
      expect(() => registry.markClean(missingId, Date.now())).not.toThrow();
    });

    test('multiple dirty/clean cycles work correctly', () => {
      const id = registry.register({
        name: 'Test',
        config: { rows: [], columns: [], values: [], sourceRange: { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } } },
        sourceRange: 'A1:A1',
        worksheetId: 'ws1',
      });

      const t1 = Date.now();
      registry.markClean(id, t1);
      expect(registry.get(id)?.lastBuiltAt).toBe(t1);

      registry.markDirty(id);
      expect(registry.get(id)?.dirty).toBe(true);
      expect(registry.get(id)?.lastBuiltAt).toBe(t1); // Timestamp preserved

      const t2 = Date.now() + 1000;
      registry.markClean(id, t2);
      expect(registry.get(id)?.dirty).toBe(false);
      expect(registry.get(id)?.lastBuiltAt).toBe(t2); // Timestamp updated
    });
  });

  // =========================================================================
  // GETPIVOTDATA with Stale Pivots
  // =========================================================================

  describe('GETPIVOTDATA Staleness Gate', () => {
    test('clean pivot with snapshot returns value', () => {
      const id = registry.register({
        name: 'Test',
        config: { rows: [], columns: [], values: [], sourceRange: { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } } },
        sourceRange: 'A1:A1',
        worksheetId: 'ws1',
      });

      const snapshot: PivotSnapshot = {
        pivotId: id,
        computedAt: Date.now(),
        rows: [
          { Region: 'East', Revenue: 1000 },
        ],
        fields: ['Region', 'Revenue'],
        valueFields: ['Revenue'],
      };

      snapshotStore.set(id, snapshot);
      registry.markClean(id, snapshot.computedAt);

      const result = engine.query(id, 'Revenue', [
        { field: 'Region', value: 'East' }
      ]);

      expect(result).toBe(1000);
    });

    test('dirty pivot returns #CALC! (staleness gate)', () => {
      const id = registry.register({
        name: 'Test',
        config: { rows: [], columns: [], values: [], sourceRange: { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } } },
        sourceRange: 'A1:A1',
        worksheetId: 'ws1',
      });

      const snapshot: PivotSnapshot = {
        pivotId: id,
        computedAt: Date.now(),
        rows: [
          { Region: 'East', Revenue: 1000 },
        ],
        fields: ['Region', 'Revenue'],
        valueFields: ['Revenue'],
      };

      snapshotStore.set(id, snapshot);
      registry.markDirty(id); // Mark as dirty

      const result = engine.query(id, 'Revenue', [
        { field: 'Region', value: 'East' }
      ]);

      expect(result).toBe('#CALC!');
    });

    test('dirty pivot returns #CALC! even with valid snapshot', () => {
      const id = registry.register({
        name: 'Test',
        config: { rows: [], columns: [], values: [], sourceRange: { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } } },
        sourceRange: 'A1:A1',
        worksheetId: 'ws1',
      });

      // Valid snapshot exists
      const snapshot: PivotSnapshot = {
        pivotId: id,
        computedAt: Date.now(),
        rows: [
          { Region: 'East', Revenue: 1000 },
          { Region: 'West', Revenue: 2000 },
        ],
        fields: ['Region', 'Revenue'],
        valueFields: ['Revenue'],
      };

      snapshotStore.set(id, snapshot);
      registry.markDirty(id); // But pivot is dirty

      // Should return #CALC! regardless of snapshot validity
      const result = engine.query(id, 'Revenue', [
        { field: 'Region', value: 'East' }
      ]);

      expect(result).toBe('#CALC!');
    });

    test('missing pivot returns #REF! (not #CALC!)', () => {
      const missingId = 'pivot-999' as PivotId;
      const result = engine.query(missingId, 'Revenue', []);
      expect(result).toBe('#REF!');
    });

    test('clean pivot without snapshot returns #REF!', () => {
      const id = registry.register({
        name: 'Test',
        config: { rows: [], columns: [], values: [], sourceRange: { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } } },
        sourceRange: 'A1:A1',
        worksheetId: 'ws1',
      });

      // No snapshot set
      registry.markClean(id, Date.now());

      const result = engine.query(id, 'Revenue', []);
      expect(result).toBe('#REF!');
    });
  });

  // =========================================================================
  // Lifecycle Integration
  // =========================================================================

  describe('Lifecycle Integration', () => {
    test('register → build → markClean lifecycle', () => {
      // Step 1: Register pivot (starts clean)
      const id = registry.register({
        name: 'Sales',
        config: { rows: [], columns: [], values: [], sourceRange: { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } } },
        sourceRange: 'A1:D100',
        worksheetId: 'ws1',
      });

      expect(registry.isDirty(id)).toBe(false);

      // Step 2: Build pivot (simulate)
      const snapshot: PivotSnapshot = {
        pivotId: id,
        computedAt: Date.now(),
        rows: [{ Region: 'East', Revenue: 1000 }],
        fields: ['Region', 'Revenue'],
        valueFields: ['Revenue'],
      };

      snapshotStore.set(id, snapshot);

      // Step 3: Mark clean with timestamp
      registry.markClean(id, snapshot.computedAt);

      // Verify state
      const metadata = registry.get(id);
      expect(metadata?.dirty).toBe(false);
      expect(metadata?.lastBuiltAt).toBe(snapshot.computedAt);

      // Query should succeed
      const result = engine.query(id, 'Revenue', [
        { field: 'Region', value: 'East' }
      ]);
      expect(result).toBe(1000);
    });

    test('data change → markDirty → rebuild → markClean lifecycle', () => {
      const id = registry.register({
        name: 'Sales',
        config: { rows: [], columns: [], values: [], sourceRange: { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } } },
        sourceRange: 'A1:D100',
        worksheetId: 'ws1',
      });

      // Initial build
      const snapshot1: PivotSnapshot = {
        pivotId: id,
        computedAt: Date.now(),
        rows: [{ Region: 'East', Revenue: 1000 }],
        fields: ['Region', 'Revenue'],
        valueFields: ['Revenue'],
      };

      snapshotStore.set(id, snapshot1);
      registry.markClean(id, snapshot1.computedAt);

      // Query works
      expect(engine.query(id, 'Revenue', [{ field: 'Region', value: 'East' }])).toBe(1000);

      // Source data changes (user action)
      registry.markDirty(id);

      // Query now fails with #CALC!
      expect(engine.query(id, 'Revenue', [{ field: 'Region', value: 'East' }])).toBe('#CALC!');

      // User rebuilds pivot
      const snapshot2: PivotSnapshot = {
        pivotId: id,
        computedAt: Date.now() + 1000,
        rows: [{ Region: 'East', Revenue: 2000 }], // Updated data
        fields: ['Region', 'Revenue'],
        valueFields: ['Revenue'],
      };

      snapshotStore.set(id, snapshot2);
      registry.markClean(id, snapshot2.computedAt);

      // Query works again with new data
      expect(engine.query(id, 'Revenue', [{ field: 'Region', value: 'East' }])).toBe(2000);
    });

    test('lastBuiltAt updates on each rebuild', () => {
      const id = registry.register({
        name: 'Test',
        config: { rows: [], columns: [], values: [], sourceRange: { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } } },
        sourceRange: 'A1:A1',
        worksheetId: 'ws1',
      });

      const t1 = 1000;
      registry.markClean(id, t1);
      expect(registry.get(id)?.lastBuiltAt).toBe(t1);

      registry.markDirty(id);

      const t2 = 2000;
      registry.markClean(id, t2);
      expect(registry.get(id)?.lastBuiltAt).toBe(t2);

      registry.markDirty(id);

      const t3 = 3000;
      registry.markClean(id, t3);
      expect(registry.get(id)?.lastBuiltAt).toBe(t3);
    });
  });

  // =========================================================================
  // Edge Cases
  // =========================================================================

  describe('Edge Cases', () => {
    test('markDirty preserves lastBuiltAt timestamp', () => {
      const id = registry.register({
        name: 'Test',
        config: { rows: [], columns: [], values: [], sourceRange: { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } } },
        sourceRange: 'A1:A1',
        worksheetId: 'ws1',
      });

      const buildTime = Date.now();
      registry.markClean(id, buildTime);

      registry.markDirty(id);

      const metadata = registry.get(id);
      expect(metadata?.dirty).toBe(true);
      expect(metadata?.lastBuiltAt).toBe(buildTime); // Timestamp preserved
    });

    test('registry.clear() resets all pivots including dirty flags', () => {
      const id1 = registry.register({
        name: 'Test1',
        config: { rows: [], columns: [], values: [], sourceRange: { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } } },
        sourceRange: 'A1:A1',
        worksheetId: 'ws1',
      });

      const id2 = registry.register({
        name: 'Test2',
        config: { rows: [], columns: [], values: [], sourceRange: { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } } },
        sourceRange: 'B1:B1',
        worksheetId: 'ws1',
      });

      registry.markDirty(id1);
      registry.markClean(id2, Date.now());

      registry.clear();

      expect(registry.get(id1)).toBeUndefined();
      expect(registry.get(id2)).toBeUndefined();
      expect(registry.list()).toHaveLength(0);
    });

    test('dirty flag is immutable in metadata (readonly)', () => {
      const id = registry.register({
        name: 'Test',
        config: { rows: [], columns: [], values: [], sourceRange: { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } } },
        sourceRange: 'A1:A1',
        worksheetId: 'ws1',
      });

      const metadata = registry.get(id);
      
      // TypeScript should prevent this (compile-time check)
      // @ts-expect-error - Testing readonly enforcement
      expect(() => { metadata!.dirty = true; }).toThrow();
    });
  });
});
