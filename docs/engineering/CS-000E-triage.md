# CS-000E diagnostic triage

**Baseline:** 2026-10-17, branch `main`, HEAD `ec75a6e` (uncommitted worktree)  
**Reproduction:** `npm run build`; core Jest command recorded in `CS-000-progress-report.md`.  
**Important:** This is a local baseline. No GitHub Actions run has been triggered for this worktree.

**CS-000F update (2026-10-17):** The suite table below is the original triage baseline. Test-runner/API repair has since enabled assertions in 12 of the 14 non-Vitest suites that initially failed before assertions. The updated suite-by-suite outcomes, current blockers, and the newly exposed runtime failures are in [CS-000F-progress-report.md](CS-000F-progress-report.md). Do not reuse the historical 33-failure aggregate as the current result: the latest full Jest process terminated before Jest emitted final totals. UI export and copy defects remain release-blocking; see the CS-000F report.

## Repository TypeScript diagnostics

The previously reported 901 came from an incremental build with incomplete generated declarations and React test files included in the production project. After clearing TypeScript build outputs and correcting those build inputs, a clean local build reported 635; after the initial source/config repairs the clean build reported **164**. Current clean output is zero, detailed below. The original 901 is historical evidence, not the clean baseline. The 635 clean diagnostics fell to 164 after the first repairs, then to 63 after icon/renderer fixes, then 52, 41, 26, 12, and 2 during React API work. The final clean build has zero diagnostics.

| Clean checkpoint | Icons | Renderer | React | XLSX | Total | Root cause resolved |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Initial clean baseline | 100 | 29 | 505 | 1 | 635 | React test files/shim contaminated production types; broken Angular/icon exports; renderer extended-value/color/style contracts; XLSX worker overload. |
| After initial root-build repairs | 82 | 19 | 63 | 0 | 164 | React shim/test compilation and straightforward API errors; core barrel and worker fixes. Remaining icon identifiers, renderer contract errors, and React API mismatches. |
| After icon + renderer repair | 0 | 0 | 63 | 0 | 63 | Eight dynamic JSX-in-SVG sources replaced by static source and deterministic generator; renderer rich/entity normalization, immutable style mutation, and structured color/alignment handling. |
| React type repair checkpoints | 0 | 0 | 52 → 41 → 26 → 12 → 2 | 0 | 52 → 41 → 26 → 12 → 2 | React 19 refs/timers; toggle-group prop contracts; core CommandManager and selection-state types; obsolete API calls and duplicate exports; final getter-name correction. |
| Final clean build | 0 | 0 | 0 | 0 | 0 | All production package diagnostics cleared without weakening strict compiler settings. |

The historical 635 diagnostic code inventory was: TS7006 245, TS1005 100, TS2345 98, TS2347 56, TS2339 28, TS7031 26, TS2882 20, TS2322 19, TS2614 9, TS2724 6, TS2694 6, TS2307 5, TS2304 3, TS2305 3, TS2300 2, TS2308 2, TS2740 2, TS2365 1, TS2540 1, TS2341 1, TS2769 1, and TS2820 1. The post-triage 164 were TS2304 72, TS2345 30, TS2322 24, TS7006 11, TS2339 12, TS2552 4, TS2540 1, TS2341 1, TS2740 2, TS2698 1, TS2300 2, TS2305 1, TS2308 2, and TS2820 1. Per-code totals at React checkpoints are retained in the local build logs; final diagnostic counts by code are all zero.

| Package | Error codes and counts | Root-cause class / likely owner |
| --- | --- | --- |
| `icons` (0) | — | Strict typecheck passes. Eight malformed JSX-as-SVG sources were made static; deterministic React generator added. Icons maintainers. |
| `renderer-canvas` (0) | — | Strict production typecheck passes. Rich text/entity display normalization, readonly style mutation, structured colors/fills, and alignment handling repaired. Renderer/core maintainers. |
| `react` (0) | — | Strict production typecheck passes. Corrected FormulaEngine registration, Worksheet style/number-format API use, selection state contracts, Page Layout props, exports, cleanup callbacks, and extended display-value handling. React/core maintainers. |
| `io-xlsx` (0) | — | The Worker `postMessage` overload mismatch was fixed by using the standard options object. |

## Core suite triage (33 failures)

Classes: **production defect** = runtime behavior needs correction; **test-contract drift** = tests call or expect an obsolete/inconsistent contract; **configuration** = runner/compiler setup; **fixture/environment** = nondeterministic or invalid test setup; **unresolved** = available evidence does not isolate the cause. Each row remains failing; classification is provisional and does not mark it repaired.

| Suite | Failed tests | Classification | Evidence / owner |
| --- | ---: | --- | --- |
| `AlphaVantageDriver.test.ts` | 1 | fixture/environment | Rate-limit test exceeds 5s while using a 10s window. Provider test owner; use fake clock or model elapsed time. |
| `functions/statistical-week2-day2.test.ts` | 9 | production defect | F-distribution calls return error objects where numeric results are expected. Formula/statistics owner. |
| `functions/statistical-week2-day1.test.ts` | 11 | production defect | T-distribution calls return error objects. Formula/statistics owner. |
| `invariant-enforcement.test.ts` | 3 | test-contract drift / unresolved | One expected value is inconsistent with the current zero-based test addresses; message token and recalculation expectations need API-level review. Core owner. |
| `spill.test.ts` | 1 | production defect | `clearSpill` leaves `spillSource` metadata on source cell. Calculation owner. |
| `functions/datetime-arithmetic.test.ts` | 2 | fixture/environment | `TODAY` assertions assume a fixed month and fail in October. Date-function test owner; derive expectations from injected clock. |
| `pivot-formula-integration.test.ts` | 15 | production defect / unresolved | Pivot lookups mostly produce `#VALUE!` or other wrong results. Pivot/formula owners. |
| `pivot-partial-sanity.test.ts` | 3 | production defect / unresolved | Expected source group is absent after pivot setup. Pivot owner. |
| `src/__tests__/phase36a-forced-proof.test.ts` | 2 | test-contract drift | Test calls `.set()` on the current group state store, which does not expose that API. Pivot test owner. |
| `pivot-registry.test.ts` | 1 | test-contract drift | Test expects metadata without the current dirty/build tracking fields. Pivot owner. |
| `PasteCommand.test.ts` | 2 | production defect / unresolved | Style operation appears to trigger a second DAG registration. Command/DAG owners. |
| `conditional-formatting-formula-compiler.test.ts` | 1 | production defect | `OR` expression evaluates false for a case expected true. Conditional-formatting owner. |
| `formula-dag-integration.test.ts` | 9 | production defect / contract ambiguity | Range watcher edges, evaluation, and address behavior disagree with expectations. CS-002/core graph owners. |
| `merge-api.test.ts` | 1 | test-contract drift | Test expects object identity through merge redirection, but returned cell is a detached value-equivalent projection. Worksheet owner to define contract. |
| `functions/distribution-oracle-validation.test.ts` | 6 | production defect / unresolved | Normal distribution symmetry calculation yields `NaN`. Formula/statistics owner. |
| `dag-debug.test.ts` | 1 | production defect / contract ambiguity | Recalculation yields 0 instead of 20 under legacy zero-based addresses. CS-002 owner. |
| `functions/statistical-week2-day3.test.ts` | 10 | production defect | Chi-square calls return error objects where numbers are expected. Formula/statistics owner. |
| `test/integration-hardening-sprint.test.ts` | 0 assertions | configuration / package boundary | ts-jest cannot resolve worksheet dimension exports from `@cyber-sheet/core`. Core/XLSX owners. |
| `workbook-snapshot-integration.test.ts` | 0 assertions | test-contract drift | Test metadata omits newly required pivot dirty/build state. Snapshot/pivot owners. |
| `workbook-pivot-integration.test.ts` | 0 assertions | test-contract drift | Same required metadata fields absent in fixture. Pivot owner. |
| `scheduler-composition.test.ts` | 0 assertions | test-contract drift | Tests directly assign a readonly cell formula. Scheduler test owner. |
| `pivot-staleness.test.ts` | 0 assertions | test-contract drift | Test uses an obsolete two-argument constructor; implementation requires recompute engine. Pivot owner. |
| `pivot-slicers.test.ts` | 0 assertions | test-contract drift | Test uses outdated pivot registry signatures. Pivot owner. |
| `pivot-recompute.test.ts` | 0 assertions | test-contract drift | Recompute constructor now requires a source-data extractor. Pivot owner. |
| `pivot-partial-recompute.test.ts` | 0 assertions | test-contract drift | Test reads a removed `PivotSnapshot.data` shape. Pivot owner. |
| `pivot-calculated-fields.test.ts` | 0 assertions | unresolved | Typed spy wrapper spreads an untyped argument list into a fixed signature. Pivot test owner. |
| `metamorphic.test.ts` | 0 assertions | test-contract drift | Calls nonexistent `insertRow`; current worksheet method is `insertRows`. Worksheet test owner. |
| `getpivotdata.test.ts` | 0 assertions | test-contract drift | Obsolete two-argument `GetPivotData` construction. Pivot owner. |
| `differential.test.ts` | 0 assertions | test-contract drift | Test mutates readonly cell projections. Differential test owner. |
| `chaos.test.ts` | 0 assertions | test-contract drift | Test mutates readonly cell projections. Chaos test owner. |
| `adversarial.test.ts` | 0 assertions | test-contract drift / unresolved | Uses missing `getWorksheet` and incompatible cell construction. Test owner. |
| `EventBus.test.ts` | 0 assertions | configuration | Imports `vitest` in the Jest suite; port to the configured test runner or configure Vitest consistently. Test infrastructure owner. |
| `CellComponentCommands.test.ts` | 0 assertions | configuration | Imports `vitest` in the Jest suite. Test infrastructure owner. |

Zero-assertion suites are compile/transform/setup failures, not failed product assertions. Assertion suites remain unaltered pending fixes to their implementation or an explicit contract decision.

## Focus marker inventory

The TypeScript AST scanner `scripts/check-no-focused-tests.mjs` found **0** `.only`/`fit`/`fdescribe` focused calls under `packages`; `npm run check:no-focused-tests` passes. CI now runs this check. The prior suite table's 12 `focused` labels were not backed by literal focus markers in the current source; those files include explicit skipped tests and should be reported as partial/skipped coverage rather than focused execution until the original JSON classification is corrected.

## Next ordered work

1. Restore execution of the 14 zero-assertion core suites only where the runner, fixture, or API test contract is genuinely stale.
2. Investigate shared numerical primitives behind the statistical failures, then dependency graph, spill cleanup, and pivot formula defects as separate production fixes.
3. Keep CS-002 coordinate/dependency defects tracked independently; do not weaken strict typing or test assertions to clear the suite.
