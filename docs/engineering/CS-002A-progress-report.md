# CyberSheet Progress Report — CS-002A

**Status:** In progress · **Priority:** P0 · **Reported:** 2026-10-17  
**Branch:** `main` · **Base HEAD:** `ec75a6e` · **Worktree:** uncommitted  
**Environment:** Manjaro Linux 6.12.94-1 (x86_64); Node v24.22.0; npm 11.19.1; TypeScript 6.0.3; Jest via `packages/core/jest.config.cjs`; browser: N/A.

## Goal and expected behavior

Establish one authoritative coordinate contract and trace formula dependencies from mutation through recalculation. `Address` and `AddressRange` are one-based, inclusive worksheet coordinates. For A1=10, B1=`=A1*2`, C1=`=B1+5`, both supported calculation paths produce 10/20/25 initially and 50/100/105 after A1 changes to 50.

Direct `Worksheet` use does not calculate automatically; callers explicitly invoke `autoRecalculate()` when a `FormulaEngine` is attached. `SpreadsheetEngine.run()` performs recalculation before emitting its completion events.

## Findings and source root cause

The first divergence was at dependency registration, before dirty propagation or formula evaluation. `FormulaEngine.parseCellReference('A1')` and public `Address` use `{row:1,col:1}`, while `extractFormulaDependencies()` returns zero-based A1 coordinates. `Worksheet.setCellFormula()` applied the +1 conversion only when `_engine` was present. A standalone worksheet therefore stored A1's dependency at `(0,0)`, even though mutations, formula lookup, and graph addresses were one-based. Its dirty propagation could not connect edits to the intended dependent formulas.

The same conditional conversion existed in `rebuildDependencyGraph()`, so snapshot-restored standalone sheets could disagree with sheets built by direct mutations. Both paths now normalize extracted cells and ranges to one-based exactly once. Formula extraction itself remains zero-based; its relative R1C1 origin is supplied as `{row: address.row-1, col: address.col-1}`.

Cycle diagnostics also differed by entry point: `getRecalculationPlan()` sorted members of each strongly connected component, while direct `recalc()` returned Tarjan traversal order. Recalc and subset-recalc now sort cycle keys before producing diagnostics.

Direct `autoRecalculate()` changed cached values without emitting `cell-changed` events for recalculated formula cells. The evaluator now queues a change event only when a formula result changes and flushes it after the graph pass clears dirty state. Formula-result events bypass the user-mutation journal. A regression verifies that a listener-triggered edit remains dirty for the next pass and does not add duplicate dependency edges. SpreadsheetEngine continues to apply values and emit its existing events after scheduler completion.

## A1 → B1 → C1 trace

| Stage | Direct `Worksheet` | `SpreadsheetEngine.run()` |
| --- | --- | --- |
| Registration | B1 precedents `[A1]`; C1 precedents `[B1]` | Same one-based graph edges |
| Initial plan/order | `[B1, C1]` | `[B1, C1]`; scheduler generation 1 |
| Initial result/cache | A1=10, B1=20, C1=25; dirty count returns to 0 | A1=10, B1=20, C1=25; 2 scheduled tasks complete |
| After A1=50 | affected formulas `[B1, C1]`; A1=50, B1=100, C1=105 | generation 2; 2 tasks complete; same cached values |
| Events | `cell-changed` for A1 and changed formula results B1/C1 | `cellsChanged`, then `formulasEvaluated(count=2, hasCycles=false)` after recompute |

The formula inputs observed during each pass are: B1 reads A1; C1 reads the updated B1. The worksheet `FormulaEngine` also recursively evaluates B1 while evaluating C1, so the direct evaluator call order is B1, C1, B1 even though the DAG schedules two formula nodes. Scheduler task order and cached results are correct; the extra recursive evaluation is an efficiency concern for a later focused ticket if benchmarks show material impact.

Direct `Worksheet` has no scheduler generation counter. Its observable trace is the dependency graph dirty set and topological plan. The engine path exposes scheduler generation through its internal scheduler; no public API was added for diagnostics.

## Files changed and API impact

- `packages/core/src/worksheet.ts`: unified one-based dependency normalization in formula registration and snapshot graph rebuild; emit formula-result cell-change events during direct recalculation.
- `packages/core/src/dag/DependencyGraph.ts`: deterministic ordering of cycle members in full and subset recalculation diagnostics.
- `packages/core/src/types.ts` and `packages/core/src/patch/PatchRecorder.ts`: add the optional `origin: "formula-result"` event discriminator and keep derived cache changes out of mutation patches.
- `packages/core/__tests__/formula-dag-integration.test.ts`: migrated worksheet fixture addresses from zero-based to the documented one-based contract; retained parser extraction expectations as zero-based. The old range edge-count assertion now documents compact range-watcher storage and is backed by an interior-edit behavior test.
- `packages/core/__tests__/cs-002a-coordinate-contract.test.ts`: new end-to-end coordinate and graph regressions.

No methods were added or changed. The exported `SheetEvents` union has an additive optional `origin: "formula-result"` discriminator so consumers and patch recording can distinguish derived cache changes from user-authored edits.

## Focused regressions and verification

- `PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PATH node ./node_modules/jest/bin/jest.js --config packages/core/jest.config.cjs --ci --runInBand --coverage=false packages/core/__tests__/cs-002a-coordinate-contract.test.ts packages/core/__tests__/formula-dag-integration.test.ts` — **pass**, 2 suites / 36 tests.
- Patch/transaction regression command covering `patch-engine.test.ts`, `transaction-engine.test.ts`, `fuzz-patch-algebra.test.ts`, and `fuzz-transaction.test.ts` — **pass**, 4 suites / 149 tests. This exercises rollback, patch serialization, and mutation journal behavior with the additive event discriminator.
- The regressions cover the A1→B1→C1 chain through both APIs, one-based edges and affected nodes, scheduler generations and completion events, diamond ordering, formula-to-literal replacement, formula clearing, transaction rollback, snapshot graph rebuild, interior range watchers, unrelated edits, maximum Excel coordinate XFD1048576, deterministic cycles, and safe deferred formula-result events.
- `PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PATH node ./node_modules/typescript/bin/tsc -b --clean && PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PATH npm run build` — **pass**, exit 0. npm prints the existing global `Unknown global config "tmp"` warning.
- `git diff --check` — **pass**.
- Initial pre-migration `differential.test.ts` / `metamorphic.test.ts` run — **fail**, 12 assertions total (3 differential, 9 metamorphic). CS-002A.2 migrated their fixtures and classified the rerun; see [CS-002A.2 progress report](CS-002A2-progress-report.md).

No full core suite, browser run, security audit, XLSX fidelity campaign, or benchmark campaign was run in CS-002A. Existing XLSX gate from CS-004A was not changed.

## Open defects and risks

| Severity | Defect / question | Owner | Reproduction / next action |
| --- | --- | --- | --- |
| P1 | Two differential seeds show direct self-cycles cached as `null` instead of `#CIRC!`; one self-inclusive SUM cycle differs from the reference oracle's zero | Formula engine / dependency graph owner; CS-002 | Reproduce `D2 = D2-3` and `E13 = E13-3` under one-based coordinates; define iteration-disabled behavior and write deterministic cycle errors. Decide the self-inclusive range result only after the cycle policy is explicit. |
| P2 | FormulaEngine recursively evaluates a referenced formula even after its cached result was produced earlier in the topological pass | Formula engine owner | New trace test observes three evaluator calls for two scheduled nodes in A1→B1→C1. Benchmark chain/diamond workloads before deciding whether cached-value evaluation should change |
| P1 | Workbook-scoped stable sheet identity, broader dependency semantics, and out-of-contract packed-key validation remain open architecture topics from CS-002 | Core architecture owner | Continue after cycle error semantics; reject coordinates beyond supported Excel row/column bounds before graph key packing |

No memory/security/XLSX fidelity impact was measured. Maximum supported Excel coordinates fit the current packed key (`row * 20_000 + col`) and the new test confirms XFD1048576 dependency lookup does not collide or truncate.

## Next focused ticket

**CS-002A.2** migrated and reran the differential/metamorphic fixtures. All active metamorphic assertions now pass; two direct self-cycle cases expose missing `#CIRC!` cache commitment, and one self-inclusive range cycle remains unresolved because the reference oracle returns zero. Continue under **CS-002** with deterministic cycle error commitment and an explicit iteration-disabled policy. Keep CS-005A statistical correctness, CS-006A pivot correctness, CSV export integrity, and broader graph architecture work separate. Clean-checkout CI remains unverified; no commit or production merge is authorized by this report.
