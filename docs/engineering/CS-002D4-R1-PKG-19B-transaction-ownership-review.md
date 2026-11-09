# CS-002D4-R1 PKG-19B — Transaction and ownership review

**Review scope:** PKG-19 Lane B; isolated candidate only. **Candidate base:** `88b09634f17f3b39d88a88c5428f76b426459a2b`. **Candidate under test:** `/tmp/pkg19b-candidate`, copied from `/tmp/pkg18b-candidate`.
**Disposition:** No supported-contract defect reproduced in this lane. Candidate source was not modified.

## Findings

The candidate's public mutation port and transaction context expose the same seven operations: `setCellValue`, `setCellFormula`, `clearCellContent`, `clearCellFormula`, `setCellStyle`, `setRowHeight`, and `setColumnWidth`. Direct calls through the mutation port committed each operation against a Workbook-issued view. The test also confirmed that a retained raw Worksheet setter remains guarded after `attachDevImportSheet` adoption.

Workbook identity is checked when a target view is staged. A cross-Workbook view rejects both through `transact` and the mutation port. When a valid write is staged before the foreign view, callback rejection leaves both Workbooks' cell, dimension, and dependency-graph observations unchanged.

Staging is not visible while an asynchronous transaction callback is suspended. An independent mutation-port request waits behind the active transaction, and observed events reflect the two commits in FIFO order. Disposal cancels active and queued operations and revokes a transaction context that resumes after cancellation.

Journal and Snapshot rollback both restored exact cell/snapshot and formula-graph state after injected faults at `after-cell-record`, `after-predecessor-removal`, and `after-dependency-registration`; failed batches emitted no Worksheet events and left mutation health `healthy`. Existing PKG-15B evidence additionally exercises failure during graph registration on a second Worksheet and verifies rollback of the earlier Worksheet. The candidate-only graph correction allowed graph-registration failures to propagate to Workbook rollback rather than being treated as formula extraction warnings in these cases.

Journal restoration failure was directly injected at `during-column-width-restore`. The transaction returned `WorkbookMutationRollbackError` retaining the operation and restoration errors, set the Workbook to `recovery-required`, and caused later mutation to reject with `WorkbookRecoveryRequiredError`. This restoration-failure seam was verified for **Journal only**. Snapshot restoration has no supported restoration-failure injection seam in the candidate; this lane does not claim an equivalent Snapshot fault test.

## Verification

Environment: Node `v24.22.0`, npm `11.19.1`, Jest `30.5.2`, TypeScript `6.0.3`; candidate used the TypeScript-first Core Jest config, `NODE_OPTIONS=--experimental-vm-modules`, and `--runInBand`. Dependencies were shared through the candidate's `node_modules` symlink; source and candidate tests were isolated from the main worktree.

The candidate-specific test command was:

```sh
PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PATH NODE_OPTIONS=--experimental-vm-modules \
  node node_modules/jest/bin/jest.js --config packages/core/jest.typescript-first.config.cjs \
  --runInBand packages/core/__tests__/workbook-transaction-ownership.p1-pkg-19b.test.ts
```

Result: **1 suite, 7 tests passed**. The test file SHA-256 is `7afaec65a35cb2f62ca302422bdc7654c08021101577e6a8db204a255cfb8711` in `/tmp/pkg19b-candidate`. Its raw Jest output is [PKG-19B ownership Jest output](CS-002D4-R1-PKG-19B-ownership-jest-output.txt), SHA-256 `8b70f65617f2f322133ecaf881bd4e750ff6c2e1fd46642e0180317885dfcfb4`.

The adjacent serialized selection ran row/column journals, seven-operation differential verification, transaction disposal/publication, cross-Worksheet graph rollback, immediate cell-record fault cuts, graph-journal behavior, StyleCache rollback, non-conflicting owner-boundary tests, and the PKG-19B test. Its only test-name exclusion was the historical assertion `R1 mutation port has stable typed calls`, whose expectation is that mutation-port methods remain unavailable. That assertion conflicts with the candidate's seven-operation port behavior; this lane did not rewrite it or decide its contract disposition.

```sh
PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PATH NODE_OPTIONS=--experimental-vm-modules \
  node node_modules/jest/bin/jest.js --config packages/core/jest.typescript-first.config.cjs \
  --runInBand --testNamePattern='^(?!.*R1 mutation port has stable typed calls).*' \
  packages/core/__tests__/workbook-row-height-journal.p1-pkg-02a.test.ts \
  packages/core/__tests__/workbook-column-width-journal.p1-pkg-02b.test.ts \
  packages/core/__tests__/workbook-seven-operation-differential.p1-pkg-02c.test.ts \
  packages/core/__tests__/workbook-transaction-disposal-publication.p1-pkg-14b.test.ts \
  packages/core/__tests__/workbook-multisheet-formula-graph-rollback.p1-pkg-15b.test.ts \
  packages/core/__tests__/workbook-clear-cell-immediate-fault-cuts.p1-pkg-17c.test.ts \
  packages/core/__tests__/dependency-graph-mutation-journal.p1-pkg-17b.test.ts \
  packages/core/__tests__/workbook-style-cache-cross-sheet-rollback.p1-pkg-18c.test.ts \
  packages/core/__tests__/workbook-owned-escape.test.ts \
  packages/core/__tests__/workbook-transaction-ownership.p1-pkg-19b.test.ts
```

Result: **10 suites passed, 116 tests passed, 1 skipped, 117 total**. The one skip is the explicitly named legacy mutation-port-disabled assertion; it is not counted as a pass. Raw output: [PKG-19B adjacent Jest output](CS-002D4-R1-PKG-19B-adjacent-jest-output.txt), SHA-256 `e449bf3374a79b2fb56b7037d204da40de8e2164d9b2b3b08b9803eb43d2ac22`.

An initial diagnostic selection also attempted `workbook-mutation-queue.p1-pkg-01.test.ts`. It was compile-blocked because that historical test imports `WorksheetFormulaPostCommitError` and four `setStandaloneFormula*TestHook` exports absent from this candidate, with consequent implicit-`any` diagnostics. This is a source/test compatibility gap, not an executed transaction assertion. No production or historical test was changed to mask it. The required queue behavior was exercised through the PKG-19B test and the compatible disposal/publication tests instead.

## Candidate and repository integrity

All nine candidate source files still match the final PKG-18B manifest; PKG-19B changed no candidate production source. The hashes below were checked in `/tmp/pkg19b-candidate` against [the PKG-18B candidate manifest](CS-002D4-R1-PKG-18B-workbook-candidate-manifest.md):

| Candidate source | SHA-256 |
| --- | --- |
| `packages/core/src/workbook-access-types.ts` | `b25def7cada085fbd1fe412fa0f118803f062ebf06ee080da7d6918af77ae2f9` |
| `packages/core/src/index.ts` | `5f281437385d2ecd27394241e8cbb90e308ba2a6f6592390fdf93f66e53c87f7` |
| `packages/core/src/workbook.ts` | `9fce0a1a56a4037469fccafab5862d8fc51edd48fddb684016c5d6ab2ddee2db` |
| `packages/core/src/worksheet.ts` | `0150d8e2367225864192dee64e0d4eeafd56f12f0fe66e038c0233772bda27fc` |
| `packages/core/src/dag/DependencyGraph.ts` | `a5918a4bd224071c7c7d2388e096e2af02fa1a0996570453067ea41d5b612c21` |
| `packages/core/src/events.ts` | `4bcc5b34f48b92e285eb31e1acb172540b58fe92eba5d3b72dccbe8ae2257225` |
| `packages/core/src/EventBus.ts` | `2c1e73897b067f1169946784211fc45dd6570081803fe439fd297b1a4dc73bb7` |
| `packages/core/src/workbookMutationStrategy.ts` | `39c065bec11d7371ec72907ca7fca337f98530ac80b11e50aca7a4aff5949171` |
| `packages/core/src/workbookMutationTestHooks.ts` | `186a5894adf019f823d7ab990370c158e9ad6eb372f69d9e30a9a75777d25cd4` |

The isolated candidate lacks the full protected sidecar inventory, so `sha256sum -c` could not be run from that directory. After the candidate-only test runs, the protected check was run from the original worktree against `docs/engineering/CS-002D4-R1-PKG-01K-core-sidecar-sha256.txt`: **237/237 passed**; manifest SHA-256 remains `a6b89cdc3ccd8bfc8c054e5fafcb4dc84ed9ba1347eb2597a3e7bef938969b6c`. Raw command output SHA-256: `a4374e59790f227bba349c82f605762c2d15eeae35e22f0e6b9c015052d34d73` (temporary log `/tmp/pkg19b-main-sidecar-check.log`). Candidate `git diff --check` and `node scripts/check-no-focused-tests.mjs` passed.

PKG-19B adds one test file and report/output evidence only. No test assertion outside the new PKG-19B file changed. The source candidate remains prospective, and the PKG-18B nine-file manifest remains valid.

## Limits and handoff

This lane did not run a Core typecheck or full Core suite; candidate Core typecheck and broader unfiltered verification belong to Lane D. It does not decide whether the legacy mutation-port-disabled assertion should migrate, does not validate Snapshot restore-failure behavior without a supported injection seam, and does not close global D2-11. Formula syntax/origin, Pivot lifecycle, comments, Application events, and other excluded contract domains remain unchanged.

Lane B found no reproducible supported-contract defect requiring candidate correction. Candidate-only transaction and ownership behavior is reviewable on the tested boundaries, subject to Lane A/C/D/E findings and separate integration authorization. Overall CS-002D4-R1 acceptance remains **WITHHELD**.
