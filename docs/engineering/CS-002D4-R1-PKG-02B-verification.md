# CS-002D4-R1 PKG-02B — Verification

**Result:** focused implementation verification passed; an adjacent legacy integration suite remains compilation-blocked for unrelated Pivot API mismatches.

## Focused regressions

The new `workbook-column-width-journal.p1-pkg-02b.test.ts` covers port and transaction-context success, all validation classes, ownership guarding, absent versus explicit 80 px state, repeated/multiple column writes, Journal and Snapshot restoration, all seven operation kinds, multi-Worksheet commit and rollback, hidden-column independence, staged event order and frequency, observer isolation, cancellation/disposal, rollback failure and recovery-required, standalone compatibility, object snapshots, and binary-codec omission.

The focused selection with the new suite plus row-height Journal, mutation queue, capability, owner escape, Workbook event bridge, and transaction engine suites passed **7 suites, 189/189 tests**. This includes 20 tests from the new column-width suite. Journal and Snapshot were both exercised. Jest emitted existing ts-jest deprecation, TS151001, and stale `baseline-browser-mapping` advisories; they were non-failing.

An additional attempted `workbook-snapshot-integration.test.ts` did not execute because ts-jest compilation reports existing missing `Workbook.getPivotSnapshotStore()` and `Workbook.getPivotRegistry()` methods. This is a compile-time compatibility block in the old Pivot integration test, not a failing width assertion. The full Core suite was not run.

## Typecheck and hygiene

- Core typecheck: `npm --workspace packages/core run typecheck -- --pretty false` — passed.
- Focused-marker scan of the new test: no `.only` or `.fit` markers.
- `git diff --check`: passed.
- Direct trailing-whitespace check of the five new test/report files: zero findings.
- Protected Core sidecars: the current PKG-01K manifest contains 237 paths; hashes matched before and after each serialized Jest run, **237/237**. Generated files were isolated for Jest and restored.

## Scope

No full Core suite, build, baseline recapture, or broad Pivot repair was performed. No production change outside the Workbook-owned `setColumnWidth` slice and its private failure seams was made. Overall CS-002D4-R1 acceptance remains WITHHELD.
