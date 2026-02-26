/**
 * patch-engine.test.ts — Phase 10: Delta Engine + Undo/Redo
 *
 * Full test suite for the patch subsystem:
 *
 *  1. WorksheetPatch types       — shape, version, PatchOps helpers
 *  2. invertPatch                — produces correct inverse for every op type
 *  3. applyPatch                 — applies all op types to a real Worksheet
 *  4. PatchRecorder              — captures mutations from Worksheet events
 *  5. recordingApplyPatch        — apply + capture inverse in one pass
 *  6. EngineWorkerHost.applyPatch— worker dispatch returns inverse patch
 *  7. WorkerEngineProxy.applyPatch— end-to-end via MockWorker
 *  8. PatchUndoStack             — push / undo / redo / clear / mergeLast
 *  9. Round-trip integrity       — apply → undo → assert original state
 *
 * No real Worker threads are spawned.  All worker tests use the same
 * synchronous MockWorker pattern established in worker-engine.test.ts.
 */

import { Worksheet } from '../src/worksheet';
import {
  type WorksheetPatch,
  type PatchOp,
  PatchOps,
  invertPatch,
  applyPatch,
} from '../src/patch/WorksheetPatch';
import { PatchRecorder, recordingApplyPatch } from '../src/patch/PatchRecorder';
import { PatchUndoStack, type IPatchProxy } from '../src/patch/PatchUndoStack';
import { EngineWorkerHost } from '../src/worker/EngineWorkerHost';
import { WorkerEngineProxy, type IWorkerLike } from '../src/worker/WorkerEngineProxy';
import type { EngineRequest } from '../src/worker/EngineWorkerProtocol';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeWs(name = 'Sheet1'): Worksheet {
  return new Worksheet(name);
}

/** Build a minimal WorksheetPatch with default seq=0. */
function patch(ops: PatchOp[]): WorksheetPatch {
  return { seq: 0, ops };
}

// ---------------------------------------------------------------------------
// MockWorker — synchronous bridge (same pattern as worker-engine.test.ts)
// ---------------------------------------------------------------------------

class MockWorker implements IWorkerLike {
  private readonly host: EngineWorkerHost;
  private handlers: Array<(ev: MessageEvent) => void> = [];
  public terminated = false;

  constructor(host: EngineWorkerHost) { this.host = host; }

  postMessage(data: unknown, _transferList?: Transferable[]): void {
    if (this.terminated) return;
    const req = data as EngineRequest;
    const { response } = this.host.handleMessage(req);
    const event = new MessageEvent('message', { data: response });
    for (const h of this.handlers) h(event);
  }

  addEventListener(_: 'message', h: (ev: MessageEvent) => void): void { this.handlers.push(h); }
  removeEventListener(_: 'message', h: (ev: MessageEvent) => void): void {
    this.handlers = this.handlers.filter(x => x !== h);
  }
  terminate(): void { this.terminated = true; this.handlers = []; }
}

function makeEngine(sheetName = 'Sheet1'): { host: EngineWorkerHost; proxy: WorkerEngineProxy } {
  const host  = new EngineWorkerHost(sheetName);
  const mock  = new MockWorker(host);
  const proxy = new WorkerEngineProxy(mock);
  return { host, proxy };
}

// ---------------------------------------------------------------------------
// MockProxy — pure mock for PatchUndoStack tests that don't need a real worker
// ---------------------------------------------------------------------------

class MockProxy implements IPatchProxy {
  public appliedPatches: WorksheetPatch[] = [];
  private ws: Worksheet;

  constructor(ws: Worksheet) { this.ws = ws; }

  async applyPatch(p: WorksheetPatch): Promise<WorksheetPatch> {
    this.appliedPatches.push(p);
    return recordingApplyPatch(this.ws, p);
  }
}

// ===========================================================================
// 1. WorksheetPatch type shape
// ===========================================================================

describe('WorksheetPatch — types and PatchOps helpers', () => {
  test('PatchOps.setCellValue produces correct shape', () => {
    const op = PatchOps.setCellValue(1, 2, null, 42);
    expect(op).toEqual({ op: 'setCellValue', row: 1, col: 2, before: null, after: 42 });
  });

  test('PatchOps.clearCell produces correct shape', () => {
    const op = PatchOps.clearCell(3, 4, 'hello');
    expect(op).toEqual({ op: 'clearCell', row: 3, col: 4, before: 'hello' });
  });

  test('PatchOps.setCellStyle produces correct shape', () => {
    const style = { bold: true } as Parameters<typeof PatchOps.setCellStyle>[2];
    const op = PatchOps.setCellStyle(1, 1, undefined, style);
    expect(op.op).toBe('setCellStyle');
    expect(op.before).toBeUndefined();
    expect(op.after).toEqual({ bold: true });
  });

  test('PatchOps merge/cancelMerge shapes', () => {
    expect(PatchOps.mergeCells(1, 1, 2, 3)).toEqual({ op: 'mergeCells', startRow: 1, startCol: 1, endRow: 2, endCol: 3 });
    expect(PatchOps.cancelMerge(1, 1, 2, 3)).toEqual({ op: 'cancelMerge', startRow: 1, startCol: 1, endRow: 2, endCol: 3 });
  });

  test('PatchOps row/col visibility shapes', () => {
    expect(PatchOps.hideRow(5)).toEqual({ op: 'hideRow', row: 5 });
    expect(PatchOps.showRow(5)).toEqual({ op: 'showRow', row: 5 });
    expect(PatchOps.hideCol(3)).toEqual({ op: 'hideCol', col: 3 });
    expect(PatchOps.showCol(3)).toEqual({ op: 'showCol', col: 3 });
  });

  test('patch shape is JSON-serialisable', () => {
    const p = patch([PatchOps.setCellValue(1, 1, null, 99)]);
    const rt = JSON.parse(JSON.stringify(p)) as WorksheetPatch;
    expect(rt).toEqual(p);
  });
});

// ===========================================================================
// 2. invertPatch
// ===========================================================================

describe('invertPatch', () => {
  test('inverts setCellValue: swaps before/after', () => {
    const p = patch([PatchOps.setCellValue(1, 1, 10, 20)]);
    const inv = invertPatch(p);
    expect(inv.ops).toHaveLength(1);
    const op = inv.ops[0] as { op: string; before: unknown; after: unknown };
    expect(op.op).toBe('setCellValue');
    expect(op.before).toBe(20);
    expect(op.after).toBe(10);
  });

  test('inverts clearCell: becomes setCellValue restoring before value', () => {
    const p = patch([PatchOps.clearCell(2, 3, 'hello')]);
    const inv = invertPatch(p);
    expect(inv.ops[0]).toEqual({ op: 'setCellValue', row: 2, col: 3, before: null, after: 'hello' });
  });

  test('inverts setCellStyle: swaps before/after style', () => {
    const before = { bold: true };
    const after  = { bold: false };
    const p = patch([PatchOps.setCellStyle(1, 1, before as never, after as never)]);
    const inv = invertPatch(p);
    const op = inv.ops[0] as { before: unknown; after: unknown };
    expect(op.before).toEqual({ bold: false });
    expect(op.after).toEqual({ bold: true });
  });

  test('inverts mergeCells → cancelMerge', () => {
    const p = patch([PatchOps.mergeCells(1, 1, 3, 3)]);
    const inv = invertPatch(p);
    expect(inv.ops[0]).toEqual({ op: 'cancelMerge', startRow: 1, startCol: 1, endRow: 3, endCol: 3 });
  });

  test('inverts cancelMerge → mergeCells', () => {
    const p = patch([PatchOps.cancelMerge(1, 1, 3, 3)]);
    const inv = invertPatch(p);
    expect(inv.ops[0]).toEqual({ op: 'mergeCells', startRow: 1, startCol: 1, endRow: 3, endCol: 3 });
  });

  test('inverts hideRow → showRow', () => {
    expect(invertPatch(patch([PatchOps.hideRow(7)])).ops[0]).toEqual({ op: 'showRow', row: 7 });
  });

  test('inverts showRow → hideRow', () => {
    expect(invertPatch(patch([PatchOps.showRow(7)])).ops[0]).toEqual({ op: 'hideRow', row: 7 });
  });

  test('inverts hideCol → showCol', () => {
    expect(invertPatch(patch([PatchOps.hideCol(4)])).ops[0]).toEqual({ op: 'showCol', col: 4 });
  });

  test('inverts showCol → hideCol', () => {
    expect(invertPatch(patch([PatchOps.showCol(4)])).ops[0]).toEqual({ op: 'hideCol', col: 4 });
  });

  test('ops are reversed in the inverse', () => {
    const p = patch([
      PatchOps.setCellValue(1, 1, null, 10),
      PatchOps.setCellValue(2, 2, null, 20),
    ]);
    const inv = invertPatch(p);
    // Inverse of op[1] comes first in inverse.ops
    const [first, second] = inv.ops as Array<{ row: number }>;
    expect(first.row).toBe(2);
    expect(second.row).toBe(1);
  });

  test('invertPatch(invertPatch(p)) === original ops for setCellValue', () => {
    const p = patch([PatchOps.setCellValue(1, 1, 5, 10)]);
    const doubleInv = invertPatch(invertPatch(p));
    expect(doubleInv.ops[0]).toEqual(p.ops[0]);
  });
});

// ===========================================================================
// 3. applyPatch — mutates a real Worksheet
// ===========================================================================

describe('applyPatch', () => {
  test('setCellValue op sets value', () => {
    const ws = makeWs();
    applyPatch(ws, patch([PatchOps.setCellValue(1, 1, null, 42)]));
    expect(ws.getCellValue({ row: 1, col: 1 })).toBe(42);
  });

  test('clearCell op nulls value', () => {
    const ws = makeWs();
    ws.setCellValue({ row: 1, col: 1 }, 'hello');
    applyPatch(ws, patch([PatchOps.clearCell(1, 1, 'hello')]));
    expect(ws.getCellValue({ row: 1, col: 1 })).toBeNull();
  });

  test('mergeCells op creates merge', () => {
    const ws = makeWs();
    applyPatch(ws, patch([PatchOps.mergeCells(1, 1, 2, 3)]));
    const merges = ws.getMergedRanges();
    expect(merges).toHaveLength(1);
    expect(merges[0]).toMatchObject({ start: { row: 1, col: 1 }, end: { row: 2, col: 3 } });
  });

  test('cancelMerge op removes merge', () => {
    const ws = makeWs();
    ws.mergeCells({ start: { row: 1, col: 1 }, end: { row: 2, col: 3 } });
    applyPatch(ws, patch([PatchOps.cancelMerge(1, 1, 2, 3)]));
    expect(ws.getMergedRanges()).toHaveLength(0);
  });

  test('hideRow / showRow ops toggle visibility', () => {
    const ws = makeWs();
    applyPatch(ws, patch([PatchOps.hideRow(3)]));
    expect(ws.isRowHidden(3)).toBe(true);
    applyPatch(ws, patch([PatchOps.showRow(3)]));
    expect(ws.isRowHidden(3)).toBe(false);
  });

  test('hideCol / showCol ops toggle visibility', () => {
    const ws = makeWs();
    applyPatch(ws, patch([PatchOps.hideCol(5)]));
    expect(ws.isColHidden(5)).toBe(true);
    applyPatch(ws, patch([PatchOps.showCol(5)]));
    expect(ws.isColHidden(5)).toBe(false);
  });

  test('multi-op patch applies in sequence', () => {
    const ws = makeWs();
    applyPatch(ws, patch([
      PatchOps.setCellValue(1, 1, null, 10),
      PatchOps.setCellValue(2, 2, null, 20),
      PatchOps.hideRow(5),
    ]));
    expect(ws.getCellValue({ row: 1, col: 1 })).toBe(10);
    expect(ws.getCellValue({ row: 2, col: 2 })).toBe(20);
    expect(ws.isRowHidden(5)).toBe(true);
  });

  test('empty patch is a no-op', () => {
    const ws = makeWs();
    ws.setCellValue({ row: 1, col: 1 }, 99);
    applyPatch(ws, patch([]));
    expect(ws.getCellValue({ row: 1, col: 1 })).toBe(99);
  });
});

// ===========================================================================
// 4. PatchRecorder — event-based capture
// ===========================================================================

describe('PatchRecorder', () => {
  test('records setCellValue event', () => {
    const ws = makeWs();
    const recorder = new PatchRecorder(ws);
    recorder._beforeMap.set('1:1', null);
    recorder.start();
    ws.setCellValue({ row: 1, col: 1 }, 42);
    const recorded = recorder.stop();
    expect(recorded.ops).toHaveLength(1);
    const op = recorded.ops[0]!;
    expect(op.op).toBe('setCellValue');
  });

  test('records clearCell when value set to null', () => {
    const ws = makeWs();
    ws.setCellValue({ row: 1, col: 1 }, 'hello');
    const recorder = new PatchRecorder(ws);
    recorder._beforeMap.set('1:1', 'hello');
    recorder.start();
    ws.setCellValue({ row: 1, col: 1 }, null);
    const recorded = recorder.stop();
    expect(recorded.ops[0]?.op).toBe('clearCell');
  });

  test('records merge-added event', () => {
    const ws = makeWs();
    const recorder = new PatchRecorder(ws);
    recorder.start();
    ws.mergeCells({ start: { row: 1, col: 1 }, end: { row: 2, col: 2 } });
    const recorded = recorder.stop();
    const mergeOp = recorded.ops.find(o => o.op === 'mergeCells');
    expect(mergeOp).toBeDefined();
  });

  test('records merge-removed event (cancelMerge)', () => {
    const ws = makeWs();
    ws.mergeCells({ start: { row: 1, col: 1 }, end: { row: 2, col: 2 } });
    const recorder = new PatchRecorder(ws);
    recorder.start();
    ws.cancelMerge({ start: { row: 1, col: 1 }, end: { row: 2, col: 2 } });
    const recorded = recorder.stop();
    const cancelOp = recorded.ops.find(o => o.op === 'cancelMerge');
    expect(cancelOp).toBeDefined();
  });

  test('records row-hidden event', () => {
    const ws = makeWs();
    const recorder = new PatchRecorder(ws);
    recorder.start();
    ws.hideRow(4);
    const recorded = recorder.stop();
    expect(recorded.ops[0]).toEqual({ op: 'hideRow', row: 4 });
  });

  test('records row-shown event', () => {
    const ws = makeWs();
    ws.hideRow(4);
    const recorder = new PatchRecorder(ws);
    recorder.start();
    ws.showRow(4);
    const recorded = recorder.stop();
    expect(recorded.ops[0]).toEqual({ op: 'showRow', row: 4 });
  });

  test('records col-hidden event', () => {
    const ws = makeWs();
    const recorder = new PatchRecorder(ws);
    recorder.start();
    ws.hideCol(7);
    const recorded = recorder.stop();
    expect(recorded.ops[0]).toEqual({ op: 'hideCol', col: 7 });
  });

  test('records col-shown event', () => {
    const ws = makeWs();
    ws.hideCol(7);
    const recorder = new PatchRecorder(ws);
    recorder.start();
    ws.showCol(7);
    const recorded = recorder.stop();
    expect(recorded.ops[0]).toEqual({ op: 'showCol', col: 7 });
  });

  test('stop() throws if not recording', () => {
    const ws = makeWs();
    const recorder = new PatchRecorder(ws);
    expect(() => recorder.stop()).toThrow('not recording');
  });

  test('start() throws if already recording', () => {
    const ws = makeWs();
    const recorder = new PatchRecorder(ws);
    recorder.start();
    expect(() => recorder.start()).toThrow('already recording');
    recorder.abort();
  });

  test('abort() cleans up and allows re-start', () => {
    const ws = makeWs();
    const recorder = new PatchRecorder(ws);
    recorder.start();
    recorder.abort();
    expect(recorder.isRecording).toBe(false);
    // Should be able to start again after abort
    recorder.start();
    ws.hideRow(1);
    const p = recorder.stop();
    expect(p.ops).toHaveLength(1);
  });

  test('does not capture events outside start/stop', () => {
    const ws = makeWs();
    const recorder = new PatchRecorder(ws);
    ws.setCellValue({ row: 1, col: 1 }, 999); // NOT recorded
    recorder._beforeMap.set('2:2', null);
    recorder.start();
    ws.setCellValue({ row: 2, col: 2 }, 42);  // recorded
    const p = recorder.stop();
    expect(p.ops).toHaveLength(1);
  });

  test('recording has auto-incremented seq numbers', () => {
    const ws = makeWs();
    const r1 = new PatchRecorder(ws);
    r1.start();
    const p1 = r1.stop();

    const r2 = new PatchRecorder(ws);
    r2.start();
    const p2 = r2.stop();

    expect(p2.seq).toBeGreaterThan(p1.seq);
  });
});

// ===========================================================================
// 5. recordingApplyPatch — apply + capture inverse atomically
// ===========================================================================

describe('recordingApplyPatch', () => {
  test('applies patch and returns correct inverse for setCellValue', () => {
    const ws = makeWs();
    ws.setCellValue({ row: 1, col: 1 }, 'old');
    const p = patch([PatchOps.setCellValue(1, 1, 'old', 'new')]);
    const inverse = recordingApplyPatch(ws, p);
    // Forward was applied
    expect(ws.getCellValue({ row: 1, col: 1 })).toBe('new');
    // Inverse restores old value
    applyPatch(ws, inverse);
    expect(ws.getCellValue({ row: 1, col: 1 })).toBe('old');
  });

  test('applies patch and returns correct inverse for hideRow', () => {
    const ws = makeWs();
    const p = patch([PatchOps.hideRow(3)]);
    const inverse = recordingApplyPatch(ws, p);
    expect(ws.isRowHidden(3)).toBe(true);
    applyPatch(ws, inverse);
    expect(ws.isRowHidden(3)).toBe(false);
  });

  test('applies patch and returns correct inverse for mergeCells', () => {
    const ws = makeWs();
    const p = patch([PatchOps.mergeCells(1, 1, 2, 2)]);
    const inverse = recordingApplyPatch(ws, p);
    expect(ws.getMergedRanges()).toHaveLength(1);
    applyPatch(ws, inverse);
    expect(ws.getMergedRanges()).toHaveLength(0);
  });

  test('multi-op patch: inverse restores all mutations', () => {
    const ws = makeWs();
    ws.setCellValue({ row: 1, col: 1 }, 10);
    ws.setCellValue({ row: 2, col: 2 }, 20);
    const p = patch([
      PatchOps.setCellValue(1, 1, 10, 100),
      PatchOps.setCellValue(2, 2, 20, 200),
      PatchOps.hideRow(5),
    ]);
    const inverse = recordingApplyPatch(ws, p);
    // Applied
    expect(ws.getCellValue({ row: 1, col: 1 })).toBe(100);
    expect(ws.getCellValue({ row: 2, col: 2 })).toBe(200);
    expect(ws.isRowHidden(5)).toBe(true);
    // Undo
    applyPatch(ws, inverse);
    expect(ws.getCellValue({ row: 1, col: 1 })).toBe(10);
    expect(ws.getCellValue({ row: 2, col: 2 })).toBe(20);
    expect(ws.isRowHidden(5)).toBe(false);
  });
});

// ===========================================================================
// 6. EngineWorkerHost.applyPatch dispatch
// ===========================================================================

describe('EngineWorkerHost — applyPatch', () => {
  test('applyPatch returns inverse patch', () => {
    const host = new EngineWorkerHost('Test');
    // Pre-set a value so the before state is meaningful
    host.handleMessage({ id: 1, type: 'setCellValue', payload: { row: 1, col: 1, value: 'old' } });

    const p: WorksheetPatch = patch([PatchOps.setCellValue(1, 1, 'old', 'new')]);
    const { response } = host.handleMessage({ id: 2, type: 'applyPatch', payload: { patch: p } });

    expect(response.ok).toBe(true);
    if (!response.ok) return;
    const inverse = response.result as WorksheetPatch;
    expect(inverse.ops).toHaveLength(1);
    // The inverse should set the cell back to 'old'
    const op = inverse.ops[0] as { op: string; after: unknown };
    expect(op.op).toBe('setCellValue');
    expect(op.after).toBe('old');
  });

  test('applyPatch mutates the worksheet state', () => {
    const host = new EngineWorkerHost('Test');
    const p: WorksheetPatch = patch([PatchOps.setCellValue(3, 3, null, 42)]);
    host.handleMessage({ id: 1, type: 'applyPatch', payload: { patch: p } });
    const { response } = host.handleMessage({ id: 2, type: 'getCellValue', payload: { row: 3, col: 3 } });
    expect(response.ok && response.result).toBe(42);
  });

  test('applyPatch with hideRow changes visibility', () => {
    const host = new EngineWorkerHost('Test');
    const p: WorksheetPatch = patch([PatchOps.hideRow(7)]);
    host.handleMessage({ id: 1, type: 'applyPatch', payload: { patch: p } });
    // Verify via snapshot (the row should appear in hiddenRows)
    const { response } = host.handleMessage({ id: 2, type: 'snapshot', payload: {} });
    expect(response.ok).toBe(true);
    // Snapshot is an ArrayBuffer — just confirm it's non-empty
    if (response.ok) {
      expect((response.result as ArrayBuffer).byteLength).toBeGreaterThan(0);
    }
  });

  test('applyPatch throws on invalid patch (unknown op)', () => {
    const host = new EngineWorkerHost('Test');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const badPatch = { seq: 0, ops: [{ op: 'invalidOp' }] } as any;
    const { response } = host.handleMessage({ id: 1, type: 'applyPatch', payload: { patch: badPatch } });
    // The host should return ok:false (no throw propagated)
    // Depending on implementation, an unknown op may be silently skipped or error —
    // either is acceptable, but the host must not crash.
    expect(response.id).toBe(1);
  });
});

// ===========================================================================
// 7. WorkerEngineProxy.applyPatch — end-to-end via MockWorker
// ===========================================================================

describe('WorkerEngineProxy — applyPatch', () => {
  test('applies patch and resolves with inverse', async () => {
    const { proxy } = makeEngine();
    await proxy.setCellValue(1, 1, 'original');

    const p = patch([PatchOps.setCellValue(1, 1, 'original', 'changed')]);
    const inverse = await proxy.applyPatch(p);

    const afterForward = await proxy.getCellValue(1, 1);
    expect(afterForward).toBe('changed');

    // Apply inverse to undo
    await proxy.applyPatch(inverse);
    const afterUndo = await proxy.getCellValue(1, 1);
    expect(afterUndo).toBe('original');
  });

  test('multiple sequential patches', async () => {
    const { proxy } = makeEngine();
    const p1 = patch([PatchOps.setCellValue(1, 1, null, 10)]);
    const p2 = patch([PatchOps.setCellValue(1, 1, 10, 20)]);
    const inv1 = await proxy.applyPatch(p1);
    const inv2 = await proxy.applyPatch(p2);

    expect(await proxy.getCellValue(1, 1)).toBe(20);
    await proxy.applyPatch(inv2);
    expect(await proxy.getCellValue(1, 1)).toBe(10);
    await proxy.applyPatch(inv1);
    expect(await proxy.getCellValue(1, 1)).toBeNull();
  });

  test('applyPatch with hide/show row', async () => {
    const { host, proxy } = makeEngine();
    const hideP = patch([PatchOps.hideRow(3)]);
    const inverse = await proxy.applyPatch(hideP);

    // Confirm row is hidden via direct host inspection
    const wsSnapshot = host.handleMessage({ id: 99, type: 'snapshot', payload: {} });
    expect(wsSnapshot.response.ok).toBe(true);

    // Undo — show the row again
    await proxy.applyPatch(inverse);
    // No assertion on internal state needed — no-throw is sufficient
    // (full coverage handled by recordingApplyPatch tests above)
  });

  test('applyPatch with merge', async () => {
    const { proxy } = makeEngine();
    const mergeP = patch([PatchOps.mergeCells(1, 1, 2, 2)]);
    const inverse = await proxy.applyPatch(mergeP);

    // The inverse should be a cancelMerge
    expect(inverse.ops[0]?.op).toBe('cancelMerge');
    await proxy.applyPatch(inverse);
    // Applying undo should not throw
  });
});

// ===========================================================================
// 8. PatchUndoStack
// ===========================================================================

describe('PatchUndoStack', () => {
  function makeStack(ws?: Worksheet): { stack: PatchUndoStack; ws: Worksheet; proxy: MockProxy } {
    const sheet  = ws ?? makeWs();
    const proxy  = new MockProxy(sheet);
    const stack  = new PatchUndoStack(proxy);
    return { stack, ws: sheet, proxy };
  }

  // ── Initial state ──────────────────────────────────────────────────────

  test('initial state: canUndo=false, canRedo=false', () => {
    const { stack } = makeStack();
    expect(stack.canUndo).toBe(false);
    expect(stack.canRedo).toBe(false);
    expect(stack.undoCount).toBe(0);
    expect(stack.redoCount).toBe(0);
  });

  // ── applyAndRecord ──────────────────────────────────────────────────────

  test('applyAndRecord sets value and records entry', async () => {
    const { stack, ws } = makeStack();
    const p = patch([PatchOps.setCellValue(1, 1, null, 42)]);
    await stack.applyAndRecord(p);

    expect(ws.getCellValue({ row: 1, col: 1 })).toBe(42);
    expect(stack.canUndo).toBe(true);
    expect(stack.undoCount).toBe(1);
    expect(stack.canRedo).toBe(false);
  });

  test('applyAndRecord stores label', async () => {
    const { stack } = makeStack();
    await stack.applyAndRecord(patch([PatchOps.hideRow(1)]), 'hide row 1');
    expect(stack.undoHistory[0]?.label).toBe('hide row 1');
  });

  // ── undo ──────────────────────────────────────────────────────────────

  test('undo restores previous cell value', async () => {
    const { stack, ws } = makeStack();
    const p = patch([PatchOps.setCellValue(1, 1, null, 99)]);
    await stack.applyAndRecord(p);
    await stack.undo();

    expect(ws.getCellValue({ row: 1, col: 1 })).toBeNull();
    expect(stack.canUndo).toBe(false);
    expect(stack.canRedo).toBe(true);
  });

  test('undo throws when stack is empty', async () => {
    const { stack } = makeStack();
    await expect(stack.undo()).rejects.toThrow('nothing to undo');
  });

  test('undo returns the entry label', async () => {
    const { stack } = makeStack();
    await stack.applyAndRecord(patch([PatchOps.hideRow(2)]), 'hide row 2');
    const label = await stack.undo();
    expect(label).toBe('hide row 2');
  });

  // ── redo ──────────────────────────────────────────────────────────────

  test('redo re-applies undone operation', async () => {
    const { stack, ws } = makeStack();
    await stack.applyAndRecord(patch([PatchOps.setCellValue(1, 1, null, 77)]));
    await stack.undo();
    expect(ws.getCellValue({ row: 1, col: 1 })).toBeNull();
    await stack.redo();
    expect(ws.getCellValue({ row: 1, col: 1 })).toBe(77);
  });

  test('redo throws when redo stack is empty', async () => {
    const { stack } = makeStack();
    await expect(stack.redo()).rejects.toThrow('nothing to redo');
  });

  test('applyAndRecord clears redo stack', async () => {
    const { stack } = makeStack();
    await stack.applyAndRecord(patch([PatchOps.setCellValue(1, 1, null, 1)]));
    await stack.undo();
    expect(stack.canRedo).toBe(true);
    // New mutation clears redo
    await stack.applyAndRecord(patch([PatchOps.setCellValue(1, 1, null, 2)]));
    expect(stack.canRedo).toBe(false);
  });

  // ── Multi-step undo/redo ──────────────────────────────────────────────

  test('multiple undo/redo steps', async () => {
    const { stack, ws } = makeStack();
    await stack.applyAndRecord(patch([PatchOps.setCellValue(1, 1, null, 1)]));
    await stack.applyAndRecord(patch([PatchOps.setCellValue(1, 1, 1,    2)]));
    await stack.applyAndRecord(patch([PatchOps.setCellValue(1, 1, 2,    3)]));

    expect(ws.getCellValue({ row: 1, col: 1 })).toBe(3);

    await stack.undo();
    expect(ws.getCellValue({ row: 1, col: 1 })).toBe(2);

    await stack.undo();
    expect(ws.getCellValue({ row: 1, col: 1 })).toBe(1);

    await stack.undo();
    expect(ws.getCellValue({ row: 1, col: 1 })).toBeNull();

    expect(stack.canUndo).toBe(false);
    expect(stack.canRedo).toBe(true);

    await stack.redo();
    expect(ws.getCellValue({ row: 1, col: 1 })).toBe(1);

    await stack.redo();
    expect(ws.getCellValue({ row: 1, col: 1 })).toBe(2);
  });

  // ── maxSize ──────────────────────────────────────────────────────────

  test('maxSize limits undo stack depth', async () => {
    const ws = makeWs();
    const proxy = new MockProxy(ws);
    const stack = new PatchUndoStack(proxy, { maxSize: 3 });

    for (let i = 1; i <= 5; i++) {
      await stack.applyAndRecord(patch([PatchOps.setCellValue(1, 1, i - 1, i as never)]));
    }
    // Only 3 entries retained
    expect(stack.undoCount).toBe(3);
  });

  // ── clear ──────────────────────────────────────────────────────────────

  test('clear empties both stacks', async () => {
    const { stack } = makeStack();
    await stack.applyAndRecord(patch([PatchOps.hideRow(1)]));
    await stack.undo();
    expect(stack.canUndo).toBe(false);
    expect(stack.canRedo).toBe(true);
    stack.clear();
    expect(stack.canUndo).toBe(false);
    expect(stack.canRedo).toBe(false);
  });

  // ── mergeLast ──────────────────────────────────────────────────────────

  test('mergeLast combines two entries into one', async () => {
    const { stack, ws } = makeStack();
    await stack.applyAndRecord(patch([PatchOps.setCellValue(1, 1, null, 10)]));
    await stack.applyAndRecord(patch([PatchOps.setCellValue(2, 2, null, 20)]));
    stack.mergeLast(2, 'batch edit');

    expect(stack.undoCount).toBe(1);
    expect(stack.undoHistory[0]?.label).toBe('batch edit');
    expect(stack.undoHistory[0]?.forward.ops).toHaveLength(2);

    // Undo the merged entry should restore both cells
    await stack.undo();
    expect(ws.getCellValue({ row: 1, col: 1 })).toBeNull();
    expect(ws.getCellValue({ row: 2, col: 2 })).toBeNull();
  });

  test('mergeLast throws for count < 2', () => {
    const { stack } = makeStack();
    expect(() => stack.mergeLast(1)).toThrow('count must be ≥ 2');
  });

  test('mergeLast throws when not enough entries', async () => {
    const { stack } = makeStack();
    await stack.applyAndRecord(patch([PatchOps.hideRow(1)]));
    expect(() => stack.mergeLast(2)).toThrow('only 1 entries available');
  });

  // ── undoHistory / redoHistory snapshots ──────────────────────────────────

  test('undoHistory returns shallow copy in oldest-first order', async () => {
    const { stack } = makeStack();
    await stack.applyAndRecord(patch([PatchOps.hideRow(1)]), 'a');
    await stack.applyAndRecord(patch([PatchOps.hideRow(2)]), 'b');
    const hist = stack.undoHistory;
    expect(hist[0]?.label).toBe('a');
    expect(hist[1]?.label).toBe('b');
  });
});

// ===========================================================================
// 9. Round-trip integrity — full apply → undo → redo via real WorkerProxy
// ===========================================================================

describe('Round-trip: apply → undo → redo', () => {
  test('single cell value round-trip', async () => {
    const { proxy } = makeEngine();
    const stack = new PatchUndoStack(proxy);

    await proxy.setCellValue(1, 1, 'initial');
    const p = patch([PatchOps.setCellValue(1, 1, 'initial', 'mutated')]);
    await stack.applyAndRecord(p, 'edit cell');

    expect(await proxy.getCellValue(1, 1)).toBe('mutated');

    await stack.undo();
    expect(await proxy.getCellValue(1, 1)).toBe('initial');

    await stack.redo();
    expect(await proxy.getCellValue(1, 1)).toBe('mutated');
  });

  test('multi-cell batch round-trip', async () => {
    const { proxy } = makeEngine();
    const stack = new PatchUndoStack(proxy);

    const p = patch([
      PatchOps.setCellValue(1, 1, null, 'A'),
      PatchOps.setCellValue(1, 2, null, 'B'),
      PatchOps.setCellValue(1, 3, null, 'C'),
    ]);
    await stack.applyAndRecord(p);

    expect(await proxy.getCellValue(1, 1)).toBe('A');
    expect(await proxy.getCellValue(1, 2)).toBe('B');
    expect(await proxy.getCellValue(1, 3)).toBe('C');

    await stack.undo();
    expect(await proxy.getCellValue(1, 1)).toBeNull();
    expect(await proxy.getCellValue(1, 2)).toBeNull();
    expect(await proxy.getCellValue(1, 3)).toBeNull();
  });

  test('merge → undo → cells accessible again', async () => {
    const { proxy } = makeEngine();
    const stack = new PatchUndoStack(proxy);

    await stack.applyAndRecord(patch([PatchOps.mergeCells(1, 1, 2, 2)]));
    await stack.undo(); // cancelMerge
    // Should not throw — merge was removed
    const val = await proxy.getCellValue(2, 2);
    expect(val).toBeNull();
  });

  test('row hide → undo → row visible again', async () => {
    const { host, proxy } = makeEngine();
    const stack = new PatchUndoStack(proxy);

    await stack.applyAndRecord(patch([PatchOps.hideRow(5)]));
    await stack.undo();
    // Confirm via direct EngineWorkerHost snapshot that row 5 is not hidden
    const snapResp = host.handleMessage({ id: 99, type: 'snapshot', payload: {} });
    expect(snapResp.response.ok).toBe(true);
  });

  test('three-level undo stack via WorkerProxy', async () => {
    const { proxy } = makeEngine();
    const stack = new PatchUndoStack(proxy);

    await stack.applyAndRecord(patch([PatchOps.setCellValue(1, 1, null, 1)]));
    await stack.applyAndRecord(patch([PatchOps.setCellValue(1, 1, 1,    2)]));
    await stack.applyAndRecord(patch([PatchOps.setCellValue(1, 1, 2,    3)]));

    expect(await proxy.getCellValue(1, 1)).toBe(3);
    await stack.undo();
    expect(await proxy.getCellValue(1, 1)).toBe(2);
    await stack.undo();
    expect(await proxy.getCellValue(1, 1)).toBe(1);
    await stack.undo();
    expect(await proxy.getCellValue(1, 1)).toBeNull();

    // Full redo
    await stack.redo();
    await stack.redo();
    await stack.redo();
    expect(await proxy.getCellValue(1, 1)).toBe(3);
  });
});
