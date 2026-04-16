/**
 * Phase 29: Workbook Snapshot Integration Tests
 * 
 * Verifies:
 * - Snapshot store integration with Workbook
 * - Disposal safety (registry + snapshots)
 * - Independent stores per workbook
 */

import { describe, test, expect } from '@jest/globals';
import { Workbook } from '../src/workbook';
import type { PivotSnapshot } from '../src/PivotSnapshotStore';
import type { PivotId } from '../src/PivotRegistry';

describe('Workbook - Snapshot Store Integration', () => {
  test('workbook has snapshot store', () => {
    const wb = new Workbook();
    
    const store = wb.getPivotSnapshotStore();
    
    expect(store).toBeDefined();
    expect(typeof store.set).toBe('function');
    expect(typeof store.get).toBe('function');
  });

  test('snapshot store persists across worksheet operations', () => {
    const wb = new Workbook();
    const ws1 = wb.addSheet('Sheet1');
    
    const pivotId = 'pivot-1' as PivotId;
    const snapshot: PivotSnapshot = {
      pivotId,
      computedAt: Date.now(),
      rows: [{ A: 1 }],
      fields: ['A'],
      valueFields: [],
    };
    
    wb.getPivotSnapshotStore().set(pivotId, snapshot);
    
    const ws2 = wb.addSheet('Sheet2');
    
    // Snapshot should still exist after adding another sheet
    expect(wb.getPivotSnapshotStore().has(pivotId)).toBe(true);
  });

  test('dispose clears both registry and snapshots', () => {
    const wb = new Workbook();
    const ws = wb.addSheet('Sheet1');
    
    const pivotId = 'pivot-1' as PivotId;
    
    // Register pivot
    wb.getPivotRegistry().register({
      name: 'Test',
      config: { rows: [], columns: [], values: [], sourceRange: { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } } },
      sourceRange: 'A1:A1',
      worksheetId: ws.getWorksheetId(),
    });
    
    // Store snapshot
    const snapshot: PivotSnapshot = {
      pivotId,
      computedAt: Date.now(),
      rows: [],
      fields: [],
      valueFields: [],
    };
    wb.getPivotSnapshotStore().set(pivotId, snapshot);
    
    expect(wb.getPivotRegistry().has(pivotId)).toBe(true);
    expect(wb.getPivotSnapshotStore().has(pivotId)).toBe(true);
    
    wb.dispose();
    
    expect(wb.getPivotRegistry().list()).toHaveLength(0);
    expect(wb.getPivotSnapshotStore().size).toBe(0);
  });

  test('multiple workbooks have independent snapshot stores', () => {
    const wb1 = new Workbook();
    const wb2 = new Workbook();
    
    const pivotId1 = 'pivot-1' as PivotId;
    const pivotId2 = 'pivot-2' as PivotId;
    
    const snapshot1: PivotSnapshot = {
      pivotId: pivotId1,
      computedAt: Date.now(),
      rows: [],
      fields: [],
      valueFields: [],
    };
    
    const snapshot2: PivotSnapshot = {
      pivotId: pivotId2,
      computedAt: Date.now(),
      rows: [],
      fields: [],
      valueFields: [],
    };
    
    wb1.getPivotSnapshotStore().set(pivotId1, snapshot1);
    wb2.getPivotSnapshotStore().set(pivotId2, snapshot2);
    
    expect(wb1.getPivotSnapshotStore().has(pivotId1)).toBe(true);
    expect(wb1.getPivotSnapshotStore().has(pivotId2)).toBe(false);
    
    expect(wb2.getPivotSnapshotStore().has(pivotId1)).toBe(false);
    expect(wb2.getPivotSnapshotStore().has(pivotId2)).toBe(true);
  });

  test('disposing one workbook does not affect others snapshots', () => {
    const wb1 = new Workbook();
    const wb2 = new Workbook();
    
    const pivotId1 = 'pivot-1' as PivotId;
    const pivotId2 = 'pivot-2' as PivotId;
    
    const snapshot1: PivotSnapshot = {
      pivotId: pivotId1,
      computedAt: Date.now(),
      rows: [],
      fields: [],
      valueFields: [],
    };
    
    const snapshot2: PivotSnapshot = {
      pivotId: pivotId2,
      computedAt: Date.now(),
      rows: [],
      fields: [],
      valueFields: [],
    };
    
    wb1.getPivotSnapshotStore().set(pivotId1, snapshot1);
    wb2.getPivotSnapshotStore().set(pivotId2, snapshot2);
    
    wb1.dispose();
    
    expect(wb1.getPivotSnapshotStore().size).toBe(0);
    expect(wb2.getPivotSnapshotStore().size).toBe(1);
    expect(wb2.getPivotSnapshotStore().has(pivotId2)).toBe(true);
  });
});

describe('Workbook - Registry and Snapshot Store Coordination', () => {
  test('registry and snapshot store are independent but coordinated', () => {
    const wb = new Workbook();
    const ws = wb.addSheet('Sheet1');
    
    const pivotId = 'pivot-1' as PivotId;
    
    // Register pivot (metadata only)
    wb.getPivotRegistry().register({
      name: 'Test',
      config: { rows: [], columns: [], values: [], sourceRange: { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } } },
      sourceRange: 'A1:A1',
      worksheetId: ws.getWorksheetId(),
    });
    
    // Snapshot does not exist yet (no implicit creation)
    expect(wb.getPivotSnapshotStore().has(pivotId)).toBe(false);
    
    // Explicitly store snapshot
    const snapshot: PivotSnapshot = {
      pivotId,
      computedAt: Date.now(),
      rows: [],
      fields: [],
      valueFields: [],
    };
    wb.getPivotSnapshotStore().set(pivotId, snapshot);
    
    // Now both exist
    expect(wb.getPivotRegistry().has(pivotId)).toBe(true);
    expect(wb.getPivotSnapshotStore().has(pivotId)).toBe(true);
  });

  test('can have registry entry without snapshot (before first build)', () => {
    const wb = new Workbook();
    const ws = wb.addSheet('Sheet1');
    
    const pivotId = wb.getPivotRegistry().register({
      name: 'Unbuild Pivot',
      config: { rows: [], columns: [], values: [], sourceRange: { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } } },
      sourceRange: 'A1:A1',
      worksheetId: ws.getWorksheetId(),
    });
    
    // Registry has entry
    expect(wb.getPivotRegistry().has(pivotId)).toBe(true);
    
    // But no snapshot yet (not built)
    expect(wb.getPivotSnapshotStore().has(pivotId)).toBe(false);
    
    // GETPIVOTDATA would return #REF! in this state
  });

  test('can have snapshot without registry entry (orphaned snapshot)', () => {
    const wb = new Workbook();
    
    const pivotId = 'pivot-1' as PivotId;
    
    // Store snapshot without registry entry
    const snapshot: PivotSnapshot = {
      pivotId,
      computedAt: Date.now(),
      rows: [],
      fields: [],
      valueFields: [],
    };
    wb.getPivotSnapshotStore().set(pivotId, snapshot);
    
    // Snapshot exists
    expect(wb.getPivotSnapshotStore().has(pivotId)).toBe(true);
    
    // But no registry entry (orphaned)
    expect(wb.getPivotRegistry().has(pivotId)).toBe(false);
    
    // This is allowed (edge case) but GETPIVOTDATA would still fail
    // because registry lookup comes first
  });
});
