# CS-002D4-R1 PKG-20D — Candidate verification

**Disposition: BLOCKED — exact candidate unavailable.** This report records the preflight and the verification that could be performed without reconstructing the candidate. It does not claim PKG-20 candidate tests, typecheck, or source-hash verification.

## Preflight

- Shared repository HEAD: `88b09634f17f3b39d88a88c5428f76b426459a2b`.
- Shared worktree at PKG-20 start: 762 status entries; 760 file-content hashes and two pre-existing deletions were captured in `CS-002D4-R1-PKG-20D-preflight-status.txt` and `CS-002D4-R1-PKG-20D-preflight-content-manifest.tsv`.
- Runtime available in this worktree: Node `v26.10.0`, npm `12.2.0`. The directive's candidate environment (Node 24.22.x/npm 11.19.x) was not available here.
- Protected Core sidecar manifest: `CS-002D4-R1-PKG-01K-core-sidecar-sha256.txt`, manifest SHA-256 `a6b89cdc3ccd8bfc8c054e5fafcb4dc84ed9ba1347eb2597a3e7bef938969b6c`.
- Candidate paths `/tmp/pkg18b-candidate`, `/tmp/pkg19d-candidate`, `/tmp/pkg20-candidate`, `/tmp/pkg20b-candidate`, and `/tmp/pkg20c-candidate` were absent. `git worktree list --porcelain` marks the recorded PKG-18B worktree prunable, with its gitdir pointing to a missing location. See `CS-002D4-R1-PKG-20D-candidate-availability.txt`.

The instruction not to reconstruct the candidate was followed. The shared dirty tree was not used as a candidate substitute. No candidate files were changed, and the following requested windows were therefore not run: D1 unfiltered 16-suite selection; D2 event/disposal; D3 Snapshot/queue; D4 wider integration; D5 candidate typecheck, candidate hashes, and candidate-specific hygiene.

## Historical results retained as historical evidence

PKG-19D previously reported D1 as 15 suites passed / 1 failed, with 147 passed tests and the single legacy C1 mutation-port rejection assertion failing. Its corrected focused run reported 19 suites with 166 passed and one C1 skip. Candidate typecheck was reported passing. The legacy queue suite was reported compilation-blocked (one suite, zero tests executed). These are prior PKG-19D results, not PKG-20 reruns or verification of a candidate artifact available in this checkpoint. PKG-19D's two corrected source hashes and seven inherited PKG-18B hashes remain historical manifest entries only; they cannot be rechecked against absent files.

## Integrity and preservation

The protected sidecar check was run read-only in the shared worktree: `sha256sum -c docs/engineering/CS-002D4-R1-PKG-01K-core-sidecar-sha256.txt` reported 237/237 entries `OK`. The PKG-20 reports are additive documentation. The recorded shared preflight content manifest is the comparison baseline; this checkpoint did not run tests or typecheck that could alter generated artifacts. No production source, test, ledger disposition, frozen register, or historical manifest was edited for PKG-20.

`git diff --check` and a scoped Markdown whitespace/final-newline scan are recorded at PKG-20R. Overall CS-002D4-R1 acceptance remains **WITHHELD**.
