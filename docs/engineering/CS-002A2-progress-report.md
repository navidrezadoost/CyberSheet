# CyberSheet Progress Report — CS-002A.2

**Status:** In progress · **Priority:** P0 · **Reported:** 2026-10-17  
**Branch:** `main` · **Base HEAD:** `ec75a6e` · **Worktree:** uncommitted  
**Environment:** Manjaro Linux 6.12.94-1 (x86_64); Node v24.22.0; npm 11.19.1; TypeScript 6.0.3; Jest via `packages/core/jest.config.cjs`; browser: N/A.

## Goal

Migrate the differential and metamorphic test fixtures to the documented one-based `Address` contract without changing mathematical expectations, PRNG seeds, random draw sequences, operation counts, or generated formulas. Classify every assertion that remained after migration.

## Changes

- Differential operation targets now add one to generated zero-based row/column choices. The random generator still draws the same choices in the same order; formula reference strings are unchanged.
- Explicit differential chain, clear, overwrite, and rapid-mutation cases now use one-based addresses.
- Optimized state snapshots now include formula cells whose cached value is `null`, matching the reference snapshot's formula-state coverage.
- Randomized comparisons now stop at the first differing operation and print its operation, differing expected/actual cells, plus the optimized graph statistics and formula precedents.
- Metamorphic worksheet accesses and state scans now use one-based addresses. All expected mathematical values and formulas remain unchanged.
- Direct formula-result events are deferred until after the dependency graph finishes clearing dirty state. A new regression verifies event-triggered edits remain pending for the next recalculation and that result notifications do not duplicate dependency edges or enter the user-mutation journal.
- `SheetEvents.cell-changed` now has an additive optional `origin: "formula-result"` discriminator for derived cached-result updates. `PatchRecorder` ignores those events so undo/redo patches contain only user mutations.

## Files and API impact

- `packages/core/__tests__/differential.test.ts` and `packages/core/__tests__/metamorphic.test.ts`: one-based fixture migration, complete formula-state snapshots, first-divergence diagnostics, and updated one-based state scans.
- `packages/core/__tests__/cs-002a-coordinate-contract.test.ts`: formula-result event ordering, reentrant edit, and mutation-patch isolation coverage.
- `packages/core/src/worksheet.ts`, `packages/core/src/types.ts`, and `packages/core/src/patch/PatchRecorder.ts`: deferred result notifications with the optional event origin discriminator; exclude derived results from recorded mutations.
- `docs/engineering/CS-002A-progress-report.md` and this report: updated CS-002A status, failure classifications, and next action.

The only public surface change is the additive optional `SheetEvents.cell-changed.origin` value `"formula-result"`; no methods or existing event fields changed.

## Verification

- `PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PATH node ./node_modules/jest/bin/jest.js --config packages/core/jest.config.cjs --ci --runInBand --coverage=false packages/core/__tests__/differential.test.ts` — **fail**, 1 suite; 5 passed / 3 failed out of 8 tests.
- `PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PATH node ./node_modules/jest/bin/jest.js --config packages/core/jest.config.cjs --ci --runInBand --coverage=false packages/core/__tests__/metamorphic.test.ts` — **pass**, 1 suite; 24 passed, 2 existing skipped, 26 total.
- `PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PATH node ./node_modules/jest/bin/jest.js --config packages/core/jest.config.cjs --ci --runInBand --coverage=false packages/core/__tests__/cs-002a-coordinate-contract.test.ts packages/core/__tests__/formula-dag-integration.test.ts` — **pass**, 2 suites / 36 tests.
- `PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PATH node ./node_modules/jest/bin/jest.js --config packages/core/jest.config.cjs --ci --runInBand --coverage=false packages/core/__tests__/patch-engine.test.ts packages/core/__tests__/transaction-engine.test.ts packages/core/__tests__/fuzz/fuzz-patch-algebra.test.ts packages/core/__tests__/fuzz/fuzz-transaction.test.ts` — **pass**, 4 suites / 149 tests.
- `git diff --check` — **pass**.
- `PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PATH node ./node_modules/typescript/bin/tsc -b --clean && PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PATH npm run build` — **pass**, exit 0, including deferred formula-result event changes. npm prints the existing global `Unknown global config "tmp"` warning.

## Classification of the three differential failures

All three first divergent operations create a one-based self-cycle. The graph snapshot confirms a self-precedent for the formula cell. `SpreadsheetEngine` reports completion with the formula cached as `null`; cyclic nodes are not included in the scheduler's formula evaluation plan, so no deterministic error value is committed.

| Seed / test | First divergent operation | Reference expected state | Optimized actual state | Graph evidence | Classification |
| --- | --- | --- | --- | --- | --- |
| 99999 / 100 formula operations | 19: set A7 (`row:7,col:1`) to `=SUM(A6:A7)` | A7 value `0` | A7 value `null` | 3 nodes, 1 edge; A7 precedents `[A7]` | **Unresolved.** This is a self-inclusive range cycle. ReferenceEngine's fixed-point evaluation converges to zero, but the intended iteration-disabled cycle result has not yet been standardized. The optimized engine's missing cycle result remains a defect candidate. |
| 77777 / 200 operations | 115: set D2 (`row:2,col:4`) to `=D2-3` | D2 value `#CIRC!` | D2 value `null` | 21 nodes, 20 edges; D2 precedents `[D2]` | **Production calculation defect.** Direct self-reference is detected by the oracle but receives no committed error value in SpreadsheetEngine. |
| 55555 / 500 operations | 111: set E13 (`row:13,col:5`) to `=E13-3` | E13 value `#CIRC!` | E13 value `null` | 26 nodes, 26 edges; E13 precedents `[E13]` | **Production calculation defect.** Same direct self-cycle behavior as the 200-operation case. |

The operation stream and seeds remain reproducible. The new comparator emits the expected state, actual state, and graph snapshot directly in the failing test output. The first two randomized differential tests (50 operations and 100 operations without formulas), the explicit A1→A2→A3 chain, and the other deterministic differential cases pass.

## Conclusion and next ticket

The prior nine metamorphic failures were test-address drift: all 24 active metamorphic tests pass with the unchanged mathematical expectations after one-based migration. The two row/column deletion symmetry tests remain skipped because those worksheet APIs do not exist.

The differential migration exposed real cycle handling gaps, rather than additional coordinate drift. Continue in **CS-002** with a minimal one-based cycle regression, deterministic `#CIRC!` value commitment for cycle nodes, preservation of unrelated formula evaluation, and an explicit default policy for iteration-disabled calculation. Do not treat the self-inclusive SUM oracle's zero as the approved expected result until that policy is decided. Packed-key range validation for out-of-contract addresses also remains an architecture-level CS-002 item.

No benchmark, memory study, security audit, browser run, clean-checkout CI, commit, or production merge was performed for CS-002A.2. Production merge remains withheld.
