# CS-002D.4 — Implementation Readiness Assessment

**Status:** Source-grounded design reconciliation · R0/R0.1 closed for source-accounting scope · implementation readiness not established · **Priority:** P0

**Reported:** 2026-10-17

**Authorization:** Readiness assessment and documentation reconciliation only. No implementation, test/build execution, baseline capture, merge, or release is authorized.

**Accepted designs:** D4.1 identity, D4.2 typed binding, D4.3 transaction integration, D4.4 manifest/migration, D4.5 scheduler, and D4.6 adoption gates. CS-001C design is accepted; its production guarantees are not implemented or verified.

## 1. Executive conclusion

The six D4 design stages are complete, but production implementation is **not ready to start as one broad integration change**. The principal blockers are concrete API ownership migration, mutable-object escape paths, missing write-ahead journal coverage, no verified staged workbook state, no calculation-generation cache checkpoint, and the current raw worksheet event bridge.

The D4.3/D4.5 event-order discrepancy is reconciled in the D4.3 specification: publish `mutationCommitted` after the state swap; publish the complete derived formula-result event batch only after generation commitment; publish the generation-completion event last. On failure, publish `calculationFailed` only after partial-cache and spill recovery. D4.5’s existing “cell events, then pass-completion event” ordering remains authoritative; `calculationCommitted` is the workbook-level completion event corresponding to that final notification.

The smallest safe start is an API-boundary and staging slice limited to existing worksheets and explicitly supported cell-content operations. Expanding to other mutation families, workbook structure, workers, or adoption must follow separate testable slices. This is a readiness recommendation, not implementation authorization.

## 2. Event-order reconciliation

The accepted D4.5 scheduler specification (§6 Events) requires derived per-cell events in canonical `(WorksheetId, packedCellKey)` order and a pass-completion event after those events and after dirty/cache state is stable. The prior D4.3 §8.1 draft placed `calculationCommitted` before the result event batch. Those orders conflict.

**Amended normative order:**

1. `mutationCommitted(transactionId, workbookRevision, affectedSheetIds, mutationSummary)` after the staged state swap.
2. For a successful calculation generation, publish all derived formula-result events in D4.5 canonical order after result acceptance/checkpoint release conditions hold.
3. Publish `calculationCommitted(generationId, workbookRevision)` as the final generation completion event. At the API adapter boundary, this is the workbook-level counterpart of D4.5’s final `formulasEvaluated`/pass-completion notification.
4. For failure, restore partial cache and spill writes first, then publish one `calculationFailed(...)` status. Publish no result event or success completion event for the failed generation.

The sequence is recorded in the amended [D4.3 integration specification](CS-002D4.3-workbook-transaction-integration.md#81-deterministic-events). Event listeners run outside the mutation/scheduler critical section; listener exceptions do not roll back already committed state.

## 3. Source-grounded API consumer and escape-path inventory

### 3.1 Consumers that currently rely on mutable `Worksheet` handles

`Workbook.getSheet()` and `activeSheet` currently return `Worksheet`; `addSheet()` also returns a `Worksheet`. The core package index re-exports both `workbook.ts` and `worksheet.ts`. Therefore, changing workbook lookups to owner-backed read-only views is a public type/runtime migration, not an internal refactor.

| Consumer area | Source-grounded examples | Migration consequence |
| --- | --- | --- |
| React application and component surface | `packages/react/src/components/ExcelApp.tsx`, `CyberSheet.tsx`, ribbon components, `StatusBar.tsx`, `CommentPanel.tsx`, `ExportPanel.tsx` | `activeSheet`/`getSheet()` are passed to renderers, dialogs, command managers, formatting controllers, and mutation callbacks. Split display/read props from transaction mutation handles and ensure callbacks execute inside `Workbook.transact`. |
| React commands/controllers/utilities | `CommandManager`, `FormattingController`, `ClearCellsCommand`, `PasteCommand`, `InsertCellsCommand`, `DeleteCellsCommand`, `SetHyperlinkCommand`, `commands/*`, `utils/formatOperations.ts`, `utils/autoSum.ts` | Commands currently mutate `Worksheet` directly and often maintain their own undo snapshots. Adapt commands to accept a transaction-scoped mutator or run under a workbook transaction; the authoritative journal, not command-local undo state, owns atomic abort. |
| Canvas renderer and editing | `packages/renderer-canvas/src/ExcelRenderer.ts`, `EditingManager.ts`, `CanvasRenderer.ts`, `DataManager.ts`, `ExportPlugin.ts` | Renderer constructors and editing paths retain and mutate `Worksheet` references, read cell stores, subscribe to worksheet events, and set filters/values. Replace backing references with read views and route edits through transaction capabilities; route render invalidation through committed event batches. |
| XLSX IO | `packages/io-xlsx/src/export.ts`, `import.ts`, `progressive.ts` | Export needs stable immutable read snapshots. Import/progressive load mutates workbook/sheets through `addSheet`, `getSheet`, and load mutators; route it through D4.4 staged restore/import, not an ordinary user transaction. |
| Framework adapters | `packages/vue/src/useCyberSheet.ts`, `packages/angular/src/CyberSheetService.ts`, `packages/svelte/src/cyberSheetStore.ts`, `packages/react/src/useCyberSheet.ts` | Adapters currently expose workbook/sheet objects and perform initial writes directly. Public framework handles need the read-only view plus transaction entry point. |
| Event bridge | `packages/core/src/eventBridge.ts` subscribes to each `Worksheet.on()` and maps raw cell/style/comment events into the workbook `EventBus`; `wireSheet()` subscribes new sheets. | Must stop forwarding raw per-sheet events for workbook-owned transactions. Rewire to journal commit projections and post-generation result batches with deterministic sheet identity/order. |
| Core commands and integrations | `CollaborationEngine`, `FormulaWorkerHost`, `EngineWorkerHost`, `SpreadsheetSDK`, `FindService`, `SpillEngine`, `PivotEngine`, command classes | Separate user mutations, internal engine writes, imports, and collaboration applies. Each must either receive a scoped transaction/internal capability or be explicitly standalone-only. |
| Examples, scripts, and external API docs | `examples/*`, `scripts/verify-load.ts`, README, architecture docs, test projects | Update samples and consumer migration guide. These do not define runtime correctness but demonstrate the current public mutable-handle expectation. |

This is a path-based inventory of material consumer areas, not a completed call-site count. The implementation plan must maintain a generated or reviewed exhaustive inventory of type references and uses before declaring API migration complete. Test files were excluded from this source scan and must be audited before implementation acceptance.

### 3.2 Mutable escape paths that defeat isolation if left open

| Escape path | Current source surface | Required handling |
| --- | --- | --- |
| Direct worksheet object | Public `Workbook.getSheet`, `activeSheet`, `addSheet` return `Worksheet`; `Worksheet` is exported from core index. | Workbook methods return an owner-backed read-only view. Raw retained handles become detached/read-only after adoption; all raw mutators reject before write. Standalone `Worksheet` remains supported outside workbook ownership. |
| Shallow cell snapshots | `Worksheet.getCell()` freezes a shallow copy; nested comment/style/hyperlink/component metadata may still be referenced. `forEachNonEmptyCell()` types its callback cell as `any`. | Deep immutable/detached read objects; remove public raw-cell callback or pass a detached readonly value. Verify every nested value and callback path. |
| Mutable stores/layers | `Worksheet.getDrawingLayer()` returns a mutable `DrawingLayer`; `getHiddenRows/Cols()` return live sets typed `ReadonlySet`; other iterators/maps/caches require audit. | Do not expose mutable backing stores. Use snapshots/immutable facades; drawing edits must use a journaled transaction capability. |
| Workbook service getters | `getStyleCache()`, `getPivotRegistry()`, `getPivotSnapshotStore()`, `getPivotDependencyIndex()`, `getPivotInvalidationEngine()`, and `getPivotRecomputeEngine()` expose mutable service objects or concrete implementations. | Return readonly query interfaces; route writes through workbook transaction services or explicitly internal capabilities. |
| Workbook event bus | `readonly eventBus` prevents reassignment only; its methods remain mutable and lazy bridges subscribe to worksheet events. | Separate public subscription surface from internal emit/bridge registration. External code cannot publish or bypass ordered workbook events. |
| Cell-associated metadata | Comments, icons, custom components, hyperlinks, drawings, and styles can be returned from cell/query APIs; some arrays/maps are shallow copies. | Deep freeze/detach values or return read-only domain views. Add mutation APIs to transaction surface only. |
| Global/shared pivot store | `groupStateStore` is imported as shared module state by `Workbook` and used by pivot lifecycle. | Make ownership workbook-scoped or prove isolation and journal ownership; global mutable state cannot be staged safely across independent workbooks. |
| Transaction callback leakage | A callback can launch a timer/promise/closure that retains its `TransactionSheet`. Rejecting a returned thenable alone does not cancel detached asynchronous work. | Every handle checks a revocable transaction capability on every operation. Commit/abort revokes it before staged state can publish or be discarded. Escaped handles can never mutate committed state. |

## 4. Initial supported and rejected mutation surface

The first implementation slice should prove atomic multi-sheet content edits without claiming that every worksheet API is ready. Proposed support is deliberately narrow:

| Initial disposition | Operations |
| --- | --- |
| **Supported in first transaction slice** | `setCellValue`, `setCellFormula`, `clearCellContent`, `clearCellFormula` on existing worksheets through transaction-scoped handles; patch application only when its operations are restricted to those same cell-content operations and fully validated before staging. Formula edits install/remove local graph edges in staged state and create D4.5 generation seeds. |
| **Read-only through owner-backed views** | Address/used-range/cell/formula queries, sheet names/IDs/order, style reads, and immutable snapshots. A read reports `current`, `pending`, `stale`, or `unavailable` calculation status where cached formulas are involved. |
| **Rejected before first write in initial slice** | Sheet add/delete/rename/active-sheet changes; pivot/slicer/reference metadata changes; style changes; merges; spill manipulation; filters/visibility; validation/conditional formatting/protection/freeze/header-footer; comments/icons/components/hyperlinks/drawings; sorting; dimensions; row/column insert/reorder; direct DAG/volatile mutation; raw `applySnapshot`; progressive load; arbitrary `getDrawingLayer()` mutation. |
| **Internal-only** | Scheduler/cache/spill commits, graph rebuild, journal hooks, state-reference swap, D4.4 staged restore. Require non-exported capabilities and cannot be invoked by public transaction code. |

The earliest multi-sheet acceptance scenario edits literal/formula content on two already-existing sheets, aborts, and proves that retained views still see the prior committed revision. The next scenario commits both sheet edits, computes the dependent closure, and verifies that observers see a single mutation commit followed by a complete result batch and final pass completion. New sheet lifecycle and workbook metadata support should follow only after the basic handle/journal boundary is established.

Unsupported operations must reject before even partially mutating staged state. Rejection must be deterministic, identify the unsupported operation, and leave the transaction candidate valid. No silent no-op, partial patch, or fallback to direct worksheet mutation is allowed.

## 5. Smallest independently testable implementation slices

These are recommended implementation boundaries; none is authorized by this assessment.

| Slice | Scope and exit criterion | D4.6 gates |
| --- | --- | --- |
| **R0 — exhaustive API/escape inventory and migration contract** | Enumerate every `Workbook`/`Worksheet` consumer, public export, mutable return, callback type, and test; define compatibility/versioning and owner-backed readonly interfaces. No behavior change until inventory is reviewed. | Repository hygiene; binding/API surface review; no baseline change. |
| **R1 — owner-backed read views and revocable transaction handles** | Separate standalone `Worksheet` from workbook-owned access; retained views resolve committed revision; raw mutators and mutable escape APIs reject/are detached; transaction capabilities revoke on every completion path, including launched async callbacks. | Identity/migration; transaction isolation; repository hygiene. |
| **R2 — staged state and one write-ahead journal for existing-sheet cell content** | Stage value/formula/clear on two existing sheets; one journal captures before writes; commit swaps atomically; abort discards stage; validated cell-content patch projection. No unsupported mutation is partially applied. | Transactions; dependency correctness; functional regression; repository hygiene. |
| **R3 — D4.5 generation checkpoint and recovery** | Checkpoint all affected `FormulaValue` and spill occupancy; generation-tag every result; restore partial writes; preserve committed edits and dirty closure; expose stale/unavailable state; retry and late-result rejection. | Transactions; workers; dependency/cycle correctness; binding semantics; functional regression. |
| **R4 — ordered workbook event publication and adapter migration** | Replace direct raw Worksheet forwarding in `WorkbookEventBridgeManager`; establish mutation commit, result batch, completion/failure ordering; migrate renderer and framework subscriptions. | Transactions; workers; functional regression; repository hygiene. |
| **R5 — mutation families and workbook metadata expansion** | Add typed journal records in reviewed groups: style/merge/spill; layout/filter/view metadata; cell metadata/drawings; structural edits; sheet directory/IDs; pivots/references. Each group has an explicit supported/rejected boundary until complete. | Transactions; identity/migration; persistence; XLSX; dependency correctness; functional regression. |
| **R6 — worker and persistence integration** | Worker uses workbook owner/revision/transaction/generation IDs; imports/restores use D4.4 candidate staging; no-op recalc worker path replaced or clearly excluded. | Workers; persistence; XLSX interoperability; transactions; functional regression. |
| **R7 — adoption packet** | Run paired candidate/pre-change environments and the frozen-105 identity comparison, focused transaction gates, complete core/XLSX/browser gates where affected, and artifact retention per D4.6. Performance is informative until approved thresholds exist. | All applicable D4.6 gates; transaction blocked gate must pass before adoption. |

R0–R4 form the minimum viable vertical path. R5 is not one ticket: each row group should be split into independently reviewable units. R7 is a separate authorization after production implementation and focused gates are complete. No slice may call overall adoption complete while the D4.6 transaction gate remains blocked or any other required gate lacks evidence.

## 6. Unresolved CS-001C implementation dependencies

Accepted contract decisions are not production guarantees. Source inspection shows the following remain to be implemented or verified:

1. **Write-ahead journal hooks do not exist as the authoritative path.** `PatchRecorder` infers operations from `onMutation()` and public events after writes; `TransactionContext` separately stores first-write content snapshots. Generic events and missing events still leave state uncovered.
2. **No workbook-wide journal owner/session exists.** Current `TransactionContext` owns one `Worksheet`; `EngineWorkerHost` owns one worksheet; `Workbook` mutates its sheet map/metadata directly.
3. **Staged workbook state and atomic pointer publication are not implemented.** Current `Workbook.getSheet`, `activeSheet`, and `addSheet` return raw mutable sheets. No copy-on-write owner revision/read view is present.
4. **Capability revocation is absent.** There is no transaction-scoped worksheet capability, owner token check, or protection against closures/timers retaining a transaction handle.
5. **Public mutation coverage is incomplete.** The current event/patch path omits or incompletely records structural edits, merge-cleared data, cell metadata, drawings, row/column styles, dimensions, validation, conditional formatting, and other categories in the accepted mutation inventory.
6. **Mutable read/service escape paths remain.** Worksheet, drawing, cell metadata, workbook registries/stores, style cache, event bus, and global pivot group state require owner/read-only/detached boundary design and migration.
7. **Calculation generation checkpoint/recovery is absent.** `SpreadsheetEngine.run()` consumes the mutation transaction before evaluation; scheduler failure suppresses result events but does not restore already-written caches. Current worker transaction calls `ws.recalc(() => {})` with no formula evaluator.
8. **Workbook result/status reads are not implemented.** Current worksheet reads return values without current/stale/unavailable generation status. D4.2 binder must not consume stale cache as current.
9. **Event bridge bypasses the future commit envelope.** It subscribes directly to `Worksheet.on()` and forwards mapped cell/style/comment events to the workbook event bus; workbook transaction isolation requires replacing that route for workbook-owned sheets.
10. **ID high-water persistence and abort behavior need implementation proof.** The accepted design requires monotonic allocation across aborted sheet creation, restart, restore, and import; verify allocator ownership against D4.1/D4.4 rather than assuming staged-state cloning preserves it.
11. **Pivot/reference ownership is not transaction-scoped.** Workbook exposes mutable registry/index/engine getters and imports a module-global pivot group state store. Define workbook-scoped staging and restoration before claiming workbook-wide atomic metadata behavior.
12. **Public API compatibility plan is missing.** `packages/core/src/index.ts` exports Workbook, Worksheet, commands/controllers, patch APIs, and DrawingLayer. Framework, UI, IO, renderer, samples, and tests assume mutable worksheet access; an implementation ticket must include migration, deprecation/removal strategy, and type-check scope.
13. **Rollback and recovery failure states have no owner-level representation.** `rollback-failed`, `calculation-stale`, and `calculation-unavailable` do not yet exist as enforceable workbook states with read/mutation policy.
14. **No implementation evidence exists for CS-001C.** This audit ran no tests/builds and did not re-run or alter any baseline. D4.6 requires raw artifacts, identity comparison, transaction-specific tests, and gate-by-gate evidence after separately authorized implementation.

## 7. D4.6 verification mapping

| Implementation slice | Required D4.6 gate evidence | Blocking condition |
| --- | --- | --- |
| R0–R1 | Repository hygiene, API inventory, identity/migration tests, retained-handle/read isolation, no mutable escape | Any public path can mutate staged/committed state without capability or read uncommitted state. |
| R2 | Transaction atomicity, multi-sheet commit/abort, complete mutation inventory for supported families, formula replacement/clear graph behavior, rollback/error injection | Any partially applied mutation, new failure identity, hidden or weakened assertion, or incomplete journal projection. |
| R3 | Generation failure after a cache and spill write, full checkpoint restore, dirty ownership, stale reads, retry, late/foreign result rejection | Any partial result remains exposed as current, stale binder read, event leak, or dirty clear by stale worker. |
| R4 | Deterministic event order and event suppression on abort/failure; worker/renderer observer behavior | Raw Worksheet event bypass, duplicate event, nondeterministic order, or result event before accepted generation. |
| R5 | Identity/migration, persistence, dependency/cycle correctness, binding behavior, XLSX interoperability, transaction gates for each added mutation family | Any feature marked supported without full before-state, rollback, graph and event coverage. |
| R6 | Worker generation/result envelope, D4.4 staged restore, full XLSX suite and named round-trip fixtures | No-op worker evaluator counted as pass, partial restore exposure, or artifact/config mismatch. |
| R7 | Frozen 105-identity raw core run + identity diff; focused suite artifacts; package/build/browser gates as affected; checksums and environment manifest | Candidate-only failure, missing/renamed/hidden test without review, missing raw output, or any required gate incorrectly marked pass. |

Performance and memory results remain informative until workload protocol and thresholds are approved. They cannot waive correctness. Transaction acceptance remains a required D4.6 gate, not N/A. The frozen 105 failures are a regression reference only; they do not close remaining functional defects or establish transaction correctness.

## 8. Readiness decision and next authorization

**Readiness:** design-complete, implementation-not-ready. D4.3/D4.5 event order is reconciled in the design document. R0/R0.1 are now accepted and closed for source-accounting scope; see the [R1 authorization packet](CS-002D4-R1-authorization-packet.md). Before authorizing production implementation, the API owner must approve the breaking-release policy and the supervising reviewer must authorize the packet's exact R1 boundary. Do not start with a monolithic workbook integration or expand the transaction-supported mutation surface before its journal records and rejection boundary are proven.

This readiness assessment does not grant implementation, test execution, build, benchmark, baseline, merge, or release authorization. The original nine-phase roadmap remains governing; all other release blockers remain open; the frozen 105-failure identity reference is unchanged; the experimental coordinator remains non-exported.

No production files were edited. No tests, builds, benchmarks, browser/security checks, or baseline captures were run. Source inventory used read-only searches and source inspection; this document is design evidence, not implementation verification.
