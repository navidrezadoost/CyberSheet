/**
 * @cyber-sheet/core/sdk — subpath entry point.
 *
 * Only exports what belongs on the stable public SDK surface.
 * Internal classes (Worksheet, DependencyGraph, RecalcCoordinator, etc.)
 * are intentionally NOT re-exported from this path.
 */

// Factory + interface
export type { SpreadsheetSDK, SpreadsheetOptions, SdkEventType, SdkEvent, SdkEventListener } from './SpreadsheetSDK';
export { createSpreadsheet, SdkError, DisposedError, BoundsError, SnapshotError } from './SpreadsheetSDK';

// Patch serialization utility
export { PatchSerializer, PatchDeserializeError } from './PatchSerializer';
export type { SerializedPatch } from './PatchSerializer';

// The Disposable type is part of the public contract
export type { Disposable } from '../events';

// WorksheetPatch + PatchOp types (needed for applyPatch call sites)
export type { WorksheetPatch, PatchOp } from '../patch/WorksheetPatch';

// Snapshot type (needed for snapshot()/restore() call sites)
export type { WorksheetSnapshot } from '../persistence/SnapshotCodec';
