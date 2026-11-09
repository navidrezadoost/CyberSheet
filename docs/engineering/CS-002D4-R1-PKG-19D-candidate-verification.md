# CS-002D4-R1 PKG-19D — Candidate verification

**Candidate:** `/tmp/pkg19d-candidate`, isolated copy based on `/tmp/pkg18b-candidate`
**Base revision:** `88b09634f17f3b39d88a88c5428f76b426459a2b`
**Environment:** Node `v24.22.0`, npm `11.19.1`, Jest `30.5.2`, TypeScript `6.0.3`
**Result:** focused verification passes after the PKG-19C compatibility corrections; integration remains blocked by the public API contract decision and residual evidence gaps.

## Candidate composition

The nine source files remain the PKG-18B reconstruction. PKG-19C's independently verified corrections were applied only to this new PKG-19D copy:

- `packages/core/src/EventBus.ts`: restored the accepted PKG-02F consumed-before-callback `once` behavior, including the consumed check for isolated listener snapshots. Final SHA-256: `6e95d462949efbbc4de64cf7e0def3c2daa49e7fb9f168189bdbac133efc4b2d`.
- `packages/core/src/workbook.ts`: rejects `eventBus.on()` and `once()` after disposal using the existing Workbook cancellation error. Final SHA-256: `5c0d08c0631699aff00f733571191bc1c1040e4013b961c22c2de9d36f678cdb`.

The other seven source hashes are unchanged from the PKG-18B candidate manifest: `workbook-access-types.ts` `b25def7cada085fbd1fe412fa0f118803f062ebf06ee080da7d6918af77ae2f9`; `index.ts` `5f281437385d2ecd27394241e8cbb90e308ba2a6f6592390fdf93f66e53c87f7`; `worksheet.ts` `0150d8e2367225864192dee64e0d4eeafd56f12f0fe66e038c0233772bda27fc`; `dag/DependencyGraph.ts` `a5918a4bd224071c7c7d2388e096e2af02fa1a0996570453067ea41d5b612c21`; `events.ts` `4bcc5b34f48b92e285eb31e1acb172540b58fe92eba5d3b72dccbe8ae2257225`; `workbookMutationStrategy.ts` `39c065bec11d7371ec72907ca7fca337f98530ac80b11e50aca7a4aff5949171`; `workbookMutationTestHooks.ts` `186a5894adf019f823d7ab990370c158e9ad6eb372f69d9e30a9a75777d25cd4`.

The two additive focused tests used in the final copy are `workbook-transaction-ownership.p1-pkg-19b.test.ts` (SHA-256 `7afaec65a35cb2f62ca302422bdc7654c08021101577e6a8db204a255cfb8711`) and `workbook-event-disposal-compatibility.p1-pkg-19c.test.ts` (SHA-256 `8d7b361a5d592f3f890258eef18a4c66b6fcffd49ea21ab2155ba6aca20098f5`). Candidate source hashes are also checked in `CS-002D4-R1-PKG-19D-integrity-output.txt`. The PKG-18B manifest remains historical evidence and was not rewritten.

## D1 — Original 16-suite selection, without exclusions

Ran the exact PKG-18E 16-suite selection against this corrected candidate with no `testNamePattern` filter. Result: **1 suite failed, 15 passed; 1 test failed, 147 passed, 148 total**. The sole failure is the old `workbook-owned-escape.test.ts` assertion named `R1 mutation port has stable typed calls that reject before any write`, which expects the now-present `setCellValue` port method to throw `unavailable`. The remaining tests, including the selected disposal/event contract assertions, passed. Raw output: [PKG-19D original unfiltered output](CS-002D4-R1-PKG-19D-original-unfiltered-output.txt).

This is a test/contract compatibility failure, not evidence that a seven-operation call wrote partial state. PKG-02A–G and PKG-16B authorize the seven operation-specific mutation routes; however, PKG-16F keeps D0-06 public API compatibility/versioning unresolved. The old test was not edited. C1 is classified in PKG-19C as obsolete for the bounded seven-operation candidate, while the broader public API decision still blocks integration.

## D2 — Corrected focused and adjacent selection

Ran the PKG-18E 16 suites plus the PKG-19B ownership test, PKG-19C disposal test, and accepted PKG-02F reentrancy suite. The only name filter excludes the single obsolete C1 assertion; it is reported as skipped, not passed. Result: **19 suites passed; 166 passed, 1 skipped, 167 total**. Raw output: [PKG-19D final focused output](CS-002D4-R1-PKG-19D-final-focused-output.txt).

The selection exercises all seven operations, Journal/Snapshot rollback, multi-Worksheet graph rollback, graph registration faults, post-cell-record fault cuts, queue/disposal paths, event compatibility, listener isolation, resolver behavior, cross-Workbook rejection, raw Worksheet guards, StyleCache rollback, C2 post-disposal subscription rejection, and PKG-02F `once` reentrancy. Lane B separately ran a 10-suite adjacent selection (116 passed, 1 skipped) and its ownership suite (7/7 passed); Lane C separately ran eight event/disposal suites (56 passed, 1 skipped). Their reports preserve exact commands/results.

The historical `workbook-mutation-queue.p1-pkg-01.test.ts` was attempted separately and failed TypeScript compilation before executing tests: the candidate lacks `WorksheetFormulaPostCommitError` and four standalone formula-hook exports expected by that old test, causing follow-on implicit-`any` diagnostics. This is classified as compile-time fixture/API incompatibility, not a runtime transaction assertion. The new PKG-19B test directly exercises supported FIFO, cancellation, ownership, rollback, and recovery behavior. Raw compiler output: [PKG-19D queue compatibility output](CS-002D4-R1-PKG-19D-queue-compatibility-output.txt).

## D4/D5 — Typecheck and integrity

`npm run typecheck --workspace @cyber-sheet/core` passed (exit 0); captured in [PKG-19D Core typecheck output](CS-002D4-R1-PKG-19D-core-typecheck-output.txt). The protected sidecar manifest retained SHA-256 `a6b89cdc3ccd8bfc8c054e5fafcb4dc84ed9ba1347eb2597a3e7bef938969b6c`; all 237 entries passed after verification (output in [PKG-19D sidecar check](CS-002D4-R1-PKG-19D-sidecar-verification-output.txt)). The candidate uses the main worktree's installed dependencies through a symlink, so source isolation does not imply dependency-install isolation. No full Core suite ran.

The shared repository remained at HEAD `88b09634f17f3b39d88a88c5428f76b426459a2b`. PKG-18 preflight evidence still shows all 727 original status entries unchanged and all 725 captured file hashes unchanged; the two other entries were pre-existing deletions. Shared production source and prior tests were not modified. The additive PKG-19 reports/raw evidence are separate worktree additions. Main-tree `git diff --check` and focused-test hygiene passed; no frozen register, ledger disposition, or baseline changed.

## Remaining verification limits

- C1 remains a red legacy assertion in the unfiltered selection until a narrowly scoped candidate-test migration is separately documented against the already-authorized seven operation contracts. It must not be represented as a pass.
- D0-06 still requires an attributable owner decision on the public mutation API and compatibility/versioning behavior.
- Snapshot restore-failure recovery was not injected: the candidate has no supported Snapshot restoration-failure seam. The recovery-required fault was directly verified under Journal only.
- The legacy queue suite is compile-blocked as described above. Internal test-hook declaration/subpath exposure and whether every hook belongs in production modules remain insufficiently evidenced by the source review.
- Global D2-11, formula syntax/origin, Workbook Pivot lifecycle, comment deletion, D5-01/D5-05, and other PKG-16F gates remain outside this candidate verification.

No candidate was copied into the shared source tree, no test assertion was changed, and no contract or integration decision was made. Overall CS-002D4-R1 acceptance remains **WITHHELD**.
