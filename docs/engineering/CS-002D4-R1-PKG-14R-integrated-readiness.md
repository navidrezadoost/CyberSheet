# CS-002D4-R1 PKG-14R — Integrated readiness

**Outcome:** **SUPPORTED CORE RELIABILITY IMPROVED — GOVERNANCE GATES REMAIN**
**Starting revision:** `88b09634f17f3b39d88a88c5428f76b426459a2b`; HEAD remains unchanged.
**Starting dirty paths:** 560. Existing work was preserved; no staging, cleanup, reset, or commit was performed.
**Ending dirty paths:** 606 (46 PKG-14 paths: three focused test files and 43 documentation/raw-evidence files).
**Production transaction operation set:** seven, unchanged.
**Default rollback strategy:** Incremental Journal. Snapshot remained an independent verification strategy.
**Workbook-owned Pivot lifecycle:** unauthorized. **Workbook-owned comment deletion:** unauthorized.
**Overall CS-002D4-R1 acceptance:** **WITHHELD**.

## Lane results

| Lane | Result | Readiness boundary |
| --- | --- | --- |
| A — Formula/Merge | Five focused cases passed. Literal dependency extraction, formula evaluation, replacement/clear, requested-address events, and Journal/Snapshot rollback are distinguished. Plain `=E5+1` evaluates; dollar-marked mixed/absolute A1 spellings keep the literal graph edge but currently evaluate to `#NAME?`. | The normative merged-member reference origin and supported dollar-token formula result are not specified by the reviewed contract. No parser rewrite or formula rebasing was made. Cross-sheet graph support is not claimed. |
| B — D2-11 | Thirty new cases passed: every one of the seven operations under Journal and Snapshot with a pre-first-apply cut and an after-one-operation cut, plus two actual post-commit observer-disposal cases. Existing operation evidence and additional fault cuts are mapped in the closure and residual registers. | This materially strengthens bounded per-operation evidence. It does not cover every mutation family, every formula graph subphase, private StyleCache counters, or external side effects; global D2-11 remains unresolved. |
| C — Pivot components | One new recompute/validation/retry case passed. A mismatched builder snapshot ID preserves last-good snapshot identity and dirty state; a later valid retry replaces it and cleans the registry. Existing recovery/Error cases were reused rather than duplicated. | Standalone component reliability only. No Workbook-owned Pivot route, generation contract, disposal race, or public Error DTO was added or inferred. |
| D — Core verification | Focused: 3 suites / 36 tests passed. Adjacent: 25 suites / 338 tests passed. Full Core: 305 suites discovered, 293 passed, 7 failed, 5 skipped; 7,321 passed tests, 18 failed, 173 skipped, 9 todo. Core typecheck passed. | Full Core is not green. One Pivot formula suite has 18 fixture-setup failures because post-publication `addSheet()` is guarded; six Pivot suites fail ts-jest compilation and execute zero tests. No resolver failures or executed assertion failures. |
| E — Release readiness | Decision register records exact closure criteria and implementation blockers without repeating owner searches or changing approval states. | Owner designation/channel, D2-11 global completeness, Pivot lifecycle/D3-06/Error DTO, comment deletion, D5-01/D5-05, and D7-05 remain unresolved or unauthorized as recorded. |

Details: [Lane A formula contract](CS-002D4-R1-PKG-14A-formula-coordinate-contract.md), [Lane A regression matrix](CS-002D4-R1-PKG-14A-regression-matrix.md), [Lane B operation matrix](CS-002D4-R1-PKG-14B-operation-closure-matrix.md), [Lane B fault cuts](CS-002D4-R1-PKG-14B-fault-cut-evidence.md), [Lane B residual register](CS-002D4-R1-PKG-14B-D2-11-residual-register.md), [Lane C recovery](CS-002D4-R1-PKG-14C-pivot-recovery-evidence.md), [Lane C Error boundary](CS-002D4-R1-PKG-14C-snapshot-error-boundary.md), [Lane D verification](CS-002D4-R1-PKG-14D-core-verification.md), [Lane D diagnostic delta](CS-002D4-R1-PKG-14D-diagnostic-delta.md), and [Lane E release register](CS-002D4-R1-PKG-14E-release-readiness-register.md).

## Required distinctions

### Supported Core behavior and D2-11

The PKG-14B matrix supports bounded statements for the seven existing Workbook mutation operations. It observes exact state restoration for its tested cut points, Worksheet event suppression on pre-commit failures, healthy status after successful rollback, and post-commit notification suppression when a listener disposes the Workbook. A rollback-failure path can still require recovery, as earlier PKG-02 evidence records. The finite PKG-14 matrix is not proof of all side effects or all operation/failure permutations. Structural mutations, comments, drawings, conditional formatting, Pivot owner invalidation, host persistence, history, and renderer paint remain outside this seven-operation closure. Global D2-11 is **UNRESOLVED**.

### Formula and merge contracts

The merged coordinate has distinct requested, storage, and dependency/evaluation concerns. Current Worksheet code stores at the merge anchor, reports the requested member address in the event, and registers literal extracted A1 graph coordinates. FormulaEngine evaluates plain `E5` references but returns `#NAME?` for the tested `$`-marked forms; this shows a source-level evaluator/graph support difference, not an approved formula-origin rule. D7-05 public provenance DTO remains unresolved. No formula syntax was rebased or rewritten. D6 cross-sheet parser/XLSX identity remains unverified; the local graph's exclusion of qualified references is not a claim of cross-sheet support.

### Pivot reliability and integration reachability

The standalone recompute, store, transformer, and query components have stronger retry evidence, including the new invalid-snapshot-ID case. They do not establish Workbook-owned create/register/build/read lifecycle. In the full Core run, the legacy Pivot formula suite fails during fixture setup at guarded post-publication `Workbook.addSheet()`; six more Pivot integration suites are compile-blocked on unavailable Workbook registry/snapshot/invalidation APIs or mutable-Worksheet assumptions. Those suites remain visible and were not excluded. D3-06 stale formula behavior and the detached/public Error DTO remain separate contract decisions.

### Comment operation, events, and release

Workbook-owned comment deletion is not implemented or authorized; its API, cascade/orphan, duplicate-ID, no-op/event, merged-address, and exact rollback rules remain open under PKG-07. D5-01 Option C remains a proposal pending owner decision. D5-05 Application event authority/schema is unresolved, and no Application forwarding was added. The seven existing operations do not imply authorization for an eighth operation. Full Core is still non-green, and R1 release acceptance remains withheld.

## Diagnostic comparison

Compared with PKG-13 (302 suites / 7,485 tests; 290 passed suites, 7 failed, 5 skipped; 7,285 passed tests, 18 failed), PKG-14 discovered three additional suites and 36 additional tests. All 36 new tests passed. The seven failing suite identities and 18 setup/compile failures are unchanged. This is an expanded current-worktree diagnostic, not a clean-tree regression attribution or a new acceptance baseline.

## Next bounded action

The next technical decision with the clearest evidence is formula compatibility for the three `$`-marked A1 spellings and the origin rule when entered through a merged member. Obtain the scoped formula/API decision on whether these forms are supported and how they evaluate; only then authorize a parser correction if the approved rule requires one. Preserve the current red/green characterization and do not silently rebase. Separately, project leadership must establish the already identified Workbook/API, Worksheet/API, and D5 decision channels before owner-dependent Pivot, comment, or event implementation can proceed. No new production implementation is authorized by PKG-14.

## Integrity

Core, adjacent, and focused test windows were serialized. All 237 entries in the protected sidecar manifest passed before and after every Jest window; each paired check output compared byte-identically. Manifest SHA-256 is `a6b89cdc3ccd8bfc8c054e5fafcb4dc84ed9ba1347eb2597a3e7bef938969b6c`. Core typecheck passed; focused-test hygiene found no focused markers. PKG-14 final `git diff --check`, Markdown check, and post-run sidecar verification are recorded in the PKG-14R hygiene artifacts.

No production source, Workbook API, event schema, mutation operation count, ledger disposition, frozen register, or historical baseline was changed. Existing dirty worktree content was preserved. Overall CS-002D4-R1 acceptance remains **WITHHELD**.
