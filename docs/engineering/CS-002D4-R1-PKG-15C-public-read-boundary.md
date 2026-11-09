# CS-002D4-R1 PKG-15C — Pivot Error and public-read boundary

**Question:** Does generic detachment discard meaningful Error fields, and is there an affected, currently reachable public Pivot read path?
**Disposition:** The helper does discard standard non-enumerable Error fields when it copies an Error object, but the Workbook-owned Pivot snapshot read cannot currently be populated through an authorized public lifecycle. This is a source-level limitation, not a reproduced public-read defect.
**Changes:** None; no Error DTO or public API is introduced.

## Current standalone Error path

`PivotSnapshotStore.PivotRow` permits `CellValue | Error`. `PivotSnapshotTransformer.transformToPivotSnapshot()` copies named row values into the flattened snapshot row. `PivotSnapshotStore.set/get()` stores and returns the supplied snapshot reference. `GetPivotData.query()` returns the matched row field itself. The test `packages/core/__tests__/pivot-error-publication.p1-pkg-13c.test.ts` verifies that the same `RangeError` instance, its native prototype, custom `name`, and `message` survive calculation publication through those standalone stages. This is an aliased in-process value path, not a detached DTO guarantee.

## Generic detachment observation

`packages/core/src/workbook.ts` defines `detachReadonly()` by traversing `Object.entries()` and freezing a plain copied record. For a standard `Error`, `name` and `message` are non-enumerable; the helper's generic object branch therefore does not copy them or preserve the Error prototype. If an Error-containing Pivot snapshot were passed through this helper, the detached nested value would not retain ordinary Error semantics. This follows directly from the source algorithm; this lane did not add a test that calls the private helper.

## Reachability check

The read-shaped Workbook methods are present:

- `Workbook.getPivotSnapshot(pivotId)` first looks up the ID in the private `#pivotRegistry`, may synchronously rebuild a dirty entry, then applies `detachReadonly()` to the private snapshot-store result.
- `Workbook.queryPivotData()` constructs the internal `GetPivotData` reader over the private registry/store/recompute engine.
- `Workbook.queryPivotDataAt()` requires a registered anchor before forwarding to `queryPivotData()`.

However, the public lifecycle does not provide a route to seed those private collaborators. `Workbook.createPivot()` currently calls `#rejectUnavailable('pivot creation')`; `deletePivot()` similarly rejects, anchor mutation rejects, and no public registry or snapshot-store accessor exists. A caller can pass an arbitrary ID to the read methods, but it resolves to no registry entry and returns `undefined` or `#REF!`; it cannot cause the generic detachment helper to receive a stored Error-valued Pivot row. Existing Workbook integration tests that attempt creation are compile- or setup-blocked and do not establish a supported route. The separate `SpreadsheetSDK`/`Worksheet` Pivot grid API is not a route to the private Workbook `PivotSnapshotStore` and does not establish this read behavior.

Therefore, the helper's Error-field loss is a real implementation property of generic detachment, but there is no currently reachable Workbook-owned Pivot snapshot input on which to reproduce a public Error read. This distinction prevents standalone tests or private-state access from being presented as Workbook API evidence.

## Contract and next decision

The public Error representation remains unresolved under the existing PKG-11C / PKG-14E evidence. A future owner-approved Pivot facade must decide whether snapshot Error values are represented as a stable spreadsheet-error record or as an immutable Error-compatible value, including specified fields and compatibility behavior. Error-valued cells in a snapshot and refresh-status `lastError` are distinct data fields and should receive separate rules. No DTO, clone, freeze behavior, generic detachment change, or Workbook Pivot lifecycle is authorized by this lane.

The minimum executable evidence after lifecycle authorization is a public Workbook test that creates a Pivot through the approved facade, publishes a row containing a known Error, obtains the supported detached read, verifies the selected fields and repeat-read isolation, and proves mutating the returned value cannot mutate later reads. Until that prerequisite exists, the exact finding is **unreachable public-read boundary; representation decision pending**, not “public API defect reproduced.”

## Verification boundary

This lane ran no tests and did not use private-field inspection or casts to seed the Workbook registry/store. The existing standalone Error regression and PKG-14C recovery evidence are referenced, not re-reported as newly run. Overall CS-002D4-R1 acceptance remains **WITHHELD**.
