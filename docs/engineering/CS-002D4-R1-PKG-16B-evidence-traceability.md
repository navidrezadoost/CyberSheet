# CS-002D4-R1 PKG-16B — Evidence traceability

**Purpose:** Trace each seven-operation acceptance assertion to existing source, executable test, and reported execution evidence. This report reuses PKG-02 through PKG-15 evidence; it introduces no test run or code change. “Direct” means the cited test/report says the relevant state or behavior was asserted; it does not extend to untested shapes or neighboring operations.

## Shared implementation path

| Concern | Source / executable evidence | What the evidence supports | Limit |
| --- | --- | --- | --- |
| Ownership validation, transaction staging, apply/commit/rollback | `packages/core/src/workbook.ts`, including `#applyCellWriteBatch()`; PKG-14B source/test map | Workbook-mediated transaction path and the cited pre-apply/apply/commit failure cuts | Source inspection does not prove every possible fault cut. |
| Cell records, merge resolution, formula graph, style/dimension mutation, event batches | `packages/core/src/worksheet.ts`; PKG-12A and PKG-13B source maps | State-owner relationships and the particular calls exercised by the regressions | Formula grammar and all derived-state phases are not exhaustively covered. |
| Strategy selection and private failure seams | `packages/core/src/workbookMutationStrategy.ts`, `packages/core/src/workbookMutationTestHooks.ts` | Tests select Journal/Snapshot and inject at named phases | Test hooks are not public contracts and do not cover phases they cannot reach. |
| Buffered event publication and bridge | PKG-02C, PKG-02D/E/F, PKG-02G-C, PKG-08B, PKG-14B | Commit-only event behavior, tested event frequency/order within surfaces, selected observer error isolation | No global cross-surface callback completion order or Application forwarding is established. |
| Sparse-state and graph comparison | PKG-02C differential test; PKG-13B side-effect and fault matrix; PKG-15B multisheet graph test | Detached Worksheet snapshots, fixture graph observations, sparse dimension entries and selected recalculation indicators return to their captured values | No exhaustive proof of every internal graph/cache/metadata owner. |

## Per-operation traceability

| Operation | Primary exact test evidence | Reconciled behavior | Unproven scopes retained |
| --- | --- | --- | --- |
| `setCellValue` | `packages/core/__tests__/workbook-seven-operation-differential.p1-pkg-02c.test.ts`; `worksheet-null-write-noop.p1-pkg-09c.test.ts`; `workbook-merged-member-integrity.p1-pkg-12a.test.ts`; `workbook-transaction-side-effect-matrix.p1-pkg-13b.test.ts`; `workbook-transaction-disposal-publication.p1-pkg-14b.test.ts` | Sparse `null` does not allocate; formula-to-null clears formula state; merged member resolves storage/graph to anchor; mixed state rollback and direct before/after-apply cuts under both strategies; publication/disposal boundary. | Every transition ordering and metadata shape; every graph subphase after value replaces formula; exhaustive merged/sparse combinations. |
| `setCellFormula` | `workbook-seven-operation-differential.p1-pkg-02c.test.ts`; `workbook-merged-member-integrity.p1-pkg-12a.test.ts`; `workbook-transaction-side-effect-matrix.p1-pkg-13b.test.ts`; `workbook-multisheet-formula-graph-rollback.p1-pkg-15b.test.ts`; `workbook-transaction-disposal-publication.p1-pkg-14b.test.ts` | Tested registration/replace/clear, merged-anchor graph mapping, exact graph/snapshot rollback at exercised cuts, cross-sheet second-registration failure under Journal and Snapshot, and commit-only notifications. PKG-15B result: 2 cases; broader focused selection 15 suites / 201 tests. | Graph cycles, ranges, all volatile and recalculation phases, all formula syntax, cross-sheet formula semantics, and all operation-order combinations. |
| `clearCellContent` | `workbook-seven-operation-differential.p1-pkg-02c.test.ts`; `workbook-transaction-side-effect-matrix.p1-pkg-13b.test.ts`; `workbook-transaction-disposal-publication.p1-pkg-14b.test.ts` | Included in seven-operation success and rollback sequences; shared cell/graph before-image and event-buffer restoration are directly compared at the injected transaction cuts. | No isolated clear-content-specific late fault matrix across empty, formula-bearing, sparse, and merged cases. |
| `clearCellFormula` | `workbook-seven-operation-differential.p1-pkg-02c.test.ts`; `workbook-merged-member-integrity.p1-pkg-12a.test.ts`; `workbook-transaction-side-effect-matrix.p1-pkg-13b.test.ts`; `workbook-transaction-disposal-publication.p1-pkg-14b.test.ts` | Formula graph clearing and value retention in exercised fixtures; merge-anchor behavior; mixed rollback and event suppression. | All graph shapes/subphases, repeated clear/rewrite permutations, and isolated operation-specific post-write fault cuts. |
| `setCellStyle` | `workbook-seven-operation-differential.p1-pkg-02c.test.ts`; `workbook-seven-operation-observer-isolation.p1-pkg-08b.test.ts`; `workbook-merged-member-integrity.p1-pkg-12a.test.ts`; `workbook-transaction-side-effect-matrix.p1-pkg-13b.test.ts`; `workbook-transaction-disposal-publication.p1-pkg-14b.test.ts` | Style commit and event behavior; merged-member style handling; provisional style plus later failure restores public cell/snapshot state under both strategies; committed listener errors are isolated. | StyleCache private reference counts, leak-free reference accounting, every canonicalization/restore/cleanup failure point. |
| `setRowHeight` | `packages/core/__tests__/workbook-row-height-journal.p1-pkg-02a.test.ts`; `workbook-seven-operation-differential.p1-pkg-02c.test.ts`; `workbook-transaction-side-effect-matrix.p1-pkg-13b.test.ts`; `workbook-transaction-disposal-publication.p1-pkg-14b.test.ts` | Validation, sparse/default before-images, repeated writes, Journal/Snapshot, multi-sheet rollback, event behavior, cancellation/disposal, selected restoration-failure/recovery cases, seven-operation mixtures. PKG-14B tests direct pre-first and post-operation faults for this operation under both strategies. | Every dimension write against every other mutation ordering and cleanup phase; rendering completion, persistence, and history. |
| `setColumnWidth` | `packages/core/__tests__/workbook-column-width-journal.p1-pkg-02b.test.ts`; `workbook-seven-operation-differential.p1-pkg-02c.test.ts`; `workbook-transaction-side-effect-matrix.p1-pkg-13b.test.ts`; `workbook-transaction-disposal-publication.p1-pkg-14b.test.ts` | Validation, sparse/default before-images, repeated writes, Journal/Snapshot, multi-sheet rollback, event behavior, cancellation/disposal, selected restoration-failure/recovery cases, seven-operation mixtures. PKG-14B tests direct pre-first and post-operation faults for this operation under both strategies. | Every dimension write against every other mutation ordering and cleanup phase; rendering completion, persistence, and history. Binary SnapshotCodec omission of widths remains a distinct format boundary. |

## Common fault, event, and recovery evidence

| Required concern | Direct evidence | Coverage limit |
| --- | --- | --- |
| Ownership validation | PKG-02A/B transaction-port ownership tests and WorkbookSheetView routes | Does not establish ownership rules for APIs outside these operations. |
| Staging and ordered application | PKG-02A/B staged callbacks and event tests; PKG-02C fixed operation sequence; PKG-14B direct apply cuts | Fixed sequences, not all permutations. |
| First-write before-image | PKG-02A/B repeated writes and absent-vs-explicit-default cases; PKG-02C differential; PKG-13B exact state comparison | Directly observed at Worksheet/snapshot level; private journal record structure not treated as contract. |
| Sparse-cell preservation | PKG-09C null-write no-op; PKG-13B absent-cell allocation then rollback; PKG-14B exact snapshot rollback | Only named sparse patterns. |
| Merge coordinates | PKG-12A merged-member integrity cases for value/formula/style and graph mapping | Merge creation/deletion is not among the seven operations and is not transactionally covered here. |
| Formula graph changes | PKG-02C, PKG-12A, PKG-13B, PKG-15B | PKG-15B narrows one multi-Worksheet registration fault, not all graph phases or shapes. |
| Journal rollback | PKG-02A/B/C, PKG-12A, PKG-13B, PKG-14B, PKG-15B | Chosen cuts only; global D2-11 requires complete authorized-owner/fault coverage. |
| Independent Snapshot rollback | Same named tests explicitly select Snapshot in test hooks | Snapshot evidence is not inferred from Journal behavior; still limited to named cases. |
| Commit-only event publication | PKG-02C and PKG-02D/E/F; PKG-08B; PKG-13B; PKG-14B/15B | No renderer paint completion or Application event guarantee. |
| No-op behavior | PKG-09C for sparse null and PKG-02A/B for dimensions/formula no-ops as scoped in their reports | Operation-specific semantics differ; not every operation has same-value suppression. Dimension same-value writes are eventful by their contract evidence. |
| Observer failure isolation | PKG-08B and PKG-02B listener exception cases; PKG-14B disposal publication cases | After commit, observers cannot roll back state; this is distinct from rollback injection. |
| Disposal/cancellation | PKG-02A/B queue/disposal tests; PKG-14B listener disposal during publication | Only specified queued and publication boundaries. |
| Restoration failure/recovery health | PKG-02A/B restoration/cleanup failures and subsequent recovery-required rejection; PKG-02C clean rollback health | No exhaustive restore failure for every owner/operation/cleanup phase. |

## Recorded verification provenance

- PKG-02C records 7/7 new differential cases; its combined selection was 8 suites / 144 tests and Core typecheck passed. These are historical package results, not rerun by Lane B.
- PKG-12A records a 5/5 focused green result and 7 suites / 152 tests in its adjacent window, with its own red/green correction. These are historical package results, not rerun by Lane B.
- PKG-14B's new direct matrix records 30/30 executions: 28 seven-operation fault-cut cases plus two publication-disposal cases, run under the recorded PKG-14D serialization.
- PKG-15B records 2/2 new Journal/Snapshot cases and a 15-suite / 201-test focused result in PKG-15D. One earlier assertion-count failure was corrected; both original and corrected raw evidence are retained by PKG-15D.
- PKG-16B Lane B ran no tests. The integrated synchronized result must be supplied by Lane E; do not interpret historical counts as PKG-16 execution.

## Disposition boundary

All seven operations have useful direct evidence and each is classified **VERIFIED WITH ENUMERATED GAPS** in [the acceptance assessment](CS-002D4-R1-PKG-16B-seven-operation-acceptance.md). No test run here closes global D2-11. The seven-operation scope does not establish comment deletion, Pivot lifecycle, other Worksheet mutation families, Application forwarding, or external side effects. Overall CS-002D4-R1 acceptance remains **WITHHELD**.
