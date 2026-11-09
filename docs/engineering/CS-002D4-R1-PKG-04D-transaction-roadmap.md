# CS-002D4-R1 PKG-04D — Transaction Coverage Roadmap

**Purpose:** Sequence the remaining D2-11 mutation families by dependency closure and rollback correctness.
**Status:** Planning only. No mutation API, production implementation, or contract outcome is authorized by this roadmap.
**Baseline observed:** `HEAD` `88b09634f17f3b39d88a88c5428f76b426459a2b`; `git status --short` reported 398 dirty paths. Existing shared-worktree changes are preserved.
**Production transaction strategy:** Incremental Journal. Snapshot is a comparison path selected through existing test hooks, not a production fallback.
**Overall CS-002D4-R1:** WITHHELD.

## Decision basis

The current Workbook transaction API has seven operations: five cell/content/style operations plus row height and column width. Their successful integration and tested rollback cover a bounded cell-write and dimension slice; they do not make every Worksheet store transactional. PKG-03B's single-comment deletion remains the best next operation candidate because it touches one existing CellRecord comment collection, has an existing Worksheet event and Workbook bridge, and does not intentionally write formula, visibility, style, dimension, drawing, CF, or Pivot state. It still requires the exact-state and contract gates listed below.

The sequence is not a ranking by implementation size. It closes one bounded rollback surface at a time, then introduces independent stores, and leaves cross-store/composite and durable operations until their ownership and failure semantics can be tested end to end.

## Recommended sequence

| Sequence | Scope | Why this position | Gate before implementation |
| ---: | --- | --- | --- |
| 0 | Finish PKG-04A/B/C/R for one-comment deletion | This is the smallest candidate with an existing owner capability and event bridge. The package should converge specification, reusable acceptance evidence, owner decisions, and integrated readiness rather than create another planning loop. | Exact comment graph behavior and detached before-images; Journal/Snapshot fault parity; API-owner approval; explicit implementation authorization; applicable D5 decision. |
| 1 | Transactional deletion of one comment, with fixed `deleteReplies=true` | One cell address, one existing state field, one existing event lineage. Establishes a bounded new operation and validates that the cell-record rollback mechanism can own nested comment values. | Pass PKG-04 acceptance matrix. Do not include comment add/update, history, persistence, or Application forwarding. |
| 2 | Single-axis visibility transition (choose one of row hide/show or column hide/show as an operation contract) | Independent `VisibilityStoreV1` membership state, relatively small before-image, and existing typed events. A single transition proves a new store owner without conflating bulk/group visibility. | First characterize all four existing standalone transitions, event frequency/order, hidden-row consumer effects, snapshot and codec behavior. Define typed Workbook event authority/payload and exact idempotence policy. |
| 3 | Comment add/update as separate operations | Reuses comment storage and event names but has different mutation mechanics: add mutates the array and allocates ID/time; update replaces an element and changes `editedAt`. A delete proof does not establish their before-image or creation semantics. | Decide ID/timestamp determinism, duplicate/missing ID behavior, reply-parent invariants, deep nested value policy, and exact rollback for in-place mutations. Test each operation separately before considering a shared comment helper. |
| 4 | Conditional-formatting state, initially one explicitly bounded replacement or clear operation | Independent `#conditionalRules` state consumed by Core evaluation and renderer caches. The rule graph contains nested ranges/formula data, so a superficial array copy is insufficient. | Choose one operation and clone/equality contract; establish formula evaluation and renderer invalidation observers; verify Journal and Snapshot restore detached rule state with no cache leakage. No generalized CF transaction abstraction yet. |
| 5 | Formula/volatile scheduling changes outside the existing cell-write slice | The existing five cell operations already exercise some graph and volatile membership behavior. A new scheduler mutation is not merely a CellRecord write and may change dirty queues, registrations, calculated values, and asynchronous worker state. | Inventory one concrete entrypoint and lifecycle first; define cancellation/generation behavior and complete scheduler/graph before-image; test recalculation success/failure and post-commit behavior before adding a distinct operation. |
| 6 | Drawing object mutation | DrawingLayer state, object identity, renderer subscriptions, loaded image resources, and canvas publication span Core and renderer lifecycles. Rollback of object data alone may leak or dispose live resources. | Separate resource lifecycle contract; choose one drawing operation; specify ownership of image acquisition/disposal and renderer notification; test failure before/after resource allocation and publication. |
| 7 | Structural insert/delete (rows, columns, or sheets), one structural family at a time | Composite remapping touches cells, formula references, dimensions, visibility, merges, filters, comments, drawings, and Pivot source ranges. It cannot be treated as a dimension setter or composed safely before the dependent stores have transaction coverage. | Freeze structural invariants and reference rewrite policy; inventory every affected owner; establish whole-operation detached snapshot or complete reverse journal, stable identity, and invariant checking under both paths. Do not begin until component mutation families are characterized. |
| 8 | Pivot source invalidation/recompute integration | Pivot registry/index, group accumulators, recompute engine, last-good snapshots, freshness metadata, and source observers are separately mutable. Prior recovery work addresses selected recompute failures, not inclusion in source-transaction rollback. | Define D3 stale-result/read policy and source-transaction boundary; identify a reversible or safely deferred refresh model; test source failure, partial refresh, snapshot publication, and recovery as one integrated lifecycle. |
| 9 | Workbook history / undo-redo | History is a new retained state owner and replay contract, not an incidental side effect of FIFO transaction rollback. It needs identity, ordering, event, memory-retention, and replay-failure rules. | Approve whether history belongs to the mutation transaction or a higher command layer; define retention limits, undo/redo publication, reentrancy, and recovery behavior. Verify exact operation inverses for each admitted operation. |
| 10 | External host persistence/checkpoints | Durable file replacement and host checkpoint state cannot be rolled back by an in-memory Worksheet journal. Host APIs, partial writes, safe replacement, and crash recovery define a distinct failure domain. | Specify host capability and durable protocol, safe candidate/replace semantics, validation, prior-checkpoint retention, cancellation and crash cuts; verify each supported host/format. Do not claim Core transaction atomicity provides file atomicity. |

The order after visibility is a dependency roadmap, not a promise that every numbered item must finish before another can begin. PKG-04R may adjust sequencing if its evidence shows independent closure. Composite structural and Pivot work remains behind its prerequisite owner and contract decisions even if implementation appears locally small.

## Bounded versus composite work

**Potentially bounded as a single operation:** one-comment delete; one visibility transition; one narrowly defined CF list replacement; one specific comment add or update after its own semantics are fixed. Each still needs an independent Journal before-image, Snapshot reference state, staged event list, and failure-cut matrix. Sharing the Workbook queue/commit/publication machinery does not imply shared state restoration.

**Composite or cross-boundary:** structural insert/delete; drawing mutation with renderer resources; formula/volatile scheduler transitions; Pivot invalidation/recompute tied to a source transaction; external persistence; and history. These require explicit coordination across state owners or a new lifecycle contract. They must not be made “bounded” by hiding multiple owners behind one API name.

## Reuse limits

Safe reuse includes the existing per-Workbook FIFO, revocable transaction context, preflight/apply/commit boundary, event buffering, listener isolation, recovery-required transition, and the seven-operation test harness. Reuse is infrastructure, not evidence that a new state family is rollback-safe.

Every new family needs its own first-touch before-image for Journal and an independently captured/restored reference state for Snapshot. Both must preserve sparse absence where meaningful, object/identity semantics, event counts/order within a surface, and the no-publication-on-rollback rule. Cross-surface total callback order remains unspecified unless the applicable owner-approved contract says otherwise. Do not let Snapshot call Journal restore or silently expand the seven-operation Snapshot state into an unbounded whole-Workbook copy.

## Evidence and governance gates

1. Reconcile PKG-04A comment contract, PKG-04B executable readiness, and PKG-04C decision status in PKG-04R.
2. Require explicit API-owner approval of the operation semantics and a separate implementation authorization. A technically complete test plan is not authorization.
3. Confirm any event contract needed by the operation. No Application forwarding is implied; D5-05 remains a separate authority/schema issue. D5-01 approval status must follow its decision record.
4. For each implementation package, run the relevant transaction/event selection, both Journal and Snapshot failure cases, typecheck and hygiene when tests change, `git diff --check`, and protected sidecar verification when Jest is run. Do not claim the full Core suite or Workbook-owned Pivot integration is green from bounded selections.
5. Keep global D2-11 unresolved until every family and cross-family effect in the authoritative inventory has an explicit owner, before-image, publication boundary, and tested failure model.

## Source and prior evidence

- [PKG-03B operation priorities](CS-002D4-R1-PKG-03B-operation-priorities.md) and [next operation design](CS-002D4-R1-PKG-03B-next-operation-design.md).
- [PKG-03B D2-11 coverage map](CS-002D4-R1-PKG-03B-D2-11-coverage-map.md).
- [PKG-02C state ownership audit](CS-002D4-R1-PKG-02C-state-ownership-audit.md).
- [Authoritative D0–D7 contracts](CS-002D4-R1-authoritative-contracts.md), especially D2-11 and D5-01/D5-05.
- Current operation owners: `packages/core/src/workbook-access-types.ts`, `packages/core/src/workbook.ts`, `packages/core/src/worksheet.ts`, `packages/core/src/storage/VisibilityStore.ts`, `packages/core/src/eventBridge.ts`, `packages/core/src/PivotRecomputeEngine.ts`, `packages/core/src/PivotSnapshotStore.ts`, and `packages/core/src/persistence/SnapshotCodec.ts`.

This roadmap changes no source, test, ledger, frozen register, authoritative contract, or persistence format. It authorizes no operation. Overall CS-002D4-R1 acceptance remains **WITHHELD**.
