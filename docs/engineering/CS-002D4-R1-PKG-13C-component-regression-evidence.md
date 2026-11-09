# CS-002D4-R1 PKG-13C — Component regression evidence

**New test:** `packages/core/__tests__/pivot-error-publication.p1-pkg-13c.test.ts`
**Production changes:** none.
**Jest execution:** coordinator verification passed, 1 suite / 1 test; raw output is `CS-002D4-R1-PKG-13D-lane-c-jest-output.txt`.

## New executable case

The test constructs a standalone `PivotTable` whose named `Amount` value is a `RangeError` with `name = "PivotCalculationRangeError"` and `message = "#NUM!"`. It sends that value through `transformToPivotSnapshot()`, `PivotSnapshotStore.set/get()`, and `GetPivotData.query()`. Assertions require the same object identity at each boundary, the same native `RangeError` prototype, and preservation of the custom `name` and message.

This is additive to `pivot-named-binding-integration.p1-08ah.test.ts`, which already checks a generated `Error` value survives as an `Error` with `#REF!` message through transform and query. The new case adds identity, custom name, and prototype evidence for a deliberately supplied Error-valued component result. It does not make a statement about Workbook detachment or a stable serialized/public error DTO.

## Existing suites reviewed and proposed serialized selection

No existing tests were edited by Lane C. The new test should run alongside the existing component coverage:

- `packages/core/__tests__/pivot-error-publication.p1-pkg-13c.test.ts`
- `packages/core/__tests__/pivot-snapshot-store.test.ts`
- `packages/core/__tests__/pivot-recompute.test.ts`
- `packages/core/__tests__/pivot-named-binding-integration.p1-08ah.test.ts`
- `packages/core/__tests__/pivot-partial-recompute-safety.p1-08x.test.ts`

The PKG-12B report records the four pre-existing suites as **4 suites, 50/50 tests** in its prior serialized run. That result is historical evidence, not verification of the new PKG-13C test. Lane D must run the exact selection after all lane changes stabilize and capture unfiltered output and protected-sidecar checks.

## No duplicate regressions

The existing coverage was inspected before adding this case:

- `pivot-snapshot-store.test.ts`: CRUD, mismatch rejection preserving old snapshot, reference storage, lack of runtime freezing, and disposal/clear behavior.
- `pivot-recompute.test.ts`: initial lazy build, clean no-op, failed initial build, retry, reentrancy, determinism, and builder failure fallback.
- `pivot-partial-recompute-safety.p1-08x.test.ts`: publication before/after failure, full/partial recovery, dirty/rebuilding flags, last-good retention, and incremental-state invalidation.
- `pivot-named-binding-integration.p1-08ah.test.ts`: standalone calculate/transform/store/query, including `Error('#REF!')` and null/zero distinction.

Those suites already cover the important supported publication/recovery paths. The additional test narrows Error-instance identity/native-field observability and does not reassert their failure matrix.

## Verification state

Focused Jest result: **PASSED, 1/1**. The coordinator's Core typecheck, focused-test hygiene, sidecar integrity, and final integrated `git diff --check` are recorded in the PKG-13D/13R verification artifacts. This passing result is limited to the standalone component chain and does not establish Workbook-facing DTO semantics.
