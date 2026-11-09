# CS-002D4-R1 PKG-14C — Snapshot Error boundary

**Status:** Component behavior characterized; detached/public Error representation remains undecided.
**Scope:** Standalone Pivot calculation, transformation, in-memory storage, query, and the existing generic detached-read helper.
**Production/API changes:** None.

## Current standalone value path

| Stage | Current evidence | Preserved information / limit |
| --- | --- | --- |
| Pivot calculation | `PivotEngine` result cells and `PivotSnapshotStore.PivotRow` permit `Error` values. PKG-08/11/12 tests cover calculated errors, including `#REF!` values. | The standalone engine can produce or carry Error-valued aggregate/calculated results; no serialization shape follows from this type. |
| Transformation | `PivotSnapshotTransformer.transformToPivotSnapshot()` assigns each named `cell.values` entry directly into the output row (`PivotSnapshotTransformer.ts:73–83`). | The Error reference is retained; no clone or normalization is performed. |
| Store | `PivotSnapshotStore.set/get()` retains the supplied snapshot in a `Map` (`PivotSnapshotStore.ts:47–75`); its row type is `CellValue | Error` (`:21`). | Snapshot, row, and Error references are aliased in process. This is replace-don't-mutate guidance, not runtime freezing or detached ownership. |
| Query | `GetPivotData.query()` returns the matched row field directly (`GetPivotData.ts:111–160`). | The same Error object can be returned. PKG-13C verifies identity, custom `name`, `message`, and native `RangeError` prototype through transform, store, and query. |
| Workbook detached helper | `workbook.ts:173–183` recursively copies ordinary objects via `Object.entries`; `getPivotSnapshot()` applies it at `:1041–1051`. | Standard Error `name`/`message` are non-enumerable, so the generic copy does not preserve those fields as Error semantics. The supported Workbook Pivot creation route is unavailable, so this helper observation is not a reachable owner-backed Pivot contract test. |

## Alias behavior versus contract

The PKG-13C test establishes exact object identity across standalone transformation, `PivotSnapshotStore.set/get()`, and `GetPivotData.query()`. Consequently, those component layers currently share an Error alias rather than producing detached immutable Error values. Mutating the original Error object after publication would be observable through that same alias; no separate defensive-copy boundary exists in the cited path.

That observation is not promoted to a public guarantee. The snapshot comments describe snapshots as immutable and recommend replacement rather than mutation, but the implementation does not freeze nested rows or Error objects. PKG-11C and PKG-12B record that D3-05 does not define the DTO representation of an Error inside a snapshot row. The current behavior therefore cannot settle whether consumers should receive:

- an immutable Error-compatible value preserving specified native fields; or
- a stable immutable spreadsheet-error record with a documented code/message contract.

The choice must also distinguish row-cell calculation errors from refresh status `lastError`, which is a separate status field proposal. No normalizer, clone, freeze, public type, or Workbook read expectation is introduced here.

## Verification handoff

No additional Error test was added in PKG-14C: PKG-13C already tests Error identity, prototype, custom `name`, and `message` across the standalone component path. The new validation/retry test passed 1/1, and adjacent standalone Pivot suites passed in PKG-14D. Raw outputs: `CS-002D4-R1-PKG-14D-focused-verified-jest-output.txt` and `...adjacent-jest-output.txt`.

## Disposition

Standalone components currently preserve Error identity and the tested native fields in process; existing generic Workbook detachment loses meaningful Error fields by copying enumerable properties only. This is an evidence boundary, not an approved-contract defect: Workbook-owned Pivot creation is unavailable and the Error DTO rule remains open. D3-05 representation and D3-06 stale-formula behavior remain separate owner decisions. Overall CS-002D4-R1 acceptance remains **WITHHELD**.
