# CS-002D4-R1 PKG-15D — Diagnostic delta

**Reference:** PKG-14D full Core result: 305 suites discovered, 293 passed, 7 failed, 5 skipped; 7,321 passed tests, 18 setup failures, 173 skipped, 9 todo, and no executed assertion failures. This is a prior diagnostic comparison, not a clean baseline.

## PKG-15 full diagnostic

The single no-exclusion TS-first Core Jest run discovered 307 suites: 295 passed, 7 failed, and 5 skipped; tests were 7,338 passed, 18 failed, 173 skipped, and 9 todo (7,538 total). The raw output `docs/engineering/CS-002D4-R1-PKG-15D-full-core-jest-output.txt` has SHA-256 `5eb3d438f6743c8f5b7b2d84dabe909aa35f9cbf5834645c3d229661a03816ee`.

Failure stages:

- **Six compile-blocked suites:** `workbook-snapshot-integration.test.ts`, `workbook-pivot-integration.test.ts`, `pivot-slicers.test.ts`, `pivot-partial-sanity.test.ts`, `pivot-partial-recompute.test.ts`, and `pivot-invalidation-workbook-bridge.test.ts`. TypeScript diagnostics concern unavailable Workbook Pivot registry/snapshot/recompute accessors and `setCellValue` on read-only `WorkbookSheetView` fixtures. These suites execute zero tests.
- **One fixture-setup suite:** `pivot-formula-integration.test.ts` has 18 failed tests because its shared fixture calls post-publication `Workbook.addSheet()`, which rejects before each intended assertion. These are setup failures, not executed product assertions.
- **Executed assertion failures:** none reported.

Thus, the seven blocked suites and 18 setup failures are unchanged from the PKG-14 diagnostic, while the inventory adds two suites and 17 passing tests from PKG-15A/B. This comparison is not a clean baseline and does not attribute historical failures to PKG-15.

## Interpretation constraints

- Keep the seven legacy Pivot integration failures in full discovery; do not suppress them.
- Separate compile-blocked fixture/API assumptions from setup failures and assertion failures.
- Compare suite and test inventories against PKG-14D with the changed test inventory stated explicitly.
- A passing focused PKG-15 selection does not establish full Core acceptance, global D2-11 closure, or Workbook-owned Pivot lifecycle reachability.
- Overall CS-002D4-R1 acceptance remains **WITHHELD**.
