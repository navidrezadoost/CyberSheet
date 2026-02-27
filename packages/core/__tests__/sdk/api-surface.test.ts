/**
 * @group sdk
 *
 * API surface tests — verifies the stable public contract of SpreadsheetSDK.
 *
 * Rules for this test file:
 *  - Imports ONLY from the sdk module (no direct Worksheet/patch imports)
 *  - Tests that the interface is complete and every error path throws the
 *    correct typed class.
 *  - Includes lightweight fuzz for invalid inputs to PatchSerializer and
 *    snapshot decode.
 */

import {
  createSpreadsheet,
  PatchSerializer,
  SdkError,
  DisposedError,
  BoundsError,
  SnapshotError,
  PatchDeserializeError,
} from '../../src/sdk/index';
import type { SpreadsheetSDK, SpreadsheetOptions } from '../../src/sdk/index';

// ---------------------------------------------------------------------------
// createSpreadsheet — factory contract
// ---------------------------------------------------------------------------

describe('createSpreadsheet factory', () => {
  it('returns an object satisfying SpreadsheetSDK', () => {
    const sheet = createSpreadsheet();
    // Structural check: every property on the interface must exist
    const methods: Array<keyof SpreadsheetSDK> = [
      'name', 'setCell', 'getCell', 'getCellValue',
      'applyPatch', 'snapshot', 'restore', 'encodeSnapshot', 'decodeAndRestore',
      'undo', 'redo', 'canUndo', 'canRedo',
      'mergeCells', 'cancelMerge', 'getMergedRanges', 'isInMerge',
      'hideRow', 'showRow', 'hideCol', 'showCol',
      'isRowHidden', 'isColHidden',
      'on', 'dispose',
    ];
    for (const m of methods) {
      expect(sheet).toHaveProperty(m);
    }
    sheet.dispose();
  });

  it('defaults to Sheet1 name', () => {
    const s = createSpreadsheet();
    expect(s.name).toBe('Sheet1');
    s.dispose();
  });

  it('accepts custom name', () => {
    const s = createSpreadsheet('MySheet');
    expect(s.name).toBe('MySheet');
    s.dispose();
  });

  it('accepts options: rows, cols, maxUndoHistory', () => {
    const s = createSpreadsheet('X', { rows: 10, cols: 5, maxUndoHistory: 3 });
    expect(s.name).toBe('X');
    s.dispose();
  });
});

// ---------------------------------------------------------------------------
// setCell / getCell / getCellValue
// ---------------------------------------------------------------------------

describe('cell access', () => {
  let s: SpreadsheetSDK;
  beforeEach(() => { s = createSpreadsheet('T', { rows: 10, cols: 10 }); });
  afterEach(() => s.dispose());

  it('setCell stores a value retrievable by getCellValue', () => {
    s.setCell(1, 1, 'hello');
    expect(s.getCellValue(1, 1)).toBe('hello');
  });

  it('getCell returns undefined for empty cell', () => {
    expect(s.getCell(1, 1)).toBeUndefined();
  });

  it('getCell returns a Cell record after setCell', () => {
    s.setCell(2, 3, 99);
    const cell = s.getCell(2, 3);
    expect(cell).toBeDefined();
    expect(cell!.value).toBe(99);
  });

  it('getCellValue returns null for empty cell', () => {
    expect(s.getCellValue(1, 1)).toBeNull();
  });

  it('supports boolean values', () => {
    s.setCell(1, 1, true);
    expect(s.getCellValue(1, 1)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// BoundsError
// ---------------------------------------------------------------------------

describe('BoundsError', () => {
  let s: SpreadsheetSDK;
  beforeEach(() => { s = createSpreadsheet('B', { rows: 5, cols: 5 }); });
  afterEach(() => s.dispose());

  it('setCell throws BoundsError for row 0', () => {
    expect(() => s.setCell(0, 1, 'x')).toThrow(BoundsError);
  });

  it('setCell throws BoundsError for row > rowCount', () => {
    expect(() => s.setCell(6, 1, 'x')).toThrow(BoundsError);
  });

  it('setCell throws BoundsError for col 0', () => {
    expect(() => s.setCell(1, 0, 'x')).toThrow(BoundsError);
  });

  it('setCell throws BoundsError for col > colCount', () => {
    expect(() => s.setCell(1, 6, 'x')).toThrow(BoundsError);
  });

  it('getCell throws BoundsError out of range', () => {
    expect(() => s.getCell(0, 1)).toThrow(BoundsError);
    expect(() => s.getCell(1, 0)).toThrow(BoundsError);
  });

  it('BoundsError is a subclass of SdkError', () => {
    expect(new BoundsError('test')).toBeInstanceOf(SdkError);
  });
});

// ---------------------------------------------------------------------------
// DisposedError
// ---------------------------------------------------------------------------

describe('DisposedError', () => {
  it('all methods throw DisposedError after dispose()', () => {
    const s = createSpreadsheet();
    s.dispose();

    const calls: Array<() => unknown> = [
      () => s.setCell(1, 1, 'x'),
      () => s.getCell(1, 1),
      () => s.getCellValue(1, 1),
      () => s.applyPatch({ seq: 0, ops: [] }),
      () => s.snapshot(),
      () => s.restore({} as any),
      () => s.encodeSnapshot(),
      () => s.decodeAndRestore(new Uint8Array(0)),
      () => s.undo(),
      () => s.redo(),
      () => s.mergeCells(1, 1, 2, 2),
      () => s.cancelMerge(1, 1, 2, 2),
      () => s.getMergedRanges(),
      () => s.isInMerge(1, 1),
      () => s.hideRow(1),
      () => s.showRow(1),
      () => s.hideCol(1),
      () => s.showCol(1),
      () => s.isRowHidden(1),
      () => s.isColHidden(1),
      () => s.on('cell-changed', () => {}),
    ];

    for (const fn of calls) {
      expect(fn).toThrow(DisposedError);
    }
  });

  it('calling dispose() twice does not throw', () => {
    const s = createSpreadsheet();
    s.dispose();
    expect(() => s.dispose()).not.toThrow();
  });

  it('DisposedError is a subclass of SdkError', () => {
    expect(new DisposedError('test')).toBeInstanceOf(SdkError);
  });
});

// ---------------------------------------------------------------------------
// Undo / Redo
// ---------------------------------------------------------------------------

describe('undo/redo', () => {
  let s: SpreadsheetSDK;
  beforeEach(() => { s = createSpreadsheet('U', { rows: 10, cols: 10 }); });
  afterEach(() => s.dispose());

  it('canUndo is false initially', () => {
    expect(s.canUndo).toBe(false);
  });

  it('canRedo is false initially', () => {
    expect(s.canRedo).toBe(false);
  });

  it('canUndo becomes true after setCell', () => {
    s.setCell(1, 1, 42);
    expect(s.canUndo).toBe(true);
  });

  it('undo reverts setCell', () => {
    s.setCell(1, 1, 42);
    s.undo();
    expect(s.getCellValue(1, 1)).toBeNull();
  });

  it('redo re-applies after undo', () => {
    s.setCell(1, 1, 42);
    s.undo();
    s.redo();
    expect(s.getCellValue(1, 1)).toBe(42);
  });

  it('undo returns false when stack empty', () => {
    expect(s.undo()).toBe(false);
  });

  it('redo returns false when stack empty', () => {
    expect(s.redo()).toBe(false);
  });

  it('maxUndoHistory limits stack depth', () => {
    const limited = createSpreadsheet('L', { rows: 10, cols: 10, maxUndoHistory: 2 });
    limited.setCell(1, 1, 'a');
    limited.setCell(1, 1, 'b');
    limited.setCell(1, 1, 'c');
    // Can only undo 2 times (oldest entry was dropped)
    expect(limited.undo()).toBe(true);
    expect(limited.undo()).toBe(true);
    expect(limited.undo()).toBe(false);
    limited.dispose();
  });

  it('new setCell after undo clears redo stack', () => {
    s.setCell(1, 1, 42);
    s.undo();
    s.setCell(1, 1, 99);
    expect(s.canRedo).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Snapshot round-trip
// ---------------------------------------------------------------------------

describe('snapshot / restore', () => {
  it('snapshot → restore preserves cell values', () => {
    const s = createSpreadsheet('S', { rows: 10, cols: 10 });
    s.setCell(1, 1, 'hello');
    s.setCell(2, 3, 42);
    const snap = s.snapshot();
    s.setCell(1, 1, 'overwritten');
    s.restore(snap);
    expect(s.getCellValue(1, 1)).toBe('hello');
    expect(s.getCellValue(2, 3)).toBe(42);
    s.dispose();
  });

  it('restore clears undo/redo stack', () => {
    const s = createSpreadsheet('S', { rows: 5, cols: 5 });
    s.setCell(1, 1, 1);
    const snap = s.snapshot();
    s.setCell(1, 1, 2); // will be in undo stack
    s.restore(snap);
    expect(s.canUndo).toBe(false);
    expect(s.canRedo).toBe(false);
    s.dispose();
  });

  it('encodeSnapshot / decodeAndRestore round-trip', () => {
    const s = createSpreadsheet('E', { rows: 10, cols: 10 });
    s.setCell(1, 1, 'binary');
    s.setCell(3, 3, 777);
    const bytes = s.encodeSnapshot();
    s.setCell(1, 1, 'replaced');
    s.decodeAndRestore(bytes);
    expect(s.getCellValue(1, 1)).toBe('binary');
    expect(s.getCellValue(3, 3)).toBe(777);
    s.dispose();
  });

  it('decodeAndRestore throws SnapshotError for empty bytes', () => {
    const s = createSpreadsheet();
    expect(() => s.decodeAndRestore(new Uint8Array(0))).toThrow(SnapshotError);
    s.dispose();
  });

  it('decodeAndRestore throws SnapshotError for corrupt bytes', () => {
    const s = createSpreadsheet();
    expect(() => s.decodeAndRestore(new Uint8Array([0, 1, 2, 3, 4]))).toThrow(SnapshotError);
    s.dispose();
  });

  it('SnapshotError is a subclass of SdkError', () => {
    expect(new SnapshotError('test')).toBeInstanceOf(SdkError);
  });
});

// ---------------------------------------------------------------------------
// Merge API
// ---------------------------------------------------------------------------

describe('merge API', () => {
  let s: SpreadsheetSDK;
  beforeEach(() => { s = createSpreadsheet('M', { rows: 10, cols: 10 }); });
  afterEach(() => s.dispose());

  it('getMergedRanges is empty initially', () => {
    expect(s.getMergedRanges()).toHaveLength(0);
  });

  it('mergeCells adds a region', () => {
    s.mergeCells(1, 1, 2, 3);
    expect(s.getMergedRanges()).toHaveLength(1);
  });

  it('isInMerge returns true for anchor and inner cells', () => {
    s.mergeCells(2, 2, 4, 4);
    expect(s.isInMerge(2, 2)).toBe(true);
    expect(s.isInMerge(3, 3)).toBe(true);
  });

  it('isInMerge returns false outside merge', () => {
    s.mergeCells(2, 2, 4, 4);
    expect(s.isInMerge(5, 5)).toBe(false);
  });

  it('cancelMerge removes region', () => {
    s.mergeCells(1, 1, 3, 3);
    s.cancelMerge(1, 1, 3, 3);
    expect(s.getMergedRanges()).toHaveLength(0);
  });

  it('undo/redo works with mergeCells', () => {
    s.mergeCells(1, 1, 2, 2);
    expect(s.getMergedRanges()).toHaveLength(1);
    s.undo();
    expect(s.getMergedRanges()).toHaveLength(0);
    s.redo();
    expect(s.getMergedRanges()).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Visibility API
// ---------------------------------------------------------------------------

describe('visibility API', () => {
  let s: SpreadsheetSDK;
  beforeEach(() => { s = createSpreadsheet('V', { rows: 10, cols: 10 }); });
  afterEach(() => s.dispose());

  it('rows and cols are visible by default', () => {
    expect(s.isRowHidden(1)).toBe(false);
    expect(s.isColHidden(1)).toBe(false);
  });

  it('hideRow makes row hidden', () => {
    s.hideRow(3);
    expect(s.isRowHidden(3)).toBe(true);
  });

  it('showRow makes row visible', () => {
    s.hideRow(3);
    s.showRow(3);
    expect(s.isRowHidden(3)).toBe(false);
  });

  it('hideCol / showCol work symmetrically', () => {
    s.hideCol(5);
    expect(s.isColHidden(5)).toBe(true);
    s.showCol(5);
    expect(s.isColHidden(5)).toBe(false);
  });

  it('undo/redo works with hideRow', () => {
    s.hideRow(2);
    expect(s.isRowHidden(2)).toBe(true);
    s.undo();
    expect(s.isRowHidden(2)).toBe(false);
    s.redo();
    expect(s.isRowHidden(2)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// PatchSerializer — serialize/deserialize round-trip
// ---------------------------------------------------------------------------

describe('PatchSerializer', () => {
  it('serialize → deserialize round-trips a setCellValue patch', () => {
    const patch = {
      ops: [{
        op: 'setCellValue' as const,
        row: 1, col: 1,
        before: null,
        after: 'hello',
      }],
    };
    const json = PatchSerializer.serialize(patch);
    const restored = PatchSerializer.deserialize(json);
    // seq defaults to 0 when absent in serialized form
    expect(restored.ops).toEqual(patch.ops);
    expect(restored.seq).toBe(0);
  });

  it('serialize produces stable key order (idempotent)', () => {
    const patch = {
      ops: [{
        op: 'setCellValue' as const,
        row: 2, col: 3,
        before: null,
        after: 99,
      }],
    };
    // Build a copy with ops keys in a different insertion order
    const shuffled = {
      ops: [{
        after: 99,
        before: null,
        col: 3,
        row: 2,
        op: 'setCellValue' as const,
      }],
    };
    expect(PatchSerializer.serialize(patch)).toBe(PatchSerializer.serialize(shuffled));
  });

  it('serialize is deterministic across calls', () => {
    const patch = {
      ops: [
        { op: 'hideRow' as const, row: 5 },
        { op: 'hideCol' as const, col: 3 },
      ],
    };
    const a = PatchSerializer.serialize(patch);
    const b = PatchSerializer.serialize(patch);
    expect(a).toBe(b);
  });

  it('deserialize throws PatchDeserializeError for non-JSON', () => {
    expect(() => PatchSerializer.deserialize('not json')).toThrow(PatchDeserializeError);
  });

  it('deserialize throws PatchDeserializeError for missing ops', () => {
    expect(() => PatchSerializer.deserialize('{"seq":1}')).toThrow(PatchDeserializeError);
  });

  it('deserialize throws PatchDeserializeError for unknown op type', () => {
    const json = JSON.stringify({ ops: [{ op: 'unknownOp', row: 1, col: 1 }] });
    expect(() => PatchSerializer.deserialize(json)).toThrow(PatchDeserializeError);
  });

  it('validate returns true for valid patch', () => {
    const patch = { ops: [{ op: 'clearCell', row: 1, col: 1, before: null }] };
    expect(PatchSerializer.validate(patch)).toBe(true);
  });

  it('validate returns false for invalid input', () => {
    expect(PatchSerializer.validate(null)).toBe(false);
    expect(PatchSerializer.validate({ ops: 'bad' })).toBe(false);
    expect(PatchSerializer.validate(42)).toBe(false);
  });

  it('PatchDeserializeError exposes the input string', () => {
    const bad = 'not json at all';
    try {
      PatchSerializer.deserialize(bad);
      fail('Expected PatchDeserializeError');
    } catch (e) {
      expect(e).toBeInstanceOf(PatchDeserializeError);
      expect((e as PatchDeserializeError).input).toBe(bad);
    }
  });
});

// ---------------------------------------------------------------------------
// Fuzz: invalid inputs to PatchSerializer
// ---------------------------------------------------------------------------

describe('PatchSerializer fuzz — invalid inputs', () => {
  const invalidInputs = [
    '',
    '   ',
    'null',
    '[]',
    '{}',
    '{"ops":null}',
    '{"ops":[{"op":"setCellValue","row":-1,"col":1,"before":null,"after":1}]}',
    '{"ops":[{"op":"setCellValue","row":1.5,"col":1,"before":null,"after":1}]}',
    '{"ops":[{"op":"mergeCells","startRow":0,"startCol":1,"endRow":2,"endCol":3}]}',
    'undefined',
    '{"ops":[{"op":123}]}',
  ];

  for (const input of invalidInputs) {
    it(`rejects: ${JSON.stringify(input).slice(0, 60)}`, () => {
      expect(() => PatchSerializer.deserialize(input)).toThrow(PatchDeserializeError);
    });
  }
});

// ---------------------------------------------------------------------------
// applyPatch — direct patch application (no undo)
// ---------------------------------------------------------------------------

describe('applyPatch direct', () => {
  it('applies setCellValue and returns inverse', () => {
    const s = createSpreadsheet('P', { rows: 5, cols: 5 });
    const patch = {
      seq: 0,
      ops: [{
        op: 'setCellValue' as const,
        row: 1, col: 1,
        before: null as any,
        after: 'direct',
      }],
    };
    const inverse = s.applyPatch(patch);
    expect(s.getCellValue(1, 1)).toBe('direct');
    expect(Array.isArray(inverse.ops)).toBe(true);
    expect(inverse.ops.length).toBeGreaterThan(0);
    // Applying the inverse should undo
    s.applyPatch(inverse);
    expect(s.getCellValue(1, 1)).toBeNull();
    s.dispose();
  });
});
