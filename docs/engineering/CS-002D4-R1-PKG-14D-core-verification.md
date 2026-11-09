# CS-002D4-R1 PKG-14D — Core verification

**Starting Git revision:** `88b09634f17f3b39d88a88c5428f76b426459a2b`
**Runtime:** Node `v24.22.0`, npm `11.19.1`, Jest `30.5.2`, TypeScript `6.0.3`.
**Config:** `packages/core/jest.typescript-first.config.cjs`, `NODE_OPTIONS=--experimental-vm-modules`, serial `--runInBand`.
**Protected Core sidecars:** 237/237 passed before/after each Jest window; each saved pair compared byte-identically.
**Production changes in PKG-14:** none. Overall R1 acceptance remains **WITHHELD**.

## Verification windows

### D1 — New lane suites

Final focused command:

```sh
PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PATH \
NODE_OPTIONS=--experimental-vm-modules node node_modules/jest/bin/jest.js \
  --config packages/core/jest.typescript-first.config.cjs --runInBand \
  packages/core/__tests__/workbook-merged-formula-coordinate-contract.p1-pkg-14a.test.ts \
  packages/core/__tests__/workbook-transaction-disposal-publication.p1-pkg-14b.test.ts \
  packages/core/__tests__/pivot-recompute-validation-retry.p1-pkg-14c.test.ts
```

**Final result:** 3 suites passed, 36/36 tests. The raw final output is `CS-002D4-R1-PKG-14D-focused-verified-jest-output.txt`; its before/after sidecar check outputs and comparison status are `...focused-verified-sidecars-before.txt`, `...focused-verified-sidecars-after.txt`, and `...focused-verified-window-status.txt`.

Three earlier focused attempts are retained rather than overwritten. They exposed test-authoring issues: a literal escaped newline caused a TypeScript compile error in Lane B; Lane A initially expected numeric evaluation for dollar-marked references, and the Snapshot failure hook was not one-shot so it reinjected during rollback; the next attempt had a TS2352 cast diagnostic, and the following attempt showed that the evaluator returns the string `#NAME?` rather than an Error object. The tests were corrected to observe the actual string result, type the assertion accordingly, remove the stray line, and make failure injection one-shot. No production code was changed in response. Raw outputs are `...focused-jest-output.txt`, `...focused-final-jest-output.txt`, and `...focused-final2-jest-output.txt`, each with paired sidecar logs and status file.

### D2 — Adjacent compatibility

The combined selection included the three new PKG-14 suites, the PKG-13 additions, merge/formula graph/sparse-null tests, seven-operation Journal/Snapshot and observer-isolation suites, row/column dimensions, EventBus and queue suites, and standalone Pivot store/recompute/error cases.

**Result:** 25 suites passed, 338/338 tests. Command and full test list are recorded in `CS-002D4-R1-PKG-14D-adjacent-jest-output.txt`. Sidecar checks before/after are `...adjacent-sidecars-before.txt` and `...adjacent-sidecars-after.txt`; `...adjacent-window-status.txt` records command and compare exits.

### D3 — Full Core diagnostic, no exclusions

```sh
PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PATH \
NODE_OPTIONS=--experimental-vm-modules node node_modules/jest/bin/jest.js \
  --config packages/core/jest.typescript-first.config.cjs --runInBand
```

**Result:** 305 suites discovered; 293 passed, 7 failed, 5 skipped (300 of 305 executed). Tests: 7,321 passed, 18 failed, 173 skipped, 9 todo (7,521 total). The Jest exit was 1. The full raw output SHA-256 is `b87d9bc5ab96a4d9da514e08adabbb6ab7e825170e519771dc8637b032f6e390`.

The seven failing suite identities are unchanged from PKG-13:

- `pivot-formula-integration.test.ts`: one suite with 18 fixture-setup failures. Its setup calls post-publication `Workbook.addSheet()`, which is intentionally unavailable until the sheet-lifecycle journal slice is authorized. Intended Pivot assertions do not run.
- `workbook-snapshot-integration.test.ts`, `workbook-pivot-integration.test.ts`, `pivot-slicers.test.ts`, `pivot-partial-sanity.test.ts`, `pivot-partial-recompute.test.ts`, and `pivot-invalidation-workbook-bridge.test.ts`: ts-jest TypeScript diagnostics prevent suite execution (zero tests). Diagnostics concern unsupported Workbook Pivot registry/snapshot/invalidation accessors and, in some fixtures, mutable Worksheet operations assumed on `WorkbookSheetView`.

There were no resolver failures and no executed assertion failures. The compile-blocked and fixture-setup failures remain visible; none was excluded or treated as a green Core result. Standalone Pivot component tests passed in the focused and adjacent windows but do not establish Workbook-owned Pivot lifecycle.

## Typecheck and hygiene

- `npm run typecheck --workspace @cyber-sheet/core -- --pretty false`: passed; raw output `CS-002D4-R1-PKG-14D-core-typecheck-output.txt`.
- `node scripts/check-no-focused-tests.mjs`: passed; no focused markers; raw output `CS-002D4-R1-PKG-14D-test-hygiene-output.txt`.
- Final `git diff --check`, Markdown hygiene, and final 237-sidecar check are recorded in PKG-14R hygiene artifacts.
- Runtime/version capture: `CS-002D4-R1-PKG-14D-environment.txt`.
- Protected manifest SHA-256: `a6b89cdc3ccd8bfc8c054e5fafcb4dc84ed9ba1347eb2597a3e7bef938969b6c`.

The complete Core output is a current diagnostic, not a clean-tree regression attribution or recaptured acceptance baseline. Existing broadly dirty worktree changes were preserved. Overall CS-002D4-R1 acceptance remains **WITHHELD**.
