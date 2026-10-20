# CS-002D4-R1 Implementation Checkpoint Report

**Status:** In progress; XLSX and package ESM blockers remediated at this checkpoint; R1 acceptance withheld
**Branch:** `codex/cs-002d4-r1-implementation`
**Checkpoint:** 2026-10-18 (standalone example and ledger follow-up)
**Acceptance, merge, release:** Not requested; R1 is not accepted and must not merge or ship

The implementation-level ownership reconciliation is being tracked separately in [CS-002D4-R1-implementation-reconciliation.md](CS-002D4-R1-implementation-reconciliation.md). The frozen source-classification registers remain unchanged.

## Standalone example reconciliation follow-up — 2026-10-18

The `examples/excel-color-demo.ts` path is confirmed to construct and retain only a standalone `Worksheet`; it has no workbook adoption path. Its module row, 39 semantic rows, and 12 flow rows are now marked `standalone-preserved` in the separate implementation ledger. The example was updated to the current standalone constructor and renderer plugin APIs, and its numeric total calculation now narrows values before addition. This preserves direct standalone worksheet writes and does not use a workbook mutation escape.

The example typecheck passed with the command below; the focused core ownership suites passed 17/17, and IO-XLSX passed 28 tests with two pre-existing skipped tests. These focused suites were rerun after the example change. Logs, exact commands, and exit metadata are under `/home/navidrezadoost/.cache/cs002d4-r1-evidence/implementation-reconciliation/standalone-color-followup/`.

```sh
PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PATH node ./node_modules/typescript/bin/tsc --ignoreConfig --noEmit --target ES2020 --module ES2020 --moduleResolution Bundler --jsx react-jsx --strict --skipLibCheck --lib ES2020,DOM examples/excel-color-demo.ts
```

At the standalone-example checkpoint, the ledger had 1,990 open rows. The comments-helper follow-up reduced that count to 1,965; the later example R6 entrypoint follow-up records 1,942 open rows and the current hash. The 131-module, 1,486-semantic, and 450-flow source-classification registers remain unchanged. Full R1 reconciliation and escape/cast audits remain open.

## R6 gate and package-root re-verification — 2026-10-18

The 54-row reduction from the earlier 2,044-open snapshot is accounted for in two steps: flow keys `81d4145d11f0496980b3` and `5abe673c7a598cc4d1ee` for the Phase 2 and Phase 3 demos were marked `rejected-at-explicit-initialization-boundary` (2 rows), then the Excel color demo's 52 module/semantic/flow records were marked `standalone-preserved`. Thus the latest ledger has 1,990 open rows; the color demo did not account for the full 54-row change.

The IO-XLSX helper regression confirms standalone value/formula application and that an adopted raw worksheet throws before cell contents or worksheet events change. New assertions directly verify that `importXLSX`, URL/ArrayBuffer convenience imports, and progressive workbook restore reject at the R6 boundary; the URL fetch callback is not invoked. `LightweightXLSXParser` and `streamXLSX` remain parsing/read projection APIs and do not publish or mutate a workbook. The two existing skips (`should undo cell edits correctly` and `should undo formatting changes correctly`) remain skipped and unchanged.

The configured production core package entry was freshly rebuilt and imported through `@cyber-sheet/core` under Node ESM; the smoke created a valid one-sheet workbook through `Workbook.create()`. An isolated npm-packed install also imports successfully with React absent and unresolvable. The built core bundle embeds React implementation code through its `DropdownList` barrel export, so host-React interoperability and duplicate-runtime behavior remain unverified.

| Check | Result | Evidence |
| --- | --- | --- |
| IO-XLSX Jest after R6 gate assertions | 3 suites; 29 passed, 2 existing skipped | `r6-entrypoint-gate-followup/io-xlsx-jest.log` |
| IO-XLSX typecheck/build | Both exit 0 | `r6-entrypoint-gate-followup/io-xlsx-typecheck.log`, `io-xlsx-build.log` |
| Core production build and package-root import | Both exit 0 | `esm-import-reverification/core-build.log`, `package-root-import.log` |
| Focused-test hygiene / `git diff --check` | Both exit 0 | `r6-entrypoint-gate-followup/focused-hygiene.log`, `diff-check.log` |

Exact commands and exit metadata are under `/home/navidrezadoost/.cache/cs002d4-r1-evidence/implementation-reconciliation/r6-entrypoint-gate-followup/` and `.../esm-import-reverification/`. At that checkpoint, the mutable-escape audit, cast classification, and remaining 1,990 keyed records remained open; no R2 work or baseline operation occurred.

## Isolated package installation follow-up — 2026-10-18

Packed the rebuilt `@cyber-sheet/core` workspace and installed that tarball with npm offline into a fresh `/tmp` project. No React package was installed or resolvable there. Importing `@cyber-sheet/core` through its package export map succeeded, and `Workbook.create({ sheets: [{ name: "Smoke" }] })` returned a usable workbook. This resolves the React-free installation check for the tested package artifact. The generated core bundle contains an embedded React implementation through the `DropdownList` barrel export, so host-React interoperability and duplicate-runtime behavior remain a packaging qualification; no dependency or peer contract was changed.

Evidence, exact pack/install/import commands, and hashes are under `/home/navidrezadoost/.cache/cs002d4-r1-evidence/implementation-reconciliation/react-free-package-check/`. The temporary install is `/tmp/cs002d4-r1-core-isolated-Lk27tP`; tarball SHA-256: `f96b6a816cce3144686ea40a27e88760e5feb8d7fd46d4475113975d2d9ae21f`. The package root succeeds with React absent; this does not close the outstanding ownership/cast audit or full R1 acceptance gate.

## Comments-helper reachability follow-up — 2026-10-18

The comments example exports exactly one symbol, `initializeCommentingApp()`. It throws unconditionally before reading its arguments, constructing or exposing a Workbook, or invoking any helpers. The comments, icon, and event helper declarations are module-private. Their Worksheet-typed standalone behaviors are dormant and cannot be reached through the current module export surface; any reactivation must first receive the R1 view/mutation-boundary review. The example's standalone typecheck passes.

The 25 remaining semantic records for `examples/comments-example.ts` are now `rejected-at-explicit-initialization-boundary`, with evidence that distinguishes this unreachable state from implemented helper behavior. Its four workbook/import ownership flows remain `rejected-pending-R6`, and its module record remains `partial-initialization-gated`. The 2,067-row ledger now has 1,965 open records, 102 records with other dispositions/partial status; SHA-256 `a350fffefb98fd1bc61c2fa377df446d4f3109c0a8ae5085a16d6eda3b958278`. Frozen source registers remain unchanged. Evidence for the export scan and typecheck is under `/home/navidrezadoost/.cache/cs002d4-r1-evidence/implementation-reconciliation/comments-helper-reachability/`.

## Summary

The controlled R1 implementation is incomplete. Core ownership, read-view, capability, worksheet-adoption, event, and service getter changes are present, along with three focused core test files. React, renderer, framework, XLSX, and example consumer changes are in progress; full frozen-worklist reconciliation and mutable-escape auditing remain open. The worktree contains substantial pre-existing D4/R0.1 work; the file list below identifies the R1 implementation surfaces visible at this checkpoint and does not attribute every dirty repository file to R1.

The frozen CS-002C 105-failure reference was not intentionally changed. Its integrity was not independently rechecked in this checkpoint. No merge, release, reset, or R2 implementation occurred.

## Latest XLSX and package ESM follow-up — 2026-10-18

The two IO-XLSX Jest suites now compile and execute on standalone `Worksheet` fixtures. They inspect the exported OOXML directly; public workbook import remains an explicit R6 rejection. This preserves XLSX export verification without enabling workbook-owned writes or staged restore. A focused helper test covers standalone parsed-formula application and adopted raw-handle rejection before cell/event changes. The XML parser now distinguishes `<sheet>` from `<sheets>`, and the exporter reserves OOXML style index 0 for the default style; zero indent is omitted.

The core build now bundles ESM runtime entries with TSup and emits declarations with `tsc --emitDeclarationOnly`. Package exports point to those bundled entries. The core package root, `sdk`, `patch`, and `snapshot` subpaths all imported under Node 24, and a smoke check created an empty bootstrap workbook. Package metadata versions and peer ranges were not changed. `examples/phase2-integration.ts` and `phase3-integration.ts` now expose explicit initialization functions; importing either module is side-effect free, and invoking the function rejects before workbook creation. Their flows are marked as rejected at the explicit initialization boundary; remaining semantic records in those paths are still open.

| Verification | Result | Evidence |
| --- | --- | --- |
| IO-XLSX Jest | 3 suites pass; 28 tests pass, 2 pre-existing skipped tests | `xlsx-esm-followup/io-xlsx-jest.log` |
| Core R1 suites | 3 suites, 17/17 pass | `xlsx-esm-followup/core-focused.log` |
| ChartManager | 15/15 pass | `xlsx-esm-followup/chart-manager.log` |
| React hook | 2/2 pass | `xlsx-esm-followup/react-hook.log` |
| Vue / Angular / Svelte adapters | 35/35, 42/42, 44/44 pass | `xlsx-esm-followup/{vue,angular,svelte}-adapter.log` |
| Aggregate workspace typecheck/build | Both exit 0 | `xlsx-esm-followup/aggregate-typecheck.log`, `aggregate-build.log` |
| Phase 2/3 gate typecheck and bundled import smoke | Both exit 0; safe import, explicit rejection | `phase-gate-types.log`, `core-esm-root-and-subpaths.log` plus the earlier bundled smoke command |
| Focused-test hygiene / whitespace | Both exit 0 | `focused-hygiene.log`, `diff-check.log` |

Exact commands, exit codes, and durations are in matching `.meta` files under `/home/navidrezadoost/.cache/cs002d4-r1-evidence/implementation-reconciliation/xlsx-esm-followup/`. The three frozen source-register hashes remain unchanged. At that checkpoint, the implementation ledger had 2,042 open rows; the later standalone example follow-up above records 1,990 open rows and the current ledger hash. This closes the two concrete verification blockers, not the full R1 reconciliation, mutable-escape audit, example callsite review, or acceptance gate.

The central commands in that matrix were:

```sh
PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PATH node ./node_modules/jest/bin/jest.js --config packages/io-xlsx/jest.config.cjs --ci --runInBand --coverage=false
PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PATH node ./node_modules/jest/bin/jest.js --config packages/core/jest.config.cjs --ci --runInBand --coverage=false packages/core/__tests__/workbook-sheet-view.test.ts packages/core/__tests__/workbook-capability.test.ts packages/core/__tests__/workbook-owned-escape.test.ts
PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PATH npm run test:a11y --workspace=@cyber-sheet/vue
PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PATH npm run test:a11y --workspace=@cyber-sheet/angular -- --runInBand
PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PATH npm run test:a11y --workspace=@cyber-sheet/svelte
PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PATH npm run typecheck --workspaces --if-present
PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PATH npm run build --workspaces --if-present
PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PATH npm run check:no-focused-tests
PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PATH node --input-type=module -e "const core=await import('@cyber-sheet/core'); await import('@cyber-sheet/core/sdk'); await import('@cyber-sheet/core/patch'); await import('@cyber-sheet/core/snapshot');"
```

## Earlier R1 reconciliation follow-up — 2026-10-18 (superseded by the XLSX and ESM follow-up above)

Added `examples/r1-initialization-gate.ts` and placed early rejection gates in the remaining data-dependent example/test-project entrypoints. The gates run before Workbook construction and name the required later slices. The React color demo renders the failure as an accessible alert; the inline formula demo writes an unavailable message before stopping; the vanilla JS demo stops before success logging and global workbook/sheet aliases. The two integration demos now have explicit, side-effect-free initialization functions rather than throwing during module import. Existing XLSX viewer handlers already surface R6 load errors and preserve sheet selection after R5 lifecycle rejection. The comments example already rejects before Workbook construction.

At that checkpoint, the separate implementation ledger marked all 14 example/test-project module rows `partial-initialization-gated`. The latest update records two explicit integration-demo flows as rejected at the initialization boundary; semantic records remain open for callsite review. The current ledger counts and hash are in the latest XLSX and package ESM follow-up above. The frozen module, semantic, and flow register hashes remain unchanged at `b42c04b22b823a714c1cf9c0364a81870799d9676d7b69b40bf6236fd8abe683`, `158d3e232bd31e41432bff7192f07425a3f600c2330fdc970f68bc94d4d77d22`, and `08c8769b3ff7b72f1c1b072412a3387eb655f33d11cb5ad4e5d65683cdd22db0`.

The latest authorized verification matrix was rerun after these changes. Core R1: 17/17; React hook: 2/2; ChartManager: 15/15; Vue: 35/35; Angular: 42/42; Svelte: 44/44. Aggregate workspace typecheck/build, focused-test hygiene, and `git diff --check` all exited `0`. Exact commands, exit codes, durations, and logs are in `/home/navidrezadoost/.cache/cs002d4-r1-evidence/implementation-reconciliation/example-gating-matrix/`; configuration and frozen-register hashes are in that directory's `sha256sums.txt`. After the XLSX private-store fix, the same matrix was rerun: core 17/17, React hook 2/2, ChartManager 15/15, Vue 35/35, Angular 42/42, Svelte 44/44, aggregate typecheck/build, focused-test hygiene, and diff check pass. The full io-xlsx Jest command exits `1` before assertions (0 tests) on existing WorkbookSheetView mutator type errors and a FormulaEngine interface mismatch; see `io-xlsx-tests.log` and `.meta` in the same evidence directory. The vanilla JS test-project Vite build also exits `0` after the fail-fast gate, producing only the gated entry bundle; its command and log are `vanilla-example-build.meta` and `.log`.

The direct Node ESM import of `@cyber-sheet/core` was rerun and fails with `ERR_UNSUPPORTED_DIR_IMPORT` at `dist/types`. A temporary TSup ESM bundle diagnostic loaded successfully when placed under `packages/core/dist`, but it is not the configured package artifact and retains an external React import. No package export/build/peer metadata was changed; production package-root importability remains unresolved as a packaging qualification separate from the owner-view audit. The frozen CS-002C reference was not recaptured or modified. R1 remains unaccepted; R2, merge, and release remain unauthorized.

## Latest adapter verification follow-up — 2026-10-18

The approved runner/configuration recovery now lets all three adapter suites execute. Vue passes 35/35, Angular 42/42, and Svelte 44/44. Angular's two style failures came from the Jest preset stripping inline `@Component` styles before JIT rendering. The stylesheet now lives in a referenced constant, which the preset preserves; the original computed-style and stylesheet-presence assertions pass against the component's real CSS. Svelte was moved from the unsupported Jest/Svelte 5 CJS transform path to Vitest after the approved ESM investigation. Test discovery and accessibility assertions remain enabled.

The Vue component's grid now has required row parents, the popular preset list uses listitem wrappers with accessible names, and initial controller state is available on first render. Angular's isolated spec project uses Bundler resolution, initializes its Angular test environment, imports `CommonModule`, and uses `ComponentFixture.setInput()` for input changes. The real component stylesheet is preserved through the test transform. Svelte's package runner uses Vitest with the same test file and existing assertions. Its category lookup now uses the controller's `id` field; category radios are grouped, list semantics use listitem wrappers, and gridcells have row parents. These changes do not alter the R1 ownership model or activate workbook writes.

TypeScript 6 aggregate compilation is clear. `cf-ui-core` now uses `moduleResolution: Bundler`; its build bundles JavaScript with TSup and emits declaration files through `tsc --emitDeclarationOnly`, avoiding TSup's deprecated injected `baseUrl`. The change preserves strictness and does not add `ignoreDeprecations` or downgrade TypeScript.

| Check | Exact command | Result | Evidence |
| --- | --- | --- | --- |
| Focused R1 core suites | `PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PATH node ./node_modules/jest/bin/jest.js --config packages/core/jest.config.cjs --ci --runInBand --coverage=false packages/core/__tests__/workbook-sheet-view.test.ts packages/core/__tests__/workbook-capability.test.ts packages/core/__tests__/workbook-owned-escape.test.ts` | Exit `0`; 3 suites, 14 tests passed | `adapter-followup/focused-r1-final.log` |
| Vue a11y adapter | `PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PATH npm run test:a11y --workspace=@cyber-sheet/vue` | Exit `0`; 1 suite, 35 tests passed | `adapter-followup/vue-vitest.log` |
| Angular a11y adapter | `PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PATH npm run test:a11y --workspace=@cyber-sheet/angular -- --runInBand` | Exit `0`; 1 suite, 42 tests passed | `adapter-followup/angular-checkpoint.log` |
| Svelte a11y adapter | `PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PATH npm run test:a11y --workspace=@cyber-sheet/svelte` | Exit `0`; 1 suite, 44 tests passed | `adapter-followup/svelte-checkpoint.log` |
| Aggregate workspace typechecks | `PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PATH npm run typecheck --workspaces --if-present` | Exit `0` across configured workspaces | `adapter-followup/typecheck-checkpoint.log` |
| Aggregate workspace builds | `PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PATH npm run build --workspaces --if-present` | Exit `0`, including `cf-ui-core` and e2e fixture | `adapter-followup/build-checkpoint.log` |
| Focused-test hygiene | `PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PATH npm run check:no-focused-tests` | Exit `0` | `adapter-followup/hygiene-checkpoint.log` |
| Whitespace check | `git diff --check` | Exit `0` after whitespace cleanup | `adapter-followup/whitespace-checkpoint.log` (rerun after cleanup) |

Verification-enablement changes were within the supervisory exception for narrow test tooling/configuration. The Svelte runner migration adds Vitest and the Svelte Vite plugin after the configured Jest transformer failed before assertions. The Angular Jest preset strips inline array-literal `@Component` styles; the component now passes its actual CSS through a referenced constant, which the preset preserves and the JIT renderer applies. The current lockfile SHA-256 is `23ea54d83acd5ea0a0f18110bdaf56215e96f4a1d4ad10c38f24469a5d0363c1`. Package/tooling and runner-config hashes, plus all three controlled register hashes, are in `adapter-followup/sha256sums.txt`. The module, semantic, and flow register hashes remain exactly `b42c04b22b823a714c1cf9c0364a81870799d9676d7b69b40bf6236fd8abe683`, `158d3e232bd31e41432bff7192f07425a3f600c2330fdc970f68bc94d4d77d22`, and `08c8769b3ff7b72f1c1b072412a3387eb655f33d11cb5ad4e5d65683cdd22db0`, respectively.

The worklist reconciliation and escape audit are still incomplete: all 131 modules, 1,486 semantic records, and 450 flow records have not yet received implementation-level dispositions; the 58 previously identified potential cast findings are not fully classified. A broader current scan produced 153 matching source lines across React, renderer, examples, Vue, Angular, Svelte, and XLSX sources (`adapter-followup/cast-scan-workspace.txt`); this raw count includes ordinary DOM/event casts and is not a finding count or a clean audit. The frozen CS-002C reference was not modified; its identity has not been independently verified in this follow-up. R1 remains in progress and unaccepted.

### Implementation reconciliation follow-up — 2026-10-18

The adapter checkpoint's next directive is being tracked in [CS-002D4-R1-implementation-reconciliation.md](CS-002D4-R1-implementation-reconciliation.md). A fresh worktree-to-module-register comparison finds edits in 61/131 registered paths; this is not implementation reconciliation, and the 1,486 semantic / 450 flow rows remain open for record-level dispositions. The core audit confirms owner-private sheet maps, stable-ID view lookup, detached view reads, rejection of workbook-owned mutation entrypoints, subscription-only Workbook events, and R6 rejection at the public XLSX restore entrypoints. Remaining example/test-project migration and the complete Worksheet mutator/escape and unsafe-cast audits are still required.

The React New Panel's blank-workbook path now uses `Workbook.create({ sheets: [{ name: 'Sheet1' }] })` instead of `new Workbook(); addSheet()`. Post-change verification is complete:

| Check | Exit / result | Evidence |
| --- | --- | --- |
| Focused core R1 tests | `0`; 3 suites, 14 tests passed | `implementation-reconciliation/post-change/core-focused.log` |
| Vue adapter | `0`; 35 tests passed | `implementation-reconciliation/post-change/vue-adapter.log` |
| Angular adapter | `0`; 42 tests passed | `implementation-reconciliation/post-change/angular-adapter.log` |
| Svelte adapter | `0`; 44 tests passed | `implementation-reconciliation/post-change/svelte-adapter.log` |

### Adoption guard and nested escape follow-up — 2026-10-18

Further core review tightened worksheet adoption and raw-handle detachment. `Worksheet.adoptByWorkbook()` now requires an unforgeable module-private key; direct caller-supplied owner values reject, and Workbook uses the internal helper. The helper and mutator registry are omitted from the public core barrel. Adopted-sheet getters now clone/freeze the nested object families reviewed in this pass, including filters, styles, conditional-formatting rules, comments, icons, components, images, and extracted snapshots. `Date` values are cloned because `Object.freeze(Date)` does not make its internal timestamp immutable. `forEachNonEmptyCell()` supplies detached cells to callbacks. The owned mutator registry currently covers 78 entrypoints, and the focused suite invokes each registered prototype method to prove rejection before its body; comparing the registry against every class declaration is still open.

`useCyberSheet()` now returns `initializationError`, catches preflight/bootstrap/renderer failures, and does not publish a workbook or worksheet until renderer setup succeeds. The React blank-workbook New Panel now uses `Workbook.create()`. These changes do not enable owned writes. The hook does not yet have dedicated runtime test coverage.

| Check | Exact command | Result | Evidence |
| --- | --- | --- | --- |
| Focused R1 core suites | `PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PATH node ./node_modules/jest/bin/jest.js --config packages/core/jest.config.cjs --ci --runInBand --coverage=false packages/core/__tests__/workbook-sheet-view.test.ts packages/core/__tests__/workbook-capability.test.ts packages/core/__tests__/workbook-owned-escape.test.ts` | Exit `0`; 3 suites, 17 tests passed | `/home/navidrezadoost/.cache/cs002d4-r1-evidence/implementation-reconciliation/adoption-guard-matrix/core-focused.log` |
| Vue adapter | `PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PATH npm run test:a11y --workspace=@cyber-sheet/vue` | Exit `0`; 35/35 | `.../adoption-guard-matrix/vue-adapter.log` |
| Angular adapter | `PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PATH npm run test:a11y --workspace=@cyber-sheet/angular -- --runInBand` | Exit `0`; 42/42 | `.../adoption-guard-matrix/angular-adapter.log` |
| Svelte adapter | `PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PATH npm run test:a11y --workspace=@cyber-sheet/svelte` | Exit `0`; 44/44 | `.../adoption-guard-matrix/svelte-adapter.log` |
| Aggregate workspace typecheck | `PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PATH npm run typecheck --workspaces --if-present` | Exit `0` | `.../adoption-guard-matrix/aggregate-typecheck.log` |
| Aggregate workspace build | `PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PATH npm run build --workspaces --if-present` | Exit `0` | `.../adoption-guard-matrix/aggregate-build.log` |
| Focused-test hygiene | `PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PATH npm run check:no-focused-tests` | Exit `0` | `.../adoption-guard-matrix/focused-test-hygiene.log` |
| Whitespace check | `git diff --check` | Exit `0` | `.../adoption-guard-matrix/diff-check.log` |

The module, semantic, and flow registers remain unchanged and their SHA-256 values still match the previously recorded values. A corrected fresh scan finds 14 example/test-project paths with workbook construction/lifecycle callsites; an earlier count of 13 omitted one. Their individual flow keys and required operation slices are listed in the implementation reconciliation. The 131 module paths, 1,486 semantic records, 450 flow records, and workbook-relevant cast findings have not been fully reconciled. R1 remains in progress and unaccepted; R2 remains unauthorized.

An AST census of `Worksheet` found 183 method/accessor declarations. A name-based mutation/accessor candidate set has 79 unique names; the 81-entry owned guard/test registry covers those names except `adoptByWorkbook` and `emitStandaloneEvent`. Adoption is protected by the private key; event emission returns without emitting when the sheet is workbook-owned. The new registry test exercises method entries through their prototype descriptors and checks the `rowCount`/`colCount` setters through `Reflect.set`. This is stronger coverage of the inventoried names, not proof that the heuristic found every state-changing method. The complete getter, nested alias, callback, and service/renderer audit remains open.

The targeted cast audit then found the renderer's `ChartManager` reading/writing worksheet `metadata` through `as any`. For adopted worksheets it now skips metadata loading and rejects chart create/update/delete/delete-all/import before changing local chart state or emitting events. The standalone metadata path remains available. A regression in `packages/renderer-canvas/__tests__/chart-manager.test.ts` passes. After that source change, the core focused suites pass 17/17, ChartManager passes 15/15, Vue/Angular/Svelte pass 35/35, 42/42, and 44/44, and aggregate workspace typecheck/build, focused-test hygiene, and `git diff --check` all exit `0`. Exact command lines and raw logs are under `/home/navidrezadoost/.cache/cs002d4-r1-evidence/implementation-reconciliation/chart-metadata-guard-matrix/`.

### React initialization and package boundary follow-up — 2026-10-18

Added `packages/react/src/__tests__/useCyberSheet.r1.test.tsx` with runtime assertions that rejected cell-data and collaboration initialization is observable through `initializationError`, and that no worksheet or renderer is published. Added a narrow React Jest config and spec TypeScript config using already-installed Jest, ts-jest, React, and jsdom packages; no dependency was added. The hook suite passes 2/2.

The core package export check confirms `packages/core/package.json` exposes only `.`, `./sdk`, `./patch`, and `./snapshot`; source and dist worksheet deep imports reject with `ERR_PACKAGE_PATH_NOT_EXPORTED`. The root barrel omits both `adoptWorksheetByWorkbook` and the mutator registry. A direct Node import of the built root barrel did not complete because generated `dist/index.js` encounters `ERR_UNSUPPORTED_DIR_IMPORT` for `dist/types`; this probe is not counted as a passing runtime package import. Static exports checks and deep-import rejection did pass.

After adding the hook test, the focused matrix passes core 17/17, React hook 2/2, ChartManager 15/15, Vue 35/35, Angular 42/42, and Svelte 44/44 (155 tests total); aggregate workspace typecheck/build, focused-test hygiene, and `git diff --check` pass. Exact outputs and commands are under `/home/navidrezadoost/.cache/cs002d4-r1-evidence/implementation-reconciliation/react-hook-matrix/`. A fresh workbook construction/lifecycle scan corrected the prior example count from 13 to 14; the reconciliation maps their flow keys and required slices, but all 14 paths still need migration/fail-fast work.

The React canvas and Excel viewer Add Sheet callbacks now catch the R5 lifecycle rejection and leave the active sheet unchanged; the canvas viewer also catches rename/delete rejection. Both show the error in the status area. The comments example no longer parses/populates an imported workbook or indexes `workbook.sheets`; its initializer now throws an explicit R6 staged-restore error before constructing/exposing a workbook. The old parser/store/bootstrap calls are absent from that file. After these example changes, the full focused matrix was rerun and passed: core 17/17, React hook 2/2, ChartManager 15/15, Vue 35/35, Angular 42/42, Svelte 44/44, aggregate typecheck/build, focused-test hygiene, and `git diff --check`. Logs are under `/home/navidrezadoost/.cache/cs002d4-r1-evidence/implementation-reconciliation/comments-import-gate-matrix/`. These are partial remediations; 11 inventory paths and remaining flows in the three partial paths remain open.

To make the remaining join explicit without editing the frozen classification registers, added [CS-002D4-R1-implementation-dispositions.tsv](CS-002D4-R1-implementation-dispositions.tsv). It has 2,067 keyed rows (131 module, 1,486 semantic, 450 flow); 2,060 are explicitly open, four comments-example flows record the R6 fail-fast disposition, and three ChartManager semantic rows record the partial owner split. Its SHA-256 is `7e395761cf2cd1f34a45a7d901a8fdc639449ee7cbed7483cfe165eda942f0c0`. This is a progress ledger, not completion of record-by-record review. The three source register hashes remain unchanged.
| Aggregate workspace typecheck | `0` | `implementation-reconciliation/post-change/aggregate-typecheck.log` |
| Aggregate workspace build | `0` | `implementation-reconciliation/post-change/aggregate-build.log` |
| Focused-test hygiene | `0` | `implementation-reconciliation/post-change/focused-test-hygiene.log` |
| `git diff --check` | `0` | `implementation-reconciliation/post-change/diff-check.log` |

Exact commands, durations, and exit codes are in the matching `.meta` files. The three frozen register hashes were rechecked and remain unchanged. No source-classification register changed. The complete implementation reconciliation and mutable-escape audit remain open.

After the subsequent core raw-cell/filter escape fix, the complete approved matrix was rerun against the final source state: core focused suites 15/15, Vue 35/35, Angular 42/42, Svelte 44/44, aggregate typecheck/build, focused-test hygiene, and `git diff --check` all exited `0`. Final logs and per-command metadata are under `/home/navidrezadoost/.cache/cs002d4-r1-evidence/implementation-reconciliation/final/`. The new raw-handle regression is part of those focused core results. This verification does not close the remaining 131/1,486/450 implementation reconciliation, mutable-escape inventory, cast classification, or example migration.

### Supervisory reconciliation review follow-up

The latest review accepted the retained raw-handle remediation as checkpoint progress and called out React initialization failure observability. `useCyberSheet()` now returns `initializationError`, catches preflight/import/bootstrap/renderer failures, and publishes the workbook view only after renderer initialization succeeds. The worksheet audit also found and closed additional raw adopted-handle aliases in conditional-format rules, styles, comments/icons/components, image collections, and extracted snapshots; Date fields now use detached clones. The complete post-change verification results follow below. The complete worksheet API audit and all-register reconciliation remain open.

The complete matrix has now been rerun against those changes: core R1 suites 15/15, Vue 35/35, Angular 42/42, Svelte 44/44, aggregate workspace typechecks/builds, focused-test hygiene, and `git diff --check` all exited `0`. Logs and exact command metadata are in `/home/navidrezadoost/.cache/cs002d4-r1-evidence/implementation-reconciliation/review-followup/final-matrix/`. The three frozen register SHA-256 values remain unchanged. Full register reconciliation, the entire cast classification, and example/test-project migration remain incomplete.

## Earlier checkpoint — 2026-10-18 (superseded by the adapter verification follow-up above)

### Adapter-validation follow-up

At the earlier checkpoint, the review's concrete test-utils mismatch was fixed: `PresetPickerController.getCategories()` returns `{ id, label, count }`, so the vanilla adapter now consistently uses `id`, handles the `all` category in its local types, and includes its icon. The Svelte accessibility test now uses Testing Library's typed `rerender()` API instead of the removed Svelte component `$set()` method; the assertions are unchanged. Package-local `jest-axe` declarations use `axe-core`'s result and run-option types, and Jest-enabled package TS projects now declare Jest types. At that checkpoint, no dependency manifest, lockfile, test assertion, or test-runner config had been changed; the later explicitly approved verification-enablement work changed manifests, lockfile, and runner configuration.

Follow-up checks with Node `v24.22.0` / npm `11.19.1`:

| Check | Exact command | Exit / result | Evidence |
| --- | --- | --- | --- |
| Angular typecheck | `npm run typecheck --workspace=@cyber-sheet/angular` | `0` | `typecheck-angular-checkpoint.log` |
| Svelte typecheck | `npm run typecheck --workspace=@cyber-sheet/svelte` | `0` | `typecheck-svelte-checkpoint.log` |
| Test-utils build | `npm run build --workspace=@cyber-sheet/test-utils` | `0` | `build-test-utils-checkpoint.log` |
| Angular build | `npm run build --workspace=@cyber-sheet/angular` | `0` | `build-angular-checkpoint.log` |
| Svelte build | `npm run build --workspace=@cyber-sheet/svelte` | `0` | `build-svelte-checkpoint.log` |
| Focused R1 Jest | `node ./node_modules/jest/bin/jest.js --config packages/core/jest.config.cjs --ci --runInBand --coverage=false packages/core/__tests__/workbook-sheet-view.test.ts packages/core/__tests__/workbook-capability.test.ts packages/core/__tests__/workbook-owned-escape.test.ts` | `0`; 3 suites, 14 tests | `r1-focused-jest-checkpoint.log` |
| Focused-test hygiene | `npm run check:no-focused-tests` | `0` | `no-focused-tests-checkpoint.log` |
| Diff whitespace check | `git diff --check` | `0` | `diff-check-checkpoint.log` |
| Vue typecheck | `npm run typecheck --workspace=@cyber-sheet/vue` | `2`; blocked by undeclared/missing `vitest` and `@vue/test-utils`, followed by callback implicit-any errors because the Vue Test Utils types are absent | `typecheck-vue-checkpoint.log` |
| Angular/Svelte focused Jest | `npm run test:a11y --workspace=@cyber-sheet/angular`; `npm run test:a11y --workspace=@cyber-sheet/svelte` | Both `1`; Node treats each CommonJS `jest.config.js` as ESM because its package declares `"type":"module"`. The configs also reference absent `tsconfig.spec.json` files. These are runner-setup failures; no assertions ran. | `angular-a11y-test-checkpoint.log`, `svelte-a11y-test-checkpoint.log` |

The Vue test imports Vitest and Vue Test Utils, neither of which is declared or installed; the Vue package has no test script, and its Jest config has the same ESM/spec-tsconfig mismatch. These are genuine package test setup gaps. They were not disguised with ambient stubs or test exclusions. The approved package typechecks/builds remain open until this setup is resolved within scope. The Angular, Svelte, and test-utils source/build checks now pass, but their focused tests have not executed.

At that earlier checkpoint the package-lock SHA-256 was `c388309f2360ec6e26a75a9acac135c829381f43d1396acf70912d366a6bb942`; it changed during the explicitly authorized adapter test-enablement work. See the latest follow-up for the current hash. Current hashes: `packages/angular/tsconfig.json` `a6d88bb9c9049f0df0b1b94062da8409ac87f9b9518f662b54e874941c61aa92`; `packages/svelte/tsconfig.json` `21b27ab3c1f347a757adc244795f09a0a8528d689e5f905e7568005b74ca753a`; `packages/test-utils/tsconfig.json` `4f29a6caa9a42f09d61eaa81d2f5092621b94670d0a6176a15706ce77bf973b9`. The three R1 disposition-register hashes remain module `b42c04b22b823a714c1cf9c0364a81870799d9676d7b69b40bf6236fd8abe683`, semantic `158d3e232bd31e41432bff7192f07425a3f600c2330fdc970f68bc94d4d77d22`, and flow `08c8769b3ff7b72f1c1b072412a3387eb655f33d11cb5ad4e5d65683cdd22db0`.

The three disposition registers and all 131 module / 1,486 semantic / 450 ownership-flow records have not been reconciled against implementation in this follow-up. The mutable-escape and 58-hit cast review queue also remains open. No R1 acceptance or R2 authorization is claimed.

The supervisory checkpoint review attachment was read and its recovery safeguards followed. npm config showed `proxy` and `https-proxy` set to `http://10.224.237.6:8080`, while the process environment advertised `http://10.126.109.234:8080`. A TCP probe timed out to the npm-config endpoint and succeeded to the environment endpoint. The canonical install was then retried through the reachable endpoint without changing package manifests or the lockfile:

```sh
npm ci --no-audit --no-fund --fetch-retries=2 --fetch-timeout=120000 \
  --proxy=http://10.126.109.234:8080 \
  --https-proxy=http://10.126.109.234:8080 \
  --registry=https://registry.npmjs.org/
```

It exited `0` in 9 seconds and installed 511 packages. Exact output and timing are in `/home/navidrezadoost/.cache/cs002d4-r1-evidence/npm-ci-checkpoint-retry.log` and `.meta`. npm reported two install scripts not covered by its allow list (`esbuild@0.27.7` and `unrs-resolver@1.11.1`); they were not approved or run manually. The `package-lock.json` SHA-256 remains `c388309f2360ec6e26a75a9acac135c829381f43d1396acf70912d366a6bb942`. Runtime versions are Node `v24.22.0`, npm `11.19.1`, TypeScript `6.0.3`, and Jest `30.4.1`; TypeScript/Jest executables are present at `node_modules/typescript/bin/tsc` and `node_modules/jest/bin/jest.js`.

Current verification commands and results:

| Check | Exact command | Exit / result |
| --- | --- | --- |
| Core typecheck | `node ./node_modules/typescript/bin/tsc -p packages/core/tsconfig.json --noEmit` | `0` |
| Focused R1 tests | `node ./node_modules/jest/bin/jest.js --config packages/core/jest.config.cjs --ci --runInBand --coverage=false packages/core/__tests__/workbook-sheet-view.test.ts packages/core/__tests__/workbook-capability.test.ts packages/core/__tests__/workbook-owned-escape.test.ts` | `0`; 3 suites, 14 tests passed |
| Focused-test hygiene | `npm run check:no-focused-tests` | `0`; no focused markers |
| Affected workspace typechecks | `npm run typecheck --workspace=<name>` for core, React, renderer-canvas, io-xlsx, Vue, Angular, and Svelte | Core, React, renderer-canvas, io-xlsx, Angular, and Svelte: `0`; Vue: `2` due missing/undeclared Vitest and Vue Test Utils. Vue's test callback implicit-any diagnostics follow from the missing Vue Test Utils types. |
| Package builds | `npm run build --workspace=<name>` for core, React, renderer-canvas, io-xlsx, Angular, Svelte, test-utils, and e2e-fixture | All eight: `0`. React, renderer-canvas, and io-xlsx were rerun after the mutation port addition and passed. |
| e2e fixture typecheck | `node ./node_modules/typescript/bin/tsc -p examples/e2e-fixture/tsconfig.json --noEmit` | `0`; uses `Workbook.create()`, an owner view, and the rejecting R1 mutation port with no view-to-`Worksheet` cast. |
| Aggregate workspace typecheck/build | `npm run typecheck --workspaces --if-present`; `npm run build --workspaces --if-present` | Both `2`. Typecheck is blocked by the Vue test's undeclared Vitest/Vue Test Utils dependencies. Build is blocked by the same Vue errors and `cf-ui-core` TS5101/TS5107 deprecation diagnostics under pinned TypeScript 6.0.3. Full follow-up logs: `r1-workspace-typecheck-followup.log`, `r1-workspace-build-followup.log`. |

Current focused Jest output is `/home/navidrezadoost/.cache/cs002d4-r1-evidence/r1-focused-jest-current.log`; core typecheck and hygiene logs are `core-typecheck-current.log` and `no-focused-tests-current.log`. Individual workspace and build logs use `typecheck-<workspace>-current.log`, `typecheck-<workspace>-final.log`, `build-<workspace>-current.log`, and `build-<workspace>-final.log`. The e2e fixture typecheck/build logs are `typecheck-e2e-fixture-current.log` and `build-e2e-fixture-current.log`. Adapter follow-up log names and updated TypeScript-config hashes are recorded above. At that earlier checkpoint the package lock and manifest were unchanged; the later authorized adapter test-enablement work changed the lock and package manifests. The three controlled R1 register hashes remain unchanged. The npm config/network diagnostic is in `npm-network-config-diagnostic.log`. The latest status inventory at that checkpoint was `/home/navidrezadoost/.cache/cs002d4-r1-evidence/status-current-final.txt`, SHA-256 `caaf602407f6f9cb74801a5d629ef4988b58fbed331b94cba118400b915cc7fd`; the adapter follow-up evidence is separately stored under `/home/navidrezadoost/.cache/cs002d4-r1-evidence/adapter-followup/`.

This checkpoint also closes a drawing mutation ordering defect in `packages/react/src/components/DrawingCanvas.tsx`: workbook-view object insertion, checkbox edits, text edits, drag transforms, delete, paste, and cut now reject before invoking `DrawingLayer` writes. A frozen `WorkbookMutationPort` facade provides the R1/R2 type boundary; its cell value/formula/clear/style methods all reject before state changes. The e2e fixture now uses this boundary. The full consumer migration and audit remain incomplete. Other examples/test-projects still require reconciliation, and the remaining broad `as any` search includes unrelated legacy code plus outstanding workbook-facing paths. These results do not establish R1 acceptance.

`git diff --check` exited `0`. A partial owner-boundary cast scan recorded 58 `as any`/similar hits in the selected React, renderer, and example files at `/home/navidrezadoost/.cache/cs002d4-r1-evidence/owner-boundary-cast-audit-partial.log`; the results mix unrelated DOM/event/style casts with workbook-facing callsites and are not yet fully classified. No clean audit claim is made.

## Files and worklist coverage

R1 implementation changes are present in these identified surfaces:

- Core owner/API: `packages/core/src/workbook.ts`, `worksheet.ts`, `eventBridge.ts`, `CommandManager.ts`, `functions/exotic/exotic-functions.ts`, `ClipboardService.ts`, `index.ts`; new `WorkbookSheetView.ts`, `workbook-access-types.ts`, and `workbookCapability.ts`.
- React and renderer consumers: `packages/react/src/CyberSheet.tsx`, `components/ExcelApp.tsx`, `components/DrawingCanvas.tsx`, `components/CommentPanel.tsx`, ribbon/dialog consumers, workbook access utilities/hooks; `packages/renderer-canvas/src/CanvasRenderer.ts` and related renderer read paths.
- Framework and XLSX boundaries: `packages/angular/src/CyberSheetComponent.ts`, `CyberSheetService.ts`, conditional-formatting picker typing repair; Vue/Svelte hooks; `packages/io-xlsx/src/export.ts`, `index.ts`, `import.ts`, and `progressive.ts`.
- Example migration: `examples/e2e-fixture/src/main.ts` now bootstraps atomically and uses the rejecting mutation port; `examples/react-canvas-viewer.tsx` uses the typed view API for filtered row reads.
- New focused suites: `packages/core/__tests__/workbook-sheet-view.test.ts`, `workbook-capability.test.ts`, and `workbook-owned-escape.test.ts`.

Relevant controlled worklist areas include workbook/sheet handle and private-store flows, worksheet-passed-to-call and callback-captures-mutation flows, returned-object/service-chain escapes, and workbook-owned event/service access. Examples in the flow register include `151b638919e2c6df6a6f` (Workbook construction), `ccd96093b8d9d81c10d2` (bootstrap sheet creation), `eebbd07175706ba629aa` (external sheet-store indexing), `284516cd9a1c330c69f4` (mutable Cell returned through `getCell`), and the XLSX export/import/progressive rows. This is a partial checkpoint, not reconciliation of all 131 module dispositions, 1,486 semantic dispositions, or 450 ownership-flow dispositions.

Superseded by the latest adapter verification follow-up above: aggregate typecheck/build now pass, and Vue, Angular, and Svelte adapter suites pass. Consumer migration remains incomplete across the full frozen worklist, and the example/test-project set is not fully reconciled. No unsafe cast or mutable compatibility path is approved to address those gaps.

## Initial toolchain recovery evidence (superseded by latest checkpoint above)

Pinned runtime used: Node `v24.22.0`, npm `11.19.1`.

1. Canonical `npm ci` with pinned runtime was previously stopped after it stalled for over six minutes. The shell reported exit code 130 after interruption. This was not a completed canonical installation.
2. Diagnostic retry:

   ```sh
   PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PATH npm ci --ignore-scripts --no-audit --no-fund --fetch-retries=0 --fetch-timeout=30000 --registry=https://registry.npmmirror.com
   ```

   Exit code: `1`. Elapsed time: approximately 2 minutes 12 seconds. npm failed with `ETIMEDOUT` connecting to `10.224.237.6:8080` while requesting `https://registry.npmmirror.com/jest-axe`. The full output is in `/home/navidrezadoost/.cache/cs002d4-r1-evidence/npm-ci-mirror.log`; npm's debug log is `/home/navidrezadoost/.npm-cache/_logs/2026-10-18T05_26_03_507Z-debug-0.log`.

The ignore-scripts retry is only a recovery diagnostic and is not equivalent to canonical `npm ci` or the D4.6 environment. It did not complete. npm removed the partial `node_modules` tree; direct `typescript/lib/tsc.js`, `jest/bin/jest.js`, and `node_modules/.bin/tsc` are now absent. An offline `npm exec` attempt also exited `1` (`ENOTCACHED` for TypeScript metadata). No manifests, lockfile, or test configurations were edited for these attempts.

## Verification record

The following are historical intermediate results from before the failed mirror retry and are not a final verification of the current worktree:

| Check | Command / result | Evidence and limitation |
| --- | --- | --- |
| Core TypeScript check | `PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PATH node ./node_modules/typescript/lib/tsc.js -p packages/core/tsconfig.json --noEmit` — exit `0` | `/home/navidrezadoost/.cache/cs002d4-r1-evidence/core-typecheck.log`; later source changes and dependency removal mean it must be rerun. |
| Core build | `PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PWD/node_modules/typescript/bin:$PATH npm run build --workspace=@cyber-sheet/core` — exit `0` | `/home/navidrezadoost/.cache/cs002d4-r1-evidence/core-build.log`; intermediate only. |
| Focused R1 Jest suites | `PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PATH node ./node_modules/jest/bin/jest.js --config packages/core/jest.config.cjs --ci --runInBand --coverage=false packages/core/__tests__/workbook-sheet-view.test.ts packages/core/__tests__/workbook-capability.test.ts packages/core/__tests__/workbook-owned-escape.test.ts` — 3 suites, 10 tests passed, exit `0` | `/home/navidrezadoost/.cache/cs002d4-r1-evidence/r1-focused-jest.log`; intermediate only, not a result for the current source state. |
| Root workspace typecheck | `PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PWD/node_modules/typescript/bin:$PATH npm run typecheck --workspaces --if-present` — exit `1` | `/home/navidrezadoost/.cache/cs002d4-r1-evidence/r1-workspace-typecheck.log`; includes compiler/dependency setup problems and implementation migration errors. |
| Affected workspace checks | Individual typechecks for `@cyber-sheet/io-xlsx`, `@cyber-sheet/react`, `@cyber-sheet/renderer-canvas`, `@cyber-sheet/vue`, `@cyber-sheet/angular`, and `@cyber-sheet/svelte` each exited `2` | Logs `typecheck-io-xlsx.log`, `typecheck-react.log`, `typecheck-renderer-canvas.log`, `typecheck-vue.log`, `typecheck-angular.log`, and `typecheck-svelte.log` under the evidence directory. They contain R1 API migration errors plus some missing test/type dependencies. These must be rerun after toolchain recovery. |

At this initial toolchain-recovery checkpoint, no current check could be reported as passing because the retry had removed the executables. That historical limitation was resolved by the later canonical install; the current results are listed at the top of this report.

Configuration hashes captured at this checkpoint:

| File | SHA-256 |
| --- | --- |
| `package-lock.json` | `c388309f2360ec6e26a75a9acac135c829381f43d1396acf70912d366a6bb942` |
| `packages/core/jest.config.cjs` | `d771babb3f8ef093b056ac7c3dd0f49d4aa7cb689cf8d84d4d42e6081bf24814` |
| `packages/core/tsconfig.json` | `9cba9c68f3dce5a7f5bcf97041123fc8888a8f13fc17346a50c000f719a98697` |
| `packages/react/tsconfig.json` | `8428ee1297ca659e35505999038801041fd1186e86cea25af3e2d67df1b8b5d9` |
| `packages/renderer-canvas/tsconfig.json` | `9a58ac625611c50768007cfe5607cd195151b0376bcc64c101067f0c926a16aa` |
| `packages/io-xlsx/tsconfig.json` | `149c7c20db0d4e566cb99d77cdbc6757db3158ba7624ed3d99d6e5f5ff7526ea` |
| `packages/vue/tsconfig.json` | `cc1249afa5e42b7e4d7ed343436d832bafe658bdc3808a52082c957f5e000e04` |
| `packages/angular/tsconfig.json` | `8e26e38fdc1f4d79c000be22b0592e0906b7a685a58eb38acc298a6fef9ad36f` |
| `packages/svelte/tsconfig.json` | `cc1249afa5e42b7e4d7ed343436d832bafe658bdc3808a52082c957f5e000e04` |

## Scope and architecture findings pending

- The private capability primitive is exercised for owner, transaction, expiry, and delayed-use rejection. It is not connected to writable worksheet operations in R1 because no workbook write is authorized before R2; owned raw mutators and the typed port reject before writes.
- Workbook service implementations and event bridge management are now ECMAScript-private; public workbook event access is subscription-only, and pivot access is query-only. The getter/access matrix still needs a complete register-by-register audit.
- The complete worksheet mutator, retained drawing-layer, callback, collection, and service escape audit is not finished.
- XLSX public import and progressive restore entrypoints reject until R6. io-xlsx checks pass, but caller migration and behavior need continued scope review.
- The broad unsafe-cast/raw-owner audit remains incomplete. The e2e fixture's former view-to-Worksheet cast was removed; remaining hits still need classification against the accepted flow register.
- Other examples/test projects have not yet completed atomic bootstrap and initialization-failure migration.

These are implementation work items and unresolved risks, not accepted deviations.

## Rollback readiness

The branch remains isolated and unpublished. No commit, merge, release, or baseline operation was performed in this checkpoint. Because the worktree contained extensive pre-existing D4/R0.1 modifications before this R1 effort and its original entry manifest is no longer available, a safe blanket revert is not established. Rollback must use reviewed R1-specific hunks/files; do not reset or clean the shared worktree.

## Next gate

Continue the frozen R1 migration: reconcile all 131 modules and associated semantic/flow rows, finish the mutable-escape and unsafe-cast audits, and migrate remaining examples/test projects. The adapter and aggregate typecheck/build gates pass at this checkpoint; rerun affected checks after further source changes. Preserve the existing test assertions and discovery. R1 acceptance and any R2 authorization remain separate decisions.
## Latest example R6 boundary follow-up — 2026-10-18

Implementation reconciliation now records the URL-loading demo's 19 workbook-facing semantic rows and the React XLSX demo's two publication flows as `rejected-pending-R6`. Both depend on `loadXlsxFromUrl()`, which throws before fetch or Workbook publication; their module rows remain partial pending eventual consumer migration. The IO-XLSX entrypoint-gate regression passed 3/3, the URL demo standalone typecheck passed, and the React workspace typecheck passed. An ad-hoc standalone typecheck of `examples/excel-app-demo.tsx` exited 2 due to missing workspace CSS/Node declarations and source/dist renderer type duplication in its transitive graph; it is documented as an inconclusive probe, not a pass.

The implementation ledger has 1,942 open records and 125 records with a non-open/partial disposition; SHA-256 `79d971dd0aac84bdcbdcbcb0cd0d058f1047009446f744e96e308adfa1981cd6`. The three frozen classification registers remain unchanged. Exact logs and metadata are under `/home/navidrezadoost/.cache/cs002d4-r1-evidence/implementation-reconciliation/example-r6-boundary-followup/`. The 131-module, 1,486-semantic, and 450-flow implementation reconciliation, mutable-escape/cast audit, and remaining example migration are still open. R1 remains unaccepted; R2, merge, release, and baseline changes remain unauthorized.
## Latest Worksheet collection getter review — 2026-10-18

Added a focused regression proving that mutation of the raw adopted worksheet's returned filter `Map`, hidden-row `Set`, and graph precedent array/address does not change owner state. Source review confirmed these methods return copies; corrected stale comments that described the hidden sets as live references. The broader Worksheet getter/service/callback/drawing audit remains open, and no implementation-ledger rows were closed from this bounded pass.

The post-change matrix passes: focused core 18/18, IO-XLSX import-gate 3/3, Vue 35/35, Angular 42/42, Svelte 44/44, aggregate workspace typecheck/build, focused-test hygiene, and `git diff --check`. Exact commands, logs, durations, exit codes, and source/register hashes are under `/home/navidrezadoost/.cache/cs002d4-r1-evidence/implementation-reconciliation/worksheet-collection-getter-review/`. The three source-classification register hashes remain unchanged, and the implementation ledger remains at 1,942 open records (SHA-256 `79d971dd0aac84bdcbdcbcb0cd0d058f1047009446f744e96e308adfa1981cd6`). R1 is still unaccepted; R2 remains unauthorized.


### Getter regression completion — 2026-10-18

Following review, the adopted-worksheet regression now directly mutates results from `getHiddenCols()` and `getDependents()` in addition to the filter Map, hidden-row Set, and precedent results. Owner visibility/filter/graph state remains unchanged. The two escape-classified visibility records are recorded as `implemented-detached-result`; paired owner-polymorphic read records and graph read records remain partial because owner-view call-path migration and later graph semantics are still open. The separate implementation ledger now has 1,936 open records, nine partial owner splits, and two implemented detached results (2,067 total), SHA-256 `3e7f18d0c671c8c446d19956143e55ae034e16b607f7c7940915cd2cee5ba5fa`. The three frozen source registers are unchanged.

The getter-completion verification logs are under `/home/navidrezadoost/.cache/cs002d4-r1-evidence/implementation-reconciliation/worksheet-collection-getter-complete/`: focused core tests 18/18, IO-XLSX import gate 3/3, adapters 121/121, aggregate build then typecheck, focused-test hygiene, and `git diff --check` all passed. The full Worksheet getter inventory and callback, service, renderer/drawing, cast, and register reconciliation remain open. R1 acceptance is withheld; R2 remains unauthorized.


### Callback retention review — 2026-10-18

Added a retained-callback regression for `Worksheet.forEachNonEmptyCell()`: the adopted-sheet callback cell is held after callback return, attempted nested mutation rejects, and stored owner state remains unchanged. Six escape occurrences are recorded as implemented detached results; six associated reads remain partial pending owner-view consumer migration. The implementation ledger now has 1,924 open records, 15 partial owner splits, and eight implemented detached results (2,067 total). Current ledger SHA-256: `a3334737a446f4ce3baea9b46996a549f96b7b945a3ef78c428bbe930acd660a`. Frozen source registers remain unchanged.

The full focused and adapter verification matrix was rerun after the test change and passed: core 18/18, IO-XLSX import gate 3/3, Vue 35/35, Angular 42/42, Svelte 44/44, aggregate build then typecheck, focused-test hygiene, and `git diff --check`. Logs and metadata are in `/home/navidrezadoost/.cache/cs002d4-r1-evidence/implementation-reconciliation/worksheet-callback-retention/`. Broader callback, service, graph, renderer/drawing, cast, and full worklist reviews remain open. R1 acceptance is withheld; R2 remains unauthorized.


### Workbook event-facade authority review — 2026-10-18

Added runtime assertions that `Workbook.eventBus` is frozen, exposes only `on`/`once`/`off`, and has no `emit` or `registerBridge`. Closed semantic key `cc0265005efedf8d9041` in the implementation ledger as `implemented-readonly-facade`; event ordering remains R4. The latest verification passed: focused core 18/18, IO-XLSX gate 3/3, adapters 121/121, aggregate build then typecheck, hygiene, and whitespace checks. Evidence is under `/home/navidrezadoost/.cache/cs002d4-r1-evidence/implementation-reconciliation/event-facade-audit/`. Broader callback, service, drawing, cast, and record reconciliation remains open.

The implementation ledger now contains 1,923 open records and one bounded `implemented-readonly-facade` record, with 2,067 unique keys total. Current ledger SHA-256: `1bfc712dee4e339d1a91c53eaa551e511c8aa7b8179675d1ac964118cb16963a`. The frozen module, semantic, and flow registers remain unchanged.


### Retained drawing-command alias review — 2026-10-18

Added a regression for an `InsertImageCommand` retained across worksheet adoption. Its `getImage()` method rejects through the owner-guarded `getDrawingLayer()` before returning a mutable drawing object, and the stored image remains unchanged. Two escape/chain records are `rejected-at-owner-boundary`; the paired read remains partial pending owner-view/R5 consumer migration. The full rerun passed four core suites/26 tests, IO-XLSX gate 3/3, Vue 35/35, Angular 42/42, Svelte 44/44, aggregate build then typecheck, hygiene, and whitespace checks. Evidence is under `/home/navidrezadoost/.cache/cs002d4-r1-evidence/implementation-reconciliation/drawing-command-alias/`.


The implementation ledger now has 2,067 unique keyed rows: 1,920 open, 52 standalone-preserved, 27 rejected at initialization boundary, 25 rejected pending R6, 16 partial initialization gates, 16 partial owner splits, eight implemented detached results, two rejected at the owner boundary, and one implemented read-only facade. Ledger SHA-256: `50ce5a4dd1e8e200d87b0ca23c51b847c972d4a6dfcb93a2fc4cfcb48f046701`. Frozen source registers remain unchanged.


### Drawing alias retention across adoption — 2026-10-18

A new regression retains a standalone worksheet's DrawingLayer, picture object, and nested position before adoption, then mutates/removes/adds through those stale aliases. `Worksheet.adoptByWorkbook()` now deep-copies serialized drawing data into a replacement layer before publishing ownership; the adopted worksheet retains the original picture and position. Standalone behavior remains available. The existing two owner-boundary and one partial owner-split drawing command records now cite this evidence; no ledger count changed. Broader renderer/prop and drawing flow reconciliation remains open.

Verification passed against this source state: core focused suites 27/27, IO-XLSX gate 3/3, Vue 35/35, Angular 42/42, Svelte 44/44, aggregate build and typecheck, focused-test hygiene, and `git diff --check`. Logs and exact command metadata are under `/home/navidrezadoost/.cache/cs002d4-r1-evidence/implementation-reconciliation/drawing-pre-adoption-alias/`. The implementation ledger has 2,067 rows and 1,920 open records; SHA-256 `08440e2740faec920762fb6593717bdf3b6a56a1b584e75ee70dd09bd2e90a5d`. Frozen source registers remain unchanged. R1 acceptance remains withheld; R2/R4 and merge/release/baseline operations remain unauthorized.


### Drawing clone integrity and renderer authority paths — 2026-10-18

Adoption regressions now cover multiple drawing types, z-order, nested metadata, unsupported function payload rejection, and failure atomicity. The clone helper rejects functions, symbols, bigint, and non-plain prototypes; `loadedImage` is omitted as a runtime handle. Source review traced CanvasRenderer's independently supplied DrawingLayer and source-based image cache, plus ExcelApp's app-local DrawingLayer. Two option-button flows now reject before drawing writes for adopted worksheets and are recorded as owner-boundary rejections. Other renderer and prop aliases remain open.

Focused verification passed: core 29/29, React focused 4/4, ChartManager 15/15, IO-XLSX 3/3, adapters 121/121, aggregate build/typecheck, hygiene, and whitespace checks. Full React test discovery remains blocked by missing `@testing-library/react` and jest-dom matcher types in two unrelated suites; the focused React suites passed. Evidence is under `/home/navidrezadoost/.cache/cs002d4-r1-evidence/implementation-reconciliation/drawing-renderer-authority/`. The ledger has 2,067 keyed records with 1918 open; SHA-256 `640f02f8aa36b697632e2a1d6578fd38ace258d6220e1b1b6cac53abd4bdead6`. Frozen source registers are unchanged. R1 acceptance remains withheld; R2/R4, merge/release, and baseline operations remain unauthorized.


### Latest clone-integrity and React discovery follow-up — 2026-10-18

Drawing adoption now rejects symbol-keyed/accessor/hidden-property payloads and unsupported Maps, Sets, cycles, invalid Dates, and non-JSON object prototypes without evaluating getters or publishing partial ownership. The clone uses a replacement DrawingLayer before ownership is set; unsupported-data regressions confirm standalone state remains intact and mutable. The two option-button owner-boundary tests now check drawing fields, selection IDs, and both event channels; standalone linked-cell behavior remains available.

The React test script now discovers all four suites. Full discovery found and the component fixes resolved ARIA role/parent violations and missing accessible state/control semantics without removing axe or interaction assertions. React passes 48/48. Core focused tests pass 24/24, ChartManager 15/15, IO-XLSX gate 3/3, and adapters 121/121; aggregate build then typecheck, focused-test hygiene, and `git diff --check` pass. Evidence: `/home/navidrezadoost/.cache/cs002d4-r1-evidence/implementation-reconciliation/drawing-renderer-full-react/`.

The implementation ledger and frozen registers are unchanged: 1,918 open of 2,067 keyed implementation records, with the ledger SHA-256 `640f02f8aa36b697632e2a1d6578fd38ace258d6220e1b1b6cac53abd4bdead6`; the three source-register hashes remain unchanged. Full renderer authority, mutable-escape, unsafe-cast, and register reconciliation remain incomplete. R1 acceptance is withheld; R2/R4 and merge/release/reset/baseline operations remain unauthorized.


### Renderer authority and downstream alias follow-up — 2026-10-18

ChartManager retained aliases were traced through their consumers. A retained query or create-event chart object can still mutate the manager-local chart cache; `getChartsAtPosition()` and `exportToJSON()` subsequently observe that mutation. These are local manager/render/export effects. The worksheet metadata written by `saveChartsToMetadata()` is a detached JSON snapshot and remains unchanged, and chart updates reject after worksheet adoption. The public query/event alias API remains open for review.

CanvasRenderer now detaches structured cell values before passing them into plugin callbacks. A regression retains a rich-text value from a plugin callback while the worksheet is standalone, adopts the worksheet, then mutates the retained value and verifies the worksheet remains unchanged. The callback receives no worksheet handle; plugin closure captures and other paths remain under audit. Renderer worker success and failure results are also discarded if adoption occurs while work is pending, and the synchronous fallback is skipped after adoption. Regressions cover both paths. The existing ChartInteractionManager test data and ranges were migrated from zero-based to one-based worksheet coordinates without changing assertions.

The implementation ledger records the plugin consumer as one additional `partial-owner-split`; two existing CanvasRenderer worker flows are individually `rejected-at-owner-boundary`. Together with the prior three filter call dispositions, the ledger has 2,067 unique records: 1,910 open, 19 partial owner splits, and nine owner-boundary rejections. SHA-256: `2b8a008e23bdb528e6b9cfd6e3f4b8699cb9fcb6da6ec5e59c0b804700cab725`. Frozen source-register hashes remain module `b42c04b22b823a714c1cf9c0364a81870799d9676d7b69b40bf6236fd8abe683`, semantic `158d3e232bd31e41432bff7192f07425a3f600c2330fdc970f68bc94d4d77d22`, and flow `08c8769b3ff7b72f1c1b072412a3387eb655f33d11cb5ad4e5d65683cdd22db0`.

Final verification passes: core four-file selection 31/31, React full discovery 48/48, renderer/ChartManager/ChartInteractionManager 45/45, IO-XLSX gate 3/3, and adapters 121/121, totaling 248 tests. Aggregate build then typecheck, focused-test hygiene, and `git diff --check` pass. Logs are under `/home/navidrezadoost/.cache/cs002d4-r1-evidence/implementation-reconciliation/renderer-authority-final/`. R1 acceptance remains withheld; the broader renderer, service, cast, and consumer audits remain incomplete. R2/R4, merge, release, reset, and baseline recapture remain unauthorized.


### Renderer retained-alias follow-up — 2026-10-18

The ChartManager retained-alias regression mutates references from `get()` and `getAll()` across worksheet adoption, including nested chart metadata and options. The references still mutate the manager-local cache, while the JSON-cloned worksheet metadata snapshot remains unchanged; subsequent manager update rejects after adoption. This does not close the mutable query API audit or downstream event/callback review.

CanvasRenderer option initialization now carries through `onRequestColumnFilterMenu`, which was declared in the options type but omitted from stored options. New tests retain its `apply`/`clear` closures across adoption and verify both reject without changing filters or emitting worksheet events. Additional regressions retain a RenderLayer sheet handle and a worksheet DrawingLayer supplied as an option; the retained worksheet handle rejects writes after adoption, and mutation through the old drawing-layer alias does not alter the adopted worksheet snapshot. Shallow options, image, worker, plugin, service, and owner-view path reviews remain open. No semantic or flow rows were closed.

Comparable verification passes: core four-file selection 31/31, full React 48/48, CanvasRenderer plus ChartManager 27/27 (ChartManager 16/16), IO-XLSX gate 3/3, and Vue/Angular/Svelte 121/121, for 230 passing tests. Aggregate workspace build followed by typecheck both exit 0; focused-test hygiene and `git diff --check` also pass. Logs are under `/home/navidrezadoost/.cache/cs002d4-r1-evidence/implementation-reconciliation/renderer-alias-followup/`. Frozen source-register hashes remain module `b42c04b22b823a714c1cf9c0364a81870799d9676d7b69b40bf6236fd8abe683`, semantic `158d3e232bd31e41432bff7192f07425a3f600c2330fdc970f68bc94d4d77d22`, and flow `08c8769b3ff7b72f1c1b072412a3387eb655f33d11cb5ad4e5d65683cdd22db0`. Three semantic records for retained filter `apply`/`clear` calls are now individually `rejected-at-owner-boundary`, backed by unchanged-state/no-event regressions. The ledger has 2,067 unique records: 1,913 open, seven rejected at the owner boundary, and 18 partial owner splits; its SHA-256 is `8f36639e5d89e97206851a876d6451f678660b6ef281a815dbfaf9cba9c086ad`. R1 acceptance remains withheld; R2/R4 and merge/release/baseline operations remain unauthorized.


### Core verification accounting and ChartManager disposition update — 2026-10-18

The 24-test core result selected three files (`workbook-sheet-view`, `workbook-capability`, and `workbook-owned-escape`). The prior 29-test result selected those plus `worksheet-structure.test.ts`. A current run of the four-file selection passes 31/31; `worksheet-structure.test.ts` now contributes seven tests. The comparable current total is 218: core 31, React 48, ChartManager 15, IO-XLSX 3, and adapters 121. The 211 total applies to the earlier three-file core selection.

Reviewed `ChartManager.ts`: adopted Worksheet metadata load is skipped and chart mutation/import entrypoints reject before map writes/events; standalone CRUD remains supported. The module is recorded as `partial-owner-split`, with mutable objects exposed by `get()`/`getAll()` still needing audit. Ledger status is 1,917 open / 2,067 total; SHA-256 `d8830fc9c93a778103280cdde9d99d7ae7cf3228ada08bce326d6a5a380727b1`. Frozen source-register hashes were rechecked and remain unchanged. R1 acceptance remains withheld.


### Renderer boundary triage update — 2026-10-18

`CanvasRenderer` accepts both standalone Worksheets and owner-backed read views, guards view auto-sizing, and routes worksheet writes through the standalone gate or Worksheet owner guards. Its exposed sheet/options getters and retained plugin/worker/drawing callbacks still require alias testing, so only the module is `partial-owner-split`; associated semantic and flow rows remain open. ChartManager is also a partial module boundary while its `get()`/`getAll()` mutable aliases await review. Ledger: 1,916 open, 18 partial owner splits, 2,067 total; SHA-256 `d7f7b93db85e6ac6483947d4d9210d7f42c54fb47cd75887ce0b80cea6ae501d`. No source changed in this triage and no new runtime checks are claimed.
