# CyberSheet Progress Report — CS-004A XLSX Fidelity

**Status:** Implemented locally · **Priority:** P0 · **Date:** 2026-10-17  
**Branch:** `main` · **Base HEAD:** `ec75a6e` · **Worktree:** uncommitted  
**Environment:** Manjaro Linux 6.12.94-1 (x86_64); Node v24.22.0; npm 11.19.1; TypeScript 6.0.3; Jest ESM VM modules. Browser: N/A.

## Goal and expected behavior

Preserve ordinary formula text and cached scalar results through XLSX export/import. Correctly import inline string payloads, including XML-escaped characters, significant whitespace, Unicode, and embedded line breaks. Configure formula tests with the calculation engine so the pre-round-trip formula values are verified independently from file fidelity.

## Changes and API impact

- `packages/io-xlsx/src/export.ts`: worksheet export now writes formula cells as `<f>` plus cached `<v>` values, including formula-only cells with no cached result. Inline strings with whitespace/newlines use `xml:space="preserve"`. The existing sparse cell traversal remains in use.
- `packages/io-xlsx/src/index.ts`: import restores formula text and cached scalar values, decodes inline `<is><t>` runs and the five named/numeric XML entities, and uses a multiline-safe cell body matcher.
- `packages/io-xlsx/test/integration-hardening-sprint.test.ts`: attaches a `FormulaEngine` to the workbook, explicitly recalculates formulas before round-trip checks, and covers escaped characters, leading/trailing whitespace, tabs, newlines, and Unicode. Empty unpopulated cells now assert the public `null` result.
- No public API changes.

## Verification

- Targeted XLSX suites: `NODE_OPTIONS=--experimental-vm-modules PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PATH node ./node_modules/jest/bin/jest.js --config packages/io-xlsx/jest.config.cjs --ci --runInBand --coverage=false packages/io-xlsx/test/integration-hardening-sprint.test.ts packages/io-xlsx/test/round-trip-symmetry.test.ts` — **pass**, 2 suites; 25 passed, 2 existing skipped.
- Full IO-XLSX project: `NODE_OPTIONS=--experimental-vm-modules PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PATH node ./node_modules/jest/bin/jest.js --config packages/io-xlsx/jest.config.cjs --ci --runInBand --coverage=false` — **pass**, 2 suites; 25 passed, 2 existing skipped.
- Build: `PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PATH npm run build` — **pass**, `tsc -b`, exit 0. npm printed the existing global `Unknown global config "tmp"` warning.
- `git diff --check` — **pass**.

The CS-000F.4 XLSX findings are addressed: inventory records `io-xlsx-001`, `io-xlsx-003`, and `io-xlsx-004` were standalone fixture setup gaps and now evaluate under an attached formula engine; `io-xlsx-005` formula expression/cached-result round trip passes; `io-xlsx-002` and `io-xlsx-006` inline-string cases pass, including XML escaping, whitespace, Unicode, and line breaks. The accepted 144-record baseline inventory remains unchanged as the comparison reference. No dedicated before/after benchmark was run. The integration suite's formula recalculation (<100 ms) and export (<2 s) assertions pass on this environment; those thresholds are not a benchmark campaign.

## Effects and remaining defects

- Regression: both existing IO-XLSX suites pass; sparse export symmetry assertions remain passing.
- Memory: no memory benchmark was run. Sparse cell iteration remains proportional to stored cells.
- Security: no security audit was run. XML parsing still uses regular expressions and is not a general-purpose validating OOXML parser.
- XLSX fidelity: ordinary formulas and scalar cached results round-trip; inline-string fidelity is covered by the new tests, and the existing shared-string import path is unchanged. Shared/array formula encodings and non-scalar formula results are not covered by this implementation.
- Release/merge: production merge remains unauthorized; clean-checkout CI has not been run.

## Next focused ticket

**CS-002A — Coordinate and DAG contract.** Begin with A1 literal → B1 formula → C1 dependent formula. Trace normalized addresses, dependency edges, dirty nodes, scheduling order, evaluation inputs, and committed values for direct Worksheet and `SpreadsheetEngine.run()` usage. Keep the XLSX, pivot, and statistical workstreams separate.
