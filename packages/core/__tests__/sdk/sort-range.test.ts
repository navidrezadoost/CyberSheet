/**
 * sort-range.test.ts — Phase 21: sortRange SDK Test Suite
 *
 * Coverage:
 *   §1  sortRange ascending (text + number)
 *   §2  sortRange descending
 *   §3  Multi-key sort (primary + secondary)
 *   §4  Sort stability (equal values preserve original order)
 *   §5  Cells outside the sort range are untouched
 *   §6  sort type: 'number' (numeric coercion for string cells)
 *   §7  no-op when keys array is empty
 *   §8  Undo / Redo sortRange
 *   §9  Undo + Redo chained with other operations
 *   §10 sort-applied event fires
 *   §11 Disposed-sheet safety
 *
 * Run: npx jest packages/core/__tests__/sdk/sort-range.test.ts --no-coverage --verbose
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { createSpreadsheet } from '../../src/sdk/SpreadsheetSDK';
import type { SpreadsheetSDK } from '../../src/sdk/SpreadsheetSDK';
import type { SortKey, Range } from '../../src/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSheet(rows = 20, cols = 10): SpreadsheetSDK {
  return createSpreadsheet('SortTest', { rows, cols });
}

/** Returns cell values for a rectangular region as row-major array. */
function readGrid(sheet: SpreadsheetSDK, startRow: number, startCol: number, endRow: number, endCol: number): unknown[][] {
  const out: unknown[][] = [];
  for (let r = startRow; r <= endRow; r++) {
    const row: unknown[] = [];
    for (let c = startCol; c <= endCol; c++) {
      row.push(sheet.getCellValue(r, c));
    }
    out.push(row);
  }
  return out;
}

function colValues(sheet: SpreadsheetSDK, col: number, startRow: number, endRow: number): unknown[] {
  return Array.from({ length: endRow - startRow + 1 }, (_, i) => sheet.getCellValue(startRow + i, col));
}

const range = (r1: number, c1: number, r2: number, c2: number): Range => ({
  start: { row: r1, col: c1 },
  end: { row: r2, col: c2 },
});

// ---------------------------------------------------------------------------
// §1 sortRange ascending
// ---------------------------------------------------------------------------

describe('§1 sortRange ascending', () => {
  let sheet: SpreadsheetSDK;
  beforeEach(() => { sheet = makeSheet(); });

  test('sorts numeric column ascending', () => {
    sheet.setCell(1, 1, 30);
    sheet.setCell(2, 1, 10);
    sheet.setCell(3, 1, 20);

    const keys: SortKey[] = [{ col: 1, dir: 'asc', type: 'number' }];
    sheet.sortRange(range(1, 1, 3, 1), keys);

    expect(colValues(sheet, 1, 1, 3)).toEqual([10, 20, 30]);
    sheet.dispose();
  });

  test('sorts text column ascending (alphabetical, case-insensitive)', () => {
    sheet.setCell(1, 1, 'Cherry');
    sheet.setCell(2, 1, 'apple');
    sheet.setCell(3, 1, 'Banana');

    const keys: SortKey[] = [{ col: 1, dir: 'asc', type: 'text' }];
    sheet.sortRange(range(1, 1, 3, 1), keys);

    expect(colValues(sheet, 1, 1, 3).map(v => (v as string).toLowerCase()))
      .toEqual(['apple', 'banana', 'cherry']);
    sheet.dispose();
  });

  test('null values sorted last in ascending order', () => {
    sheet.setCell(1, 1, 5);
    // row 2 is null
    sheet.setCell(3, 1, 3);

    const keys: SortKey[] = [{ col: 1, dir: 'asc', type: 'number' }];
    sheet.sortRange(range(1, 1, 3, 1), keys);

    expect(colValues(sheet, 1, 1, 3)).toEqual([3, 5, null]);
    sheet.dispose();
  });
});

// ---------------------------------------------------------------------------
// §2 sortRange descending
// ---------------------------------------------------------------------------

describe('§2 sortRange descending', () => {
  let sheet: SpreadsheetSDK;
  beforeEach(() => { sheet = makeSheet(); });

  test('sorts numeric column descending', () => {
    sheet.setCell(1, 1, 10);
    sheet.setCell(2, 1, 30);
    sheet.setCell(3, 1, 20);

    const keys: SortKey[] = [{ col: 1, dir: 'desc', type: 'number' }];
    sheet.sortRange(range(1, 1, 3, 1), keys);

    expect(colValues(sheet, 1, 1, 3)).toEqual([30, 20, 10]);
    sheet.dispose();
  });

  test('sorts text column descending', () => {
    sheet.setCell(1, 1, 'Apple');
    sheet.setCell(2, 1, 'Cherry');
    sheet.setCell(3, 1, 'Banana');

    const keys: SortKey[] = [{ col: 1, dir: 'desc', type: 'text' }];
    sheet.sortRange(range(1, 1, 3, 1), keys);

    expect(colValues(sheet, 1, 1, 3).map(v => (v as string).toLowerCase()))
      .toEqual(['cherry', 'banana', 'apple']);
    sheet.dispose();
  });

  test('null values sorted last in descending order', () => {
    // row 1 null
    sheet.setCell(2, 1, 5);
    sheet.setCell(3, 1, 3);

    const keys: SortKey[] = [{ col: 1, dir: 'desc', type: 'number' }];
    sheet.sortRange(range(1, 1, 3, 1), keys);

    expect(colValues(sheet, 1, 1, 3)).toEqual([5, 3, null]);
    sheet.dispose();
  });
});

// ---------------------------------------------------------------------------
// §3 Multi-key sort
// ---------------------------------------------------------------------------

describe('§3 Multi-key sort', () => {
  let sheet: SpreadsheetSDK;
  beforeEach(() => { sheet = makeSheet(); });

  test('secondary key breaks ties in primary key', () => {
    // Col1=Category, Col2=Score
    const rows = [
      ['B', 10],
      ['A', 20],
      ['A', 10],
      ['B', 5],
    ];
    rows.forEach(([cat, score], i) => {
      sheet.setCell(i + 1, 1, cat as string);
      sheet.setCell(i + 1, 2, score as number);
    });

    const keys: SortKey[] = [
      { col: 1, dir: 'asc', type: 'text' },    // primary: category A then B
      { col: 2, dir: 'asc', type: 'number' },   // secondary: score asc
    ];
    sheet.sortRange(range(1, 1, 4, 2), keys);

    const col1 = colValues(sheet, 1, 1, 4);
    const col2 = colValues(sheet, 2, 1, 4);

    // Expected: A/10, A/20, B/5, B/10
    expect(col1).toEqual(['A', 'A', 'B', 'B']);
    expect(col2).toEqual([10, 20, 5, 10]);
    sheet.dispose();
  });
});

// ---------------------------------------------------------------------------
// §4 Sort stability
// ---------------------------------------------------------------------------

describe('§4 Sort stability', () => {
  let sheet: SpreadsheetSDK;
  beforeEach(() => { sheet = makeSheet(); });

  test('rows with equal primary-key values preserve their original relative order', () => {
    // Two rows both equal on sort key — check col2 (tie-break marker) stays ordered
    sheet.setCell(1, 1, 10); sheet.setCell(1, 2, 'first');
    sheet.setCell(2, 1, 5);  sheet.setCell(2, 2, 'middle');
    sheet.setCell(3, 1, 10); sheet.setCell(3, 2, 'second');

    const keys: SortKey[] = [{ col: 1, dir: 'asc', type: 'number' }];
    sheet.sortRange(range(1, 1, 3, 2), keys);

    // 5 is row 1; then col1=10 rows should be 'first','second' in original order
    expect(sheet.getCellValue(1, 1)).toBe(5);
    expect(sheet.getCellValue(2, 2)).toBe('first');
    expect(sheet.getCellValue(3, 2)).toBe('second');
    sheet.dispose();
  });
});

// ---------------------------------------------------------------------------
// §5 Cells outside range untouched
// ---------------------------------------------------------------------------

describe('§5 Cells outside range untouched', () => {
  let sheet: SpreadsheetSDK;
  beforeEach(() => { sheet = makeSheet(); });

  test('rows above / below the sort range are not moved', () => {
    sheet.setCell(1, 1, 'header');       // above sort range
    sheet.setCell(2, 1, 30);
    sheet.setCell(3, 1, 10);
    sheet.setCell(4, 1, 20);
    sheet.setCell(5, 1, 'footer');       // below sort range

    const keys: SortKey[] = [{ col: 1, dir: 'asc', type: 'number' }];
    sheet.sortRange(range(2, 1, 4, 1), keys);    // sort rows 2-4 only

    expect(sheet.getCellValue(1, 1)).toBe('header');
    expect(colValues(sheet, 1, 2, 4)).toEqual([10, 20, 30]);
    expect(sheet.getCellValue(5, 1)).toBe('footer');
    sheet.dispose();
  });

  test('columns outside the sort column range are moved with their row', () => {
    // Sort by col 1; col 2 must travel with the row
    sheet.setCell(1, 1, 'B'); sheet.setCell(1, 2, 2);
    sheet.setCell(2, 1, 'A'); sheet.setCell(2, 2, 1);

    const keys: SortKey[] = [{ col: 1, dir: 'asc', type: 'text' }];
    sheet.sortRange(range(1, 1, 2, 2), keys);

    expect(sheet.getCellValue(1, 1)).toBe('A');
    expect(sheet.getCellValue(1, 2)).toBe(1);
    expect(sheet.getCellValue(2, 1)).toBe('B');
    expect(sheet.getCellValue(2, 2)).toBe(2);
    sheet.dispose();
  });
});

// ---------------------------------------------------------------------------
// §6 Sort type: 'number'
// ---------------------------------------------------------------------------

describe('§6 Sort type number coercion', () => {
  let sheet: SpreadsheetSDK;
  beforeEach(() => { sheet = makeSheet(); });

  test('numeric sort with explicit type:number', () => {
    sheet.setCell(1, 1, 100);
    sheet.setCell(2, 1, 9);
    sheet.setCell(3, 1, 20);

    const keys: SortKey[] = [{ col: 1, dir: 'asc', type: 'number' }];
    sheet.sortRange(range(1, 1, 3, 1), keys);

    expect(colValues(sheet, 1, 1, 3)).toEqual([9, 20, 100]);
    sheet.dispose();
  });

  test('default (no type specified) still sorts as text', () => {
    sheet.setCell(1, 1, 'C');
    sheet.setCell(2, 1, 'A');
    sheet.setCell(3, 1, 'B');

    const keys: SortKey[] = [{ col: 1, dir: 'asc' }];
    sheet.sortRange(range(1, 1, 3, 1), keys);

    expect(colValues(sheet, 1, 1, 3)).toEqual(['A', 'B', 'C']);
    sheet.dispose();
  });
});

// ---------------------------------------------------------------------------
// §7 No-op when keys is empty
// ---------------------------------------------------------------------------

describe('§7 No-op with empty keys', () => {
  let sheet: SpreadsheetSDK;
  beforeEach(() => { sheet = makeSheet(); });

  test('sortRange with [] keys leaves sheet unchanged', () => {
    sheet.setCell(1, 1, 'B');
    sheet.setCell(2, 1, 'A');

    sheet.sortRange(range(1, 1, 2, 1), []);

    expect(colValues(sheet, 1, 1, 2)).toEqual(['B', 'A']);
    sheet.dispose();
  });

  test('sortRange with [] keys does not push onto undo stack', () => {
    sheet.sortRange(range(1, 1, 3, 1), []);
    expect(sheet.canUndo).toBe(false);
    sheet.dispose();
  });
});

// ---------------------------------------------------------------------------
// §8 Undo / Redo sortRange
// ---------------------------------------------------------------------------

describe('§8 Undo / Redo sortRange', () => {
  let sheet: SpreadsheetSDK;
  beforeEach(() => { sheet = makeSheet(); });

  test('undo restores original order', () => {
    sheet.setCell(1, 1, 30);
    sheet.setCell(2, 1, 10);
    sheet.setCell(3, 1, 20);

    const keys: SortKey[] = [{ col: 1, dir: 'asc', type: 'number' }];
    sheet.sortRange(range(1, 1, 3, 1), keys);
    sheet.undo();

    expect(colValues(sheet, 1, 1, 3)).toEqual([30, 10, 20]);
    sheet.dispose();
  });

  test('redo re-applies sort after undo', () => {
    sheet.setCell(1, 1, 30);
    sheet.setCell(2, 1, 10);
    sheet.setCell(3, 1, 20);

    const keys: SortKey[] = [{ col: 1, dir: 'asc', type: 'number' }];
    sheet.sortRange(range(1, 1, 3, 1), keys);
    sheet.undo();
    sheet.redo();

    expect(colValues(sheet, 1, 1, 3)).toEqual([10, 20, 30]);
    sheet.dispose();
  });

  test('canUndo is true after sortRange (non-empty keys)', () => {
    sheet.setCell(1, 1, 3); sheet.setCell(2, 1, 1); sheet.setCell(3, 1, 2);
    sheet.sortRange(range(1, 1, 3, 1), [{ col: 1, dir: 'asc', type: 'number' }]);
    expect(sheet.canUndo).toBe(true);
    sheet.dispose();
  });

  test('undo of sort restores multi-column grid correctly', () => {
    sheet.setCell(1, 1, 'B'); sheet.setCell(1, 2, 2);
    sheet.setCell(2, 1, 'A'); sheet.setCell(2, 2, 1);

    sheet.sortRange(range(1, 1, 2, 2), [{ col: 1, dir: 'asc', type: 'text' }]);
    sheet.undo();

    expect(readGrid(sheet, 1, 1, 2, 2)).toEqual([['B', 2], ['A', 1]]);
    sheet.dispose();
  });
});

// ---------------------------------------------------------------------------
// §9 Undo + Redo chained with other operations
// ---------------------------------------------------------------------------

describe('§9 Chained undo/redo', () => {
  let sheet: SpreadsheetSDK;
  beforeEach(() => { sheet = makeSheet(); });

  test('undo multiple ops one by one in correct order', () => {
    sheet.setCell(1, 1, 3);
    sheet.setCell(2, 1, 1);
    sheet.setCell(3, 1, 2);

    sheet.setCell(1, 2, 'extra');   // one more op
    sheet.sortRange(range(1, 1, 3, 1), [{ col: 1, dir: 'asc', type: 'number' }]);

    // undo sort
    sheet.undo();
    expect(colValues(sheet, 1, 1, 3)).toEqual([3, 1, 2]);

    // undo extra setCell
    sheet.undo();
    expect(sheet.getCellValue(1, 2)).toBeNull();

    sheet.dispose();
  });
});

// ---------------------------------------------------------------------------
// §10 sort-applied event fires
// ---------------------------------------------------------------------------

describe('§10 sort-applied event', () => {
  let sheet: SpreadsheetSDK;
  beforeEach(() => { sheet = makeSheet(); });

  test('sort-applied event fires with correct bounds', () => {
    sheet.setCell(1, 1, 2); sheet.setCell(2, 1, 1);

    const events: any[] = [];
    const sub = sheet.on('sort-applied', e => events.push(e));

    sheet.sortRange(range(1, 1, 2, 1), [{ col: 1, dir: 'asc', type: 'number' }]);

    expect(events.length).toBeGreaterThan(0);
    const ev = events[0]!;
    expect(ev.startRow).toBe(1);
    expect(ev.startCol).toBe(1);
    expect(ev.endRow).toBe(2);
    expect(ev.endCol).toBe(1);

    sub.dispose(); sheet.dispose();
  });

  test('structure-changed fires alongside sort-applied', () => {
    sheet.setCell(1, 1, 2); sheet.setCell(2, 1, 1);
    let structureFired = false;
    const sub = sheet.on('structure-changed', () => { structureFired = true; });

    sheet.sortRange(range(1, 1, 2, 1), [{ col: 1, dir: 'asc', type: 'number' }]);

    expect(structureFired).toBe(true);
    sub.dispose(); sheet.dispose();
  });

  test('sort-applied does not fire when keys array is empty', () => {
    const events: any[] = [];
    const sub = sheet.on('sort-applied', e => events.push(e));

    sheet.sortRange(range(1, 1, 3, 1), []);

    expect(events.length).toBe(0);
    sub.dispose(); sheet.dispose();
  });
});

// ---------------------------------------------------------------------------
// §11 Disposed-sheet safety
// ---------------------------------------------------------------------------

describe('§11 Disposed-sheet safety', () => {
  test('sortRange throws after dispose', () => {
    const sheet = makeSheet();
    sheet.dispose();
    expect(() => sheet.sortRange(range(1, 1, 3, 1), [{ col: 1, dir: 'asc' }]))
      .toThrow('disposed');
  });
});
