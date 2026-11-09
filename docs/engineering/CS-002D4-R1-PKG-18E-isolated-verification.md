# CS-002D4-R1 PKG-18E — Isolated candidate verification

**Candidate:** `/tmp/pkg18b-candidate`
**Base revision:** `88b09634f17f3b39d88a88c5428f76b426459a2b`
**Verification environment:** Node `v24.22.0`, npm `11.19.1`, Jest `30.5.2`, TypeScript `6.0.3`
**Disposition:** Bounded candidate verification passed after documented candidate-only corrections. No shared production/test edits, full Core run, merge, release, or acceptance promotion occurred. Overall CS-002D4-R1 acceptance remains **WITHHELD**.

## Verification chronology and failure classification

The initial 29-suite TypeScript-first Jest run had **22 suite failures and 7 passing suites (100 tests passed)**. The compile-blocked suites reported TS2304 because the candidate's `worksheet.ts` used `DependencyGraphMutationJournal` without importing its type. Other existing test files compiled and executed. Full raw output is `CS-002D4-R1-PKG-18E-first-jest-output.txt`.

The first candidate typecheck also found TS7006 implicit-`any` diagnostics on the seven `mutationPort` callback implementations and the same missing journal type. The candidate was corrected with explicit callback parameter typing and the type import. A 29-suite retry then compiled but failed **20 suites / 119 tests**, with 9 suites and 145 tests passing. The dominant common failure was fixture ownership setup: `attachDevImportSheet()` adopted the worksheet but did not store the mutation capability returned by adoption. This was corrected in the candidate only. Several remaining failures were unrelated/out-of-scope formula or Pivot assertions and stale expectations.

After narrowing the selection and restoring copied test files whose contents had been overwritten in an earlier assembly attempt, the next 16-suite run had **6 failing suites, 16 failed tests, and 132 passing tests**. Three rollback suites did not receive the expected `after-cell-record` test-hook call; the formula graph rollback suite showed injected graph-registration errors being caught by the parser/extraction warning handler; two failures asserted behavior outside this candidate's scope. Lane E then added narrow internal fault-hook wiring and separated dependency extraction from graph mutation so parser errors retain warning-and-continue while graph mutation errors reach Workbook rollback. The two out-of-scope assertions were filtered; no assertions were rewritten or weakened.

The four fault-cut suites were rerun independently after those corrections: **4 suites / 18 tests passed**. The final scoped selection below then passed.

## Final bounded selection

The final command was serialized, used the TypeScript-first resolver config, and ran exactly these 16 suites:

```text
packages/core/__tests__/workbook-row-height-journal.p1-pkg-02a.test.ts
packages/core/__tests__/workbook-column-width-journal.p1-pkg-02b.test.ts
packages/core/__tests__/workbook-seven-operation-differential.p1-pkg-02c.test.ts
packages/core/__tests__/workbook-seven-operation-observer-isolation.p1-pkg-08b.test.ts
packages/core/__tests__/workbook-transaction-side-effect-matrix.p1-pkg-13b.test.ts
packages/core/__tests__/workbook-transaction-disposal-publication.p1-pkg-14b.test.ts
packages/core/__tests__/workbook-multisheet-formula-graph-rollback.p1-pkg-15b.test.ts
packages/core/__tests__/workbook-owned-escape.test.ts
packages/core/__tests__/workbook-event-contract.p1-pkg-02d.test.ts
packages/core/__tests__/workbook-dimension-events.p1-pkg-02e.test.ts
packages/core/__tests__/workbook-cross-level-compatibility.p1-pkg-02g-c.test.ts
packages/core/__tests__/EventBus.workbook-bridge.test.ts
packages/core/__tests__/core-typescript-first-resolver.p1-pkg-08a.test.ts
packages/core/__tests__/workbook-clear-cell-immediate-fault-cuts.p1-pkg-17c.test.ts
packages/core/__tests__/dependency-graph-mutation-journal.p1-pkg-17b.test.ts
packages/core/__tests__/workbook-style-cache-cross-sheet-rollback.p1-pkg-18c.test.ts
```

Exact invocation:

```sh
NODE_OPTIONS=--experimental-vm-modules \
/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin/node \
node_modules/jest/bin/jest.js \
--config packages/core/jest.typescript-first.config.cjs \
--runInBand \
--testNamePattern='^(?!.*(R1 mutation port has stable typed calls that reject before any write|disposal deactivates bridges, rejects new subscriptions, and leaves other Workbooks active)).*' \
packages/core/__tests__/workbook-row-height-journal.p1-pkg-02a.test.ts \
packages/core/__tests__/workbook-column-width-journal.p1-pkg-02b.test.ts \
packages/core/__tests__/workbook-seven-operation-differential.p1-pkg-02c.test.ts \
packages/core/__tests__/workbook-seven-operation-observer-isolation.p1-pkg-08b.test.ts \
packages/core/__tests__/workbook-transaction-side-effect-matrix.p1-pkg-13b.test.ts \
packages/core/__tests__/workbook-transaction-disposal-publication.p1-pkg-14b.test.ts \
packages/core/__tests__/workbook-multisheet-formula-graph-rollback.p1-pkg-15b.test.ts \
packages/core/__tests__/workbook-owned-escape.test.ts \
packages/core/__tests__/workbook-event-contract.p1-pkg-02d.test.ts \
packages/core/__tests__/workbook-dimension-events.p1-pkg-02e.test.ts \
packages/core/__tests__/workbook-cross-level-compatibility.p1-pkg-02g-c.test.ts \
packages/core/__tests__/EventBus.workbook-bridge.test.ts \
packages/core/__tests__/core-typescript-first-resolver.p1-pkg-08a.test.ts \
packages/core/__tests__/workbook-clear-cell-immediate-fault-cuts.p1-pkg-17c.test.ts \
packages/core/__tests__/dependency-graph-mutation-journal.p1-pkg-17b.test.ts \
packages/core/__tests__/workbook-style-cache-cross-sheet-rollback.p1-pkg-18c.test.ts
```

Result: **16 suites passed; 146 passed, 2 skipped, 148 total**. The two skipped tests were the obsolete expectation that Workbook mutation-port calls remain disabled and the separately scoped post-disposal subscription rejection expectation. Their suites ran; only those two tests were excluded. The PKG-02F reentrancy test was not included because its `once` correction is outside this candidate. Unrelated Pivot tests and formula grammar/origin compatibility tests were also excluded. The run did not assert a global cross-layer observer-completion order or enable Application forwarding.

The final output is preserved in `CS-002D4-R1-PKG-18E-final-jest-output.txt`. Typecheck command and exit-0 output are preserved in `CS-002D4-R1-PKG-18E-core-typecheck-output.txt`.

## Candidate-only corrections

These corrections exist only in `/tmp/pkg18b-candidate`; they are not shared-worktree changes or implementation authorization:

- Imported `DependencyGraphMutationJournal` and typed `mutationPort` callbacks to make candidate Core typecheck pass.
- Added the capability-map assignment in `attachDevImportSheet()` required for the reconstructed dev fixture to exercise owner-backed transactions. It does not add general post-publication sheet creation.
- Re-authored EventBus generic payload/handler and subscription types for typed event callbacks, while retaining the clean-base runtime behavior of `once`.
- Wired the internal `after-cell-record` test hook at cell/style record writes and separated formula extraction from graph registration. Parser/extractor errors still warn and continue; graph mutation errors now propagate through the transaction rollback path.
- Added detached internal Worksheet graph/journal diagnostics used by existing focused rollback evidence; these are not exported from the public package barrel.

The PKG-18C StyleCache rollback test was included as a test overlay. No committed assertion was changed. The candidate manifest records final SHA-256 values for all nine prospective source files.

## Integrity and hygiene

- The protected manifest `docs/engineering/CS-002D4-R1-PKG-01K-core-sidecar-sha256.txt` has SHA-256 `a6b89cdc3ccd8bfc8c054e5fafcb4dc84ed9ba1347eb2597a3e7bef938969b6c`. The post-run check passed **237/237** entries; output is preserved in `CS-002D4-R1-PKG-18E-sidecar-verification-output.txt`.
- The candidate TypeScript-first resolver fixture JS hashes match the corresponding main-worktree inputs: `DependencyGraph.js` `8f3d038f84adce92cf80c8c35670ddbd5afd10a9c72ee40e4e2b151e5f014a7c`; `CellStoreV1.js` `34131f5a64eb4d7a44db26672fca04001063f56b8f199da7ec851827dc5b589b`.
- Candidate `git diff --check` passed. `node scripts/check-no-focused-tests.mjs` passed with no focused markers; output is preserved in `CS-002D4-R1-PKG-18E-test-hygiene-output.txt`.
- The main worktree's `git diff --check` passed after report integration. Protected generated sidecars were not parked, rewritten, or removed.
- Candidate dependencies used the existing main-worktree `node_modules` through a symlink. Verification is source-isolated but not dependency-install isolated.
- Jest emitted existing ts-jest `globals` deprecation and TS151001 `esModuleInterop` advisories; they were non-failing.

## Limits

This result establishes only the listed candidate behavior and tests. It does not establish full Core status, historical provenance for every candidate hunk, complete global D2-11 closure, formula compatibility approval, Workbook Pivot lifecycle approval, a cache disposal/refcount contract, the shared FIFO self-await limitation, or R1 release acceptance. No formal decision status changed. Overall CS-002D4-R1 acceptance remains **WITHHELD**.
