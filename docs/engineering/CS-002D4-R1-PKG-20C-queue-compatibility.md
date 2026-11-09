# CS-002D4-R1 PKG-20C — Legacy mutation-queue compatibility

**Date:** 2026-11-03

**Disposition:** **CANDIDATE COMPATIBILITY GAP CLASSIFIED — UNFILTERED RERUN BLOCKED**

**Candidate:** PKG-19D isolated candidate was required; its directory was unavailable at this checkpoint.

**Shared-tree source/tests:** unchanged by this lane.

## Scope and result

The assigned isolated copy `/tmp/pkg20c-candidate` could not be created from `/tmp/pkg19d-candidate`: neither that source candidate nor `/tmp/pkg18b-candidate` was available. The coordinator instructed this lane not to reconstruct the candidate or use the dirty shared source as a substitute. The historical queue-suite compilation output remains the only execution evidence; PKG-20C did not rerun Jest or typecheck.

The retained PKG-19D compiler output is [PKG-19D queue compatibility output](CS-002D4-R1-PKG-19D-queue-compatibility-output.txt). It reports one suite compile failure and zero executed tests. Diagnostics name five missing exports and two follow-on TS7006 implicit-`any` diagnostics. The test itself is unchanged and begins with imports from both the package root and the internal Worksheet source module.

## Missing-symbol disposition

| Missing symbol | Historical import | Classification from accepted records | Candidate treatment |
| --- | --- | --- | --- |
| `WorksheetFormulaPostCommitError` | `../src` root barrel | Accepted standalone formula post-commit error behavior, distinguished from Workbook rollback, is recorded in PKG-01H and PKG-01F. This is an existing public Core error type required by the accepted behavior, not a new queue API. | Restore the existing root type/value export and implementation in the candidate, preserving its committed flag, address, phase, original error, and established behavior. Do not invent a replacement error or expose a new API. |
| `setStandaloneFormulaExtractionTestHook` | `../src/worksheet` | PKG-01E's accepted warning-only formula extraction compatibility and its deterministic characterization seam. Test infrastructure only; not a user-facing formula capability. | Retain the candidate's existing internal, per-Worksheet test seam or restore the accepted equivalent; do not add a package-root export. |
| `setStandaloneFormulaGraphFailureTestHook` | `../src/worksheet` | PKG-01E formula graph registration rollback characterization and PKG-17 graph failure evidence; internal fault injection, not formula grammar. | Retain/restore only as internal test support; no package-root export or public fault API. |
| `setStandaloneFormulaRestorationTestHook` | `../src/worksheet` | PKG-01E distinguishable standalone formula restoration-error characterization. The report limits the claim: this does not prove every low-level graph rollback failure is repairable. | Retain/restore only as internal test support; preserve the limited restoration claim. |
| `setStandaloneFormulaRegistrationTestHook` | `../src/worksheet` | PKG-01E formula registration-failure atomicity and retry characterization. Internal fault injection, not a new formula contract. | Retain/restore only as internal test support; no public export. |

These are not an obsolete test fixture or a request for new formula behavior. The missing error class is part of accepted existing behavior. The four hooks are internal test seams supporting accepted PKG-01E tests; their use from a source-level test import does not authorize exposing them from the package root or a supported subpath. Their declaration/runtime reachability still must satisfy Lane B's package-boundary disposition. The remaining TS7006 diagnostics at queue-test lines 1032 and 1069 are downstream of the absent typed graph-hook export; no test annotation change is needed if the accepted hook type is restored.

## Queue and formula boundary

The PKG-19 reports already characterize candidate FIFO ordering, queued cancellation, active disposal, transaction-context revocation, Journal rollback, clean Snapshot rollback, and event suppression through other focused tests. The PKG-19B report says its ownership/queue-focused tests cover these behaviors; PKG-19D's legacy queue attempt was compile-blocked, not a runtime failure. Shared direct/indirect FIFO self-await remains a separately documented limitation and must not be changed or conflated with this compile gap.

PKG-20C could not establish whether the exact PKG-19D candidate can compile and execute the historical queue suite after these accepted compatibility exports are restored. It also could not freshly verify the queue suite's formula error and fault-hook assertions. The next candidate run must be unfiltered, retain the test file unchanged, and report any subsequent runtime failures as findings. No candidate symbols should be routed through the package root except the already accepted `WorksheetFormulaPostCommitError` export.

## Required next action

Recover the exact PKG-19D candidate, reconcile the five accepted symbols above without changing public API beyond the already accepted error export, and run `workbook-mutation-queue.p1-pkg-01.test.ts` unfiltered with raw compiler/Jest output. If candidate recovery is impossible, report the queue suite as blocked; do not rebuild a substitute candidate from the shared dirty tree.

No source/test change or fresh test result is claimed by PKG-20C. No production behavior, queue semantics, operation set, formula grammar, public API beyond existing accepted behavior, ledger, frozen register, or baseline was changed. Overall CS-002D4-R1 acceptance remains **WITHHELD**.
