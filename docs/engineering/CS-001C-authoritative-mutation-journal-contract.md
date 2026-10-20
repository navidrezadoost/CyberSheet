# CS-001C — Authoritative Mutation Journal and Workbook Transaction Foundation

**Status:** Contract design · ready for review · **Priority:** P0

**Reported:** 2026-10-17

**Predecessors:** CS-001C gap assessment accepted; CS-002D4.1/.2/.4/.5/.6 designs accepted

**Dependency:** CS-002D4.3 remains blocked until this contract is reviewed and accepted

**Implementation:** Not authorized in this ticket

## 1. Purpose and normative language

This contract defines the single mutation journal and transaction guarantees required before a workbook-wide transaction can be specified in D4.3. It reconciles the current `TransactionContext`, `PatchRecorder`, `WorksheetPatch`, `SpreadsheetEngine`, `EngineWorkerHost`, and workbook ownership boundaries.

“MUST”, “MUST NOT”, and “SHOULD” are normative requirements for subsequent design and implementation. This document is design only: it adds no production behavior, tests, baseline evidence, or authorization to implement.

The authoritative source audit is [CS-001C-gap-assessment.md](CS-001C-gap-assessment.md), supplemented by the public worksheet inventory in [CS-001C-mutation-inventory.md](../architecture/CS-001C-mutation-inventory.md). The accepted D4.5 scheduler and D4.6 verification contracts remain governing at their respective boundaries.

## 2. Contract decisions

1. **One journal:** one workbook-owned `MutationJournal` session records all transaction-eligible user mutations. It replaces event inference as the completeness mechanism. Existing `TransactionContext` owns begin/commit/abort lifecycle; `PatchRecorder` is evolved into or adapted as the journal’s patch projection, never run as a second independent source of truth. The experimental coordinator remains non-exported and MUST NOT own a parallel journal.
2. **Write-ahead capture:** every supported mutation MUST record its complete before-state and intended after-state before the first state write. State changes MUST NOT be reconstructed solely from after-events. The record identifies its workbook and sheet owner, operation kind, order, and complete restoration scope.
3. **Closed mutation surface:** every public worksheet and workbook mutator is either journal-supported with a complete inverse/checkpoint record or explicitly rejected while a transaction is open. No unjournaled mutation may silently participate in an atomic transaction.
4. **Observer isolation:** transaction observers see no intermediate mutation state. A successful mutation commit publishes one ordered workbook-level commit batch after every sheet and workbook record is durable. An abort publishes no user-mutation commit event. Formula-generation success/failure is reported separately from mutation commit.
5. **Rollback:** abort before mutation commit replays the journal in reverse order, or restores its recorded before-images, until the complete logical workbook state is restored. If restoration fails, the workbook enters a failed/poisoned state and rejects normal reads that claim current state and all further mutations until explicit reset or staged restore.
6. **Calculation failure after commit:** the user mutation remains committed. The failed calculation generation is not committed; every cache write from it is restored to the last accepted generation (including “no prior cache”), the affected formulas remain dirty, and the workbook is marked calculation-stale until a later generation succeeds. A failed generation MUST NOT publish formula-result events or be exposed to the binder as current cache state.
7. **Workbook scope:** one transaction owner spans all participating worksheets plus workbook-owned sheet directory, identity allocation state, pivot/reference metadata, and event publication state. Nested or concurrent mutation transactions for the same workbook are rejected. Other workbooks remain isolated.
8. **Adapters and verification:** engine and worker adapters consume this same journal/session contract. They MUST NOT maintain an independent inverse stack as the rollback authority. D4.6’s frozen 105-identity comparison remains unchanged and reference-only; transaction correctness has its own deterministic acceptance gates.

## 3. Journal ownership and relationship to existing components

### 3.1 One authority

The design’s logical authority is a single ordered `MutationJournal` owned by the workbook transaction context. There is one session and one record sequence across all sheets in that workbook transaction. The journal is populated at mutation boundaries before state changes, not by observing whichever events happen to be emitted afterward.

The existing types map to that ownership as follows:

| Existing component | Contract role |
| --- | --- |
| `TransactionContext` | Compatibility façade for a one-sheet transaction and, after workbook adoption, lifecycle adapter over the single workbook transaction journal. It MUST NOT maintain a second first-write snapshot journal. |
| `PatchRecorder` | Existing event-based capture is incomplete. It MUST cease to be an independent source of rollback truth. Its future role is either the concrete implementation of the authoritative journal after it gains write-ahead coverage, or a projection/adapter that receives already captured journal records. |
| `WorksheetPatch` / `invertPatch` | User undo/redo representation for the mutation families it can faithfully express. It MAY be projected from journal records, but it is not assumed to represent the full rollback state. Unsupported/incomplete operation payloads MUST NOT be treated as complete transaction inverses. |
| `recordingApplyPatch` | Patch application adapter. Applying a patch inside a transaction must feed the same journal through mutation boundaries; its separately collected per-operation inverses MUST NOT be the rollback authority. |
| Experimental workbook coordinator | Remains non-exported. It may inform design, but MUST NOT independently record mutations, decide rollback state, or compete with the accepted journal. |
| D4.5 scheduler | Consumes the committed mutation set as recalculation seeds. It owns calculation generations and dependency ordering, not mutation history or rollback. |

The concrete class and module names remain implementation choices, but the ownership rules above do not. Existing direct `onMutation()` and public event subscriptions may continue for notifications or projections; they cannot substitute for pre-write journal capture.

### 3.2 Record shape and lifetime

Each journal entry MUST contain enough typed information to reverse or restore its operation without asking the already-mutated worksheet for the old state. At minimum it carries:

- owning `WorkbookId` and, when applicable, stable `WorksheetId` under D4.1;
- deterministic transaction-local sequence number;
- operation discriminator and validated target coordinates/keys;
- complete before-state and after-state, or a bounded before-image plus the exact affected state scope;
- dependency/graph effects where the mutation changes formula ownership or coordinates;
- the event projection needed to publish a deterministic commit batch.

The journal starts before the first user mutation and remains active through callback validation and mutation commit/abort. Calculation cache writes are not user-mutation entries; they belong to the D4.5 calculation-generation checkpoint described in §7. A journal session is consumed exactly once. Disposal without rollback is permitted only when the owning workbook is being discarded/replaced and the API explicitly promises replacement semantics.

## 4. Mutation coverage and transaction eligibility

The transaction boundary is closed-world: absent an explicit exemption below, a public mutator MUST either produce a complete journal record before changing state or reject the call before any write. The existing inventory enumerates current `Worksheet` methods; implementation review must keep it synchronized with the actual exported surface.

| Mutation family | Required journal scope / transaction rule |
| --- | --- |
| Cell values, formulas, clears, `deleteCell` | Capture full cell presence and all content/metadata fields, prior formula, dependency registrations, volatility registrations, and dirty propagation state. Formula replacement/clear must reverse both old and new graph ownership. |
| Cell, row, and column styles | Capture exact prior style state and target allocation/presence. Style interning may remain shared, but rollback must restore visible worksheet state and not leave mutable aliases. |
| Spill state and calculated-array materialization | User-authored formula changes enter the mutation journal. Derived spill/cache writes are part of a calculation generation, with checkpoint/recovery under §7. Standalone spill mutations, if publicly allowed in a transaction, require complete source and child before-images. |
| Merges and unmerges | Capture the merge index plus every full cell record that merge creation removes or changes. Inverse merge geometry alone is insufficient. |
| Row/column visibility and filters | Capture each affected key and exact prior entry; `clearAllFilters` is a deterministic ordered set of individual before-images or one complete map image. |
| Protection, freeze panes, header/footer, conditional formatting, data validation | Capture the full prior settings/rules/entry, not only a generic `sheet-mutated` event. Replace/add/remove operations must preserve order and distinguish absent from empty/null values. |
| Row heights, column widths | Capture each dimension entry and whether the value was explicitly stored or inherited from the default. Batch methods record all changes as one ordered transaction unit or equivalent entries. |
| Sort and structural row/column edits | Capture complete affected region/store state and formula/reference/dependency remapping, dimensions, merges, spills, visibility, metadata, and graph state. Until that inverse is fully defined and reviewable, these operations are rejected during atomic transactions. |
| Hyperlinks, comments, icons, custom components, drawings | Capture full prior metadata/object and stable identity. Mutable drawing-layer access must be mediated or rejected during an open transaction; a generic event cannot journal changes made through a returned mutable object. |
| Worksheet identity and workbook directory | Capture add/delete/rename, order, active-sheet selection, ID ownership, and associated metadata under the D4.1 identity rules. Rollback of an add removes the sheet; rollback of delete restores it and its ID; rename preserves ID. |
| Pivot and reference metadata | Any workbook-owned metadata mutation participating in workbook consistency must journal its complete owner/key/definition state. If not yet supported, reject it during a transaction that can affect its source/target sheets. |
| Snapshot replacement / progressive load | `applySnapshot` and progressive loading are staging/replacement operations, not ordinary transaction mutations. They MUST be excluded from an open user transaction or performed by the owning staged-restore protocol (D4.4); partial replacement MUST never be exposed. |
| Recalculation internals and graph service methods | Not callable as user mutation operations. They are authorized only within their engine/scheduler phase and update derived generation state, not the user mutation journal. Direct calls that can alter graph/dirty state must be made internal or guarded. |

No mutator is “covered” merely because it emits an event. In particular, generic `sheet-mutated` is an invalid journal record because it lacks target and before-state. The implementation may initially reject high-risk categories such as structural edits; those rejections must happen before any side effect and be visible as stable API errors.

### 4.1 Allocator rule

Worksheet ID allocation follows D4.1’s stable identity and high-water-mark semantics. Aborting creation removes the uncommitted sheet and directory entry, but MUST NOT reuse an ID that was already allocated and exposed internally during that transaction. The allocator high-water mark is monotonic; gaps are allowed. A failed transaction does not cause a stale ID to resolve to another worksheet.

## 5. Event and observer contract

### 5.1 Before commit and abort

While a transaction is open, reads made by the transaction owner see its working state. External observers—including sheet listeners, workbook listeners, worker clients, formula binders, and renderer/event bridges—MUST NOT observe intermediate user mutations as committed state. Internal journal hooks and scheduler invalidation signals are not external publication.

If callback validation or mutation application fails before commit, the journal restores the pre-transaction logical state and the transaction emits no `mutationCommitted` event. It may emit a single `transactionAborted` diagnostic after rollback completes; that notification contains no partial cell values. If rollback fails, emit/return a terminal failure status and poison the workbook as specified in §6.4.

### 5.2 Mutation commit and calculation result are separate publications

On successful mutation commit, publish one deterministic ordered commit envelope containing the workbook transaction ID, affected sheet IDs, journal-derived mutation summaries/patch projections, and a status that formula results may still be pending. The mutation commit is durable even if calculation later fails.

Formula-result events are published only when the entire associated calculation generation is accepted. No cell-by-cell derived result events escape before generation commit. A failed generation emits one calculation-failed/stale status event with generation ID and diagnostic, not a partial result batch. A later successful recovery generation publishes its own complete formula-result batch.

Event ordering is stable by journal sequence for user mutations and by D4.5’s deterministic `(WorksheetId, cell key)` order for derived results. Adapters must not publish the same logical mutation once as a journal commit and again as an uncorrelated raw worksheet event.

### 5.3 Read visibility

The transaction owner may read its staged working values. Other callers read the last committed user-mutation state. After a calculation failure, formula cached values are restored to the last accepted generation; the workbook exposes that calculation state as stale/pending and MUST NOT present those caches to workbook formula evaluation as current. Reads must expose calculation status separately from the cached scalar so existing `FormulaValue` remains unchanged; callers requiring current values use an explicit status-aware workbook read or wait for a successful generation. Formula binders must reject/withhold stale caches rather than recursively evaluating them.

## 6. Rollback mechanics and guarantees

### 6.1 Abort before mutation commit

The journal is write-ahead and ordered. Abort reverses entries in strict reverse order, including all worksheet and workbook-owned effects, and restores graph registrations/dirty ownership to the pre-transaction state or rebuilds them deterministically before the workbook becomes readable. A transaction cannot report rollback success until all logical before-state is restored.

The implementation may use typed inverse operations, before-images for complex operations, or both inside the one journal. Large structural operations may use one bounded snapshot entry for the affected store/region; this is still part of the same authoritative journal, not a second independent journal. Whole-workbook D4.4 restore remains a separate staged replacement flow.

Rollback must be deterministic and idempotent at the transaction API boundary: a consumed transaction cannot be committed/aborted twice, and a repeated abort request returns the recorded terminal outcome without replaying mutations a second time. Any failure during actual inverse application transitions to `rollback-failed`; the owner MUST NOT continue with normal reads or mutation on potentially mixed state.

### 6.2 Patch and undo/redo relationship

The committed journal may produce a user-facing `WorksheetPatch`/workbook patch only when every included operation is expressible without data loss. Undo/redo applies a new user transaction through the same write-ahead journal, so a failing patch application is atomic. Undo history is not the mutation journal itself and can be discarded independently. The inverse used for transaction abort is derived from authoritative journal entries, never from a patch that omitted fields.

Patch projection MUST either reject unsupported operation kinds or extend its schema with complete state. Silently omitting an operation from a committed patch is forbidden when consumers rely on that patch for replication, audit, or undo.

### 6.3 Formula/dependency graph restoration

The pre-transaction formula text, local and qualified dependency ownership, volatile registration, and dirty state are part of logical mutation rollback. On abort they must return to the prior graph revision. A graph rebuild from restored formulas is acceptable if deterministic, complete for all supported reference forms, and finished before external visibility resumes. Formula result caches are governed by calculation-generation state, not folded into the user patch.

### 6.4 Failed rollback state

If inverse replay or graph restoration fails, mark the workbook `rollback-failed`/poisoned, reject normal mutations and reads that claim committed/current state, and allow only diagnostic inspection plus explicit reset or validated staged restore. Do not emit a successful abort or mutation-commit event. Preserve the original mutation error and rollback error in diagnostics.

## 7. Mutation commit and calculation-generation recovery

### 7.1 Chosen policy

**Mutation commit is durable independently of calculation success.** Once the callback has completed, the journal validates, and all intended user/workbook mutations are applied, the user mutation commits. Recalculation is a subsequent generation. A failure during that generation does not roll back the user edits.

This policy is chosen because it separates the atomicity of authored changes from the consistency of derived values, follows the review’s recommended direction, and gives the scheduler a stable committed input set to retry. It replaces the current ambiguous one-sheet behavior where `_txn` is consumed before calculation but partial results can remain.

### 7.2 Generation checkpoint and failure handling

At generation start, the scheduler captures a cache checkpoint for every formula result that the generation may overwrite, including cache presence/absence and any associated spill materialization. Checkpoint ownership belongs to the calculation generation and is distinct from the user mutation journal. The D4.5 scheduler owns the generation ID and stale-result validation.

If evaluation fails after one or more writes:

1. Stop accepting results for the failed generation and reject late worker results by generation/task/formula revision.
2. Restore every overwritten derived cache and spill effect to its last accepted-generation state, including removing values for formulas with no prior accepted result.
3. Keep the committed user edits and committed formula text. Preserve dirty state for the failed formula closure and mark workbook calculation status `stale` with the failed generation ID.
4. Do not publish any formula-result events from the failed generation. Publish the mutation-commit event if it has not already been delivered, plus one calculation-failure status.
5. Permit a later retry as a new generation over the same committed workbook inputs. Mark caches current and publish derived results only after all required tasks/SCC decisions complete and the generation commit succeeds.

The cache checkpoint MUST be taken before first overwrite, include full `FormulaValue`/spill values, and remain available until generation commit. Reconstructing “last good” caches from mutated formulas after failure is not acceptable. A generation checkpoint is not a second user-mutation journal: it is scoped only to derived outputs and is owned and consumed by the scheduler.

### 7.3 Failure during cache restoration

If cache restoration fails, the workbook becomes calculation-unavailable/poisoned. Workbook formula binding and reads requiring current formula values are rejected or return the explicit stale status; they must not silently consume partially restored values. Reset or D4.4 staged restore is required before normal calculation resumes. No successful generation or result event is emitted.

### 7.4 Volatile and blocked formulas

Volatile formula seeds and cycle/SCC outcomes are part of the generation plan. A failed generation retains the same committed user mutation set, keeps all affected formulas dirty, and does not publish partial SCC/blocked-descendant results. A retry obtains a new generation ID and recomputes from the accepted formula graph. D4.5’s deterministic SCC and generation rules remain controlling.

## 8. Workbook scope, identity, and concurrency

The transaction owner is the workbook identity, not a worksheet name or one sheet instance. Every participating worksheet and workbook metadata store is reached through that owner. A journal record from one workbook MUST be rejected by another workbook even when both contain the same sheet name or coordinates.

- **Add sheet:** allocate an owner-scoped ID; journal directory/order/active-sheet effects; abort removes the sheet and leaves the allocator high-water mark advanced.
- **Delete sheet:** journal the complete sheet ownership/state needed for restoration and the directory/active-sheet changes. References to deleted IDs follow D4.2/D4.5 error and dependency semantics after commit; abort restores the original ID and bindings.
- **Rename sheet:** journal the display-name directory change; stable `WorksheetId` and bound references remain unchanged under D4.1/D4.2.
- **Pivot/reference metadata:** metadata keyed by sheet ID participates in the same transaction when a sheet mutation changes its owner, source, or lifecycle. Legacy name migration follows D4.1/D4.4; a transaction cannot leave metadata pointing to a deleted/replaced owner.
- **Concurrency:** at most one open mutation transaction per workbook. Nested begins and overlapping transactions are rejected before executing callbacks. Different workbook owners may transact independently. A mutation during a committed calculation generation follows D4.5 invalidation and is serialized into a later transaction/generation; it cannot race a pending generation’s cache writes.
- **Snapshot restore:** staged restore remains D4.4-owned. It constructs and validates an isolated candidate workbook and swaps ownership only after complete success; it does not partially participate in a normal mutation transaction.

## 9. Engine and worker integration boundary

`SpreadsheetEngine` and worker APIs must call the same transaction owner and journal semantics. They may adapt callback/RPC requests into journal operations but may not maintain independent inverse histories for rollback.

The single-sheet `EngineWorkerHost` remains a compatibility adapter only. Its current `ws.recalc(() => {})` path does not evaluate formulas and cannot satisfy workbook transaction calculation gates. Worker `reset` may dispose a transaction only because it replaces the entire host worksheet; ordinary errors must abort through the authoritative journal.

Engine lifecycle becomes conceptually:

```text
begin workbook journal
  -> apply all user/workbook mutations with write-ahead records
  -> validate and commit mutation atomically; publish mutation commit
  -> start calculation generation with derived-cache checkpoint
  -> accept all current results and commit generation; publish results
     OR restore checkpoint, keep inputs committed/dirty, publish stale failure
```

This contract does not choose concrete public method signatures or transport envelopes. D4.3 will specify the detailed transaction API, event payloads, and integration order after CS-001C acceptance.

## 10. Deterministic acceptance matrix

These are required future implementation gates, not tests run by this design.

| Area | Scenario | Required result |
| --- | --- | --- |
| Journal ownership | Direct worksheet APIs, `applyPatch`, and multiple sheets mutate in one transaction | One ordered journal covers all changes; no separate inverse stack determines rollback; one commit envelope. |
| Complete mutation coverage | For every method in the worksheet inventory, mutate then abort | Complete pre-state equality including metadata, graph/dirty state, workbook directory, IDs, pivots, and drawings; or deterministic pre-write rejection for explicitly unsupported methods. |
| Write-ahead failure | Inject an exception after a mutation begins but before completion | Either mutation remains unstarted or journal inverse restores full pre-state; no partial event is published. |
| Events | Attach sheet, workbook, engine, and worker observers; perform multi-sheet edits then commit/abort | No observer sees intermediate writes; commit has deterministic order; abort has no commit event; rollback failure is terminal and explicit. |
| Patch projection | Round-trip every supported operation through forward patch, inverse, redo | Complete state equality including formula metadata and side effects; unsupported projections fail explicitly. |
| Merge/delete metadata | Merge cells containing distinct values/styles/metadata, then abort; delete populated/annotated cell, then abort | Every removed cell record and metadata field is restored. |
| Structural changes | Insert/reorder rows or columns with formulas, ranges, merges, and dimensions; abort | Full coordinates, formulas, dependency graph, metadata, and dimensions return to pre-state, or operation is rejected before mutation. |
| Formula rollback | Replace/clear formulas, register volatile formulas, then abort | Formula strings, old local/qualified edges, volatility, dirty state, and caches are consistent with the pre-transaction graph. |
| Multi-sheet isolation | Same sheet names/coordinates in separate workbooks; commit/abort across two sheets in one workbook | No cross-workbook journal contamination; both sheets commit or abort together. |
| Identity lifecycle | Add/delete/rename sheets; abort and retry; restore/import workbook | Rename preserves IDs; delete/abort restores same ID; allocated IDs are never reused; imports get fresh target-owner IDs per D4.1/D4.4. |
| Calculation failure | Fail evaluator after at least one formula result write | User input/formula edits remain committed; every partial result/spill write reverts to last accepted generation; affected nodes remain dirty/stale; no result event leaks. |
| Cache recovery | Retry failed generation successfully and deliver late results from prior generation | Only current-generation, matching revision results commit; stale results cannot write, clear dirty state, or emit events; success publishes once. |
| Rollback/recovery failure | Inject failure during journal rollback and cache checkpoint restore | Workbook enters respective poisoned/unavailable state; no success event; ordinary reads/mutations reject until reset/staged restore. |
| Worker contract | Execute equivalent transaction through engine and worker adapters | Same commit, abort, event, and failure semantics; no-op worker recalc is marked unsupported for formula-complete acceptance. |
| Reproducibility | Run deterministic gates under D4.6 artifact protocol | Retain commands, environment, raw Jest JSON, identity comparison, focused transaction results, checksums, and gate status; no missing gate is marked pass. |

## 11. Review boundary and next authorization

This contract settles the eight CS-001C architecture areas at the design level, including the previously unresolved policy for post-commit calculation failure. The contract is now ready for engineering review. Review should focus on the correctness and cost of full cache checkpoint restoration, the explicit closed mutation surface, and the distinction between durable mutation commit and current calculation state.

Upon acceptance, CS-001C can close its contract-design dependency and D4.3 may be separately authorized to define detailed workbook transaction APIs and integration mechanics. Acceptance of this document alone does not authorize implementation. The original nine-phase recovery roadmap remains governing; the frozen 105-failure set remains reference-only.

No production code or tests were changed. No tests, builds, benchmarks, browser/security runs, or baseline captures were run. The historical 105-failure reference and the separate 138-failure CS-000F.4 inventory were not modified or rerun.
