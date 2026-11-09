/**
 * Workbook-owned invalidation integration tests retained pending the public
 * pivot registry and event-forwarding contract.
 */
import { beforeEach, describe, expect, test } from '@jest/globals';
import { Workbook } from '../src/workbook';
import type { PivotId } from '../src/PivotRegistry';
import type { Range } from '../src/types';

function makeRange(r1: number, c1: number, r2: number, c2: number): Range {
  return { start: { row: r1, col: c1 }, end: { row: r2, col: c2 } };
}

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
