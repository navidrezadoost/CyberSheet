/**
 * PatchUndoStack.ts — Phase 10: Delta Engine + Undo/Redo
 *
 * Main-thread undo/redo stack built on WorksheetPatch objects.
 *
 * ==========================================================================
 * ARCHITECTURE
 * ==========================================================================
 *
 *  ┌──────────────┐          ┌───────────────────┐          ┌──────────────┐
 *  │  User action │          │  PatchUndoStack    │          │  Worker      │
 *  │  (UI layer)  │          │  (main thread)     │          │  Worksheet   │
 *  └──────┬───────┘          └────────┬──────────-┘          └──────┬───────┘
 *         │  applyAndRecord(patch)     │                             │
 *         │──────────────────────────>│                             │
 *         │                           │  proxy.applyPatch(forward)  │
 *         │                           │────────────────────────────>│
 *         │                           │  <── inverse: WorksheetPatch│
 *         │                           │ push({ forward, inverse })  │
 *         │  <── Promise<void>        │                             │
 *         │                           │                             │
 *         │  undo()                   │                             │
 *         │──────────────────────────>│                             │
 *         │                           │  proxy.applyPatch(inverse)  │
 *         │                           │────────────────────────────>│
 *         │  <── Promise<void>        │                             │
 *         │                           │                             │
 *         │  redo()                   │                             │
 *         │──────────────────────────>│                             │
 *         │                           │  proxy.applyPatch(forward)  │
 *         │                           │────────────────────────────>│
 *         │  <── Promise<void>        │                             │
 *
 * ==========================================================================
 * CONCURRENCY MODEL
 * ==========================================================================
 *
 * The main thread sends ONE patch at a time over the Worker message channel.
 * PatchUndoStack serialises calls:
 *
 * • `applyAndRecord`, `undo`, and `redo` each return a Promise.
 * • Callers MUST await each call before issuing the next mutation.
 *   (The UI layer should disable undo/redo buttons while a call is in-flight.)
 * • No internal queuing is provided — concurrent calls will corrupt state.
 *   If you need queuing, wrap the stack in a serialising task queue.
 *
 * ==========================================================================
 * MEMORY BUDGET
 * ==========================================================================
 *
 * Default max history size: 100 entries.
 * Each entry holds two WorksheetPatch objects (forward + inverse).
 * For a typical cell-edit workload (~5 ops/patch × 2 patches × ~60 bytes/op)
 * 100 entries ≈ 60 KB — well within the <200 MB total budget.
 *
 * ==========================================================================
 * USAGE
 * ==========================================================================
 *
 *   const proxy = new WorkerEngineProxy(worker);
 *   const stack = new PatchUndoStack(proxy, { maxSize: 100 });
 *
 *   // User edits a cell
 *   const forward: WorksheetPatch = {
 *     seq: 0,
 *     ops: [{ op: 'setCellValue', row: 1, col: 1, before: null, after: 42 }]
 *   };
 *   await stack.applyAndRecord(forward);
 *
 *   // User presses Ctrl+Z
 *   if (stack.canUndo) await stack.undo();
 *
 *   // User presses Ctrl+Y
 *   if (stack.canRedo) await stack.redo();
 *
 * ==========================================================================
 * EXPORTED INTERFACE
 * ==========================================================================
 *
 *  IPatchProxy  — minimal interface WorkerEngineProxy must satisfy
 *                 (also satisfied by test mocks)
 *  UndoEntry    — single history entry (forward + inverse patches)
 *  PatchUndoStackOptions — configuration
 *  PatchUndoStack — the main class
 */

import type { WorksheetPatch } from './WorksheetPatch';

// ---------------------------------------------------------------------------
// IPatchProxy — minimal proxy interface needed by PatchUndoStack
// ---------------------------------------------------------------------------

/**
 * Minimal interface that any WorksheetPatch-capable proxy must satisfy.
 * Both `WorkerEngineProxy` and test mocks implement this.
 */
export interface IPatchProxy {
  /**
   * Apply `patch` to the remote Worksheet and return the inverse patch.
   * Must reject the Promise on failure.
   */
  applyPatch(patch: WorksheetPatch): Promise<WorksheetPatch>;
}

// ---------------------------------------------------------------------------
// UndoEntry
// ---------------------------------------------------------------------------

/**
 * A single entry in the undo/redo history.
 *
 * `forward` is the patch that was applied to arrive at the current state.
 * `inverse` is the patch that would restore the previous state.
 * `label`   is an optional human-readable description for history display.
 */
export type UndoEntry = {
  forward:  WorksheetPatch;
  inverse:  WorksheetPatch;
  label?:   string;
};

// ---------------------------------------------------------------------------
// PatchUndoStackOptions
// ---------------------------------------------------------------------------

export type PatchUndoStackOptions = {
  /**
   * Maximum number of history entries to keep.
   * When the limit is reached the oldest entry (bottom of undo stack) is
   * discarded.  Default: 100.
   */
  maxSize?: number;
};

// ---------------------------------------------------------------------------
// PatchUndoStack
// ---------------------------------------------------------------------------

/**
 * Main-thread undo/redo stack backed by WorksheetPatch objects.
 *
 * Maintains two logical stacks:
 *
 *   undoStack   — past operations (most recent at the top / end of array)
 *   redoStack   — operations that have been undone (most recent at end)
 *
 * Any new `applyAndRecord` call clears the redo stack (standard linear undo).
 */
export class PatchUndoStack {
  private readonly proxy:      IPatchProxy;
  private readonly maxSize:    number;

  /** Entries that can be undone. undoStack[length-1] is the most recent. */
  private readonly undoStack:  UndoEntry[] = [];

  /** Entries that can be redone. redoStack[length-1] is the next to redo. */
  private readonly redoStack:  UndoEntry[] = [];

  constructor(proxy: IPatchProxy, options: PatchUndoStackOptions = {}) {
    this.proxy   = proxy;
    this.maxSize = options.maxSize ?? 100;
  }

  // ── Status accessors ──────────────────────────────────────────────────────

  /** True if there is at least one operation that can be undone. */
  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /** True if there is at least one operation that can be redone. */
  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /** Number of operations currently in the undo stack. */
  get undoCount(): number {
    return this.undoStack.length;
  }

  /** Number of operations currently in the redo stack. */
  get redoCount(): number {
    return this.redoStack.length;
  }

  /**
   * Snapshot of all undo entries (oldest first).
   * Returns a shallow copy — safe to iterate without mutation concerns.
   */
  get undoHistory(): readonly UndoEntry[] {
    return this.undoStack.slice();
  }

  /**
   * Snapshot of all redo entries (most-recently-undone first at end).
   * Returns a shallow copy.
   */
  get redoHistory(): readonly UndoEntry[] {
    return this.redoStack.slice();
  }

  // ── Main operations ───────────────────────────────────────────────────────

  /**
   * Apply `forward` patch to the remote Worksheet, capture the inverse
   * patch returned by the worker, and push an undo entry onto the stack.
   *
   * Clears the redo stack (any previously undone operations are discarded).
   *
   * @param forward   The patch to apply.
   * @param label     Optional description shown in history UI.
   * @returns          Resolves when the patch has been applied and the entry recorded.
   */
  async applyAndRecord(forward: WorksheetPatch, label?: string): Promise<void> {
    const inverse = await this.proxy.applyPatch(forward);
    // Clear redo history — new branch starts here.
    this.redoStack.length = 0;
    // Push to undo stack, enforcing maxSize.
    this.undoStack.push({ forward, inverse, label });
    if (this.undoStack.length > this.maxSize) {
      this.undoStack.shift(); // drop oldest entry
    }
  }

  /**
   * Undo the most recent operation by applying its inverse patch.
   * Moves the entry from the undo stack to the redo stack.
   *
   * Throws if there is nothing to undo.
   * Returns the label of the entry that was undone (if any).
   */
  async undo(): Promise<string | undefined> {
    const entry = this.undoStack.pop();
    if (!entry) {
      throw new Error('PatchUndoStack: nothing to undo.');
    }
    // Apply the inverse.  If this throws, re-push so the stacks stay consistent.
    try {
      await this.proxy.applyPatch(entry.inverse);
    } catch (err) {
      this.undoStack.push(entry); // restore
      throw err;
    }
    this.redoStack.push(entry);
    return entry.label;
  }

  /**
   * Redo the most recently undone operation by re-applying its forward patch.
   * Moves the entry from the redo stack back to the undo stack.
   *
   * Throws if there is nothing to redo.
   * Returns the label of the entry that was redone (if any).
   */
  async redo(): Promise<string | undefined> {
    const entry = this.redoStack.pop();
    if (!entry) {
      throw new Error('PatchUndoStack: nothing to redo.');
    }
    // Apply the forward patch.  If this throws, re-push so stacks stay consistent.
    try {
      await this.proxy.applyPatch(entry.forward);
    } catch (err) {
      this.redoStack.push(entry); // restore
      throw err;
    }
    this.undoStack.push(entry);
    return entry.label;
  }

  /**
   * Clear both the undo and redo stacks without applying any patches.
   * Useful after a document save / snapshot checkpoint.
   */
  clear(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
  }

  /**
   * Merge the last `count` undo entries into a single entry.
   *
   * This is useful when a user action fires multiple sequential mutations
   * that should be treated as one undo step (e.g., "paste range" which calls
   * setCellValue many times individually before building a single batch patch).
   *
   * After `mergeLast(n)`:
   *  - The n entries are replaced by one entry whose `forward` ops are the
   *    concatenation of their individual forwards (oldest first).
   *  - Its `inverse` ops are the concatenation of their individual inverses
   *    in REVERSE order (newest first, matching the undo direction).
   *
   * @param count  Number of entries to merge (must be ≥ 2 and ≤ undoCount).
   * @param label  Optional label for the merged entry.
   */
  mergeLast(count: number, label?: string): void {
    if (count < 2) throw new Error('PatchUndoStack.mergeLast: count must be ≥ 2.');
    if (count > this.undoStack.length) {
      throw new Error(`PatchUndoStack.mergeLast: only ${this.undoStack.length} entries available.`);
    }
    const entries = this.undoStack.splice(this.undoStack.length - count, count);
    const forwardOps  = entries.flatMap(e => e.forward.ops);
    const inverseOps  = entries.reverse().flatMap(e => e.inverse.ops);
    this.undoStack.push({
      forward: { seq: entries[0]!.forward.seq, ops: forwardOps },
      inverse: { seq: entries[0]!.inverse.seq, ops: inverseOps },
      label,
    });
  }
}
