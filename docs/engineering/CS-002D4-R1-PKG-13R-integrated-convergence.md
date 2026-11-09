# CS-002D4-R1 PKG-13R — Integrated convergence

**Starting revision:** `88b09634f17f3b39d88a88c5428f76b426459a2b`
**Starting dirty paths:** 521.
**Ending revision:** unchanged at `88b09634f17f3b39d88a88c5428f76b426459a2b`.
**Ending dirty paths:** 560. Existing dirty work was preserved.
**Overall CS-002D4-R1 acceptance:** **WITHHELD**.

## Converged lane outcomes

| Lane | Evidence added | Result and boundary |
| --- | --- | --- |
| A — merged formula semantics | Tests and source/graph analysis for formula writes through merged members | 3/3 focused tests pass. Formula text, requested event address, anchor storage, and literal graph precedents are characterized. No approved formula-origin/rebasing rule exists; no formula semantics changed. |
| B — transaction side effects | Seven-operation side-effect inventory, rollback matrix, and dual-strategy executable regression | 2/2 focused tests pass under Journal and Snapshot. Injected failure restores captured worksheet snapshots and graph/dirty state and suppresses Worksheet/Workbook publication. This is evidence for the exercised operation sequence and fault cut, not global D2-11 closure. |
| C — Pivot component reliability | Standalone Pivot Error publication regression and component recovery review | 1/1 focused test passes; native named `RangeError` identity and properties survive standalone transform/store/query. Workbook detachment may not preserve non-enumerable Error properties; public DTO contract remains unresolved. |
| D — integration diagnostics | Focused, adjacent, and full Core Jest runs; typecheck and hygiene | Adjacent 22 suites / 302 tests pass. Full run finds 302 suites, 290 passing, 7 failing, 5 skipped; 7,285 tests pass, 18 fail at fixture setup, 173 skipped, 9 todo. Six compile-blocked suites execute zero tests; no executed assertion failures. Core typecheck passes. |
| E — authorization preparation | Consolidated E0–E9 decision register | Preparation only. No authority appointment, owner approval, contract change, or implementation authorization is claimed. |

Detailed records are [Lane A](CS-002D4-R1-PKG-13A-formula-merge-semantics.md), [Lane B](CS-002D4-R1-PKG-13B-executable-results.md), [Lane C](CS-002D4-R1-PKG-13C-pivot-publication-and-recovery.md), [Lane D integration](CS-002D4-R1-PKG-13D-integration-verification.md), [Core delta](CS-002D4-R1-PKG-13D-core-diagnostic-delta.md), and [Lane E decision register](CS-002D4-R1-PKG-13E-implementation-decision-register.md).

## Operation and authority boundary

The PKG-13B regression covers a mixed sequence using the seven already-authorized operation kinds: set value, set formula, clear content, clear formula, set style, set row height, and set column width. It exercises multiple Worksheets, repeated writes, an existing formula-dependent cell, a new sparse cell, one injected partial-apply cut, event suppression, and rollback state under both strategies. It strengthens operation-specific evidence but does not inventory every side effect or every failure cut for every operation. D2-11 therefore remains open globally.

No PKG-13 production behavior, Workbook Pivot lifecycle, public event schema, comment deletion, eighth mutation operation, ledger disposition, frozen register, or acceptance baseline changed. D5-01/D5-05, D3-06, D7-05, Pivot Error DTO, comment-delete semantics, owner authority, and global D2-11 remain as classified in prior decision records. D1–D7 are not promoted by these characterization results. The shared FIFO self-await limitation remains separate.

## Readiness and next bounded action

**Result:** Core and component verification evidence expanded; authorization and contract decisions remain blockers. The current non-green full Core result is attributable in this run to known unsupported Workbook Pivot fixture paths: one setup-failing suite with 18 setup failures and six compile-blocked suites. This does not establish clean-tree regression attribution and is not an acceptance baseline.

Next, route the exact E0 authority designation and E1/E2/E3 Pivot decisions through the approved project leadership/owner channel. Until owners decide and a separate bounded implementation authorization is recorded, retain component-only Pivot scope. Separately, continue operation-by-operation D2-11 evidence only under its authorized review scope; do not infer global closure from this mixed regression. No new production implementation is authorized by PKG-13.

## Final integrity and hygiene

Protected Core sidecar manifest `CS-002D4-R1-PKG-01K-core-sidecar-sha256.txt` has SHA-256 `a6b89cdc3ccd8bfc8c054e5fafcb4dc84ed9ba1347eb2597a3e7bef938969b6c`. All 237 entries passed before and after each Jest run; each saved before/after check output pair was byte-identical. The final post-run check is retained as `CS-002D4-R1-PKG-13D-final-sidecar-check.txt`.

Core typecheck passed; focused-test hygiene found no `.only`/focused markers. PKG-13 documentation whitespace/final-newline scan, final `git diff --check`, and final 237-entry sidecar verification are recorded in `CS-002D4-R1-PKG-13R-hygiene-output.txt` and its referenced raw check outputs. No full Core baseline recapture occurred. All pre-existing worktree modifications were preserved. Overall CS-002D4-R1 acceptance remains **WITHHELD**.
