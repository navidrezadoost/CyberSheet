/**
 * @cyber-sheet/core/sdk — subpath entry point.
 *
 * Only exports what belongs on the stable public SDK surface.
 * Internal classes (Worksheet, DependencyGraph, RecalcCoordinator, etc.)
 * are intentionally NOT re-exported from this path.
 */

// Factory + interface
export type { SpreadsheetSDK, SpreadsheetOptions, SdkEventType, SdkEvent, SdkEventListener, MutationTraceEvent, MutationTraceHook } from './SpreadsheetSDK';
export {
  createSpreadsheet,
  SdkError, DisposedError, BoundsError, SnapshotError, MergeError, PatchError,
  ProtectedCellError, ProtectedSheetOperationError,
  // Phase 24 — new error classes
  ValidationError, PatchRecorderError, UndoError,
  // Phase 25 — pivot error classes
  PivotSourceError, PivotFieldError, EmptyPivotSourceError,
} from './SpreadsheetSDK';

// Phase 25 — pivot types
export type { PivotDefinition, PivotValueSpec, PivotGrid, PivotGridRow, PivotAggregator } from './pivot';
export { buildPivot, pivotGridToValues } from './pivot';

// Patch serialization utility
export { PatchSerializer, PatchDeserializeError } from './PatchSerializer';
export type { SerializedPatch } from './PatchSerializer';

// The Disposable type is part of the public contract
export type { Disposable } from '../events';

// WorksheetPatch + PatchOp types (needed for applyPatch call sites)
export type { WorksheetPatch, PatchOp } from '../patch/WorksheetPatch';

// Snapshot type (needed for snapshot()/restore() call sites)
export type { WorksheetSnapshot } from '../persistence/SnapshotCodec';

// Keyboard shortcut manager (Phase 22)
export type {
  KeyboardShortcutManager,
  KeyboardShortcutManagerOptions,
  ShortcutHandler,
  KeyLike,
} from './KeyboardShortcutManager';
export { createKeyboardManager, normaliseCombo } from './KeyboardShortcutManager';
