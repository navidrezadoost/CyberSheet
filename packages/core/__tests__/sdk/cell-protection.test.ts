/**
 * @group sdk
 *
 * Phase 20: Cell Protection & Security — SDK Test Suite
 *
 *   §1  setSheetProtection — enables protection with optional options
 *   §2  removeSheetProtection — clears protection
 *   §3  isSheetProtected — reflects current state
 *   §4  getSheetProtection — returns options copy (not a live reference)
 *   §5  isCellProtected — respects sheet state + cell locked flag
 *   §6  setCell throws ProtectedCellError when cell is locked
 *   §7  setCell succeeds when cell is explicitly unlocked
 *   §8  lockCell — sets locked:true, undo-able
 *   §9  unlockCell — sets locked:false, undo-able
 *  §10  Undo/redo of setSheetProtection
 *  §11  applyPatch bypasses write guard (undo/redo semantics)
 *  §12  setSheetProtection options round-trip
 *  §13  removeSheetProtection on unprotected sheet is a no-op
 *  §14  Disposed-sheet safety
 *  §15  Event emission
 */

import { createSpreadsheet } from '../../src/sdk/index';
import { ProtectedCellError } from '../../src/sdk/SpreadsheetSDK';
import { invertPatch } from '../../src/patch/WorksheetPatch';
import type { SpreadsheetSDK } from '../../src/sdk/SpreadsheetSDK';
import type { WorksheetPatch } from '../../src/patch/WorksheetPatch';
import type { SheetProtectionOptions } from '../../src/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSheet(): SpreadsheetSDK {
  return createSpreadsheet('Protection', { rows: 20, cols: 10 });
}

// ---------------------------------------------------------------------------
// §1 setSheetProtection
// ---------------------------------------------------------------------------

describe('§1 setSheetProtection', () => {
  test('sheet is not protected initially', () => {
    const sheet = makeSheet();
    expect(sheet.isSheetProtected()).toBe(false);
    sheet.dispose();
  });

  test('setSheetProtection() with no args protects with default options', () => {
    const sheet = makeSheet();
    sheet.setSheetProtection();
    expect(sheet.isSheetProtected()).toBe(true);
    sheet.dispose();
  });

  test('setSheetProtection(options) stores the provided options', () => {
    const sheet = makeSheet();
    sheet.setSheetProtection({ allowFormatCells: true, allowSort: true });
    expect(sheet.isSheetProtected()).toBe(true);
    const opts = sheet.getSheetProtection();
    expect(opts?.allowFormatCells).toBe(true);
    expect(opts?.allowSort).toBe(true);
    sheet.dispose();
  });
});

// ---------------------------------------------------------------------------
// §2 removeSheetProtection
// ---------------------------------------------------------------------------

describe('§2 removeSheetProtection', () => {
  test('removes protection after setSheetProtection', () => {
    const sheet = makeSheet();
    sheet.setSheetProtection();
    sheet.removeSheetProtection();
    expect(sheet.isSheetProtected()).toBe(false);
    sheet.dispose();
  });
});

// ---------------------------------------------------------------------------
// §3 isSheetProtected
// ---------------------------------------------------------------------------

describe('§3 isSheetProtected', () => {
  test('toggles correctly', () => {
    const sheet = makeSheet();
    expect(sheet.isSheetProtected()).toBe(false);
    sheet.setSheetProtection();
    expect(sheet.isSheetProtected()).toBe(true);
    sheet.removeSheetProtection();
    expect(sheet.isSheetProtected()).toBe(false);
    sheet.dispose();
  });
});

// ---------------------------------------------------------------------------
// §4 getSheetProtection
// ---------------------------------------------------------------------------

describe('§4 getSheetProtection', () => {
  test('returns null when not protected', () => {
    const sheet = makeSheet();
    expect(sheet.getSheetProtection()).toBeNull();
    sheet.dispose();
  });

  test('returns a copy, not a live reference', () => {
    const sheet = makeSheet();
    sheet.setSheetProtection({ allowFilter: true });
    const opts = sheet.getSheetProtection() as SheetProtectionOptions;
    opts.allowFilter = false; // mutate the returned copy
    // Original must be unaffected
    expect(sheet.getSheetProtection()?.allowFilter).toBe(true);
    sheet.dispose();
  });
});

// ---------------------------------------------------------------------------
// §5 isCellProtected
// ---------------------------------------------------------------------------

describe('§5 isCellProtected', () => {
  test('returns false when sheet is not protected', () => {
    const sheet = makeSheet();
    sheet.setCell(1, 1, 'x');
    expect(sheet.isCellProtected(1, 1)).toBe(false);
    sheet.dispose();
  });

  test('returns true for a cell with no explicit locked flag (Excel default)', () => {
    const sheet = makeSheet();
    sheet.setCell(1, 1, 'x');
    sheet.setSheetProtection();
    expect(sheet.isCellProtected(1, 1)).toBe(true);
    sheet.dispose();
  });

  test('returns true for a cell with locked:true', () => {
    const sheet = makeSheet();
    sheet.lockCell(2, 2);
    sheet.setSheetProtection();
    expect(sheet.isCellProtected(2, 2)).toBe(true);
    sheet.dispose();
  });

  test('returns false for a cell with locked:false (explicitly unlocked)', () => {
    const sheet = makeSheet();
    sheet.unlockCell(3, 3);
    sheet.setSheetProtection();
    expect(sheet.isCellProtected(3, 3)).toBe(false);
    sheet.dispose();
  });

  test('returns false for empty cell when sheet is not protected', () => {
    const sheet = makeSheet();
    sheet.setSheetProtection();
    // An unlocked empty cell should still be protected by default  
    expect(sheet.isCellProtected(5, 5)).toBe(true); // no style → locked default
    sheet.removeSheetProtection();
    expect(sheet.isCellProtected(5, 5)).toBe(false);
    sheet.dispose();
  });
});

// ---------------------------------------------------------------------------
// §6 setCell throws ProtectedCellError when cell is locked
// ---------------------------------------------------------------------------

describe('§6 setCell write guard', () => {
  test('throws ProtectedCellError for a locked cell', () => {
    const sheet = makeSheet();
    sheet.setCell(1, 1, 'original');
    sheet.setSheetProtection();
    expect(() => sheet.setCell(1, 1, 'modified')).toThrow(ProtectedCellError);
    // Value must be unchanged
    expect(sheet.getCellValue(1, 1)).toBe('original');
    sheet.dispose();
  });

  test('throws for an empty cell (default locked)', () => {
    const sheet = makeSheet();
    sheet.setSheetProtection();
    expect(() => sheet.setCell(2, 2, 'new')).toThrow(ProtectedCellError);
    sheet.dispose();
  });

  test('throws class name is ProtectedCellError', () => {
    const sheet = makeSheet();
    sheet.setSheetProtection();
    try {
      sheet.setCell(1, 1, 'x');
    } catch (err) {
      expect((err as Error).name).toBe('ProtectedCellError');
      expect(err).toBeInstanceOf(ProtectedCellError);
    }
    sheet.dispose();
  });
});

// ---------------------------------------------------------------------------
// §7 setCell succeeds when cell is explicitly unlocked
// ---------------------------------------------------------------------------

describe('§7 setCell succeeds on unlocked cell', () => {
  test('can write to a cell with locked:false even when sheet is protected', () => {
    const sheet = makeSheet();
    sheet.setCell(1, 1, 'original');
    sheet.unlockCell(1, 1);
    sheet.setSheetProtection();
    expect(() => sheet.setCell(1, 1, 'modified')).not.toThrow();
    expect(sheet.getCellValue(1, 1)).toBe('modified');
    sheet.dispose();
  });
});

// ---------------------------------------------------------------------------
// §8 lockCell
// ---------------------------------------------------------------------------

describe('§8 lockCell', () => {
  test('sets style.locked = true', () => {
    const sheet = makeSheet();
    sheet.lockCell(1, 1);
    expect(sheet.getCell(1, 1)?.style?.locked).toBe(true);
    sheet.dispose();
  });

  test('lockCell is undo-able', () => {
    const sheet = makeSheet();
    sheet.lockCell(1, 1);
    sheet.undo();
    // After undo, locked should be undefined (no style was set before)
    expect(sheet.getCell(1, 1)?.style?.locked).toBeUndefined();
    sheet.dispose();
  });
});

// ---------------------------------------------------------------------------
// §9 unlockCell
// ---------------------------------------------------------------------------

describe('§9 unlockCell', () => {
  test('sets style.locked = false', () => {
    const sheet = makeSheet();
    sheet.unlockCell(2, 3);
    expect(sheet.getCell(2, 3)?.style?.locked).toBe(false);
    sheet.dispose();
  });

  test('unlockCell is undo-able', () => {
    const sheet = makeSheet();
    sheet.lockCell(2, 3); // sets locked:true
    sheet.unlockCell(2, 3); // sets locked:false
    sheet.undo(); // undo unlockCell → locked:true
    expect(sheet.getCell(2, 3)?.style?.locked).toBe(true);
    sheet.dispose();
  });
});

// ---------------------------------------------------------------------------
// §10 Undo / Redo of setSheetProtection
// ---------------------------------------------------------------------------

describe('§10 Undo / Redo of setSheetProtection', () => {
  test('undo of setSheetProtection removes protection', () => {
    const sheet = makeSheet();
    expect(sheet.isSheetProtected()).toBe(false);
    sheet.setSheetProtection({ allowFilter: true });
    expect(sheet.isSheetProtected()).toBe(true);
    sheet.undo();
    expect(sheet.isSheetProtected()).toBe(false);
    sheet.dispose();
  });

  test('redo restores protection', () => {
    const sheet = makeSheet();
    sheet.setSheetProtection({ allowSort: true });
    sheet.undo(); // removes protection
    sheet.redo(); // restores it
    expect(sheet.isSheetProtected()).toBe(true);
    expect(sheet.getSheetProtection()?.allowSort).toBe(true);
    sheet.dispose();
  });

  test('undo of removeSheetProtection restores protection', () => {
    const sheet = makeSheet();
    sheet.setSheetProtection({ allowDeleteRows: true });
    sheet.removeSheetProtection();
    expect(sheet.isSheetProtected()).toBe(false);
    sheet.undo();
    expect(sheet.isSheetProtected()).toBe(true);
    expect(sheet.getSheetProtection()?.allowDeleteRows).toBe(true);
    sheet.dispose();
  });
});

// ---------------------------------------------------------------------------
// §11 applyPatch bypasses write guard
// ---------------------------------------------------------------------------

describe('§11 applyPatch bypasses write guard', () => {
  test('direct applyPatch can mutate a protected locked cell', () => {
    const sheet = makeSheet();
    sheet.setCell(1, 1, 'before');
    sheet.setSheetProtection();

    // Build a patch manually and apply directly — should NOT throw
    const patch: WorksheetPatch = {
      seq: 0,
      ops: [{ op: 'setCellValue', row: 1, col: 1, before: 'before', after: 'after' }],
    };
    expect(() => sheet.applyPatch(patch)).not.toThrow();
    expect(sheet.getCellValue(1, 1)).toBe('after');
    sheet.dispose();
  });
});

// ---------------------------------------------------------------------------
// §12 setSheetProtection options round-trip
// ---------------------------------------------------------------------------

describe('§12 Options round-trip', () => {
  test('all SheetProtectionOptions fields are preserved', () => {
    const opts: SheetProtectionOptions = {
      allowFormatCells: true,
      allowFormatColumns: false,
      allowFormatRows: true,
      allowInsertRows: false,
      allowInsertColumns: true,
      allowInsertHyperlinks: false,
      allowDeleteRows: true,
      allowDeleteColumns: false,
      allowSort: true,
      allowFilter: false,
      allowPivotTables: true,
    };
    const sheet = makeSheet();
    sheet.setSheetProtection(opts);
    expect(sheet.getSheetProtection()).toStrictEqual(opts);
    sheet.dispose();
  });
});

// ---------------------------------------------------------------------------
// §13 removeSheetProtection on unprotected sheet is a no-op
// ---------------------------------------------------------------------------

describe('§13 removeSheetProtection no-op', () => {
  test('does not throw, canUndo stays false', () => {
    const sheet = makeSheet();
    expect(sheet.canUndo).toBe(false);
    sheet.removeSheetProtection(); // no-op
    expect(sheet.canUndo).toBe(false);
    sheet.dispose();
  });
});

// ---------------------------------------------------------------------------
// §14 Disposed-sheet safety
// ---------------------------------------------------------------------------

describe('§14 Disposed-sheet safety', () => {
  test.each([
    ['setSheetProtection', (s: SpreadsheetSDK) => s.setSheetProtection()],
    ['removeSheetProtection', (s: SpreadsheetSDK) => s.removeSheetProtection()],
    ['isSheetProtected', (s: SpreadsheetSDK) => s.isSheetProtected()],
    ['getSheetProtection', (s: SpreadsheetSDK) => s.getSheetProtection()],
    ['isCellProtected', (s: SpreadsheetSDK) => s.isCellProtected(1, 1)],
    ['lockCell', (s: SpreadsheetSDK) => s.lockCell(1, 1)],
    ['unlockCell', (s: SpreadsheetSDK) => s.unlockCell(1, 1)],
  ])('%s throws after dispose', (_name, fn) => {
    const sheet = makeSheet();
    sheet.dispose();
    expect(() => fn(sheet)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// §15 Event emission
// ---------------------------------------------------------------------------

describe('§15 Event emission', () => {
  test('setSheetProtection emits structure-changed', () => {
    const sheet = makeSheet();
    const events: string[] = [];
    sheet.on('structure-changed', () => events.push('structure-changed'));
    sheet.setSheetProtection();
    expect(events).toContain('structure-changed');
    sheet.dispose();
  });

  test('removeSheetProtection emits structure-changed', () => {
    const sheet = makeSheet();
    sheet.setSheetProtection();
    const events: string[] = [];
    sheet.on('structure-changed', () => events.push('structure-changed'));
    sheet.removeSheetProtection();
    expect(events).toContain('structure-changed');
    sheet.dispose();
  });
});
