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

import type { Address, ExtendedCellValue, CellStyle, SheetProtectionOptions, FreezeState, ColumnFilter, AutoFilterRange, SortKey } from '../types';

/**
 * Minimal pivot definition stored inside a CreatePivotOp.
 * Mirrors sdk/pivot.ts PivotDefinition; kept separate to avoid import cycles.
 *
 * NOTE (Phase 27): PivotCalculatedSpec contains a `compute` function and is
 * intentionally NOT included here — functions cannot round-trip through the
 * patch/undo system.  Calculated fields are available on the pure `buildPivot`
 * API directly; the SDK `createPivot` method continues to accept aggregate
 * specs only.
 */
export type PivotOpDefinition = {
  source:   { start: { row: number; col: number }; end: { row: number; col: number } };
  rows:     string[];
  values:   Array<{ field: string; aggregator: 'sum' | 'count' | 'avg'; label?: string }>;
  /** Phase 26: optional column-axis field names for cross-tabulation. */
  columns?: string[];
};

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

/**
 * Set or remove sheet-level protection; stores before/after for undo.
 * `after: null` means remove protection.
 */
export type SetSheetProtectionOp = {
  op:     'setSheetProtection';
  before: SheetProtectionOptions | null;
  after:  SheetProtectionOptions | null;
};

/**
 * Set or clear freeze-pane state; stores before/after for undo.
 * `after: null` means clear freeze panes.
 */
export type SetFreezePanesOp = {
  op:     'setFreezePanes';
  before: FreezeState | null;
  after:  FreezeState | null;
};

/**
 * Set or clear a column filter; stores before/after for undo.
 * `after: null` means remove the filter on that column.
 */
export type SetColumnFilterOp = {
  op:     'setColumnFilter';
  col:    number;
  before: ColumnFilter | null;
  after:  ColumnFilter | null;
};

/**
 * Set or clear the auto-filter range marker; stores before/after for undo.
 * `after: null` means clear the auto-filter range.
 */
export type SetAutoFilterRangeOp = {
  op:     'setAutoFilterRange';
  before: AutoFilterRange | null;
  after:  AutoFilterRange | null;
};

/**
 * Sort a rectangular range by one or more keys; stores a cell-value snapshot
 * so the operation is fully undoable.
 *
 * `snapshot[rowOffset][colOffset]` is the value at
 * `(startRow + rowOffset, startCol + colOffset)` BEFORE the sort
 * (i.e. the inverse restores these values).
 */
export type SortRangeOp = {
  op:       'sortRange';
  startRow: number;
  startCol: number;
  endRow:   number;
  endCol:   number;
  keys:     SortKey[];
  /** Pre-sort snapshot: snapshot[r][c] = value at (startRow+r, startCol+c) before sort. */
  snapshot: ExtendedCellValue[][];
};

/**
 * Write a pivot grid to a rectangular region; stores full before/after value
 * AND style snapshots so the operation is fully undoable and replay-safe.
 *
 * `beforeValues[r][c]` = value at `(targetRow+r, targetCol+c)` BEFORE the pivot.
 * `afterValues[r][c]`  = value written (header + data rows).
 * `beforeStyles[r][c]` = style at that cell before the pivot (may be undefined).
 * `afterStyles[r][c]`  = style written (records any protection lock).
 *
 * Inversion: for each cell, emit setCellValue(before) + setCellStyle(before).
 * Apply:     for each cell, emit setCellValue(after)  + setCellStyle(after).
 */
export type CreatePivotOp = {
  op:           'createPivot';
  definition:   PivotOpDefinition;
  targetRow:    number;
  targetCol:    number;
  beforeValues: ExtendedCellValue[][];
  afterValues:  ExtendedCellValue[][];
  beforeStyles: (CellStyle | undefined)[][];
  afterStyles:  (CellStyle | undefined)[][];
};

/**
 * Spill cell change — captures before/after state for one cell in a spill region.
 * Used as part of SetSpillOp to ensure atomic spill updates.
 */
export type SpillCellChange = {
  row: number;
  col: number;
  before: {
    spillSource?: { dimensions: [number, number]; endAddress: { row: number; col: number } };
    spilledFrom?: { row: number; col: number };
  };
  after: {
    spillSource?: { dimensions: [number, number]; endAddress: { row: number; col: number } };
    spilledFrom?: { row: number; col: number };
  };
};

/**
 * Set spill metadata — atomic batch operation for spill regions.
 * Captures all cells affected by a spill operation (source + spilled cells).
 * Invertible: swap before/after for each change.
 */
export type SetSpillOp = {
  op: 'setSpill';
  changes: SpillCellChange[];
};

/** Union of all operation types. */
export type PatchOp =
  | SetCellValueOp
  | ClearCellOp
  | SetCellStyleOp
  | SetSpillOp
  | MergeCellsOp
  | CancelMergeOp
  | HideRowOp
  | ShowRowOp
  | HideColOp
  | ShowColOp
  | SetSheetProtectionOp
  | SetFreezePanesOp
  | SetColumnFilterOp
  | SetAutoFilterRangeOp
  | SortRangeOp
  | CreatePivotOp;

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
      case 'setSpill':
        // Invert spill: swap before/after for each cell change
        ops.push({
          op: 'setSpill',
          changes: op.changes.map(change => ({
            row: change.row,
            col: change.col,
            before: change.after,
            after: change.before,
          })),
        });
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
      case 'setSheetProtection':
        ops.push({ op: 'setSheetProtection', before: op.after, after: op.before });
        break;
      case 'setFreezePanes':
        ops.push({ op: 'setFreezePanes', before: op.after, after: op.before });
        break;
      case 'setColumnFilter':
        ops.push({ op: 'setColumnFilter', col: op.col, before: op.after, after: op.before });
        break;
      case 'setAutoFilterRange':
        ops.push({ op: 'setAutoFilterRange', before: op.after, after: op.before });
        break;
      case 'sortRange': {
        // Inverse: restore each cell from the pre-sort snapshot.
        const invOps: PatchOp[] = [];
        for (let r = 0; r < op.snapshot.length; r++) {
          for (let c = 0; c < (op.snapshot[r]?.length ?? 0); c++) {
            invOps.push({
              op: 'setCellValue',
              row: op.startRow + r,
              col: op.startCol + c,
              before: null,
              after: op.snapshot[r]![c] ?? null,
            });
          }
        }
        ops.push(...invOps);
        break;
      }
      case 'createPivot': {
        // Inverse: restore before-values and before-styles for every written cell.
        const invOps: PatchOp[] = [];
        for (let r = 0; r < op.afterValues.length; r++) {
          for (let c = 0; c < (op.afterValues[r]?.length ?? 0); c++) {
            invOps.push({
              op:     'setCellValue',
              row:    op.targetRow + r,
              col:    op.targetCol + c,
              before: op.afterValues[r]![c]  ?? null,
              after:  op.beforeValues[r]?.[c] ?? null,
            });
            invOps.push({
              op:     'setCellStyle',
              row:    op.targetRow + r,
              col:    op.targetCol + c,
              before: op.afterStyles[r]?.[c],
              after:  op.beforeStyles[r]?.[c],
            });
          }
        }
        ops.push(...invOps);
        break;
      }
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
      case 'setSpill':
        // Apply spill changes atomically: each change updates spillSource or spilledFrom
        for (const change of op.changes) {
          const addr = { row: change.row, col: change.col };
          if (change.after.spillSource !== undefined) {
            ws.setSpillSource(addr, change.after.spillSource);
          } else if (change.before.spillSource !== undefined && change.after.spillSource === undefined) {
            ws.clearSpillSource(addr);
          }
          if (change.after.spilledFrom !== undefined) {
            ws.setSpilledFrom(addr, change.after.spilledFrom);
          } else if (change.before.spilledFrom !== undefined && change.after.spilledFrom === undefined) {
            ws.clearSpilledFrom(addr);
          }
        }
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
      case 'setSheetProtection':
        if (op.after === null) ws.unprotectSheet();
        else ws.protectSheet(op.after);
        break;
      case 'setFreezePanes':
        if (op.after === null) ws.clearFreezePanes();
        else ws.setFreezePanes(op.after.rows, op.after.cols);
        break;
      case 'setColumnFilter':
        if (op.after === null) ws.clearColumnFilter(op.col);
        else ws.setColumnFilter(op.col, op.after);
        break;
      case 'setAutoFilterRange':
        if (op.after === null) ws.clearAutoFilterRange();
        else ws.setAutoFilterRange(op.after.headerRow, op.after.startCol, op.after.endCol);
        break;
      case 'sortRange':
        ws.sortRange(
          { start: { row: op.startRow, col: op.startCol }, end: { row: op.endRow, col: op.endCol } },
          op.keys,
        );
        break;
      case 'createPivot': {
        // Re-apply pivot grid: write afterValues and afterStyles.
        for (let r = 0; r < op.afterValues.length; r++) {
          for (let c = 0; c < (op.afterValues[r]?.length ?? 0); c++) {
            const row = op.targetRow + r;
            const col = op.targetCol + c;
            ws.setCellValue({ row, col }, op.afterValues[r]![c] ?? null);
            const style = op.afterStyles[r]?.[c];
            if (style !== undefined) ws.setCellStyle({ row, col }, style);
          }
        }
        break;
      }
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
  setSheetProtection(
    before: SheetProtectionOptions | null,
    after:  SheetProtectionOptions | null,
  ): SetSheetProtectionOp {
    return { op: 'setSheetProtection', before, after };
  },
  setFreezePanes(
    before: FreezeState | null,
    after:  FreezeState | null,
  ): SetFreezePanesOp {
    return { op: 'setFreezePanes', before, after };
  },
  setColumnFilter(
    col:    number,
    before: ColumnFilter | null,
    after:  ColumnFilter | null,
  ): SetColumnFilterOp {
    return { op: 'setColumnFilter', col, before, after };
  },
  setAutoFilterRange(
    before: AutoFilterRange | null,
    after:  AutoFilterRange | null,
  ): SetAutoFilterRangeOp {
    return { op: 'setAutoFilterRange', before, after };
  },
  sortRange(
    startRow: number, startCol: number,
    endRow:   number, endCol:   number,
    keys:     SortKey[],
    snapshot: ExtendedCellValue[][],
  ): SortRangeOp {
    return { op: 'sortRange', startRow, startCol, endRow, endCol, keys, snapshot };
  },
  createPivot(
    definition:   PivotOpDefinition,
    targetRow:    number,
    targetCol:    number,
    beforeValues: ExtendedCellValue[][],
    afterValues:  ExtendedCellValue[][],
    beforeStyles: (CellStyle | undefined)[][],
    afterStyles:  (CellStyle | undefined)[][],
  ): CreatePivotOp {
    return {
      op: 'createPivot',
      definition,
      targetRow, targetCol,
      beforeValues, afterValues,
      beforeStyles, afterStyles,
    };
  },
};
