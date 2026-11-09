# CS-002D4-R1 PKG-13D — Integration verification

**Starting revision:** `88b09634f17f3b39d88a88c5428f76b426459a2b`
**Runtime:** Node `v24.22.0`, npm `11.19.1`, Jest `30.5.2`, TypeScript `6.0.3`.
**Starting worktree:** 521 dirty paths; preserved.
**Ending worktree:** 560 dirty paths; preserved.
**Production source changes in PKG-13:** none.
**Overall CS-002D4-R1 acceptance:** **WITHHELD**.

## Serialized test windows

All Jest commands used `NODE_OPTIONS=--experimental-vm-modules`, the TypeScript-first configuration `packages/core/jest.typescript-first.config.cjs`, `--runInBand`, and the declared Node runtime through `PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PATH`. The 237-entry protected Core sidecar manifest was checked before and after every Jest window. Each before/after output pair was byte-identical; no protected sidecar was changed.

| Window | Result | Raw output |
| --- | --- | --- |
| Lane A merged-member formula origin | 1 suite, 3/3 tests passed | `CS-002D4-R1-PKG-13D-lane-a-jest-output.txt` |
| Lane B seven-operation side-effect rollback matrix | 1 suite, 2/2 tests passed | `CS-002D4-R1-PKG-13D-lane-b-jest-output.txt` |
| Lane C standalone Pivot Error publication | 1 suite, 1/1 test passed | `CS-002D4-R1-PKG-13D-lane-c-jest-output.txt` |
| Adjacent merge, transaction, event, queue, and Pivot selection | 22 suites, 302/302 tests passed | `CS-002D4-R1-PKG-13D-adjacent-jest-output.txt` |
| Full Core discovery, no exclusions | 302 suites discovered; 290 passed, 7 failed, 5 skipped; 7,285 tests passed, 18 failed, 173 skipped, 9 todo | `CS-002D4-R1-PKG-13D-full-core-jest-output.txt` |

The full Core command was:

```sh
PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PATH \
NODE_OPTIONS=--experimental-vm-modules \
node node_modules/jest/bin/jest.js \
  --config packages/core/jest.typescript-first.config.cjs --runInBand
```

The full-run raw output SHA-256 is `04b947ca89d5a17a7094817c3a63c8968116b229ca6b8fda28bf64f05bf54e46`. The Jest command exited nonzero because the seven existing Pivot-related suites still fail at fixture setup or TypeScript compilation. No intended assertion failed in this full run.

## Full-run failure stages

The one runtime-failing suite, `pivot-formula-integration.test.ts`, reports 18 failed tests because its fixture calls `Workbook.addSheet()` after Workbook publication. That API currently rejects this operation with “Post-publication sheet creation is unavailable until the sheet-lifecycle journal slice is authorized.” These are setup failures before the intended Pivot formula assertions, not 18 independently executed product assertions.

Six suites fail during ts-jest compilation and execute zero tests:

- `workbook-snapshot-integration.test.ts`: missing `Workbook.getPivotSnapshotStore()`.
- `workbook-pivot-integration.test.ts`: missing `Workbook.getPivotRegistry()` and incompatible owner-view fixture assumptions.
- `pivot-slicers.test.ts`: `WorkbookSheetView`/`Worksheet` fixture mismatch and unavailable registry access.
- `pivot-partial-sanity.test.ts`: unavailable Workbook Pivot registry API.
- `pivot-partial-recompute.test.ts`: unavailable Workbook Pivot registry API.
- `pivot-invalidation-workbook-bridge.test.ts`: unavailable invalidation/registry accessors and mutation methods on `WorkbookSheetView`.

These failures concern unsupported Workbook-owned Pivot integration paths. The standalone Pivot component suites pass in the bounded verification. No Workbook Pivot API or lifecycle was added.

## Adjacent comparison and attribution limits

PKG-11's full Core run recorded 298 suites and 7,473 tests: 286 suites passed, 7 failed, 5 skipped; 7,273 tests passed, 18 failed, 173 skipped, 9 todo. The current worktree's discovery is four suites and 12 tests larger; pass totals grew by four suites and 12 tests, while the same seven failing suite identities and 18 setup/compile failures remained. The inventory delta is not attributed solely to PKG-13. This is an expanded diagnostic comparison, not a recaptured acceptance baseline or proof of historical causality.

The 22-suite adjacent selection passed 302/302 and includes all new PKG-13 tests plus relevant merge, formula graph, sparse-null, seven-operation, observer-isolation, dimension, EventBus, queue, and standalone Pivot regressions. Its scope does not replace the full Core run or resolve the blocked Workbook integration contracts.

## Typecheck, hygiene, and integrity

- `npm run typecheck --workspace @cyber-sheet/core -- --pretty false`: passed. Raw output: `CS-002D4-R1-PKG-13D-core-typecheck-output.txt`.
- `node scripts/check-no-focused-tests.mjs`: passed; no focused markers found. Raw output: `CS-002D4-R1-PKG-13D-test-hygiene-output.txt`.
- `git diff --check`: passed at the recorded PKG-13D check. Final rerun is recorded with PKG-13R integration.
- Markdown whitespace/final-newline scan: eight PKG-13 Markdown files passed before the two final D/R reports were added; the final scan is repeated for all PKG-13 reports at integration.
- Protected manifest SHA-256: `a6b89cdc3ccd8bfc8c054e5fafcb4dc84ed9ba1347eb2597a3e7bef938969b6c`.
- Before/after sidecar check artifacts are retained for the three lane windows, adjacent selection, and full Core run. Each pair contains 237 successful entries and compares byte-for-byte. The final post-run check is `CS-002D4-R1-PKG-13D-final-sidecar-check.txt`.

PKG-13 adds characterization tests and reports only. No ledger dispositions, frozen registers, acceptance baselines, or historical evidence were modified. Existing unrelated dirty worktree changes remain preserved. Overall CS-002D4-R1 acceptance remains **WITHHELD**.
