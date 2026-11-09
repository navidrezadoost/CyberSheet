# CS-002D4-R1 PKG-02C — Differential and Failure Verification

## Added deterministic mixed fixture

`packages/core/__tests__/workbook-seven-operation-differential.p1-pkg-02c.test.ts` runs the same explicit operation sequence under Journal and Snapshot. It spans two adopted Worksheets and covers all seven authorized operation kinds, interleaved cell and dimension writes, repeated row-height/column-width writes, formula dependency creation and clearing, style replacement, and hidden-column preservation. The operation sequence is fixed in source and is reproducible without random state.

The detached comparison includes each Worksheet's complete `extractSnapshot()` result (cell records, formulas, DAG edges, explicit sparse row-height/column-width entries, hidden columns, and volatile addresses), selected precedent/dependent observations, dirty membership for fixture formula cells, dirty count, and volatile count. Explicit defaults are seeded separately from absent row/column map entries.

The injected failure case stages all seven kinds across two Worksheets and fails on the second column-width map write after earlier cell, formula, style, and row-height writes. For each strategy it compares both exact pre/post Worksheet state bundles, verifies no Worksheet commit event escaped, and requires Workbook health to remain `healthy`. The fixed transaction sequence is the failure trace; the injected cut is `after-column-width-map-write`, occurrence 2.

A second fault case uses the private `beforeBatchSettlement` hook to fail before settling the second Worksheet after the first Worksheet batch has settled. Both Journal and Snapshot restore both exact state bundles, emit no commit event, and remain healthy. This hook was added because the guarded settlement method is read-only to test spies and no existing supported injection point reached this boundary. It is unexported and changes no behavior when unset.

## Results and adjacent evidence

| Evidence | Result |
| --- | --- |
| New Journal/Snapshot success, direct differential, mixed rollback, and batch-settlement cases | 7/7 passed |
| Combined PKG-01/02A/02B ownership, queue, EventBus bridge, row/column, differential, and benchmark selection | 8 suites, 144/144 passed |
| Core package typecheck (`npm run typecheck --workspace @cyber-sheet/core -- --pretty false`, Node v24.22.0) | Passed |
| `scripts/check-no-focused-tests.mjs` | Passed; no focused markers in the package scan |
| `git diff --check` | Passed |
| Protected Core sidecar manifest | 237/237 hashes matched before and after |

The combined selection includes the existing tests for cell and graph fault cuts, style allocation and displaced-style release, sparse dimension before-images, multiple-sheet rollback, same-value dimension events, listener exception isolation, FIFO/cancellation/disposal, and transition to `recovery-required`. On uncertain restoration, the existing tests retain operation and rollback errors and prove subsequent mutation rejection. The PKG-02B tests also cover cleanup failure after restoration and before batch discard.

The staged-order assertions remain in PKG-02B's interleaved event tests. The PKG-02C Workbook EventBus listener receives the committed cell-change events and observes the fully committed mixed state, including final row height and column width. Under the current EventBus bridge, dimension-only `sheet-mutated` events are Worksheet events and are not forwarded as a named Workbook EventBus event. The tests make no claim of renderer repaint completion.

## Legacy Pivot integration classification

`packages/core/__tests__/workbook-snapshot-integration.test.ts` was attempted as required, with the protected source sidecars parked and restored. It fails during ts-jest TypeScript diagnostics and executes **0 tests**. The diagnostics are missing `Workbook.getPivotSnapshotStore()` and `Workbook.getPivotRegistry()` accessors. This is a compile-time API/fixture block in legacy Pivot integration coverage, not a seven-operation runtime assertion or fixture-setup failure. No Pivot accessor was added; the independent mixed seven-operation fixture provides the authorized transaction coverage.

## Environment and integrity notes

The system default Node was v26.10.0 and produced a Jest/ESM loading error before test execution. The repository's installed Node v24.22.0 was then used with `NODE_OPTIONS=--experimental-vm-modules`, matching prior verification procedure. Nine untracked generated Core source `.js` sidecars were temporarily moved under a `/tmp` directory for each Jest run and restored using an EXIT trap; the manifest hashes matched afterward. Jest's existing ts-jest `globals` deprecation and TS151001 `esModuleInterop` advisories were non-failing.

See [focused verification output](CS-002D4-R1-PKG-02C-focused-verification-output.txt), [benchmark output](CS-002D4-R1-PKG-02C-benchmark-output.txt), [raw benchmark samples](CS-002D4-R1-PKG-02C-benchmark-raw.json), and [legacy Pivot classification output](CS-002D4-R1-PKG-02C-pivot-adjacent-classification-output.txt). No full Core suite was run, no historical baseline was recaptured, and no production change, ledger promotion, frozen-register edit, persistence change, or Pivot repair was made. Overall CS-002D4-R1 acceptance remains **WITHHELD**.
