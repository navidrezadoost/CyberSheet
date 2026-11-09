# CS-002D4-R1 PKG-17E — Verification and source-preservation readiness

## Baseline and preserved worktree

- HEAD remained `88b09634f17f3b39d88a88c5428f76b426459a2b`.
- Initial intake recorded 679 dirty paths while parallel lane files were being prepared. The authoritative pre-Jest capture, after lane artifacts were present and before the focused shared run, recorded 695 status paths (693 present and 2 deleted/unavailable).
- That pretest comparison found all 652 PKG-16A original paths present with unchanged status. See `CS-002D4-R1-PKG-17E-pretest-status.txt`, `...pretest-content-manifest.tsv`, and `...pretest-integrity.txt`. The current worktree includes additive PKG-17 reports/raw outputs; the original dirty content was not cleaned, reset, staged, or overwritten.
- Test commands used Node v24.22.0/npm 11.19.1 from the installed nvm runtime; the shell default recorded during initial intake was Node v26.10.0/npm 12.2.0. TypeScript 6.0.3, Jest 30.5.2, and ts-jest 29.4.15 were used.

## Candidate and integrated focused verification

The isolated candidate's direct graph journal test passed 1 suite / 2 tests and candidate Core typecheck passed. The corrected shared Core selection passed 24 suites / 308 tests. Its first attempt passed 23 suites / 304 tests and failed four assertions in the new PKG-17C test because the test incorrectly expected public reads of merged members to be undefined. Those expectations were corrected to match the existing anchor-alias read behavior; the corrected run passed. Both raw results are preserved; no product failure was reproduced by that first test-authoring error.

The 24-suite selection covered the seven-operation Journal/Snapshot and event suites, formula/merge regressions, standalone Pivot/recovery suites, and the new PKG-17B/17C tests. It also ran `core-typescript-first-resolver.p1-pkg-08a.test.ts`; the isolated DependencyGraph candidate itself does not depend on the opt-in resolver, so no resolver files were added to that candidate. This is a bounded focused selection, not the full Core suite and not a recaptured acceptance baseline. Exact invocations and raw outputs are in `CS-002D4-R1-PKG-17E-focused-jest-output.txt` (first attempt), `...corrected-focused-jest-output.txt`, plus the candidate result files.

Core typecheck in the shared worktree passed (`npm run typecheck --workspace @cyber-sheet/core`, exit 0). `node scripts/check-no-focused-tests.mjs` reported no focused markers. `git diff --check` passed. The final Markdown whitespace/final-newline scan covers PKG-17 Markdown documents and is recorded in `...PKG-17E-markdown-hygiene-output.txt`.

## Protected sidecars

Protected manifest: `CS-002D4-R1-PKG-01K-core-sidecar-sha256.txt`
Manifest SHA-256: `a6b89cdc3ccd8bfc8c054e5fafcb4dc84ed9ba1347eb2597a3e7bef938969b6c`
Expected and verified files: 237.

The shared Jest windows checked the manifest before and after and their check outputs matched byte-for-byte. Candidate Jest also had a before/after 237/237 match. No protected sidecar was changed. PKG-17 did not run the full Core suite and did not modify historical manifests, ledger dispositions, or frozen registers.

The Lane A manifest contains 414 records, including 378 tracked source hunks. An independent integrity pass recomputed and matched both HEAD and worktree changed-range hashes for all 378 hunks, and matched whole-file hashes for the 9 new source/infrastructure files. The updated manifest SHA-256 is `cc25ce75c00b17f9836550198867d3ad720cc099d55642f7e16f6e32721e0c0a`; raw verification is `CS-002D4-R1-PKG-17E-hunk-manifest-integrity.txt`.

## Limits

The 378 tracked Core source hunks remain historically unattributed to exact package commits/patches (0/378 exact origin recovered). Behavioral evidence and test mappings do not substitute for missing source-control provenance. The isolated graph candidate verifies a component API only, not Workbook integration. StyleCache private refcount equivalence remains unverified; C2 adds bounded immediate clear-operation rollback evidence only. Formula and Pivot owner/contract blockers remain pending. The current Full Core reference remains PKG-15D: 307 suites, 295 passed, 7 failed, 5 skipped; 7,338 tests passed, 18 Pivot fixture/setup failures, and no executed assertion failures. PKG-17 did not rerun the full suite or refresh that diagnostic.

Overall CS-002D4-R1 acceptance remains **WITHHELD**.
