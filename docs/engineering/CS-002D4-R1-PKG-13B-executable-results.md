# CS-002D4-R1 PKG-13B — Executable results and handoff

**Lane result:** One focused dual-strategy rollback regression authored and verified: 1 suite, 2/2 tests passed in the serialized PKG-13D window. Lane B did not independently run Jest or alter production source. The coordinator ran Core typecheck after all lane tests.

## New focused suite

Path: `packages/core/__tests__/workbook-transaction-side-effect-matrix.p1-pkg-13b.test.ts`

The suite is parameterized over `journal` and `snapshot` and currently contains two executions. It injects a deterministic failure on the fourth `after-cell-record` phase, after cross-Worksheet dimension writes and repeated mixed writes to one formula-bearing address, then after an absent sparse cell has been allocated. Assertions compare exact Worksheet snapshots, dependency graph edges, dirty/recalculation observations, sparse cell presence, Worksheet and Workbook event traces, and Workbook health.

## Exact coordinator command

Coordinator execution was serial after the technical lanes stabilized:

```sh
PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PATH \
NODE_OPTIONS=--experimental-vm-modules \
node node_modules/jest/bin/jest.js \
  --config packages/core/jest.typescript-first.config.cjs --runInBand \
  packages/core/__tests__/workbook-transaction-side-effect-matrix.p1-pkg-13b.test.ts
```

Environment: Node v24.22.0, npm 11.19.1, Jest 30.5.2, TypeScript 6.0.3. Result: 1 suite, 2/2 tests passed. Unfiltered output: `CS-002D4-R1-PKG-13D-lane-b-jest-output.txt`. All 237 protected sidecar hashes passed before and after, and saved outputs matched byte-for-byte; see `CS-002D4-R1-PKG-13D-lane-b-sidecars-before.txt` and `CS-002D4-R1-PKG-13D-lane-b-sidecars-after.txt`.

## Reconciled existing executable evidence

| Earlier package | Direct result recorded there | Use in this inventory |
| --- | --- | --- |
| PKG-02A | Row-height transaction tests, including sparse defaults, multi-sheet rollback, failure and recovery behavior; see `CS-002D4-R1-PKG-02A-verification.md`. | Row-height ownership and fault coverage. |
| PKG-02B | Column-width transaction tests, including Journal/Snapshot restoration and mixed operations; see `CS-002D4-R1-PKG-02B-verification.md`. | Column-width ownership and fault coverage. |
| PKG-02C | Seven-operation differential tests under Journal/Snapshot; cited output and details in `CS-002D4-R1-PKG-02C-differential-verification.md`. | Mixed state, events, dimension-fault rollback, and batch settlement. |
| PKG-08B | Two observer-isolation executions under Journal/Snapshot; see `CS-002D4-R1-PKG-08B-seven-operation-regression-expansion.md` and PKG-11B verification. | Post-commit observer exception isolation. |
| PKG-09C | Focused sparse null regression passed 3 suites / 83 tests with adjacent cases; raw outputs and exact run documented in `CS-002D4-R1-PKG-09C-regression-disposition.md`. | No-op sparsity and formula-to-null behavior. |
| PKG-12A | Five merged-member test executions passed; focused and adjacent results in `CS-002D4-R1-PKG-12A-regression-results.md`. | Merge-anchor graph and rollback boundary. |

Those package outcomes are historical reported evidence, not rerun or independently revalidated by Lane B. PKG-13D should run the authored suite and include it with the integrated selection; no full Core diagnostic is requested by Lane B itself.

## Status boundary

The regression passed its coordinator execution. If a future rerun fails, classify whether it is a compilation/setup issue or an executed assertion before proposing any source action. A production patch requires the PKG-13 authorization's red reproducer, approved invariant, minimal patch owner, adjacent verification, typecheck, and protected sidecar evidence. Do not change D2-11 disposition based only on this test or the existing package matrix. Overall CS-002D4-R1 acceptance remains **WITHHELD**.
