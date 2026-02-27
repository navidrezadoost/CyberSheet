/**
 * SpreadsheetSDK — stable public API facade for @cyber-sheet/core.
 *
 * Design principles:
 *  - Framework-agnostic: no React/Vue/Angular imports
 *  - Synchronous: no Promises in the hot path
 *  - Minimal surface: only the operations that belong on a public contract
 *  - Typed errors: every failure mode is represented with a concrete class
 *  - Tree-shakeable: this module has no side effects
 *
 * Usage:
 *  ```ts
 *  import { createSpreadsheet } from '@cyber-sheet/core/sdk';
 *
 *  const sheet = createSpreadsheet('Sheet1');
 *  sheet.setCell(1, 1, 'Hello');
 *  sheet.setCell(1, 2, 42);
 *  const snap = sheet.snapshot();
 *  sheet.dispose();
 *  ```
 */

import { Worksheet } from '../worksheet';
import { snapshotCodec } from '../persistence/SnapshotCodec';
import type { WorksheetSnapshot } from '../persistence/SnapshotCodec';
import type { Cell, CellStyle, ExtendedCellValue, Range, Address, DataValidationRule, SheetProtectionOptions, FreezeState, ColumnFilter, SortKey, AutoFilterRange } from '../types';
import type { Disposable } from '../events';
import type { WorksheetPatch } from '../patch/WorksheetPatch';
import { SyncUndoStack } from './SyncUndoStack';
import { recordingApplyPatch } from '../patch/PatchRecorder';

// ---------------------------------------------------------------------------
// Typed errors
// ---------------------------------------------------------------------------

/** Base class for all errors originating from SpreadsheetSDK. */
export class SdkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SdkError';
  }
}

/** Thrown when a method is called after `dispose()` has been invoked. */
export class DisposedError extends SdkError {
  constructor(method: string) {
    super(`SpreadsheetSDK.${method}(): sheet has been disposed`);
    this.name = 'DisposedError';
  }
}

/** Thrown when a row or column index is out of range. */
export class BoundsError extends SdkError {
  constructor(detail: string) {
    super(`SpreadsheetSDK bounds violation: ${detail}`);
    this.name = 'BoundsError';
  }
}

/** Thrown when a snapshot operation fails (unknown version, corrupt bytes, etc.). */
export class SnapshotError extends SdkError {
  constructor(message: string, public readonly cause?: unknown) {
    super(`SnapshotError: ${message}`);
    this.name = 'SnapshotError';
  }
}

/**
 * Thrown when a merge operation is rejected due to a conflict with an existing
 * merged region. Wraps the internal `MergeConflictError`.
 */
export class MergeError extends SdkError {
  constructor(message: string, public readonly cause?: unknown) {
    super(`MergeError: ${message}`);
    this.name = 'MergeError';
  }
}

/**
 * Thrown when a patch operation fails due to invalid patch structure or
 * a conflict with the current sheet state. Wraps internal errors.
 */
export class PatchError extends SdkError {
  constructor(message: string, public readonly cause?: unknown) {
    super(`PatchError: ${message}`);
    this.name = 'PatchError';
  }
}

/**
 * Thrown when a mutation is attempted on a cell that is locked and the sheet
 * is currently protected. Call `removeSheetProtection()` first, or
 * `unlockCell(row, col)` to unlock the specific cell.
 */
export class ProtectedCellError extends SdkError {
  constructor(row: number, col: number) {
    super(`SpreadsheetSDK: cell (${row}, ${col}) is protected — call removeSheetProtection() or unlockCell(${row}, ${col}) first`);
    this.name = 'ProtectedCellError';
  }
}

// ---------------------------------------------------------------------------
// SDK event types
// ---------------------------------------------------------------------------

/** All event types emitted by SpreadsheetSDK. */
export type SdkEventType =
  | 'cell-changed'
  | 'style-changed'
  | 'structure-changed'
  | 'filter-changed'
  | 'sort-applied'
  | 'cycle-detected';

/**
 * Payload emitted for SDK events.
 *
 * `structure-changed` covers merges, visibility changes, and `sheet-mutated`.
 * UI adapters should re-render their viewport on any `structure-changed`.
 */
export type SdkEvent =
  | { type: 'cell-changed';    row: number; col: number }
  | { type: 'style-changed';   row: number; col: number }
  | { type: 'structure-changed' }
  | { type: 'filter-changed';  col: number }
  | { type: 'sort-applied';    startRow: number; startCol: number; endRow: number; endCol: number }
  | { type: 'cycle-detected' };

export type SdkEventListener = (event: SdkEvent) => void;

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export type SpreadsheetOptions = {
  /**
   * Maximum number of entries in the undo/redo stack.
   * @default 100
   */
  maxUndoHistory?: number;
  /**
   * Initial row count.
   * @default 1000
   */
  rows?: number;
  /**
   * Initial column count.
   * @default 26
   */
  cols?: number;
};

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

/**
 * The stable public contract for a spreadsheet sheet.
 * All implementations must satisfy this interface exactly.
 */
export interface SpreadsheetSDK {
  // ── Metadata ─────────────────────────────────────────────────────────────
  /** The name of this sheet (set at creation time). */
  readonly name: string;

  // ── Cell access (1-based row/col) ─────────────────────────────────────────
  /**
   * Set the value of a cell.
   * Row and col are 1-based integers.
   */
  setCell(row: number, col: number, value: ExtendedCellValue): void;

  /**
   * Return the raw `Cell` record at (row, col), or `undefined` if the cell
   * has never been written.
   */
  getCell(row: number, col: number): Cell | undefined;

  /**
   * Return only the cell's value, or `null` if the cell is empty.
   */
  getCellValue(row: number, col: number): ExtendedCellValue;

  // ── Patch API ─────────────────────────────────────────────────────────────
  /**
   * Apply a `WorksheetPatch` and return the **inverse** patch.
   * The inverse can be passed back to `applyPatch` to undo the operation.
   *
   * This call **does not** push to the undo stack — use `setCell` / the
   * mutation helpers for undo-tracked mutations.
   */
  applyPatch(patch: WorksheetPatch): WorksheetPatch;

  // ── Snapshot ──────────────────────────────────────────────────────────────
  /**
   * Extract a plain-object snapshot of the entire sheet state.
   * Safe to JSON-serialize; does not reference internal mutable structures.
   */
  snapshot(): WorksheetSnapshot;

  /**
   * Replace all sheet state with the contents of a previously-captured
   * snapshot. Clears the undo/redo stack.
   * @throws SnapshotError if the snapshot is structurally invalid.
   */
  restore(snapshot: WorksheetSnapshot): void;

  /**
   * Encode the current sheet state to a compact binary buffer.
   * Format: CSEX magic bytes + u16 version + LZ4-compressed JSON.
   */
  encodeSnapshot(): Uint8Array;

  /**
   * Decode a binary snapshot buffer and restore the sheet state.
   * @throws SnapshotError if decoding fails or the version is unknown.
   */
  decodeAndRestore(bytes: Uint8Array): void;

  // ── Undo / Redo ───────────────────────────────────────────────────────────
  /** Undo the last tracked mutation. Returns `true` if an entry was undone. */
  undo(): boolean;
  /** Redo the last undone mutation. Returns `true` if an entry was redone. */
  redo(): boolean;
  /** Whether there is anything to undo. */
  readonly canUndo: boolean;
  /** Whether there is anything to redo. */
  readonly canRedo: boolean;

  // ── Merge ─────────────────────────────────────────────────────────────────
  /** Merge the rectangular region from (startRow, startCol) to (endRow, endCol). */
  mergeCells(startRow: number, startCol: number, endRow: number, endCol: number): void;
  /** Remove the merge covering the given anchor address. */
  cancelMerge(startRow: number, startCol: number, endRow: number, endCol: number): void;
  /** Return all currently merged regions as Range objects ({ start, end } addresses). */
  getMergedRanges(): Range[];
  /** Return `true` if (row, col) is within any merged region. */
  isInMerge(row: number, col: number): boolean;

  // ── Row / Column visibility ───────────────────────────────────────────────
  /** Hide a row. Idempotent. */
  hideRow(row: number): void;
  /** Show a hidden row. Idempotent. */
  showRow(row: number): void;
  /** Hide a column. Idempotent. */
  hideCol(col: number): void;
  /** Show a hidden column. Idempotent. */
  showCol(col: number): void;
  /** Return `true` if the row is hidden. */
  isRowHidden(row: number): boolean;
  /** Return `true` if the column is hidden. */
  isColHidden(col: number): boolean;

  // ── Data Validation ───────────────────────────────────────────────────────
  /** Attach a validation rule to the cell at (row, col). */
  setDataValidation(row: number, col: number, rule: DataValidationRule): void;
  /** Return the validation rule for the cell, or `undefined` if none. */
  getDataValidation(row: number, col: number): DataValidationRule | undefined;
  /** Remove any validation rule from the cell at (row, col). */
  removeDataValidation(row: number, col: number): void;
  /** Return addresses of all cells that have a data-validation rule (row-major order). */
  getValidationCells(): Address[];

  // ── Sheet Protection ───────────────────────────────────────────────────────
  /**
   * Enable sheet protection. While the sheet is protected, any cell whose
   * `style.locked` is not explicitly `false` (Excel default: locked = true)
   * will reject `setCell` / `lockCell` mutations with `ProtectedCellError`.
   *
   * @param options  Optional capability overrides (e.g. `allowFormatCells`).
   */
  setSheetProtection(options?: SheetProtectionOptions): void;
  /** Remove sheet protection. This is a no-op if the sheet is not protected. */
  removeSheetProtection(): void;
  /** Return `true` if the sheet is currently protected. */
  isSheetProtected(): boolean;
  /** Return the current protection settings, or `null` if not protected. */
  getSheetProtection(): SheetProtectionOptions | null;
  /**
   * Return `true` if the cell at (row, col) would currently block mutation.
   *
   * A cell is protected when: `isSheetProtected()` is true AND
   * `cell.style?.locked !== false` (Excel default: all cells are locked).
   */
  isCellProtected(row: number, col: number): boolean;
  /**
   * Explicitly lock a single cell (sets `style.locked = true`).
   * This change is tracked on the undo stack.
   */
  lockCell(row: number, col: number): void;
  /**
   * Explicitly unlock a single cell (sets `style.locked = false`).
   * This change is tracked on the undo stack.
   */
  unlockCell(row: number, col: number): void;

  // ── Freeze Panes ──────────────────────────────────────────────────────────
  /**
   * Freeze the top `rows` rows and the left `cols` columns.
   * Passing `rows=0, cols=0` is equivalent to `clearFreezePanes()`.
   * This change is tracked on the undo stack.
   */
  setFreezePanes(rows: number, cols: number): void;
  /** Remove all frozen panes. No-op if nothing is frozen. */
  clearFreezePanes(): void;
  /** Return the current freeze-pane state, or `null` if no panes are frozen. */
  getFreezePanes(): FreezeState | null;
  // ── Column Filters ─────────────────────────────────────────────────
  /**
   * Apply a filter to a column.  This change is tracked on the undo stack.
   *
   * Supported filter types: `equals`, `notEquals`, `contains`, `notContains`,
   * `startsWith`, `endsWith`, `gt`, `gte`, `lt`, `lte`, `between`,
   * `empty`, `notEmpty`, `in`.
   */
  setFilter(col: number, filter: ColumnFilter): void;
  /** Remove the filter on a column.  No-op if no filter is active.  Undoable. */
  clearFilter(col: number): void;
  /**
   * Remove all column filters at once.  No-op if no filters are active.  Undoable
   * as a single undo entry (restores all cleared filters simultaneously).
   */
  clearAllFilters(): void;
  /** Return the current filter for a column, or `undefined` if none. */
  getFilter(col: number): ColumnFilter | undefined;
  /**
   * Return the row indices (1-based) that pass ALL currently active filters.
   * Hidden rows are included — filter visibility is independent of row hide/show.
   *
   * @param range Optional sub-range; when omitted the full sheet row range is used.
   */
  getVisibleRows(range?: Range): number[];
  /**
   * Return distinct cell values for a column, together with their occurrence counts.
   * Useful for building a filter dropdown.
   *
   * @param col         1-based column index.
   * @param visibleOnly When `true`, only rows that pass all OTHER column filters
   *                    are considered (Excel’s behaviour for filter dropdowns).
   *                    Defaults to `false`.
   */
  getDistinctValues(col: number, visibleOnly?: boolean): { value: string; count: number }[];

  // ── Auto-Filter Range ─────────────────────────────────────────────
  /**
   * Mark the row and columns that carry the filter dropdown arrows.
   * This is purely a UI marker — it does not affect filter matching.
   * The change is tracked on the undo stack.
   */
  setAutoFilterRange(headerRow: number, startCol: number, endCol: number): void;
  /** Remove the auto-filter range marker.  No-op if none is set.  Undoable. */
  clearAutoFilterRange(): void;
  /** Return the current auto-filter range, or `null` if none is set. */
  getAutoFilterRange(): AutoFilterRange | null;

  // ── Range Sort ───────────────────────────────────────────────────────
  /**
   * Sort a rectangular range by one or more sort keys.
   *
   * - Sort is stable; equal rows preserve their original order.
   * - Cells outside the range are unaffected.
   * - The operation is fully undoable (pre-sort snapshot is captured).
   * - Emits a `sort-applied` SDK event.
   *
   * @param range  1-based inclusive rectangle to sort.
   * @param keys   Primary → secondary → … sort keys.
   */
  sortRange(range: Range, keys: SortKey[]): void;
  // ── Events ────────────────────────────────────────────────────────────────
  /**
   * Subscribe to SDK events.
   * Returns a `Disposable` — call `dispose()` to unsubscribe.
   *
   * Events are dispatched **synchronously** during the mutation that caused
   * them. Listeners must not throw; errors in listeners are caught and logged.
   */
  on(event: SdkEventType, listener: SdkEventListener): Disposable;

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  /**
   * Release all internal resources (event listeners, stores).
   * After calling `dispose()`, all further method calls throw `DisposedError`.
   */
  dispose(): void;
}

// ---------------------------------------------------------------------------
// Internal implementation
// ---------------------------------------------------------------------------

/** Internal listener map type. */
type ListenerMap = Map<SdkEventType, Set<SdkEventListener>>;

class SpreadsheetV1 implements SpreadsheetSDK {
  /** Exposed only for testing infra — not part of the public interface. */
  readonly _ws: Worksheet;
  private readonly _undo: SyncUndoStack;
  private readonly _listeners: ListenerMap = new Map();
  private _disposed = false;
  private readonly _unsubscribe: Disposable;

  constructor(name: string, options: Required<SpreadsheetOptions>) {
    this._ws = new Worksheet(name, options.rows, options.cols);
    this._undo = new SyncUndoStack(options.maxUndoHistory);

    // Bridge internal SheetEvents → SdkEvents
    this._unsubscribe = this._ws.on((e) => {
      switch (e.type) {
        case 'cell-changed':
          this._emit('cell-changed', { type: 'cell-changed', row: e.address.row, col: e.address.col });
          this._emit('structure-changed', { type: 'structure-changed' });
          break;
        case 'style-changed':
          this._emit('style-changed', { type: 'style-changed', row: e.address.row, col: e.address.col });
          break;
        case 'sheet-mutated':
        case 'merge-added':
        case 'merge-removed':
        case 'row-hidden':
        case 'row-shown':
        case 'col-hidden':
        case 'col-shown':
        case 'sheet-protection-changed':
        case 'freeze-panes-changed':
        case 'autofilter-range-changed':
          this._emit('structure-changed', { type: 'structure-changed' });
          break;
        case 'filter-changed':
          this._emit('filter-changed', { type: 'filter-changed', col: e.col });
          this._emit('structure-changed', { type: 'structure-changed' });
          break;
        case 'sort-applied':
          this._emit('sort-applied', { type: 'sort-applied', startRow: e.startRow, startCol: e.startCol, endRow: e.endRow, endCol: e.endCol });
          this._emit('structure-changed', { type: 'structure-changed' });
          break;
        case 'cycle-detected':
          this._emit('cycle-detected', { type: 'cycle-detected' });
          break;
      }
    });
  }

  private _guard(method: string): void {
    if (this._disposed) throw new DisposedError(method);
  }

  private _checkBounds(row: number, col: number): void {
    if (!Number.isInteger(row) || row < 1 || row > this._ws.rowCount) {
      throw new BoundsError(`row ${row} out of range 1..${this._ws.rowCount}`);
    }
    if (!Number.isInteger(col) || col < 1 || col > this._ws.colCount) {
      throw new BoundsError(`col ${col} out of range 1..${this._ws.colCount}`);
    }
  }

  private _guardCell(row: number, col: number, method: string): void {
    if (this._ws.isSheetProtected()) {
      const cell = this._ws.getCell({ row, col });
      // Excel default: cells are locked unless explicitly set to false.
      if (cell?.style?.locked !== false) {
        throw new ProtectedCellError(row, col);
      }
    }
  }

  private _emit(type: SdkEventType, event: SdkEvent): void {
    const set = this._listeners.get(type);
    if (!set) return;
    for (const listener of set) {
      try { listener(event); } catch (err) {
        // Listeners must not throw. Log and continue so one bad listener
        // doesn't break the others.
        console.error('[SpreadsheetSDK] Uncaught error in event listener:', err);
      }
    }
  }

  /**
   * Execute `fn` and re-wrap any non-SdkError throw as a typed `SdkError`.
   * This ensures no internal implementation detail escapes the public surface.
   *
   * @param wrap  Factory that converts the raw error into a typed SdkError.
   */
  private _wrapMutation<T>(
    fn: () => T,
    wrap: (err: unknown) => SdkError,
  ): T {
    try {
      return fn();
    } catch (err) {
      if (err instanceof SdkError) throw err;
      throw wrap(err);
    }
  }

  // ── Metadata ─────────────────────────────────────────────────────────────

  get name(): string { return this._ws.name; }

  // ── Cell access ───────────────────────────────────────────────────────────

  setCell(row: number, col: number, value: ExtendedCellValue): void {
    this._guard('setCell');
    this._checkBounds(row, col);
    this._guardCell(row, col, 'setCell');
    this._wrapMutation(() => {
      const patch: WorksheetPatch = {
        seq: 0,
        ops: [{
          op: 'setCellValue' as const,
          row,
          col,
          before: this._ws.getCellValue({ row, col }),
          after: value,
        }],
      };
      this._undo.applyAndRecord(this._ws, patch);
    }, (err) => new PatchError(`setCell(${row},${col}) failed: ${(err as Error).message ?? err}`, err));
  }

  getCell(row: number, col: number): Cell | undefined {
    this._guard('getCell');
    this._checkBounds(row, col);
    return this._ws.getCell({ row, col });
  }

  getCellValue(row: number, col: number): ExtendedCellValue {
    this._guard('getCellValue');
    this._checkBounds(row, col);
    return this._ws.getCellValue({ row, col });
  }

  // ── Patch API ─────────────────────────────────────────────────────────────

  applyPatch(patch: WorksheetPatch): WorksheetPatch {
    this._guard('applyPatch');
    return this._wrapMutation(
      () => recordingApplyPatch(this._ws, patch),
      (err) => new PatchError(`applyPatch failed: ${(err as Error).message ?? err}`, err),
    );
  }

  // ── Snapshot ──────────────────────────────────────────────────────────────

  snapshot(): WorksheetSnapshot {
    this._guard('snapshot');
    // Deep-copy the snapshot so mutations on the Worksheet after this call
    // do not retroactively affect the captured state.
    // WorksheetSnapshot is a plain JSON-serializable object by contract,
    // so a JSON round-trip is the safest cross-environment deep-clone.
    return JSON.parse(JSON.stringify(this._ws.extractSnapshot())) as WorksheetSnapshot;
  }

  restore(snap: WorksheetSnapshot): void {
    this._guard('restore');
    try {
      this._ws.applySnapshot(snap);
    } catch (err) {
      throw new SnapshotError('applySnapshot failed', err);
    }
    this._undo.clear();
  }

  encodeSnapshot(): Uint8Array {
    this._guard('encodeSnapshot');
    return this._wrapMutation(
      () => snapshotCodec.encode(this._ws.extractSnapshot()),
      (err) => new SnapshotError(`encode failed: ${(err as Error).message ?? err}`, err),
    );
  }

  decodeAndRestore(bytes: Uint8Array): void {
    this._guard('decodeAndRestore');
    let snap: WorksheetSnapshot;
    try {
      snap = snapshotCodec.decode(bytes);
    } catch (err) {
      throw new SnapshotError('decode failed', err);
    }
    this.restore(snap);
  }

  // ── Undo / Redo ───────────────────────────────────────────────────────────

  undo(): boolean {
    this._guard('undo');
    return this._wrapMutation(
      () => this._undo.undo(this._ws),
      (err) => new PatchError(`undo failed: ${(err as Error).message ?? err}`, err),
    );
  }

  redo(): boolean {
    this._guard('redo');
    return this._wrapMutation(
      () => this._undo.redo(this._ws),
      (err) => new PatchError(`redo failed: ${(err as Error).message ?? err}`, err),
    );
  }

  get canUndo(): boolean { return this._undo.canUndo; }
  get canRedo(): boolean { return this._undo.canRedo; }

  // ── Merge ─────────────────────────────────────────────────────────────────

  mergeCells(startRow: number, startCol: number, endRow: number, endCol: number): void {
    this._guard('mergeCells');
    this._wrapMutation(() => {
      const patch: WorksheetPatch = {
        seq: 0,
        ops: [{ op: 'mergeCells', startRow, startCol, endRow, endCol }],
      };
      this._undo.applyAndRecord(this._ws, patch);
    }, (err) => new MergeError(
      `mergeCells(${startRow},${startCol},${endRow},${endCol}) failed: ${(err as Error).message ?? err}`,
      err,
    ));
  }

  cancelMerge(startRow: number, startCol: number, endRow: number, endCol: number): void {
    this._guard('cancelMerge');
    this._wrapMutation(() => {
      const patch: WorksheetPatch = {
        seq: 0,
        ops: [{ op: 'cancelMerge', startRow, startCol, endRow, endCol }],
      };
      this._undo.applyAndRecord(this._ws, patch);
    }, (err) => new MergeError(
      `cancelMerge(${startRow},${startCol},${endRow},${endCol}) failed: ${(err as Error).message ?? err}`,
      err,
    ));
  }

  getMergedRanges(): Range[] {
    this._guard('getMergedRanges');
    return this._ws.getMergedRanges();
  }

  isInMerge(row: number, col: number): boolean {
    this._guard('isInMerge');
    return this._ws.isInMerge({ row, col });
  }

  // ── Row / Column visibility ───────────────────────────────────────────────

  hideRow(row: number): void {
    this._guard('hideRow');
    const patch: WorksheetPatch = { seq: 0, ops: [{ op: 'hideRow', row }] };
    this._undo.applyAndRecord(this._ws, patch);
  }

  showRow(row: number): void {
    this._guard('showRow');
    const patch: WorksheetPatch = { seq: 0, ops: [{ op: 'showRow', row }] };
    this._undo.applyAndRecord(this._ws, patch);
  }

  hideCol(col: number): void {
    this._guard('hideCol');
    const patch: WorksheetPatch = { seq: 0, ops: [{ op: 'hideCol', col }] };
    this._undo.applyAndRecord(this._ws, patch);
  }

  showCol(col: number): void {
    this._guard('showCol');
    const patch: WorksheetPatch = { seq: 0, ops: [{ op: 'showCol', col }] };
    this._undo.applyAndRecord(this._ws, patch);
  }

  isRowHidden(row: number): boolean {
    this._guard('isRowHidden');
    return this._ws.isRowHidden(row);
  }

  isColHidden(col: number): boolean {
    this._guard('isColHidden');
    return this._ws.isColHidden(col);
  }

  // ── Data Validation ───────────────────────────────────────────────────────

  setDataValidation(row: number, col: number, rule: DataValidationRule): void {
    this._guard('setDataValidation');
    this._ws.setDataValidation({ row, col }, rule);
  }

  getDataValidation(row: number, col: number): DataValidationRule | undefined {
    this._guard('getDataValidation');
    return this._ws.getDataValidation({ row, col });
  }

  removeDataValidation(row: number, col: number): void {
    this._guard('removeDataValidation');
    this._ws.removeDataValidation({ row, col });
  }

  getValidationCells(): Address[] {
    this._guard('getValidationCells');
    return this._ws.getValidationCells();
  }

  // ── Sheet Protection ───────────────────────────────────────────────────────

  setSheetProtection(options: SheetProtectionOptions = {}): void {
    this._guard('setSheetProtection');
    const before = this._ws.getSheetProtection();
    const patch: WorksheetPatch = {
      seq: 0,
      ops: [{ op: 'setSheetProtection' as const, before, after: options }],
    };
    this._undo.applyAndRecord(this._ws, patch);
  }

  removeSheetProtection(): void {
    this._guard('removeSheetProtection');
    const before = this._ws.getSheetProtection();
    if (before === null) return;
    const patch: WorksheetPatch = {
      seq: 0,
      ops: [{ op: 'setSheetProtection' as const, before, after: null }],
    };
    this._undo.applyAndRecord(this._ws, patch);
  }

  isSheetProtected(): boolean {
    this._guard('isSheetProtected');
    return this._ws.isSheetProtected();
  }

  getSheetProtection(): SheetProtectionOptions | null {
    this._guard('getSheetProtection');
    return this._ws.getSheetProtection();
  }

  isCellProtected(row: number, col: number): boolean {
    this._guard('isCellProtected');
    this._checkBounds(row, col);
    if (!this._ws.isSheetProtected()) return false;
    const cell = this._ws.getCell({ row, col });
    return cell?.style?.locked !== false;
  }

  lockCell(row: number, col: number): void {
    this._guard('lockCell');
    this._checkBounds(row, col);
    const before = this._ws.getCellStyle({ row, col });
    const after: CellStyle = { ...before, locked: true };
    const patch: WorksheetPatch = {
      seq: 0,
      ops: [{ op: 'setCellStyle' as const, row, col, before, after }],
    };
    this._undo.applyAndRecord(this._ws, patch);
  }

  unlockCell(row: number, col: number): void {
    this._guard('unlockCell');
    this._checkBounds(row, col);
    const before = this._ws.getCellStyle({ row, col });
    const after: CellStyle = { ...before, locked: false };
    const patch: WorksheetPatch = {
      seq: 0,
      ops: [{ op: 'setCellStyle' as const, row, col, before, after }],
    };
    this._undo.applyAndRecord(this._ws, patch);
  }

  // ── Freeze Panes ──────────────────────────────────────────────────────────

  setFreezePanes(rows: number, cols: number): void {
    this._guard('setFreezePanes');
    const before = this._ws.getFreezePanes();
    const after: FreezeState | null = (rows === 0 && cols === 0) ? null : { rows, cols };
    const patch: WorksheetPatch = {
      seq: 0,
      ops: [{ op: 'setFreezePanes' as const, before, after }],
    };
    this._undo.applyAndRecord(this._ws, patch);
  }

  clearFreezePanes(): void {
    this._guard('clearFreezePanes');
    const before = this._ws.getFreezePanes();
    if (before === null) return;
    const patch: WorksheetPatch = {
      seq: 0,
      ops: [{ op: 'setFreezePanes' as const, before, after: null }],
    };
    this._undo.applyAndRecord(this._ws, patch);
  }

  getFreezePanes(): FreezeState | null {
    this._guard('getFreezePanes');
    return this._ws.getFreezePanes();
  }

  // ── Column Filters ────────────────────────────────────────────────────────

  setFilter(col: number, filter: ColumnFilter): void {
    this._guard('setFilter');
    const before = this._ws.getColumnFilter(col) ?? null;
    const patch: WorksheetPatch = {
      seq: 0,
      ops: [{ op: 'setColumnFilter' as const, col, before, after: filter }],
    };
    this._undo.applyAndRecord(this._ws, patch);
  }

  clearFilter(col: number): void {
    this._guard('clearFilter');
    const before = this._ws.getColumnFilter(col) ?? null;
    if (before === null) return;
    const patch: WorksheetPatch = {
      seq: 0,
      ops: [{ op: 'setColumnFilter' as const, col, before, after: null }],
    };
    this._undo.applyAndRecord(this._ws, patch);
  }

  clearAllFilters(): void {
    this._guard('clearAllFilters');
    const all = this._ws.getAllFilters();
    if (all.size === 0) return;
    const ops = [...all.entries()].map(([col, before]) => ({
      op: 'setColumnFilter' as const, col, before, after: null,
    }));
    const patch: WorksheetPatch = { seq: 0, ops };
    this._undo.applyAndRecord(this._ws, patch);
  }

  getFilter(col: number): ColumnFilter | undefined {
    this._guard('getFilter');
    return this._ws.getColumnFilter(col);
  }

  getVisibleRows(range?: Range): number[] {
    this._guard('getVisibleRows');
    return this._ws.getVisibleRowIndices(range);
  }

  getDistinctValues(col: number, visibleOnly = false): { value: string; count: number }[] {
    this._guard('getDistinctValues');
    return this._ws.getDistinctValues(col, visibleOnly);
  }

  // ── Auto-Filter Range ─────────────────────────────────────────────────────

  setAutoFilterRange(headerRow: number, startCol: number, endCol: number): void {
    this._guard('setAutoFilterRange');
    const before = this._ws.getAutoFilterRange();
    const after: AutoFilterRange = { headerRow, startCol, endCol };
    const patch: WorksheetPatch = {
      seq: 0,
      ops: [{ op: 'setAutoFilterRange' as const, before, after }],
    };
    this._undo.applyAndRecord(this._ws, patch);
  }

  clearAutoFilterRange(): void {
    this._guard('clearAutoFilterRange');
    const before = this._ws.getAutoFilterRange();
    if (before === null) return;
    const patch: WorksheetPatch = {
      seq: 0,
      ops: [{ op: 'setAutoFilterRange' as const, before, after: null }],
    };
    this._undo.applyAndRecord(this._ws, patch);
  }

  getAutoFilterRange(): AutoFilterRange | null {
    this._guard('getAutoFilterRange');
    return this._ws.getAutoFilterRange();
  }

  // ── Range Sort ────────────────────────────────────────────────────────────

  sortRange(range: Range, keys: SortKey[]): void {
    this._guard('sortRange');
    if (keys.length === 0) return;

    const { start, end } = range;
    const numRows = end.row - start.row + 1;
    const numCols = end.col - start.col + 1;

    // Capture pre-sort snapshot for undo.
    const snapshot: ExtendedCellValue[][] = [];
    for (let ri = 0; ri < numRows; ri++) {
      const row: ExtendedCellValue[] = [];
      for (let ci = 0; ci < numCols; ci++) {
        row.push(this._ws.getCellValue({ row: start.row + ri, col: start.col + ci }));
      }
      snapshot.push(row);
    }

    // Apply sort directly on worksheet.
    this._ws.sortRange(range, keys);

    // Capture post-sort values for redo forward patch.
    const afterSnapshot: ExtendedCellValue[][] = [];
    for (let ri = 0; ri < numRows; ri++) {
      const row: ExtendedCellValue[] = [];
      for (let ci = 0; ci < numCols; ci++) {
        row.push(this._ws.getCellValue({ row: start.row + ri, col: start.col + ci }));
      }
      afterSnapshot.push(row);
    }

    // Build forward + inverse patches from snapshots.
    const makeCellOps = (from: ExtendedCellValue[][], to: ExtendedCellValue[][]): WorksheetPatch['ops'] =>
      from.flatMap((rowVals, ri) =>
        rowVals.map((before, ci) => ({
          op: 'setCellValue' as const,
          row: start.row + ri,
          col: start.col + ci,
          before,
          after: to[ri]![ci] ?? null,
        }))
      );

    const forwardOps = makeCellOps(snapshot, afterSnapshot);
    const inverseOps = makeCellOps(afterSnapshot, snapshot);

    this._undo.recordPreBuilt(
      { seq: 0, ops: forwardOps },
      { seq: 0, ops: inverseOps },
    );
  }

  // ── Events ────────────────────────────────────────────────────────────────

  on(eventType: SdkEventType, listener: SdkEventListener): Disposable {
    this._guard('on');
    if (!this._listeners.has(eventType)) {
      this._listeners.set(eventType, new Set());
    }
    this._listeners.get(eventType)!.add(listener);
    return {
      dispose: () => {
        this._listeners.get(eventType)?.delete(listener);
      },
    };
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  dispose(): void {
    if (this._disposed) return;
    this._disposed = true;
    this._unsubscribe.dispose();
    this._listeners.clear();
    this._undo.clear();
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

const DEFAULT_OPTIONS: Required<SpreadsheetOptions> = {
  maxUndoHistory: 100,
  rows: 1000,
  cols: 26,
};

/**
 * Create a new `SpreadsheetSDK` instance backed by a single `Worksheet`.
 *
 * @param name    Worksheet name (defaults to `'Sheet1'`).
 * @param options Configuration overrides.
 */
export function createSpreadsheet(
  name: string = 'Sheet1',
  options: SpreadsheetOptions = {},
): SpreadsheetSDK {
  const resolved: Required<SpreadsheetOptions> = {
    maxUndoHistory: options.maxUndoHistory ?? DEFAULT_OPTIONS.maxUndoHistory,
    rows:           options.rows           ?? DEFAULT_OPTIONS.rows,
    cols:           options.cols           ?? DEFAULT_OPTIONS.cols,
  };
  return new SpreadsheetV1(name, resolved);
}
