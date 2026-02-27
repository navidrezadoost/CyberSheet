/**
 * @group sdk
 *
 * Phase 18A: Go To Special — Test Suite
 *
 * Tests `findSpecial` from the `./search` subpath, which wraps
 * `Worksheet.getSpecialCells()`.
 *
 * §1  'formulas' — formula cells with optional value filter
 * §2  'constants' — non-formula cells with optional value filter
 * §3  'blanks' — empty cells within range
 * §4  'visible' — non-hidden cells
 * §5  'lastCell' — bottom-right of used range
 * §6  'currentRegion' — contiguous block around anchor
 * §7  'currentArray' — spill range
 * §8  'precedents' and 'allPrecedents'
 * §9  'dependents' and 'allDependents'
 * §10 'conditionalFormats'
 * §11 'dataValidation' stub
 * §12 range constraint passthrough
 */

import { createSpreadsheet } from '../../src/sdk/index';
import { findSpecial } from '../../src/search/index';
import type { Worksheet } from '../../src/worksheet';
import type { SpreadsheetSDK } from '../../src/sdk/SpreadsheetSDK';
import type { ConditionalFormattingRule } from '../../src/ConditionalFormattingEngine';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSheet(rows = 50, cols = 10): { sheet: SpreadsheetSDK; ws: Worksheet } {
  const sheet = createSpreadsheet('Test', { rows, cols });
  const ws = (sheet as any)._ws as Worksheet;
  return { sheet, ws };
}

/** Register a formula cell with its dependency list (for DAG-based tests). */
function plant(ws: Worksheet, row: number, col: number, formula: string, deps: Array<{ row: number; col: number }>, displayValue?: unknown): void {
  ws.setCellFormula({ row, col }, formula, displayValue as any);
  ws.registerDependencies({ row, col }, deps);
}

/** Coordinates as sortable strings for easy set-comparison. */
function toKeys(addrs: Array<{ row: number; col: number }>): string[] {
  return addrs.map(a => `${a.row}:${a.col}`).sort();
}

// ---------------------------------------------------------------------------
// §1 — 'formulas'
// ---------------------------------------------------------------------------

describe("§1 findSpecial 'formulas'", () => {
  test('finds all cells with a formula', () => {
    const { sheet, ws } = makeSheet();
    ws.setCellValue({ row: 1, col: 1 }, 'plain');
    ws.setCellFormula({ row: 2, col: 1 }, '=SUM(A1)', 10);
    ws.setCellFormula({ row: 3, col: 1 }, '=NOW()', 0);

    const addrs = findSpecial(sheet, { type: 'formulas' });
    expect(toKeys(addrs)).toEqual(['2:1', '3:1']);
  });

  test('returns [] when no formulas exist', () => {
    const { sheet, ws } = makeSheet();
    ws.setCellValue({ row: 1, col: 1 }, 42);
    expect(findSpecial(sheet, { type: 'formulas' })).toHaveLength(0);
  });

  test("value: 'numbers' — formula cells with numeric display value", () => {
    const { sheet, ws } = makeSheet();
    ws.setCellFormula({ row: 1, col: 1 }, '=1+1', 2);        // number
    ws.setCellFormula({ row: 2, col: 1 }, '=CONCATENATE()', 'hi'); // text
    ws.setCellFormula({ row: 3, col: 1 }, '=TRUE()', true);  // logical

    const addrs = findSpecial(sheet, { type: 'formulas', value: 'numbers' });
    expect(toKeys(addrs)).toEqual(['1:1']);
  });

  test("value: 'text' — formula cells with string display value (non-error)", () => {
    const { sheet, ws } = makeSheet();
    ws.setCellFormula({ row: 1, col: 1 }, '=A1', 'hello');
    ws.setCellFormula({ row: 2, col: 1 }, '=1/0', '#DIV/0!'); // error string
    ws.setCellFormula({ row: 3, col: 1 }, '=LEN()', 5);

    const addrs = findSpecial(sheet, { type: 'formulas', value: 'text' });
    expect(toKeys(addrs)).toEqual(['1:1']);
  });

  test("value: 'logicals' — formula cells with boolean display value", () => {
    const { sheet, ws } = makeSheet();
    ws.setCellFormula({ row: 1, col: 1 }, '=TRUE()', true);
    ws.setCellFormula({ row: 2, col: 1 }, '=FALSE()', false);
    ws.setCellFormula({ row: 3, col: 1 }, '=1+1', 2);

    const addrs = findSpecial(sheet, { type: 'formulas', value: 'logicals' });
    expect(toKeys(addrs)).toHaveLength(2);
    expect(toKeys(addrs)).toContain('1:1');
    expect(toKeys(addrs)).toContain('2:1');
  });

  test("value: 'errors' — formula cells whose display value is an Excel error string", () => {
    const { sheet, ws } = makeSheet();
    ws.setCellFormula({ row: 1, col: 1 }, '=1/0', '#DIV/0!');
    ws.setCellFormula({ row: 2, col: 1 }, '=NA()', '#N/A');
    ws.setCellFormula({ row: 3, col: 1 }, '=1+1', 2);        // not an error

    const addrs = findSpecial(sheet, { type: 'formulas', value: 'errors' });
    expect(toKeys(addrs)).toEqual(['1:1', '2:1']);
  });

  test('results sorted row-major', () => {
    const { sheet, ws } = makeSheet();
    ws.setCellFormula({ row: 5, col: 2 }, '=1', 1);
    ws.setCellFormula({ row: 1, col: 4 }, '=1', 1);
    ws.setCellFormula({ row: 2, col: 1 }, '=1', 1);

    const addrs = findSpecial(sheet, { type: 'formulas' });
    expect(addrs.map(a => `${a.row}:${a.col}`)).toEqual(['1:4', '2:1', '5:2']);
  });
});

// ---------------------------------------------------------------------------
// §2 — 'constants'
// ---------------------------------------------------------------------------

describe("§2 findSpecial 'constants'", () => {
  test('finds all non-formula cells with a non-null value', () => {
    const { sheet, ws } = makeSheet();
    ws.setCellValue({ row: 1, col: 1 }, 'Hello');
    ws.setCellValue({ row: 2, col: 1 }, 42);
    ws.setCellFormula({ row: 3, col: 1 }, '=SUM(A1)', 42); // formula — excluded

    const addrs = findSpecial(sheet, { type: 'constants' });
    expect(toKeys(addrs)).toEqual(['1:1', '2:1']);
  });

  test("value: 'numbers' — constant numeric cells only", () => {
    const { sheet, ws } = makeSheet();
    ws.setCellValue({ row: 1, col: 1 }, 42);
    ws.setCellValue({ row: 2, col: 1 }, 'text');
    ws.setCellValue({ row: 3, col: 1 }, true);

    const addrs = findSpecial(sheet, { type: 'constants', value: 'numbers' });
    expect(toKeys(addrs)).toEqual(['1:1']);
  });

  test("value: 'text' — constant string cells (non-error)", () => {
    const { sheet, ws } = makeSheet();
    ws.setCellValue({ row: 1, col: 1 }, 'hello');
    ws.setCellValue({ row: 2, col: 1 }, '#VALUE!'); // error-like string from constant
    ws.setCellValue({ row: 3, col: 1 }, 99);

    const addrs = findSpecial(sheet, { type: 'constants', value: 'text' });
    // '#VALUE!' treated as error by passesFilter; plain 'hello' is text
    expect(toKeys(addrs)).toEqual(['1:1']);
  });

  test("value: 'logicals' — constant boolean cells", () => {
    const { sheet, ws } = makeSheet();
    ws.setCellValue({ row: 1, col: 1 }, true);
    ws.setCellValue({ row: 2, col: 1 }, false);
    ws.setCellValue({ row: 3, col: 1 }, 42);

    const addrs = findSpecial(sheet, { type: 'constants', value: 'logicals' });
    expect(toKeys(addrs)).toHaveLength(2);
  });

  test('null-value cells are excluded', () => {
    const { sheet, ws } = makeSheet();
    // Don't write anything to row 1 col 1; write a value elsewhere
    ws.setCellValue({ row: 1, col: 1 }, 'data');
    // getCell for r2/c1 will return null → not included

    expect(findSpecial(sheet, { type: 'constants' })).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// §3 — 'blanks'
// ---------------------------------------------------------------------------

describe("§3 findSpecial 'blanks'", () => {
  test('finds empty cells within a bounded range', () => {
    const { sheet, ws } = makeSheet();
    ws.setCellValue({ row: 1, col: 1 }, 'A');
    ws.setCellValue({ row: 1, col: 3 }, 'C');
    // row 1 col 2 is blank

    const addrs = findSpecial(
      sheet,
      { type: 'blanks' },
      { start: { row: 1, col: 1 }, end: { row: 1, col: 3 } },
    );
    expect(toKeys(addrs)).toContain('1:2');
    expect(toKeys(addrs)).not.toContain('1:1');
    expect(toKeys(addrs)).not.toContain('1:3');
  });

  test('returns [] on empty sheet with no range (no used range)', () => {
    const { sheet } = makeSheet();
    expect(findSpecial(sheet, { type: 'blanks' })).toHaveLength(0);
  });

  test('falls back to used range when no range supplied', () => {
    const { sheet, ws } = makeSheet();
    ws.setCellValue({ row: 1, col: 1 }, 'A');
    ws.setCellValue({ row: 1, col: 3 }, 'C');
    // used range is rows 1-1, cols 1-3; col 2 is blank

    const addrs = findSpecial(sheet, { type: 'blanks' });
    const keys = toKeys(addrs);
    expect(keys).toContain('1:2');
    expect(keys).not.toContain('1:1');
  });
});

// ---------------------------------------------------------------------------
// §4 — 'visible'
// ---------------------------------------------------------------------------

describe("§4 findSpecial 'visible'", () => {
  test('excludes cells in hidden rows', () => {
    const { sheet, ws } = makeSheet();
    ws.setCellValue({ row: 1, col: 1 }, 'visible row');
    ws.setCellValue({ row: 2, col: 1 }, 'hidden row');
    ws.setCellValue({ row: 3, col: 1 }, 'visible row again');
    ws.hideRow(2);

    const addrs = findSpecial(sheet, { type: 'visible' });
    const keys = toKeys(addrs);
    expect(keys).toContain('1:1');
    expect(keys).not.toContain('2:1');
    expect(keys).toContain('3:1');
  });

  test('excludes cells in hidden columns', () => {
    const { sheet, ws } = makeSheet();
    ws.setCellValue({ row: 1, col: 1 }, 'visible col');
    ws.setCellValue({ row: 1, col: 2 }, 'hidden col');
    ws.hideCol(2);

    const addrs = findSpecial(sheet, { type: 'visible' });
    const keys = toKeys(addrs);
    expect(keys).toContain('1:1');
    expect(keys).not.toContain('1:2');
  });

  test('returns all cells when nothing is hidden', () => {
    const { sheet, ws } = makeSheet();
    ws.setCellValue({ row: 1, col: 1 }, 'A');
    ws.setCellValue({ row: 2, col: 2 }, 'B');

    const addrs = findSpecial(sheet, { type: 'visible' });
    expect(toKeys(addrs)).toEqual(['1:1', '2:2']);
  });
});

// ---------------------------------------------------------------------------
// §5 — 'lastCell'
// ---------------------------------------------------------------------------

describe("§5 findSpecial 'lastCell'", () => {
  test('returns the bottom-right corner of the used range', () => {
    const { sheet, ws } = makeSheet();
    ws.setCellValue({ row: 3, col: 5 }, 'far');
    ws.setCellValue({ row: 1, col: 1 }, 'near');

    const addrs = findSpecial(sheet, { type: 'lastCell' });
    expect(addrs).toHaveLength(1);
    expect(addrs[0]).toEqual({ row: 3, col: 5 });
  });

  test('returns [] on empty sheet', () => {
    const { sheet } = makeSheet();
    expect(findSpecial(sheet, { type: 'lastCell' })).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// §6 — 'currentRegion'
// ---------------------------------------------------------------------------

describe("§6 findSpecial 'currentRegion'", () => {
  test('returns contiguous block of cells around the anchor', () => {
    const { sheet, ws } = makeSheet();
    // Build a 2×3 block starting at row 2, col 2
    ws.setCellValue({ row: 2, col: 2 }, 'A');
    ws.setCellValue({ row: 2, col: 3 }, 'B');
    ws.setCellValue({ row: 2, col: 4 }, 'C');
    ws.setCellValue({ row: 3, col: 2 }, 'D');
    ws.setCellValue({ row: 3, col: 3 }, 'E');
    ws.setCellValue({ row: 3, col: 4 }, 'F');

    const addrs = findSpecial(sheet, { type: 'currentRegion', anchor: { row: 2, col: 2 } });
    expect(addrs).toHaveLength(6);
  });

  test('returns [] when no anchor provided', () => {
    const { sheet } = makeSheet();
    expect(findSpecial(sheet, { type: 'currentRegion' })).toHaveLength(0);
  });

  test('returns just the anchor when it is isolated (no contiguous neighbours)', () => {
    const { sheet, ws } = makeSheet();
    ws.setCellValue({ row: 1, col: 1 }, 'isolated');
    // Rows/cols adjacent are all empty

    const addrs = findSpecial(sheet, { type: 'currentRegion', anchor: { row: 1, col: 1 } });
    expect(addrs).toHaveLength(1);
    expect(addrs[0]).toEqual({ row: 1, col: 1 });
  });

  test('returns [] on empty cell anchor', () => {
    const { sheet } = makeSheet();
    // anchor on a cell with no data
    expect(findSpecial(sheet, { type: 'currentRegion', anchor: { row: 5, col: 5 } })).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// §7 — 'currentArray'
// ---------------------------------------------------------------------------

describe("§7 findSpecial 'currentArray'", () => {
  test('returns the entire spill range when anchor is the spill source', () => {
    const { sheet, ws } = makeSheet(20, 20);
    // Mark row 1 col 1 as spill source spanning rows 1-3, col 1
    ws.setSpillSource({ row: 1, col: 1 }, {
      dimensions: [3, 1],
      endAddress: { row: 3, col: 1 },
    });
    ws.setCellFormula({ row: 1, col: 1 }, '={1;2;3}', 1);

    const addrs = findSpecial(sheet, { type: 'currentArray', anchor: { row: 1, col: 1 } });
    expect(addrs).toHaveLength(3);
    expect(toKeys(addrs)).toEqual(['1:1', '2:1', '3:1']);
  });

  test('returns [anchor] when cell has no spill metadata', () => {
    const { sheet, ws } = makeSheet();
    ws.setCellValue({ row: 1, col: 1 }, 42);
    const addrs = findSpecial(sheet, { type: 'currentArray', anchor: { row: 1, col: 1 } });
    expect(addrs).toHaveLength(1);
  });

  test('returns [] when no anchor provided', () => {
    const { sheet } = makeSheet();
    expect(findSpecial(sheet, { type: 'currentArray' })).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// §8 — 'precedents' and 'allPrecedents'
// ---------------------------------------------------------------------------

describe("§8 findSpecial 'precedents' and 'allPrecedents'", () => {
  test("'precedents' returns direct dependencies of a formula cell", () => {
    const { sheet, ws } = makeSheet();
    // Cell (3,1) has formula that depends on (1,1) and (2,1)
    plant(ws, 3, 1, '=SUM(A1:A2)', [{ row: 1, col: 1 }, { row: 2, col: 1 }], 5);

    const addrs = findSpecial(sheet, { type: 'precedents', anchor: { row: 3, col: 1 } });
    expect(toKeys(addrs)).toEqual(['1:1', '2:1']);
  });

  test("'precedents' returns [] for a cell with no registered dependencies", () => {
    const { sheet, ws } = makeSheet();
    ws.setCellValue({ row: 1, col: 1 }, 42);
    const addrs = findSpecial(sheet, { type: 'precedents', anchor: { row: 1, col: 1 } });
    expect(addrs).toHaveLength(0);
  });

  test("'precedents' returns [] when no anchor provided", () => {
    const { sheet } = makeSheet();
    expect(findSpecial(sheet, { type: 'precedents' })).toHaveLength(0);
  });

  test("'allPrecedents' returns transitive precedents", () => {
    const { sheet, ws } = makeSheet();
    // Chain: C3 depends on B2, B2 depends on A1
    ws.setCellValue({ row: 1, col: 1 }, 10);
    plant(ws, 2, 2, '=A1*2', [{ row: 1, col: 1 }], 20);
    plant(ws, 3, 3, '=B2+1', [{ row: 2, col: 2 }], 21);

    const addrs = findSpecial(sheet, { type: 'allPrecedents', anchor: { row: 3, col: 3 } });
    // Should include both B2 and A1 (not C3 itself)
    const keys = toKeys(addrs);
    expect(keys).toContain('1:1');
    expect(keys).toContain('2:2');
    expect(keys).not.toContain('3:3'); // anchor excluded from results
  });
});

// ---------------------------------------------------------------------------
// §9 — 'dependents' and 'allDependents'
// ---------------------------------------------------------------------------

describe("§9 findSpecial 'dependents' and 'allDependents'", () => {
  test("'dependents' returns cells whose formula reads the anchor", () => {
    const { sheet, ws } = makeSheet();
    ws.setCellValue({ row: 1, col: 1 }, 10);
    plant(ws, 2, 1, '=A1*2', [{ row: 1, col: 1 }], 20);
    plant(ws, 3, 2, '=A1+5', [{ row: 1, col: 1 }], 15);

    const addrs = findSpecial(sheet, { type: 'dependents', anchor: { row: 1, col: 1 } });
    expect(toKeys(addrs)).toEqual(['2:1', '3:2']);
  });

  test("'dependents' returns [] for a cell with no dependents", () => {
    const { sheet, ws } = makeSheet();
    ws.setCellValue({ row: 1, col: 1 }, 42);
    expect(findSpecial(sheet, { type: 'dependents', anchor: { row: 1, col: 1 } })).toHaveLength(0);
  });

  test("'allDependents' returns transitive dependents", () => {
    const { sheet, ws } = makeSheet();
    // Chain: A1 → B2 → C3
    ws.setCellValue({ row: 1, col: 1 }, 5);
    plant(ws, 2, 2, '=A1*2', [{ row: 1, col: 1 }], 10);
    plant(ws, 3, 3, '=B2+1', [{ row: 2, col: 2 }], 11);

    const addrs = findSpecial(sheet, { type: 'allDependents', anchor: { row: 1, col: 1 } });
    const keys = toKeys(addrs);
    expect(keys).toContain('2:2');
    expect(keys).toContain('3:3');
    expect(keys).not.toContain('1:1');
  });
});

// ---------------------------------------------------------------------------
// §10 — 'conditionalFormats'
// ---------------------------------------------------------------------------

describe("§10 findSpecial 'conditionalFormats'", () => {
  test('returns cells that fall within a CF rule range', () => {
    const { sheet, ws } = makeSheet();
    ws.setCellValue({ row: 1, col: 1 }, 10);
    ws.setCellValue({ row: 2, col: 1 }, 20);
    ws.setCellValue({ row: 5, col: 5 }, 99); // outside CF range

    // Add a CF rule covering rows 1-3, col 1
    const rule: ConditionalFormattingRule = {
      id: 'r1',
      type: 'value',
      ranges: [{ start: { row: 1, col: 1 }, end: { row: 3, col: 1 } }],
      condition: { operator: 'greaterThan', value: 0 },
      style: { fillColor: '#ff0' },
    } as any;
    ws.addConditionalFormattingRule(rule);

    const addrs = findSpecial(sheet, { type: 'conditionalFormats' });
    const keys = toKeys(addrs);
    // Cells with data in the CF range
    expect(keys).toContain('1:1');
    expect(keys).toContain('2:1');
    // Cell outside CF range should NOT appear
    expect(keys).not.toContain('5:5');
  });

  test('returns [] when no CF rules defined', () => {
    const { sheet, ws } = makeSheet();
    ws.setCellValue({ row: 1, col: 1 }, 42);
    expect(findSpecial(sheet, { type: 'conditionalFormats' })).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// §11 — 'dataValidation' stub
// ---------------------------------------------------------------------------

describe("§11 findSpecial 'dataValidation' stub", () => {
  test('always returns [] (not yet implemented)', () => {
    const { sheet, ws } = makeSheet();
    ws.setCellValue({ row: 1, col: 1 }, 'anything');
    expect(findSpecial(sheet, { type: 'dataValidation' })).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// §12 — range constraint passthrough
// ---------------------------------------------------------------------------

describe('§12 range constraint passthrough', () => {
  test("'formulas' constrained to a range", () => {
    const { sheet, ws } = makeSheet();
    ws.setCellFormula({ row: 1, col: 1 }, '=1', 1); // outside
    ws.setCellFormula({ row: 5, col: 3 }, '=2', 2); // inside
    ws.setCellFormula({ row: 9, col: 1 }, '=3', 3); // outside

    const addrs = findSpecial(
      sheet,
      { type: 'formulas' },
      { start: { row: 3, col: 2 }, end: { row: 7, col: 5 } },
    );
    expect(toKeys(addrs)).toEqual(['5:3']);
  });

  test("'constants' constrained to a range", () => {
    const { sheet, ws } = makeSheet();
    ws.setCellValue({ row: 1, col: 1 }, 'out');
    ws.setCellValue({ row: 4, col: 2 }, 'in');
    ws.setCellValue({ row: 8, col: 1 }, 'out');

    const addrs = findSpecial(
      sheet,
      { type: 'constants' },
      { start: { row: 3, col: 1 }, end: { row: 6, col: 4 } },
    );
    expect(toKeys(addrs)).toEqual(['4:2']);
  });
});
