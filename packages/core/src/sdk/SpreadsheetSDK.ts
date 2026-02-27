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
import type { Cell, ExtendedCellValue, Range, Address, DataValidationRule } from '../types';
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

// ---------------------------------------------------------------------------
// SDK event types
// ---------------------------------------------------------------------------

/** All event types emitted by SpreadsheetSDK. */
export type SdkEventType =
  | 'cell-changed'
  | 'style-changed'
  | 'structure-changed'
  | 'filter-changed'
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
          this._emit('structure-changed', { type: 'structure-changed' });
          break;
        case 'filter-changed':
          this._emit('filter-changed', { type: 'filter-changed', col: e.col });
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
