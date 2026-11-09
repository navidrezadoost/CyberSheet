# CS-002D4-R1 PKG-17A — Source-hunk provenance reconciliation

**Baseline HEAD:** `88b09634f17f3b39d88a88c5428f76b426459a2b`
**Worktree capture:** 687 changed/untracked paths at the point this reconciliation was prepared; the assigned report files are additive.
**Scope:** Core production source hunks and directly supporting Core TypeScript-first resolver infrastructure only. No production or test code was edited. No Jest or typecheck was run.

## Worktree state and comparison to PKG-16

PKG-16A captured 652 paths at start and reported 678 at its close. The raw starting status still matches all 652 original paths: none are missing and none have a changed porcelain status. At the PKG-17A capture, the repository had 687 dirty paths. The additional paths include PKG-16 documentation/evidence not present in the original capture and concurrent PKG-17C/D/E artifacts; they are not assumed to be Lane A changes. HEAD remains the stated baseline.

Current status summary at capture: 105 modified, 2 deleted, and 580 untracked paths. (The status snapshot includes this lane's already-created hunk manifest; this report and dependency graph are added afterward.) The working tree is shared with other lanes. No status path was cleaned, restored, staged, or otherwise altered by Lane A.

There are 160 dirty `packages/core/` paths in the capture. This includes 27 protected generated source-sidecar paths, which are excluded from source-hunk evidence. The remaining Core tests, benchmarks, raw outputs, and unrelated artifacts are not all part of Lane A's production-hunk denominator. The 27 sidecars are referenced by path and existing protected-manifest digest only; their bytes are not copied into or classified as source changes.

## Reproducible hunk inventory

The manifest `CS-002D4-R1-PKG-17A-source-hunk-manifest.tsv` is generated from `git diff --no-ext-diff --unified=0 88b09634f17f3b39d88a88c5428f76b426459a2b -- <path>` for each tracked in-scope Core production file. Each row contains the HEAD and worktree line ranges, the current hunk context, and SHA-256 over the exact unified-zero hunk header plus changed lines. It also records evidence candidates, dependency edges, and an explicit provenance status.

| Denominator | Count | Treatment |
| --- | ---: | --- |
| Modified tracked Core production source files | 26 | Source-diff hunks enumerated individually. |
| Tracked Core production source hunks | 378 | Every hunk has a stable manifest ID, ranges, and content digest. |
| New Core production source files absent at HEAD | 2 | Whole-file hashes; a Git hunk against HEAD does not exist. |
| Direct Core verification-infrastructure files absent at HEAD | 7 | Whole-file hashes for the opt-in resolver/configuration, fixture/test, and test tsconfig. |
| Protected generated Core source-sidecar references | 27 | Existing hash/path references; excluded from the hunk denominator. |

The manifest has 414 records plus its header (378 tracked source hunks, 2 new-source-file records, 7 infrastructure records, and 27 protected-sidecar references). It records separate SHA-256 values for the exact changed line ranges at HEAD and in the current worktree where those bytes exist, plus a normalized provenance class. Classes are 378 `uncertain` tracked hunks, 9 `probable` new source/infrastructure files with package behavior linkage, and 27 `excluded-protected-artifact` sidecar references. No exact-origin `verified` hunk is claimed; no source hunk was classified unattributed because each has at least a candidate package/test correlation, though those correlations do not prove origin. Manifest SHA-256: `cc25ce75c00b17f9836550198867d3ad720cc099d55642f7e16f6e32721e0c0a`.

### Per-file tracked hunk denominator

| Core production source path | Hunk count |
| --- | ---: |
| `ClipboardService.ts` | 7 |
| `ConditionalFormattingFormulaCompiler.ts` | 2 |
| `DeleteCellsCommand.ts` | 3 |
| `EventBus.ts` | 11 |
| `FormulaController.ts` | 6 |
| `FormulaEngine.ts` | 21 |
| `GetPivotData.ts` | 2 |
| `PasteCommand.ts` | 7 |
| `PivotAnchorIndex.ts` | 3 |
| `PivotCalculatedFields.ts` | 18 |
| `PivotEngine.ts` | 28 |
| `PivotGroupStateStore.ts` | 4 |
| `PivotRecomputeEngine.ts` | 12 |
| `PivotSnapshotStore.ts` | 1 |
| `PivotSnapshotTransformer.ts` | 4 |
| `WorkbookSheetView.ts` | 14 |
| `commands/DataCommands.ts` | 99 |
| `dag/DependencyGraph.ts` | 26 |
| `events.ts` | 1 |
| `experimental/WorkbookCalculationPrototype.ts` | 3 |
| `index.ts` | 2 |
| `sdk/SpreadsheetSDK.ts` | 3 |
| `search/FindService.ts` | 41 |
| `workbook-access-types.ts` | 2 |
| `workbook.ts` | 21 |
| `worksheet.ts` | 37 |
| **Total** | **378** |

## Provenance findings

The repository has no package-specific commits or retained patch snapshots between the baseline and this dirty worktree. Accordingly, **0/378 tracked hunks can be attributed to an exact package commit or isolated package patch** from Git history. The manifest does not invent an author, date, approval, or package origin.

The reports and tests do support useful behavior-level lineage. The manifest associates each hunk's file family with candidate package records and test dependencies, while keeping exact origin explicitly `AMBIGUOUS`. This is a review index, not proof that a whole file or every hunk was introduced by the cited package. The most traceable new-file group is the TypeScript-first Core test resolver: PKG-08A names its config, resolver, fixtures and regression, and PKG-16E records use of that opt-in config. That evidence establishes functional linkage, not a trustworthy historical patch boundary.

Two untracked production-source files are represented only by whole-file hashes, because both are absent from HEAD:

- `packages/core/src/workbookMutationStrategy.ts`: named in PKG-01H/01J strategy evidence; its current file-level content is linked to Journal default selection. Per-function historical ownership is not recoverable from Git.
- `packages/core/src/workbookMutationTestHooks.ts`: named in PKG-01B/01C and PKG-02A/B/C as the internal failure/strategy hook surface. Its current file accumulates several transaction test seams; no retained package patch allows each method to be assigned to one checkpoint.

The large mixed-source clusters are particularly ambiguous:

- `workbook.ts` (21 hunks), `worksheet.ts` (37), `DependencyGraph.ts` (26), `EventBus.ts` (11), and the two new mutation-support files connect transaction, ownership, formula, merge, event, and Pivot behavior. PKG-01–PKG-15 reports name functions and tests across these shared modules, but the worktree diff combines their changes against one old HEAD.
- Pivot components total 72 tracked hunks across eight component files. PKG-08X/AA and later Pivot reports provide behavior and correction evidence; they do not provide a package-isolated patch for each hunk.
- Formula engine/controller/compiler files total 29 hunks. PKG-13A/14A/15A and PKG-16C connect the affected formula compatibility behaviors to tests and decision requirements, but not every hunk to a single implementation wave.
- `commands/DataCommands.ts` alone has 99 hunks. H.81–H.97 and later tests cover distinct callers and operations. The file-level diff is too broad to equate its 99 hunks with one corrected operation or package.
- Public view, search, clipboard and command files have evidence in owner-boundary and command reports, but the caller set crosses Core, React and renderer work. Their shared dependencies prevent safe extraction by path alone.

The manifest's exact digest/range locator makes future review reproducible against the same HEAD and worktree snapshot. It does not recover missing historical authoring provenance. Exact commit/package authorship remains unresolved until an attributable per-package patch, commit, or equivalent source-control artifact is supplied.

## Scope exclusions and integrity boundary

The following were inspected and excluded from the directly supporting Core candidate manifest because their changed hunks do not support Core candidate verification: root `package.json` adds a Playwright `pree2e` script; root `package-lock.json` changes React workspace dependency metadata; React/renderer/Vue/Svelte/Angular/XLSX source and configs; all ordinary Core test changes except the resolver test included in infrastructure; and docs/raw outputs other than this provenance deliverable. These remain dirty and untouched.

The 27 `packages/core/src/` generated files are listed as references from `CS-002D4-R1-PKG-01K-core-sidecar-sha256.txt`, not as source hunks or merge candidates. The protected manifest covers 237 files and has SHA-256 `a6b89cdc3ccd8bfc8c054e5fafcb4dc84ed9ba1347eb2597a3e7bef938969b6c`. Lane A did not itself rehash or modify sidecars; the integrated Lane E focused windows checked 237/237 before and after, with byte-identical check output. See the PKG-17E verification records.

No production/tests were edited; no tests, typecheck, staging, reset, merge, or release occurred in this lane. Overall CS-002D4-R1 acceptance remains **WITHHELD**.
