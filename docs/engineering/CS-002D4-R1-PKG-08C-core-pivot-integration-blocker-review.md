# CS-002D4-R1 PKG-08C — Core and Pivot integration blocker review

**Scope:** Read-only classification of existing Core/Pivot integration evidence and current Workbook APIs. No tests were run, no production or test fixtures were changed, and no current failure was independently reproduced in this lane.

**Inspected revision:** `88b09634f17f3b39d88a88c5428f76b426459a2b`
**Worktree observation:** 438 status entries when inspected; shared changes were left untouched.
**Overall CS-002D4-R1 acceptance:** WITHHELD.

## Finding

The historical Core/Pivot blocker evidence does not establish one Pivot implementation defect. It reports different outcomes at different execution stages: test compilation blocked by assumptions about unavailable/internal APIs; runtime fixture setup blocked by the current post-publication sheet-creation guard; one separately executed merged-read identity assertion; and public Workbook Pivot lifecycle operations that are present as methods but intentionally unavailable. These categories must remain separate. This lane reviewed existing reports and current source; it does not claim a new diagnostic run or baseline.

## Blocker classification

| Category | Existing evidence | What was reached | Classification |
| --- | --- | --- | --- |
| Compile-time fixture/API mismatch | PKG-01J recorded seven suites with TypeScript diagnostics and zero tests executed. Examples include `getPivotRegistry()` / `getPivotSnapshotStore()` calls and assigning `Workbook.addSheet()`'s `WorkbookSheetView` result to mutable `Worksheet`. PKG-02C separately retried `workbook-snapshot-integration.test.ts` and again got missing-accessor diagnostics, with zero tests executed. | No Pivot registration, recompute, snapshot publication, or transaction assertions ran in those suites. | Test/API reachability mismatch, not a runtime assertion failure and not by itself a demonstrated product defect. |
| Runtime fixture-setup failure | PKG-01J recorded 18 `pivot-formula-integration.test.ts` cases throwing in setup when `Workbook.addSheet()` rejected post-publication sheet creation. Representative setup anchors are test-file lines 186, 269, 302, 371, 429, 467, 512, and 584. | Pivot registration and the intended formula, dirtying, deletion, multi-sheet, determinism, and rebuild assertions were not reached. | Unsupported fixture lifecycle path; not evidence that the associated Pivot result is wrong. |
| Executed assertion failure | PKG-01J recorded one failure in `packages/core/__tests__/merge-api.test.ts`, test `BT-2 · read non-anchor cell returns anchor cell object` at line 261. Serialized contents matched; object identity did not. | The standalone `Worksheet` merged-read assertion executed. It did not use Workbook Pivot lifecycle or select a mutation strategy. | Separate merged-read contract/test mismatch. Do not count it as a Pivot integration failure. |
| Unsupported public Workbook operations / internal observability | Current `Workbook.createPivot()` and `deletePivot()` reject as unavailable; `addSheet()` throws the sheet-lifecycle authorization error. `#pivotRegistry` and `#pivotSnapshotStore` are private. `getPivotSnapshot()` is a detached read, not mutable store access. | Public reads can observe a snapshot only if a Pivot is already registered; current public creation is unavailable. | Owner/API contract and lifecycle gap. Do not work around it with casts, private access, or test-only accessors. |

The detailed historical report classifies the seven compile-blocked suites as `EventBus.workbook-bridge.test.ts`, `pivot-invalidation-workbook-bridge.test.ts`, `pivot-partial-recompute.test.ts`, `pivot-slicers.test.ts`, `pivot-partial-sanity.test.ts`, `workbook-snapshot-integration.test.ts`, and `workbook-pivot-integration.test.ts`. The separate 18 setup failures are grouped by the historical report under the `pivot-formula-integration.test.ts` cases. Refer to [PKG-01J Core failure matrix](CS-002D4-R1-PKG-01J-core-failure-matrix.md) for the per-suite diagnostics and test anchors.

## Current source/API evidence

- `packages/core/src/workbook.ts:280-318`: `Workbook.create()` requires at least one initial sheet and publishes the Workbook with those initial sheets. It accepts multiple sheets at creation. `Workbook.transact()` and the mutation port provide supported writes to those sheets.
- `packages/core/src/workbook-access-types.ts:27-52`: the current `WorkbookMutationPort` and transaction context expose the seven authorized operations. They do not expose Pivot registration or store mutation.
- `packages/core/src/workbook-access-types.ts:54-97`: `WorkbookSheetView` is a read-only owner view. It has no `setCellValue`, `getPivotRegistry`, or snapshot-store method.
- `packages/core/src/workbook.ts:1030-1033`: `createPivot()` is declared but currently delegates to `#rejectUnavailable('pivot creation')`.
- `packages/core/src/workbook.ts:1041-1052`: `getPivotSnapshot()` looks up the private registry, optionally rebuilds a dirty Pivot, and returns a detached snapshot. It cannot create or register a Pivot.
- `packages/core/src/workbook.ts:1063-1065`: `deletePivot()` delegates to `#rejectUnavailable('pivot deletion')`.
- `packages/core/src/workbook.ts:1068-1071`: `addSheet()` rejects post-publication sheet creation pending the sheet-lifecycle journal slice.
- `packages/core/src/workbook.ts:204-213`: registry and snapshot store are private Workbook state; no public getters expose them.

The legacy fixture mismatch is visible in current test source. For example, `workbook-pivot-integration.test.ts:15-26` constructs `new Workbook()`, expects `getPivotRegistry()`, and calls `addSheet()`. `pivot-partial-recompute.test.ts:92-110` types `addSheet()` as a mutable `Worksheet`, calls worksheet mutation methods, then expects Workbook Pivot creation and group-state access. `workbook-snapshot-integration.test.ts:15-44` calls absent registry/store getters and uses post-publication sheet creation. These are not equivalent to a supported public integration fixture.

## Bounded current evidence versus historical reports

PKG-03C reports a bounded standalone Pivot selection of **3 suites / 50 tests passed** (`getpivotdata.test.ts`, `pivot-snapshot-store.test.ts`, and `pivot-recompute.test.ts`). It also reports its separate 11-suite event/transaction selection passing **170/170**. Those results are historical reported evidence from that checkpoint, not newly run in PKG-08C. Standalone Pivot engine/recompute/store behavior does not prove Workbook-managed registration, source observation, dirtying, lifecycle, or publication.

PKG-03C explicitly did not rerun the legacy compile/setup blockers or recapture a full Core baseline. Its report states the old failure totals do not prove when the failures originated. This lane likewise does not attribute them to a later cutover or any particular source change. Current source inspection confirms the relevant API/lifecycle boundary remains in place, but source inspection is not a reproduction of the historical test failures.

## Smallest legitimate supported test and owner API boundary

The smallest legitimate route is a separately approved **public Workbook Pivot lifecycle contract**, exercised only through owner-facing APIs:

1. Build a fixture with all required source and output sheets in `Workbook.create({ sheets: [...] })`; do not depend on post-publication `addSheet()` unless sheet lifecycle is separately authorized.
2. Seed or mutate the source using the existing Workbook transaction API. Keep owner views read-only and do not cast them to `Worksheet`.
3. Provide a supported Workbook-owned Pivot creation/registration route. The existing `createPivot()` name is already present but explicitly unavailable; its activation and precise source-sheet/config semantics require owner approval and implementation authorization.
4. Verify source-change invalidation/recompute and output through public behavior, such as detached `getPivotSnapshot()` or supported formula queries. Tests should assert observable results and lifecycle behavior, not internal `PivotRegistry` dirty flags or mutable `PivotSnapshotStore` contents.
5. Provide an approved public deletion route only if deletion lifecycle is in scope. The existing `deletePivot()` is also explicitly unavailable; avoid treating its declaration as an enabled capability.

This boundary does **not** require public mutable registry/store getters. A minimally sufficient test path for initial registration, source mutation, refresh, and detached snapshot observation could use an approved `createPivot()` plus existing transactions and `getPivotSnapshot()`, provided the owner contract defines those behaviors. Post-publication sheet addition and pivot deletion should remain separate scope decisions unless the selected lifecycle acceptance criteria require them.

If a proposed correction is only to the historical tests, there are two different cases: internal-only tests can be excluded from product-facing acceptance or rewritten only after their intended contract is mapped to a supported public API; they cannot be made equivalent by unsafe casts or private access. A public Workbook integration requirement, however, cannot be satisfied by deleting those assertions or substituting standalone Pivot tests. It requires the owner-facing lifecycle boundary above.

## Lane disposition

**Classification complete; no production conclusion or authorization.** The historical records separate compile-time incompatibility, setup-time lifecycle rejection, and one executed standalone assertion failure. Current source confirms Workbook Pivot creation/deletion and post-publication sheet creation are unavailable, while the registry/store remain private and snapshot reads are detached. The smallest next evidence gate is owner approval of the required public Pivot lifecycle surface and fixture boundary, followed by a separately authorized integration test plan. Do not promote a failure to a product defect or infer a complete Workbook Pivot contract from the standalone 3-suite selection. Overall CS-002D4-R1 acceptance remains **WITHHELD**.
