# CS-002D4-R1 PKG-21 — Phase 1 candidate verification

**Candidate:** `CS-002D4-R1-PKG-21-CANDIDATE-01`
**Base revision:** `88b09634f17f3b39d88a88c5428f76b426459a2b`
**Candidate worktree:** `/home/navidrezadoost/Documents/Engineering-artifacts/CS-002D4-R1-PKG-21-candidate-v1`
**Archive:** `/home/navidrezadoost/Documents/Engineering-artifacts/CS-002D4-R1-PKG-21-CANDIDATE-01.tar.gz`
**Archive SHA-256:** `131c85f120845a6e7e6ad39f94f269d35db49ce5f958bea4c16771b054078f79`
**Archive inventory:** 51 files; 50 payload entries verified by `SHA256SUMS.txt` (the manifest is excluded from its own checksum set).
**Disposition:** Candidate reconstruction and bounded verification completed. Independent review and Phase 1 qualification are pending. Shared-worktree integration, D0-06 activation, merge, and release are not authorized by this report.

## Provenance and change boundary

This is a new prospective reconstruction from the stated Git base, not a recovered or historically identical PKG-19D artifact. The archive contains a ten-file Core source/test overlay: seven modified files and three additions. It includes the root/package manifests and lockfile, verification outputs, and read-only authorization/contract references. Documentation references copied from the shared worktree are explicitly identified as review inputs; no shared dirty source was used as a code donor.

All executable changes remain in the isolated candidate worktree. The original shared worktree was not used for source/test edits, candidate patching, or test execution. No protected sidecar, frozen register, historical baseline, or shared production file was changed.

## Verification

| Check | Result |
| --- | --- |
| Candidate transaction suite | 1 suite, 13/13 passed |
| Bounded compatibility selection | 4 suites; 36 passed, 1 C1 test intentionally excluded (37 total) |
| Core TypeScript `--noEmit` | Passed |
| Declaration emit | Passed |
| Consumer typecheck against emitted candidate root declarations | Passed |
| Focused-test hygiene | Passed; no focused markers |
| Candidate `git diff --check` | Passed |
| `npm ls --depth=0` | Exit 0 |
| Full Core suite / package build | Not run |

The test selection and raw outputs are included under `verification/` in the archive. Existing Jest deprecation and `esModuleInterop` advisories were non-failing.

The unfiltered legacy `EventBus.test.ts` attempt fails during ts-jest compilation with `TS2551` for mutating `WorkbookSheetView` and `TS2345` where a `WorkbookSheetView` is passed as `Worksheet`; zero tests execute. This is a fixture/API compile blocker, not an EventBus runtime failure. The existing C1 assertion remains unchanged and was omitted from the passing compatibility run pending a complete D0-06 contract and bounded migration decision.

The queue-specific test path referenced during planning is absent from this base; its probe ran zero tests. FIFO self-await behavior was not verified in this package and remains a review item. A clean `npm ci --ignore-scripts` did not finish because the configured registry proxy remained connection-pending; the installed tree was sufficient for bounded tests and returned success from `npm ls --depth=0`. No clean dependency-install proof is claimed.

## API/export audit

The emitted candidate root declaration exposes `Workbook.transact`, `Workbook.mutationPort`, and `WorkbookTransactionContext`; a separate TypeScript consumer check against that declaration passed. This confirms the candidate proposal’s compile-time surface only. D0-06 still lacks exact approved signatures/versioning/migration and the candidate is not activated in the shared package.

Candidate-only strategy and test-hook declarations are emitted by the broad declaration pass, and Worksheet capability helper declarations appear in `worksheet.d.ts`; none is re-exported from the root `src/index.ts`. The package export map advertises only `.`, `./sdk`, `./patch`, and `./snapshot`. The declaration appearance is recorded for independent review before any integration or package publication; no package build or consumer-runtime check was run.

## Integrity and authorization status

The protected manifest `CS-002D4-R1-PKG-01K-core-sidecar-sha256.txt` has SHA-256 `a6b89cdc3ccd8bfc8c054e5fafcb4dc84ed9ba1347eb2597a3e7bef938969b6c`. Its 237 entries passed after the candidate test runs. The sidecars were not parked or edited in the original worktree.

The supplied executive resolution is recorded as a self-declared Product Owner/CTO authorization. Identity, organizational authority, signature/attestation, named D0-06 decision holder, required Worksheet concurrence, and approved durable decision channel have not been independently verified in the repository record. Therefore exact D0-06 contract status remains pending. C1 migration, integration, and release gates remain separate.

Overall CS-002D4-R1 acceptance remains **WITHHELD**.

## Next gate

Obtain independent review of the exact archived candidate and its declaration/export observations, including queue/self-await behavior and residual rollback limits. Separately establish the attributable D0-06 decision record. Only after that contract is complete should the unchanged C1 test be migrated under bounded authorization. Shared-worktree integration still requires its own exact-file/hash review and explicit authorization.
