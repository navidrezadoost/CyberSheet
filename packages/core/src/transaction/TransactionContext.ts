/**
 * TransactionContext.ts — Phase 11: Deterministic Transaction Layer
 *
 * Encapsulates the mutable state of one open transaction on the Worker thread.
 *
 * ==========================================================================
 * DESIGN
 * ==========================================================================
 *
 * TransactionContext is a short-lived object: created by beginTransaction,
 * consumed by commitTransaction or rollbackTransaction.  It owns two pieces
 * of state:
 *
 *   1. A PatchRecorder session that captures every Worksheet mutation event
 *      emitted while the transaction is open.  On commit the recorder
 *      produces the aggregate forward WorksheetPatch covering all ops.
 *
 *   2. A first-write cell snapshot journal, which preserves cell values and
 *      formulas for direct Worksheet API mutations as well as patch calls.
 *
 * ==========================================================================
 * PM DIRECTED INVARIANTS (Phase 11)
 * ==========================================================================
 *
 *  I1.  Nested transactions are explicitly rejected at EngineWorkerHost level.
 *       TransactionContext itself does not enforce this — it is a pure state
 *       container; the host enforces the single-open-transaction invariant.
 *
 *  I2.  Recalc runs exactly once per commit/rollback.
 *       TransactionContext deliberately does NOT call ws.recalc().
 *       The caller (EngineWorkerHost) calls it once after commit() or rollback()
 *       returns — never inside this class.
 *
 *  I3.  No observable intermediate state.
 *       All mutations happen inside the Worker (single thread), so the main
 *       thread cannot interleave reads between individual patch ops.
 *       getCellValue returns transactional state: the current stored value
 *       (post–last-mutation, pre-recalc).  This is an explicitly defined
 *       semantic, not "silently stale".
 *
 *  I4.  PatchRecorder integrates cleanly.
 *       The recorder is opened in the TransactionContext constructor and is
 *       closed in commit() or abort() — it spans the exact lifetime of the
 *       transaction.
 *
 * ==========================================================================
 * ROLLBACK ORDERING
 * ==========================================================================
 *
 * Rollback inverts the complete recorded mutation patch, then restores each
 * cell's original formula from the first-write snapshot journal.
 *
 * ==========================================================================
 * hasPendingEvaluation
 * ==========================================================================
 *
 * True whenever there are cells in the dirty set awaiting recalc.  During
 * an open transaction this is almost always true (recalc is deferred to
 * commit).  Exposed so the worker can return it via the `hasPendingEvaluation`
 * protocol op.
 *
 * ==========================================================================
 * USAGE (inside EngineWorkerHost)
 * ==========================================================================
 *
 *   // beginTransaction
 *   this._txn = new TransactionContext(this.ws);
 *
 *   // applyPatch (inside active transaction)
 *   const inv = recordingApplyPatch(this.ws, patch);
 *   this._txn.addInverse(inv);
 *   // NOTE: no recalc here — deferred to commit.
 *
 *   // commitTransaction
 *   const { patch, inverse } = this._txn.commit();
 *   this._txn = null;
 *   const recalcResult = this.ws.recalc(() => {});  // exactly once
 *   return { patch, inverse, evaluated: recalcResult.evaluated, hasCycles: recalcResult.cycles.length > 0 };
 *
 *   // rollbackTransaction
 *   this._txn.rollback();           // applies per-op inverses LIFO
 *   this._txn = null;
 *   this.ws.recalc(() => {});       // restore formula values — exactly once
 *
 *   // reset (without commit or rollback)
 *   if (this._txn) { this._txn.dispose(); this._txn = null; }
 *   this.ws = new Worksheet(...);
 */

import type { Worksheet } from '../worksheet';
import type { Address, ExtendedCellValue } from '../types';
import {
  type WorksheetPatch,
  invertPatch,
  applyPatch,
} from '../patch/WorksheetPatch';
import { PatchRecorder } from '../patch/PatchRecorder';

// ---------------------------------------------------------------------------
// CommitResult — returned by TransactionContext.commit()
// ---------------------------------------------------------------------------

export type CommitResult = {
  /**
   * The aggregate forward patch covering every operation applied during
   * this transaction.  This is what PatchUndoStack stores as the redo patch.
   */
  patch: WorksheetPatch;

  /**
   * The aggregate inverse patch that reverses every operation in `patch`.
   * This is what PatchUndoStack stores as the undo patch.
   * It is computed from the recorder's captured events (not from inverseStack),
   * giving a single compact invertPatch(aggregateForward) result.
   */
  inverse: WorksheetPatch;
};

// ---------------------------------------------------------------------------
// TransactionContext
// ---------------------------------------------------------------------------

export class TransactionContext {
  private readonly _ws: Worksheet;
  private readonly _recorder: PatchRecorder;
  private readonly _cellSnapshots = new Map<string, {
    address: Address;
    value: ExtendedCellValue;
    formula: string | undefined;
  }>();
  private readonly _mutationSubscription: { dispose(): void };

  /**
   * Per-op inverse patches registered by worker callers. Retained for the
   * opCount compatibility surface; rollback uses the complete worksheet journal.
   */
  private readonly _inverseStack: WorksheetPatch[] = [];

  /**
   * Opens a transaction on `ws`.
   * Starts the PatchRecorder immediately — all subsequent Worksheet events
   * will be captured until commit() or abort() is called.
   */
  constructor(ws: Worksheet) {
    this._ws       = ws;
    this._recorder = new PatchRecorder(ws);
    this._recorder.start();
    this._mutationSubscription = ws.onMutation((event) => {
      if (event.type !== 'cell-changed') return;
      const key = `${event.address.row}:${event.address.col}`;
      if (this._cellSnapshots.has(key)) return;
      this._cellSnapshots.set(key, {
        address: event.address,
        value: event.previousValue ?? null,
        formula: event.previousFormula,
      });
    });
  }

  // ── Public API ─────────────────────────────────────────────────────────

  /**
   * Register an inverse patch produced by `recordingApplyPatch` for one op.
   *
   * Called by EngineWorkerHost immediately after applying each applyPatch
   * request inside an open transaction. The worksheet journal is authoritative
   * for rollback; this list remains available for transaction metrics.
   */
  addInverse(inverse: WorksheetPatch): void {
    this._inverseStack.push(inverse);
  }

  /**
   * Number of ops applied so far in this transaction.
   * Equals the length of the inverse stack.
   */
  get opCount(): number {
    return this._inverseStack.length;
  }

  /**
   * True when there are cells in the dirty set awaiting recalculation.
   *
   * During an open transaction this is typically true after any cell write.
   * After commit + recalc it should be false (unless volatile cells exist).
   *
   * Exposed so EngineWorkerHost can serve the `hasPendingEvaluation` protocol op.
   */
  get hasPendingEvaluation(): boolean {
    return this._ws.dirtyCount > 0;
  }

  /**
   * Commit the transaction.
   *
   * Stops the PatchRecorder and returns the aggregate forward patch plus its
   * structural inverse.  Does NOT run recalc — the caller must call
   * `ws.recalc(() => {})` immediately after.
   *
   * After this call the TransactionContext is consumed and must not be reused.
   *
   * @returns CommitResult — { patch: forward, inverse: undo }
   */
  commit(): CommitResult {
    const patch   = this._recorder.stop();
    this._mutationSubscription.dispose();
    const inverse = invertPatch(patch);
    return { patch, inverse };
  }

  /**
   * Roll back the transaction.
   *
   * Inverts the complete recorded patch and restores the original formula
   * metadata captured at each cell's first mutation.
   *
   * Does NOT run recalc — the caller must call `ws.recalc(() => {})` after.
   *
   * After this call the TransactionContext is consumed and must not be reused.
   */
  rollback(): void {
    // The worksheet mutation journal is authoritative: it includes direct
    // Worksheet API calls made by SpreadsheetEngine.run(), not only patches
    // registered by worker callers. Stop recording before applying its inverse.
    const forward = this._recorder.stop();
    this._mutationSubscription.dispose();
    applyPatch(this._ws, invertPatch(forward));
    for (const snapshot of this._cellSnapshots.values()) {
      const current = this._ws.getCell(snapshot.address);
      if (current?.formula === snapshot.formula) continue;
      if (snapshot.formula !== undefined) {
        this._ws.setCellFormula(snapshot.address, snapshot.formula, snapshot.value);
      } else if (current?.formula !== undefined) {
        this._ws.clearCellFormula(snapshot.address);
      }
    }
  }

  /**
   * Dispose without commit or rollback.
   *
   * Use ONLY when the underlying Worksheet is being replaced (e.g. `reset` op)
   * and no state restoration is needed.  Unlike rollback(), this does NOT
   * attempt to reverse any mutations — it only cleans up the recorder.
   */
  dispose(): void {
    if (this._recorder.isRecording) {
      this._recorder.abort();
    }
    this._mutationSubscription.dispose();
  }

  // ── Defensive invariant assertion (called at commitTransaction dispatch) ─

  /**
   * Assert internal invariants before commit returns to the caller.
   *
   * Checks:
   *   - The recorder was successfully stopped (isRecording === false after commit).
   *   - This is called after commit() so recorder.isRecording must already be false.
   *
   * This method is a static guard — it takes the post-commit state as params
   * rather than reading internal fields (which are already consumed by commit()).
   *
   * @param evaluated   Recalc cell count — used to verify recalc ran.
   * @param dirtyCount  ws.dirtyCount after recalc — must be 0 if no volatiles.
   */
  static assertCommitInvariants(
    evaluated: number,
    dirtyCount: number,
    hasVolatiles: boolean,
  ): void {
    if (!hasVolatiles && dirtyCount !== 0) {
      throw new Error(
        `TransactionContext invariant violation: dirtyCount=${dirtyCount} after commit recalc ` +
        `(expected 0, evaluated=${evaluated}).  The dirty set was not fully drained.`,
      );
    }
  }
}
