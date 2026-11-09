# CS-002D4-R1 PKG-19R — Independent review readiness

## Integrated outcome

**CANDIDATE BLOCKED — CONTRACT DECISION REQUIRED.** Independent review found the PKG-18 reconstruction technically coherent on covered paths but not eligible for integration while D0-06 public Workbook mutation API compatibility/versioning remains unresolved. The review also found and corrected two accepted event behavior regressions in the isolated PKG-19D copy. No candidate source was transferred into the shared worktree.

## Evidence summary

- **Base revision:** `88b09634f17f3b39d88a88c5428f76b426459a2b`.
- **Source scope:** nine candidate Core files as inventoried by [the PKG-18B manifest](CS-002D4-R1-PKG-18B-workbook-candidate-manifest.md). Two final candidate hashes differ from PKG-18B due to PKG-19C corrections: `EventBus.ts` `6e95d462949efbbc4de64cf7e0def3c2daa49e7fb9f168189bdbac133efc4b2d`; `workbook.ts` `5c0d08c0631699aff00f733571191bc1c1040e4013b961c22c2de9d36f678cdb`. Other seven hashes are unchanged and listed in PKG-19D.
- **Independent source review:** all nine files reviewed; 17 hunk dispositions. Findings classify the public API/D0-06 as contract-dependent, hooks/declaration exposure as insufficient evidence, the PKG-02F `once` regression as correction required, and covered Journal/Snapshot mechanics/event boundaries as acceptable within their scoped contracts. See [PKG-19A review](CS-002D4-R1-PKG-19A-independent-source-review.md) and its TSV.
- **Transaction/ownership:** PKG-19B's isolated candidate passed a seven-test ownership/fault suite and 10 adjacent suites / 116 tests / one C1 skip. Journal restoration-failure recovery was verified; Snapshot restore-failure injection was not available. See [PKG-19B report](CS-002D4-R1-PKG-19B-transaction-ownership-review.md).
- **Event/disposal:** PKG-19C classified C1 as an obsolete disabled-port expectation for the seven-operation candidate, and C2 as a documented candidate violation. It restored post-disposal `on`/`once` rejection and PKG-02F consumed-before-callback `once` behavior in its isolated copy. Eight suites passed, 56 passed, one C1 assertion skipped. See [PKG-19C report](CS-002D4-R1-PKG-19C-event-disposal-compatibility.md).
- **Candidate verification:** the original unfiltered 16-suite selection ran with **15 suites passed, one failed; 147 passed, one failed**. The failure is C1 and remains visible. With only that test filtered, the expanded 19-suite selection passed **166 tests with one skipped**. Candidate Core typecheck passed. The legacy queue suite separately compile-failed before tests due missing formula error/hook exports. See [PKG-19D verification](CS-002D4-R1-PKG-19D-candidate-verification.md) and [diagnostic comparison](CS-002D4-R1-PKG-19D-diagnostic-comparison.md).
- **Integrity:** protected sidecar manifest SHA-256 remains `a6b89cdc3ccd8bfc8c054e5fafcb4dc84ed9ba1347eb2597a3e7bef938969b6c`, 237/237 passed. PKG-18 preflight's 727 original status entries and 725 file hashes are unchanged; the two remaining entries are pre-existing deletions. `git diff --check` and focused-test hygiene passed. No frozen register, implementation disposition, or acceptance baseline changed.
- **Provenance:** prospective reconstruction only. No exact historical package patch was recovered; the ancestor ownership commit does not attribute later dirty transaction hunks.

## Remaining blockers

1. D0-06 public API compatibility/versioning and owner authority for the candidate's exposed transaction API, health/error types, and identity predicate.
2. Internal test-hook/declaration/deep-import exposure is not sufficiently qualified for integration.
3. C1 keeps the unfiltered original selection red; the legacy test has not been migrated. Its narrower obsolete expectation can only be changed under documented authority from the operation-specific contracts and while preserving its remaining owner-boundary assertions.
4. Snapshot restoration-failure recovery is untested because no supported seam exists; the Journal recovery-required case passes.
5. Legacy queue test compile incompatibility, global D2-11, FIFO self-await, and unrelated formula/Pivot/contract decisions remain open.

## Gate and next action

PKG-19 does **not** qualify this candidate for integration. The next action is an attributable D0-06 owner decision, followed—if approved—by a separate bounded integration authorization. Only after that authorization may the C1 test migration and any shared-worktree change be proposed. Do not copy the candidate into the shared tree, merge, or release on the basis of PKG-19 results.

D0 remains **PROPOSED**; D1–D7 remain **PENDING**; Workbook Pivot lifecycle and comment deletion remain unauthorized; overall CS-002D4-R1 acceptance remains **WITHHELD**.
