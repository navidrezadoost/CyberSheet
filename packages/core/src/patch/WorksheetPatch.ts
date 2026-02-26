/**
 * WorksheetPatch.ts — Phase 10: Delta Engine + Undo/Redo
 *
 * Defines the WorksheetPatch format: a compact, serialisable, invertible
 * description of a set of mutations to a Worksheet.
 *
 * ==========================================================================
 * DESIGN PRINCIPLES
 * ==========================================================================
 *
 * 1. INVERTIBLE — every patch carries all information needed to compute its
 *    inverse (undoPatch).  This is the foundation for undo/redo.
 *
 * 2. COMPOSABLE — patches are plain arrays of ops, so batches of operations
 *    share one history entry naturally.
 *
 * 3. TRANSPORT-SAFE — all field types are JSON-serialisable primitives.
 *    Patches can cross the Worker boundary via structured clone without
 *    any custom transfer handling.
 *
 * 4. MINIMAL — a patch contains only what changed, not a full snapshot.
 *    For a single setCellValue on a 500k-cell sheet, the patch is ~40 bytes
 *    of wire data rather than 8 MB.
 *
 * 5. DETERMINISTIC — applying the same patch to the same worksheet state
 *    always produces the same result.  There are no timestamps, random IDs,
 *    or environment-dependent fields.
 *
 * ==========================================================================
 * PATCH OPERATIONS COVERED
 * ==========================================================================
 *
 *  setCellValue   → previous value stored for undo
 *  clearCell      → previous value stored for undo
 *  setCellStyle   → previous style snapshot stored for undo
 *  mergeCells     → region stored; inverse is cancelMerge
 *  cancelMerge    → region stored; inverse is mergeCells
 *  hideRow        → row index; inverse is showRow
 *  showRow        → row index; inverse is hideRow
 *  hideCol        → col index; inverse is showCol
 *  showCol        → col index; inverse is hideCol
 *
 * ==========================================================================
 * WHAT IS NOT IN A PATCH
 * ==========================================================================
 *
 * • DAG / formula dependency registrations — these are structural, not
 *   content mutations.  They travel through snapshot rehydration, not patches.
 * • Comments, icons — deferred to a future PatchOp extension point.
 * • Column widths / row heights — layout concern, not computation concern.
 *
 * ==========================================================================
 * USAGE
 * ==========================================================================
 *
 *  // Recording (see PatchRecorder.ts)
 *  const recorder = new PatchRecorder(worksheet);
 *  recorder.start();
 *  worksheet.setCellValue(addr, 42);
 *  worksheet.hideRow(5);
 *  const patch = recorder.stop();   // WorksheetPatch describing those ops
 *
 *  // Applying
 *  applyPatch(worksheet, patch);
 *
 *  // Undoing
 *  const inverse = invertPatch(patch);
 *  applyPatch(worksheet, inverse);
 */

import type { Address, ExtendedCellValue, CellStyle } from '../types';

// ---------------------------------------------------------------------------
// Individual patch operations
// ---------------------------------------------------------------------------

/** Set a cell's value; stores `before` for undo. */
export type SetCellValueOp = {
  op:     'setCellValue';
  row:    number;
  col:    number;
  before: ExtendedCellValue;
  after:  ExtendedCellValue;
};

/** Clear a cell (set value to null); alias over setCellValue for clarity. */
export type ClearCellOp = {
  op:     'clearCell';
  row:    number;
  col:    number;
  before: ExtendedCellValue;
};

/** Change a cell's style object; stores full before/after for undo. */
export type SetCellStyleOp = {
  op:     'setCellStyle';
  row:    number;
  col:    number;
  before: CellStyle | undefined;
  after:  CellStyle | undefined;
};

/** Merge a rectangular region; inverse is cancelMergeOp. */
export type MergeCellsOp = {
  op:       'mergeCells';
  startRow: number;
  startCol: number;
  endRow:   number;
  endCol:   number;
};

/** Remove the merge covering the given anchor address; inverse is mergeCellsOp. */
export type CancelMergeOp = {
  op:       'cancelMerge';
  startRow: number;
  startCol: number;
  endRow:   number;
  endCol:   number;
};

/** Hide a row; inverse is showRowOp. */
export type HideRowOp = {
  op:  'hideRow';
  row: number;
};

/** Show (unhide) a row; inverse is hideRowOp. */
export type ShowRowOp = {
  op:  'showRow';
  row: number;
};

/** Hide a column; inverse is showColOp. */
export type HideColOp = {
  op:  'hideCol';
  col: number;
};

/** Show (unhide) a column; inverse is hideColOp. */
export type ShowColOp = {
  op:  'showCol';
  col: number;
};

/** Union of all operation types. */
export type PatchOp =
  | SetCellValueOp
  | ClearCellOp
  | SetCellStyleOp
  | MergeCellsOp
  | CancelMergeOp
  | HideRowOp
  | ShowRowOp
  | HideColOp
  | ShowColOp;

// ---------------------------------------------------------------------------
// WorksheetPatch — the top-level patch object
// ---------------------------------------------------------------------------

/**
 * A compact, invertible, transport-safe description of a set of Worksheet
 * mutations.
 *
 * `ops` is a **sequential** list: operations must be applied and inverted in
 * the order they appear in the array.
 */
export type WorksheetPatch = {
  /**
   * Monotonically increasing patch sequence number.
   * Assigned by PatchRecorder; 0 for manually constructed patches.
   */
  seq:  number;
  /** Ordered list of atomic operations in this patch. */
  ops:  PatchOp[];
};

// ---------------------------------------------------------------------------
// invertPatch — produce the inverse (undo) of a patch
// ---------------------------------------------------------------------------

/**
 * Compute the inverse of a patch.
 *
 * Applying `invertPatch(p)` to a worksheet that has already had `p` applied
 * restores the worksheet to its pre-`p` state.
 *
 * The inverse operations are placed in **reverse order**.
 *
 * @param patch   Source patch.
 * @param seq     Optional sequence number for the inverse patch (defaults to 0).
 */
export function invertPatch(patch: WorksheetPatch, seq = 0): WorksheetPatch {
  const ops: PatchOp[] = [];

  for (let i = patch.ops.length - 1; i >= 0; i--) {
    const op = patch.ops[i]!;
    switch (op.op) {
      case 'setCellValue':
        ops.push({ op: 'setCellValue', row: op.row, col: op.col, before: op.after, after: op.before });
        break;
      case 'clearCell':
        // Inverse of clearCell restores the previous value.
        ops.push({ op: 'setCellValue', row: op.row, col: op.col, before: null, after: op.before });
        break;
      case 'setCellStyle':
        ops.push({ op: 'setCellStyle', row: op.row, col: op.col, before: op.after, after: op.before });
        break;
      case 'mergeCells':
        ops.push({ op: 'cancelMerge', startRow: op.startRow, startCol: op.startCol, endRow: op.endRow, endCol: op.endCol });
        break;
      case 'cancelMerge':
        ops.push({ op: 'mergeCells', startRow: op.startRow, startCol: op.startCol, endRow: op.endRow, endCol: op.endCol });
        break;
      case 'hideRow':   ops.push({ op: 'showRow', row: op.row }); break;
      case 'showRow':   ops.push({ op: 'hideRow', row: op.row }); break;
      case 'hideCol':   ops.push({ op: 'showCol', col: op.col }); break;
      case 'showCol':   ops.push({ op: 'hideCol', col: op.col }); break;
    }
  }

  return { seq, ops };
}

// ---------------------------------------------------------------------------
// applyPatch — apply a patch to a Worksheet
// ---------------------------------------------------------------------------

import type { Worksheet } from '../worksheet';

/**
 * Apply a WorksheetPatch to a Worksheet, mutating it in-place.
 *
 * Operations are applied in sequence (patch.ops[0] first).
 * The worksheet's normal event system fires for each op.
 *
 * @throws  Re-throws any error from the Worksheet (e.g., MergeConflictError).
 *          No partial-apply rollback — callers should validate patches before
 *          applying, or use PatchUndoStack which handles rollback.
 */
export function applyPatch(ws: Worksheet, patch: WorksheetPatch): void {
  for (const op of patch.ops) {
    switch (op.op) {
      case 'setCellValue':
        ws.setCellValue({ row: op.row, col: op.col }, op.after);
        break;
      case 'clearCell':
        ws.setCellValue({ row: op.row, col: op.col }, null);
        break;
      case 'setCellStyle':
        ws.setCellStyle({ row: op.row, col: op.col }, op.after);
        break;
      case 'mergeCells':
        ws.mergeCells({
          start: { row: op.startRow, col: op.startCol },
          end:   { row: op.endRow,   col: op.endCol   },
        });
        break;
      case 'cancelMerge':
        ws.cancelMerge({
          start: { row: op.startRow, col: op.startCol },
          end:   { row: op.endRow,   col: op.endCol   },
        });
        break;
      case 'hideRow':  ws.hideRow(op.row); break;
      case 'showRow':  ws.showRow(op.row); break;
      case 'hideCol':  ws.hideCol(op.col); break;
      case 'showCol':  ws.showCol(op.col); break;
    }
  }
}

// ---------------------------------------------------------------------------
// Convenience constructors for individual PatchOp creation
// ---------------------------------------------------------------------------

/**
 * Create individual PatchOp objects without needing to construct a full
 * WorksheetPatch manually. Useful for PatchRecorder internals.
 */
export const PatchOps = {
  setCellValue(row: number, col: number, before: ExtendedCellValue, after: ExtendedCellValue): SetCellValueOp {
    return { op: 'setCellValue', row, col, before, after };
  },
  clearCell(row: number, col: number, before: ExtendedCellValue): ClearCellOp {
    return { op: 'clearCell', row, col, before };
  },
  setCellStyle(row: number, col: number, before: CellStyle | undefined, after: CellStyle | undefined): SetCellStyleOp {
    return { op: 'setCellStyle', row, col, before, after };
  },
  mergeCells(startRow: number, startCol: number, endRow: number, endCol: number): MergeCellsOp {
    return { op: 'mergeCells', startRow, startCol, endRow, endCol };
  },
  cancelMerge(startRow: number, startCol: number, endRow: number, endCol: number): CancelMergeOp {
    return { op: 'cancelMerge', startRow, startCol, endRow, endCol };
  },
  hideRow(row: number): HideRowOp { return { op: 'hideRow', row }; },
  showRow(row: number): ShowRowOp { return { op: 'showRow', row }; },
  hideCol(col: number): HideColOp { return { op: 'hideCol', col }; },
  showCol(col: number): ShowColOp { return { op: 'showCol', col }; },
};
