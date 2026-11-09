# CS-002D4-R1 PKG-10C — Pivot fixture migration assessment

**Disposition:** BLOCKED for Workbook-owned Pivot integration characterization on current supported public APIs.
**Lane boundary:** Read-only source and test review. No test was edited or run; Lane A's discovery and Jest work is still in progress.
**Production changes:** None.

## Fixture reviewed

The expanded PKG-09 run identified `packages/core/__tests__/workbook-snapshot-integration.test.ts` as compile-blocked. Its tests assume `new Workbook()` exposes `getPivotSnapshotStore()` and `getPivotRegistry()` (for example lines 16–23, 47–77, and 80 onward); those methods are not public on the current `Workbook` declaration. Other assertions use `Workbook.addSheet()` after construction. This suite's intended assertions cover internal store existence/mutation, registry/store coordination, and disposal cleanup—not merely a detached snapshot read.

The related `pivot-formula-integration.test.ts` illustrates the runtime setup assumption: it creates an empty `new Workbook()`, calls post-publication `addSheet()`, writes directly through a mutable `Worksheet`, and accesses registry/store/anchor/dependency APIs. The PKG-09B expanded run recorded 18 setup failures when `addSheet()` rejected before those Pivot assertions executed. The related partial-recompute, slicer, sanity, Workbook-Pivot, and invalidation bridge fixtures contain the same categories of assumptions. These are fixture/API reachability blockers; they do not establish failures in assertions that never ran.

## Current supported public path

| Concern | Current source/API evidence | Consequence for a migrated fixture |
| --- | --- | --- |
| Initial Workbook sheets | `Workbook.create({ sheets })` accepts a non-empty list of names and dimensions and creates/publishes those sheets (`packages/core/src/workbook.ts:280–319`). Initial sheets start without populated cell data. | A test can create a Workbook with its source sheet up front. It cannot recreate the old sequence by adding sheets after publication. |
| Workbook source writes | The supported transaction context and mutation port expose only the seven cell/style/dimension operations (`packages/core/src/workbook-access-types.ts:20–51`). `WorkbookSheetView` exposes detached/read-only methods, including `getCell`, `getCellValue`, and `forEachNonEmptyCell`, but no mutation methods or `extractSnapshot()` (`workbook-access-types.ts:54–97`). | Source data can be populated with authorized transactions and observed through a view, but the view is not a mutable `Worksheet`. |
| Pivot calculation | `PivotEngine` takes a concrete mutable `Worksheet` (`packages/core/src/PivotEngine.ts:208–213`) and extracts source rows by calling that Worksheet's `getCell()` (`:446–460`). `generate()` returns a standalone `PivotTable` (`:232 onward`). | A standalone `Worksheet` can exercise `PivotEngine.generate()`, but passing a Workbook-issued view is not the declared API. Copying view values into a new standalone Worksheet would test a conversion plus standalone calculation, not Workbook-owned Pivot behavior. |
| Registry/store ownership | Registry and snapshot store are private fields on Workbook (`workbook.ts:204–205`). There are no public `getPivotRegistry()` or `getPivotSnapshotStore()` methods. `createPivot()` and `deletePivot()` reject as unavailable (`workbook.ts:1030–1033, 1063–1065`); `setPivotAnchor()` also rejects (`:900–903`). | A public test cannot register, inspect, mutate, or delete a Workbook pivot through the old fixture operations. Direct imports of `PivotRegistryImpl` or `PivotSnapshotStore` would create independent stores and would not test Workbook ownership. |
| Snapshot read | `getPivotSnapshot(pivotId)` checks the private registry, lazily refreshes an already registered dirty pivot, and returns a detached readonly copy of the stored snapshot (`workbook.ts:1041–1052`). | Without a supported registration/build path, a public call for an arbitrary ID returns `undefined`. It cannot prove store persistence, dirtying/rebuild, or disposal of a real Workbook pivot. |
| Sheet lifecycle | `addSheet()` explicitly rejects post-publication creation (`workbook.ts:1068–1071`). | Rewriting the fixture to `Workbook.create()` is necessary for sheet creation, but by itself does not make its unavailable Pivot registry/store operations reachable. |

## Migration decision

No separate opt-in diagnostic test can faithfully replace the blocked Workbook integration fixture using only the current supported public APIs. A test can use `Workbook.create()`, populate its initial sheet through the seven-operation transaction interface, then call the public detached `getPivotSnapshot()` with an unknown ID and observe `undefined`; that would only confirm the missing-pivot read behavior. It cannot reach the suite's actual subject: a Workbook-owned pivot with registered metadata, a computed/published snapshot, invalidation/rebuild, or cleanup on disposal.

Likewise, copying `WorkbookSheetView.forEachNonEmptyCell()` output into a standalone `Worksheet` and running `PivotEngine.generate()` would be a valid standalone calculation characterization, but not evidence for Workbook-owned integration. The public constructor and read-only view types intentionally do not bridge those ownership domains. No test was prepared because it would either assert only an unrelated trivial path or disguise standalone evidence as Workbook integration.

## Exact prerequisite to unblock

An authorized owner decision must define a supported Workbook Pivot lifecycle surface sufficient to:

1. Create/register a pivot against a Workbook-issued worksheet ID and supported `PivotConfig`.
2. Build and publish a snapshot or define how first build is triggered.
3. Observe detached snapshot state through a public read path.
4. Mutate source data through the existing seven-operation transaction API and define dirtying/rebuild expectations.
5. Delete/dispose the pivot and define cleanup guarantees.

The required surface need not expose mutable registry/store objects. A bounded owner-approved facade could preserve internal ownership. This report proposes no particular API and does not authorize creating one. Existing initial-sheet creation and detached snapshot reading are insufficient without registration/build reachability. Post-publication `addSheet()`, private field access, casts, fabricated accessors, and direct mutation of an adopted Worksheet are not acceptable test workarounds.

## Evidence and limits

The PKG-09B report classified six Pivot-related suites as compile-blocked (zero tests executed) and `pivot-formula-integration.test.ts` as setup-blocked (18 setup failures; intended assertions not reached). This lane has not rerun or reclassified those results. The current API inspection agrees with those boundaries: `WorkbookSheetView` is read-only, Pivot registry/store fields are private, and the methods required by the legacy integration fixtures are absent or reject. Standalone Pivot calculation tests remain distinct evidence.

No source or test changed in this lane. No Jest/typecheck ran. Wait for Lane A's serialized work to finish before any further Core Jest execution. Overall CS-002D4-R1 acceptance remains **WITHHELD**.
