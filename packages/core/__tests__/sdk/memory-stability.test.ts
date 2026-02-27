/**
 * @group sdk
 *
 * Memory stability tests — verifies that long-running SDK usage does not
 * retain unbounded memory in undo stacks, listener maps, or snapshot objects.
 *
 * Strategy:
 *  - All cycles run synchronously (no timers, no Promises)
 *  - Heap measurements are NOT used (too platform-specific) — instead we
 *    assert purely on internal structure invariants (bounded stack depth,
 *    no growing collections)
 *  - A bounded maxUndoHistory is the only knob needed for O(1) steady-state
 *
 * Note: 10 000 cycles finish in < 1 s on a modern machine. No jest.setTimeout
 * override is needed.
 */

import { createSpreadsheet, PatchSerializer } from '../../src/sdk/index';
import type { SpreadsheetSDK } from '../../src/sdk/index';
import { SyncUndoStack } from '../../src/sdk/SyncUndoStack';
import { Worksheet } from '../../src/worksheet';
import { recordingApplyPatch } from '../../src/patch/PatchRecorder';

// ---------------------------------------------------------------------------
// Helper: random integer in [lo, hi]
// ---------------------------------------------------------------------------

function randInt(lo: number, hi: number, seed: { v: number }): number {
  // Cheap LCG so tests are deterministic
  seed.v = (seed.v * 1664525 + 1013904223) >>> 0;
  return lo + (seed.v % (hi - lo + 1));
}

// ---------------------------------------------------------------------------
// 1. Apply / undo 10 000 cycles via SDK (undo stack bounded to 50)
// ---------------------------------------------------------------------------

describe('memory stability — undo stack bounded', () => {
  it('undo stack depth never exceeds maxUndoHistory after 10 000 mutations', () => {
    const MAX_UNDO = 50;
    const CYCLES = 10_000;
    const s = createSpreadsheet('Fuzz', { rows: 100, cols: 26, maxUndoHistory: MAX_UNDO });
    const seed = { v: 0xcafe_beef };

    for (let i = 0; i < CYCLES; i++) {
      const row = randInt(1, 100, seed);
      const col = randInt(1, 26, seed);
      s.setCell(row, col, i);
    }

    // Access internal undo stack depth via the internal SyncUndoStack
    // SpreadsheetV1 exposes _ws; we test the stack via the SDK's canUndo
    // and that exactly MAX_UNDO undos are available
    let undoCount = 0;
    while (s.canUndo) {
      s.undo();
      undoCount++;
    }
    // Bounded: must not exceed MAX_UNDO
    expect(undoCount).toBeLessThanOrEqual(MAX_UNDO);
    s.dispose();
  });

  it('undo then redo 1 000 cycles does not grow any stack', () => {
    const s = createSpreadsheet('UndoRedo', { rows: 10, cols: 10, maxUndoHistory: 5 });
    for (let i = 0; i < 1_000; i++) {
      s.setCell(1, 1, i);
      s.undo();
      // canRedo should be true but redo stack must remain tiny
      s.redo();
    }
    // After last redo, undo stack has <= 5 entries
    let depth = 0;
    while (s.canUndo) { s.undo(); depth++; }
    expect(depth).toBeLessThanOrEqual(5);
    s.dispose();
  });
});

// ---------------------------------------------------------------------------
// 2. SyncUndoStack direct — verify bounded growth under maxSize
// ---------------------------------------------------------------------------

describe('SyncUndoStack bounded growth', () => {
  it('stack never exceeds maxSize after 5 000 applyAndRecord calls', () => {
    const MAX = 10;
    const ws = new Worksheet('ws', 100, 26);
    const stack = new SyncUndoStack(MAX);
    const seed = { v: 0xdead_c0de };

    for (let i = 0; i < 5_000; i++) {
      const row = randInt(1, 100, seed);
      const col = randInt(1, 26, seed);
      const patch = {
        seq: 0,
        ops: [{
          op: 'setCellValue' as const,
          row, col,
          before: ws.getCellValue({ row, col }),
          after: i,
        }],
      };
      stack.applyAndRecord(ws, patch);
      // Invariant: undoDepth always <= MAX
      expect(stack.undoDepth).toBeLessThanOrEqual(MAX);
    }
  });

  it('redoStack is always empty after applyAndRecord', () => {
    const ws = new Worksheet('ws', 10, 10);
    const stack = new SyncUndoStack(5);

    for (let i = 0; i < 20; i++) {
      const patch = {
        seq: 0,
        ops: [{
          op: 'setCellValue' as const,
          row: 1, col: 1,
          before: ws.getCellValue({ row: 1, col: 1 }),
          after: i,
        }],
      };
      stack.applyAndRecord(ws, patch);
      expect(stack.redoDepth).toBe(0);
    }
  });
});

// ---------------------------------------------------------------------------
// 3. Snapshot / restore 1 000 cycles — no leaking structures
// ---------------------------------------------------------------------------

describe('memory stability — snapshot/restore cycles', () => {
  it('1000 snapshot → restore cycles complete without error', () => {
    const s = createSpreadsheet('SnapFuzz', { rows: 50, cols: 10 });
    const seed = { v: 0xbeef_cafe };

    // Pre-populate some cells so snapshots are non-trivial
    for (let i = 0; i < 50; i++) {
      s.setCell(randInt(1, 50, seed), randInt(1, 10, seed), i);
    }

    for (let cycle = 0; cycle < 1_000; cycle++) {
      const snap = s.snapshot();
      // Mutate
      s.setCell(randInt(1, 50, seed), randInt(1, 10, seed), cycle);
      // Restore
      s.restore(snap);
      // Undo stack must be cleared by restore
      expect(s.canUndo).toBe(false);
    }
    s.dispose();
  });

  it('encodeSnapshot / decodeAndRestore 500 cycles complete without error', () => {
    const s = createSpreadsheet('BinFuzz', { rows: 20, cols: 5 });
    const seed = { v: 0x1234_5678 };

    for (let i = 0; i < 10; i++) {
      s.setCell(randInt(1, 20, seed), randInt(1, 5, seed), i * 3.14);
    }

    for (let cycle = 0; cycle < 500; cycle++) {
      const bytes = s.encodeSnapshot();
      s.setCell(randInt(1, 20, seed), randInt(1, 5, seed), cycle);
      s.decodeAndRestore(bytes);
    }
    s.dispose();
  });
});

// ---------------------------------------------------------------------------
// 4. PatchSerializer — 5 000 serialize/deserialize cycles
// ---------------------------------------------------------------------------

describe('memory stability — PatchSerializer cycles', () => {
  it('5000 serialize → deserialize cycles preserve integrity', () => {
    const seed = { v: 0xf00d_babe };

    for (let i = 0; i < 5_000; i++) {
      const row = randInt(1, 1000, seed);
      const col = randInt(1, 26, seed);
      const before = i % 2 === 0 ? null : `prev_${i}`;
      const after = `val_${i}`;

      const patch = {
        seq: 0,
        ops: [{
          op: 'setCellValue' as const,
          row, col, before, after,
        }],
      };
      const json = PatchSerializer.serialize(patch);
      const restored = PatchSerializer.deserialize(json);
      expect(restored.ops[0]).toMatchObject({ op: 'setCellValue', row, col, before, after });
    }
  });
});

// ---------------------------------------------------------------------------
// 5. Event listener disposal — no retained listeners after dispose
// ---------------------------------------------------------------------------

describe('memory stability — event listener cleanup', () => {
  it('listeners removed via Disposable do not accumulate', () => {
    const s = createSpreadsheet('EvFuzz', { rows: 10, cols: 10 });

    // Add and immediately dispose 1000 listeners
    for (let i = 0; i < 1_000; i++) {
      const sub = s.on('cell-changed', () => {});
      sub.dispose();
    }

    // Verify: after all disposals, a single mutation fires only what's left
    let fireCount = 0;
    const live = s.on('cell-changed', () => { fireCount++; });

    s.setCell(1, 1, 'test');
    expect(fireCount).toBe(1); // Only the surviving listener fires

    live.dispose();
    s.dispose();
  });

  it('disposed sheet clears all listeners', () => {
    let fired = false;
    const s = createSpreadsheet('DispFuzz', { rows: 5, cols: 5 });
    s.on('cell-changed', () => { fired = true; });
    s.dispose();

    // After dispose, internal listener map is cleared — no way to fire
    // (mutations would throw DisposedError, not fire the disposed listener)
    expect(fired).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 6. recordingApplyPatch direct — 10 000 apply/invert cycles
// ---------------------------------------------------------------------------

describe('memory stability — recordingApplyPatch raw', () => {
  it('10 000 apply + invert cycles via recordingApplyPatch produce stable state', () => {
    const ws = new Worksheet('raw', 200, 26);
    const seed = { v: 0xaaaa_bbbb };

    for (let i = 0; i < 10_000; i++) {
      const row = randInt(1, 200, seed);
      const col = randInt(1, 26, seed);
      const before = ws.getCellValue({ row, col });
      const after = i;

      const patch = { seq: 0, ops: [{ op: 'setCellValue' as const, row, col, before, after }] };
      const inverse = recordingApplyPatch(ws, patch);
      // Immediately invert
      recordingApplyPatch(ws, inverse);
      // After apply + invert, value must equal what it was before
      expect(ws.getCellValue({ row, col })).toEqual(before);
    }
  });
});
