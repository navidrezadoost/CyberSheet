/**
 * @group sdk
 *
 * Phase 19: Data Validation — SDK CRUD + getSpecialCells
 *
 *   §1  setDataValidation — stores rule and emits sheet-mutated
 *   §2  getDataValidation — returns the stored rule
 *   §3  removeDataValidation — clears rule and emits sheet-mutated
 *   §4  getValidationCells — returns all cells with rules in row-major order
 *   §5  getValidationCells — returns empty on fresh sheet
 *   §6  findSpecial('dataValidation') — delegates to getValidationCells
 *   §7  findSpecial('dataValidation') + range filter
 *   §8  Overwrite — setDataValidation replaces old rule at same address
 *   §9  Rule shape — all optional fields round-trip cleanly
 *  §10  Multiple cells — correct ordering
 *  §11  Disposed-sheet safety
 *  §12  Cross-sheet isolation — rules in one sheet do not leak to another
 */

import { createSpreadsheet } from '../../src/sdk/index';
import { findSpecial } from '../../src/search/index';
import type { Worksheet } from '../../src/worksheet';
import type { SpreadsheetSDK } from '../../src/sdk/SpreadsheetSDK';
import type { DataValidationRule } from '../../src/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSheet(rows = 20, cols = 10): { sheet: SpreadsheetSDK; ws: Worksheet } {
  const sheet = createSpreadsheet('DV', { rows, cols });
  const ws = (sheet as any)._ws as Worksheet;
  return { sheet, ws };
}

const listRule: DataValidationRule = {
  type: 'list',
  formula1: '"Yes,No,Maybe"',
  allowBlank: true,
  showDropdown: true,
};

const wholeRule: DataValidationRule = {
  type: 'whole',
  operator: 'between',
  formula1: '1',
  formula2: '100',
  allowBlank: false,
  showInputMessage: true,
  inputTitle: 'Enter a number',
  inputMessage: 'Value must be between 1 and 100',
  showErrorAlert: true,
  errorStyle: 'stop',
  errorTitle: 'Invalid',
  errorMessage: 'Must be 1-100',
};

// ---------------------------------------------------------------------------
// §1 setDataValidation — stores rule and emits event
// ---------------------------------------------------------------------------

describe('§1 setDataValidation — stores rule and emits event', () => {
  test('stores a list validation rule', () => {
    const { sheet } = makeSheet();
    sheet.setDataValidation(2, 3, listRule);
    expect(sheet.getDataValidation(2, 3)).toEqual(listRule);
  });

  test('emits structure-changed event', () => {
    const { sheet } = makeSheet();
    const events: string[] = [];
    sheet.on('structure-changed', () => events.push('structure-changed'));
    sheet.setDataValidation(1, 1, listRule);
    expect(events).toContain('structure-changed');
  });
});

// ---------------------------------------------------------------------------
// §2 getDataValidation — returns stored rule
// ---------------------------------------------------------------------------

describe('§2 getDataValidation — retrieval', () => {
  test('returns the rule set by setDataValidation', () => {
    const { sheet } = makeSheet();
    sheet.setDataValidation(5, 7, wholeRule);
    expect(sheet.getDataValidation(5, 7)).toEqual(wholeRule);
  });

  test('returns undefined for a cell with no rule', () => {
    const { sheet } = makeSheet();
    expect(sheet.getDataValidation(3, 3)).toBeUndefined();
  });

  test('different cells have independent rules', () => {
    const { sheet } = makeSheet();
    sheet.setDataValidation(1, 1, listRule);
    sheet.setDataValidation(2, 2, wholeRule);
    expect(sheet.getDataValidation(1, 1)).toEqual(listRule);
    expect(sheet.getDataValidation(2, 2)).toEqual(wholeRule);
  });
});

// ---------------------------------------------------------------------------
// §3 removeDataValidation — clears rule and emits event
// ---------------------------------------------------------------------------

describe('§3 removeDataValidation', () => {
  test('removes an existing rule', () => {
    const { sheet } = makeSheet();
    sheet.setDataValidation(1, 1, listRule);
    sheet.removeDataValidation(1, 1);
    expect(sheet.getDataValidation(1, 1)).toBeUndefined();
  });

  test('emits structure-changed on removal', () => {
    const { sheet } = makeSheet();
    sheet.setDataValidation(1, 1, listRule);
    const events: string[] = [];
    sheet.on('structure-changed', () => events.push('structure-changed'));
    sheet.removeDataValidation(1, 1);
    expect(events).toContain('structure-changed');
  });

  test('removing non-existent rule is a no-op', () => {
    const { sheet } = makeSheet();
    expect(() => sheet.removeDataValidation(9, 9)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// §4 getValidationCells — returns all cells in row-major order
// ---------------------------------------------------------------------------

describe('§4 getValidationCells ordering', () => {
  test('returns addresses in row-major order', () => {
    const { sheet } = makeSheet();
    sheet.setDataValidation(5, 2, listRule);
    sheet.setDataValidation(1, 3, listRule);
    sheet.setDataValidation(3, 1, listRule);
    sheet.setDataValidation(1, 1, listRule);

    const cells = sheet.getValidationCells();
    expect(cells).toEqual([
      { row: 1, col: 1 },
      { row: 1, col: 3 },
      { row: 3, col: 1 },
      { row: 5, col: 2 },
    ]);
  });

  test('reflects removal', () => {
    const { sheet } = makeSheet();
    sheet.setDataValidation(1, 1, listRule);
    sheet.setDataValidation(2, 2, listRule);
    sheet.removeDataValidation(1, 1);
    expect(sheet.getValidationCells()).toEqual([{ row: 2, col: 2 }]);
  });
});

// ---------------------------------------------------------------------------
// §5 getValidationCells — empty on fresh sheet
// ---------------------------------------------------------------------------

describe('§5 getValidationCells on fresh sheet', () => {
  test('returns empty array', () => {
    const { sheet } = makeSheet();
    expect(sheet.getValidationCells()).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// §6 findSpecial('dataValidation') — delegates to validation store
// ---------------------------------------------------------------------------

describe("§6 findSpecial('dataValidation')", () => {
  test('returns addresses of all cells with rules', () => {
    const { sheet } = makeSheet();
    sheet.setDataValidation(2, 3, listRule);
    sheet.setDataValidation(5, 1, wholeRule);

    const result = findSpecial(sheet, { type: 'dataValidation' });
    expect(result).toHaveLength(2);
    expect(result).toEqual([{ row: 2, col: 3 }, { row: 5, col: 1 }]);
  });

  test('returns empty when no validation rules exist', () => {
    const { sheet } = makeSheet();
    expect(findSpecial(sheet, { type: 'dataValidation' })).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// §7 findSpecial('dataValidation') + range filter
// ---------------------------------------------------------------------------

describe("§7 findSpecial('dataValidation') with range", () => {
  test('only returns cells within the range', () => {
    const { sheet } = makeSheet();
    sheet.setDataValidation(1, 1, listRule);   // outside range
    sheet.setDataValidation(4, 3, listRule);   // inside range
    sheet.setDataValidation(9, 2, listRule);   // outside range

    const result = findSpecial(
      sheet,
      { type: 'dataValidation' },
      { start: { row: 3, col: 1 }, end: { row: 6, col: 6 } }
    );
    expect(result).toEqual([{ row: 4, col: 3 }]);
  });
});

// ---------------------------------------------------------------------------
// §8 Overwrite — replacing an existing rule
// ---------------------------------------------------------------------------

describe('§8 Overwrite existing rule', () => {
  test('setDataValidation overwrites rule at same address', () => {
    const { sheet } = makeSheet();
    sheet.setDataValidation(3, 3, listRule);
    sheet.setDataValidation(3, 3, wholeRule);
    expect(sheet.getDataValidation(3, 3)).toEqual(wholeRule);
    // Only one cell in the store
    expect(sheet.getValidationCells()).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// §9 Rule shape — all optional fields round-trip cleanly
// ---------------------------------------------------------------------------

describe('§9 Full rule shape round-trip', () => {
  test('all fields of wholeRule are preserved', () => {
    const { sheet } = makeSheet();
    sheet.setDataValidation(1, 1, wholeRule);
    const retrieved = sheet.getDataValidation(1, 1);
    expect(retrieved).toStrictEqual(wholeRule);
  });

  test('minimal rule (type only) round-trips', () => {
    const { sheet } = makeSheet();
    const minimal: DataValidationRule = { type: 'any' };
    sheet.setDataValidation(1, 1, minimal);
    expect(sheet.getDataValidation(1, 1)).toStrictEqual(minimal);
  });

  test('custom type with formula round-trips', () => {
    const { sheet } = makeSheet();
    const customRule: DataValidationRule = {
      type: 'custom',
      formula1: '=ISNUMBER(A1)',
      allowBlank: true,
    };
    sheet.setDataValidation(5, 5, customRule);
    expect(sheet.getDataValidation(5, 5)).toStrictEqual(customRule);
  });
});

// ---------------------------------------------------------------------------
// §10 Multiple cells — correctness at scale
// ---------------------------------------------------------------------------

describe('§10 Multiple cells at scale', () => {
  test('100 cells all set and retrieved correctly', () => {
    const sheet = createSpreadsheet('BigDV', { rows: 200, cols: 50 });
    for (let r = 1; r <= 10; r++) {
      for (let c = 1; c <= 10; c++) {
        sheet.setDataValidation(r, c, { type: 'whole', operator: 'greaterThan', formula1: String(r * c) });
      }
    }
    const cells = sheet.getValidationCells();
    expect(cells).toHaveLength(100);
    // Verify row-major ordering: first cell is (1,1), last is (10,10)
    expect(cells[0]).toEqual({ row: 1, col: 1 });
    expect(cells[99]).toEqual({ row: 10, col: 10 });
    // Spot-check a retrieved rule
    expect(sheet.getDataValidation(5, 7)).toEqual({
      type: 'whole', operator: 'greaterThan', formula1: '35',
    });
    sheet.dispose();
  });
});

// ---------------------------------------------------------------------------
// §11 Disposed-sheet safety
// ---------------------------------------------------------------------------

describe('§11 Disposed-sheet safety', () => {
  test('setDataValidation throws after dispose', () => {
    const { sheet } = makeSheet();
    sheet.dispose();
    expect(() => sheet.setDataValidation(1, 1, listRule)).toThrow();
  });

  test('getDataValidation throws after dispose', () => {
    const { sheet } = makeSheet();
    sheet.dispose();
    expect(() => sheet.getDataValidation(1, 1)).toThrow();
  });

  test('removeDataValidation throws after dispose', () => {
    const { sheet } = makeSheet();
    sheet.dispose();
    expect(() => sheet.removeDataValidation(1, 1)).toThrow();
  });

  test('getValidationCells throws after dispose', () => {
    const { sheet } = makeSheet();
    sheet.dispose();
    expect(() => sheet.getValidationCells()).toThrow();
  });
});

// ---------------------------------------------------------------------------
// §12 Cross-sheet isolation
// ---------------------------------------------------------------------------

describe('§12 Cross-sheet isolation', () => {
  test('rules in one sheet do not appear in another', () => {
    const sheetA = createSpreadsheet('A', { rows: 20, cols: 10 });
    const sheetB = createSpreadsheet('B', { rows: 20, cols: 10 });

    sheetA.setDataValidation(1, 1, listRule);
    expect(sheetA.getValidationCells()).toHaveLength(1);
    expect(sheetB.getValidationCells()).toHaveLength(0);

    sheetA.dispose();
    sheetB.dispose();
  });
});
