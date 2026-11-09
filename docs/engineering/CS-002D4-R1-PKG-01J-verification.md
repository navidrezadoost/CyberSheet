# CS-002D4-R1 PKG-01J — Verification

## Starting state

- Git revision: `88b09634f17f3b39d88a88c5428f76b426459a2b`.
- The starting status query reported 322 dirty paths. The worktree contained broad pre-existing tracked and untracked changes; no reset, clean, checkout, or restoration of user changes was performed.
- PKG-01I records the production strategy default as Incremental Journal, with Snapshot retained as an internal reference. PKG-01J changed no production or test files.
- The protected Core sidecar reference manifest was `/tmp/pkg01i-sidecars-before.json`. It contains 236 recursive Core `.js`/map artifacts. A separate 28-path Core inventory consists of 27 protected generated sidecars plus tracked `packages/core/src/vanilla/ChartBuilder.js` and `packages/core/jest.config.js`.

## Commands and outcomes

The nine generated Core source `.js` sidecars used by Jest were temporarily parked and restored by a shell `EXIT` trap around all Jest runs. Their bytes and paths were compared after restoration.

1. Focused transaction selection:

   ```sh
   NODE_OPTIONS=--experimental-vm-modules npx jest --config packages/core/jest.config.cjs --runInBand \
     packages/core/__tests__/workbook-mutation-queue.p1-pkg-01.test.ts \
     packages/core/__tests__/workbook-owned-escape.test.ts \
     packages/core/src/__tests__/transaction-enforcement.test.ts
   ```

   **Passed:** 3 suites, 95/95 tests. Log: `/tmp/pkg01j-focused.log`.

2. Reported failure set:

   ```sh
   NODE_OPTIONS=--experimental-vm-modules npx jest --config packages/core/jest.config.cjs --runInBand \
     packages/core/__tests__/EventBus.workbook-bridge.test.ts \
     packages/core/__tests__/pivot-invalidation-workbook-bridge.test.ts \
     packages/core/__tests__/pivot-partial-recompute.test.ts \
     packages/core/__tests__/pivot-slicers.test.ts \
     packages/core/__tests__/pivot-partial-sanity.test.ts \
     packages/core/__tests__/workbook-snapshot-integration.test.ts \
     packages/core/__tests__/workbook-pivot-integration.test.ts \
     packages/core/__tests__/merge-api.test.ts \
     packages/core/__tests__/pivot-formula-integration.test.ts
   ```

   **Reproduced:** 9 failed suites, 19 failed tests, 63 passed tests. Seven suites fail at TypeScript diagnostics and execute zero tests; the other two contain 18 pivot fixture-setup exceptions and BT-2. Log: `/tmp/pkg01j-nine.log`.

3. Broad Core selection:

   ```sh
   NODE_OPTIONS=--experimental-vm-modules npx jest --config packages/core/jest.config.cjs --runInBand
   ```

   **Result:** 9 failed suites, 5 skipped, 268 passed (277/282); 19 failed, 173 skipped, 9 todo, 7,141 passed (7,342 tests). Log: `/tmp/pkg01j-core-full.log`. This matches PKG-01I's final diagnostic and is not a baseline recapture.

4. Core typecheck:

   ```sh
   npm run typecheck --workspace @cyber-sheet/core
   ```

   **Passed.** Log: `/tmp/pkg01j-typecheck.log`.

5. Hygiene and sidecar checks:

   ```sh
   git diff --check
   rg -n '\.(only|fit)\s*\(' packages/core/__tests__ packages/core/src/__tests__
   ```

   `git diff --check` passed. Focused-test marker search found no `.only`/`.fit` markers in the three focused transaction files. The Core Jest run emitted the existing non-failing ts-jest `globals` deprecation and TS151001 interoperability advisories.

   The 236 recursive sidecar paths and SHA-256 values matched the PKG-01I reference exactly after test/typecheck execution. The 27 protected generated files matched; the separate 28-path inventory matched. No sidecar contents were changed.

## Attribution and change boundary

The targeted and broad failure results are detailed in the [failure matrix](CS-002D4-R1-PKG-01J-core-failure-matrix.md). The selector-path analysis is in [strategy attribution](CS-002D4-R1-PKG-01J-strategy-attribution.md). No corrections were applied: no cutover regression was reproduced, the old pivot fixtures rely on unsupported lifecycle/internal APIs, and BT-2 conflicts with the current approved independent-object read contract. PKG-01J added only these four documentation files; it changed no production source, tests, implementation dispositions, frozen registers, historical manifests, or acceptance baselines.

The status query immediately after verification, before adding these reports, showed 329 dirty paths; the final count after adding four PKG-01J report files is 333. The initial query showed 322. The seven-path status-count delta is not attributed to PKG-01J because no baseline path-by-path status snapshot was retained; no claim of a clean or unchanged entire worktree is made. The recursive sidecar comparison is exact and all restored sidecar bytes match. Overall CS-002D4-R1 acceptance remains WITHHELD.
