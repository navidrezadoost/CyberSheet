# CS-002D4-R1 PKG-03C — Core baseline classification

**Baseline revision:** `88b09634f17f3b39d88a88c5428f76b426459a2b`
**Starting worktree:** 388 dirty paths at PKG-03C start; shared pre-existing changes preserved.
**Classification:** Historical diagnostics and bounded current selections; no full Core rerun or baseline recapture.

## Historical failure evidence

PKG-01J recorded the final broad Core diagnostic at that point: 9 failed suites, 5 skipped, 268 passed (277/282 suites); 19 failed tests, 173 skipped, 9 todo, and 7,141 passed. This was a current-worktree diagnostic at the time, not a clean historical baseline. Its targeted nine-suite selection reproduced the same symptoms.

The 19 failures divide by execution stage:

| Failure class | Evidence | What ran |
| --- | --- | --- |
| Seven compile-blocked suites | TypeScript diagnostics for missing mutable `Worksheet` assumptions, `WorkbookSheetView` mismatch, and absent internal Pivot accessors such as `getPivotRegistry()` / `getPivotSnapshotStore()`. | 0 tests in each affected suite. |
| Eighteen Pivot formula integration setup failures | `Workbook.addSheet()` rejects post-publication creation in `beforeEach` pending the sheet-lifecycle journal slice. | Runtime setup throws; pivot registration, mutation, calculation, and the intended assertions are not reached. |
| One merged-read identity assertion | BT-2 expects anchor and member reads to be the same object, conflicting with the independently-owned read contract; serialized content is equal. | The standalone Worksheet assertion executes and fails; no Workbook transaction path is involved. |

PKG-01J found no evidence these failures select Journal or Snapshot. Compile failures do not reach execution; Pivot setup throws before transaction selection; BT-2 uses a standalone Worksheet. They were classified as test/contract drift or unresolved reachability, not as proven cutover regressions or product defects. The report explicitly does not prove when the failures originated.

## Later bounded evidence

- PKG-01K migrated the old EventBus bridge fixture to the supported `Workbook.create()` / `Workbook.transact()` path. Its bounded event and transaction selection passed 4 suites / 97 tests; this did not repair or waive the separate Pivot failures.
- PKG-02C's seven-operation integration selection passed 8 suites / 144 tests, Core typecheck, test hygiene, and the protected 237-entry sidecar check. Its `workbook-snapshot-integration.test.ts` attempt failed at ts-jest diagnostics with missing `getPivotSnapshotStore()` and `getPivotRegistry()`; **0 tests executed**. No accessors were added.
- PKG-03C's current serialized event/transaction selection passed 11 suites / 170 tests, including Journal/Snapshot differential and PKG-02D/E/F plus PKG-02G-C event coverage.
- Additional current standalone Pivot selections passed 3 suites / 50 tests (`getpivotdata.test.ts`, `pivot-snapshot-store.test.ts`, `pivot-recompute.test.ts`). They verify independently constructible calculation/query components; they are not Workbook-owned Pivot lifecycle coverage.
- The first unisolated attempt at the 11-suite current selection failed 10 suites / 133 tests with missing `DependencyGraph` mutation-journal methods in stale generated source JavaScript; 1 suite / 37 tests passed. After isolating and restoring the nine source-sidecar groups, the identical selection passed. Attribute this to module resolution and record both runs, not to a newly reproduced transaction failure.

Current extra suite evidence is not a new full Core baseline and must not be compared as a regression count against the differently composed PKG-01J broad selection.

## Accessor and fixture finding

`packages/core/src/workbook.ts` keeps `#pivotRegistry` and `#pivotSnapshotStore` private. It exposes `getPivotSnapshot(pivotId)` as a detached read when a Pivot exists, but `createPivot()` and `deletePivot()` reject as unavailable, `addSheet()` rejects post-publication creation, and no public registry or snapshot-store getter is present. Existing old fixtures that directly mutate registry/store state or rely on post-publication `addSheet()` cannot be made equivalent by a test-only public fixture under the current contract. Casting, private-field access, or introducing a production accessor would invent an owner path and is excluded.

Supported standalone tests can characterize PivotEngine, recompute, snapshot-store, and GETPIVOTDATA components independently. They cannot establish Workbook registration, source-sheet integration, dirtying, lifecycle, or owner-backed publication. A future integration test needs a separately approved Workbook Pivot lifecycle/public API and sheet-lifecycle contract; do not treat standalone tests as substitutes.

## Current failure status and limitation

No failures occurred in the PKG-03C bounded selections. This does **not** establish that the historical broad Core suite is now green. The legacy Pivot integration compile/setup blocker remains evidenced by PKG-01J/PKG-02C records; PKG-03C did not rerun those blocked files or the full Core suite. BT-2 remains a separate contract-alignment question. The shared FIFO self-await limitation remains separately unresolved.
