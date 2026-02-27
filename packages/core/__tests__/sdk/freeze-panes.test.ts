/**
 * @group sdk
 *
 * Phase 20: Freeze Panes — SDK Test Suite
 *
 *   §1  setFreezePanes — stores state
 *   §2  getFreezePanes — returns state copy (or null)
 *   §3  clearFreezePanes — removes state
 *   §4  setFreezePanes(0, 0) clears state
 *   §5  Rows-only freeze (cols=0)
 *   §6  Cols-only freeze (rows=0)
 *   §7  setFreezePanes replaces previously set state
 *   §8  Undo / Redo of setFreezePanes
 *   §9  Undo / Redo of clearFreezePanes
 *  §10  applyPatch + invertPatch round-trip
 *  §11  Invalid arguments throw RangeError
 *  §12  clearFreezePanes on unfrozen sheet is a no-op
 *  §13  Disposed-sheet safety
 *  §14  Event emission
 */

import { createSpreadsheet } from '../../src/sdk/index';
import { invertPatch, applyPatch } from '../../src/patch/WorksheetPatch';
import type { SpreadsheetSDK } from '../../src/sdk/SpreadsheetSDK';
import type { WorksheetPatch } from '../../src/patch/WorksheetPatch';
import type { Worksheet } from '../../src/worksheet';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSheet(): SpreadsheetSDK {
  return createSpreadsheet('Freeze', { rows: 50, cols: 26 });
}

// ---------------------------------------------------------------------------
// §1 setFreezePanes — stores state
// ---------------------------------------------------------------------------

describe('§1 setFreezePanes', () => {
  test('no freeze panes on a fresh sheet', () => {
    const sheet = makeSheet();
    expect(sheet.getFreezePanes()).toBeNull();
    sheet.dispose();
  });

  test('sets rows and cols', () => {
    const sheet = makeSheet();
    sheet.setFreezePanes(3, 2);
    expect(sheet.getFreezePanes()).toEqual({ rows: 3, cols: 2 });
    sheet.dispose();
  });
});

// ---------------------------------------------------------------------------
// §2 getFreezePanes — returns a copy
// ---------------------------------------------------------------------------

describe('§2 getFreezePanes returns a copy', () => {
  test('mutating the returned object does not change the stored state', () => {
    const sheet = makeSheet();
    sheet.setFreezePanes(2, 1);
    const state = sheet.getFreezePanes()!;
    state.rows = 99;
    expect(sheet.getFreezePanes()!.rows).toBe(2); // original untouched
    sheet.dispose();
  });
});

// ---------------------------------------------------------------------------
// §3 clearFreezePanes
// ---------------------------------------------------------------------------

describe('§3 clearFreezePanes', () => {
  test('removes a previously set freeze state', () => {
    const sheet = makeSheet();
    sheet.setFreezePanes(3, 2);
    sheet.clearFreezePanes();
    expect(sheet.getFreezePanes()).toBeNull();
    sheet.dispose();
  });
});

// ---------------------------------------------------------------------------
// §4 setFreezePanes(0, 0) clears state
// ---------------------------------------------------------------------------

describe('§4 setFreezePanes(0,0) is equivalent to clearFreezePanes', () => {
  test('results in null state', () => {
    const sheet = makeSheet();
    sheet.setFreezePanes(3, 2);
    sheet.setFreezePanes(0, 0);
    expect(sheet.getFreezePanes()).toBeNull();
    sheet.dispose();
  });
});

// ---------------------------------------------------------------------------
// §5 Rows-only freeze
// ---------------------------------------------------------------------------

describe('§5 Rows-only freeze (cols=0)', () => {
  test('freezes rows without affecting cols dimension', () => {
    const sheet = makeSheet();
    sheet.setFreezePanes(5, 0);
    expect(sheet.getFreezePanes()).toEqual({ rows: 5, cols: 0 });
    sheet.dispose();
  });
});

// ---------------------------------------------------------------------------
// §6 Cols-only freeze
// ---------------------------------------------------------------------------

describe('§6 Cols-only freeze (rows=0)', () => {
  test('freezes cols without affecting rows dimension', () => {
    const sheet = makeSheet();
    sheet.setFreezePanes(0, 3);
    expect(sheet.getFreezePanes()).toEqual({ rows: 0, cols: 3 });
    sheet.dispose();
  });
});

// ---------------------------------------------------------------------------
// §7 setFreezePanes replaces previously set state
// ---------------------------------------------------------------------------

describe('§7 setFreezePanes replaces previous state', () => {
  test('new values overwrite old values', () => {
    const sheet = makeSheet();
    sheet.setFreezePanes(3, 2);
    sheet.setFreezePanes(1, 5);
    expect(sheet.getFreezePanes()).toEqual({ rows: 1, cols: 5 });
    sheet.dispose();
  });
});

// ---------------------------------------------------------------------------
// §8 Undo / Redo of setFreezePanes
// ---------------------------------------------------------------------------

describe('§8 Undo / Redo of setFreezePanes', () => {
  test('undo restores previous null state', () => {
    const sheet = makeSheet();
    sheet.setFreezePanes(3, 2);
    sheet.undo();
    expect(sheet.getFreezePanes()).toBeNull();
    sheet.dispose();
  });

  test('redo re-applies the freeze', () => {
    const sheet = makeSheet();
    sheet.setFreezePanes(3, 2);
    sheet.undo();
    sheet.redo();
    expect(sheet.getFreezePanes()).toEqual({ rows: 3, cols: 2 });
    sheet.dispose();
  });

  test('undo of second setFreezePanes restores first state', () => {
    const sheet = makeSheet();
    sheet.setFreezePanes(1, 1);
    sheet.setFreezePanes(4, 3);
    sheet.undo();
    expect(sheet.getFreezePanes()).toEqual({ rows: 1, cols: 1 });
    sheet.dispose();
  });
});

// ---------------------------------------------------------------------------
// §9 Undo / Redo of clearFreezePanes
// ---------------------------------------------------------------------------

describe('§9 Undo / Redo of clearFreezePanes', () => {
  test('undo of clearFreezePanes restores previous state', () => {
    const sheet = makeSheet();
    sheet.setFreezePanes(2, 2);
    sheet.clearFreezePanes();
    expect(sheet.getFreezePanes()).toBeNull();
    sheet.undo();
    expect(sheet.getFreezePanes()).toEqual({ rows: 2, cols: 2 });
    sheet.dispose();
  });

  test('redo re-clears freeze', () => {
    const sheet = makeSheet();
    sheet.setFreezePanes(2, 2);
    sheet.clearFreezePanes();
    sheet.undo();
    sheet.redo();
    expect(sheet.getFreezePanes()).toBeNull();
    sheet.dispose();
  });
});

// ---------------------------------------------------------------------------
// §10 applyPatch + invertPatch round-trip
// ---------------------------------------------------------------------------

describe('§10 applyPatch + invertPatch round-trip', () => {
  test('setFreezePanes patch is invertible', () => {
    const sheet = makeSheet();
    const ws = (sheet as any)._ws as Worksheet;

    // Build patch directly
    const patch: WorksheetPatch = {
      seq: 1,
      ops: [{ op: 'setFreezePanes', before: null, after: { rows: 4, cols: 1 } }],
    };

    // Apply forward
    applyPatch(ws, patch);
    expect(ws.getFreezePanes()).toEqual({ rows: 4, cols: 1 });

    // Apply inverse (undo)
    const inverse = invertPatch(patch);
    applyPatch(ws, inverse);
    expect(ws.getFreezePanes()).toBeNull();

    sheet.dispose();
  });

  test('setSheetProtection patch is invertible', () => {
    const sheet = makeSheet();
    const ws = (sheet as any)._ws as Worksheet;

    const patch: WorksheetPatch = {
      seq: 1,
      ops: [{ op: 'setSheetProtection', before: null, after: { allowFilter: true } }],
    };

    applyPatch(ws, patch);
    expect(ws.isSheetProtected()).toBe(true);

    const inverse = invertPatch(patch);
    applyPatch(ws, inverse);
    expect(ws.isSheetProtected()).toBe(false);

    sheet.dispose();
  });
});

// ---------------------------------------------------------------------------
// §11 Invalid arguments throw RangeError
// ---------------------------------------------------------------------------

describe('§11 Invalid arguments', () => {
  test('negative rows throw RangeError via worksheet', () => {
    const sheet = makeSheet();
    const ws = (sheet as any)._ws as Worksheet;
    expect(() => ws.setFreezePanes(-1, 0)).toThrow(RangeError);
    sheet.dispose();
  });

  test('negative cols throw RangeError via worksheet', () => {
    const sheet = makeSheet();
    const ws = (sheet as any)._ws as Worksheet;
    expect(() => ws.setFreezePanes(0, -1)).toThrow(RangeError);
    sheet.dispose();
  });

  test('non-integer rows throw RangeError via worksheet', () => {
    const sheet = makeSheet();
    const ws = (sheet as any)._ws as Worksheet;
    expect(() => ws.setFreezePanes(1.5, 0)).toThrow(RangeError);
    sheet.dispose();
  });
});

// ---------------------------------------------------------------------------
// §12 clearFreezePanes on unfrozen sheet is a no-op
// ---------------------------------------------------------------------------

describe('§12 clearFreezePanes no-op', () => {
  test('does not push to undo stack when nothing is frozen', () => {
    const sheet = makeSheet();
    expect(sheet.canUndo).toBe(false);
    sheet.clearFreezePanes();
    expect(sheet.canUndo).toBe(false);
    sheet.dispose();
  });
});

// ---------------------------------------------------------------------------
// §13 Disposed-sheet safety
// ---------------------------------------------------------------------------

describe('§13 Disposed-sheet safety', () => {
  test.each([
    ['setFreezePanes', (s: SpreadsheetSDK) => s.setFreezePanes(1, 1)],
    ['clearFreezePanes', (s: SpreadsheetSDK) => s.clearFreezePanes()],
    ['getFreezePanes', (s: SpreadsheetSDK) => s.getFreezePanes()],
  ])('%s throws after dispose', (_name, fn) => {
    const sheet = makeSheet();
    sheet.dispose();
    expect(() => fn(sheet)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// §14 Event emission
// ---------------------------------------------------------------------------

describe('§14 Event emission', () => {
  test('setFreezePanes emits structure-changed', () => {
    const sheet = makeSheet();
    const events: string[] = [];
    sheet.on('structure-changed', () => events.push('structure-changed'));
    sheet.setFreezePanes(2, 1);
    expect(events).toContain('structure-changed');
    sheet.dispose();
  });

  test('clearFreezePanes emits structure-changed', () => {
    const sheet = makeSheet();
    sheet.setFreezePanes(2, 1);
    const events: string[] = [];
    sheet.on('structure-changed', () => events.push('structure-changed'));
    sheet.clearFreezePanes();
    expect(events).toContain('structure-changed');
    sheet.dispose();
  });
});
