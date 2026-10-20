# CS-001C — Mutation Journal and Transaction Foundation Gap Assessment

**Status:** Source-grounded assessment · design only · **Priority:** P0  
**Reported:** 2026-10-17  
**Predecessor:** CS-002D4.6 accepted; D4.3 remains blocked pending CS-001C  
**Scope:** Reconcile the current mutation and rollback implementation with the requirements for a single authoritative journal and a future multi-sheet atomic transaction envelope.  
**Authorization:** Assessment and design reconciliation only. No transaction implementation, tests, builds, baseline runs, merge, or release work is authorized here.

## 1. Executive finding

The repository has a worksheet-scoped mutation event recorder and a patch-based undo format, but it does **not** currently have one complete authoritative journal capable of restoring every worksheet mutation surface. `TransactionContext` combines `PatchRecorder` with a first-write journal that snapshots only cell values/formulas observed through `Worksheet.onMutation()`. `PatchRecorder` supplements that stream with public worksheet events, but its operation mapping is partial and several state-changing APIs emit only generic `sheet-mutated` notifications or event types the recorder ignores.

The existing mechanisms therefore provide useful cell/content rollback for covered paths, not a proven all-state rollback contract. Their current boundary is also one worksheet at a time. Workbook sheet-directory changes and state shared across sheets are outside the recorder. A D4.3 design must extend the existing journal boundary or define a single journal abstraction that owns those records; adding a parallel transaction journal would create competing sources of truth.

The most urgent composition gap is after mutation commit. `SpreadsheetEngine.run()` consumes its `TransactionContext` before scheduling/evaluation. If the scheduler then fails, the catch path invalidates scheduled work and suppresses buffered derived-result events, but it cannot roll back committed user mutations and does not restore/invalidate cache writes already made in that generation. This is the exact recovery decision D4.5/D4.6 require to be made jointly with the transaction commit boundary.

## 2. Source-grounded current state

| Concern | Current source behavior | Assessment |
| --- | --- | --- |
| Worksheet mutation entry points | `Worksheet.assertMutating()` enforces `engine.run()` for selected APIs. `Worksheet.runTransaction()` is re-entrant but brackets one synchronous worksheet operation; it flushes that operation's events when it returns. | This is a per-operation event batch, not a transaction spanning several worksheet calls or several sheets. A few mutators do not call `assertMutating()` or `runTransaction()` at all. |
| Mutation observer | `Worksheet._emitOrBuffer()` calls internal `onMutation` listeners synchronously, then buffers or emits public events. `TransactionContext` subscribes to `onMutation` and records first-write snapshots only for `cell-changed`. | The journal sees each covered write immediately. It does not itself defer public notifications across a multi-call `TransactionContext`. |
| Public event visibility | Each public mutator generally opens and closes its own `runTransaction()`. Public worksheet listeners can observe that call's final event before a longer-lived transaction commits. Other APIs emit directly through `events.emit()`, bypassing `_emitOrBuffer()` entirely. | The current worksheet event layer does not guarantee transaction-wide observer isolation. `SpreadsheetEngine` has a separate post-recompute event API, but direct worksheet listeners and the worker host have different visibility behavior. |
| Patch capture | `PatchRecorder` subscribes to both `onMutation` and public `on()` events, de-duplicates events delivered on both paths, and converts selected events to `WorksheetPatch` operations. | This is event-derived delta capture, not an interception of every state write. Events missing, ignored, or represented only as generic notifications cannot produce a faithful inverse. |
| Cell snapshot journal | `TransactionContext` records the first `previousValue` and `previousFormula` per address from `onMutation` `cell-changed` events. Rollback applies `invertPatch(forward)` then repairs formula metadata from these snapshots. | It is a cell-content supplement, not a complete worksheet snapshot/journal. It does not preserve arbitrary cell metadata, row/column state, workbook state, or derived-cache checkpoints. |
| Worker transaction | `EngineWorkerHost` enforces one open `TransactionContext` per host. Commit clears `_txn`, stops recording, and calls `ws.recalc(() => {})`; rollback calls `txn.rollback()` and then recalc. The worker comment states that the formula engine is not wired there. | This is one worksheet per worker, not a workbook transaction. A calculation error after commit has no open transaction to roll back. Reset intentionally disposes an open transaction because it replaces the worksheet; that is replacement semantics, not rollback. |
| Engine transaction | `SpreadsheetEngine.run()` creates a transaction for the callback and rolls it back if the callback throws. It commits and clears `_txn` before scheduling formulas. On scheduler failure, it invalidates the scheduler, returns to IDLE, suppresses buffered formula-result events, and rethrows. | Callback failure has a rollback path. Post-commit calculation failure has neither rollback nor a declared cache-generation recovery policy. Event suppression alone does not restore an atomic committed state. |
| Workbook scope | `Workbook` owns a name-to-worksheet map and supports add/delete/rename/active-sheet changes; worksheet-level `TransactionContext` owns one `Worksheet`. | No current journal covers atomic sheet-directory changes, ID allocation, or coordinated mutations across sheets. These must be explicitly included or explicitly excluded by the D4.3 contract. |

Primary implementation references: [`TransactionContext.ts`](../../packages/core/src/transaction/TransactionContext.ts), [`PatchRecorder.ts`](../../packages/core/src/patch/PatchRecorder.ts), [`WorksheetPatch.ts`](../../packages/core/src/patch/WorksheetPatch.ts), [`worksheet.ts`](../../packages/core/src/worksheet.ts), [`SpreadsheetEngine.ts`](../../packages/core/src/SpreadsheetEngine.ts), [`EngineWorkerHost.ts`](../../packages/core/src/worker/EngineWorkerHost.ts), and [`workbook.ts`](../../packages/core/src/workbook.ts).

## 3. Mutation-surface coverage audit

The table distinguishes event visibility from rollback completeness. “Patch signal” means a recorder can observe an event; it does not imply the event contains enough before-state to restore the mutation.

| Mutation family | Representative APIs / event route | Current journal/patch status | Gap relevant to CS-001C |
| --- | --- | --- | --- |
| Cell value, formula, clear | `setCellValue`, `setCellFormula`, `clearCellContent`, `clearCellFormula`; `cell-changed` via `_emitOrBuffer` | Generally represented as `setCellValue`, `clearCell`, or `setCellContent`; first-write value/formula snapshot is recorded for `_emitOrBuffer` events. | Establish behavior for direct `deleteCell`, formula graph/dependency state, and preserving full cell metadata. Formula restoration after an inverse patch is currently a second repair step, so the authoritative record is split across patch and snapshot structures. |
| Cell style | `setCellStyle`; `style-changed` via `_emitOrBuffer` with `previousStyle` | Before/after style can be represented. | Verify style-store/cell allocation restoration and behavior when a larger operation clears or remaps cells. |
| Spill metadata | `setSpillSource`, `setSpilledFrom`, `applySpillBatch`; spill events via `_emitOrBuffer` | Batch changes map to `setSpill`; individual source/from events are explicit no-ops in `PatchRecorder`. | Internal spill paths using individual events are not reversible from the recorded patch. Formula-result/cache values and spill metadata must be coordinated in one generation-recovery policy. |
| Merge state and cleared cells | `mergeCells`, `cancelMerge`; direct `events.emit(merge-*)` | Merge add/remove has inverse operation. | `mergeCells` deletes non-anchor cell records, but the merge event contains only the region. Inverting the merge does not restore discarded values/formulas/styles/metadata. The state change is not wrapped in `runTransaction()` and does not reach `onMutation`. |
| Row/column visibility | `hideRow`, `showRow`, `hideCol`, `showCol`; direct public events | Event types map to inverse visibility operations. | Not sent to `onMutation`; recorder catches public events. The mutation methods do not use transaction batching/guard. Confirm idempotent and event behavior as part of a common journal contract. |
| Sheet protection, freeze panes, filters | Protection/freeze/filter setters emit direct typed public events | Patch types and inverse mappings exist for these event families. | Not observed by `TransactionContext`'s `onMutation` snapshot path and not buffered by `runTransaction()`. Validate event data ownership/cloning and clear-all filter behavior. |
| Row/column styles | `setRowStyle`, `setColumnStyle`; generic `sheet-mutated` via `_emitOrBuffer` | No patch operation; recorder default ignores `sheet-mutated`. | Mutations are visible to internal listeners only as an uninformative event, with no key or before/after state. |
| Conditional formatting, validation, header/footer | Set/add/clear APIs emit generic or specialized direct public events | No corresponding `PatchOp`; recorder ignores these event types. | No transaction journal record or rollback image. Some APIs bypass mutating-state enforcement and worksheet transaction batching. |
| Row heights / column widths | `setRowHeights`, `setRowHeight`, `setColumnWidth`; generic direct `sheet-mutated` | No patch operation and no `onMutation` event. | No reversible record; dimensions can change without a key or before-state. |
| Structural row/column changes | `insertRows`, `insertColumns`, `reorderRows`, `reorderColumns`; generic `sheet-mutated` after `remapWorksheetState()` | No patch operation captures the remapped cells, formulas, merges, dimensions, or graph state. | Large multi-store mutation has no inverse journal record. It also changes formulas/dependencies, so simply restoring cell values is insufficient. |
| Drawing layer | `insertImage`, `deleteImage`; generic `sheet-mutated` | No patch operation or before/after drawing payload. | Cannot restore the drawing layer from the event stream. `getDrawingLayer()` also exposes a mutable object surface that requires inventory/ownership treatment. |
| Hyperlinks | `setHyperlink`; emits cell-changed via `_emitOrBuffer` | Recorder sees a cell event, but the mapped patch operations only preserve value/formula (and potentially classify it as a same-value write). | Event capture is not a faithful hyperlink inverse; hyperlink presence/data is omitted from patch and first-write snapshot. |
| Comments, icons, custom components | `add/update/deleteComment`, `setIcon`, `setCellComponent`; direct typed events | Recorder explicitly ignores comments/cycle/sheet-mutated and has no patch operations for icon/component events. | No undo/rollback coverage. Cell-resident metadata may be lost by content-only restoration or `deleteCell`. |
| Cell deletion | `deleteCell`; direct `cell-changed` and possibly merge-removed events | PatchRecorder can observe public events and encode the old value/formula. | Whole stored cell is removed, while event/patch omit style, hyperlink, comments, icon, component and other metadata. The method bypasses `assertMutating()` and `runTransaction()`. |
| Workbook structure and identity | `Workbook.addSheet`, `deleteSheet`, `renameSheet`, active-sheet change | Outside worksheet recorder and transaction context. | No atomic rollback for directory order/name, stable ID allocator state, active sheet, or cross-sheet reference effects. This must be scoped in D4.3 against D4.1/D4.4 identity rules. |
| Snapshot replacement | `Worksheet.applySnapshot()` replaces stores in place after prevalidation; worker reset replaces the worksheet | Not represented as ordinary patch operations. | Must be treated as a separate staged-replacement operation with explicit transaction exclusion/ownership, not accidentally included as an unjournaled mutation. |

This audit is based on source event routes and patch-operation definitions; no runtime coverage campaign was run. It does not claim each listed surface is reachable from every public API, adapter, or UI path.

## 4. Rollback completeness, event visibility, and patch invertibility

### Rollback completeness

`TransactionContext.rollback()` computes a full forward patch from recorded events, applies its inverse, then restores formula metadata from first-write cell snapshots. The ordering is explicit in source, but completeness is bounded by recorder coverage and by what each patch operation stores. The code comments call the journal “authoritative” for direct worksheet calls; the implementation substantiates that only for mutation events delivered to the subscribed channels and represented by reversible operations.

Important concrete limitations:

- `TransactionContext` listens to `onMutation()` for cell snapshots, while `PatchRecorder` additionally listens to public events. Direct public events can be recorded without entering the cell snapshot journal.
- Several mutation families have no structured patch operation or are ignored by `PatchRecorder`; generic `sheet-mutated` cannot identify or reverse the changed state.
- Some operations have structured events but incomplete inverse payloads. In particular, merging discards non-anchor cell records, and deleting a cell removes more than the emitted content fields describe.
- Formula content restoration and graph reconstruction are coupled to setters/recalculation rather than captured as one complete before/after transaction state. The contract must specify whether graph dirtiness and cached formula values are journaled, rebuilt, or invalidated on abort.
- Rollback itself applies normal mutators and can emit public events. There is no transaction-wide event buffer around the rollback replay, so observers can see rollback steps as they occur.
- The worker's `reset` path intentionally calls `dispose()` and discards the old worksheet. This is safe only under replacement semantics; it cannot be treated as an abort that preserves old state.

### Observer visibility

`Worksheet._emitOrBuffer()` notifies internal mutation listeners synchronously before public event delivery. `runTransaction()` buffers events only while its own call stack is active, and most ordinary mutators create that scope independently. Consequently, a `TransactionContext` spanning several calls does not currently make direct worksheet observers wait until commit. Also, many setters emit straight through `events.emit()`, bypassing both internal mutation listeners and that per-call event buffer. `SpreadsheetEngine` does delay its own `cellsChanged`/`formulasEvaluated` events until recompute completes and buffers derived formula-result events, but this does not establish a shared multi-sheet transaction observer contract.

The design must decide which observer boundary is authoritative: all worksheet/workbook public events, engine-level events, worker responses, or a specified combination. Required semantics include whether rollback is silent, emits one abort/rollback summary, or publishes a committed inverse event batch. Intermediate values must not be externally reported as committed/current.

### Patch invertibility

`invertPatch()` correctly reverses operation order and swaps stored before/after values for operation families whose payloads are complete. That algebraic property is not equivalent to complete worksheet-state invertibility. The patch format currently omits dependency graph state, row/column styles, conditional formatting, validation, dimensions, drawings, comments/icons/components, and workbook directory/identity state. It has no structural row/column insertion/reorder operation. Some recorded event families do not preserve enough state for inversion.

For D4.3, patches may remain the representation of user-authored undo history, but the transaction journal must not assume that the current `WorksheetPatch` is a complete rollback image. CS-001C must determine whether to make one journal richer, compose structured mutation records with a single owned state checkpoint, or constrain transaction-eligible operations. It must not introduce a second independently authoritative journal.

## 5. Reconciliation with D4.5/D4.6 failed-generation recovery

The current `SpreadsheetEngine.run()` sequence is: open `TransactionContext`; execute callback; commit and clear `_txn`; derive dirty addresses; schedule/recalculate; publish engine events. If evaluation throws after commit, the catch path has no `TransactionContext` to roll back. It invalidates scheduler work and discards buffered formula-result events, but formula results already written by `applyCalculatedValue()` remain in worksheet cells. Thus an observer may not receive the intermediate result event while subsequent reads can still encounter cache writes from the failed generation. The implementation does not mark those partial caches as current through a generation token.

`EngineWorkerHost.commitTransaction()` has the same irreversible boundary shape: it clears the open transaction before calling recalc. It currently supplies a no-op evaluator, and if commit/recalc/assertion throws, it has no retained transaction object or cache checkpoint in the host path.

D4.5 and D4.6 require an explicit joint recovery rule. The contract should distinguish:

1. **Mutation abort before commit:** restore the pre-transaction workbook state, including every supported worksheet/workbook mutation, graph/dirty state, and event visibility.
2. **Evaluation failure after mutation commit:** the product must choose whether the mutation commit itself is durable while formula caches are restored to the last committed generation, invalidated and recomputed, or handled by another explicit policy. It must specify read semantics during recovery and prevent partial results from being considered current.
3. **Publication:** only publish a successful generation after the selected recovery/commit conditions hold; suppressing result events alone is insufficient.
4. **Recovery failure:** define a terminal/retryable workbook state if restoring or invalidating the generation itself fails. Do not claim atomic rollback unless the recovery action is verifiable.

The source evidence does not establish which policy is correct. That is a CS-001C decision requiring review, in coordination with D4.5; this assessment does not select one.

## 6. Required CS-001C contract decisions before D4.3

The next CS-001C design deliverable should resolve these points using the source gaps above:

1. Name the **single authoritative mutation journal** and define its ownership/lifetime across all worksheet calls in one workbook transaction. Specify how existing `PatchRecorder`, `TransactionContext`, patch undo/redo, and the experimental coordinator relate to it. Keep the experimental coordinator non-exported and do not let it become a competing source of truth.
2. Define the supported mutation surface for atomic transactions. For every public mutator, specify structured before/after capture, rollback behavior, event behavior, and whether the API is forbidden during a transaction. Include structural edits, merge side effects, cell metadata, spill state, snapshot replacement, and workbook sheet/identity operations.
3. Define observer visibility and event coalescing across multiple sheets: no transient commit publication; deterministic event order; one post-commit aggregate or an explicit event list; abort/rollback visibility; and whether formula-result events are included in the same publication boundary.
4. Define rollback mechanics and proof obligations: reverse journal replay or checkpoint restore; restoration of formula/dependency graph state; patch composition/inversion relation; failure during rollback; idempotence or terminal state; and how undo/redo remains distinct from transaction rollback while sharing the journal.
5. Define the mutation commit versus calculation-generation boundary jointly with D4.5/D4.6, including partial cache recovery after at least one formula result is committed, stale generation invalidation, dirty ownership, retry/read semantics, and event suppression/publication.
6. Define workbook scope: multi-sheet owner identity, sheet add/delete/rename and ID allocation behavior, independent workbook isolation, nested/concurrent transaction rejection, and ownership of workbook-level pivot/reference metadata.
7. Specify the worker/engine adapters that will consume this contract. The single-sheet worker's no-op recalc path must not be treated as formula-complete transaction verification.
8. Map every decision to deterministic acceptance scenarios and retained evidence under D4.6. Preserve the frozen historical 105-failure set as reference-only; it is not a substitute for transaction-specific correctness gates.

## 7. Assessment disposition and next ticket

**Disposition:** CS-001C is a genuine architecture dependency. The current implementation demonstrates one-sheet transaction mechanics and useful event-derived patch capture, but does not establish complete rollback coverage, transaction-wide event isolation, or failed-generation cache recovery. The work should proceed as a reviewed contract, not by expanding current rollback code speculatively.

**Next focused deliverable:** CS-001C — Authoritative Mutation Journal and Workbook Transaction Foundation contract. It should close the decisions in §6, then return for review and acceptance. Only after CS-001C is accepted should CS-002D4.3's detailed transaction specification proceed.

No code or test files were changed. No tests, builds, benchmarks, security checks, browser runs, or baseline captures were run. The accepted CS-002C historical 105-failure identity reference was not modified or rerun; the separate 138-failure CS-000F.4 capture was not used as a substitute.
