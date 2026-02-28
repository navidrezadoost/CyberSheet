/**
 * errors.ts — Phase 24 + Phase 25: Error Handling Hardening + Pivot Kernel
 *
 * Unified, typed error hierarchy for @cyber-sheet/core.
 *
 * Design goals:
 *  - Every failure mode has a concrete class (no raw `new Error()` in SDK/patch layer).
 *  - Every error carries:
 *      `code`      — machine-readable reason code (stable across versions).
 *      `operation` — which SDK method triggered the error (where applicable).
 *  - Errors are instanceof-testable at every level of the hierarchy.
 *  - No circular imports: this file has ZERO imports from the rest of the codebase.
 *
 * Hierarchy:
 *
 *   SdkError
 *   ├── DisposedError                   (DISPOSED)
 *   ├── BoundsError                     (OUT_OF_BOUNDS)
 *   ├── SnapshotError                   (SNAPSHOT_FAILED)
 *   ├── MergeError                      (MERGE_CONFLICT)
 *   ├── PatchError                      (PATCH_FAILED)
 *   ├── ProtectedCellError              (CELL_PROTECTED)
 *   ├── ProtectedSheetOperationError    (SHEET_OP_BLOCKED)
 *   ├── ValidationError                 (VALIDATION_FAILED)   ← Phase 24
 *   ├── PatchRecorderError              (RECORDER_STATE)      ← Phase 24
 *   ├── UndoError                       (NOTHING_TO_UNDO |    ← Phase 24
 *   │                                    NOTHING_TO_REDO)
 *   ├── PivotSourceError                (INVALID_PIVOT_SOURCE) ← Phase 25
 *   ├── PivotFieldError                 (INVALID_PIVOT_FIELD)  ← Phase 25
 *   └── EmptyPivotSourceError           (EMPTY_PIVOT_SOURCE)   ← Phase 25
 */

// ── Base class ─────────────────────────────────────────────────────────────

/**
 * Base class for all structured SDK errors.
 *
 * Every error carries:
 *  `code`      — stable machine-readable reason string (e.g. `'DISPOSED'`).
 *  `operation` — name of the SDK method that triggered the error, when known.
 */
export class SdkError extends Error {
  /** Stable machine-readable reason code. */
  readonly code: string;
  /** SDK method that triggered this error, when applicable. */
  readonly operation: string | undefined;

  constructor(message: string, code: string = 'ERROR', operation?: string) {
    super(message);
    this.name    = 'SdkError';
    this.code    = code;
    this.operation = operation;
  }
}

// ── Lifecycle ──────────────────────────────────────────────────────────────

/**
 * Thrown when a method is called after `dispose()` has been invoked.
 * @code DISPOSED
 */
export class DisposedError extends SdkError {
  constructor(method: string, context = 'SpreadsheetSDK') {
    super(
      `${context}.${method}(): sheet has been disposed`,
      'DISPOSED',
      method,
    );
    this.name = 'DisposedError';
  }
}

// ── Bounds ────────────────────────────────────────────────────────────────

/**
 * Thrown when a row or column index is out of range.
 * @code OUT_OF_BOUNDS
 */
export class BoundsError extends SdkError {
  /** Out-of-range row index, if applicable. */
  readonly row?: number;
  /** Out-of-range column index, if applicable. */
  readonly col?: number;

  constructor(detail: string, row?: number, col?: number) {
    super(`SpreadsheetSDK bounds violation: ${detail}`, 'OUT_OF_BOUNDS');
    this.name = 'BoundsError';
    this.row  = row;
    this.col  = col;
  }
}

// ── Snapshot ──────────────────────────────────────────────────────────────

/**
 * Thrown when a snapshot operation fails (unknown version, corrupt bytes, etc.).
 * @code SNAPSHOT_FAILED
 */
export class SnapshotError extends SdkError {
  /** The underlying cause, if available. */
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(`SnapshotError: ${message}`, 'SNAPSHOT_FAILED');
    this.name  = 'SnapshotError';
    this.cause = cause;
  }
}

// ── Merge ─────────────────────────────────────────────────────────────────

/**
 * Thrown when a merge operation is rejected due to a conflict with an existing
 * merged region.
 * @code MERGE_CONFLICT
 */
export class MergeError extends SdkError {
  /** The underlying cause, if available. */
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(`MergeError: ${message}`, 'MERGE_CONFLICT');
    this.name  = 'MergeError';
    this.cause = cause;
  }
}

// ── Patch ─────────────────────────────────────────────────────────────────

/**
 * Thrown when a patch operation fails due to invalid patch structure or
 * a conflict with the current sheet state.
 * @code PATCH_FAILED
 */
export class PatchError extends SdkError {
  /** The underlying cause, if available. */
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(`PatchError: ${message}`, 'PATCH_FAILED');
    this.name  = 'PatchError';
    this.cause = cause;
  }
}

// ── Protection ────────────────────────────────────────────────────────────

/**
 * Thrown when a mutation is attempted on a cell that is locked and the sheet
 * is currently protected. Call `removeSheetProtection()` or `unlockCell()`.
 * @code CELL_PROTECTED
 */
export class ProtectedCellError extends SdkError {
  /** Row index of the protected cell (1-based). */
  readonly row: number;
  /** Column index of the protected cell (1-based). */
  readonly col: number;

  constructor(row: number, col: number) {
    super(
      `SpreadsheetSDK: cell (${row}, ${col}) is protected — call removeSheetProtection() or unlockCell(${row}, ${col}) first`,
      'CELL_PROTECTED',
    );
    this.name = 'ProtectedCellError';
    this.row  = row;
    this.col  = col;
  }
}

/**
 * Thrown when a sheet-level operation is blocked by the active protection
 * options (e.g. sorting while `allowSort` is not set).
 * @code SHEET_OP_BLOCKED
 */
export class ProtectedSheetOperationError extends SdkError {
  /** The `SheetProtectionOptions` key that would permit this operation. */
  readonly flag: string;

  constructor(operation: string, flag: string) {
    super(
      `SpreadsheetSDK: '${operation}' is blocked by sheet protection — set '${flag}: true' in setSheetProtection() options or call removeSheetProtection() first`,
      'SHEET_OP_BLOCKED',
      operation,
    );
    this.name = 'ProtectedSheetOperationError';
    this.flag = flag;
  }
}

// ── Validation ────────────────────────────────────────────────────────────

/**
 * Thrown when a value violates an active data-validation rule.
 *
 * Note: the kernel does not currently enforce rules on `setCell()` —
 * this class is reserved for future rule-enforcement and for custom
 * validator wrappers.
 *
 * @code VALIDATION_FAILED
 */
export class ValidationError extends SdkError {
  /** Row index of the cell that failed validation (1-based). */
  readonly row: number;
  /** Column index of the cell that failed validation (1-based). */
  readonly col: number;
  /** Human-readable reason (e.g. 'value 42 is out of range 1..10'). */
  readonly detail: string;

  constructor(operation: string, row: number, col: number, detail: string) {
    super(
      `SpreadsheetSDK: validation failed at (${row}, ${col}): ${detail}`,
      'VALIDATION_FAILED',
      operation,
    );
    this.name   = 'ValidationError';
    this.row    = row;
    this.col    = col;
    this.detail = detail;
  }
}

// ── PatchRecorder ─────────────────────────────────────────────────────────

/**
 * Thrown when the `PatchRecorder` is used in an invalid state
 * (e.g. calling `start()` while already recording).
 * @code RECORDER_STATE
 */
export class PatchRecorderError extends SdkError {
  constructor(message: string) {
    super(`PatchRecorder: ${message}`, 'RECORDER_STATE');
    this.name = 'PatchRecorderError';
  }
}

// ── Undo / Redo ───────────────────────────────────────────────────────────

/**
 * Thrown when `undo()` or `redo()` is called but the respective stack is empty.
 * @code NOTHING_TO_UNDO | NOTHING_TO_REDO
 */
export class UndoError extends SdkError {
  /** Whether this was an undo or redo attempt. */
  readonly action: 'undo' | 'redo';

  constructor(action: 'undo' | 'redo') {
    super(
      `PatchUndoStack: nothing to ${action}.`,
      action === 'undo' ? 'NOTHING_TO_UNDO' : 'NOTHING_TO_REDO',
      action,
    );
    this.name   = 'UndoError';
    this.action = action;
  }
}

// ── Pivot ─────────────────────────────────────────────────────────────────

/**
 * Thrown when the pivot source range is invalid (e.g. too small, out-of-bounds
 * for the sheet, or has no header row).
 * @code INVALID_PIVOT_SOURCE
 */
export class PivotSourceError extends SdkError {
  /** Human-readable reason (e.g. 'source range must have at least 1 header row'). */
  readonly detail: string;

  constructor(detail: string) {
    super(`PivotEngine: invalid source — ${detail}`, 'INVALID_PIVOT_SOURCE', 'createPivot');
    this.name   = 'PivotSourceError';
    this.detail = detail;
  }
}

/**
 * Thrown when a field name referenced in `PivotDefinition.rows` or
 * `PivotDefinition.values[*].field` is not found in the source header row.
 * @code INVALID_PIVOT_FIELD
 */
export class PivotFieldError extends SdkError {
  /** The unresolved field name. */
  readonly field: string;
  /** The available header names at the time of the error. */
  readonly available: string[];

  constructor(field: string, available: string[]) {
    super(
      `PivotEngine: field '${field}' not found in source headers [${available.join(', ')}]`,
      'INVALID_PIVOT_FIELD',
      'createPivot',
    );
    this.name      = 'PivotFieldError';
    this.field     = field;
    this.available = available;
  }
}

/**
 * Thrown when the pivot source has a valid header row but zero data rows
 * (i.e. the range is exactly 1 row tall, or all non-header rows are empty).
 * @code EMPTY_PIVOT_SOURCE
 */
export class EmptyPivotSourceError extends SdkError {
  constructor() {
    super(
      'PivotEngine: source has no data rows (only a header row was found)',
      'EMPTY_PIVOT_SOURCE',
      'createPivot',
    );
    this.name = 'EmptyPivotSourceError';
  }
}
