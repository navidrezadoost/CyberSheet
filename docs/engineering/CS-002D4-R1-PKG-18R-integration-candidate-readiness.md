# CS-002D4-R1 PKG-18R — Integrated candidate readiness

**Disposition: PROSPECTIVE CANDIDATE REVIEWABLE — DEPENDENCIES OPEN**
**Shared-worktree integration: NOT AUTHORIZED / NOT PERFORMED**
**Overall CS-002D4-R1 acceptance: WITHHELD**

## Decision summary

PKG-18 produced a bounded, prospective reconstruction of the seven-operation Workbook transaction path in the detached candidate `/tmp/pkg18b-candidate`, based on `88b09634f17f3b39d88a88c5428f76b426459a2b`. Lane E's Core typecheck and 16-suite serialized selection passed after the candidate-only corrections and the full failure chronology were recorded. This establishes a reviewable candidate, not historical recovery, shared-tree integration, global D2-11 closure, or release readiness.

The next permitted step is independent review of the reconstructed source and the candidate-only fixes against PKG-18A's hunk eligibility map and the approved seven-operation contracts. Any decision to apply it to the shared worktree requires a separate, explicit integration authorization with selected scope and acceptance criteria.

## Lane outcomes

| Lane | Result | Boundary |
| --- | --- | --- |
| A — Provenance and dependency closure | No exact historical package patch was recovered. The ownership base commit `c6569c18137fefc5cf4f6e085eb86e921389232e` attributes only already-committed base ownership code, not dirty transaction hunks. | 116 reviewed hunk records are classified in the A TSV; mixed Workbook/Worksheet hunks require method-sized reconstruction. |
| B — Prospective reconstruction | Nine Core source files reconstructed in a detached worktree from the clean base; final hashes are in the B candidate manifest. | Not a historical patch; no source overlay in the shared worktree. The reconstruction preserves base Pivot implementation and excludes unrelated contract-dependent changes. |
| C — StyleCache rollback risk | Added a focused rollback characterization for two same-canonical-style writes across Worksheets under Journal and Snapshot. | Verifies observable rollback/release behavior in the exercised path; private exact refcounts, release-failure recovery, and disposal clearing remain unverified. |
| D — Dependency gates | Mapped evidence-ready, owner-decision-dependent, and release-dependent gates. | D0 remains PROPOSED; D1–D7 remain PENDING. No contract or implementation decision was made. |
| E — Isolated verification | Candidate typecheck passed; final serialized selection passed 16 suites, 146 tests, with 2 tests skipped by the exact name filter. | Failures and candidate-only fixes are retained in the E record and raw outputs. No full Core run. |

## Candidate and verification evidence

The nine final candidate source hashes are recorded in [the PKG-18B candidate manifest](CS-002D4-R1-PKG-18B-workbook-candidate-manifest.md). They cover the seven-operation port/context, Workbook staging and queue, Worksheet ownership and transaction hooks, DependencyGraph journaling, event publication, strategy selection, and internal test hooks. No eighth mutation operation, Application forwarding, general post-publication sheet creation, or global cross-layer observer-completion ordering was added.

The final bounded Jest result is **16 suites passed; 146 passed, 2 skipped, 148 total**. The two filtered assertions concern the obsolete disabled-mutation-port expectation and post-disposal subscription rejection. They are not counted as passes. PKG-02F reentrancy/`once`, unrelated Pivot integration, and formula grammar/origin tests were outside the candidate selection. Candidate Core typecheck passed. The initial compilation and runtime failures, narrowed failure run, corrections, exact commands, and limitations are documented in [PKG-18E isolated verification](CS-002D4-R1-PKG-18E-isolated-verification.md) and its raw output files.

The initial 29-suite run failed compilation in 22 suites; the retry compiled but failed 20 suites / 119 tests; the narrowed 16-suite run then had six failing suites / 16 tests before targeted candidate-only corrections. Four fault-cut suites were independently rerun at 18/18 after correction. The final 16-suite selection passed. These red/green results are candidate evidence and do not retroactively attribute dirty shared-worktree source.

## Integrity and change boundary

- HEAD remained `88b09634f17f3b39d88a88c5428f76b426459a2b`.
- At PKG-18 preflight, 727 existing status entries were captured: 725 file hashes and two pre-existing deletions. A post-run comparison found **727/727 statuses unchanged** and **725/725 existing file hashes unchanged**; the additive PKG-18 files are separate. The preflight records are `CS-002D4-R1-PKG-18E-preflight-status.txt` and `CS-002D4-R1-PKG-18E-preflight-content-manifest.tsv`.
- The protected Core sidecar manifest remained SHA-256 `a6b89cdc3ccd8bfc8c054e5fafcb4dc84ed9ba1347eb2597a3e7bef938969b6c`; **237/237** hashes passed after candidate tests. Sidecars were not parked, deleted, or rewritten.
- Candidate manifest checks passed **9/9**. Candidate resolver fixture JS hashes also matched their protected main-worktree counterparts.
- Shared-tree `git diff --check`, focused-test hygiene, and the final PKG-18 Markdown whitespace/newline scan passed. No full Core suite was run.
- The candidate used the existing installation through a `node_modules` symlink; source was isolated, dependencies were not independently installed.
- No shared production source or existing test assertion was changed. PKG-18 added the authorized C characterization test and documentation/evidence outputs only. Ledger dispositions, frozen registers, authority records, and acceptance baselines were not changed.

## Open gates and exclusions

This candidate does not close global D2-11. The following remain separate: formula syntax/origin and result compatibility; Workbook-owned Pivot lifecycle and D3-06; Pivot Error representation; comment deletion; D5-01 owner decision and D5-05 Application event authority/schema; D7-05 merged-read provenance; StyleCache private refcount and disposal behavior; and the shared FIFO self-await limitation. The two filtered test expectations remain unresolved/out of scope. Full Core and release acceptance were not established.

No contract is approved by these tests or reports. D0 remains **PROPOSED**, D1–D7 remain **PENDING**, and overall R1 acceptance remains **WITHHELD**.

## Next bounded action

Conduct an independent source-level review of the nine candidate files and Lane E's candidate-only changes, using the A hunk/dependency TSV and the B hash manifest. Resolve whether the narrow reconstructed seams and test hooks are acceptable for a review candidate. If leadership and relevant owners approve proceeding, issue a separate integration authorization naming exact files, contract boundaries, acceptance tests, and exclusions. Until then, do not copy or merge the candidate into the shared worktree.
