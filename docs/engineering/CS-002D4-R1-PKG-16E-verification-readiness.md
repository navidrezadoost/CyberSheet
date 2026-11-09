# CS-002D4-R1 PKG-16E — Verification and candidate reproducibility

**Verification basis:** Current accumulated dirty worktree; this is not a clean-tree or isolated-candidate result.
**Full Core reference:** PKG-15D, unchanged production/test inputs since that full run.
**Acceptance status:** Overall CS-002D4-R1 remains **WITHHELD**.

## Runtime and dependency inventory

Verified runtime: Node `v24.22.0`, npm `11.19.1`, TypeScript `6.0.3`, Jest `30.5.2`, and ts-jest `29.4.15`. The root-declared engine and package manager versions match. `npm ls --workspace @cyber-sheet/core --depth=0` exited 0. Exact output is preserved in `CS-002D4-R1-PKG-16E-runtime-versions.txt` and `...16E-core-dependencies.txt`.

The Core test command uses `packages/core/jest.typescript-first.config.cjs`, `NODE_OPTIONS=--experimental-vm-modules`, and `--runInBand`. No default Jest config or resolver was changed for PKG-16.

## Synchronized bounded verification

The acceptance selection ran serially and passed **22 suites / 294 tests**. It includes:

- All seven operation evidence: row-height and column-width journal suites, seven-operation differential, observer isolation, mixed side-effect matrix, disposal/publication, and multi-Worksheet formula-graph rollback.
- Formula/merge: PKG-12A/13A/14A/15A tests for merged-member integrity, coordinate behavior, parser/evaluator compatibility, and graph origin.
- Standalone Pivot: recompute, invalidation, snapshot store, Error publication, GetPivotData, and PKG-14C validation/retry.
- Event/queue: Workbook event contract, dimension events, Workbook bridge, and mutation queue.
- Resolver compatibility: `core-typescript-first-resolver.p1-pkg-08a.test.ts`.

Reproducible suite list and command: `CS-002D4-R1-PKG-16E-candidate-test-matrix.md` and `CS-002D4-R1-PKG-16E-command.txt`. Raw output: `CS-002D4-R1-PKG-16E-bounded-jest-output.txt`; status: `...16E-bounded-status.txt`.

The protected manifest `CS-002D4-R1-PKG-01K-core-sidecar-sha256.txt` has SHA-256 `a6b89cdc3ccd8bfc8c054e5fafcb4dc84ed9ba1347eb2597a3e7bef938969b6c`. The 237/237 checks passed before and after the bounded Jest run, and output files were byte-identical. A final 237/237 check also passed. No sidecar was parked, removed, or rewritten.

Core typecheck passed; exact output is `CS-002D4-R1-PKG-16E-core-typecheck-output.txt`. PKG-16 made no code or test changes, so the PKG-15D full Core diagnostic remains the current full-run reference: 307 suites, 295 passed, 7 blocked, 5 skipped; 7,338 tests passed, 18 failed during unsupported fixture setup, 173 skipped, 9 todo, no executed assertion failures. PKG-16 did not repeat the full Core run because the inputs relevant to production and tests were unchanged; the bounded selection verified the current candidate-relevant behavior.

## Candidate isolation assessment

No clean or isolated candidate worktree was created. HEAD remains `88b09634f17f3b39d88a88c5428f76b426459a2b`, while 652 path-level changes/untracked files were present at PKG-16 start and source-hunk provenance is incomplete. Copying subsets from this state would risk omitting dependencies or mixing unrelated edits. Therefore the results above are reproducible for the listed test paths in this accumulated worktree only; they do not establish clean-tree behavior or independently composed release candidates.

## Hygiene and limits

The final package hygiene check records `git diff --check`, focused-test scanning, Markdown whitespace/final-newline validation, and the 237-entry sidecar check. Do not infer full Core green, candidate isolation, global D2-11 closure, approval of formula grammar, or Workbook-owned Pivot reachability from the bounded pass. Overall R1 remains **WITHHELD**.
