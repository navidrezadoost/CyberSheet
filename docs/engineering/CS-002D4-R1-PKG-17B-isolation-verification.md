# CS-002D4-R1 PKG-17B — Isolation verification

**Candidate base:** `88b09634f17f3b39d88a88c5428f76b426459a2b`

**Detached worktree:** `/tmp/cs002d4-r1-pkg17b.Ljxr4S`

**Verification mode:** Structural checks plus isolated candidate Jest and typecheck.

## Results

| Check | Result |
| --- | --- |
| Candidate HEAD | `88b09634f17f3b39d88a88c5428f76b426459a2b` |
| Candidate worktree entries | 3: `DependencyGraph.ts` modified; focused test untracked; shared `node_modules` symlink untracked |
| Production files changed | One: `packages/core/src/dag/DependencyGraph.ts` |
| Test files changed | One: `packages/core/__tests__/dependency-graph-mutation-journal.p1-pkg-17b.test.ts` |
| Dependency source overlays | None; direct runtime/type closure remains at base |
| Generated `DependencyGraph.js` / `CellStoreV1.js` siblings | Absent in candidate worktree |
| Core Jest resolver/config overlays | None; base config preserved |
| Protected generated sidecars copied | None |
| Candidate staging/commit | None |
| Candidate focused Jest | 1 suite / 2 tests passed; output in PKG-17E candidate results |
| Candidate Core typecheck | Passed; output in PKG-17E candidate results |
| Candidate dependency link | `node_modules` symlink to main worktree installation; reported as untracked execution infrastructure, excluded from the two-file candidate payload |
| Protected sidecars | None copied; main worktree manifest 237/237 before and after candidate Jest, matching output |
| `git diff --check` | Passed for the tracked source diff; untracked test was separately checked for trailing whitespace and final newline |

The exact production hunk denominator is 26, all included. The new focused test contains two cases and is a whole-file addition. No workbook/worksheet integration hunks were carried into the candidate.

## Verification limits

These results establish isolated component journal behavior and candidate Core typecheck under the shared installed dependencies. They do not establish automatic Workbook transaction rollback, Worksheet state restoration, or end-to-end formula recalculation. The main worktree's generated sidecars are not copied; the candidate uses the pristine base tree where the two relevant generated siblings are absent. Candidate verification does not resolve the ambiguous historical provenance of the 26 source hunks.

Overall CS-002D4-R1 acceptance remains **WITHHELD**.
