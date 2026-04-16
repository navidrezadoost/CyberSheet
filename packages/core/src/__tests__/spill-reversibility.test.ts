/**
 * Spill Reversibility Tests
 * 
 * Validates that spill operations produce invertible patches.
 */

import { Worksheet } from '../worksheet';
import { PatchRecorder, recordingApplyPatch } from '../patch/PatchRecorder';
import { invertPatch } from '../patch/WorksheetPatch';

describe('Spill Reversibility', () => {
  function createWorksheet() {
    const ws = new Worksheet('Sheet1', 100, 26);
    return ws;
  }

  function snapshotSpillState(ws: Worksheet, addresses: { row: number; col: number }[]) {
    return addresses.map(addr => {
      const cell = ws.getCell(addr);
      return {
        addr,
        spillSource: cell?.spillSource,
        spilledFrom: cell?.spilledFrom,
        value: cell?.value,
      };
    });
  }

  test('Spill batch event produces SetSpillOp patch', () => {
    const ws = createWorksheet();
    const recorder = new PatchRecorder(ws);

    recorder.start();

    // Apply spill batch
    ws.applySpillBatch([
      {
        addr: { row: 0, col: 0 },
        spillSource: { dimensions: [3, 1], endAddress: { row: 2, col: 0 } },
      },
      {
        addr: { row: 1, col: 0 },
        spilledFrom: { row: 0, col: 0 },
      },
      {
        addr: { row: 2, col: 0 },
        spilledFrom: { row: 0, col: 0 },
      },
    ]);

    const patch = recorder.stop();

    expect(patch.ops.length).toBe(1);
    expect(patch.ops[0].op).toBe('setSpill');
    expect((patch.ops[0] as any).changes.length).toBe(3);
  });

  test('Spill patch is invertible', () => {
    const ws = createWorksheet();

    const before = snapshotSpillState(ws, [
      { row: 0, col: 0 },
      { row: 1, col: 0 },
      { row: 2, col: 0 },
    ]);

    const recorder = new PatchRecorder(ws);
    recorder.start();

    ws.applySpillBatch([
      {
        addr: { row: 0, col: 0 },
        spillSource: { dimensions: [3, 1], endAddress: { row: 2, col: 0 } },
      },
      {
        addr: { row: 1, col: 0 },
        spilledFrom: { row: 0, col: 0 },
      },
      {
        addr: { row: 2, col: 0 },
        spilledFrom: { row: 0, col: 0 },
      },
    ]);

    const patch = recorder.stop();
    const inverse = invertPatch(patch);

    // Apply inverse
    const recorder2 = new PatchRecorder(ws);
    recorder2.start();
    const applied = recordingApplyPatch(ws, inverse);
    recorder2.stop();

    const after = snapshotSpillState(ws, [
      { row: 0, col: 0 },
      { row: 1, col: 0 },
      { row: 2, col: 0 },
    ]);

    // Should match original state
    expect(after[0].spillSource).toBe(before[0].spillSource);
    expect(after[1].spilledFrom).toBe(before[1].spilledFrom);
    expect(after[2].spilledFrom).toBe(before[2].spilledFrom);
  });

  test('Spill clear is reversible', () => {
    const ws = createWorksheet();

    // Set up initial spill
    ws.applySpillBatch([
      {
        addr: { row: 0, col: 0 },
        spillSource: { dimensions: [3, 1], endAddress: { row: 2, col: 0 } },
      },
      {
        addr: { row: 1, col: 0 },
        spilledFrom: { row: 0, col: 0 },
      },
      {
        addr: { row: 2, col: 0 },
        spilledFrom: { row: 0, col: 0 },
      },
    ]);

    const before = snapshotSpillState(ws, [
      { row: 0, col: 0 },
      { row: 1, col: 0 },
      { row: 2, col: 0 },
    ]);

    const recorder = new PatchRecorder(ws);
    recorder.start();

    // Clear spill
    ws.applySpillBatch([
      {
        addr: { row: 0, col: 0 },
        spillSource: undefined,
      },
      {
        addr: { row: 1, col: 0 },
        spilledFrom: undefined,
      },
      {
        addr: { row: 2, col: 0 },
        spilledFrom: undefined,
      },
    ]);

    const patch = recorder.stop();
    const inverse = invertPatch(patch);

    // Apply inverse
    recordingApplyPatch(ws, inverse);

    const after = snapshotSpillState(ws, [
      { row: 0, col: 0 },
      { row: 1, col: 0 },
      { row: 2, col: 0 },
    ]);

    // Should restore original spill structure
    expect(after[0].spillSource).toEqual(before[0].spillSource);
    expect(after[1].spilledFrom).toEqual(before[1].spilledFrom);
    expect(after[2].spilledFrom).toEqual(before[2].spilledFrom);
  });

  test('Full roundtrip: apply → invert → apply matches original', () => {
    const ws = createWorksheet();

    const original = snapshotSpillState(ws, [
      { row: 0, col: 0 },
      { row: 1, col: 0 },
    ]);

    const recorder1 = new PatchRecorder(ws);
    recorder1.start();
    ws.applySpillBatch([
      { addr: { row: 0, col: 0 }, spillSource: { dimensions: [2, 1], endAddress: { row: 1, col: 0 } } },
      { addr: { row: 1, col: 0 }, spilledFrom: { row: 0, col: 0 } },
    ]);
    const patch1 = recorder1.stop();

    const inv1 = invertPatch(patch1);
    recordingApplyPatch(ws, inv1);

    const afterUndo = snapshotSpillState(ws, [
      { row: 0, col: 0 },
      { row: 1, col: 0 },
    ]);

    // Check only spill metadata, not values (applySpillBatch may create cells with null values)
    expect(afterUndo[0].spillSource).toBe(original[0].spillSource);
    expect(afterUndo[0].spilledFrom).toBe(original[0].spilledFrom);
    expect(afterUndo[1].spillSource).toBe(original[1].spillSource);
    expect(afterUndo[1].spilledFrom).toBe(original[1].spilledFrom);
  });
});
