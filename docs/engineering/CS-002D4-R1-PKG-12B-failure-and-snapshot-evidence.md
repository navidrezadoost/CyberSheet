# CS-002D4-R1 PKG-12B — Failure and snapshot evidence

**Purpose:** source-grounded review of standalone failure behavior and the PKG-11C Error-detachment concern.
**Production changes:** none.
**Jest execution:** completed in the serialized PKG-12R component window; 4 suites and 50/50 tests passed.

## Error values through the current component path

Current type/source evidence:

1. `packages/core/src/PivotSnapshotStore.ts` defines `PivotRow` values as `CellValue | Error`.
2. `packages/core/src/PivotSnapshotTransformer.ts` copies the values map from each generated pivot cell directly into the snapshot row; it does not normalize an `Error`.
3. `packages/core/__tests__/pivot-named-binding-integration.p1-08ah.test.ts` already checks that an unknown calculated-field reference creates `Error('#REF!')`, that the transformed standalone snapshot row contains an `Error`, and that `GetPivotData` returns an Error for that field.
4. `packages/core/src/workbook.ts` implements generic `detachReadonly()` using `Object.entries()` for ordinary objects. Standard `Error.message` and `Error.name` are non-enumerable, so a nested Error passed through that helper becomes a frozen ordinary object without those standard fields. `Workbook.getPivotSnapshot()` uses this helper after its internal lazy refresh. The method cannot presently be used to create an owner-backed Pivot because the public create route rejects as unavailable.

The source establishes a potential loss of meaningful error information at the Workbook detachment boundary. It does **not** establish a violation of an approved public Error DTO contract. The authoritative D3-05 wording requires last-good snapshots plus freshness/status/error metadata and validated publication, but does not define the representation of an `Error` *inside a snapshot row*. `PivotRow`'s `CellValue | Error` type is evidence of an internal/current component value model, not a complete serialization or detached-read contract. PKG-11C expressly identifies the open choice between a stable spreadsheet-error DTO and an immutable Error-compatible clone.

Therefore this lane records a concrete decision dependency and does not claim a contract violation or make a DTO-shape correction. The Workbook-owned path is also not presently reachable through supported public Pivot creation, so no Workbook-level regression is added here.

### Required decision before public detached-read acceptance

The Pivot contract owner must specify whether snapshot-row errors are:

- normalized into a detached immutable record (including stable spreadsheet error code/message and documented consumer semantics); or
- represented by an immutable Error-compatible value preserving the required fields.

The decision should distinguish row-cell calculation errors from refresh-status `lastError`; the latter is separately proposed as a detached `{ name, message, code? }` record in PKG-11C. Once authorized, add a focused boundary test at the supported public read path. Do not broaden the public type or silently stringify errors before that decision.

## Failure/publication boundary evidence

The standalone tests exercise these boundaries:

- `pivot-snapshot-store.test.ts`: target-ID validation occurs before replacement; this lane adds a regression ensuring a rejected replacement leaves the previous snapshot available.
- `pivot-recompute.test.ts`: a first builder failure leaves the Pivot dirty and without a snapshot; a later successful retry stores a snapshot and marks it clean. Query fallback is characterized as `#CALC!` for that component contract.
- `pivot-partial-recompute-safety.p1-08x.test.ts`: injected publication and builder failures cover retained old published snapshots, dirty/rebuilding flags, discarded unsafe incremental group state, and successful full-build recovery.
- `pivot-named-binding-integration.p1-08ah.test.ts`: standalone transform/query value and Error preservation.

These are component tests, not evidence of Workbook-owned lifecycle availability, atomic publication across all Workbook collaborators, D3-06 stale-formula policy, or transaction-level accumulator rollback. The new store regression and listed adjacent suites passed in PKG-12R; raw output and sidecar evidence are recorded in the component coverage report and PKG-12R artifacts.

## Verification handoff

Requested focused command is listed in [PKG-12B Pivot component coverage](CS-002D4-R1-PKG-12B-pivot-component-coverage.md). The coordinator recorded unfiltered output as `CS-002D4-R1-PKG-12R-pivot-component-jest-output.txt`; 237/237 sidecar checks passed before and after, with identical outputs. Core typecheck, hygiene, and `git diff --check` passed in the integrated gate.

**Disposition:** component coverage increment prepared; Error DTO/read representation remains unresolved and requires owner decision. No production source, public API, authoritative contract, ledger, frozen register, or baseline was changed. Overall CS-002D4-R1 acceptance remains **WITHHELD**.
