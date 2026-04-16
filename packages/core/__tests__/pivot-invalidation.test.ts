/**
 * pivot-invalidation.test.ts
 *
 * Phase 30b: Automatic Pivot Invalidation Tests
 *
 * Test Coverage (all 6 mandatory cases):
 * 1. Precision: inside range → dirty, outside → clean
 * 2. Deduplication: 100 ops → 1 markDirty call
 * 3. Undo symmetry: undo re-dirties after rebuild
 * 4. Multi-pivot isolation: mutation hits only relevant pivot
 * 5. No-op protection: same value → no invalidation
 * 6. Structural ops invalidate: sort, merge, filter, hide/show
 *
 * Plus:
 * - NormalizedRange helpers
 * - PivotDependencyIndex unit tests
 * - PivotInvalidationEngine unit tests (isolated)
 * - Workbook integration tests (end-to-end)
 */

declare function describe(name: string, fn: () => void): void;
declare function test(name: string, fn: () => void | Promise<void>): void;
declare function beforeEach(fn: () => void | Promise<void>): void;
declare const expect: any;
import { PivotDependencyIndexImpl, normalizeRange, colInRange } from '../src/PivotDependencyIndex';
import { PivotInvalidationEngineImpl } from '../src/PivotInvalidationEngine';
import { PivotRegistryImpl } from '../src/PivotRegistry';
import { Workbook } from '../src/workbook';
import type { PivotId } from '../src/PivotRegistry';
import type { Range } from '../src/types';

// ============================================================================
// Helpers
// ============================================================================

function makeRange(r1: number, c1: number, r2: number, c2: number): Range {
  return {
    start: { row: r1, col: c1 },
    end: { row: r2, col: c2 },
  };
}

// ============================================================================
// NormalizedRange Helpers
// ============================================================================

describe('normalizeRange helpers', () => {
  test('normalizes in-order range correctly', () => {
    const result = normalizeRange(makeRange(1, 1, 10, 5));
    expect(result).toEqual({ r1: 1, c1: 1, r2: 10, c2: 5 });
  });

  test('normalizes reversed range (end < start)', () => {
    const result = normalizeRange(makeRange(10, 5, 1, 1));
    expect(result).toEqual({ r1: 1, c1: 1, r2: 10, c2: 5 });
  });

  test('normalizes single-cell range', () => {
    const result = normalizeRange(makeRange(5, 3, 5, 3));
    expect(result).toEqual({ r1: 5, c1: 3, r2: 5, c2: 3 });
  });

  test('colInRange: column inside range', () => {
    const range = normalizeRange(makeRange(1, 2, 10, 6));
    expect(colInRange(2, range)).toBe(true);
    expect(colInRange(4, range)).toBe(true);
    expect(colInRange(6, range)).toBe(true);
  });

  test('colInRange: column outside range', () => {
    const range = normalizeRange(makeRange(1, 2, 10, 6));
    expect(colInRange(1, range)).toBe(false);
    expect(colInRange(7, range)).toBe(false);
  });
});

// ============================================================================
// PivotDependencyIndex Unit Tests
// ============================================================================

describe('PivotDependencyIndex', () => {
  let index: PivotDependencyIndexImpl;

  beforeEach(() => {
    index = new PivotDependencyIndexImpl();
  });

  test('register: indexes all rows in range', () => {
    const pivotId = 'pivot-1' as PivotId;
    index.register(pivotId, makeRange(2, 1, 5, 3));

    expect(index.getPivotsForRow(1).has(pivotId)).toBe(false);
    expect(index.getPivotsForRow(2).has(pivotId)).toBe(true);
    expect(index.getPivotsForRow(3).has(pivotId)).toBe(true);
    expect(index.getPivotsForRow(4).has(pivotId)).toBe(true);
    expect(index.getPivotsForRow(5).has(pivotId)).toBe(true);
    expect(index.getPivotsForRow(6).has(pivotId)).toBe(false);
  });

  test('register: stores normalized range', () => {
    const pivotId = 'pivot-1' as PivotId;
    index.register(pivotId, makeRange(2, 1, 5, 3));

    const range = index.getRange(pivotId);
    expect(range).toEqual({ r1: 2, c1: 1, r2: 5, c2: 3 });
  });

  test('register: replaces existing registration (idempotent)', () => {
    const pivotId = 'pivot-1' as PivotId;
    index.register(pivotId, makeRange(1, 1, 5, 3));
    index.register(pivotId, makeRange(10, 1, 15, 3)); // New range

    // Old rows should be gone
    expect(index.getPivotsForRow(1).has(pivotId)).toBe(false);
    expect(index.getPivotsForRow(5).has(pivotId)).toBe(false);

    // New rows should be indexed
    expect(index.getPivotsForRow(10).has(pivotId)).toBe(true);
    expect(index.getPivotsForRow(15).has(pivotId)).toBe(true);

    expect(index.size).toBe(1); // Still one pivot
  });

  test('unregister: removes from row index', () => {
    const pivotId = 'pivot-1' as PivotId;
    index.register(pivotId, makeRange(2, 1, 5, 3));
    index.unregister(pivotId);

    for (let row = 2; row <= 5; row++) {
      expect(index.getPivotsForRow(row).has(pivotId)).toBe(false);
    }
    expect(index.getRange(pivotId)).toBeUndefined();
    expect(index.size).toBe(0);
  });

  test('unregister: no-op for non-existent pivot', () => {
    expect(() => index.unregister('pivot-999' as PivotId)).not.toThrow();
  });

  test('getPivotsForRow: returns empty set for unindexed row', () => {
    const result = index.getPivotsForRow(999);
    expect(result.size).toBe(0);
  });

  test('multiple pivots on same row', () => {
    const p1 = 'pivot-1' as PivotId;
    const p2 = 'pivot-2' as PivotId;
    index.register(p1, makeRange(1, 1, 10, 3));
    index.register(p2, makeRange(5, 4, 15, 6));

    // Row 7 is in both ranges
    const row7 = index.getPivotsForRow(7);
    expect(row7.has(p1)).toBe(true);
    expect(row7.has(p2)).toBe(true);

    // Row 3 only in p1
    const row3 = index.getPivotsForRow(3);
    expect(row3.has(p1)).toBe(true);
    expect(row3.has(p2)).toBe(false);

    // Row 12 only in p2
    const row12 = index.getPivotsForRow(12);
    expect(row12.has(p1)).toBe(false);
    expect(row12.has(p2)).toBe(true);
  });

  test('clear: removes all registrations', () => {
    index.register('pivot-1' as PivotId, makeRange(1, 1, 10, 5));
    index.register('pivot-2' as PivotId, makeRange(5, 1, 20, 5));
    index.clear();

    expect(index.size).toBe(0);
    expect(index.getPivotsForRow(5).size).toBe(0);
  });
});

// ============================================================================
// PivotInvalidationEngine Unit Tests (isolated)
// ============================================================================

describe('PivotInvalidationEngine (isolated)', () => {
  let registry: PivotRegistryImpl;
  let index: PivotDependencyIndexImpl;
  let engine: PivotInvalidationEngineImpl;

  beforeEach(() => {
    registry = new PivotRegistryImpl();
    index = new PivotDependencyIndexImpl();
    engine = new PivotInvalidationEngineImpl(index, registry);
  });

  function setupPivot(sourceRange: Range) {
    const id = registry.register({
      name: 'Test',
      config: { rows: [], columns: [], values: [], sourceRange: { start: { row: 1, col: 1 }, end: { row: 1, col: 1 } } },
      sourceRange: 'A1:D10',
      worksheetId: 'ws1',
    });
    index.register(id, sourceRange);
    registry.markClean(id, Date.now());
    return id;
  }

  // =========================================================================
  // 1. Precision Test
  // =========================================================================

  describe('1. Precision: inside range → dirty, outside → clean', () => {
    test('cell inside range marks pivot dirty', () => {
      const events: Array<(e: any) => void> = [];
      const subscribeFn = (listener: any) => { events.push(listener); return () => {}; };
      engine.observeWorksheet('ws1', subscribeFn);

      const id = setupPivot(makeRange(2, 2, 10, 5));
      expect(registry.isDirty(id)).toBe(false);

      // Mutate inside range: row 5, col 3
      events[0]({ type: 'cell-changed', address: { row: 5, col: 3 }, cell: { value: 99 }, previousValue: 1 });

      expect(registry.isDirty(id)).toBe(true);
    });

    test('cell outside row range does NOT mark pivot dirty', () => {
      const events: Array<(e: any) => void> = [];
      const subscribeFn = (listener: any) => { events.push(listener); return () => {}; };
      engine.observeWorksheet('ws1', subscribeFn);

      const id = setupPivot(makeRange(2, 2, 10, 5));
      expect(registry.isDirty(id)).toBe(false);

      // Row 15 is outside the range (2-10)
      events[0]({ type: 'cell-changed', address: { row: 15, col: 3 }, cell: { value: 99 }, previousValue: 1 });

      expect(registry.isDirty(id)).toBe(false);
    });

    test('cell outside column range does NOT mark pivot dirty', () => {
      const events: Array<(e: any) => void> = [];
      const subscribeFn = (listener: any) => { events.push(listener); return () => {}; };
      engine.observeWorksheet('ws1', subscribeFn);

      const id = setupPivot(makeRange(2, 2, 10, 5));
      expect(registry.isDirty(id)).toBe(false);

      // Col 8 is outside the range (2-5)
      events[0]({ type: 'cell-changed', address: { row: 5, col: 8 }, cell: { value: 99 }, previousValue: 1 });

      expect(registry.isDirty(id)).toBe(false);
    });

    test('cell on boundary is inside range', () => {
      const events: Array<(e: any) => void> = [];
      const subscribeFn = (listener: any) => { events.push(listener); return () => {}; };
      engine.observeWorksheet('ws1', subscribeFn);

      const id = setupPivot(makeRange(2, 2, 10, 5));

      // Top-left corner: row 2, col 2
      events[0]({ type: 'cell-changed', address: { row: 2, col: 2 }, cell: { value: 'new' }, previousValue: 'old' });
      expect(registry.isDirty(id)).toBe(true);

      // Reset
      registry.markClean(id, Date.now());

      // Bottom-right corner: row 10, col 5
      events[0]({ type: 'cell-changed', address: { row: 10, col: 5 }, cell: { value: 'new' }, previousValue: 'old' });
      expect(registry.isDirty(id)).toBe(true);
    });
  });

  // =========================================================================
  // 2. Deduplication Test
  // =========================================================================

  describe('2. Dedup: 100 ops on same pivot → 1 markDirty', () => {
    test('batch of 100 ops marks pivot dirty only once', () => {
      const events: Array<(e: any) => void> = [];
      const subscribeFn = (listener: any) => { events.push(listener); return () => {}; };
      engine.observeWorksheet('ws1', subscribeFn);

      const id = setupPivot(makeRange(1, 1, 200, 10));
      let dirtyCallCount = 0;
      const originalMarkDirty = registry.markDirty.bind(registry);
      registry.markDirty = (pivotId: PivotId) => {
        if (pivotId === id) dirtyCallCount++;
        originalMarkDirty(pivotId);
      };

      engine.beginBatch();

      for (let row = 1; row <= 100; row++) {
        events[0]({
          type: 'cell-changed',
          address: { row, col: 1 },
          cell: { value: row * 2 },
          previousValue: row,
        });
      }

      engine.endBatch();

      expect(dirtyCallCount).toBe(1); // Only 1 markDirty call
      expect(registry.isDirty(id)).toBe(true);
    });

    test('batch with duplicate rows deduplicates correctly', () => {
      const events: Array<(e: any) => void> = [];
      const subscribeFn = (listener: any) => { events.push(listener); return () => {}; };
      engine.observeWorksheet('ws1', subscribeFn);

      const id = setupPivot(makeRange(1, 1, 10, 5));
      let dirtyCallCount = 0;
      const originalMarkDirty = registry.markDirty.bind(registry);
      registry.markDirty = (pivotId: PivotId) => {
        if (pivotId === id) dirtyCallCount++;
        originalMarkDirty(pivotId);
      };

      engine.beginBatch();

      // 50 changes to same row/col
      for (let i = 0; i < 50; i++) {
        events[0]({
          type: 'cell-changed',
          address: { row: 5, col: 3 },
          cell: { value: i + 1 },
          previousValue: i,
        });
      }

      engine.endBatch();

      expect(dirtyCallCount).toBe(1);
    });

    test('nested batches flush only at outermost endBatch', () => {
      const events: Array<(e: any) => void> = [];
      const subscribeFn = (listener: any) => { events.push(listener); return () => {}; };
      engine.observeWorksheet('ws1', subscribeFn);

      const id = setupPivot(makeRange(1, 1, 10, 5));
      let dirtyCallCount = 0;
      const originalMarkDirty = registry.markDirty.bind(registry);
      registry.markDirty = (pivotId: PivotId) => {
        if (pivotId === id) dirtyCallCount++;
        originalMarkDirty(pivotId);
      };

      engine.beginBatch(); // Depth: 1
      engine.beginBatch(); // Depth: 2

      events[0]({ type: 'cell-changed', address: { row: 5, col: 3 }, cell: { value: 2 }, previousValue: 1 });

      engine.endBatch(); // Depth: 1, not flushed yet
      expect(dirtyCallCount).toBe(0); // Still not flushed

      engine.endBatch(); // Depth: 0, flush now
      expect(dirtyCallCount).toBe(1);
    });
  });

  // =========================================================================
  // 3. Undo Symmetry
  // =========================================================================

  describe('3. Undo symmetry: undo re-dirties pivot', () => {
    test('undo via event re-marks pivot dirty after rebuild', () => {
      const events: Array<(e: any) => void> = [];
      const subscribeFn = (listener: any) => { events.push(listener); return () => {}; };
      engine.observeWorksheet('ws1', subscribeFn);

      const id = setupPivot(makeRange(1, 1, 10, 5));

      // Simulate mutation → dirty
      events[0]({ type: 'cell-changed', address: { row: 5, col: 3 }, cell: { value: 200 }, previousValue: 100 });
      expect(registry.isDirty(id)).toBe(true);

      // Simulate rebuild → clean
      registry.markClean(id, Date.now());
      expect(registry.isDirty(id)).toBe(false);

      // Simulate undo: cell reverts to previous value
      // CommandManager.undo() → command.undo() → setCellValue(previousValue)
      // → emits 'cell-changed' with previousValue=200, newValue=100
      events[0]({ type: 'cell-changed', address: { row: 5, col: 3 }, cell: { value: 100 }, previousValue: 200 });

      // Pivot should be dirty again
      expect(registry.isDirty(id)).toBe(true);
    });
  });

  // =========================================================================
  // 4. Multi-pivot Isolation
  // =========================================================================

  describe('4. Multi-pivot isolation: mutation hits only relevant pivot', () => {
    test('mutation in pivot A range does not dirty pivot B', () => {
      const events: Array<(e: any) => void> = [];
      const subscribeFn = (listener: any) => { events.push(listener); return () => {}; };
      engine.observeWorksheet('ws1', subscribeFn);

      // Pivot A: rows 1-10, cols 1-3
      const idA = setupPivot(makeRange(1, 1, 10, 3));
      // Pivot B: rows 20-30, cols 5-8
      const idB = setupPivot(makeRange(20, 5, 30, 8));

      // Mutate inside pivot A range
      events[0]({ type: 'cell-changed', address: { row: 5, col: 2 }, cell: { value: 99 }, previousValue: 1 });

      expect(registry.isDirty(idA)).toBe(true);
      expect(registry.isDirty(idB)).toBe(false);
    });

    test('mutation in pivot B range does not dirty pivot A', () => {
      const events: Array<(e: any) => void> = [];
      const subscribeFn = (listener: any) => { events.push(listener); return () => {}; };
      engine.observeWorksheet('ws1', subscribeFn);

      const idA = setupPivot(makeRange(1, 1, 10, 3));
      const idB = setupPivot(makeRange(20, 5, 30, 8));

      // Mutate inside pivot B range
      events[0]({ type: 'cell-changed', address: { row: 25, col: 6 }, cell: { value: 99 }, previousValue: 1 });

      expect(registry.isDirty(idA)).toBe(false);
      expect(registry.isDirty(idB)).toBe(true);
    });

    test('mutation in overlapping range dirties both pivots', () => {
      const events: Array<(e: any) => void> = [];
      const subscribeFn = (listener: any) => { events.push(listener); return () => {}; };
      engine.observeWorksheet('ws1', subscribeFn);

      // Overlapping ranges
      const idA = setupPivot(makeRange(1, 1, 10, 5));
      const idB = setupPivot(makeRange(5, 3, 15, 8));

      // Cell at row 7, col 4 is in BOTH ranges
      events[0]({ type: 'cell-changed', address: { row: 7, col: 4 }, cell: { value: 99 }, previousValue: 1 });

      expect(registry.isDirty(idA)).toBe(true);
      expect(registry.isDirty(idB)).toBe(true);
    });
  });

  // =========================================================================
  // 5. No-op Protection
  // =========================================================================

  describe('5. No-op protection: same value → no invalidation', () => {
    test('cell-changed with same value (previousValue === newValue) does NOT invalidate', () => {
      const events: Array<(e: any) => void> = [];
      const subscribeFn = (listener: any) => { events.push(listener); return () => {}; };
      engine.observeWorksheet('ws1', subscribeFn);

      const id = setupPivot(makeRange(1, 1, 10, 5));

      // Same value: previousValue === cell.value — no-op
      events[0]({ type: 'cell-changed', address: { row: 5, col: 3 }, cell: { value: 42 }, previousValue: 42 });

      expect(registry.isDirty(id)).toBe(false);
    });

    test('cell-changed without previousValue still triggers invalidation', () => {
      const events: Array<(e: any) => void> = [];
      const subscribeFn = (listener: any) => { events.push(listener); return () => {}; };
      engine.observeWorksheet('ws1', subscribeFn);

      const id = setupPivot(makeRange(1, 1, 10, 5));

      // No previousValue field (external event source) — treated as changed
      events[0]({ type: 'cell-changed', address: { row: 5, col: 3 }, cell: { value: 42 } });

      expect(registry.isDirty(id)).toBe(true);
    });
  });

  // =========================================================================
  // 6. Structural Ops Invalidation
  // =========================================================================

  describe('6. Structural ops: sort, merge, filter, hide/show all invalidate', () => {
    test('sort-applied within range marks pivot dirty', () => {
      const events: Array<(e: any) => void> = [];
      const subscribeFn = (listener: any) => { events.push(listener); return () => {}; };
      engine.observeWorksheet('ws1', subscribeFn);

      const id = setupPivot(makeRange(1, 1, 20, 5));

      events[0]({
        type: 'sort-applied',
        startRow: 1, endRow: 10,
        startCol: 1, endCol: 5,
        keys: [{ col: 2, dir: 'asc' }],
      });

      expect(registry.isDirty(id)).toBe(true);
    });

    test('sort-applied outside range does NOT dirty pivot', () => {
      const events: Array<(e: any) => void> = [];
      const subscribeFn = (listener: any) => { events.push(listener); return () => {}; };
      engine.observeWorksheet('ws1', subscribeFn);

      const id = setupPivot(makeRange(1, 1, 10, 5));

      // Sort in rows 50-60, completely outside pivot range 1-10
      events[0]({
        type: 'sort-applied',
        startRow: 50, endRow: 60,
        startCol: 1, endCol: 5,
        keys: [{ col: 2, dir: 'asc' }],
      });

      expect(registry.isDirty(id)).toBe(false);
    });

    test('merge-added within range marks pivot dirty', () => {
      const events: Array<(e: any) => void> = [];
      const subscribeFn = (listener: any) => { events.push(listener); return () => {}; };
      engine.observeWorksheet('ws1', subscribeFn);

      const id = setupPivot(makeRange(1, 1, 20, 5));

      events[0]({
        type: 'merge-added',
        region: { startRow: 3, startCol: 1, endRow: 5, endCol: 3 },
      });

      expect(registry.isDirty(id)).toBe(true);
    });

    test('row-hidden within pivot range marks pivot dirty', () => {
      const events: Array<(e: any) => void> = [];
      const subscribeFn = (listener: any) => { events.push(listener); return () => {}; };
      engine.observeWorksheet('ws1', subscribeFn);

      const id = setupPivot(makeRange(1, 1, 20, 5));

      events[0]({ type: 'row-hidden', row: 10 });

      expect(registry.isDirty(id)).toBe(true);
    });

    test('row-hidden outside pivot range does NOT dirty pivot', () => {
      const events: Array<(e: any) => void> = [];
      const subscribeFn = (listener: any) => { events.push(listener); return () => {}; };
      engine.observeWorksheet('ws1', subscribeFn);

      const id = setupPivot(makeRange(1, 1, 10, 5));

      events[0]({ type: 'row-hidden', row: 50 });

      expect(registry.isDirty(id)).toBe(false);
    });

    test('filter-changed on column inside range marks pivot dirty', () => {
      const events: Array<(e: any) => void> = [];
      const subscribeFn = (listener: any) => { events.push(listener); return () => {}; };
      engine.observeWorksheet('ws1', subscribeFn);

      const id = setupPivot(makeRange(1, 2, 20, 6));

      events[0]({ type: 'filter-changed', col: 3, filter: { type: 'equals', value: 'X' }, before: null });

      expect(registry.isDirty(id)).toBe(true);
    });

    test('sheet-mutated marks all pivots dirty (conservative)', () => {
      const events: Array<(e: any) => void> = [];
      const subscribeFn = (listener: any) => { events.push(listener); return () => {}; };
      engine.observeWorksheet('ws1', subscribeFn);

      const id1 = setupPivot(makeRange(1, 1, 10, 5));
      const id2 = setupPivot(makeRange(20, 1, 30, 5));

      events[0]({ type: 'sheet-mutated' });

      expect(registry.isDirty(id1)).toBe(true);
      expect(registry.isDirty(id2)).toBe(true);
    });

    test('style-changed does NOT dirty any pivot', () => {
      const events: Array<(e: any) => void> = [];
      const subscribeFn = (listener: any) => { events.push(listener); return () => {}; };
      engine.observeWorksheet('ws1', subscribeFn);

      const id = setupPivot(makeRange(1, 1, 10, 5));

      events[0]({ type: 'style-changed', address: { row: 5, col: 3 }, style: { bold: true } });

      expect(registry.isDirty(id)).toBe(false);
    });
  });
});

// ============================================================================
// Workbook Integration Tests (end-to-end)
// ============================================================================

describe('Workbook Phase 30b Integration', () => {
  let wb: Workbook;

  beforeEach(() => {
    wb = new Workbook();
  });

  function setupWorkbookPivot(ws: any, r1: number, c1: number, r2: number, c2: number) {
    const id = (wb.getPivotRegistry() as any).register({
      name: 'Test',
      config: { rows: [], columns: [], values: [], sourceRange: { start: { row: r1, col: c1 }, end: { row: r2, col: c2 } } },
      sourceRange: `A${r1}:E${r2}`,
      worksheetId: 'ws1',
    });
    wb.registerPivotDependency(id, makeRange(r1, c1, r2, c2));
    (wb.getPivotRegistry() as any).markClean(id, Date.now());
    return id;
  }

  test('setCellValue inside range automatically marks pivot dirty', () => {
    const ws = wb.addSheet('Sheet1');
    const id = setupWorkbookPivot(ws, 1, 1, 20, 5);

    expect((wb.getPivotRegistry() as any).isDirty(id)).toBe(false);

    ws.setCellValue({ row: 10, col: 3 }, 42);

    expect((wb.getPivotRegistry() as any).isDirty(id)).toBe(true);
  });

  test('setCellValue outside range does NOT dirty pivot', () => {
    const ws = wb.addSheet('Sheet1');
    const id = setupWorkbookPivot(ws, 1, 1, 10, 5);

    ws.setCellValue({ row: 50, col: 3 }, 42);

    expect((wb.getPivotRegistry() as any).isDirty(id)).toBe(false);
  });

  test('setCellValue with same value (no-op) does NOT dirty pivot', () => {
    const ws = wb.addSheet('Sheet1');
    const id = setupWorkbookPivot(ws, 1, 1, 10, 5);

    // Set initial value
    ws.setCellValue({ row: 5, col: 3 }, 'hello');
    expect((wb.getPivotRegistry() as any).isDirty(id)).toBe(true);

    // Reset to clean
    (wb.getPivotRegistry() as any).markClean(id, Date.now());

    // Set same value → no-op → no invalidation
    ws.setCellValue({ row: 5, col: 3 }, 'hello');
    expect((wb.getPivotRegistry() as any).isDirty(id)).toBe(false);
  });

  test('registerPivotDependency + unregisterPivotDependency lifecycle', () => {
    const ws = wb.addSheet('Sheet1');
    const id = setupWorkbookPivot(ws, 1, 1, 10, 5);

    // Unregister dependency
    wb.unregisterPivotDependency(id);

    // Mutation should not dirty the pivot now
    ws.setCellValue({ row: 5, col: 3 }, 99);
    expect((wb.getPivotRegistry() as any).isDirty(id)).toBe(false);
  });

  test('dispose cleans up all subscriptions', () => {
    const ws = wb.addSheet('Sheet1');
    const id = setupWorkbookPivot(ws, 1, 1, 10, 5);

    wb.dispose();

    // After dispose, pivot registry is cleared
    expect((wb.getPivotRegistry() as any).get(id)).toBeUndefined();
    expect(wb.getPivotDependencyIndex().size).toBe(0);
  });

  // =========================================================================
  // Stress Test
  // =========================================================================

  test('stress: 1000 ops in batch → single markDirty', () => {
    const ws = wb.addSheet('Sheet1');
    const id = setupWorkbookPivot(ws, 1, 1, 200, 10);
    let dirtyCallCount = 0;

    const registry = wb.getPivotRegistry() as any;
    const originalMarkDirty = registry.markDirty.bind(registry);
    registry.markDirty = (pivotId: PivotId) => {
      if (pivotId === id) dirtyCallCount++;
      originalMarkDirty(pivotId);
    };

    const engine = wb.getPivotInvalidationEngine();
    engine.beginBatch();

    for (let i = 1; i <= 1000; i++) {
      ws.setCellValue({ row: (i % 200) + 1, col: (i % 10) + 1 }, i);
    }

    engine.endBatch();

    expect(dirtyCallCount).toBe(1);
    expect(registry.isDirty(id)).toBe(true);
  });

  test('stress: 1000 ops outside range → zero markDirty', () => {
    const ws = wb.addSheet('Sheet1');
    const id = setupWorkbookPivot(ws, 1, 1, 10, 5);

    const start = Date.now();
    const engine = wb.getPivotInvalidationEngine();
    engine.beginBatch();

    for (let i = 1; i <= 1000; i++) {
      ws.setCellValue({ row: 100 + i, col: 1 }, i); // All outside range 1-10
    }

    engine.endBatch();
    const elapsed = Date.now() - start;

    expect((wb.getPivotRegistry() as any).isDirty(id)).toBe(false);
    expect(elapsed).toBeLessThan(500); // Sanity perf check
  });
});
