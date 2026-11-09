# CS-002D4-R1 PKG-17B — Candidate manifest

**Candidate:** DependencyGraph mutation-journal component only

**Base:** `88b09634f17f3b39d88a88c5428f76b426459a2b`

**Detached worktree:** `/tmp/cs002d4-r1-pkg17b.Ljxr4S`

**Construction status:** Unstaged, uncommitted candidate; focused test and Core typecheck passed in the candidate worktree.

## Included candidate files

| Path | Candidate treatment | Base comparison | SHA-256 |
| --- | --- | --- | --- |
| `packages/core/src/dag/DependencyGraph.ts` | Overlay current worktree source; all 26 source hunks included | 158 insertions, 2 deletions; hunk ranges below | `a5918a4bd224071c7c7d2388e096e2af02fa1a0996570453067ea41d5b612c21` |
| `packages/core/__tests__/dependency-graph-mutation-journal.p1-pkg-17b.test.ts` | New direct component test; 2 tests, no Workbook/Worksheet construction | New file, absent at base | `f8c2a99f6d60dd93bde9cc10e5346b86694d87e6c8616305f05a0f90834a4b08` |

The `DependencyGraph.ts` unified-zero hunk locators against the base are:

```text
@@ -322,0 +323,15 @@
@@ -362,0 +378,81 @@
@@ -388,0 +485 @@
@@ -393,0 +491 @@
@@ -397,0 +496,3 @@
@@ -402 +502,0 @@
@@ -430,0 +531 @@
@@ -434,0 +536 @@
@@ -436,0 +539 @@
@@ -438,0 +542,4 @@
@@ -451,0 +559 @@
@@ -454,0 +563,4 @@
@@ -461,0 +574 @@
@@ -468,0 +582 @@
@@ -471,0 +586 @@
@@ -473,0 +589 @@
@@ -482,0 +599 @@
@@ -484,0 +602 @@
@@ -521,0 +640 @@
@@ -527,0 +647 @@
@@ -539,0 +660 @@
@@ -547,0 +669 @@
@@ -552,0 +675 @@
@@ -703,0 +827 @@
@@ -709 +833,4 @@
@@ -887,0 +1015,29 @@
```

## Unchanged source dependencies

These files are required by the import/type closure but remain byte-identical to the base and are not overlaid:

| Path | Dependency role | SHA-256 in candidate |
| --- | --- | --- |
| `packages/core/src/storage/CellStoreV1.ts` | Runtime `packKey`, `unpackKey`, and `COL_MULT` imports | `d61e81c6583217bb38088fef8483f97ca8f1eef01a0001febedbb40cb0b3b3c6` |
| `packages/core/src/storage/ICellStore.ts` | Type imported by CellStoreV1 | `1b82f1e48f86d786c845b0a8a24ce6e29c9072411ead4bf4c98654cbe7184e79` |
| `packages/core/src/types.ts` | Type-only graph and CellStore imports | `bb6803578ff6594b4d53a2911483ea65e67b75d214566f7c7a3529f46369aca8` |
| `packages/core/src/ExcelColor.ts` | Type-only dependency of `types.ts` | `cc4e85bda80096b4ecc9127d1711c0ed8a2a68d8a75c4d19b1391afdaf473483` |
| `packages/core/src/types/entity-types.ts` | Type-only dependency of `types.ts` | `9dbfcb396f69215e812c8c763c3c9aa51d03b59c459ff733c4af74961d413b6e` |

## Explicit exclusions

| Excluded surface | Reason |
| --- | --- |
| `packages/core/src/workbook.ts`, `worksheet.ts`, and Workbook transaction code | The candidate tests the graph component's explicit journal only. Adding these would change the subject to Workbook integration and widen the dependency closure. |
| Other modified Core production files and tests | No direct import or assertion dependency is required for the two focused graph journal cases. |
| Resolver/configuration/fixture infrastructure | A fresh base worktree has no generated `DependencyGraph.js` or `CellStoreV1.js` sibling at the tested paths. The candidate therefore uses the unchanged base Core Jest configuration; no sidecar workaround is included. The opt-in TypeScript-first resolver is not a candidate dependency and was not copied into this worktree. The dedicated resolver regression ran in the shared 24-suite selection. |
| Protected generated Core sidecars | None are copied or overlaid. The candidate worktree has no generated JavaScript sibling for either `DependencyGraph.ts` or `CellStoreV1.ts`; sidecars remain governed by the protected manifest in the main worktree. |
| `node_modules`, caches, logs, and build outputs | No dependencies were copied. An untracked `node_modules` symlink supplies the main worktree's installed packages for execution; this is infrastructure outside the two-file candidate payload. |

No candidate file was staged or committed. Overall CS-002D4-R1 acceptance remains **WITHHELD**.
