# CS-000F.4 — Failure Inventory

Generated 2026-10-17 from `PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PATH node ./node_modules/jest/bin/jest.js --config packages/core/jest.config.cjs --ci --runInBand --logHeapUsage --coverage=false --json --outputFile=/tmp/cs000f4-core-results.json`.

Fresh core baseline: 201 passed, 26 failed, 5 skipped suites; 6591 passed, 138 failed, 173 skipped/pending, 9 todo assertions. Duration: 59.079 s.

IO-XLSX baseline: 1 passed, 1 failed suites; 19 passed, 6 failed, 2 skipped/pending assertions.

Failure groups consolidate related assertions. The core baseline has 138 individual failed assertion records across 26 suites. All are grouped by subsystem hypothesis; the separate six XLSX failures are grouped under three distinct findings. The XLSX findings separate fixture setup (3 formula-value failures) from two confirmed fidelity gaps (1 formula serialization failure and 2 inline-string import failures). Root cause statements are labeled as hypotheses unless directly established by test/source inspection. Every Jest failed assertion has an individual record in the JSON file; per-suite execution counts are also included.

## Grouped causes

| Group | Failures | Subsystem | Owner | Assessment |
|---|---:|---|---|---|
| `CORE-ADAPTER-THROTTLE` — Feed driver throttle timing | 1 | data-adapter | Core data adapter owner | hypothesis |
| `CORE-PASTE-DAG-ISOLATION` — Paste side effects register extra DAG nodes | 2 | paste/worksheet mutation | PasteCommand and worksheet owners | hypothesis |
| `CORE-SCHEDULER-EQUIVALENCE` — Scheduled result differs from synchronous recompute | 1 | scheduler/formula runtime | Scheduler and formula engine owners | hypothesis |
| `CORE-FORMULA-DEPENDENCY` — Formula chain is stale after random mutation | 1 | formula dependency propagation | Formula engine and dependency graph owners | hypothesis |
| `CORE-FORMULA-STRESS` — Formula stress result or performance contract fails | 1 | formula evaluation | Formula engine owner | hypothesis |
| `PIVOT-STALE-SNAPSHOT` — Mutation does not refresh pivot snapshot | 7 | pivot dirty tracking/cache invalidation | Pivot registry and worksheet mutation owners | hypothesis |
| `PIVOT-AGGREGATE-FIELDS` — Aggregate field output absent or incorrect | 2 | pivot aggregation/calculated fields | Pivot engine owner | hypothesis |
| `PIVOT-GROUP-UPDATE` — Group migration or new dimension not reflected | 2 | pivot grouping and invalidation | Pivot engine owner | hypothesis |
| `PIVOT-PARTIAL-FULL-DIVERGENCE` — Partial recompute diverges from full rebuild | 3 | pivot incremental recompute | Pivot engine owner | hypothesis |
| `NUMERIC-CHI-SQUARE` — Chi-square distribution and inverse oracle mismatches | 10 | statistical functions | Statistics/formula owner | hypothesis |
| `FORMULA-DIFFERENTIAL` — Optimized execution differs from reference model | 3 | formula execution/dependency graph | Execution kernel and dependency graph owners | hypothesis |
| `FORMULA-ADVERSARIAL` — Deep/diamond dependency and formula error behavior mismatch | 3 | formula evaluation/dependency graph | Formula engine owner | hypothesis |
| `WORKSHEET-MERGE-PROJECTION` — Merged non-anchor read identity contract mismatch | 1 | worksheet merge API | Worksheet owner | hypothesis |
| `NUMERIC-F-DIST` — F distribution and inverse oracle mismatches | 9 | statistical functions | Statistics/formula owner | hypothesis |
| `PIVOT-GETPIVOTDATA` — GETPIVOTDATA returns incorrect values/errors or fails to invalidate | 15 | GETPIVOTDATA/pivot lifecycle | Formula engine and pivot registry owners | hypothesis |
| `PIVOT-CALCULATED-FIELDS` — Calculated-field expression results/errors differ | 16 | pivot calculated-field evaluator | Pivot calculated-field owner | hypothesis |
| `FORMULA-SPILL-CLEANUP` — clearSpill leaves spill metadata | 1 | dynamic array spill lifecycle | Spill engine owner | hypothesis |
| `NUMERIC-STUDENT-T` — Student t distribution and inverse oracle mismatches | 11 | statistical functions | Statistics/formula owner | hypothesis |
| `FORMULA-DAG-RECALC` — Formula DAG registration/range propagation/recalculation mismatches | 9 | formula dependency graph | Formula engine and dependency graph owners | hypothesis |
| `PIVOT-SLICER-FILTER` — Slicer filtering/composition produces incorrect pivot rows | 11 | pivot slicer filtering | Pivot engine owner | hypothesis |
| `FORMULA-METAMORPHIC` — Arithmetic identities and dependency properties fail | 9 | formula evaluation/dependency graph | Formula engine owner | hypothesis |
| `NUMERIC-NORMAL` — Normal CDF/PDF/inverse oracle mismatches | 6 | statistical functions | Statistics/formula owner | hypothesis |
| `CORE-KERNEL-INVARIANTS` — Mutation/re-entry invariant test observations mismatch | 3 | execution kernel | Execution kernel owner | hypothesis |
| `FORMULA-CF-LOGIC` — Conditional formatting AND/OR expression result is incorrect | 1 | conditional formatting formula compiler | Conditional formatting owner | hypothesis |
| `FORMULA-DATE-TODAY` — Date arithmetic involving TODAY is outside expected interval | 2 | date/time functions | Date/time function owner | hypothesis |
| `CORE-SCHEDULER-INVALIDATION` — Mutation during scheduling leaves stale formula results | 2 | scheduler/formula runtime | Scheduler and formula engine owners | hypothesis |
| `PIVOT-PARTIAL-PATH` — Partial recompute path instrumentation disagrees | 1 | pivot incremental recompute | Pivot engine owner | hypothesis |
| `PIVOT-REGISTRY-METADATA` — Metadata shape includes computed-state fields rejected by test | 1 | pivot registry contract | Pivot registry owner | hypothesis |
| `PIVOT-GROUP-STORE-TEST-API` — Forced proof uses removed groupStateStore.set API | 2 | pivot test fixture/API drift | Pivot test owner | hypothesis |
| `FORMULA-ADDRESS-CONTRACT` — Formula result differs under legacy zero-based address usage | 1 | worksheet/formula address contract | Worksheet and formula engine owners | hypothesis |
| `CORE-MEMORY-BENCHMARK` — 10k-operation memory growth assertion is unstable or violates expected sublinear bound | 1 | structural command memory/performance | Command manager owner | hypothesis |
| `XLSX-FORMULA-EVALUATION-UNATTACHED` — Formula is not evaluated before export assertion | 3 | formula engine/test setup | XLSX integration and formula engine owners | diagnosed as integration fixture setup gap from test code and failure location |
| `XLSX-INLINE-STRING-IMPORT` — XLSX importer does not decode inline strings | 2 | XLSX string import | io-xlsx owner | confirmed production fidelity gap by export/import source inspection |
| `XLSX-FORMULA-SERIALIZATION` — XLSX export/import drops formula expressions | 1 | XLSX formula serialization/import | io-xlsx owner | confirmed production fidelity gap by source inspection |
## Execution integrity

- Suite results accounted for: 232/232.
- 201 suite files have no failed assertions. Of these, 189 have no pending assertions; 12 have pending/skipped tests. One suite also contains 9 todo assertions.
- Five suites are entirely skipped.
- Jest reports the 12 suites with pending assertions using formatted suite status `focused`. This status is not evidence of `.only`; the AST guard passes and finds no focused test markers.
- The Jest result inventory confirms all configured suite results and assertions reported by Jest. It cannot prove whether an intended test is absent from source or excluded from config; that requires comparing test inventory against repository policy.

## XLSX defect reproductions

- Formula evaluation fixture gap (3 assertions): create a standalone `Workbook`, add a sheet, set two numeric cells and a formula, then read the formula cell. It is `null` without the `FormulaEngine` setup used by core tests. These three failures occur before the XLSX round-trip path.
- Formula serialization (1 assertion): set A1 to `=10+20`, export and reload, then inspect A1 formula; it is `undefined`. Export does not emit formulas and import does not restore them.
- Inline-string import (2 assertions): set A1 to `Text`, export and reload, then read A1; it is empty. Export emits `<is><t>` text while importer reads `<v>`. The mixed-empty and special-character cases reproduce this same path.

## Reproduction

Core: `PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PATH node ./node_modules/jest/bin/jest.js --config packages/core/jest.config.cjs --ci --runInBand --logHeapUsage --coverage=false --json --outputFile=/tmp/cs000f4-core-results.json`

XLSX: `NODE_OPTIONS=--experimental-vm-modules PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PATH node ./node_modules/jest/bin/jest.js --config packages/io-xlsx/jest.config.cjs --ci --runInBand --coverage=false --json --outputFile=/tmp/cs000f4-xlsx-results.json`
