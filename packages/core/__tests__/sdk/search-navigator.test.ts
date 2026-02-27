/**
 * @group sdk
 *
 * Phase 18B: Search Navigator (SearchCursor) — Test Suite
 *
 * Tests the `SearchCursor` class from the `./search` subpath.
 *
 * §1  Basic construction and initial state
 * §2  findNext() — forward navigation with wrap-around
 * §3  findPrev() — backward navigation with wrap-around
 * §4  reset() — clear position and restart
 * §5  Mixed findNext/findPrev navigation
 * §6  No-match cases
 * §7  SearchOptions forwarding (matchCase, lookAt, lookIn)
 * §8  Range constraint
 * §9  visitCount tracking
 * §10 collectAll() convenience method
 */

import { createSpreadsheet } from '../../src/sdk/index';
import { SearchCursor } from '../../src/search/index';
import type { Worksheet } from '../../src/worksheet';
import type { SpreadsheetSDK } from '../../src/sdk/SpreadsheetSDK';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSheet(rows = 20, cols = 10): { sheet: SpreadsheetSDK; ws: Worksheet } {
  const sheet = createSpreadsheet('Test', { rows, cols });
  const ws = (sheet as any)._ws as Worksheet;
  return { sheet, ws };
}

function key(addr: { row: number; col: number } | null): string {
  if (!addr) return 'null';
  return `${addr.row}:${addr.col}`;
}

// ---------------------------------------------------------------------------
// §1 — Construction and initial state
// ---------------------------------------------------------------------------

describe('§1 SearchCursor — construction', () => {
  test('current is null before first call', () => {
    const { sheet } = makeSheet();
    const cursor = new SearchCursor(sheet, { what: 'Apple' });
    expect(cursor.current).toBeNull();
  });

  test('visitCount is 0 before first call', () => {
    const { sheet } = makeSheet();
    const cursor = new SearchCursor(sheet, { what: 'Apple' });
    expect(cursor.visitCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §2 — findNext(): forward navigation
// ---------------------------------------------------------------------------

describe('§2 SearchCursor — findNext()', () => {
  test('returns the first match on first call', () => {
    const { sheet, ws } = makeSheet();
    ws.setCellValue({ row: 3, col: 2 }, 'Apple');
    ws.setCellValue({ row: 5, col: 1 }, 'Apple');

    const cursor = new SearchCursor(sheet, { what: 'Apple' });
    const first = cursor.findNext();
    expect(first).toEqual({ row: 3, col: 2 }); // row-major: 3:2 before 5:1
  });

  test('advances to the next match on second call', () => {
    const { sheet, ws } = makeSheet();
    ws.setCellValue({ row: 1, col: 1 }, 'Apple');
    ws.setCellValue({ row: 2, col: 1 }, 'Apple');
    ws.setCellValue({ row: 3, col: 1 }, 'Apple');

    const cursor = new SearchCursor(sheet, { what: 'Apple' });
    cursor.findNext(); // → 1:1
    const second = cursor.findNext();
    expect(key(second)).toBe('2:1');
  });

  test('wraps around after last match', () => {
    const { sheet, ws } = makeSheet();
    ws.setCellValue({ row: 1, col: 1 }, 'X');
    ws.setCellValue({ row: 2, col: 1 }, 'X');

    const cursor = new SearchCursor(sheet, { what: 'X' });
    cursor.findNext(); // → 1:1
    cursor.findNext(); // → 2:1
    const wrapped = cursor.findNext(); // wraps → 1:1
    expect(key(wrapped)).toBe('1:1');
  });

  test('updates current after each call', () => {
    const { sheet, ws } = makeSheet();
    ws.setCellValue({ row: 1, col: 1 }, 'A');
    ws.setCellValue({ row: 2, col: 1 }, 'A');

    const cursor = new SearchCursor(sheet, { what: 'A' });
    cursor.findNext();
    expect(key(cursor.current)).toBe('1:1');
    cursor.findNext();
    expect(key(cursor.current)).toBe('2:1');
  });

  test('returns null when no cells match', () => {
    const { sheet, ws } = makeSheet();
    ws.setCellValue({ row: 1, col: 1 }, 'Mango');
    const cursor = new SearchCursor(sheet, { what: 'Apple' });
    expect(cursor.findNext()).toBeNull();
  });

  test('current is not updated when null is returned', () => {
    const { sheet, ws } = makeSheet();
    ws.setCellValue({ row: 1, col: 1 }, 'A');

    const cursor = new SearchCursor(sheet, { what: 'A' });
    cursor.findNext();                           // → 1:1
    (sheet as any)._ws.setCellValue({ row: 1, col: 1 }, 'B'); // no longer matches
    cursor.findNext();                           // → null
    expect(key(cursor.current)).toBe('1:1');    // unchanged
  });
});

// ---------------------------------------------------------------------------
// §3 — findPrev(): backward navigation
// ---------------------------------------------------------------------------

describe('§3 SearchCursor — findPrev()', () => {
  test('returns the last match on first call (before any findNext)', () => {
    const { sheet, ws } = makeSheet();
    ws.setCellValue({ row: 1, col: 1 }, 'A');
    ws.setCellValue({ row: 3, col: 5 }, 'A');

    const cursor = new SearchCursor(sheet, { what: 'A' });
    const last = cursor.findPrev();
    expect(key(last)).toBe('3:5'); // row-major: 3:5 is the last
  });

  test('moves backward on successive calls', () => {
    const { sheet, ws } = makeSheet();
    ws.setCellValue({ row: 1, col: 1 }, 'A');
    ws.setCellValue({ row: 2, col: 1 }, 'A');
    ws.setCellValue({ row: 3, col: 1 }, 'A');

    const cursor = new SearchCursor(sheet, { what: 'A' });
    cursor.findPrev(); // → 3:1
    const prev2 = cursor.findPrev();
    expect(key(prev2)).toBe('2:1');
  });

  test('wraps from the first match back to the last', () => {
    const { sheet, ws } = makeSheet();
    ws.setCellValue({ row: 1, col: 1 }, 'A');
    ws.setCellValue({ row: 2, col: 1 }, 'A');

    const cursor = new SearchCursor(sheet, { what: 'A' });
    cursor.findPrev(); // → 2:1
    cursor.findPrev(); // → 1:1
    const wrapped = cursor.findPrev(); // wraps → 2:1
    expect(key(wrapped)).toBe('2:1');
  });

  test('returns null when no cells match', () => {
    const { sheet, ws } = makeSheet();
    ws.setCellValue({ row: 1, col: 1 }, 'Mango');
    const cursor = new SearchCursor(sheet, { what: 'Apple' });
    expect(cursor.findPrev()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// §4 — reset()
// ---------------------------------------------------------------------------

describe('§4 SearchCursor — reset()', () => {
  test('sets current to null', () => {
    const { sheet, ws } = makeSheet();
    ws.setCellValue({ row: 1, col: 1 }, 'X');
    const cursor = new SearchCursor(sheet, { what: 'X' });
    cursor.findNext();
    cursor.reset();
    expect(cursor.current).toBeNull();
  });

  test('sets visitCount to 0', () => {
    const { sheet, ws } = makeSheet();
    ws.setCellValue({ row: 1, col: 1 }, 'X');
    const cursor = new SearchCursor(sheet, { what: 'X' });
    cursor.findNext();
    cursor.findNext();
    expect(cursor.visitCount).toBe(2);
    cursor.reset();
    expect(cursor.visitCount).toBe(0);
  });

  test('findNext after reset starts from beginning', () => {
    const { sheet, ws } = makeSheet();
    ws.setCellValue({ row: 1, col: 1 }, 'A');
    ws.setCellValue({ row: 2, col: 1 }, 'A');

    const cursor = new SearchCursor(sheet, { what: 'A' });
    cursor.findNext(); // → 1:1
    cursor.findNext(); // → 2:1
    cursor.reset();

    const fresh = cursor.findNext(); // should restart from 1:1
    expect(key(fresh)).toBe('1:1');
  });
});

// ---------------------------------------------------------------------------
// §5 — Mixed findNext / findPrev
// ---------------------------------------------------------------------------

describe('§5 SearchCursor — mixed navigation', () => {
  test('findNext then findPrev goes back to previous', () => {
    const { sheet, ws } = makeSheet();
    ws.setCellValue({ row: 1, col: 1 }, 'A');
    ws.setCellValue({ row: 2, col: 1 }, 'A');
    ws.setCellValue({ row: 3, col: 1 }, 'A');

    const cursor = new SearchCursor(sheet, { what: 'A' });
    cursor.findNext(); // → 1:1
    cursor.findNext(); // → 2:1
    const prev = cursor.findPrev(); // ← 1:1
    expect(key(prev)).toBe('1:1');
  });

  test('cursor position is shared between findNext and findPrev', () => {
    const { sheet, ws } = makeSheet();
    ws.setCellValue({ row: 1, col: 1 }, 'Q');
    ws.setCellValue({ row: 4, col: 3 }, 'Q');

    const cursor = new SearchCursor(sheet, { what: 'Q' });
    cursor.findNext();               // → 1:1, current = 1:1
    cursor.findPrev();               // ← moves before 1:1 → wraps → 4:3
    expect(key(cursor.current)).toBe('4:3');
  });
});

// ---------------------------------------------------------------------------
// §6 — No-match edge cases
// ---------------------------------------------------------------------------

describe('§6 SearchCursor — no-match cases', () => {
  test('returns null on empty sheet', () => {
    const { sheet } = makeSheet();
    const cursor = new SearchCursor(sheet, { what: 'anything' });
    expect(cursor.findNext()).toBeNull();
    expect(cursor.findPrev()).toBeNull();
  });

  test('returns null with empty what string', () => {
    const { sheet, ws } = makeSheet();
    ws.setCellValue({ row: 1, col: 1 }, 'Apple');
    const cursor = new SearchCursor(sheet, { what: '' });
    expect(cursor.findNext()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// §7 — SearchOptions forwarding
// ---------------------------------------------------------------------------

describe('§7 SearchCursor — SearchOptions forwarding', () => {
  test('matchCase: true is respected', () => {
    const { sheet, ws } = makeSheet();
    ws.setCellValue({ row: 1, col: 1 }, 'APPLE');
    ws.setCellValue({ row: 2, col: 1 }, 'apple');

    const cursor = new SearchCursor(sheet, { what: 'apple', matchCase: true });
    const first = cursor.findNext();
    expect(key(first)).toBe('2:1'); // uppercase APPLE skipped
  });

  test("lookAt: 'whole' requires exact match", () => {
    const { sheet, ws } = makeSheet();
    ws.setCellValue({ row: 1, col: 1 }, 'Apple');
    ws.setCellValue({ row: 2, col: 1 }, 'Apple Pie');

    const cursor = new SearchCursor(sheet, { what: 'Apple', lookAt: 'whole' });
    const found = cursor.findNext();
    expect(key(found)).toBe('1:1');

    const second = cursor.findNext(); // only 1 exact match → wraps
    expect(key(second)).toBe('1:1');
  });

  test("lookIn: 'formulas' searches formula strings", () => {
    const { sheet, ws } = makeSheet();
    ws.setCellValue({ row: 1, col: 1 }, 'SUM of things'); // value cell
    ws.setCellFormula({ row: 2, col: 1 }, '=SUM(A1:A5)', 15);

    const cursor = new SearchCursor(sheet, { what: '=SUM', lookIn: 'formulas' });
    const found = cursor.findNext();
    // Only the formula cell matches on formula string "=SUM(...)"
    expect(key(found)).toBe('2:1');
  });
});

// ---------------------------------------------------------------------------
// §8 — Range constraint
// ---------------------------------------------------------------------------

describe('§8 SearchCursor — range constraint', () => {
  test('only visits cells within the range', () => {
    const { sheet, ws } = makeSheet();
    ws.setCellValue({ row: 1, col: 1 }, 'X'); // outside
    ws.setCellValue({ row: 4, col: 2 }, 'X'); // inside
    ws.setCellValue({ row: 9, col: 1 }, 'X'); // outside

    const cursor = new SearchCursor(
      sheet,
      { what: 'X' },
      { start: { row: 3, col: 1 }, end: { row: 6, col: 5 } },
    );

    const first = cursor.findNext();
    expect(key(first)).toBe('4:2');

    // Wrap-around should return the same cell (only 1 match in range)
    const second = cursor.findNext();
    expect(key(second)).toBe('4:2');
  });

  test('returns null when range has no matches', () => {
    const { sheet, ws } = makeSheet();
    ws.setCellValue({ row: 1, col: 1 }, 'X');

    const cursor = new SearchCursor(
      sheet,
      { what: 'X' },
      { start: { row: 5, col: 5 }, end: { row: 10, col: 10 } },
    );
    expect(cursor.findNext()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// §9 — visitCount tracking
// ---------------------------------------------------------------------------

describe('§9 SearchCursor — visitCount', () => {
  test('increments by 1 for each successful find', () => {
    const { sheet, ws } = makeSheet();
    ws.setCellValue({ row: 1, col: 1 }, 'A');
    ws.setCellValue({ row: 2, col: 1 }, 'A');

    const cursor = new SearchCursor(sheet, { what: 'A' });
    expect(cursor.visitCount).toBe(0);
    cursor.findNext();
    expect(cursor.visitCount).toBe(1);
    cursor.findNext();
    expect(cursor.visitCount).toBe(2);
    cursor.findPrev();
    expect(cursor.visitCount).toBe(3);
  });

  test('does not increment when findNext returns null', () => {
    const { sheet, ws } = makeSheet();
    ws.setCellValue({ row: 1, col: 1 }, 'Mango');
    const cursor = new SearchCursor(sheet, { what: 'Apple' });
    cursor.findNext();
    expect(cursor.visitCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §10 — collectAll()
// ---------------------------------------------------------------------------

describe('§10 SearchCursor — collectAll()', () => {
  test('returns all matching addresses in row-major order', () => {
    const { sheet, ws } = makeSheet();
    ws.setCellValue({ row: 3, col: 1 }, 'Q');
    ws.setCellValue({ row: 1, col: 2 }, 'Q');
    ws.setCellValue({ row: 2, col: 4 }, 'Q');

    const cursor = new SearchCursor(sheet, { what: 'Q' });
    const all = cursor.collectAll();
    expect(all.map(a => `${a.row}:${a.col}`)).toEqual(['1:2', '2:4', '3:1']);
  });

  test('resets cursor position after collectAll', () => {
    const { sheet, ws } = makeSheet();
    ws.setCellValue({ row: 1, col: 1 }, 'Z');

    const cursor = new SearchCursor(sheet, { what: 'Z' });
    cursor.collectAll();
    expect(cursor.current).toBeNull();
    expect(cursor.visitCount).toBe(0);
  });

  test('returns [] when no cells match', () => {
    const { sheet, ws } = makeSheet();
    ws.setCellValue({ row: 1, col: 1 }, 'Mango');
    const cursor = new SearchCursor(sheet, { what: 'Apple' });
    expect(cursor.collectAll()).toHaveLength(0);
  });

  test('collectAll result matches findAll result', () => {
    const { sheet, ws } = makeSheet();
    ws.setCellValue({ row: 1, col: 1 }, 'Target');
    ws.setCellValue({ row: 2, col: 3 }, 'Target');
    ws.setCellValue({ row: 4, col: 2 }, 'Target');

    const cursor = new SearchCursor(sheet, { what: 'Target' });
    const fromCursor = cursor.collectAll().map(a => `${a.row}:${a.col}`);

    // findAll gives the same set
    const { findAll } = require('../../src/search/index');
    const fromFindAll = findAll(sheet, { what: 'Target' }).map((a: any) => `${a.row}:${a.col}`);

    expect(fromCursor.sort()).toEqual(fromFindAll.sort());
  });
});
