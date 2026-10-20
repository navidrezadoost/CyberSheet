# CyberSheet Progress Report — CS-002C

**Status:** Locally complete · **Priority:** P0 · **Reported:** 2026-10-17  
**Branch:** `main` · **HEAD:** `ec75a6e5d3e916047d42378f087e19251e30092b` · **Worktree:** uncommitted  
**Environment:** Manjaro Linux 6.12.94-1 (x86_64); Node v24.22.0; npm 11.19.1; TypeScript 6.0.3; Jest package configs; browser: N/A.

## Goal and expected behavior

Reconcile the regression increase reported after CS-002B against individual Jest test identities. Correct legacy test fixtures that still called one-based worksheet APIs with zero-based cell addresses, repair any confirmed product defects exposed by valid one-based operations, and keep the accepted CS-000F.4 baseline unchanged.

CS-002C also repeats circular-error lifecycle coverage for cycle creation, expansion, breaking, snapshot restoration, scheduled recalculation, and derived result events. No new skips, removed assertions, broadened mocks, or weakened result expectations were introduced.

## Findings and work completed

- Corrected stale address fixtures at Worksheet, search, clipboard, spill, and engine test boundaries. Random seeds, generated operations, formula text, and intended values were preserved. Structural insertion indexes remain zero-based where the API defines indexes rather than worksheet addresses.
- Fixed `GraphInvariantValidator` to convert zero-based formula-reference tokens to one-based worksheet addresses before packed-key construction.
- Removed redundant dependency extraction and registration in `PasteCommand`; `Worksheet.setCellFormula()` already registers normalized dependencies.
- Fixed merge-only insert/delete command snapshots to derive valid one-based paste bounds from affected merges instead of using `(0,0)`.
- Corrected worksheet row insertion, column insertion, and row reorder remapping so one-based stored cell addresses map consistently with zero-based structural indexes.
- Repaired the chaos comparison harness: its synchronous side now attaches a `FormulaEngine` and invokes `autoRecalculate()` before comparing cached values.
- Added a scheduled lifecycle regression that expands an existing two-cell cycle to three cells, verifies the newly affected formula-result events, then breaks the cycle and verifies recovery.

## Files changed and API impact

CS-002C production changes are in `packages/core/src/dag/GraphInvariantValidator.ts`, `packages/core/src/PasteCommand.ts`, `packages/core/src/InsertColumnCommand.ts`, `packages/core/src/DeleteColumnCommand.ts`, and `packages/core/src/worksheet.ts`.

Fixture and regression updates are in `packages/core/__tests__/PasteCommand.test.ts`, `adversarial.test.ts`, `chaos.test.ts`, `search-api.test.ts`, `ClipboardService.test.ts`, `worksheet-structure.test.ts`, `invariant-enforcement.test.ts`, `cs-002b-cycle-handling.test.ts`, `packages/core/test/FuzzingWithShrinking.test.ts`, `DifferentialCorrectness.test.ts`, `MetamorphicProperties.test.ts`, `InsertDeleteColumn.test.ts`, `InsertColumn.debug.test.ts`, and the spill/transaction tests under `packages/core/src/__tests__/`.

No public API signatures or methods changed. The existing documented address contract remains one-based and inclusive. Structural index parameters retain their existing zero-based meaning. This report attributes only the changes above to CS-002C; the worktree contains unrelated earlier ticket changes.

## Verification

- Build: `PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PATH npm run build` — **pass**, exit 0. npm emitted the existing global `Unknown global config "tmp"` warning.
- Focused gate: 23 suites, **456 passed, 4 skipped**. Command:

  ```sh
  PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PATH node ./node_modules/jest/bin/jest.js --config packages/core/jest.config.cjs --ci --runInBand --coverage=false --silent \
    packages/core/__tests__/cs-002b-cycle-handling.test.ts packages/core/__tests__/cs-002a-coordinate-contract.test.ts packages/core/__tests__/formula-dag-integration.test.ts packages/core/__tests__/differential.test.ts packages/core/__tests__/metamorphic.test.ts packages/core/__tests__/patch-engine.test.ts packages/core/__tests__/transaction-engine.test.ts packages/core/test/FuzzingWithShrinking.test.ts packages/core/test/DifferentialCorrectness.test.ts packages/core/test/MetamorphicProperties.test.ts packages/core/test/InsertDeleteColumn.test.ts packages/core/test/InsertColumn.debug.test.ts packages/core/__tests__/chaos.test.ts packages/core/__tests__/adversarial.test.ts packages/core/src/__tests__/spill-invariants.test.ts packages/core/src/__tests__/spill-reversibility.test.ts packages/core/src/__tests__/transaction-enforcement.test.ts packages/core/__tests__/clear-cells-undo-redo.test.ts packages/core/__tests__/search-api.test.ts packages/core/__tests__/ClipboardService.test.ts packages/core/__tests__/worksheet-structure.test.ts packages/core/__tests__/invariant-enforcement.test.ts packages/core/__tests__/PasteCommand.test.ts
  ```

- Final full core: 234 suites; **211 passed, 18 failed, 5 skipped**. Of 6,929 tests: **6,642 passed, 105 failed, 173 skipped, 9 todo**; zero runtime-error suites. Runtime 61.139 seconds. Command:

  ```sh
  PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PATH node ./node_modules/jest/bin/jest.js --config packages/core/jest.config.cjs --ci --runInBand --logHeapUsage --coverage=false --json --outputFile=/tmp/cs-002c-final-core-results.json
  ```

- IO-XLSX package gate: **2 suites passed; 25 passed, 2 skipped**. Command:

  ```sh
  NODE_OPTIONS=--experimental-vm-modules PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PATH node ./node_modules/jest/bin/jest.js --config packages/io-xlsx/jest.config.cjs --ci --runInBand --coverage=false
  ```

- `PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PATH npm run check:no-focused-tests` — **pass**, no `.only`/`fit`/`fdescribe` markers.
- `git diff --check` — **pass**.
- All cycle lifecycle assertions pass, including scheduled cycle expansion and derived result events. The final inventory records each remaining failed identity, error type, source location, original triage group, and owner in [CS-002C failure inventory](CS-002C-failure-inventory.json) with a Markdown summary at [CS-002C failure inventory](CS-002C-failure-inventory.md).

### Assertion-level delta

| Baseline | Failed test identities | Now passing | Newly failing | Still failing |
| --- | ---: | ---: | ---: | ---: |
| CS-002B pre-CS-002C capture | 280 | 175 | 0 | 105 |
| Raw accepted CS-000F.4 core run | 138 | 33 | 0 | 105 |

The final 105 failures are all identities present in both previous captures. There are no unexplained new failures attributable to CS-002B or CS-002C. The CS-000F.4 inventory JSON has 144 rows under `failures`, six of which are IO-XLSX tests; the raw accepted core JSON has 138 core failure identities. The accepted inventory was not edited, and comparison used the raw core JSON.

## Benchmarks and quality effects

No controlled before/after benchmark campaign was run, so there is no benchmark dataset or hardware measurement to report. The full Jest suite contains performance and memory assertions but is not a benchmark campaign. One prior full run failed a 10k structural memory-growth threshold; the final run passed it, so that threshold is load-sensitive.

No security audit or browser test was run. The IO-XLSX regression gate passed unchanged; CS-002C adds no XLSX serialization behavior. No memory or security impact was measured.

## Open defects

All 105 remaining test failures reproduce identities from the accepted raw core baseline. The full gate remains red pending their separate workstreams.

| Severity | Defect area | Owner | Reproduction / workaround |
| --- | --- | --- | --- |
| P1 | Statistical distribution correctness: 36 failures across chi-square, F, Student-t, and normal oracle suites | Statistics/formula owner | Run `statistical-week2-day1.test.ts`, `statistical-week2-day2.test.ts`, `statistical-week2-day3.test.ts`, and `distribution-oracle-validation.test.ts`. No verified workaround. |
| P1 | Pivot calculated fields, partial recompute, GETPIVOTDATA, slicers, and pivot state: 60 failures | Pivot engine owner | Run `pivot-calculated-fields.test.ts`, `pivot-formula-integration.test.ts`, `pivot-partial-recompute.test.ts`, `pivot-partial-sanity.test.ts`, `pivot-registry.test.ts`, and `pivot-slicers.test.ts`. Full rebuild remains the documented fallback for partial recompute where supported. |
| P1 | Formula, scheduler, spill, conditional-formatting, and merge behavior: 8 failures | Formula, scheduler, spill, and worksheet owners | Reproduce with `scheduler-composition.test.ts`, `dag-debug.test.ts`, `spill.test.ts`, `conditional-formatting-formula-compiler.test.ts`, `datetime-arithmetic.test.ts`, and `merge-api.test.ts`. No general workaround verified. |
| P2 | AlphaVantage throttle test exceeds its 5-second Jest timeout under full-suite load | Core data adapter owner | Run `AlphaVantageDriver.test.ts` in isolation to compare with full-run timing; no production workaround established. |

## Risks and next focused ticket

CS-002C reconciles the full-core regression signal, but the calculation, pivot, and scheduler failures remain release risks under their existing tickets. The current worktree is uncommitted; no commit or production merge was made. Clean-checkout CI remains unverified.

Next focused ticket: **CS-002D — Dependency graph boundary and identity audit**. Validate workbook-scoped sheet identity, cross-sheet/range dependency behavior, and coordinate checks before packed-key construction through snapshot restoration and structural relocation. Keep statistical, pivot, CSV export, and XLSX feature work in their assigned tracks.
