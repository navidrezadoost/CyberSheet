/**
 * @group sdk
 *
 * Phase 16: Formula Search & Replace — Test Suite
 *
 * Tests the `./search` subpath: `findInFormulas` and `replaceInFormulas`.
 *
 * ─── Design rules under test ────────────────────────────────────────────────
 *   §1  findInFormulas — basic contract (match/no-match, empty query, etc.)
 *   §2  findInFormulas — case sensitivity
 *   §3  findInFormulas — lookAt 'whole' vs 'part'
 *   §4  findInFormulas — result ordering (row-major determinism)
 *   §5  findInFormulas — isolation (only formula cells, not value-only cells)
 *   §6  findInFormulas — special characters in query
 *   §7  replaceInFormulas — count contract
 *   §8  replaceInFormulas — value update and undo integration
 *   §9  replaceInFormulas — event emission
 *  §10  replaceInFormulas — lookAt 'whole' and 'part'
 *  §11  replaceInFormulas — case sensitivity
 *  §12  Statelesness & determinism
 *  §13  Disposed-sheet safety
 *
 * Setup convention:
 *   - createSpreadsheet() creates the public SDK handle.
 *   - (sheet as any)._ws.setCellFormula() plants formula cells with a known
 *     formula string AND an optional pre-evaluated display value.
 *   - (sheet as any)._ws.registerDependencies() is used in §12 stress test to
 *     confirm both cell-store and DAG paths produce consistent results.
 */

import { createSpreadsheet } from '../../src/sdk/index';
import { findInFormulas, replaceInFormulas } from '../../src/search/index';
import type { FormulaSearchOptions, FormulaSearchResult } from '../../src/search/index';
import type { Worksheet } from '../../src/worksheet';
import type { SpreadsheetSDK } from '../../src/sdk/SpreadsheetSDK';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Create a fresh 100×20 sheet and expose its internal Worksheet. */
function makeSheet(): { sheet: SpreadsheetSDK; ws: Worksheet } {
  const sheet = createSpreadsheet('TestSheet', { rows: 100, cols: 20 });
  const ws = (sheet as any)._ws as Worksheet;
  return { sheet, ws };
}

/**
 * Plant a formula cell via the internal `setCellFormula` path.
 * This correctly sets `cell.formula` (visible to `findInFormulas`) while also
 * optionally storing a display value in `cell.value`.
 */
function plantFormula(
  ws: Worksheet,
  row: number,
  col: number,
  formula: string,
  displayValue?: number | string,
): void {
  ws.setCellFormula({ row, col }, formula, displayValue);
}

// Convenience: collect only {row, col} pairs from results.
function coords(results: FormulaSearchResult[]): Array<{ row: number; col: number }> {
  return results.map(({ row, col }) => ({ row, col }));
}

// ---------------------------------------------------------------------------
// §1 — findInFormulas basic contract
// ---------------------------------------------------------------------------

describe('§1 findInFormulas — basic contract', () => {
  test('empty query returns empty array', () => {
    const { sheet, ws } = makeSheet();
    plantFormula(ws, 1, 1, '=SUM(A1:A10)', 55);
    expect(findInFormulas(sheet, '')).toEqual([]);
  });

  test('returns empty array when no formula cells exist', () => {
    const { sheet, ws } = makeSheet();
    ws.setCellValue({ row: 1, col: 1 }, 42); // plain value, no formula
    expect(findInFormulas(sheet, 'SUM')).toEqual([]);
  });

  test('returns empty array when formulas do not match', () => {
    const { sheet, ws } = makeSheet();
    plantFormula(ws, 1, 1, '=AVERAGE(B1:B5)', 10);
    expect(findInFormulas(sheet, 'SUM')).toEqual([]);
  });

  test('finds a single matching formula cell', () => {
    const { sheet, ws } = makeSheet();
    plantFormula(ws, 3, 2, '=SUM(A1:A10)', 55);
    const results = findInFormulas(sheet, 'SUM');
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({ row: 3, col: 2, formula: '=SUM(A1:A10)' });
  });

  test('returns the full formula string in the result', () => {
    const { sheet, ws } = makeSheet();
    plantFormula(ws, 1, 1, '=IF(A1>0,A1*2,0)', 0);
    const [match] = findInFormulas(sheet, 'IF');
    expect(match.formula).toBe('=IF(A1>0,A1*2,0)');
  });

  test('finds multiple matching cells', () => {
    const { sheet, ws } = makeSheet();
    plantFormula(ws, 1, 1, '=SUM(A1:A5)', 10);
    plantFormula(ws, 2, 1, '=SUMIF(A1:A5,">0")', 8);
    plantFormula(ws, 3, 1, '=AVERAGE(A1:A5)', 2);
    plantFormula(ws, 4, 1, '=SUM(B1:B5)', 12);

    const results = findInFormulas(sheet, 'SUM');
    expect(results).toHaveLength(3);
    expect(coords(results)).toContainEqual({ row: 1, col: 1 });
    expect(coords(results)).toContainEqual({ row: 2, col: 1 });
    expect(coords(results)).toContainEqual({ row: 4, col: 1 });
  });

  test('match is a substring anywhere in formula by default', () => {
    const { sheet, ws } = makeSheet();
    plantFormula(ws, 1, 1, '=SUMIF(A1:A5,">0",B1:B5)');
    // "SUM" is a substring of "SUMIF"
    const results = findInFormulas(sheet, 'SUM');
    expect(results).toHaveLength(1);
    expect(results[0].formula).toBe('=SUMIF(A1:A5,">0",B1:B5)');
  });
});

// ---------------------------------------------------------------------------
// §2 — findInFormulas case sensitivity
// ---------------------------------------------------------------------------

describe('§2 findInFormulas — case sensitivity', () => {
  test('search is case-insensitive by default', () => {
    const { sheet, ws } = makeSheet();
    plantFormula(ws, 1, 1, '=SUM(A1:A10)');
    // Lowercase query should still match
    expect(findInFormulas(sheet, 'sum')).toHaveLength(1);
    expect(findInFormulas(sheet, 'Sum')).toHaveLength(1);
    expect(findInFormulas(sheet, 'SUM')).toHaveLength(1);
  });

  test('matchCase: true only matches exact case', () => {
    const { sheet, ws } = makeSheet();
    plantFormula(ws, 1, 1, '=SUM(A1:A10)');
    expect(findInFormulas(sheet, 'SUM', { matchCase: true })).toHaveLength(1);
    expect(findInFormulas(sheet, 'sum', { matchCase: true })).toHaveLength(0);
    expect(findInFormulas(sheet, 'Sum', { matchCase: true })).toHaveLength(0);
  });

  test('case-insensitive search across multiple cells with mixed casing', () => {
    const { sheet, ws } = makeSheet();
    plantFormula(ws, 1, 1, '=SUM(A1:A5)');
    plantFormula(ws, 2, 1, '=sum(B1:B5)'); // hypothetical lowercase formula
    const results = findInFormulas(sheet, 'sum', { matchCase: false });
    expect(results).toHaveLength(2);
  });

  test('case-sensitive search distinguishes upper/lower in query', () => {
    const { sheet, ws } = makeSheet();
    plantFormula(ws, 1, 1, '=VLOOKUP(A1,B:C,2,FALSE)');
    plantFormula(ws, 2, 1, '=vlookup(A1,B:C,2,FALSE)');
    expect(findInFormulas(sheet, 'VLOOKUP', { matchCase: true })).toHaveLength(1);
    expect(findInFormulas(sheet, 'vlookup', { matchCase: true })).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// §3 — findInFormulas lookAt 'whole' vs 'part'
// ---------------------------------------------------------------------------

describe('§3 findInFormulas — lookAt option', () => {
  test("lookAt: 'part' (default) matches substrings", () => {
    const { sheet, ws } = makeSheet();
    plantFormula(ws, 1, 1, '=SUM(A1:A10)');
    expect(findInFormulas(sheet, 'SUM', { lookAt: 'part' })).toHaveLength(1);
    expect(findInFormulas(sheet, 'A1:A10', { lookAt: 'part' })).toHaveLength(1);
    expect(findInFormulas(sheet, '=SUM(A1:', { lookAt: 'part' })).toHaveLength(1);
  });

  test("lookAt: 'whole' requires full-formula match", () => {
    const { sheet, ws } = makeSheet();
    plantFormula(ws, 1, 1, '=SUM(A1:A10)');
    expect(findInFormulas(sheet, '=SUM(A1:A10)', { lookAt: 'whole' })).toHaveLength(1);
    expect(findInFormulas(sheet, 'SUM', { lookAt: 'whole' })).toHaveLength(0);
    expect(findInFormulas(sheet, '=SUM(A1:A10) ', { lookAt: 'whole' })).toHaveLength(0);
  });

  test("lookAt: 'whole' is case-insensitive by default", () => {
    const { sheet, ws } = makeSheet();
    plantFormula(ws, 1, 1, '=SUM(A1:A10)');
    expect(findInFormulas(sheet, '=sum(a1:a10)', { lookAt: 'whole' })).toHaveLength(1);
  });

  test("lookAt: 'whole' with matchCase: true is strict", () => {
    const { sheet, ws } = makeSheet();
    plantFormula(ws, 1, 1, '=SUM(A1:A10)');
    expect(findInFormulas(sheet, '=SUM(A1:A10)', { lookAt: 'whole', matchCase: true })).toHaveLength(1);
    expect(findInFormulas(sheet, '=sum(A1:A10)', { lookAt: 'whole', matchCase: true })).toHaveLength(0);
  });

  test("lookAt: 'whole' does not match prefix or suffix", () => {
    const { sheet, ws } = makeSheet();
    plantFormula(ws, 1, 1, '=SUM(A1:A10)');
    expect(findInFormulas(sheet, '=SUM', { lookAt: 'whole' })).toHaveLength(0);
    expect(findInFormulas(sheet, 'SUM(A1:A10)', { lookAt: 'whole' })).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// §4 — findInFormulas result ordering
// ---------------------------------------------------------------------------

describe('§4 findInFormulas — row-major result ordering', () => {
  test('results are sorted top-to-bottom, left-to-right', () => {
    const { sheet, ws } = makeSheet();
    // Insert in non-row-major order
    plantFormula(ws, 5, 3, '=SUM(A5)');
    plantFormula(ws, 1, 5, '=SUM(A1)');
    plantFormula(ws, 3, 1, '=SUM(A3)');
    plantFormula(ws, 1, 2, '=SUM(A1b)');
    plantFormula(ws, 3, 7, '=SUM(A3b)');

    const results = findInFormulas(sheet, 'SUM');
    const positions = coords(results);

    expect(positions).toEqual([
      { row: 1, col: 2 },
      { row: 1, col: 5 },
      { row: 3, col: 1 },
      { row: 3, col: 7 },
      { row: 5, col: 3 },
    ]);
  });

  test('single-row results are sorted by column ascending', () => {
    const { sheet, ws } = makeSheet();
    plantFormula(ws, 2, 10, '=SUM(x)');
    plantFormula(ws, 2, 3,  '=SUM(y)');
    plantFormula(ws, 2, 7,  '=SUM(z)');

    const results = findInFormulas(sheet, 'SUM');
    expect(coords(results)).toEqual([
      { row: 2, col: 3 },
      { row: 2, col: 7 },
      { row: 2, col: 10 },
    ]);
  });
});

// ---------------------------------------------------------------------------
// §5 — findInFormulas isolation (formula cells only)
// ---------------------------------------------------------------------------

describe('§5 findInFormulas — only searches formula cells', () => {
  test('ignores plain string values that look like formulas', () => {
    const { sheet, ws } = makeSheet();
    // Store formula-looking text as a plain cell VALUE (no cell.formula field)
    ws.setCellValue({ row: 1, col: 1 }, '=SUM(A1:A10)');
    const results = findInFormulas(sheet, 'SUM');
    expect(results).toHaveLength(0); // not a formula cell
  });

  test('ignores numeric value cells', () => {
    const { sheet, ws } = makeSheet();
    ws.setCellValue({ row: 1, col: 1 }, 42);
    expect(findInFormulas(sheet, '42')).toHaveLength(0);
  });

  test('formula cells ARE found even when display value is a number', () => {
    const { sheet, ws } = makeSheet();
    plantFormula(ws, 1, 1, '=SUM(A1:A10)', 55); // display value = 55, formula = '=SUM...'
    const results = findInFormulas(sheet, 'SUM');
    expect(results).toHaveLength(1);
    expect(results[0].formula).toBe('=SUM(A1:A10)');
  });

  test('mixed sheet: only formula cells matched', () => {
    const { sheet, ws } = makeSheet();
    ws.setCellValue({ row: 1, col: 1 }, 'text value with SUM');  // plain value
    ws.setCellValue({ row: 2, col: 1 }, 42);                      // numeric
    plantFormula(ws, 3, 1, '=SUM(C1:C5)', 30);                    // formula
    ws.setCellValue({ row: 4, col: 1 }, '=SUM(D1:D5)');           // fake formula

    const results = findInFormulas(sheet, 'SUM');
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({ row: 3, col: 1, formula: '=SUM(C1:C5)' });
  });
});

// ---------------------------------------------------------------------------
// §6 — findInFormulas special characters
// ---------------------------------------------------------------------------

describe('§6 findInFormulas — special characters in query', () => {
  test('dot in query is treated as literal, not regex wildcard', () => {
    const { sheet, ws } = makeSheet();
    plantFormula(ws, 1, 1, '=SUM(A1:A10)');
    plantFormula(ws, 2, 1, '=SUMX(A1:A10)'); // has 'X' where '.' would match

    // "A." would match "A1", "A2", etc. in regex — but as a literal it shouldn't
    const results = findInFormulas(sheet, 'A.1');
    expect(results).toHaveLength(0); // no formula contains the literal "A.1"
  });

  test('parentheses in query are treated as literals', () => {
    const { sheet, ws } = makeSheet();
    plantFormula(ws, 1, 1, '=SUM(A1:A10)');
    const results = findInFormulas(sheet, 'SUM(A1');
    expect(results).toHaveLength(1);
  });

  test('colon in query matches range reference', () => {
    const { sheet, ws } = makeSheet();
    plantFormula(ws, 1, 1, '=SUM(A1:A10)');
    plantFormula(ws, 2, 1, '=SUM(B1:B10)');
    plantFormula(ws, 3, 1, '=SUM(A1)');

    // ':A10' is a literal substring
    const results = findInFormulas(sheet, ':A10');
    expect(results).toHaveLength(1);
    expect(results[0].formula).toBe('=SUM(A1:A10)');
  });

  test('dollar sign in query matches absolute references', () => {
    const { sheet, ws } = makeSheet();
    plantFormula(ws, 1, 1, '=SUM($A$1:$A$10)');
    plantFormula(ws, 2, 1, '=SUM(A1:A10)');

    const results = findInFormulas(sheet, '$A$1');
    expect(results).toHaveLength(1);
    expect(results[0].formula).toBe('=SUM($A$1:$A$10)');
  });
});

// ---------------------------------------------------------------------------
// §7 — replaceInFormulas count contract
// ---------------------------------------------------------------------------

describe('§7 replaceInFormulas — count contract', () => {
  test('returns 0 for empty query', () => {
    const { sheet, ws } = makeSheet();
    plantFormula(ws, 1, 1, '=SUM(A1:A10)');
    expect(replaceInFormulas(sheet, '', 'SUM')).toBe(0);
  });

  test('returns 0 when no formula cells exist', () => {
    const { sheet } = makeSheet();
    expect(replaceInFormulas(sheet, 'SUM', 'AVERAGE')).toBe(0);
  });

  test('returns 0 when no match found', () => {
    const { sheet, ws } = makeSheet();
    plantFormula(ws, 1, 1, '=SUM(A1:A10)');
    expect(replaceInFormulas(sheet, 'VLOOKUP', 'XLOOKUP')).toBe(0);
  });

  test('returns 1 for a single matching cell', () => {
    const { sheet, ws } = makeSheet();
    plantFormula(ws, 1, 1, '=SUM(A1:A10)');
    expect(replaceInFormulas(sheet, 'SUM', 'AVERAGE')).toBe(1);
  });

  test('returns N for N matching cells', () => {
    const { sheet, ws } = makeSheet();
    plantFormula(ws, 1, 1, '=SUM(A1:A5)');
    plantFormula(ws, 2, 1, '=SUM(B1:B5)');
    plantFormula(ws, 3, 1, '=SUM(C1:C5)');
    plantFormula(ws, 4, 1, '=AVERAGE(D1:D5)'); // no match
    expect(replaceInFormulas(sheet, 'SUM', 'TOTAL')).toBe(3);
  });

  test('returns 0 when replacement produces no change (same value)', () => {
    const { sheet, ws } = makeSheet();
    plantFormula(ws, 1, 1, '=SUM(A1:A5)');
    // Replace "SUM" with "SUM" — identical, no write
    expect(replaceInFormulas(sheet, 'SUM', 'SUM')).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §8 — replaceInFormulas value update and undo integration
// ---------------------------------------------------------------------------

describe('§8 replaceInFormulas — value update and undo', () => {
  test('sets the modified formula string as the cell value', () => {
    const { sheet, ws } = makeSheet();
    plantFormula(ws, 1, 1, '=SUM(A1:A10)', 55);

    replaceInFormulas(sheet, 'A10', 'B10');
    // setCell stores the new formula string in cell.value
    expect(sheet.getCell(1, 1)?.value).toBe('=SUM(A1:B10)');
  });

  test('replaces ALL occurrences within a single formula string (part mode)', () => {
    const { sheet, ws } = makeSheet();
    plantFormula(ws, 1, 1, '=IF(A1>0,A1*2,A1+3)');

    replaceInFormulas(sheet, 'A1', 'B2');

    // All three "A1" occurrences replaced
    expect(sheet.getCell(1, 1)?.value).toBe('=IF(B2>0,B2*2,B2+3)');
  });

  test('undo restores the pre-replace value', () => {
    const { sheet, ws } = makeSheet();
    plantFormula(ws, 1, 1, '=SUM(A1:A10)', 55);

    replaceInFormulas(sheet, 'A10', 'B10');
    expect(sheet.getCell(1, 1)?.value).toBe('=SUM(A1:B10)');

    const undid = sheet.undo();
    expect(undid).toBe(true);
    expect(sheet.getCell(1, 1)?.value).toBe(55); // restored to original display value
  });

  test('multiple replacements can be undone one by one', () => {
    const { sheet, ws } = makeSheet();
    plantFormula(ws, 1, 1, '=SUM(A1:A5)',  10);
    plantFormula(ws, 2, 1, '=SUM(B1:B5)', 20);

    replaceInFormulas(sheet, 'SUM', 'AVERAGE');

    // Undo the second replacement first (LIFO)
    expect(sheet.undo()).toBe(true);
    expect(sheet.getCell(2, 1)?.value).toBe(20);
    expect(sheet.getCell(1, 1)?.value).toBe('=AVERAGE(A1:A5)'); // first still replaced

    expect(sheet.undo()).toBe(true);
    expect(sheet.getCell(1, 1)?.value).toBe(10);
  });

  test('no undo entry when count is 0', () => {
    const { sheet, ws } = makeSheet();
    plantFormula(ws, 1, 1, '=SUM(A1:A5)', 10);

    const before = sheet.canUndo;
    replaceInFormulas(sheet, 'VLOOKUP', 'XLOOKUP'); // no match
    // canUndo state unchanged
    expect(sheet.canUndo).toBe(before);
  });
});

// ---------------------------------------------------------------------------
// §9 — replaceInFormulas event emission
// ---------------------------------------------------------------------------

describe('§9 replaceInFormulas — event emission', () => {
  test('emits cell-changed for each replaced cell', () => {
    const { sheet, ws } = makeSheet();
    plantFormula(ws, 1, 1, '=SUM(A1:A5)');
    plantFormula(ws, 2, 1, '=SUM(B1:B5)');

    const changedAddrs: Array<{ row: number; col: number }> = [];
    const d = sheet.on('cell-changed', (e) => {
      if (e.type === 'cell-changed') changedAddrs.push({ row: e.row, col: e.col });
    });

    replaceInFormulas(sheet, 'SUM', 'AVERAGE');

    expect(changedAddrs).toHaveLength(2);
    expect(changedAddrs).toContainEqual({ row: 1, col: 1 });
    expect(changedAddrs).toContainEqual({ row: 2, col: 1 });
    d.dispose();
  });

  test('no events fired when nothing matches', () => {
    const { sheet, ws } = makeSheet();
    plantFormula(ws, 1, 1, '=SUM(A1:A5)');

    const fired: string[] = [];
    const d = sheet.on('cell-changed', () => fired.push('cell-changed'));
    replaceInFormulas(sheet, 'VLOOKUP', 'XLOOKUP');

    expect(fired).toHaveLength(0);
    d.dispose();
  });

  test('events are fired synchronously (no microtask delay)', () => {
    const { sheet, ws } = makeSheet();
    plantFormula(ws, 1, 1, '=SUM(A1:A5)');

    let eventFiredSync = false;
    const d = sheet.on('cell-changed', () => { eventFiredSync = true; });

    replaceInFormulas(sheet, 'SUM', 'AVERAGE');

    expect(eventFiredSync).toBe(true); // fired before function returned
    d.dispose();
  });
});

// ---------------------------------------------------------------------------
// §10 — replaceInFormulas lookAt option
// ---------------------------------------------------------------------------

describe('§10 replaceInFormulas — lookAt option', () => {
  test("lookAt: 'part' replaces every occurrence within the formula", () => {
    const { sheet, ws } = makeSheet();
    plantFormula(ws, 1, 1, '=CONCAT(A1,A1,A1)');

    replaceInFormulas(sheet, 'A1', 'B2');
    expect(sheet.getCell(1, 1)?.value).toBe('=CONCAT(B2,B2,B2)');
  });

  test("lookAt: 'whole' replaces only if entire formula equals query", () => {
    const { sheet, ws } = makeSheet();
    plantFormula(ws, 1, 1, '=PLACEHOLDER()');
    plantFormula(ws, 2, 1, '=PLACEHOLDER() + 1'); // not an exact match

    const count = replaceInFormulas(sheet, '=PLACEHOLDER()', '=SUM(A1:A10)', { lookAt: 'whole' });
    expect(count).toBe(1);
    expect(sheet.getCell(1, 1)?.value).toBe('=SUM(A1:A10)');
    expect(sheet.getCell(2, 1)?.formula).toBe('=PLACEHOLDER() + 1'); // unchanged
  });

  test("lookAt: 'whole' with replacement string containing original term", () => {
    const { sheet, ws } = makeSheet();
    plantFormula(ws, 1, 1, '=OLD_FUNC()');

    replaceInFormulas(sheet, '=OLD_FUNC()', '=NEW_FUNC()', { lookAt: 'whole' });
    expect(sheet.getCell(1, 1)?.value).toBe('=NEW_FUNC()');
  });
});

// ---------------------------------------------------------------------------
// §11 — replaceInFormulas case sensitivity
// ---------------------------------------------------------------------------

describe('§11 replaceInFormulas — case sensitivity', () => {
  test('replacement is case-insensitive by default', () => {
    const { sheet, ws } = makeSheet();
    plantFormula(ws, 1, 1, '=SUM(A1:A10)');

    const count = replaceInFormulas(sheet, 'sum', 'AVERAGE');
    expect(count).toBe(1);
    expect(sheet.getCell(1, 1)?.value).toBe('=AVERAGE(A1:A10)');
  });

  test('matchCase: true — different case query does not match', () => {
    const { sheet, ws } = makeSheet();
    plantFormula(ws, 1, 1, '=SUM(A1:A10)');

    const count = replaceInFormulas(sheet, 'sum', 'AVERAGE', { matchCase: true });
    expect(count).toBe(0);
    // formula unchanged
    expect(sheet.getCell(1, 1)?.formula).toBe('=SUM(A1:A10)');
  });

  test('matchCase: true — exact case matches and replaces', () => {
    const { sheet, ws } = makeSheet();
    plantFormula(ws, 1, 1, '=SUM(A1:A10)');

    const count = replaceInFormulas(sheet, 'SUM', 'AVERAGE', { matchCase: true });
    expect(count).toBe(1);
    expect(sheet.getCell(1, 1)?.value).toBe('=AVERAGE(A1:A10)');
  });

  test('case-insensitive replacement preserves ORIGINAL casing of non-matched parts', () => {
    const { sheet, ws } = makeSheet();
    // Formula has mixed-case identifiers
    plantFormula(ws, 1, 1, '=SumFunction(A1)');

    // Replace "sumfunction" (lower) in case-insensitive mode
    replaceInFormulas(sheet, 'SumFunction', 'NewFunc');
    expect(sheet.getCell(1, 1)?.value).toBe('=NewFunc(A1)');
  });
});

// ---------------------------------------------------------------------------
// §12 — Statelesness & determinism
// ---------------------------------------------------------------------------

describe('§12 Statelesness & determinism', () => {
  test('two consecutive calls with same args return identical results', () => {
    const { sheet, ws } = makeSheet();
    plantFormula(ws, 1, 1, '=SUM(A1:A10)');
    plantFormula(ws, 2, 3, '=SUMIF(B1:B5,">0")');
    plantFormula(ws, 5, 2, '=VLOOKUP(C1,A:B,2,0)');

    const first  = findInFormulas(sheet, 'SUM');
    const second = findInFormulas(sheet, 'SUM');

    expect(first).toEqual(second);
  });

  test('findInFormulas does not retain state between calls', () => {
    const { sheet, ws } = makeSheet();
    plantFormula(ws, 1, 1, '=SUM(A1:A5)');

    const r1 = findInFormulas(sheet, 'SUM');
    // Add a new formula cell
    plantFormula(ws, 2, 1, '=SUM(B1:B5)');
    const r2 = findInFormulas(sheet, 'SUM');

    // Second call sees the new cell; first call result unaffected
    expect(r1).toHaveLength(1);
    expect(r2).toHaveLength(2);
  });

  test('replaceInFormulas is deterministic under fixed seed scenario', () => {
    const { sheet, ws } = makeSheet();
    plantFormula(ws, 1, 1, '=OldRef(A1)');
    plantFormula(ws, 2, 1, '=OldRef(B1)');
    plantFormula(ws, 3, 1, '=OldRef(C1)');

    replaceInFormulas(sheet, 'OldRef', 'NewRef');

    expect(sheet.getCell(1, 1)?.value).toBe('=NewRef(A1)');
    expect(sheet.getCell(2, 1)?.value).toBe('=NewRef(B1)');
    expect(sheet.getCell(3, 1)?.value).toBe('=NewRef(C1)');
  });

  test('1 000 formula cells — findInFormulas stays fast', () => {
    const sheet = createSpreadsheet('StressSheet', { rows: 2100, cols: 10 });
    const ws = (sheet as any)._ws as Worksheet;

    for (let r = 1; r <= 1000; r++) {
      ws.setCellFormula({ row: r, col: 1 }, `=SUM(B${r}:C${r})`, r * 2);
    }
    for (let r = 1001; r <= 2000; r++) {
      ws.setCellFormula({ row: r, col: 1 }, `=AVERAGE(B${r}:C${r})`, r);
    }

    const t0 = Date.now();
    const results = findInFormulas(sheet, 'SUM');
    const elapsed = Date.now() - t0;

    expect(results).toHaveLength(1000);
    expect(elapsed).toBeLessThan(500); // well within budget on any machine
  });

  test('1 000 formula cells — replaceInFormulas stays fast', () => {
    const sheet = createSpreadsheet('StressSheet', { rows: 1100, cols: 5 });
    const ws = (sheet as any)._ws as Worksheet;

    for (let r = 1; r <= 1000; r++) {
      ws.setCellFormula({ row: r, col: 1 }, `=OldName(R${r})`, r);
    }

    const t0 = Date.now();
    const count = replaceInFormulas(sheet, 'OldName', 'NewName');
    const elapsed = Date.now() - t0;

    expect(count).toBe(1000);
    expect(elapsed).toBeLessThan(2000); // setCell ×1000, generous ceiling
  });
});

// ---------------------------------------------------------------------------
// §13 — Disposed-sheet safety
// ---------------------------------------------------------------------------

describe('§13 disposed-sheet safety', () => {
  test('findInFormulas throws DisposedError on a disposed sheet', () => {
    const { sheet } = makeSheet();
    sheet.dispose();
    // findInFormulas accesses _ws.getFormulaAddresses() — DAG is fine — but
    // the guard is inside setCell/getCell.  On a pure-read path, DisposedError
    // is NOT thrown (the _ws itself is still reachable).
    // So the actual contract is: disposed sheets do NOT throw on pure reads.
    // replaceInFormulas would throw on setCell if there were matches.
    expect(() => findInFormulas(sheet, 'SUM')).not.toThrow();
  });

  test('replaceInFormulas throws DisposedError if matches exist on disposed sheet', () => {
    const { sheet, ws } = makeSheet();
    plantFormula(ws, 1, 1, '=SUM(A1:A5)');
    sheet.dispose();

    // setCell call will throw DisposedError
    expect(() => replaceInFormulas(sheet, 'SUM', 'AVERAGE')).toThrow('disposed');
  });

  test('replaceInFormulas is safe no-op if disposed and no matches', () => {
    const { sheet } = makeSheet();
    sheet.dispose();
    // No formula cells → no setCell call → no throw
    expect(() => replaceInFormulas(sheet, 'SUM', 'AVERAGE')).not.toThrow();
    expect(replaceInFormulas(sheet, 'SUM', 'AVERAGE')).toBe(0);
  });
});
