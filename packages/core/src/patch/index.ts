/**
 * patch/index.ts — Phase 10: Delta Engine + Undo/Redo
 *
 * Public exports for the patch subsystem.
 */

export type {
  PatchOp,
  SetCellValueOp,
  ClearCellOp,
  SetCellStyleOp,
  MergeCellsOp,
  CancelMergeOp,
  HideRowOp, ShowRowOp,
  HideColOp, ShowColOp,
  WorksheetPatch,
} from './WorksheetPatch';
export { PatchOps, invertPatch, applyPatch } from './WorksheetPatch';

export { PatchRecorder, recordingApplyPatch } from './PatchRecorder';

export type { IPatchProxy, UndoEntry, PatchUndoStackOptions } from './PatchUndoStack';
export { PatchUndoStack } from './PatchUndoStack';
