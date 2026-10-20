# CyberSheet Progress Report — CS-002B

**Status:** Implemented locally; full-core verification remains red · **Priority:** P0 · **Reported:** 2026-10-17  
**Branch:** `main` · **Base HEAD:** `ec75a6e` · **Worktree:** uncommitted  
**Environment:** Manjaro Linux 6.12.94-1 (x86_64); Node v24.22.0; npm 11.19.1; TypeScript 6.0.3; Jest via `packages/core/jest.config.cjs`; browser: N/A.

## Goal and expected behavior

Implement CS-002B's approved default policy: iteration is disabled, every formula in a detected dependency cycle receives `#CIRC!`, downstream formulas cannot keep stale numeric results, independent formulas calculate normally, and affected formulas recover after a cycle is removed. Direct `Worksheet` recalculation and `SpreadsheetEngine.run()` must agree. Reject invalid one-based worksheet coordinates before graph key packing.

## Implementation

- `DependencyGraph` now validates one-based row/column bounds (row 1–1,048,576; column 1–16,384) at coordinator graph-registration and mutation boundaries, and computes downstream closure including range watchers.
- `Worksheet` commits cycle errors to cycle cells and transitive formula dependents. Formula-result notifications remain deferred until recalculation clears dirty state; unchanged cached errors do not produce duplicate result events.
- The engine applies circular errors after scheduled acyclic work and before completion events. Scheduled `Error` objects are converted to their established spreadsheet error-message value before cache writes.
- `FormulaEngine` preserves cached `#CIRC!` through cell and range references so newly added downstream formulas cannot coerce a circular error into an ordinary value.
- `ReferenceEngine` now detects formula SCCs before its brute-force pass and applies the approved disabled-iteration policy. Differential seeds and operation streams were not changed.
- Added cycle, downstream, independent-branch, recovery, snapshot, rollback, event-order, unchanged-result, and coordinate-boundary regressions.

## Files changed and API impact

Ticket changes are in `packages/core/src/dag/DependencyGraph.ts`, `packages/core/src/worksheet.ts`, `packages/core/src/SpreadsheetEngine.ts`, `packages/core/src/FormulaEngine.ts`, `packages/core/src/ReferenceEngine.ts`, `packages/core/__tests__/cs-002b-cycle-handling.test.ts`, and one updated malformed-self-reference expectation in `packages/core/__tests__/formula-dag-integration.test.ts`.

No new public methods were added. Derived engine result events now share deferred publication with direct worksheet recalculation and carry the already-established `origin: "formula-result"` discriminator. The reference engine's cycle behavior now matches the approved policy.

## Verification

- `PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PATH node ./node_modules/jest/bin/jest.js --config packages/core/jest.config.cjs --ci --runInBand --coverage=false packages/core/__tests__/cs-002b-cycle-handling.test.ts packages/core/__tests__/cs-002a-coordinate-contract.test.ts packages/core/__tests__/formula-dag-integration.test.ts packages/core/__tests__/differential.test.ts packages/core/__tests__/metamorphic.test.ts packages/core/__tests__/patch-engine.test.ts packages/core/__tests__/transaction-engine.test.ts` — **pass**, 7 suites; 203 passed, 2 skipped. This includes the unchanged differential seeds: all 8 differential cases now pass.
- `PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PATH npm run build` — **pass**, exit 0; npm emitted the existing `Unknown global config "tmp"` warning.
- `git diff --check` — **pass**.
- Full core command `PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PATH node ./node_modules/jest/bin/jest.js --config packages/core/jest.config.cjs --ci --runInBand --logHeapUsage --coverage=false --silent` — **fail**, 234 suites: 195 passed, 34 failed, 5 skipped; 6,466 tests passed, 280 failed, 173 skipped, 9 todo. Failures include known pivot defects, a timeout, graph invariant failures, and legacy suites that still pass zero-based coordinates, which this ticket now rejects at worksheet mutation boundaries. The complete legacy fixture migration and unrelated baseline failures remain open; no assertions were deleted or skipped for this ticket.

No benchmarks, browser, security audit, or XLSX fidelity run was performed. The implementation adds graph-closure work proportional to reachable dependents when cycles are committed; performance impact was not benchmarked.

## Risks and open defects

- Full core suite remains red. In particular, zero-based fixture usage in older suites conflicts with the established one-based `Address` contract and requires focused migration/reconciliation. Do not interpret the focused pass as a clean-checkout or release gate.
- Iterative calculation remains unsupported and disabled. XLSX import/export representation of circular errors was not changed or validated.
- Broader dependency semantics and workbook-scoped stable sheet identity remain open under CS-002. CS-001C mutation journal, CS-004 export integrity, CS-005A statistical correctness, and CS-006A pivot correctness remain separate workstreams.
- Production merge remains withheld; no commit was created.

## Next focused ticket

Continue CS-002 by reconciling legacy zero-based tests with the one-based public coordinate contract, then rerun the full core suite and classify remaining failures against the accepted CS-000F.4 inventory. Keep export, statistics, pivot, and XLSX fidelity work separate.
