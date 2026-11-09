# CS-002D4-R1 PKG-20R — Candidate qualification

**Integrated disposition: CANDIDATE BLOCKED — CONTRACT DECISION.** D0-06 has no attributable owner decision in the cited records. The exact PKG-19D candidate is also unavailable for fresh verification. PKG-20 is closed as a bounded evidence and blocker assessment; candidate qualification and integration remain open.

## Lane outcomes

| Lane | Outcome | Evidence boundary |
| --- | --- | --- |
| A — D0-06 API decision | Decision-ready request prepared; owner authority and response absent; status remains unresolved | PKG-20A compares the API surfaces from prior evidence. No request was transmitted and no owner approval is claimed. |
| B — Hooks/declarations | Candidate-specific verification blocked by missing artifact | PKG-19A's insufficient-evidence finding remains. No consumer fixture was run in PKG-20. |
| C — Snapshot/queue | Residuals precisely isolated; not executed against candidate | Snapshot restoration-failure seam is not established. Queue's historical compilation failure and missing symbols are classified in PKG-20C; no candidate suite was run. |
| D — Candidate verification | Blocked before candidate test windows | The recorded candidate worktrees are absent/prunable. No D1–D5 candidate run, typecheck, or candidate hash check is claimed. |
| E — Qualification | Not qualified; integration not authorized | D0-06 plus technical evidence gates remain open. |

## Required dispositions

1. **D0-06:** `UNRESOLVED-BLOCKER`; no named/scoped authority or attributable decision is recorded. Option A/B/C was not approved. The prepared A/B/C request is not an owner decision.
2. **C1:** PKG-19D's original unfiltered run previously reported one failed assertion (147 passed, one failed); its filtered run reported one skip. C1 remains unchanged and is not called passed. PKG-20 did not rerun it.
3. **Public/internal hooks:** PKG-20B ran an external consumer fixture against the current shared checkout's package map and existing `dist` artifacts, not the missing candidate. Supported root and named subpath imports resolved; bare package deep imports for Worksheet, DependencyGraph, and test hooks were rejected by `ERR_PACKAGE_PATH_NOT_EXPORTED` / TS2307. The current root declarations expose `@internal` members on exported `Worksheet` and `Workbook` because declarations are not stripped; this establishes declaration visibility, not a usable authority bypass. The current hook setter is absent from the root barrel and package subpaths, and no consumer hook installation or owner-state mutation was demonstrated. Current dist declarations are stale relative to source exports. Candidate-specific exposure remains unverified, and changing declaration policy or exports requires a separate compatibility decision.
4. **Snapshot restore failure:** not tested in PKG-20. PKG-20C records that the prior evidence does not supply a deterministic restore-failure seam and that an internal candidate-only seam would need to test recovery-required health, rejection of later mutation, suppression of uncommitted events, and cleanup without claiming exact restoration.
5. **Queue:** PKG-19D historically reported compile failure before any test executed because of a missing formula error type and four formula hook symbols. PKG-20C classifies them as internal test infrastructure/accepted behavior to reconcile without public exports, but no candidate was available to apply or validate that reconciliation.
6. **EventBus `once` and disposal:** PKG-19C/19D report candidate corrections matching accepted PKG-02F/02E behavior. PKG-20 did not reverify them; retain the reports as historical candidate evidence.
7. **Source changes/hashes:** no candidate source changes were made in PKG-20. PKG-19D's nine-source-file hashes remain historical and cannot be checked against the absent artifact. Shared-tree changes are documentation-only for this checkpoint.
8. **Tests/typecheck:** no PKG-20 candidate tests or candidate typecheck ran. The PKG-19D unfiltered, filtered, queue, and typecheck results remain separately labeled historical results in PKG-20D.
9. **Integrity/worktree:** shared preflight recorded HEAD `88b09634f17f3b39d88a88c5428f76b426459a2b`, 762 starting status entries, 760 file hashes, and two pre-existing deletions. Final comparison matched all 762 original status entries and all 760 captured file hashes; the 14 added paths are PKG-20 evidence files. The protected sidecar check passed 237/237; manifest SHA-256 is `a6b89cdc3ccd8bfc8c054e5fafcb4dc84ed9ba1347eb2597a3e7bef938969b6c`. No production source, test, ledger, frozen register, or historical manifest was edited in PKG-20.
10. **Independent review:** PKG-19A's candidate source review is prior review evidence; PKG-20 did not repeat it because the candidate is absent. PKG-20B's package-map/declaration probes apply only to the checked-out package metadata and existing build artifacts. Candidate qualification criteria are not all satisfied.
11. **Integration:** no integration permission exists. A separate attributable authorization must identify the exact verified candidate hashes, API/versioning requirements, authorized C1 migration if any, internal hooks, test gates, exclusions, and rollback/review procedure.

## Next bounded action

Restore the exact PKG-19D candidate and its complete dependency/source manifest from an immutable artifact without regenerating it from the dirty shared tree. In parallel, leadership must designate the D0-06 decision owner or record a responsible dated deferral. After authority is established and an owner decision is attributable, run the prescribed PKG-20D checks on the recovered artifact and reconcile the B/C residuals. Only then prepare a separate integration authorization for review.

No eighth operation, Pivot lifecycle, comment deletion, Application forwarding, formula grammar change, shared-source integration, staging, commit, merge, release, or baseline recapture was performed or authorized. D0 remains **PROPOSED**; D1–D7 remain **PENDING**. Overall CS-002D4-R1 acceptance remains **WITHHELD**.
