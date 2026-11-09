# CS-002D4-R1 PKG-18B — Isolated verification status

**Verification state:** Lane E completed the bounded candidate verification; see the chronology and exclusions below.
**Candidate worktree:** `/tmp/pkg18b-candidate`
**Base revision:** `88b09634f17f3b39d88a88c5428f76b426459a2b`.

Lane B assembled source only. Lane E performed candidate-only corrections and ran a bounded, serialized verification; no shared production or test file was changed by Lane E.

## Lane E results

Candidate base: `88b09634f17f3b39d88a88c5428f76b426459a2b`; directory `/tmp/pkg18b-candidate`. Tool versions: Node `v24.22.0`, npm `11.19.1`, Jest `30.5.2`, TypeScript `6.0.3`. The candidate used the repository TypeScript-first Jest config, `NODE_OPTIONS=--experimental-vm-modules`, and serialized `--runInBand` execution. Its `node_modules` was a symlink to the main worktree dependency installation, so source was isolated but dependencies were shared.

Core typecheck command:

```sh
PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PATH npm run typecheck --workspace @cyber-sheet/core
```

Result: exit 0. Raw output is retained in `CS-002D4-R1-PKG-18E-core-typecheck-output.txt`.

The final Jest command used the following 16 suites, serially:

```text
workbook-row-height-journal.p1-pkg-02a.test.ts
workbook-column-width-journal.p1-pkg-02b.test.ts
workbook-seven-operation-differential.p1-pkg-02c.test.ts
workbook-seven-operation-observer-isolation.p1-pkg-08b.test.ts
workbook-transaction-side-effect-matrix.p1-pkg-13b.test.ts
workbook-transaction-disposal-publication.p1-pkg-14b.test.ts
workbook-multisheet-formula-graph-rollback.p1-pkg-15b.test.ts
workbook-owned-escape.test.ts
workbook-event-contract.p1-pkg-02d.test.ts
workbook-dimension-events.p1-pkg-02e.test.ts
workbook-cross-level-compatibility.p1-pkg-02g-c.test.ts
EventBus.workbook-bridge.test.ts
core-typescript-first-resolver.p1-pkg-08a.test.ts
workbook-clear-cell-immediate-fault-cuts.p1-pkg-17c.test.ts
dependency-graph-mutation-journal.p1-pkg-17b.test.ts
workbook-style-cache-cross-sheet-rollback.p1-pkg-18c.test.ts
```

Two tests were excluded by a test-name filter because their expectations are outside this candidate: the legacy expectation that all owner mutation-port calls remain disabled, and the PKG-02E expectation that EventBus `on`/`once` reject subscriptions after disposal. The suite files and assertions were otherwise preserved. PKG-02F reentrancy/`once` tests and unrelated Pivot suites were not run. No full Core run occurred.

Result: 16 suites passed; 146 passed, 2 skipped, 148 total. Raw output is retained in `CS-002D4-R1-PKG-18E-final-jest-output.txt`.

Before the final Jest execution, an intermediate narrowed 16-suite run exposed six failing suites / 16 failing assertions / 132 passing assertions. Three involved missing `after-cell-record` fault-hook wiring, one involved graph-registration hook errors swallowed by the formula extraction catch, and two were the out-of-scope owner/disposal expectations above. Lane E added candidate-only internal test-seam wiring; a separate four-suite rerun then passed 18/18, and the final 16-suite run passed as reported. The earlier 29-suite run first failed 22 suites at ts-jest compilation (missing `DependencyGraphMutationJournal` type) while seven compiled and passed (100 tests). A 29-suite retry after the type import fix executed but failed 20 suites / 119 assertions, with 145 passing; most failures shared the missing candidate capability-map registration for `attachDevImportSheet`, alongside unrelated old assertions and excluded formula/Pivot scope. These failures are not omitted or reclassified as passes. See PKG-18E for detailed sequence.

The 237-entry protected manifest is unchanged at SHA-256 `a6b89cdc3ccd8bfc8c054e5fafcb4dc84ed9ba1347eb2597a3e7bef938969b6c`; its final `sha256sum -c` passed 237/237. The TypeScript-first paired resolver fixtures matched the main source-side JavaScript bytes: `DependencyGraph.js` SHA-256 `8f3d038f84adce92cf80c8c35670ddbd5afd10a9c72ee40e4e2b151e5f014a7c`, `CellStoreV1.js` SHA-256 `34131f5a64eb4d7a44db26672fca04001063f56b8f199da7ec851827dc5b589b`. Candidate `git diff --check` and `node scripts/check-no-focused-tests.mjs` passed. Main-worktree `git diff --check` also passed after documentation integration.

## Boundaries and exclusions

- This is bounded candidate verification, not overall Workbook acceptance, global D2-11 closure, release readiness, or an integrated full-Core baseline.
- Formula grammar/origin, Pivot Workbook lifecycle, and post-disposal subscription policy remain outside the candidate decision scope.
- The two filtered assertions remain unresolved contract expectations; the other assertions in those suites were exercised.
- Candidate-only source corrections are recorded in the updated PKG-18B manifest and PKG-18E report. They are not changes to shared production code and are not authorization to merge or implement broadly.
- Performance qualification and full Core test status are not inferred from this focused run.

**Current disposition:** Prospective candidate passed the authorized bounded typecheck and focused test selection after documented candidate-only corrections. Integration review and remaining PKG-18 gates are separate. Overall CS-002D4-R1 acceptance remains **WITHHELD**.
