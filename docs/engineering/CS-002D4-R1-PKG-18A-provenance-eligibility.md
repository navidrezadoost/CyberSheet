# CS-002D4-R1 PKG-18A — Provenance eligibility and dependency boundary

**Audit baseline:** `88b09634f17f3b39d88a88c5428f76b426459a2b`
**Audit HEAD:** `88b09634f17f3b39d88a88c5428f76b426459a2b`
**Scope:** Read-only review of Git objects, the PKG-17A source-hunk manifest, current source imports/call paths, and the approved transaction contract/evidence. No source or test files were changed and no tests were run in this lane.
**Disposition:** Current dirty Workbook transaction code has no recovered package-level historical patch boundary. A prospective candidate is reviewable only as a newly reconstructed, hunk-scoped unit. The whole dirty `workbook.ts` or `worksheet.ts` must not be copied as a proxy for that unit.

## Finding

The PKG-17A manifest remains the source-hunk locator for this review. It has 378 tracked Core production hunks across 26 files, plus two new Core production source files and seven TypeScript-first verification-infrastructure files. The manifest SHA-256 is `cc25ce75c00b17f9836550198867d3ad720cc099d55642f7e16f6e32721e0c0a`. It records no exact-origin verified hunk. Lane A verified that finding against available Git commits/refs and patch-artifact locations; it did not rewrite or reclassify that historical manifest.

There is relevant attributable **base** history: commit `c6569c18137fefc5cf4f6e085eb86e921389232e` (`feat: integrate workbook ownership boundaries`) is an ancestor of the audit HEAD and changed `workbook.ts`, `worksheet.ts`, `WorkbookSheetView.ts`, and `dag/DependencyGraph.ts`. That commit establishes historical provenance for the committed ownership-boundary code already present at HEAD. It does **not** attribute any current dirty hunk measured against HEAD, and it is not a PKG-18 transaction-package patch. In particular, it cannot be used as retroactive authorship or approval evidence for the 378 later worktree hunks.

The full object ID is `c6569c18137fefc5cf4f6e085eb86e921389232e`. Its file-level stat is reproducible with `git show --stat c6569c1 -- packages/core/src/workbook.ts packages/core/src/worksheet.ts packages/core/src/WorkbookSheetView.ts packages/core/src/dag/DependencyGraph.ts`.

## Reproducible Git/artifact audit

Commands were run from the repository root. `HEAD` remained the baseline hash above.

| Command / scope | Result and interpretation |
| --- | --- |
| `git log --all --oneline --decorate -40` | Shows HEAD at `88b0963`; includes the ancestor ownership integration `c6569c1`, but no PKG-01–PKG-17 source-package commit after the baseline. The visible PKG-02C and Pivot-impact commits are documentation commits. |
| `git reflog --all --date=iso` | Reviewed available local branch/worktree reflogs. No post-baseline transaction package commit or attributable patch creation event was found. Reflogs show ordinary worktree creation and the already reachable commits. |
| `git fsck --full --no-reflogs --unreachable` and commit-object filter | Three unreachable commits were present: an index/WIP pair based on `a82923a` and a dependency-update commit. None is a PKG transaction source patch. No other unreachable commit was reported by the filtered output. This is a local object-store observation, not a claim about objects unavailable to this clone. |
| `find docs -type f \( -name '*.patch' -o -name '*.diff' \) -print` | Exit 0, no paths printed. No retained engineering patch/diff file was found under `docs`. |
| PKG-17A manifest review | 0/378 source hunks are attributed to an exact package commit or isolated package patch. Its per-hunk IDs, ranges, and hashes are retained as the reproducible current-diff index. |
| `git status --short` count at Lane A read-only capture | 718 dirty paths in the shared worktree. Other PKG-18 lanes were active; this count is contextual only and does not assign authorship or change ownership. |

Searches for patch files were deliberately limited to engineering docs; this was not a whole-filesystem search. Commit/ref inspection is limited to Git data available in this repository clone. Reports and red/green tests provide behavioral lineage and source-path evidence, not the actual historical source patch for a dirty hunk.

## Seven-operation source dependency boundary

The minimal logical candidate is the existing seven-operation Workbook mutation port and transaction context: `setCellValue`, `setCellFormula`, `clearCellContent`, `clearCellFormula`, `setCellStyle`, `setRowHeight`, and `setColumnWidth`. It must preserve the default Incremental Journal, the independently selectable Snapshot differential path, Worksheet ownership capability checks, formula graph state, style/dimension state, commit-only publication, and queue health/disposal behavior. These boundaries are supported by the operation contracts and PKG-02 through PKG-17 evidence, but global D2-11 remains unresolved.

The 96 tracked transaction/owner/event core hunks identified in PKG-17A are in:

| Source family | Dirty hunk count | Minimal-candidate role | Lane A classification |
| --- | ---: | --- | --- |
| `packages/core/src/workbook.ts` | 21 | Public port/context, staging, FIFO admission, application, rollback, publication, and disposal | Mixed class hunks are **dependency-ambiguous**; selected transaction methods are prospectively reviewable after selective reconstruction. Pivot and dev-import hunks are excluded/contract-dependent. |
| `packages/core/src/worksheet.ts` | 37 | Owner capability, before-images, seven mutation bodies, graph integration, event buffering, style/dimension state | Operation-specific hunks are **prospectively reviewable** with the listed contract limits. Large class, adoption, formula, and lifecycle hunks are **dependency-ambiguous** or **contract-dependent**. |
| `packages/core/src/dag/DependencyGraph.ts` | 26 | Journal before-images for formula nodes, edges, range watchers, volatile membership, and dirty state | **Prospectively reviewable** against D2-01/08 for rollback behavior; PKG-17B only verifies the direct graph component, not Workbook integration. |
| `packages/core/src/EventBus.ts` | 11 | Post-commit Workbook event surface and listener isolation | Selected dispatch behavior is **prospectively reviewable** against D5-01/02/03/04. Dimension event schema hunks are contract-dependent; no Application bridge or global cross-surface completion order is included. |
| `packages/core/src/events.ts` | 1 | Worksheet observer/event dispatch used by buffering and publication | **Prospectively reviewable** only for the transaction event surface and D5-02/03 behavior. |
| **Total** | **96** | Cross-file transaction unit | Not one independently attributable patch; selective reconstruction is required. |

The associated new production files in the PKG-17A manifest are `workbookMutationStrategy.ts` (default Journal plus Snapshot test selection) and `workbookMutationTestHooks.ts` (internal fault/strategy seams). The selector is a prospective production dependency. Hooks are test infrastructure and must be narrowed to the needed tests; they are not a public API or a reason to expose cache/refcount state. `workbook-access-types.ts` hunk `CORE-0320` carries the seven-operation public interface and transaction context. The two `index.ts` hunks mix transaction-context export with a separate Worksheet formula post-commit error export; a candidate may retain only the needed type export after a precise split. The 14 dirty `WorkbookSheetView.ts` hunks change getter privacy/read behavior and are not required to add the transaction route: the issued view identity/resolver contract is already present in the HEAD base. These API and boundary records are individually listed in the TSV.

### Required unchanged source dependencies

The following current modules are in the direct/transitive source boundary but are not dirty transaction hunks in the PKG-17A candidate set. Lane B should record their exact candidate hashes and only overlay them if a demonstrated compile/runtime dependency requires a changed version:

- `packages/core/src/StyleCache.ts`: canonical style interning/release used by Workbook and Worksheet style transactions. PKG-17C and PKG-16B leave private exact refcount correctness unverified (D2-11 residual R03); no cache internals should be exposed to close that gap.
- Worksheet storage and ownership dependencies: `storage/ColumnarCellStore.ts`, `storage/ICellStore.ts`, `storage/MergeStore.ts`, `storage/VisibilityStore.ts`, `MergeStore`/merge address helpers, and Worksheet's owner capability helpers.
- Formula graph integration: `utils/formula-reference-extractor.ts`, `FormulaEngine.ts`, and `RecalcCoordinator`/graph implementation. Transaction review may assert restoration of captured graph state; it must not select `$` formula grammar, merged-reference origin, or broader formula result semantics (PKG-16C remains the decision record).
- Event path: `eventBridge.ts`, `EventBus.ts`, Worksheet `Emitter`, and workbook commit buffer. D5-01/02/03 are approved; D5-04 is delegated engineering resolution; D5-05 Application-level authority and stable names/payloads remain unresolved. No Application forwarding is in this candidate.
- Serialization helpers used to copy/restore supported state, including `types.ts`, `persistence/SnapshotCodec.ts` types, and detached-value helpers. Binary persistence expansion is not part of this transaction candidate.

`workbook.ts` imports and owns Pivot services in the current worktree. Those imports do not make Pivot behavior a required seven-operation dependency. The transaction candidate must retain the base Pivot behavior needed to compile, without importing the current dirty Pivot lifecycle changes. Workbook-owned Pivot lifecycle, comment deletion, other mutation families, external host persistence, history, and renderer effects are excluded.

## Hunk-level eligibility and limits

`CS-002D4-R1-PKG-18A-core-dependency-closure.tsv` records each reviewed manifest ID, exact path, HEAD/worktree ranges, hunk digest and content hashes, historical status, candidate classification, and inclusion/exclusion rationale. It includes the transaction core plus adjacent public-view/barrel records needed to mark explicit boundaries. The classification means:

- **Historically attributable:** only the committed ownership base at `c6569c1` (recorded in the report, not as attribution for a dirty candidate hunk).
- **Prospectively reviewable:** source behavior can be independently reviewed against current approved seven-operation/D2/D5 boundaries, subject to the exact limitations in the row.
- **Contract-dependent:** a dirty hunk touches an unsettled operation/event/formula contract; it cannot be imported as accepted behavior until isolated from the unrelated transaction logic.
- **Dependency-ambiguous:** a hunk spans multiple behaviors or source owners and cannot be safely assigned to the seven-operation unit by its diff locator alone; reconstruct a smaller implementation boundary rather than copying the file/hunk wholesale.
- **Excluded:** no requirement for the minimal supported transaction unit, or would widen its API/operation scope.

The transaction methods in `workbook.ts` depend on Worksheet-owned write methods and capabilities, graph journaling, StyleCache interning, staging/application, event buffering, and queue health. The Worksheet mutation body hunks, in turn, rely on a graph that can record first-touch before-images for every mutation that transaction rollback may encounter. This is a cross-file closure, not five separable source packages. The broad class hunks in `workbook.ts`/`worksheet.ts` and the whole new hook file are explicit reconstruction risks. Lane B can still attempt prospective reconstruction by re-authoring a minimal integration unit from a clean detached base, but it must record every copied/recreated source section and test edge. It cannot call that a recovery of historical authorship.

## Contract and evidence gates

- D2-01 and D2-02 through D2-07 are owner-approved. D2-08/09/10 are delegated technical resolutions. D2-11 is an unresolved global inventory blocker; PKG-16B establishes seven-operation evidence with enumerated gaps, not global D2-11 closure.
- The selected candidate may be prospectively verified for the seven authorized operations. It must not add a mutation operation or imply complete side-effect inventory.
- Formula syntax/origin decisions (PKG-16C), Workbook Pivot lifecycle (PKG-11C/16D), comment deletion (PKG-07C/16F), D3-06, Pivot Error DTO, D5-05, and D7-05 remain separate gates. Their source hunks cannot be silently bundled into the transaction candidate.
- Test hooks stay internal. A test seam is evidence infrastructure, not production authorization.
- Candidate verification in a detached worktree can establish source isolation; it does not itself establish integration/merge/release authority.

## Lane A result and handoff

**Historical route:** insufficient for current dirty source hunks. No package patch or exact commit was recovered. The committed `c6569c1` ancestry is useful only to attribute the original owner-boundary base.

**Prospective route:** reviewable for a narrow seven-operation integration candidate if Lane B reconstructs the identified transaction path without whole-file overlays and Lane E independently executes the required public Workbook tests. The broad mixed Workbook/Worksheet hunks, EventBus dimension schema, and formula semantic hunks are explicit boundaries; unresolved portions must be excluded or cause the candidate to remain blocked.

**Precise blocker:** the current `workbook.ts` diff hunk `CORE-0335` (and adjacent class declaration hunks) contains transaction staging/application together with other Workbook lifecycle/Pivot code. `worksheet.ts` class/method hunks `CORE-0348/0349/0350/0355/0378/0379/0380` similarly cross ownership, formula, merge, storage, and lifecycle behavior. A minimal candidate cannot be formed by applying those manifest hunks as indivisible changes. Lane B must reconstruct smaller source sections from the current implementation and record them as prospective, or return **SOURCE ATTRIBUTION OR RECONSTRUCTION BLOCKED** with the exact missing seam/dependency.

No ledger disposition, frozen register, contract status, source code, test, staging state, merge state, or release state was changed in Lane A. Overall CS-002D4-R1 acceptance remains **WITHHELD**.
