# CS-002D4-R1 PKG-16E — Candidate test matrix

**Result:** 22 Core suites passed, 294/294 tests passed, under Node 24.22.0 and the TS-first opt-in Jest config. This tests the accumulated worktree and is not clean-tree candidate verification.

| Evidence group | Included suites |
| --- | --- |
| Seven operation / Journal-Snapshot | `workbook-row-height-journal.p1-pkg-02a.test.ts`; `workbook-column-width-journal.p1-pkg-02b.test.ts`; `workbook-seven-operation-differential.p1-pkg-02c.test.ts`; `workbook-seven-operation-observer-isolation.p1-pkg-08b.test.ts`; `workbook-transaction-side-effect-matrix.p1-pkg-13b.test.ts`; `workbook-transaction-disposal-publication.p1-pkg-14b.test.ts`; `workbook-multisheet-formula-graph-rollback.p1-pkg-15b.test.ts` |
| Events and queue | `workbook-mutation-queue.p1-pkg-01.test.ts`; `workbook-event-contract.p1-pkg-02d.test.ts`; `workbook-dimension-events.p1-pkg-02e.test.ts`; `EventBus.workbook-bridge.test.ts` |
| Resolver | `core-typescript-first-resolver.p1-pkg-08a.test.ts` |
| Formula and merge | `formula-a1-dollar-compatibility.p1-pkg-15a.test.ts`; `workbook-merged-formula-coordinate-contract.p1-pkg-14a.test.ts`; `workbook-merged-member-formula-origin.p1-pkg-13a.test.ts`; `workbook-merged-member-integrity.p1-pkg-12a.test.ts` |
| Standalone Pivot | `pivot-recompute-validation-retry.p1-pkg-14c.test.ts`; `pivot-recompute.test.ts`; `pivot-invalidation.test.ts`; `pivot-snapshot-store.test.ts`; `pivot-error-publication.p1-pkg-13c.test.ts`; `getpivotdata.test.ts` |

## Exact command

The exact command with all suite paths is preserved in `CS-002D4-R1-PKG-16E-command.txt`. It uses `NODE_OPTIONS=--experimental-vm-modules`, `node node_modules/jest/bin/jest.js`, `--config packages/core/jest.typescript-first.config.cjs`, and `--runInBand`.

The raw output is `CS-002D4-R1-PKG-16E-bounded-jest-output.txt`. Sidecar before/after outputs are `CS-002D4-R1-PKG-16E-bounded-sidecars-before.txt` and `...-after.txt`; both contain 237 successful entries and compare byte-identically. Overall CS-002D4-R1 acceptance remains **WITHHELD**.
