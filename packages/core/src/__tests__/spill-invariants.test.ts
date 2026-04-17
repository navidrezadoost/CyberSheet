/**
 * spill-invariants.test.ts
 *
 * Pressure-tests the 3 correctness invariants identified as the remaining
 * high-risk edges even after full spill-reversibility is in place:
 *
 *   1. Interleaved Mutation Ordering (value + spill in same transaction)
 *   2. Multi-patch Stability: spill survives a follow-up mutation + undo/redo
 *   3. Partial Spill Disruption: editing inside a spill invalidates correctly
 *
 * Design principle  — "State Equivalence Under Inversion":
 *   apply(ops) ∘ invert(ops) === identity
 *
 * These tests verify not just "undo works visually" but that the state is
 * mathematically identical after any inversion sequence.
 *
 * All tests operate at the Worksheet + SpillEngine + PatchRecorder level —
 * the same layer as spill-reversibility.test.ts — so they exercise the
 * actual patch ordering and inversion logic end-to-end.
 */

import { Worksheet } from '../worksheet';
import { SpillEngine } from '../SpillEngine';
import { PatchRecorder, recordingApplyPatch } from '../patch/PatchRecorder';
import { invertPatch, applyPatch, type WorksheetPatch } from '../patch/WorksheetPatch';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeWs(): Worksheet {
  return new Worksheet('Sheet1', 100, 26);
}

/** Full state snapshot: value + spill metadata for a list of addresses. */
function snapshot(ws: Worksheet, addrs: Array<{ row: number; col: number }>) {
  return addrs.map(addr => {
    const cell = ws.getCell(addr);
    return {
      addr,
      value:       cell?.value       ?? null,
      spillSource: cell?.spillSource  ?? null,
      spilledFrom: cell?.spilledFrom  ?? null,
    };
  });
}

/** Assert two snapshots are deeply equal. */
function expectSameSnapshot(
  a: ReturnType<typeof snapshot>,
  b: ReturnType<typeof snapshot>,
  label = '',
) {
  expect(a).toEqual(b);
}

// Sentinel addresses
const A1 = { row: 0, col: 0 };
const A2 = { row: 1, col: 0 };
const A3 = { row: 2, col: 0 };
const A4 = { row: 3, col: 0 };

const WATCHED = [A1, A2, A3, A4];

// ---------------------------------------------------------------------------
// Invariant 1 — Interleaved Mutation Ordering
//
// Risk: If PatchRecorder does not preserve strict chronological order,
//       inversion will restore spill AFTER restoring value, leaving orphan
//       spilledFrom references on cells whose values were already cleared.
//
// What we verify:
//   a) Patch ops are produced in strict insertion order.
//   b) invertPatch reverses that order (stack discipline).
//   c) undo → redo reproduces the exact pre-undo snapshot.
// ---------------------------------------------------------------------------

describe('Invariant 1 — Interleaved Mutation Ordering (value + spill)', () => {
  test('patch ops preserve strict chronological order', () => {
    const ws   = makeWs();
    const se   = new SpillEngine();
    const rec  = new PatchRecorder(ws);

    rec.start();

    // Op sequence inside a single logical transaction:
    //   a. setCellValue on A1 (first)
    //   b. applySpill on A1 producing spillSource + spilledFrom on A2, A3 (second)
    ws.setCellValue(A1, 10);
    se.applySpill(ws, A1, [10, 20, 30]);

    const patch = rec.stop();

    // setCellValue ops come first (before setSpill) — chronological order
    const valueOps = patch.ops.filter(o => o.op === 'setCellValue' || o.op === 'clearCell');
    const spillOps = patch.ops.filter(o => o.op === 'setSpill');

    expect(valueOps.length).toBeGreaterThan(0);
    expect(spillOps.length).toBeGreaterThan(0);

    // All spill ops must come AFTER the last value op that set up the source —
    // verify by checking index ordering in the ops array.
    const lastValueIdx = Math.max(...patch.ops.map((o, i) => (o.op === 'setCellValue' ? i : -1)));
    const firstSpillIdx = patch.ops.findIndex(o => o.op === 'setSpill');

    // setSpill recorded after setCellValue (chronological)
    expect(firstSpillIdx).toBeGreaterThan(lastValueIdx);
  });

  test('inversion reverses op order (stack discipline)', () => {
    const ws  = makeWs();
    const se  = new SpillEngine();
    const rec = new PatchRecorder(ws);

    rec.start();
    ws.setCellValue(A1, 99);
    se.applySpill(ws, A1, [99, 88, 77]);
    const forward = rec.stop();

    const inverse = invertPatch(forward);

    // Inverse ops must be in reverse order of forward ops
    // (inversion = reversal + each op inverted)
    expect(inverse.ops.length).toBe(forward.ops.length);

    // The LAST forward op (setSpill) becomes the FIRST inverse op
    const firstInverseOp = inverse.ops[0];
    expect(firstInverseOp.op).toBe('setSpill');
  });

  test('undo → redo roundtrip is a perfect identity', () => {
    const ws  = makeWs();
    const se  = new SpillEngine();

    // ── baseline ─────────────────────────────────────────────────────────
    const base = snapshot(ws, WATCHED);

    // ── apply transaction ─────────────────────────────────────────────────
    const rec = new PatchRecorder(ws);
    rec.start();
    ws.setCellValue(A1, 42);
    se.applySpill(ws, A1, [42, 43, 44]);
    const forward = rec.stop();

    const afterApply = snapshot(ws, WATCHED);
    expect(afterApply[0].value).toBe(42);
    expect(afterApply[1].spilledFrom).toEqual(A1);
    expect(afterApply[2].spilledFrom).toEqual(A1);

    // ── undo ─────────────────────────────────────────────────────────────
    const inverse = invertPatch(forward);
    recordingApplyPatch(ws, inverse);

    expectSameSnapshot(snapshot(ws, WATCHED), base, 'after undo');

    // ── redo ─────────────────────────────────────────────────────────────
    recordingApplyPatch(ws, forward);

    expectSameSnapshot(snapshot(ws, WATCHED), afterApply, 'after redo');
  });

  test('interleaved spill+value in one patch: undo matches pre-transaction state', () => {
    const ws  = makeWs();
    const se  = new SpillEngine();

    const base = snapshot(ws, WATCHED);

    // Simulate: "set A1=formula, A2=manual" in one logical transaction
    const rec = new PatchRecorder(ws);
    rec.start();

    // 1. Spill first (formula result)
    se.applySpill(ws, A1, [1, 2, 3]);
    // 2. Then override A2 value (user typed in A2 while formula was pending)
    ws.setCellValue(A2, 'X');

    const forward = rec.stop();

    // Undo everything
    const inverse = invertPatch(forward);
    recordingApplyPatch(ws, inverse);

    // Must be back to clean slate
    expectSameSnapshot(snapshot(ws, WATCHED), base, 'full undo of interleaved ops');
  });
});

// ---------------------------------------------------------------------------
// Invariant 2 — Multi-patch Stability (spill survives follow-up mutation)
//
// Risk: The second mutation (e.g. "insert row" or "edit neighbour") may
//       leave orphan spilledFrom references if the spill metadata is not
//       re-captured correctly in the second patch's before-state.
//
// What we verify:
//   - Two sequential patches (spill + follow-up value write) are each
//     correctly recorded and independently invertible.
//   - Undoing patch2 then patch1 returns to the original state.
//   - Redoing patch1 then patch2 returns to the post-both-patches state.
// ---------------------------------------------------------------------------

describe('Invariant 2 — Multi-patch Stability (spill + follow-up mutation)', () => {
  test('two-patch sequence: undo undo redo redo is a perfect roundtrip', () => {
    const ws = makeWs();
    const se = new SpillEngine();

    const state0 = snapshot(ws, WATCHED);

    // ── Patch 1: apply spill ──────────────────────────────────────────────
    const rec1 = new PatchRecorder(ws);
    rec1.start();
    se.applySpill(ws, A1, [10, 20, 30]);
    const patch1 = rec1.stop();
    const state1 = snapshot(ws, WATCHED);

    // ── Patch 2: overwrite A3 (below the spill source) ───────────────────
    const rec2 = new PatchRecorder(ws);
    rec2.start();
    ws.setCellValue(A4, 999);
    const patch2 = rec2.stop();
    const state2 = snapshot(ws, WATCHED);

    // ── Undo patch2 ──────────────────────────────────────────────────────
    recordingApplyPatch(ws, invertPatch(patch2));
    expectSameSnapshot(snapshot(ws, WATCHED), state1, 'after undo patch2');

    // ── Undo patch1 ──────────────────────────────────────────────────────
    recordingApplyPatch(ws, invertPatch(patch1));
    expectSameSnapshot(snapshot(ws, WATCHED), state0, 'after undo patch1');

    // ── Redo patch1 ──────────────────────────────────────────────────────
    recordingApplyPatch(ws, patch1);
    expectSameSnapshot(snapshot(ws, WATCHED), state1, 'after redo patch1');

    // ── Redo patch2 ──────────────────────────────────────────────────────
    recordingApplyPatch(ws, patch2);
    expectSameSnapshot(snapshot(ws, WATCHED), state2, 'after redo patch2');
  });

  test('spill metadata is preserved across an unrelated value write', () => {
    const ws = makeWs();
    const se = new SpillEngine();

    // Apply spill
    se.applySpill(ws, A1, [10, 20, 30]);

    // Record the spill state
    const spillState = snapshot(ws, [A1, A2, A3]);

    // Apply an unrelated write to a different cell
    const rec = new PatchRecorder(ws);
    rec.start();
    ws.setCellValue(A4, 'unrelated');
    const patch = rec.stop();

    // Spill metadata must be unchanged
    expectSameSnapshot(snapshot(ws, [A1, A2, A3]), spillState, 'spill intact after unrelated write');

    // Undo the unrelated write
    recordingApplyPatch(ws, invertPatch(patch));

    // Spill metadata must still be intact
    expectSameSnapshot(snapshot(ws, [A1, A2, A3]), spillState, 'spill intact after undo');
  });

  test('spill + value in second patch: before-state is captured correctly', () => {
    const ws = makeWs();
    const se = new SpillEngine();

    // Patch 1: spill A1
    const rec1 = new PatchRecorder(ws);
    rec1.start();
    se.applySpill(ws, A1, [1, 2, 3]);
    const patch1 = rec1.stop();

    const stateAfterSpill = snapshot(ws, WATCHED);

    // Patch 2: overwrite A2 (spill cell) with a manual value
    const rec2 = new PatchRecorder(ws);
    rec2.start();
    ws.setCellValue(A2, 'override');
    const patch2 = rec2.stop();

    expect(ws.getCellValue(A2)).toBe('override');

    // The patch2 before-state for A2 must be the spill value (2), not null
    const a2Op = patch2.ops.find(o => 'row' in o && (o as any).row === A2.row && (o as any).col === A2.col);
    expect(a2Op).toBeDefined();
    // before should capture the pre-override value (the spill value = 2)
    expect((a2Op as any).before).toBe(2);

    // Undo patch2 restores A2 to spill value
    recordingApplyPatch(ws, invertPatch(patch2));
    expect(ws.getCellValue(A2)).toBe(2);

    // Full state matches state-after-spill
    expectSameSnapshot(snapshot(ws, WATCHED), stateAfterSpill, 'full state restored');
  });
});

// ---------------------------------------------------------------------------
// Invariant 3 — Partial Spill Disruption
//
// Risk: A single-cell edit inside a spill range creates an inconsistent state:
//   - A1 still has spillSource (entire range)
//   - A2 now has a user value (not the spilled value)
//   - A2 still has spilledFrom = A1 → ORPHAN REFERENCE
//
// The system must:
//   Option A: Clear the entire spill (Excel-like) when any spill cell is overwritten.
//   Option B: Patch system captures per-cell before-state so undo restores correctly.
//
// What we verify (Option B, which is what the patch system provides):
//   - Overwriting A2 is captured with correct before-state (spill value).
//   - Undo restores A2 to its spill value.
//   - spilledFrom metadata on A2 survives undo if it was not changed.
// ---------------------------------------------------------------------------

describe('Invariant 3 — Partial Spill Disruption', () => {
  test('editing inside spill: before-state is spill value, undo restores it', () => {
    const ws = makeWs();
    const se = new SpillEngine();

    // Apply spill: A1=1, A2=2, A3=3
    se.applySpill(ws, A1, [1, 2, 3]);

    expect(ws.getCellValue(A1)).toBe(1);
    expect(ws.getCellValue(A2)).toBe(2);
    expect(ws.getCellValue(A3)).toBe(3);
    expect(ws.getCell(A2)?.spilledFrom).toEqual(A1);

    // User edits A2 manually
    const rec = new PatchRecorder(ws);
    rec.start();
    ws.setCellValue(A2, 'manual');
    const patch = rec.stop();

    expect(ws.getCellValue(A2)).toBe('manual');

    // Patch must capture before = 2 (spill value)
    const a2Op = patch.ops.find(o => (o as any).row === A2.row && (o as any).col === A2.col);
    expect((a2Op as any).before).toBe(2);

    // Undo → A2 should be 2 again
    recordingApplyPatch(ws, invertPatch(patch));
    expect(ws.getCellValue(A2)).toBe(2);
  });

  test('orphan spilledFrom reference is not created by a value overwrite + undo', () => {
    const ws = makeWs();
    const se = new SpillEngine();

    // Apply spill
    se.applySpill(ws, A1, [10, 20, 30]);

    const pre = snapshot(ws, [A1, A2, A3]);

    // Overwrite A2
    const rec = new PatchRecorder(ws);
    rec.start();
    ws.setCellValue(A2, 'orphan risk');
    const patch = rec.stop();

    // Undo
    recordingApplyPatch(ws, invertPatch(patch));

    // State must exactly match pre-overwrite state (including spilledFrom)
    expectSameSnapshot(snapshot(ws, [A1, A2, A3]), pre, 'no orphan after undo');
  });

  test('clear + re-spill cycle is fully reversible', () => {
    const ws = makeWs();
    const se = new SpillEngine();

    const pristine = snapshot(ws, WATCHED);

    // Patch A: apply spill
    const recA = new PatchRecorder(ws);
    recA.start();
    se.applySpill(ws, A1, [5, 6, 7]);
    const patchA = recA.stop();

    const afterSpill = snapshot(ws, WATCHED);

    // Patch B: clear spill
    const recB = new PatchRecorder(ws);
    recB.start();
    se.clearSpill(ws, A1);
    const patchB = recB.stop();

    // Undo clear (restores spill)
    recordingApplyPatch(ws, invertPatch(patchB));
    expectSameSnapshot(snapshot(ws, WATCHED), afterSpill, 'spill restored after undo clear');

    // Undo spill (restores pristine)
    recordingApplyPatch(ws, invertPatch(patchA));
    expectSameSnapshot(snapshot(ws, WATCHED), pristine, 'pristine state after undo spill');

    // Redo spill
    recordingApplyPatch(ws, patchA);
    expectSameSnapshot(snapshot(ws, WATCHED), afterSpill, 'spill restored after redo');
  });

  test('undo restores all spill cells, not just source', () => {
    const ws = makeWs();
    const se = new SpillEngine();
    const base = snapshot(ws, WATCHED);

    const rec = new PatchRecorder(ws);
    rec.start();
    se.applySpill(ws, A1, [1, 2, 3]);
    const patch = rec.stop();

    // All three cells now have spill state
    expect(ws.getCell(A1)?.spillSource).toBeDefined();
    expect(ws.getCell(A2)?.spilledFrom).toEqual(A1);
    expect(ws.getCell(A3)?.spilledFrom).toEqual(A1);

    // Undo
    recordingApplyPatch(ws, invertPatch(patch));

    // All cells restored to pristine
    expectSameSnapshot(snapshot(ws, WATCHED), base, 'all spill cells cleared on undo');
  });
});

// ---------------------------------------------------------------------------
// Invariant 4 — DependencyGraph Coupling (Recompute Safety)
//
// Risk: If graph updates are recomputed instead of patched, undo may leave
//       the graph in an inconsistent state (stale edges, phantom dependencies).
//
// What we verify:
//   - After a spill + undo cycle, the DependencyGraph's "snapshot" does not
//     contain stale predecessors or successors.
//
// NOTE: DependencyGraph is an internal member of Worksheet. We test it
//       indirectly through the observable surface: a recalc on a graph with
//       stale edges would produce the wrong value for a dependent formula.
//       Here we verify the simpler invariant that spill metadata is consistent.
// ---------------------------------------------------------------------------

describe('Invariant 4 — Graph Coupling (patch-based vs recompute-based updates)', () => {
  test('spill metadata is self-consistent after undo (no stale spilledFrom)', () => {
    const ws = makeWs();
    const se = new SpillEngine();

    // Apply a 3-cell spill
    const rec = new PatchRecorder(ws);
    rec.start();
    se.applySpill(ws, A1, [100, 200, 300]);
    const fwd = rec.stop();

    // Undo
    recordingApplyPatch(ws, invertPatch(fwd));

    // After undo: none of A1,A2,A3 should have spill metadata
    expect(ws.getCell(A1)?.spillSource).toBeUndefined();
    expect(ws.getCell(A2)?.spilledFrom).toBeUndefined();
    expect(ws.getCell(A3)?.spilledFrom).toBeUndefined();
    // Values cleared
    expect(ws.getCellValue(A2)).toBeNull();
    expect(ws.getCellValue(A3)).toBeNull();
  });

  test('re-applying spill after undo produces correct metadata (idempotent apply)', () => {
    const ws = makeWs();
    const se = new SpillEngine();

    se.applySpill(ws, A1, [1, 2, 3]);
    const expectedMeta = snapshot(ws, [A1, A2, A3]);

    // Undo + redo
    const rec = new PatchRecorder(ws);
    rec.start();
    se.clearSpill(ws, A1);
    const clearPatch = rec.stop();

    recordingApplyPatch(ws, invertPatch(clearPatch)); // restores spill

    expectSameSnapshot(snapshot(ws, [A1, A2, A3]), expectedMeta, 'metadata identical after undo-clear');
  });
});
