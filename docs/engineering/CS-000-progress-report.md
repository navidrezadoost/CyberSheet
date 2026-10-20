# CyberSheet Progress Report — CS-000A–E

**Date:** 2026-10-17  
**Branch / HEAD:** `main` / `ec75a6e` (no commit created)  
**Status:** CS-000E.1 implementation complete locally. Clean CI verification not yet available. CS-002 remains open and P0. No production merge is authorized.

## Environment

- Linux x86_64, Freedesktop SDK 25.08; host CPU AMD Ryzen 9 7845HX, 31 GiB RAM.
- Node.js `24.22.0`, npm `11.19.1`, TypeScript `6.0.3`, Jest `30.4.0`.
- Browser: not run. Renderer tests use Jest/jsdom; XLSX tests use Jest/Node with VM modules enabled.

## Goal and behavior

Make the core compiler and test baseline reproducible, remove the 14 reported core TypeScript diagnostics without relaxing strictness, isolate the full-suite heap failure, and make CI run independent core, renderer, XLSX, and deterministic propagation gates.

The core production typecheck now exits successfully. The full core suite completes after fixing a zero-timeslice scheduler livelock, but remains red with test and compatibility defects. The icons and renderer production typechecks pass, and the clean repository TypeScript build now passes with zero diagnostics. The separate core Jest suite remains red with 33 suites; those defects stay outside CS-000E.1.

## Changes and API impact

- Added `.nvmrc`, Node/npm engine constraints, and `packageManager: npm@11.19.1`; regenerated `package-lock.json` and removed its ignore rule so it can be committed and CI can consume it. Kept the ignored legacy `yarn.lock` out of the install path.
- Added the toolchain and command documentation in [reproducible-build.md](reproducible-build.md). The complete 233-suite core result is in [CS-000-core-suite-results.tsv](CS-000-core-suite-results.tsv).
- Resolved the 14 core diagnostics: two renderer/core chart-type boundary errors and 12 Node-global/CommonJS errors. Core now uses a narrow `ChartManagerAdapter`, typed runtime helpers, and static ESM imports. No `strict` relaxation, broad `any` cast, production dependency, or production source exclusion was added.
- Fixed the `RecomputeScheduler` zero-millisecond slice so each loop makes progress. Fixed rejected async `SpreadsheetEngine.run()` callbacks so the mutation guard remains active until the callback settles and rollback occurs, preventing an unhandled post-rejection mutation.
- Fixed XLSX export to scan the used cell rectangle instead of every coordinate in the worksheet’s configured dimensions. Updated the XLSX Jest transform for its ESM `import.meta` source and replaced deprecated `toThrowError` matchers in the pivot test.
- Follow-up sparse-export correction: style discovery and worksheet XML generation now iterate stored cells through `Worksheet.forEachNonEmptyCell`, sort emitted cells deterministically, and avoid scanning the used-range rectangle. Added an A1-to-XFD1048576 XLSX test that verifies both references and asserts exactly 2 value reads and 4 style reads, without a wall-clock threshold.
- Added an AST-based focused-test marker check and made it a CI step. Current inventory is zero `.only`/`fit`/`fdescribe` calls.
- CI now pins Node 24.22.0 and runs core, renderer, XLSX, performance smoke, and security jobs independently. The performance smoke asserts deterministic evaluated-cell counts, not wall-clock thresholds.
- Root-build repairs: removed the obsolete `packages/react/src/react-shim.d.ts` that shadowed installed React 19 types; production React TypeScript compilation now excludes nested test files; added CSS module typing and React workspace path/reference mappings; exported `ChartBuilderController`; corrected generated Angular icon barrel names and its missing file/invalid template syntax; exported four intended ribbon prop interfaces; fixed the malformed ExcelRenderer size declaration and undefined renderer dimensions; corrected the XLSX worker transfer argument. These are source/build boundary repairs, not test assertion edits. CS-000E.1 follow-up: replaced eight React icon SVG sources that contained unbound React expressions with static SVG source, added `scripts/generate-react-icons.mjs` and `npm run generate:react-icons`, and verified a repeat generation against SHA-256 hashes. Added the existing core `toDisplayValue` normalizer to the core root export; renderer sort/filter now normalize RichText/Entity values explicitly, while edit/paste/undo preserve `ExtendedCellValue` and styles mutate through `Worksheet.setCellStyle`. Renderer fill/border and vertical/text alignment unions now have explicit rendering behavior.

Public API impact: `@cyber-sheet/core` now exports the existing `ChartBuilderController` and chart-builder types from its root barrel and the existing `toDisplayValue` normalizer; the React ribbon barrel now exports four existing prop interfaces; `RibbonButton` accepts an optional toggle-group value and click callback; and `HomeTab` consumes the core `CommandManager` contract. React root exports now disambiguate the app/global config and keyboard shortcut types (`CyberSheetGlobalConfigInput`, `KeyboardLayoutParsedShortcut`), and the ribbon barrel aliases its command border payload. Icon component names and props/exports are preserved. `SpreadsheetEngine.run()` keeps its signature and rejection type; rejecting an async callback can now wait until that callback settles so rollback and mutation isolation are reliable. XLSX output semantics are unchanged for used cells and styles.

## Installation, typecheck, and tests

- `npm ci --no-audit --no-fund --fetch-retries=0 --fetch-timeout=30000` — **pass**, 509 packages installed in 53s. npm warned that install scripts for `esbuild` and `unrs-resolver` were not covered by its allow-scripts policy; the install still exited 0.
- `./node_modules/.bin/tsc -p packages/core/tsconfig.json --noEmit --pretty false` — **pass**, exit 0, after the source changes.
- Core Jest, full project, `--ci --runInBand --logHeapUsage --coverage=false` — **completed**, 74.596s: 233 suites; 195 passed, 33 failed, 5 skipped. Of 6,702 tests: 6,444 passed, 78 failed, 171 skipped, 9 todo. Twelve suites are marked `partial` in the TSV because coverage is incomplete; the AST scan found zero literal focus markers. Suite-by-suite details are in the TSV.
- CI core selection (kernel regression, scheduler, spreadsheet engine, formula DAG integration, patch, transaction, dependency propagation smoke) — **fail**, 6/7 suites passed; 217 tests passed and 9 failed in `formula-dag-integration.test.ts`.
- `tsc -p packages/icons/tsconfig.json --noEmit --pretty false` — **pass**. `node scripts/generate-react-icons.mjs` repeated with identical SHA-256 output for all eight affected icons; the root npm alias is `npm run generate:react-icons`.
- Renderer production typecheck (`tsc --noEmit -p packages/renderer-canvas/tsconfig.json`) — **pass**. Renderer Jest — **pass**, 27 passed, 2 skipped (750 passed tests, 7 skipped), command: `PATH=/tmp/cs001-node/bin:$PATH node ./node_modules/jest/bin/jest.js --config packages/renderer-canvas/jest.config.cjs --ci --runInBand --coverage=false`.
- XLSX Jest with `NODE_OPTIONS=--experimental-vm-modules` — **pass**, 1 suite, 12 tests.
- XLSX Jest after sparse iteration — **pass**, 1 suite, 13 tests (`NODE_OPTIONS=--experimental-vm-modules node ./node_modules/jest/bin/jest.js --config packages/io-xlsx/jest.config.cjs --runInBand --coverage=false`). The new far-corner case observes two populated cells and no range-area reads.
- Initial incremental `npm run build` — **fail**, 901 TypeScript diagnostics. After clearing generated outputs, the actual clean baseline was 635. Following the above fixes, final clean gate — **pass**: `./node_modules/.bin/tsc -b --clean && npm run build` exits 0 with zero diagnostics across core, icons, renderer-canvas, React, and io-xlsx. This removes all 635 diagnostics from the clean pre-repair baseline. The diagnostic reduction history and per-package root causes are in [CS-000E-triage.md](CS-000E-triage.md).
- `npm run check:no-focused-tests` — **pass**, zero focused API calls. `git diff --check` — **pass**.
- Diagnostic and suite classifications are in [CS-000E-triage.md](CS-000E-triage.md). The reported 901 was inflated by stale/incomplete incremental outputs and test compilation; clean output is now the comparison baseline. Renderer-local `size`/dimension issues and the XLSX worker overload were repaired after triage.
- The previous Jest table labeled 12 suites “focused”; current source AST inspection found zero literal focused markers. Treat those labels as incomplete/skipped coverage pending correction of the original result classification. Explicit skips remain in source.
- No CI run was triggered for this uncommitted worktree. Local workflow checks cannot substitute for a clean-checkout GitHub Actions result. The local root build passes; clean-checkout CI remains unverified.
- `git diff --check` — **pass**. Browser E2E and coverage collection were not run.

The original 14 diagnostic locations were: `ChartBuilderController.ts` (2 chart structural conflicts); `CommandManager.ts` (3 `process` references); `FormulaEngine.ts` (1 `require`); `functions/exotic/exotic-functions.ts` (1 `require`); `storage-benchmark.ts` (6 `process` references); and `storage/CellStoreV1.ts` (1 `process` reference). The resolved classification and rationale are documented in [reproducible-build.md](reproducible-build.md).

## Heap and benchmark evidence

Before the fix, the isolated `recompute-scheduler.test.ts` reached V8’s 4,097 MB heap ceiling (last GC about 4,093 MB; process RSS reached about 4,274 MB) and exited with heap exhaustion. The cause was confirmed: with `timeSliceMs: 0`, the scheduler yielded before popping any task while the test retained every yield event. After the fix, that suite passes all 35 tests in 1.414s; the complete core run now finishes instead of exhausting the heap.

The XLSX round-trip suite initially spent over two minutes at approximately 948 MB RSS and 100% CPU. A one-cell export caused each of two export passes to scan the default 1,048,576 × 16,384 worksheet dimensions. After bounding scans to `getUsedRange()`, the 12 round-trip tests pass (0.95s on the clean-install run).

These are diagnostic before/after observations, not the requested CS-002 benchmark campaign. No 20-run warm-up/measurement set, median/p95, pure evaluation/scheduler split, or comparable chain/fan-out/range baseline was produced. The dataset above is one-cell and 100-cell XLSX round-trip fixtures; hardware is the Linux host listed above. Do not compare these single run durations as a benchmark claim.

## Regression, memory, security, and XLSX fidelity

- The new toolchain helper avoids a Node runtime dependency and keeps browser globals out of the core TypeScript ambient type set. Strict mode remains enabled.
- The scheduler no longer livelocks for a zero-length time slice. Async callback rejection now waits for completion and rolls back; three existing invariant test expectations still fail and are retained.
- XLSX tests cover style round-trip and identity; all 13 pass after the sparse correction. Export now visits stored cell entries for style discovery and XML generation. The max-corner test checks deterministic visit counts and references; no timing threshold is used. These fixtures still do not establish general Excel fidelity for formulas, unknown OOXML parts, charts, or complex workbook structures.
- No security audit was run in this pass. npm’s install-script warning is recorded above; the lockfile and dependency tree are now reproducible, but those scripts may need an explicit allowlist decision before relying on packages that require postinstall behavior.

## Open defects and risks

- **P1 — recovered icon visual fidelity:** eight previously invalid dynamic SVG fragments now render as static SVG previews. Their public component exports/props are retained, but browser pixel/fidelity review was not run. Owner: React/UI maintainers; reproduce by rendering the affected icons and comparing against intended ribbon/dialog visuals.

- **P0 — clean-checkout CI evidence:** local clean TypeScript build passes; no CI run was triggered for this uncommitted worktree. Owner: repository maintainers; reproduce locally with `./node_modules/.bin/tsc -b --clean && npm run build`.
- **P1 — test result classification:** each of the 33 failed suites is classified in [CS-000E-triage.md](CS-000E-triage.md). Nineteen are assertion failures; fourteen fail before assertions, including two incompatible Vitest imports. Most zero-assertion suites show test-contract drift; the I/O export resolution and test-runner mismatch are configuration/boundary defects.
- **P1 — core compatibility baseline:** 33 failed suites / 78 failed tests remain; exact list and counts are in the TSV. Includes test-only Vitest imports absent from the Jest install, outdated API calls, pivot and statistical failures, and existing runtime expectation failures. Owner: core/package owners; repro: full core Jest command above. No tests were removed.
- **P1 — coordinate contract:** `formula-dag-integration.test.ts` has 9 failures. `Address` is documented one-based in `types.ts` and engine examples use one-based coordinates, while direct `Worksheet` call sites and older tests use zero-based coordinates. The implementation boundary still needs an explicit audit and adapter decision; assertions were not rewritten.
- **P1 — async invariant expectations:** `invariant-enforcement.test.ts` now runs to completion but has 3 failing assertions (formula value expectations and error-message token). The original process crash is fixed; remaining failures need API/coordinate review.
- **P1 — focus-marker guard:** zero focused calls found; the AST check now rejects new markers in CI. No GitHub CI execution is available yet.
- CS-002 remains open for range watchers in graph operations, max safe packed-key boundary, overlapping/nested/boundary/removal/relocation cases, deterministic cycle errors, workbook-scoped cross-sheet dependencies, and the 20-run median/p95 benchmark campaign.

## Architecture decisions requiring escalation

Retain the decision that dependency identity must become workbook-scoped with a stable sheet ID; do not encode mutable sheet names into numeric keys. Define disabled-iteration circular-reference error behavior before implementing any iterative calculation. These are CS-002 follow-ups, not part of this CS-000 baseline repair.

## Next focused ticket

**CS-000F — Restore the core test execution baseline:** repair the 14 zero-assertion suites for genuine test-runner/API/fixture issues, then begin production calculation defects from the 19 assertion-failing suites in the separate triage tracks. Keep CS-002 coordinate/dependency work separate. Run clean-checkout CI before production release.

## CS-000F checkpoint — October 17, 2026

CS-000F is active. The original 233-suite / 33-failing-suite figures above are the pre-CS-000F baseline, not current totals. The `CONCURRENT_RUN` crash was traced to the chaos test’s unobserved Promise rejection in its re-entrant event handler and corrected in the test harness; engine rejection semantics were preserved. A complete local core run then finished with 201 passing suites, 27 failing suites, and 5 skipped; 6,581 tests passed, 111 failed, 173 skipped, and 9 were todo. The two remaining blocked suites involve an XLSX `import.meta` test-transform issue and stale `PivotSnapshot.data` fixtures. A pivot-formula fixture was subsequently migrated, so the complete suite must be rerun for the current aggregate. Detailed targeted results, the stack trace, and newly exposed defects are recorded in [CS-000F-progress-report.md](CS-000F-progress-report.md). That report also preserves source-verified, release-blocking CSV data-integrity findings. Local verification uses Node 24.13.1/npm 11.8.0; `.nvmrc` specifies Node 24.22.0 and the supervisory review expects npm 11.19.1.
