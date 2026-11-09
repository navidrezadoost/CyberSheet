# CS-002D4-R1 PKG-17B — Candidate construction

**Base revision:** `88b09634f17f3b39d88a88c5428f76b426459a2b`

**Candidate worktree:** `/tmp/cs002d4-r1-pkg17b.Ljxr4S`

**Candidate status:** Detached, unstaged, uncommitted.

## Construction record

Created a new temporary directory and a detached Git worktree at the exact requested base revision. Existing worktrees were left untouched. The new worktree was clean at creation and had no generated `DependencyGraph.js` or `CellStoreV1.js` files beside the TypeScript sources.

Overlaid exactly two candidate paths from the shared source tree:

1. `packages/core/src/dag/DependencyGraph.ts` — all 26 diff hunks relative to base.
2. `packages/core/__tests__/dependency-graph-mutation-journal.p1-pkg-17b.test.ts` — new direct component test.

The exact hunk ranges and file digests are in the candidate manifest. The source dependency closure was checked by import inspection. Runtime import: `CellStoreV1.ts`. Type-only closure: `types.ts`, `ICellStore.ts`, `ExcelColor.ts`, and `types/entity-types.ts`. Those files exist unchanged at base, so none were overlaid. The test directly instantiates `DependencyGraph` and does not import or construct Workbook or Worksheet.

## Candidate test boundary

The first test starts from a graph containing formula nodes, direct/range dependencies, volatile state, and dirty state. It injects an exception after replacement range-watcher registration, explicitly rolls back the graph journal, and compares the complete detached state to the before-image. The second test commits direct graph mutations and verifies the graph state persists and the journal reports inactive.

These checks characterize the graph journal API. They do not establish automatic rollback integration, Workbook transaction semantics, Worksheet state restoration, or end-to-end formula recalculation behavior.

## Execution boundary

The candidate's focused Jest test passed (1 suite, 2/2 tests), and `npm run typecheck --workspace @cyber-sheet/core` passed. Jest used Node v24.22.0 and the base Core Jest config with `--runInBand`; existing ts-jest deprecation and TS151001 advisories were non-failing. Raw output and status are recorded in the PKG-17E candidate verification files. Candidate `git diff --check` passed.

To use the repository's existing dependency installation without copying dependencies into the detached worktree, a `node_modules` symlink points from the candidate to the main worktree's installation. Git reports this symlink as an additional untracked candidate-worktree path; it is execution infrastructure, not candidate payload. Thus the candidate has exactly two payload files plus the dependency symlink. Dependencies are shared, while candidate source, resolver config, and generated sidecar state are isolated. The candidate directly imports TypeScript source; generated `DependencyGraph.js` / `CellStoreV1.js` siblings are absent. No protected sidecars were copied. The candidate check window verified the main worktree's protected 237-entry sidecar manifest before and after, with matching output.

No production or test file beyond the two candidate paths was copied into the temporary worktree. No file was staged or committed. The temporary worktree was not removed. No existing worktree was pruned or cleaned.

Overall CS-002D4-R1 acceptance remains **WITHHELD**.
