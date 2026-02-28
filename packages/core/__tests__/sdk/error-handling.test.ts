/**
 * @group sdk
 *
 * Phase 24 — Error Handling & Debugging Hardening.
 *
 * Validates:
 *  §1  SdkError base — code + operation metadata fields
 *  §2  DisposedError — code 'DISPOSED', operation = method, context-aware message
 *  §3  BoundsError — code 'OUT_OF_BOUNDS', row/col fields
 *  §4  SnapshotError — code 'SNAPSHOT_FAILED', cause propagation
 *  §5  MergeError — code 'MERGE_CONFLICT', cause propagation
 *  §6  PatchError — code 'PATCH_FAILED', cause propagation
 *  §7  ProtectedCellError — row/col readonly fields, code 'CELL_PROTECTED'
 *  §8  ProtectedSheetOperationError — flag field, code 'SHEET_OP_BLOCKED'
 *  §9  ValidationError — row/col/detail fields, code 'VALIDATION_FAILED'
 *  §10 PatchRecorderError — code 'RECORDER_STATE', thrown by PatchRecorder
 *  §11 UndoError — code 'NOTHING_TO_UNDO' / 'NOTHING_TO_REDO', action field
 *  §12 Full error hierarchy — instanceof chain
 *  §13 Mutation trace hook — fires after write ops, timing, operation names
 *  §14 Trace hook cleared — setMutationTraceHook(null) stops firing
 *  §15 KSM dispose — throws DisposedError (instanceof SdkError), code 'DISPOSED'
 *  §16 Exports — all new error classes importable from sdk/index
 */

import {
  createSpreadsheet,
  SdkError,
  DisposedError,
  BoundsError,
  SnapshotError,
  MergeError,
  PatchError,
  ProtectedCellError,
  ProtectedSheetOperationError,
  ValidationError,
  PatchRecorderError,
  UndoError,
  type MutationTraceEvent,
  type MutationTraceHook,
} from '../../src/sdk/index';
import { createKeyboardManager } from '../../src/sdk/KeyboardShortcutManager';
import { PatchRecorder } from '../../src/patch/PatchRecorder';
import type { Worksheet } from '../../src/worksheet';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSheet(name = 'Test') {
  return createSpreadsheet(name);
}

// ---------------------------------------------------------------------------
// §1  SdkError base
// ---------------------------------------------------------------------------

describe('§1 SdkError base', () => {
  it('has a code field (defaults to ERROR)', () => {
    const e = new SdkError('oops');
    expect(e.code).toBe('ERROR');
  });

  it('accepts a custom code', () => {
    const e = new SdkError('oops', 'MY_CODE');
    expect(e.code).toBe('MY_CODE');
  });

  it('operation defaults to undefined', () => {
    const e = new SdkError('oops');
    expect(e.operation).toBeUndefined();
  });

  it('accepts an operation string', () => {
    const e = new SdkError('oops', 'ERR', 'myOp');
    expect(e.operation).toBe('myOp');
  });

  it('is instanceof Error', () => {
    expect(new SdkError('x')).toBeInstanceOf(Error);
  });

  it('.name is SdkError', () => {
    expect(new SdkError('x').name).toBe('SdkError');
  });
});

// ---------------------------------------------------------------------------
// §2  DisposedError
// ---------------------------------------------------------------------------

describe('§2 DisposedError', () => {
  it('code is DISPOSED', () => {
    expect(new DisposedError('doSomething').code).toBe('DISPOSED');
  });

  it('operation is the method name', () => {
    expect(new DisposedError('setCell').operation).toBe('setCell');
  });

  it('.name is DisposedError', () => {
    expect(new DisposedError('x').name).toBe('DisposedError');
  });

  it('message includes method name and default context', () => {
    const e = new DisposedError('undo');
    expect(e.message).toMatch(/SpreadsheetSDK\.undo/);
    expect(e.message).toMatch(/disposed/);
  });

  it('accepts custom context', () => {
    const e = new DisposedError('navigate', 'KeyboardShortcutManager');
    expect(e.message).toMatch(/KeyboardShortcutManager\.navigate/);
    expect(e.message).toMatch(/disposed/);
  });

  it('is instanceof SdkError', () => {
    expect(new DisposedError('x')).toBeInstanceOf(SdkError);
  });
});

// ---------------------------------------------------------------------------
// §3  BoundsError
// ---------------------------------------------------------------------------

describe('§3 BoundsError', () => {
  it('code is OUT_OF_BOUNDS', () => {
    expect(new BoundsError('row 0').code).toBe('OUT_OF_BOUNDS');
  });

  it('.name is BoundsError', () => {
    expect(new BoundsError('x').name).toBe('BoundsError');
  });

  it('is instanceof SdkError', () => {
    expect(new BoundsError('x')).toBeInstanceOf(SdkError);
  });

  it('thrown by SDK on invalid row', () => {
    const s = makeSheet();
    expect(() => s.getCell(0, 1)).toThrow(BoundsError);
    s.dispose();
  });
});

// ---------------------------------------------------------------------------
// §4  SnapshotError
// ---------------------------------------------------------------------------

describe('§4 SnapshotError', () => {
  it('code is SNAPSHOT_FAILED', () => {
    expect(new SnapshotError('bad').code).toBe('SNAPSHOT_FAILED');
  });

  it('stores cause', () => {
    const cause = new Error('inner');
    expect(new SnapshotError('bad', cause).cause).toBe(cause);
  });

  it('.name is SnapshotError', () => {
    expect(new SnapshotError('x').name).toBe('SnapshotError');
  });
});

// ---------------------------------------------------------------------------
// §5  MergeError
// ---------------------------------------------------------------------------

describe('§5 MergeError', () => {
  it('code is MERGE_CONFLICT', () => {
    expect(new MergeError('conflict').code).toBe('MERGE_CONFLICT');
  });

  it('stores cause', () => {
    const cause = new Error('inner');
    expect(new MergeError('conflict', cause).cause).toBe(cause);
  });
});

// ---------------------------------------------------------------------------
// §6  PatchError
// ---------------------------------------------------------------------------

describe('§6 PatchError', () => {
  it('code is PATCH_FAILED', () => {
    expect(new PatchError('bad patch').code).toBe('PATCH_FAILED');
  });

  it('stores cause', () => {
    const cause = new TypeError('t');
    expect(new PatchError('bad patch', cause).cause).toBe(cause);
  });
});

// ---------------------------------------------------------------------------
// §7  ProtectedCellError
// ---------------------------------------------------------------------------

describe('§7 ProtectedCellError', () => {
  it('code is CELL_PROTECTED', () => {
    expect(new ProtectedCellError(3, 4).code).toBe('CELL_PROTECTED');
  });

  it('exposes row as readonly field', () => {
    expect(new ProtectedCellError(3, 4).row).toBe(3);
  });

  it('exposes col as readonly field', () => {
    expect(new ProtectedCellError(3, 4).col).toBe(4);
  });

  it('.name is ProtectedCellError', () => {
    expect(new ProtectedCellError(1, 1).name).toBe('ProtectedCellError');
  });

  it('thrown by SDK with correct row/col', () => {
    const s = makeSheet();
    s.setSheetProtection();
    let caught: ProtectedCellError | undefined;
    try {
      s.setCell(2, 3, 'blocked');
    } catch (e) {
      caught = e as ProtectedCellError;
    }
    expect(caught).toBeInstanceOf(ProtectedCellError);
    expect(caught!.row).toBe(2);
    expect(caught!.col).toBe(3);
    s.dispose();
  });
});

// ---------------------------------------------------------------------------
// §8  ProtectedSheetOperationError
// ---------------------------------------------------------------------------

describe('§8 ProtectedSheetOperationError', () => {
  it('code is SHEET_OP_BLOCKED', () => {
    expect(new ProtectedSheetOperationError('sortRange', 'allowSort').code).toBe('SHEET_OP_BLOCKED');
  });

  it('exposes flag as readonly field', () => {
    expect(new ProtectedSheetOperationError('sortRange', 'allowSort').flag).toBe('allowSort');
  });

  it('operation field is set', () => {
    expect(new ProtectedSheetOperationError('sortRange', 'allowSort').operation).toBe('sortRange');
  });

  it('.name is ProtectedSheetOperationError', () => {
    expect(new ProtectedSheetOperationError('x', 'y').name).toBe('ProtectedSheetOperationError');
  });

  it('thrown by mergeCells when sheet is protected', () => {
    const s = makeSheet();
    s.setSheetProtection({});        // no allowFormatCells
    let caught: ProtectedSheetOperationError | undefined;
    try {
      s.mergeCells(1, 1, 2, 2);
    } catch (e) {
      caught = e as ProtectedSheetOperationError;
    }
    expect(caught).toBeInstanceOf(ProtectedSheetOperationError);
    expect(caught!.flag).toBe('allowFormatCells');
    expect(caught!.operation).toBe('mergeCells');
    s.dispose();
  });
});

// ---------------------------------------------------------------------------
// §9  ValidationError
// ---------------------------------------------------------------------------

describe('§9 ValidationError', () => {
  it('code is VALIDATION_FAILED', () => {
    expect(new ValidationError('setCell', 1, 1, 'out of range').code).toBe('VALIDATION_FAILED');
  });

  it('exposes row field', () => {
    expect(new ValidationError('setCell', 5, 6, 'detail').row).toBe(5);
  });

  it('exposes col field', () => {
    expect(new ValidationError('setCell', 5, 6, 'detail').col).toBe(6);
  });

  it('exposes detail field', () => {
    expect(new ValidationError('setCell', 1, 1, 'my detail').detail).toBe('my detail');
  });

  it('operation field is set', () => {
    expect(new ValidationError('setCell', 1, 1, 'x').operation).toBe('setCell');
  });

  it('.name is ValidationError', () => {
    expect(new ValidationError('x', 1, 1, 'y').name).toBe('ValidationError');
  });

  it('is instanceof SdkError', () => {
    expect(new ValidationError('x', 1, 1, 'y')).toBeInstanceOf(SdkError);
  });
});

// ---------------------------------------------------------------------------
// §10  PatchRecorderError
// ---------------------------------------------------------------------------

describe('§10 PatchRecorderError', () => {
  it('code is RECORDER_STATE', () => {
    expect(new PatchRecorderError('bad state').code).toBe('RECORDER_STATE');
  });

  it('.name is PatchRecorderError', () => {
    expect(new PatchRecorderError('x').name).toBe('PatchRecorderError');
  });

  it('is instanceof SdkError', () => {
    expect(new PatchRecorderError('x')).toBeInstanceOf(SdkError);
  });

  it('thrown by PatchRecorder.start() when already recording', () => {
    const s = makeSheet();
    const recorder = new PatchRecorder((s as any)._ws as Worksheet);
    recorder.start();
    expect(() => recorder.start()).toThrow(PatchRecorderError);
    recorder.abort();
    s.dispose();
  });

  it('thrown by PatchRecorder.stop() when not recording', () => {
    const s = makeSheet();
    const recorder = new PatchRecorder((s as any)._ws as Worksheet);
    expect(() => recorder.stop()).toThrow(PatchRecorderError);
    s.dispose();
  });
});

// ---------------------------------------------------------------------------
// §11  UndoError
// ---------------------------------------------------------------------------

describe('§11 UndoError', () => {
  it('undo action has code NOTHING_TO_UNDO', () => {
    expect(new UndoError('undo').code).toBe('NOTHING_TO_UNDO');
  });

  it('redo action has code NOTHING_TO_REDO', () => {
    expect(new UndoError('redo').code).toBe('NOTHING_TO_REDO');
  });

  it('action field is set correctly for undo', () => {
    expect(new UndoError('undo').action).toBe('undo');
  });

  it('action field is set correctly for redo', () => {
    expect(new UndoError('redo').action).toBe('redo');
  });

  it('.name is UndoError', () => {
    expect(new UndoError('undo').name).toBe('UndoError');
  });

  it('is instanceof SdkError', () => {
    expect(new UndoError('undo')).toBeInstanceOf(SdkError);
  });

  it('message mentions nothing to undo', () => {
    expect(new UndoError('undo').message).toMatch(/nothing to undo/i);
  });

  it('message mentions nothing to redo', () => {
    expect(new UndoError('redo').message).toMatch(/nothing to redo/i);
  });
});

// ---------------------------------------------------------------------------
// §12  Full error hierarchy
// ---------------------------------------------------------------------------

describe('§12 Error hierarchy — all are instanceof SdkError', () => {
  const samples: SdkError[] = [
    new DisposedError('m'),
    new BoundsError('x'),
    new SnapshotError('x'),
    new MergeError('x'),
    new PatchError('x'),
    new ProtectedCellError(1, 1),
    new ProtectedSheetOperationError('op', 'flag'),
    new ValidationError('op', 1, 1, 'd'),
    new PatchRecorderError('x'),
    new UndoError('undo'),
    new UndoError('redo'),
  ];

  samples.forEach((e) => {
    it(`${e.name} is instanceof SdkError`, () => {
      expect(e).toBeInstanceOf(SdkError);
    });
    it(`${e.name} is instanceof Error`, () => {
      expect(e).toBeInstanceOf(Error);
    });
    it(`${e.name} has a non-empty code`, () => {
      expect(e.code).toBeTruthy();
    });
  });
});

// ---------------------------------------------------------------------------
// §13  Mutation trace hook
// ---------------------------------------------------------------------------

describe('§13 Mutation trace hook', () => {
  it('setMutationTraceHook is defined on the sheet', () => {
    const s = makeSheet();
    expect(typeof s.setMutationTraceHook).toBe('function');
    s.dispose();
  });

  it('fires after setCell', () => {
    const s = makeSheet();
    const events: MutationTraceEvent[] = [];
    s.setMutationTraceHook((e) => events.push(e));
    s.setCell(1, 1, 42);
    expect(events).toHaveLength(1);
    expect(events[0]!.operation).toBe('setCell');
    s.dispose();
  });

  it('fires after applyPatch', () => {
    const s = makeSheet();
    const events: MutationTraceEvent[] = [];
    s.setMutationTraceHook((e) => events.push(e));
    s.applyPatch({ seq: 0, ops: [{ op: 'setCellValue', row: 1, col: 1, before: null, after: 'x' }] });
    expect(events[0]!.operation).toBe('applyPatch');
    s.dispose();
  });

  it('fires after undo', () => {
    const s = makeSheet();
    s.setCell(1, 1, 10);
    const events: MutationTraceEvent[] = [];
    s.setMutationTraceHook((e) => events.push(e));
    s.undo();
    expect(events[0]!.operation).toBe('undo');
    s.dispose();
  });

  it('fires after redo', () => {
    const s = makeSheet();
    s.setCell(1, 1, 10);
    s.undo();
    const events: MutationTraceEvent[] = [];
    s.setMutationTraceHook((e) => events.push(e));
    s.redo();
    expect(events[0]!.operation).toBe('redo');
    s.dispose();
  });

  it('fires after sortRange', () => {
    const s = makeSheet();
    s.setCell(1, 1, 'b');
    s.setCell(2, 1, 'a');
    const events: MutationTraceEvent[] = [];
    s.setMutationTraceHook((e) => events.push(e));
    s.sortRange({ start: { row: 1, col: 1 }, end: { row: 2, col: 1 } }, [{ col: 1, dir: 'asc' }]);
    expect(events[0]!.operation).toBe('sortRange');
    s.dispose();
  });

  it('event has numeric durationMs >= 0', () => {
    const s = makeSheet();
    const events: MutationTraceEvent[] = [];
    s.setMutationTraceHook((e) => events.push(e));
    s.setCell(1, 1, 99);
    expect(typeof events[0]!.durationMs).toBe('number');
    expect(events[0]!.durationMs).toBeGreaterThanOrEqual(0);
    s.dispose();
  });

  it('event has numeric timestamp', () => {
    const s = makeSheet();
    const events: MutationTraceEvent[] = [];
    s.setMutationTraceHook((e) => events.push(e));
    const before = Date.now();
    s.setCell(1, 1, 1);
    const after = Date.now();
    expect(events[0]!.timestamp).toBeGreaterThanOrEqual(before);
    expect(events[0]!.timestamp).toBeLessThanOrEqual(after + 5);
    s.dispose();
  });

  it('hook throwing does not crash SDK', () => {
    const s = makeSheet();
    s.setMutationTraceHook(() => { throw new Error('hook crash'); });
    expect(() => s.setCell(1, 1, 'safe')).not.toThrow();
    expect(s.getCellValue(1, 1)).toBe('safe');
    s.dispose();
  });
});

// ---------------------------------------------------------------------------
// §14  Trace hook cleared
// ---------------------------------------------------------------------------

describe('§14 setMutationTraceHook(null) removes the hook', () => {
  it('stops firing after null', () => {
    const s = makeSheet();
    const events: MutationTraceEvent[] = [];
    s.setMutationTraceHook((e) => events.push(e));
    s.setCell(1, 1, 1);
    s.setMutationTraceHook(null);
    s.setCell(1, 1, 2);
    expect(events).toHaveLength(1);   // only the first write fired the hook
    s.dispose();
  });

  it('can be re-attached after null', () => {
    const s = makeSheet();
    const events: MutationTraceEvent[] = [];
    s.setMutationTraceHook((e) => events.push(e));
    s.setCell(1, 1, 1);
    s.setMutationTraceHook(null);
    s.setCell(1, 1, 2);
    s.setMutationTraceHook((e) => events.push(e));
    s.setCell(1, 1, 3);
    expect(events).toHaveLength(2);
    s.dispose();
  });

  it('setMutationTraceHook after dispose throws DisposedError', () => {
    const s = makeSheet();
    s.dispose();
    expect(() => s.setMutationTraceHook(null)).toThrow(DisposedError);
  });
});

// ---------------------------------------------------------------------------
// §15  KSM dispose — throws DisposedError (not raw Error)
// ---------------------------------------------------------------------------

describe('§15 KeyboardShortcutManager dispose guard', () => {
  it('_guard throws DisposedError after dispose()', () => {
    const s = makeSheet();
    const km = createKeyboardManager(s);
    km.dispose();
    let caught: unknown;
    try { km.resetToDefaults(); } catch (e) { caught = e; }
    expect(caught).toBeInstanceOf(DisposedError);
    s.dispose();
  });

  it('DisposedError from KSM has code DISPOSED', () => {
    const s = makeSheet();
    const km = createKeyboardManager(s);
    km.dispose();
    let caught: DisposedError | undefined;
    try { km.resetToDefaults(); } catch (e) { caught = e as DisposedError; }
    expect(caught!.code).toBe('DISPOSED');
    s.dispose();
  });

  it('DisposedError from KSM is instanceof SdkError', () => {
    const s = makeSheet();
    const km = createKeyboardManager(s);
    km.dispose();
    let caught: unknown;
    try { km.unbind('ctrl+z'); } catch (e) { caught = e; }
    expect(caught).toBeInstanceOf(SdkError);
    s.dispose();
  });

  it('DisposedError message names KeyboardShortcutManager', () => {
    const s = makeSheet();
    const km = createKeyboardManager(s);
    km.dispose();
    let caught: DisposedError | undefined;
    try { km.bind('ctrl+b', () => {}); } catch (e) { caught = e as DisposedError; }
    expect(caught!.message).toMatch(/KeyboardShortcutManager/);
    s.dispose();
  });
});

// ---------------------------------------------------------------------------
// §16  Exports — all new error classes via sdk/index
// ---------------------------------------------------------------------------

describe('§16 sdk/index exports', () => {
  it('exports ValidationError class', () => {
    expect(ValidationError).toBeDefined();
    expect(typeof ValidationError).toBe('function');
  });

  it('exports PatchRecorderError class', () => {
    expect(PatchRecorderError).toBeDefined();
    expect(typeof PatchRecorderError).toBe('function');
  });

  it('exports UndoError class', () => {
    expect(UndoError).toBeDefined();
    expect(typeof UndoError).toBe('function');
  });

  it('MutationTraceHook type is usable (compile-time check)', () => {
    const hook: MutationTraceHook = (_e: MutationTraceEvent) => { /* noop */ };
    expect(typeof hook).toBe('function');
  });
});
