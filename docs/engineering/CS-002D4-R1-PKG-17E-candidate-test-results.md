# CS-002D4-R1 PKG-17E — Candidate test results

**Candidate:** PKG-17B isolated `DependencyGraph` mutation-journal component
**Base:** `88b09634f17f3b39d88a88c5428f76b426459a2b`
**Worktree:** `/tmp/cs002d4-r1-pkg17b.Ljxr4S`
**Runtime:** Node v24.22.0, npm 11.19.1, TypeScript 6.0.3, Jest 30.5.2, ts-jest 29.4.15.

## Candidate contents and limits

The candidate payload consists of the current `packages/core/src/dag/DependencyGraph.ts` and new `packages/core/__tests__/dependency-graph-mutation-journal.p1-pkg-17b.test.ts`, based on HEAD `88b09634f17f3b39d88a88c5428f76b426459a2b`. Their SHA-256 values are `a5918a4bd224071c7c7d2388e096e2af02fa1a0996570453067ea41d5b612c21` and `f8c2a99f6d60dd93bde9cc10e5346b86694d87e6c8616305f05a0f90834a4b08`. An untracked `node_modules` symlink points to the shared main-worktree install and is execution infrastructure, not candidate payload. The candidate is detached, unstaged, and uncommitted.

The tests cover explicit graph journal rollback after the injected range-watcher-registration failure and committed graph journal changes. They do not establish Workbook transaction integration, automatic rollback orchestration, Worksheet restoration, or formula recalculation correctness.

## Verification

| Check | Command / result |
| --- | --- |
| Focused Jest | `NODE_OPTIONS=--experimental-vm-modules node node_modules/jest/bin/jest.js --config packages/core/jest.config.cjs --runInBand packages/core/__tests__/dependency-graph-mutation-journal.p1-pkg-17b.test.ts`; 1 suite passed, 2/2 tests passed. Existing ts-jest `globals` deprecation and TS151001 advisories were non-failing. |
| Core typecheck | `npm run typecheck --workspace @cyber-sheet/core`; exit 0. |
| Resolver infrastructure | Not a candidate dependency: direct `.ts` imports ran under the unchanged base Core Jest config and pristine candidate source tree. The opt-in TypeScript-first resolver regression passed in the shared 24-suite selection. |
| Candidate diff hygiene | `git diff --check`; passed. |
| Protected sidecars | No sidecars were copied to the candidate. Main-worktree protected manifest passed 237/237 before and after candidate Jest; recorded check output matched byte-for-byte. |

Raw candidate Jest, typecheck, and sidecar outputs are `CS-002D4-R1-PKG-17E-candidate-jest-output.txt`, `CS-002D4-R1-PKG-17E-candidate-jest-status.txt`, `CS-002D4-R1-PKG-17E-candidate-typecheck-output.txt`, and `CS-002D4-R1-PKG-17E-candidate-final-sidecars-before.txt` / `...after.txt` (237 entries each; output comparison passed). An earlier candidate sidecar window is also retained.

**Disposition:** This is one independently constructed and verified component candidate. It is not an integrated Workbook transaction candidate and does not resolve the provenance gap for the 26 included DependencyGraph source hunks. No production change was applied to the shared main worktree by PKG-17. Overall CS-002D4-R1 acceptance remains **WITHHELD**.
