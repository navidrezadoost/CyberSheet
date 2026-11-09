# CS-002D4-R1 PKG-21 PH1B — Runtime and artifact reproducibility

## Identity and archive checks

- Candidate archive: `/home/navidrezadoost/Documents/Engineering-artifacts/CS-002D4-R1-PKG-21-CANDIDATE-01.tar.gz`
- Expected and observed SHA-256: `131c85f120845a6e7e6ad39f94f269d35db49ce5f958bea4c16771b054078f79`.
- The archive was extracted into a new dated PH1B location. All 50 payload entries in `SHA256SUMS.txt` verified. The archive contained 66 tar members including directory entries; path checks found no absolute or traversal entries and no symlinks.
- Candidate base is `88b09634f17f3b39d88a88c5428f76b426459a2b`; overlay is seven modified and three added Core files. Archive identity was not altered.
- Runtime selection: Node `v24.22.0`, npm `11.19.1`.

## Dependency and build reproducibility

A fresh isolated Git worktree was created at the exact base revision, then only the archived overlay was copied in. A clean `npm ci --ignore-scripts` did not complete: the configured registry/proxy stalled and the 90-second timeout expired (the observed elapsed time was about 135 seconds). The interrupted install left an incomplete dependency tree; `npm ls --depth=0` exited 1. This is an environmental dependency-isolation blocker, not a source compilation result.

The Core package build was attempted in that worktree and failed with exit 127 because `tsup` was unavailable; no `dist` output was produced. Do not claim clean-install or package-build reproducibility. Earlier Candidate-01 verification reports successful declaration emit and a TypeScript consumer check from the candidate's prior dependency environment. In the fresh PH1B reproduction, direct candidate tests passed 13/13 and Core `tsc --noEmit` passed, but those results do not establish dependency-isolated reproducibility.

## Candidate test and API results

The original unfiltered four-suite compatibility selection ran without silently excluding tests: 3 suites passed, 1 failed; 36 tests passed and 1 failed. The sole failure is the unchanged C1 legacy test expecting synchronous throws from Promise-returning mutation-port methods. It is not reclassified as a product defect or migrated without D0-06 and a bounded test migration authorization.

Declaration observations from the archived verification are compile-time only: the root declaration contains the proposed Workbook transaction/port/context types. The package export map advertises `.`, `./sdk`, `./patch`, and `./snapshot`. Candidate-only helper declarations also appear in broad emitted declarations, although their modules are not root-exported. A supported external-consumer runtime import was not verified because the package build did not produce output. Export policy remains a contract decision.

## Reproduction limits

The protected-sidecar manifest remains the existing 237-entry manifest with SHA-256 `a6b89cdc3ccd8bfc8c054e5fafcb4dc84ed9ba1347eb2597a3e7bef938969b6c`; 237/237 entries passed after the candidate test window in the shared worktree. Candidate-01 archive and payload hashes remain unchanged. The shared repository is dirty; this work did not copy candidate source into it. No clean dependency installation, package build, external runtime import, or full Core suite is claimed.
