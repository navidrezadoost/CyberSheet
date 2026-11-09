# CS-002D4-R1 Executive Phase 1C — Integrated readiness

**Outcome: CANDIDATE HARDENED — TECHNICAL GAPS REMAIN**
**Candidate-02:** Not qualified; confirmed ownership and Snapshot/StyleCache defects were reproduced.
**Candidate-03:** Created as a separately packaged successor with bounded corrections; not qualified for integration.
**D0-06:** Pending an attributable decision.
**Overall CS-002D4-R1 acceptance:** WITHHELD.

## Candidate identity and preservation

The shared repository HEAD is `88b09634f17f3b39d88a88c5428f76b426459a2b`. Its worktree was already dirty; an integrated-gate snapshot before the two final readiness records were added reported 786 paths in `git status --short`, including unrelated pre-existing work and the Phase 1C reports. No shared production source or test file was changed by this checkpoint.

Candidate-02 remains immutable at SHA-256 `5f9370222130e721b9a4da015d72c165d36ec471a1d43fd0670502f9d3666839`; Candidate-01 remains unchanged at `131c85f120845a6e7e6ad39f94f269d35db49ce5f958bea4c16771b054078f79`. Candidate-03 is a distinct 12-file overlay archive at `/home/navidrezadoost/Documents/Engineering-artifacts/CS-002D4-R1-PKG-21-CANDIDATE-03.tar.gz`, SHA-256 `a2ed4704d77a6eab26cd1ae8871aab54546ec089ee2490b87b3d9e79d70a8e14`. Its payload manifest SHA-256 is `d34639a01872dd0a46e84abd1648b4e0803c5727f8ed966df56c812a9756899d`; all payload hashes passed both in the package and after safe archive extraction.

## Integrated lane results

| Lane | Candidate-02 evidence | Candidate-03 / integrated result | Remaining limit |
| --- | --- | --- | --- |
| A — ownership and EventBus | Reproduced `assertOwnedMutationEntry` shadow bypass. Focused Candidate-02 run had 1 failed / 41 passed. Ordinary EventBus behavior was characterized; `EventBus.test.ts` failed ts-jest compilation with zero tests. | Candidate-03 protects the guard method; focused ownership/recovery selection passed 2 suites / 23 tests. | Legacy EventBus suite remains compile-blocked. No global D5-01 cross-surface completion order is claimed. |
| B — Snapshot recovery and StyleCache | 4/5 style cases passed; canonical cell style release failed and row/column style references leaked. Secondary restore failure left raw Worksheet transaction state active and provisional references retained. | Candidate-03 preserves canonical before-image styles/maps and cleanup runs on restore failure. Covered by the focused 23/23 selection; errors/events/recovery-required behavior remain checked without claiming exact state restoration after secondary failure. | Full Core coverage was not run; StyleCache reference evidence uses spies, not a refcount API. |
| C — queue and context | 8/8 lane-local tests passed for FIFO, async completion, cancellation, context revocation, observer/disposal, and independent Workbooks. Self-await remains pending until callback completion. | No Candidate-03 queue behavior change. | Historical queue suite and formula hook symbols are absent; no public exports were added. Self-await still requires the documented restriction. |
| D — clean build and consumer | Clean `npm ci --ignore-scripts` timed out at 120 seconds; no clean tree. | Reused-dependency ESM bundle, declaration emit, runtime import, and Bundler consumer typecheck passed. | NodeNext external consumer typecheck failed on TS2834 extensionless declaration imports. Clean install/build reproducibility remains unverified. |
| E — D0-06 | No attributable owner or decision response recorded. | Existing PKG-20A request reused; no duplicate request or transmission claimed. | Exact public API signatures, error/Promise semantics, visibility, concurrence, migration policy, and C1 authorization remain pending. |

Detailed evidence and command/environment notes are in the lane reports A through E. No full Core suite was run. No name-based exclusion was used to claim a green candidate.

## Verification and integrity

- Candidate-03 focused selection: **2 suites, 23/23 tests passed**.
- Candidate-03 Core typecheck: passed using the shared dependency tree in an isolated candidate worktree.
- The actual `npm run build --workspace @cyber-sheet/core` passed with reused dependencies. External consumer runtime import passed. Bundler TypeScript consumer passed; NodeNext consumer failed as described above.
- Clean `npm ci --ignore-scripts` in isolated Lane D: timed out after 120 seconds, exit 124. No registry or lockfile changes.
- Protected Core sidecars: **237/237 passed** after verification; manifest SHA-256 remains `a6b89cdc3ccd8bfc8c054e5fafcb4dc84ed9ba1347eb2597a3e7bef938969b6c`.
- Candidate-01/02 archive hashes were rechecked and match their recorded identities. Candidate-03 archive and payload hashes passed.
- `git diff --check`, focused-test hygiene, and PH1C Markdown whitespace/final-newline checks are recorded at the integrated gate.

## Decision and next gate

Candidate-02 cannot be qualified because PH1C reproduced ownership and Snapshot/StyleCache failures. Candidate-03 contains narrow corrections and targeted regressions, but the complete technical gate remains open: clean dependency installation is blocked, NodeNext consumer declarations fail, the legacy EventBus fixture is compile-blocked, and the full Core suite was intentionally not run. The C1 assertion remains unchanged. D0-06 still lacks an attributable owner decision; even a technical qualification would not authorize integration.

The next bounded gate should resolve reproducible package-consumer compatibility for NodeNext and obtain a clean dependency installation/build in an approved environment, while preserving the current candidate archive and recording any additional corrections under a new candidate identity only if a confirmed defect requires source changes. Then obtain the D0-06 owner decision and separately authorize integration. Do not activate public APIs, integrate, merge, release, or promote overall R1 acceptance under Phase 1C.
