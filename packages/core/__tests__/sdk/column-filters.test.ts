/**
 * column-filters.test.ts — Phase 21: Advanced Filters SDK Test Suite
 *
 * Coverage:
 *   §1  setFilter — stores filter, getFilter round-trips
 *   §2  clearFilter — removes filter, no-op when absent
 *   §3  clearAllFilters — clears multiple filters atomically
 *   §4  getVisibleRows — applies active filters
 *   §5  Filter types — equals, notEquals, contains, notContains
 *   §6  Filter types — startsWith, endsWith
 *   §7  Filter types — gt, gte, lt, lte, between
 *   §8  Filter types — empty, notEmpty
 *   §9  Filter types — in (multi-select)
 *   §10 getDistinctValues
 *   §11 Undo / Redo of setFilter
 *   §12 Undo / Redo of clearFilter
 *   §13 Undo / Redo of clearAllFilters
 *   §14 Auto-Filter Range — set / get / clear / undo
 *   §15 Event emission
 *   §16 Disposed-sheet safety
 *
 * Run: npx jest packages/core/__tests__/sdk/column-filters.test.ts --no-coverage --verbose
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { createSpreadsheet } from '../../src/sdk/SpreadsheetSDK';
import type { SpreadsheetSDK } from '../../src/sdk/SpreadsheetSDK';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSheet(rows = 20, cols = 10): SpreadsheetSDK {
  return createSpreadsheet('Test', { rows, cols });
}

/**
 * Populate a 5-row data table (header in row 1):
 *   Col 1: category (Apple/Banana/Cherry/Apple/Banana)
 *   Col 2: quantity  (10/25/5/30/15)
 *   Col 3: in-stock  (true/false/true/true/false)
 */
function populateTable(sheet: SpreadsheetSDK): void {
  const data = [
    ['Apple',  10, true],
    ['Banana', 25, false],
    ['Cherry', 5,  true],
    ['Apple',  30, true],
    ['Banana', 15, false],
  ];
  for (let r = 0; r < data.length; r++) {
    const row = data[r]!;
    sheet.setCell(r + 1, 1, row[0] as string);
    sheet.setCell(r + 1, 2, row[1] as number);
    sheet.setCell(r + 1, 3, row[2] as boolean);
  }
}

// ---------------------------------------------------------------------------
// §1 setFilter / getFilter round-trip
// ---------------------------------------------------------------------------

describe('§1 setFilter / getFilter', () => {
  let sheet: SpreadsheetSDK;
  beforeEach(() => { sheet = makeSheet(); populateTable(sheet); });

  test('setFilter stores and getFilter returns a shallow copy', () => {
    sheet.setFilter(1, { type: 'equals', value: 'Apple' });
    expect(sheet.getFilter(1)).toEqual({ type: 'equals', value: 'Apple' });
    sheet.dispose();
  });

  test('getFilter returns undefined for column with no filter', () => {
    expect(sheet.getFilter(2)).toBeUndefined();
    sheet.dispose();
  });

  test('second setFilter on same column replaces the previous one', () => {
    sheet.setFilter(1, { type: 'equals', value: 'Apple' });
    sheet.setFilter(1, { type: 'contains', value: 'an' });
    expect(sheet.getFilter(1)).toEqual({ type: 'contains', value: 'an' });
    sheet.dispose();
  });

  test('setFilter is undo-able (canUndo true after call)', () => {
    // Fresh sheet so undo stack is empty before the filter op.
    const s = makeSheet();
    expect(s.canUndo).toBe(false);
    s.setFilter(1, { type: 'equals', value: 'Apple' });
    expect(s.canUndo).toBe(true);
    s.dispose();
  });
});

// ---------------------------------------------------------------------------
// §2 clearFilter
// ---------------------------------------------------------------------------

describe('§2 clearFilter', () => {
  let sheet: SpreadsheetSDK;
  beforeEach(() => { sheet = makeSheet(); populateTable(sheet); });

  test('clearFilter removes an active filter', () => {
    sheet.setFilter(1, { type: 'equals', value: 'Apple' });
    sheet.clearFilter(1);
    expect(sheet.getFilter(1)).toBeUndefined();
    sheet.dispose();
  });

  test('clearFilter on col with no filter is a no-op (canUndo false)', () => {
    // Fresh sheet so undo stack is empty; clearFilter on unset col must not push.
    const s = makeSheet();
    s.clearFilter(5); // never set
    expect(s.canUndo).toBe(false);
    s.dispose();
  });

  test('clearFilter pushes to undo stack when filter existed', () => {
    sheet.setFilter(1, { type: 'equals', value: 'Apple' });
    sheet.clearFilter(1);
    expect(sheet.canUndo).toBe(true);
    sheet.dispose();
  });
});

// ---------------------------------------------------------------------------
// §3 clearAllFilters
// ---------------------------------------------------------------------------

describe('§3 clearAllFilters', () => {
  let sheet: SpreadsheetSDK;
  beforeEach(() => { sheet = makeSheet(); populateTable(sheet); });

  test('clearAllFilters removes all active filters', () => {
    sheet.setFilter(1, { type: 'equals', value: 'Apple' });
    sheet.setFilter(2, { type: 'gt', value: 10 });
    sheet.clearAllFilters();
    expect(sheet.getFilter(1)).toBeUndefined();
    expect(sheet.getFilter(2)).toBeUndefined();
    sheet.dispose();
  });

  test('clearAllFilters on sheet with no filters is no-op (canUndo stays false)', () => {
    // Fresh sheet with no prior ops.
    const s = makeSheet();
    s.clearAllFilters();
    expect(s.canUndo).toBe(false);
    s.dispose();
  });

  test('clearAllFilters is a single undo entry', () => {
    sheet.setFilter(1, { type: 'equals', value: 'Apple' });
    sheet.setFilter(2, { type: 'gt', value: 10 });
    sheet.clearAllFilters();
    sheet.undo();
    // Both filters restored in one undo
    expect(sheet.getFilter(1)).toEqual({ type: 'equals', value: 'Apple' });
    expect(sheet.getFilter(2)).toEqual({ type: 'gt', value: 10 });
    sheet.dispose();
  });
});

// ---------------------------------------------------------------------------
// §4 getVisibleRows
// ---------------------------------------------------------------------------

describe('§4 getVisibleRows', () => {
  let sheet: SpreadsheetSDK;
  beforeEach(() => { sheet = makeSheet(); populateTable(sheet); });

  test('no active filters — all rows visible', () => {
    // Pass explicit range to restrict to the 5 data rows so the 20-row sheet
    // default capacity does not inflate the result.
    const dataRange = { start: { row: 1, col: 1 }, end: { row: 5, col: 3 } };
    const visible = sheet.getVisibleRows(dataRange);
    expect(visible).toEqual([1, 2, 3, 4, 5]);
    sheet.dispose();
  });

  test('equals filter — only matching rows visible', () => {
    sheet.setFilter(1, { type: 'equals', value: 'Apple' });
    expect(sheet.getVisibleRows()).toEqual([1, 4]);
    sheet.dispose();
  });

  test('multiple filters compose as AND', () => {
    sheet.setFilter(1, { type: 'equals', value: 'Apple' });
    sheet.setFilter(2, { type: 'gt', value: 20 });
    // Apple rows: 1 (qty=10), 4 (qty=30) — only row 4 passes both
    expect(sheet.getVisibleRows()).toEqual([4]);
    sheet.dispose();
  });

  test('clearing a filter expands visible rows back', () => {
    const dataRange = { start: { row: 1, col: 1 }, end: { row: 5, col: 3 } };
    sheet.setFilter(1, { type: 'equals', value: 'Apple' });
    sheet.clearFilter(1);
    expect(sheet.getVisibleRows(dataRange)).toEqual([1, 2, 3, 4, 5]);
    sheet.dispose();
  });
});

// ---------------------------------------------------------------------------
// §5 Filter types — equals, notEquals, contains, notContains
// ---------------------------------------------------------------------------

describe('§5 string filter types', () => {
  let sheet: SpreadsheetSDK;
  beforeEach(() => { sheet = makeSheet(); populateTable(sheet); });

  test('equals: matches exact value', () => {
    sheet.setFilter(1, { type: 'equals', value: 'Cherry' });
    expect(sheet.getVisibleRows()).toEqual([3]);
    sheet.dispose();
  });

  test('notEquals: excludes exact value', () => {
    sheet.setFilter(1, { type: 'notEquals', value: 'Cherry' });
    expect(sheet.getVisibleRows()).toEqual([1, 2, 4, 5]);
    sheet.dispose();
  });

  test('contains: case-insensitive substring', () => {
    sheet.setFilter(1, { type: 'contains', value: 'AN' });
    // Banana contains 'an' (case-insensitive)
    expect(sheet.getVisibleRows()).toEqual([2, 5]);
    sheet.dispose();
  });

  test('notContains: excludes rows matching substring', () => {
    sheet.setFilter(1, { type: 'notContains', value: 'an' });
    // Apple and Cherry don't contain 'an'
    expect(sheet.getVisibleRows()).toEqual([1, 3, 4]);
    sheet.dispose();
  });
});

// ---------------------------------------------------------------------------
// §6 Filter types — startsWith, endsWith
// ---------------------------------------------------------------------------

describe('§6 startsWith / endsWith filter types', () => {
  let sheet: SpreadsheetSDK;
  beforeEach(() => { sheet = makeSheet(); populateTable(sheet); });

  test('startsWith: matches prefix (case-insensitive)', () => {
    sheet.setFilter(1, { type: 'startsWith', value: 'app' });
    expect(sheet.getVisibleRows()).toEqual([1, 4]);
    sheet.dispose();
  });

  test('endsWith: matches suffix (case-insensitive)', () => {
    sheet.setFilter(1, { type: 'endsWith', value: 'erry' });
    // Cherry ends with 'erry'
    expect(sheet.getVisibleRows()).toEqual([3]);
    sheet.dispose();
  });

  test('endsWith with no match returns empty', () => {
    sheet.setFilter(1, { type: 'endsWith', value: 'xyz' });
    expect(sheet.getVisibleRows()).toEqual([]);
    sheet.dispose();
  });
});

// ---------------------------------------------------------------------------
// §7 Filter types — gt, gte, lt, lte, between
// ---------------------------------------------------------------------------

describe('§7 numeric filter types', () => {
  let sheet: SpreadsheetSDK;
  beforeEach(() => { sheet = makeSheet(); populateTable(sheet); });

  test('gt: strictly greater than', () => {
    sheet.setFilter(2, { type: 'gt', value: 15 });
    // qty: 10,25,5,30,15 → rows 2,4 (25,30)
    expect(sheet.getVisibleRows()).toEqual([2, 4]);
    sheet.dispose();
  });

  test('gte: greater than or equal', () => {
    sheet.setFilter(2, { type: 'gte', value: 15 });
    // qty: 10,25,5,30,15 → rows 2,4,5 (25,30,15)
    expect(sheet.getVisibleRows()).toEqual([2, 4, 5]);
    sheet.dispose();
  });

  test('lt: strictly less than', () => {
    sheet.setFilter(2, { type: 'lt', value: 15 });
    // qty: 10,25,5,30,15 → rows 1,3 (10,5)
    expect(sheet.getVisibleRows()).toEqual([1, 3]);
    sheet.dispose();
  });

  test('lte: less than or equal', () => {
    sheet.setFilter(2, { type: 'lte', value: 15 });
    // qty: 10,25,5,30,15 → rows 1,3,5 (10,5,15)
    expect(sheet.getVisibleRows()).toEqual([1, 3, 5]);
    sheet.dispose();
  });

  test('between: inclusive range', () => {
    sheet.setFilter(2, { type: 'between', value: [10, 25] });
    // 10,25,5,30,15 → rows 1,2,5 (10,25,15)
    expect(sheet.getVisibleRows()).toEqual([1, 2, 5]);
    sheet.dispose();
  });

  test('between: reversed bounds still work (min/max normalised)', () => {
    sheet.setFilter(2, { type: 'between', value: [25, 10] });
    expect(sheet.getVisibleRows()).toEqual([1, 2, 5]);
    sheet.dispose();
  });
});

// ---------------------------------------------------------------------------
// §8 Filter types — empty, notEmpty
// ---------------------------------------------------------------------------

describe('§8 empty / notEmpty filter types', () => {
  let sheet: SpreadsheetSDK;
  beforeEach(() => { sheet = makeSheet(); });

  test('empty: matches null cells and empty-string cells', () => {
    sheet.setCell(1, 1, 'value');
    sheet.setCell(2, 1, '');
    // Row 3 never set = null
    sheet.setFilter(1, { type: 'empty' });
    expect(sheet.getVisibleRows({ start: { row: 1, col: 1 }, end: { row: 3, col: 1 } }))
      .toEqual([2, 3]);
    sheet.dispose();
  });

  test('notEmpty: excludes null and empty-string cells', () => {
    sheet.setCell(1, 1, 'value');
    sheet.setCell(2, 1, '');
    sheet.setFilter(1, { type: 'notEmpty' });
    expect(sheet.getVisibleRows({ start: { row: 1, col: 1 }, end: { row: 3, col: 1 } }))
      .toEqual([1]);
    sheet.dispose();
  });
});

// ---------------------------------------------------------------------------
// §9 Filter type — in (multi-select)
// ---------------------------------------------------------------------------

describe('§9 in filter type', () => {
  let sheet: SpreadsheetSDK;
  beforeEach(() => { sheet = makeSheet(); populateTable(sheet); });

  test('in: matches any value in the set', () => {
    sheet.setFilter(1, { type: 'in', value: ['Apple', 'Cherry'] });
    expect(sheet.getVisibleRows()).toEqual([1, 3, 4]);
    sheet.dispose();
  });

  test('in: empty array matches nothing', () => {
    sheet.setFilter(1, { type: 'in', value: [] });
    expect(sheet.getVisibleRows()).toEqual([]);
    sheet.dispose();
  });
});

// ---------------------------------------------------------------------------
// §10 getDistinctValues
// ---------------------------------------------------------------------------

describe('§10 getDistinctValues', () => {
  let sheet: SpreadsheetSDK;
  // Use a 5-row sheet so there are no trailing null rows that inflate the
  // empty-string bucket in getDistinctValues.
  beforeEach(() => { sheet = makeSheet(5, 10); populateTable(sheet); });

  test('returns all distinct string values with counts', () => {
    const vals = sheet.getDistinctValues(1);
    // Apple×2, Banana×2, Cherry×1
    expect(vals.map(v => v.value).sort()).toEqual(['Apple', 'Banana', 'Cherry'].sort());
    const apple = vals.find(v => v.value === 'Apple')!;
    expect(apple.count).toBe(2);
    const cherry = vals.find(v => v.value === 'Cherry')!;
    expect(cherry.count).toBe(1);
    sheet.dispose();
  });

  test('visibleOnly=true respects other active filters', () => {
    // Filter col 2 to keep rows where qty > 10
    sheet.setFilter(2, { type: 'gt', value: 10 });
    const vals = sheet.getDistinctValues(1, true);
    // Visible rows (qty>10): row2 Banana(25), row4 Apple(30), row5 Banana(15)
    expect(vals.map(v => v.value).sort()).toEqual(['Apple', 'Banana'].sort());
    const banana = vals.find(v => v.value === 'Banana')!;
    expect(banana.count).toBe(2);
    sheet.dispose();
  });

  test('sorted descending by count', () => {
    const vals = sheet.getDistinctValues(1);
    // First entries should have higher count
    expect(vals[0]!.count).toBeGreaterThanOrEqual(vals[vals.length - 1]!.count);
    sheet.dispose();
  });
});

// ---------------------------------------------------------------------------
// §11 Undo / Redo of setFilter
// ---------------------------------------------------------------------------

describe('§11 Undo / Redo setFilter', () => {
  let sheet: SpreadsheetSDK;
  beforeEach(() => { sheet = makeSheet(); populateTable(sheet); });

  test('undo of setFilter removes the filter', () => {
    sheet.setFilter(1, { type: 'equals', value: 'Apple' });
    sheet.undo();
    expect(sheet.getFilter(1)).toBeUndefined();
    sheet.dispose();
  });

  test('redo of undone setFilter re-applies the filter', () => {
    sheet.setFilter(1, { type: 'equals', value: 'Apple' });
    sheet.undo();
    sheet.redo();
    expect(sheet.getFilter(1)).toEqual({ type: 'equals', value: 'Apple' });
    sheet.dispose();
  });

  test('undo of replacement filter restores previous filter', () => {
    sheet.setFilter(1, { type: 'equals', value: 'Apple' });
    sheet.setFilter(1, { type: 'contains', value: 'an' });
    sheet.undo();
    expect(sheet.getFilter(1)).toEqual({ type: 'equals', value: 'Apple' });
    sheet.dispose();
  });
});

// ---------------------------------------------------------------------------
// §12 Undo / Redo of clearFilter
// ---------------------------------------------------------------------------

describe('§12 Undo / Redo clearFilter', () => {
  let sheet: SpreadsheetSDK;
  beforeEach(() => { sheet = makeSheet(); populateTable(sheet); });

  test('undo of clearFilter restores the removed filter', () => {
    sheet.setFilter(1, { type: 'equals', value: 'Apple' });
    sheet.clearFilter(1);
    sheet.undo();
    expect(sheet.getFilter(1)).toEqual({ type: 'equals', value: 'Apple' });
    sheet.dispose();
  });

  test('redo of undone clearFilter removes the filter again', () => {
    sheet.setFilter(1, { type: 'equals', value: 'Apple' });
    sheet.clearFilter(1);
    sheet.undo();
    sheet.redo();
    expect(sheet.getFilter(1)).toBeUndefined();
    sheet.dispose();
  });
});

// ---------------------------------------------------------------------------
// §13 Undo / Redo of clearAllFilters
// ---------------------------------------------------------------------------

describe('§13 Undo / Redo clearAllFilters', () => {
  let sheet: SpreadsheetSDK;
  beforeEach(() => { sheet = makeSheet(); populateTable(sheet); });

  test('undo of clearAllFilters restores all cleared filters', () => {
    sheet.setFilter(1, { type: 'equals', value: 'Apple' });
    sheet.setFilter(2, { type: 'gt', value: 5 });
    sheet.clearAllFilters();
    sheet.undo();
    expect(sheet.getFilter(1)).toEqual({ type: 'equals', value: 'Apple' });
    expect(sheet.getFilter(2)).toEqual({ type: 'gt', value: 5 });
    sheet.dispose();
  });

  test('redo of undone clearAllFilters clears again', () => {
    sheet.setFilter(1, { type: 'equals', value: 'Apple' });
    sheet.setFilter(2, { type: 'gt', value: 5 });
    sheet.clearAllFilters();
    sheet.undo();
    sheet.redo();
    expect(sheet.getFilter(1)).toBeUndefined();
    expect(sheet.getFilter(2)).toBeUndefined();
    sheet.dispose();
  });
});

// ---------------------------------------------------------------------------
// §14 Auto-Filter Range
// ---------------------------------------------------------------------------

describe('§14 Auto-Filter Range', () => {
  let sheet: SpreadsheetSDK;
  beforeEach(() => { sheet = makeSheet(); });

  test('setAutoFilterRange stores and getAutoFilterRange returns it', () => {
    sheet.setAutoFilterRange(1, 1, 5);
    expect(sheet.getAutoFilterRange()).toEqual({ headerRow: 1, startCol: 1, endCol: 5 });
    sheet.dispose();
  });

  test('getAutoFilterRange returns null when not set', () => {
    expect(sheet.getAutoFilterRange()).toBeNull();
    sheet.dispose();
  });

  test('clearAutoFilterRange removes the range', () => {
    sheet.setAutoFilterRange(1, 1, 5);
    sheet.clearAutoFilterRange();
    expect(sheet.getAutoFilterRange()).toBeNull();
    sheet.dispose();
  });

  test('clearAutoFilterRange is no-op when nothing set (canUndo stays false)', () => {
    sheet.clearAutoFilterRange();
    expect(sheet.canUndo).toBe(false);
    sheet.dispose();
  });

  test('undo of setAutoFilterRange removes it', () => {
    sheet.setAutoFilterRange(1, 1, 5);
    sheet.undo();
    expect(sheet.getAutoFilterRange()).toBeNull();
    sheet.dispose();
  });

  test('undo of clearAutoFilterRange restores it', () => {
    sheet.setAutoFilterRange(1, 1, 5);
    sheet.clearAutoFilterRange();
    sheet.undo();
    expect(sheet.getAutoFilterRange()).toEqual({ headerRow: 1, startCol: 1, endCol: 5 });
    sheet.dispose();
  });
});

// ---------------------------------------------------------------------------
// §15 Event emission
// ---------------------------------------------------------------------------

describe('§15 Event emission', () => {
  let sheet: SpreadsheetSDK;
  beforeEach(() => { sheet = makeSheet(); });

  test('setFilter emits filter-changed with the column', () => {
    const cols: number[] = [];
    const sub = sheet.on('filter-changed', e => cols.push((e as any).col));
    sheet.setFilter(2, { type: 'equals', value: 'x' });
    expect(cols).toContain(2);
    sub.dispose(); sheet.dispose();
  });

  test('setFilter emits structure-changed', () => {
    let fired = false;
    const sub = sheet.on('structure-changed', () => { fired = true; });
    sheet.setFilter(1, { type: 'equals', value: 'x' });
    expect(fired).toBe(true);
    sub.dispose(); sheet.dispose();
  });

  test('setAutoFilterRange emits structure-changed', () => {
    let fired = false;
    const sub = sheet.on('structure-changed', () => { fired = true; });
    sheet.setAutoFilterRange(1, 1, 5);
    expect(fired).toBe(true);
    sub.dispose(); sheet.dispose();
  });
});

// ---------------------------------------------------------------------------
// §16 Disposed-sheet safety
// ---------------------------------------------------------------------------

describe('§16 Disposed-sheet safety', () => {
  test('setFilter throws after dispose', () => {
    const sheet = makeSheet();
    sheet.dispose();
    expect(() => sheet.setFilter(1, { type: 'equals', value: 'x' })).toThrow('disposed');
  });

  test('clearFilter throws after dispose', () => {
    const sheet = makeSheet();
    sheet.dispose();
    expect(() => sheet.clearFilter(1)).toThrow('disposed');
  });

  test('clearAllFilters throws after dispose', () => {
    const sheet = makeSheet();
    sheet.dispose();
    expect(() => sheet.clearAllFilters()).toThrow('disposed');
  });

  test('getFilter throws after dispose', () => {
    const sheet = makeSheet();
    sheet.dispose();
    expect(() => sheet.getFilter(1)).toThrow('disposed');
  });

  test('getVisibleRows throws after dispose', () => {
    const sheet = makeSheet();
    sheet.dispose();
    expect(() => sheet.getVisibleRows()).toThrow('disposed');
  });

  test('getDistinctValues throws after dispose', () => {
    const sheet = makeSheet();
    sheet.dispose();
    expect(() => sheet.getDistinctValues(1)).toThrow('disposed');
  });

  test('setAutoFilterRange throws after dispose', () => {
    const sheet = makeSheet();
    sheet.dispose();
    expect(() => sheet.setAutoFilterRange(1, 1, 5)).toThrow('disposed');
  });

  test('clearAutoFilterRange throws after dispose', () => {
    const sheet = makeSheet();
    sheet.dispose();
    expect(() => sheet.clearAutoFilterRange()).toThrow('disposed');
  });

  test('getAutoFilterRange throws after dispose', () => {
    const sheet = makeSheet();
    sheet.dispose();
    expect(() => sheet.getAutoFilterRange()).toThrow('disposed');
  });
});
