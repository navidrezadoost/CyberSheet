# CS-002D4-R1 — Module and Flow Boundary Freeze

**Status:** Boundary accepted and closed for design/source-classification scope · implementation unauthorized  
**Reported:** 2026-10-17  
**Parent:** [R1 authorization packet](CS-002D4-R1-authorization-packet.md)  
**Scope:** Documentation and source classification only

## 1. Decision boundary

This freeze records the accepted exact R1-only source and consumer boundary for its design/source-classification scope. It does not authorize production changes, tests, builds, baseline runs, merge, package publication, or release. R1 implementation authorization remains separate from this closed boundary and from R2's authoritative journal and later integration slices.

R1 establishes owner-backed reads, detached snapshots, capability type boundaries, raw-owned-handle rejection, private owner/event/service surfaces, and atomic initial-workbook bootstrap. The bootstrap creates validated initial sheets and their directory/identity state; it is not an implicit bulk-edit channel. Initial cell data population waits for R2 unless a separate, bounded pre-publication construction capability is designed and approved. A bootstrap may not silently publish an empty workbook and report successful initialization when requested initial data was not written. Examples and adapters that need initial content may compile against the typed mutation boundary, but the unavailable operation must reject before its first write and initialization must report failure. For a workbook-owned sheet, R1 does not enable cell edits or any later mutation family. Calls through a typed mutation port must fail before the first write until the operation's authorized journal-backed slice is implemented. Standalone `Worksheet` behavior remains available on the explicitly standalone path.

The coordinated first-party peer strategy is confirmed: core, React, canvas renderer, IO-XLSX, Vue, Angular, and Svelte use mutually compatible public API ranges, and affected peer ranges change together based on actual API compatibility. Release engineering determines future numeric versions and exact ranges. No package version or peer-range edit is part of this planning decision.

## 2. Frozen source inputs and counts

The accepted R0.1 registers and the earlier candidate-path worklist remain unchanged. Their hashes are recorded here so a reviewer can reproduce the join:

| Input | Records in source | SHA-256 |
| --- | ---: | --- |
| [R0.1 semantic review](CS-002D4-R0.1-semantic-review.tsv) | 7,783 | `f482bef1254bb2df78fda2719e71b95f4bdb6baaeef7bce850e37e9cc36b2524` |
| [R0.1 flow review](CS-002D4-R0.1-flow-review.tsv) | 3,639 | `323d48337352e122a8993203af90f456cf465fb9e96900b7e66cc88241c77ac8` |
| [Candidate module worklist](CS-002D4-R1-module-boundary-candidates.tsv) | 131 paths | `f756a56ba71956d239d2bf41ecef65bc5483e3dbb12f786cb48749c00d874ddc` |

The 131-path worklist has 113 package source paths and 18 example/test-project paths. The source join finds 1,548 semantic rows in those paths: 1,087 relevant, 399 conditional, and 62 marked not relevant. The 62 not-relevant records were not treated as ownership decisions. The disposition covers the 1,486 relevant/conditional semantic records and every one of the 450 flow records in those paths.

Three additive registers provide the reviewable decisions. Neither rewrites or replaces an accepted source register:

| Disposition artifact | Records | SHA-256 |
| --- | ---: | --- |
| [Per-semantic disposition register](CS-002D4-R1-semantic-boundary-dispositions.tsv) | 1,486 relevant/conditional semantic rows | `158d3e232bd31e41432bff7192f07425a3f600c2330fdc970f68bc94d4d77d22` |
| [Per-flow disposition register](CS-002D4-R1-flow-boundary-dispositions.tsv) | 450 flow rows | `08c8769b3ff7b72f1c1b072412a3387eb655f33d11cb5ad4e5d65683cdd22db0` |
| [Per-module disposition register](CS-002D4-R1-module-boundary-dispositions.tsv) | 131 module rows | `b42c04b22b823a714c1cf9c0364a81870799d9676d7b69b40bf6236fd8abe683` |

The semantic register retains each accepted `candidate_key`, path, line, symbol, relevance, receiver, ownership evidence, assigned slice, and R1 checkpoint disposition. The flow register retains each accepted `flow_key`, path, line, expression, static type, ownership evidence, source excerpt, assigned slice, and R1 checkpoint disposition. The module register aggregates semantic counts and exact semantic/flow keys for each candidate path. All disposition rows are marked `source-classified; boundary accepted and closed for classification scope`; they remain planning classifications, not an implementation allowlist.

## 3. Classification rules

The flow decisions use the observed receiver and source context, not the generic `migration_disposition` text alone.

| Source evidence or operation | Assigned boundary |
| --- | --- |
| Constructed or retained `Workbook`; `getSheet`/`activeSheet`; cell/query reads from an owned sheet; workbook view returned to UI, adapter, renderer, or exporter | R1 owner/view boundary. Workbook lookup returns an ID-backed view and nested read data is detached. |
| Initial `new Workbook()` plus initial `addSheet()` construction | R1 bootstrap migration to `Workbook.create({ sheets })`. The candidate is not exposed until construction completes. |
| Post-publication sheet add/delete/rename, active-sheet mutation, or workbook directory mutation | R5. R1 makes storage private and rejects these operations before writes. |
| `setCellValue`, `setCellFormula`, `clearCellContent`, `clearCellFormula`, and their direct cell-content command/callback paths | R2's initial four-operation allowlist. R1 may expose only a typed port that rejects before writing; R2 enables these operations only with the authoritative journal. |
| Generic `deleteCell` and structural deletion, including the column-shift commands in `DeleteColumnCommand.ts` and `InsertColumnCommand.ts` | R5. These are not members of R2's four-operation allowlist. R1 rejects workbook-owned calls before writing; preserve the explicitly standalone branch. Any deletion-like behavior later needed inside R2 must use a specifically validated, reversible cell-content operation and does not authorize public `deleteCell`. |
| Styles, dimensions, filters, merges, comments, hyperlinks, validation, conditional formatting, drawings/components/icons, protection, sort, insert/delete/reorder, pivots, and other metadata writes | R5. R1 prevents raw access and rejects workbook-owned writes. Row/column-shift commands remain structural R5 work even when they copy or clear individual cells internally. |
| Formula evaluation, graph validation, spills, calculation status, and generation results | R3/D4.5 boundary. R1 never labels a workbook formula cache current or lets a view masquerade as a current precedent. |
| Public bridge/emission escape removal | R1 privacy boundary. Ordered mutation/result batch publication remains R4. Internal raw `Worksheet[]` bridge enumeration stays private. |
| Worker ownership, progressive load, XLSX import, snapshot replacement, or staged restore | R6/D4.4 boundary. Export reads may use R1 views. In the R1-only runtime, public import/progressive-load entrypoints reject before writing or exposing a candidate workbook; R6 later re-enables them through staged restore. |
| `Worksheet` parameter or callback with owner origin not resolved | Owner-polymorphic split: workbook-owned use goes through an R1 view or the operation's typed port; the standalone `Worksheet` branch preserves direct behavior. This does not claim that an unresolved callsite is standalone. |
| `new Worksheet(...)` with no workbook owner and no adoption call | Explicit standalone path. Keep its existing behavior. If a later call adopts it into a workbook, the raw handle must stop being the workbook mutation route. |
| Experimental workbook calculation prototype | Keep isolated and non-exported. It is not an R1 production consumer or alternate owner/journal. |

The flow register may assign multiple slices to one flow. R1 identifies and closes the ownership boundary; the operation slice controls when that behavior can be enabled. `standalone` in an owner-polymorphic row means the standalone branch is explicitly retained, while the workbook branch is migrated. The complete decision and source note are on the row keyed by the original R0.1 `flow_key`.

## 4. R1-only compile and runtime policy

At the R1-only integration checkpoint, every affected first-party workspace must typecheck and build: core, React, renderer-canvas, IO-XLSX, Vue, Angular, and Svelte. Any example or test-project workspace included in the migration must also compile under its configured build path. The whole change remains on an unpublished integration branch; R1 by itself is not mergeable or releasable.

Compilation must use the approved public view and type boundary. It must not depend on `as any`, a cast from `WorkbookSheetView` to `Worksheet`, an assertion that restores raw mutability, public owner storage, a mutable service getter, or a legacy raw-sheet compatibility escape. Where an existing caller requests a workbook-owned write that R1 does not support, its typed operation rejects deterministically before changing cell state, graph state, events, revisions, or workbook metadata. No API may silently perform the write against a raw `Worksheet`.

R1 supports initial workbook construction only through the atomic bootstrap path. A callback may carry a typed mutation port for migration, but runtime mutations remain unavailable until R2 supplies write-ahead journal coverage. R1 also keeps formula results pending/unavailable until R3 supplies generation ownership and checkpoint recovery. Raw standalone worksheets retain their existing direct-mutation behavior.

IO-XLSX import and progressive-load entrypoints are also unavailable in the R1-only runtime. They must not write through cross-package raw sheet/store access or expose an incompletely restored workbook; R1 keeps their public signatures type-compatible and rejects before candidate publication. R6 re-enables those operations through D4.4 staged restore.

The typecheck/build requirements define the future R1 checkpoint; they do not authorize running them now. The separately approved focused R1 test plan and D4.6 frozen-105 comparison also remain unexecuted and require implementation authorization.

## 5. Module-level disposition summary

The 131 rows in the module register assign each path to all applicable slices. The main multi-slice groups are:

| Slice | Module paths | Boundary examples |
| --- | ---: | --- |
| R1 owner views/types/guard | 128 | Workbook owner, public lookup/read consumers, service facades, renderers, adapters, exports |
| Standalone branch retained or split | 117 | Owner-polymorphic `Worksheet` helpers and explicit standalone consumers |
| R2 journal-backed cell content | 51 | The four allowlisted value/formula/content-clear/formula-clear operations and their caller paths |
| R5 later mutation families | 53 | Styles, metadata, sheet lifecycle, drawings, pivots, structural edits |
| R3 calculation/graph work | 11 | Formula engine, graph/scheduler paths and isolated prototype |
| R4 event ordering | 9 | Event bridge and event-bus integrations |
| R6 import/worker/restore | 9 | Progressive XLSX paths, worker hosts, staged restore/import |

These counts are overlapping slice memberships, not mutually exclusive module totals. The standalone count includes owner-polymorphic paths that require both an R1 workbook-facing branch and a preserved standalone branch; it does not claim those whole modules are standalone. The single experimental prototype row is assigned only to `R3-later/isolated`; it stays outside the production R1 boundary. The module TSV is the authoritative path-by-path record where a package has a more specific scope.

## 6. Boundary status and remaining approvals

| Requirement | Status |
| --- | --- |
| R0/R0.1 source accounting | Accepted and closed |
| R1 API direction and bootstrap direction | Accepted for planning |
| Coordinated first-party peer strategy | Confirmed; exact versions/ranges deferred to release engineering |
| 131 module dispositions, 1,486 semantic dispositions, and 450 flow dispositions | Accepted and closed for design/source-classification scope |
| R1-only compile/reject-before-write policy | Accepted as a boundary requirement; execution unauthorized |
| Focused R1 verification plan | Approved for planning; execution unauthorized |
| R1, R2, and later production implementation | Unauthorized |
| Merge, publication, release, or baseline reset | Unauthorized |
| Frozen CS-002C 105-failure reference | Unchanged; not rerun |

The 2026-10-18 final supervisory review accepted and closed this boundary for its documented design/source-classification scope. Any later scope change requires a new review. A separate R1 implementation authorization remains required.

No production code or tests were changed for this classification. No tests, builds, benchmarks, baseline captures, merges, or releases were run or authorized.
