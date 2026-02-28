/**
 * @group sdk
 *
 * Phase 23: Cell Protection Hardening — SDK Test Suite
 *
 *  §1   isCellLocked() — intrinsic state independent of sheet protection
 *  §2   lockCells(range) / unlockCells(range) — bulk API
 *  §3   getFormula() — returns formula / null / hidden when protected
 *  §4   selectLockedCells / selectUnlockedCells in SheetProtectionOptions
 *  §5   _guardSheetOp: allowFormatCells — lockCell/unlockCell/mergeCells/DV
 *  §6   _guardSheetOp: allowFormatRows  — hideRow / showRow
 *  §7   _guardSheetOp: allowFormatColumns — hideCol / showCol
 *  §8   _guardSheetOp: allowSort — sortRange
 *  §9   _guardSheetOp: allowFilter — setFilter / clearFilter / clearAllFilters /
 *                                     setAutoFilterRange / clearAutoFilterRange
 * §10   allowX: true — operations pass when the flag is enabled
 * §11   Undo/redo of bulk lockCells / unlockCells
 * §12   ProtectedSheetOperationError class identity & message
 * §13   Guard bypass via applyPatch (undo/redo semantics)
 * §14   Guards inactive when sheet is unprotected
 * §15   Dispose safety for new methods
 */

import { createSpreadsheet } from '../../src/sdk/index';
import {
  ProtectedCellError,
  ProtectedSheetOperationError,
  SdkError,
} from '../../src/sdk/SpreadsheetSDK';
import type { SpreadsheetSDK } from '../../src/sdk/SpreadsheetSDK';
import type { SheetProtectionOptions } from '../../src/types';

// ── helpers ──────────────────────────────────────────────────────────────── 

function makeSheet(rows = 20, cols = 10): SpreadsheetSDK {
  return createSpreadsheet('P23', { rows, cols });
}

function protectedSheet(opts: SheetProtectionOptions = {}): SpreadsheetSDK {
  const s = makeSheet();
  s.setSheetProtection(opts);
  return s;
}

// ── §1 isCellLocked() ─────────────────────────────────────────────────────

describe('§1 isCellLocked', () => {
  test('every cell is locked by default (Excel default)', () => {
    const s = makeSheet();
    expect(s.isCellLocked(1, 1)).toBe(true);
    expect(s.isCellLocked(5, 5)).toBe(true);
    s.dispose();
  });

  test('returns false after unlockCell()', () => {
    const s = makeSheet();
    s.unlockCell(3, 4);
    expect(s.isCellLocked(3, 4)).toBe(false);
    s.dispose();
  });

  test('returns true after lockCell()', () => {
    const s = makeSheet();
    s.unlockCell(2, 2);
    expect(s.isCellLocked(2, 2)).toBe(false);
    s.lockCell(2, 2);
    expect(s.isCellLocked(2, 2)).toBe(true);
    s.dispose();
  });

  test('is independent of sheet protection state', () => {
    const s = makeSheet();
    s.unlockCell(1, 1);
    s.setSheetProtection();
    // Still reports intrinsic lock state even while sheet is protected
    expect(s.isCellLocked(1, 1)).toBe(false);
    expect(s.isCellLocked(1, 2)).toBe(true);
    s.dispose();
  });

  test('throws BoundsError for out-of-bounds cell', () => {
    const s = makeSheet(5, 5);
    expect(() => s.isCellLocked(0, 1)).toThrow();
    expect(() => s.isCellLocked(6, 1)).toThrow();
    s.dispose();
  });
});

// ── §2 lockCells / unlockCells ────────────────────────────────────────────

describe('§2 lockCells / unlockCells bulk API', () => {
  test('lockCells locks every cell in the range', () => {
    const s = makeSheet();
    // Explicitly unlock a range first
    for (let r = 2; r <= 4; r++)
      for (let c = 2; c <= 4; c++)
        s.unlockCell(r, c);
    s.lockCells({ start: { row: 2, col: 2 }, end: { row: 4, col: 4 } });
    for (let r = 2; r <= 4; r++)
      for (let c = 2; c <= 4; c++)
        expect(s.isCellLocked(r, c)).toBe(true);
    s.dispose();
  });

  test('unlockCells unlocks every cell in the range', () => {
    const s = makeSheet();
    s.unlockCells({ start: { row: 3, col: 3 }, end: { row: 5, col: 5 } });
    for (let r = 3; r <= 5; r++)
      for (let c = 3; c <= 5; c++)
        expect(s.isCellLocked(r, c)).toBe(false);
    s.dispose();
  });

  test('lockCells on single cell works (1×1 range)', () => {
    const s = makeSheet();
    s.unlockCell(1, 1);
    expect(s.isCellLocked(1, 1)).toBe(false);
    s.lockCells({ start: { row: 1, col: 1 }, end: { row: 1, col: 1 } });
    expect(s.isCellLocked(1, 1)).toBe(true);
    s.dispose();
  });

  test('setCell still respects protection after unlockCells', () => {
    const s = makeSheet();
    s.unlockCells({ start: { row: 1, col: 1 }, end: { row: 2, col: 2 } });
    s.setSheetProtection();
    // Unlocked cells accept writes
    expect(() => s.setCell(1, 1, 'ok')).not.toThrow();
    // Locked cells (outside range) reject writes
    expect(() => s.setCell(3, 3, 'fail')).toThrow(ProtectedCellError);
    s.dispose();
  });
});

// ── §3 getFormula() ───────────────────────────────────────────────────────

describe('§3 getFormula', () => {
  test('returns null for a plain-value cell', () => {
    const s = makeSheet();
    s.setCell(1, 1, 42);
    expect(s.getFormula(1, 1)).toBeNull();
    s.dispose();
  });

  test('returns null for an empty cell', () => {
    const s = makeSheet();
    expect(s.getFormula(1, 1)).toBeNull();
    s.dispose();
  });

  test('returns formula string when not protected', () => {
    const s = makeSheet();
    // Seed a formula cell via the internal worksheet setCellFormula method
    const ws = (s as any)._ws;
    ws.setCellFormula({ row: 2, col: 3 }, '=A1+B1', 0);
    expect(s.getFormula(2, 3)).toBe('=A1+B1');
    s.dispose();
  });

  test('returns formula when sheet is protected but cell hidden=false', () => {
    const s = makeSheet();
    const ws = (s as any)._ws;
    ws.setCellFormula({ row: 1, col: 1 }, '=SUM(A2:A10)', 10);
    s.setSheetProtection();
    expect(s.getFormula(1, 1)).toBe('=SUM(A2:A10)');
    s.dispose();
  });

  test('returns null when sheet is protected and cell style.hidden=true', () => {
    const s = makeSheet();
    const ws = (s as any)._ws;
    ws.setCellFormula({ row: 1, col: 1 }, '=SECRET()', 0);
    // Set style.hidden=true (formula hidden protection attribute)
    ws.setCellStyle({ row: 1, col: 1 }, { hidden: true });
    s.setSheetProtection();
    expect(s.getFormula(1, 1)).toBeNull();
    s.dispose();
  });

  test('returns formula again after protection is removed', () => {
    const s = makeSheet();
    const ws = (s as any)._ws;
    ws.setCellFormula({ row: 1, col: 1 }, '=A2', 0);
    ws.setCellStyle({ row: 1, col: 1 }, { hidden: true });
    s.setSheetProtection();
    expect(s.getFormula(1, 1)).toBeNull();    // hidden while protected
    s.removeSheetProtection();
    expect(s.getFormula(1, 1)).toBe('=A2');  // visible after unprotect
    s.dispose();
  });
});

// ── §4 selectLockedCells / selectUnlockedCells in options ─────────────────

describe('§4 selectLockedCells / selectUnlockedCells in SheetProtectionOptions', () => {
  test('round-trips selectLockedCells=false', () => {
    const s = makeSheet();
    s.setSheetProtection({ selectLockedCells: false });
    expect(s.getSheetProtection()?.selectLockedCells).toBe(false);
    s.dispose();
  });

  test('round-trips selectUnlockedCells=true', () => {
    const s = makeSheet();
    s.setSheetProtection({ selectUnlockedCells: true });
    expect(s.getSheetProtection()?.selectUnlockedCells).toBe(true);
    s.dispose();
  });

  test('stored in undo snapshot and survives undo/redo', () => {
    const s = makeSheet();
    s.setSheetProtection({ selectLockedCells: false, selectUnlockedCells: false });
    s.undo();
    expect(s.isSheetProtected()).toBe(false);
    s.redo();
    const opts = s.getSheetProtection();
    expect(opts?.selectLockedCells).toBe(false);
    expect(opts?.selectUnlockedCells).toBe(false);
    s.dispose();
  });
});

// ── §5 _guardSheetOp: allowFormatCells ────────────────────────────────────

describe('§5 allowFormatCells enforcement', () => {
  test('lockCell throws ProtectedSheetOperationError when protected without allowFormatCells', () => {
    const s = protectedSheet();
    expect(() => s.lockCell(1, 1)).toThrow(ProtectedSheetOperationError);
    s.dispose();
  });

  test('unlockCell throws when protected without allowFormatCells', () => {
    const s = protectedSheet();
    expect(() => s.unlockCell(1, 1)).toThrow(ProtectedSheetOperationError);
    s.dispose();
  });

  test('lockCells throws when protected without allowFormatCells', () => {
    const s = protectedSheet();
    const range = { start: { row: 1, col: 1 }, end: { row: 2, col: 2 } };
    expect(() => s.lockCells(range)).toThrow(ProtectedSheetOperationError);
    s.dispose();
  });

  test('unlockCells throws when protected without allowFormatCells', () => {
    const s = protectedSheet();
    const range = { start: { row: 1, col: 1 }, end: { row: 2, col: 2 } };
    expect(() => s.unlockCells(range)).toThrow(ProtectedSheetOperationError);
    s.dispose();
  });

  test('mergeCells throws when protected without allowFormatCells', () => {
    const s = protectedSheet();
    expect(() => s.mergeCells(1, 1, 1, 3)).toThrow(ProtectedSheetOperationError);
    s.dispose();
  });

  test('setDataValidation throws when protected without allowFormatCells', () => {
    const s = protectedSheet();
    expect(() => s.setDataValidation(1, 1, { type: 'whole', operator: 'between', formula1: '1', formula2: '10' }))
      .toThrow(ProtectedSheetOperationError);
    s.dispose();
  });
});

// ── §6 _guardSheetOp: allowFormatRows ─────────────────────────────────────

describe('§6 allowFormatRows enforcement', () => {
  test('hideRow throws when protected without allowFormatRows', () => {
    const s = protectedSheet();
    expect(() => s.hideRow(2)).toThrow(ProtectedSheetOperationError);
    s.dispose();
  });

  test('showRow throws when protected without allowFormatRows', () => {
    const s = makeSheet();
    s.hideRow(2);
    s.setSheetProtection();
    expect(() => s.showRow(2)).toThrow(ProtectedSheetOperationError);
    s.dispose();
  });

  test('hideRow succeeds when allowFormatRows=true', () => {
    const s = protectedSheet({ allowFormatRows: true });
    expect(() => s.hideRow(3)).not.toThrow();
    s.dispose();
  });
});

// ── §7 _guardSheetOp: allowFormatColumns ──────────────────────────────────

describe('§7 allowFormatColumns enforcement', () => {
  test('hideCol throws when protected without allowFormatColumns', () => {
    const s = protectedSheet();
    expect(() => s.hideCol(3)).toThrow(ProtectedSheetOperationError);
    s.dispose();
  });

  test('showCol throws when protected without allowFormatColumns', () => {
    const s = makeSheet();
    s.hideCol(4);
    s.setSheetProtection();
    expect(() => s.showCol(4)).toThrow(ProtectedSheetOperationError);
    s.dispose();
  });

  test('hideCol succeeds when allowFormatColumns=true', () => {
    const s = protectedSheet({ allowFormatColumns: true });
    expect(() => s.hideCol(2)).not.toThrow();
    s.dispose();
  });
});

// ── §8 _guardSheetOp: allowSort ───────────────────────────────────────────

describe('§8 allowSort enforcement', () => {
  test('sortRange throws when protected without allowSort', () => {
    const s = protectedSheet();
    const range = { start: { row: 1, col: 1 }, end: { row: 5, col: 3 } };
    expect(() => s.sortRange(range, [{ col: 1, dir: 'asc' }]))
      .toThrow(ProtectedSheetOperationError);
    s.dispose();
  });

  test('sortRange succeeds when allowSort=true', () => {
    const s = makeSheet();
    s.setCell(1, 1, 'b');
    s.setCell(2, 1, 'a');
    s.setSheetProtection({ allowSort: true });
    const range = { start: { row: 1, col: 1 }, end: { row: 2, col: 1 } };
    expect(() => s.sortRange(range, [{ col: 1, dir: 'asc' }])).not.toThrow();
    s.dispose();
  });

  test('error message contains operation name and flag name', () => {
    const s = protectedSheet();
    const range = { start: { row: 1, col: 1 }, end: { row: 2, col: 1 } };
    let caught: unknown;
    try {
      s.sortRange(range, [{ col: 1, dir: 'asc' }]);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(ProtectedSheetOperationError);
    expect((caught as Error).message).toMatch(/sortRange/);
    expect((caught as Error).message).toMatch(/allowSort/);
    s.dispose();
  });
});

// ── §9 _guardSheetOp: allowFilter ─────────────────────────────────────────

describe('§9 allowFilter enforcement', () => {
  test('setFilter throws when protected without allowFilter', () => {
    const s = protectedSheet();
    expect(() => s.setFilter(1, { type: 'equals', value: 'a' }))
      .toThrow(ProtectedSheetOperationError);
    s.dispose();
  });

  test('clearFilter throws when protected without allowFilter', () => {
    const s = makeSheet();
    s.setFilter(1, { type: 'equals', value: 'a' });
    s.setSheetProtection();
    expect(() => s.clearFilter(1)).toThrow(ProtectedSheetOperationError);
    s.dispose();
  });

  test('clearAllFilters throws when protected without allowFilter', () => {
    const s = makeSheet();
    s.setFilter(1, { type: 'equals', value: 'a' });
    s.setSheetProtection();
    expect(() => s.clearAllFilters()).toThrow(ProtectedSheetOperationError);
    s.dispose();
  });

  test('setAutoFilterRange throws when protected without allowFilter', () => {
    const s = protectedSheet();
    expect(() => s.setAutoFilterRange(1, 1, 5)).toThrow(ProtectedSheetOperationError);
    s.dispose();
  });

  test('clearAutoFilterRange throws when protected without allowFilter', () => {
    const s = makeSheet();
    s.setAutoFilterRange(1, 1, 5);
    s.setSheetProtection();
    expect(() => s.clearAutoFilterRange()).toThrow(ProtectedSheetOperationError);
    s.dispose();
  });

  test('setFilter succeeds when allowFilter=true', () => {
    const s = protectedSheet({ allowFilter: true });
    expect(() => s.setFilter(1, { type: 'equals', value: 'a' })).not.toThrow();
    s.dispose();
  });
});

// ── §10 allowX: true — operations pass when flag enabled ──────────────────

describe('§10 allowX: true operations pass', () => {
  test('lockCell allowed when allowFormatCells=true', () => {
    const s = protectedSheet({ allowFormatCells: true });
    expect(() => s.lockCell(2, 2)).not.toThrow();
    s.dispose();
  });

  test('hideRow allowed when allowFormatRows=true', () => {
    const s = protectedSheet({ allowFormatRows: true });
    expect(() => s.hideRow(1)).not.toThrow();
    s.dispose();
  });

  test('hideCol allowed when allowFormatColumns=true', () => {
    const s = protectedSheet({ allowFormatColumns: true });
    expect(() => s.hideCol(1)).not.toThrow();
    s.dispose();
  });

  test('all guards inactive after removeSheetProtection', () => {
    const s = makeSheet();
    s.setSheetProtection();
    s.removeSheetProtection();
    const range = { start: { row: 1, col: 1 }, end: { row: 2, col: 2 } };
    expect(() => s.sortRange(range, [{ col: 1, dir: 'asc' }])).not.toThrow();
    expect(() => s.hideRow(1)).not.toThrow();
    expect(() => s.hideCol(1)).not.toThrow();
    expect(() => s.mergeCells(3, 3, 3, 4)).not.toThrow();
    s.dispose();
  });
});

// ── §11 Undo/redo of bulk lockCells / unlockCells ─────────────────────────

describe('§11 Undo/redo bulk lockCells / unlockCells', () => {
  test('undo lockCells restores unlock state', () => {
    const s = makeSheet();
    s.unlockCells({ start: { row: 1, col: 1 }, end: { row: 3, col: 3 } });
    // Confirm unlocked
    for (let r = 1; r <= 3; r++)
      for (let c = 1; c <= 3; c++)
        expect(s.isCellLocked(r, c)).toBe(false);
    // Now lock them and undo
    s.lockCells({ start: { row: 1, col: 1 }, end: { row: 3, col: 3 } });
    s.undo();
    for (let r = 1; r <= 3; r++)
      for (let c = 1; c <= 3; c++)
        expect(s.isCellLocked(r, c)).toBe(false);
    s.dispose();
  });

  test('redo lockCells re-applies lock', () => {
    const s = makeSheet();
    s.unlockCells({ start: { row: 1, col: 1 }, end: { row: 2, col: 2 } });
    s.lockCells({ start: { row: 1, col: 1 }, end: { row: 2, col: 2 } });
    s.undo();
    s.redo();
    for (let r = 1; r <= 2; r++)
      for (let c = 1; c <= 2; c++)
        expect(s.isCellLocked(r, c)).toBe(true);
    s.dispose();
  });

  test('undo unlockCells restores locked state', () => {
    const s = makeSheet();
    s.unlockCells({ start: { row: 2, col: 2 }, end: { row: 4, col: 4 } });
    s.undo();
    for (let r = 2; r <= 4; r++)
      for (let c = 2; c <= 4; c++)
        expect(s.isCellLocked(r, c)).toBe(true);
    s.dispose();
  });
});

// ── §12 ProtectedSheetOperationError class identity & message ─────────────

describe('§12 ProtectedSheetOperationError identity', () => {
  test('is instanceof ProtectedSheetOperationError and SdkError', () => {
    const s = protectedSheet();
    const range = { start: { row: 1, col: 1 }, end: { row: 2, col: 2 } };
    let caught: unknown;
    try {
      s.sortRange(range, [{ col: 1, dir: 'asc' }]);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(ProtectedSheetOperationError);
    expect(caught).toBeInstanceOf(SdkError);
    expect((caught as Error).name).toBe('ProtectedSheetOperationError');
    s.dispose();
  });

  test('message includes both operation and flag names', () => {
    const s = protectedSheet();
    try {
      s.hideRow(1);
    } catch (err) {
      const msg = (err as Error).message;
      expect(msg).toMatch(/hideRow/);
      expect(msg).toMatch(/allowFormatRows/);
    }
    s.dispose();
  });
});

// ── §13 Guard bypass via applyPatch ───────────────────────────────────────

describe('§13 applyPatch bypasses sheet-op guards', () => {
  test('sdk.applyPatch bypasses op guard for row visibility', () => {
    const s = makeSheet();
    s.setSheetProtection();  // no allowFormatRows
    // Direct mutation blocked:
    expect(() => s.hideRow(1)).toThrow(ProtectedSheetOperationError);
    // applyPatch at the SDK level bypasses _guardSheetOp:
    expect(() =>
      s.applyPatch({ seq: 0, ops: [{ op: 'hideRow', row: 1 }] }),
    ).not.toThrow();
    expect(s.isRowHidden(1)).toBe(true);
    s.dispose();
  });

  test('sdk.applyPatch bypasses cell guard for locked cell write', () => {
    const s = makeSheet();
    s.setSheetProtection();  // all cells locked by default
    // Direct setCell is blocked by ProtectedCellError:
    expect(() => s.setCell(1, 1, 'blocked')).toThrow(ProtectedCellError);
    // applyPatch bypasses _guardCell:
    expect(() =>
      s.applyPatch({ seq: 0, ops: [{ op: 'setCellValue', row: 1, col: 1, before: null, after: 'via-patch' }] }),
    ).not.toThrow();
    expect(s.getCellValue(1, 1)).toBe('via-patch');
    s.dispose();
  });
});

// ── §14 Guards inactive when unprotected ──────────────────────────────────

describe('§14 Guards inactive when unprotected', () => {
  test('all format/sort/filter ops work on an unprotected sheet', () => {
    const s = makeSheet(20, 10);
    expect(() => s.lockCell(1, 1)).not.toThrow();
    expect(() => s.unlockCell(1, 1)).not.toThrow();
    const range = { start: { row: 1, col: 1 }, end: { row: 2, col: 2 } };
    expect(() => s.lockCells(range)).not.toThrow();
    expect(() => s.unlockCells(range)).not.toThrow();
    expect(() => s.mergeCells(5, 5, 5, 6)).not.toThrow();
    expect(() => s.hideRow(3)).not.toThrow();
    expect(() => s.showRow(3)).not.toThrow();
    expect(() => s.hideCol(3)).not.toThrow();
    expect(() => s.showCol(3)).not.toThrow();
    expect(() => s.setFilter(1, { type: 'equals', value: 'a' })).not.toThrow();
    expect(() => s.clearFilter(1)).not.toThrow();
    expect(() => s.setAutoFilterRange(1, 1, 5)).not.toThrow();
    expect(() => s.clearAutoFilterRange()).not.toThrow();
    expect(() => s.sortRange({ start: { row: 1, col: 1 }, end: { row: 3, col: 1 } }, [{ col: 1, dir: 'asc' }])).not.toThrow();
    s.dispose();
  });
});

// ── §15 Dispose safety ────────────────────────────────────────────────────

describe('§15 Dispose safety for new methods', () => {
  test('isCellLocked throws after dispose', () => {
    const s = makeSheet();
    s.dispose();
    expect(() => s.isCellLocked(1, 1)).toThrow(/DisposedError|disposed/i);
  });

  test('lockCells throws after dispose', () => {
    const s = makeSheet();
    s.dispose();
    const range = { start: { row: 1, col: 1 }, end: { row: 2, col: 2 } };
    expect(() => s.lockCells(range)).toThrow(/DisposedError|disposed/i);
  });

  test('unlockCells throws after dispose', () => {
    const s = makeSheet();
    s.dispose();
    const range = { start: { row: 1, col: 1 }, end: { row: 2, col: 2 } };
    expect(() => s.unlockCells(range)).toThrow(/DisposedError|disposed/i);
  });

  test('getFormula throws after dispose', () => {
    const s = makeSheet();
    s.dispose();
    expect(() => s.getFormula(1, 1)).toThrow(/DisposedError|disposed/i);
  });
});
