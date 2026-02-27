/**
 * SyncUndoStack — synchronous undo/redo for SDK consumers.
 *
 * Unlike PatchUndoStack (which is async and designed for the worker-proxy
 * pattern), SyncUndoStack operates directly on a Worksheet instance using
 * recordingApplyPatch to capture inverses at apply-time.
 *
 * Design constraints:
 *  - Maximum stack depth is bounded (default 100) to guarantee O(1) memory.
 *  - Applying a new patch clears the redo stack (standard linear undo model).
 *  - No I/O, no Promises — entirely synchronous.
 */

import type { Worksheet } from '../worksheet';
import type { WorksheetPatch } from '../patch/WorksheetPatch';
import { recordingApplyPatch } from '../patch/PatchRecorder';

interface UndoEntry {
  /** The patch applied in the forward direction. */
  forward: WorksheetPatch;
  /** The inverse patch that undoes the forward patch. */
  inverse: WorksheetPatch;
}

export class SyncUndoStack {
  private readonly _maxSize: number;
  private _undoStack: UndoEntry[] = [];
  private _redoStack: UndoEntry[] = [];

  constructor(maxSize = 100) {
    if (maxSize < 1) throw new RangeError(`SyncUndoStack: maxSize must be >= 1, got ${maxSize}`);
    this._maxSize = maxSize;
  }

  /**
   * Apply `patch` to `ws` and record the inverse on the undo stack.
   * Any existing redo history is discarded.
   *
   * @returns The inverse patch (so callers can store it if desired).
   */
  applyAndRecord(ws: Worksheet, patch: WorksheetPatch): WorksheetPatch {
    const inverse = recordingApplyPatch(ws, patch);
    this._undoStack.push({ forward: patch, inverse });
    // Trim to max capacity (FIFO drop from the bottom)
    if (this._undoStack.length > this._maxSize) {
      this._undoStack.shift();
    }
    // New forward action always clears redo history
    this._redoStack = [];
    return inverse;
  }

  /**
   * Undo the last applied patch.
   * @returns `true` if an entry was undone, `false` if the stack was empty.
   */
  undo(ws: Worksheet): boolean {
    const entry = this._undoStack.pop();
    if (!entry) return false;
    // Apply the inverse, but do NOT record it into undo (would break the stack)
    recordingApplyPatch(ws, entry.inverse);
    this._redoStack.push(entry);
    return true;
  }

  /**
   * Redo the last undone patch.
   * @returns `true` if an entry was redone, `false` if redo stack was empty.
   */
  redo(ws: Worksheet): boolean {
    const entry = this._redoStack.pop();
    if (!entry) return false;
    recordingApplyPatch(ws, entry.forward);
    this._undoStack.push(entry);
    return true;
  }

  /** Whether there is anything to undo. */
  get canUndo(): boolean {
    return this._undoStack.length > 0;
  }

  /** Whether there is anything to redo. */
  get canRedo(): boolean {
    return this._redoStack.length > 0;
  }

  /** Number of entries currently on the undo stack. */
  get undoDepth(): number {
    return this._undoStack.length;
  }

  /** Number of entries currently on the redo stack. */
  get redoDepth(): number {
    return this._redoStack.length;
  }

  /** Clear both the undo and redo stacks. */
  clear(): void {
    this._undoStack = [];
    this._redoStack = [];
  }

  /**
   * Record a pre-built forward/inverse pair without applying anything.
   *
   * Use this when the mutation was already applied directly on the Worksheet
   * (e.g. `sortRange`) and you have already computed the inverse patch.
   * Any existing redo history is discarded.
   */
  recordPreBuilt(forward: WorksheetPatch, inverse: WorksheetPatch): void {
    this._undoStack.push({ forward, inverse });
    if (this._undoStack.length > this._maxSize) {
      this._undoStack.shift();
    }
    this._redoStack = [];
  }
}
