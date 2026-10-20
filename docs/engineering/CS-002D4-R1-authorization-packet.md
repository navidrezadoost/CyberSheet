# CS-002D4-R1 — Owner-Backed Sheet Views and Revocable Capabilities

**Status:** R1 boundary accepted and closed for design/source-classification scope · implementation authorization withheld · **Priority:** P0<br>
**Reported:** 2026-10-17<br>
**Predecessors:** CS-002D4-R0/R0.1 accepted and closed for source-accounting scope; D4.1–D4.6 and CS-001C design accepted<br>
**Decision required:** Obtain distinct R1 production implementation authorization against the accepted and closed boundary

## 1. Purpose

This packet records the accepted design/source-classification boundary for CS-002D4-R1 and proposes its implementation scope. It is planning evidence only. No production changes, tests, builds, baseline runs, merge, or release are authorized by this packet.

R0/R0.1 closed the source-accounting prerequisite. The reviewed 7,783-candidate inventory and 3,639-row flow register remain the controlled migration worklist. The 4,968 owner-polymorphic candidate decisions are conditional decisions, not unresolved records. Their recorded SHA-256 values remain in [CS-002D4-R0.1-progress-report.md](CS-002D4-R0.1-progress-report.md); neither TSV is changed by this packet.

R1 should establish the owner-backed read boundary and revocable capability primitives while preserving standalone `Worksheet` use. R1 must not implement CS-001C's authoritative journal, R2's staged cell mutations, or R3's calculation checkpoint and recovery.

## 1.1 Supervisory review disposition — 2026-10-17

The supervisory review accepted this packet as a planning deliverable. It accepted the owner/capability boundary, standalone `Worksheet` compatibility, immutable/read-only view requirements, and the unpublished R1/R2 integration strategy in principle. **Production implementation remains on hold; merge and release are prohibited.**

The review accepted the atomic bootstrap direction. The API owner approved the proposed `Workbook.create({ sheets })` signature on 2026-10-17. Bootstrap failure must expose no partial workbook, and bootstrap-created views must meet the same immutable/read-only guarantees as all later views. Post-publication sheet add/delete/rename remains deferred until its journal-backed mutation scope is authorized.

The R1/R2 seam is confirmed: R1 cannot activate writable workbook transaction handles before R2 provides the authoritative write-ahead journal. Unsupported writes reject before state changes; there is no raw worksheet write fallback. R1 is not independently mergeable or releasable. R1 also cannot report formula caches as `current` before R3 supplies generation ownership and recovery. Removing public event/bridge bypasses in R1 does not claim R4 event ordering.

The API owner approved the proposed public names, bootstrap direction, breaking-change classification, migration-note requirement, service-facade direction, and R1/R2 release seam on 2026-10-17. The supervisory review confirmed the coordinated first-party peer-dependency strategy on 2026-10-17: affected packages must use mutually compatible API ranges, and peer ranges must reflect actual API compatibility. Exact future package versions and ranges remain for release engineering; this decision does not authorize a version or package metadata change. The boundary freeze was accepted and closed for design/source-classification scope by final supervisory review on 2026-10-18. The focused verification plan has also been approved; execution still requires separate implementation authorization.

1. **R1 boundary freeze — closed:** exact production modules and consumer groups reconciled against the preserved R0.1 registers, including what must compile at the R1-only checkpoint and what remains deliberately unavailable until R2. The coordinated peer strategy is confirmed; exact version numbers and ranges remain with release engineering.
2. **Test and stop-gate approval:** focused test matrix and package checks approved by the user on 2026-10-17; execution remains unauthorized until implementation authorization.

The separate R1 implementation authorization is now the next decision. The frozen 105-failure reference and R0.1 register hashes remain unchanged.

## 2. Recommended implementation boundary

### Included in R1

1. Add an owner-backed `WorkbookSheetView` keyed by stable `(WorkbookId, WorksheetId)`. Each read resolves through the current workbook owner; a deleted ID never retargets to a same-name replacement.
2. Add detached immutable cell and query snapshots. A view must not return a raw `Worksheet`, `Cell`, mutable `DrawingLayer`, mutable service, backing collection, or callback that can mutate an owned object.
3. Add a module-private, unforgeable capability primitive carrying workbook and transaction identity. Every capability operation checks owner, active state, and revocation. Completion, abort, callback throw, and validation failure revoke escaped handles.
4. Mark workbook adoption on the raw `Worksheet` and reject direct workbook-owned mutation calls before any cell, graph, event, or revision write unless a private owner capability is present. A standalone `Worksheet` keeps its existing direct-mutation behavior.
5. Restrict workbook service access to query-only facades and separate public event subscription from internal event emission. Keep owner storage, event bridge registration, and emit methods private.
6. Add the owner-view and capability types to the core public type surface. Keep implementation tokens and raw owner objects non-exported.

**Fresh-workbook construction is a required boundary decision.** `Workbook` currently has no constructor seed and all sheets are created through `addSheet()`, which returns a raw `Worksheet`. R1 cannot reject `addSheet()` and leave callers without a way to create a workbook. The recommended R1 API is an atomic bootstrap factory such as `Workbook.create({ sheets: [{ name, rows, cols }] })` that validates the initial directory, IDs, allocation history, and owner state before exposing any workbook or view. Factory failure exposes no partial workbook. Bootstrap-created views have the same immutable/read-only guarantees as later views. Post-publication add/delete/rename remains unsupported until its journal scope is authorized; direct `addSheet()` must not remain a raw mutable escape.

**Bootstrap does not authorize initial data writes.** R1 bootstrap creates validated initial sheets and their directory/identity state; it is not an implicit bulk-edit channel. Initial cell values, formulas, and content population wait for R2 unless a separate, bounded pre-publication construction capability is designed and approved. An example or adapter that requires initial content may compile against the typed mutation boundary, but R1 must reject the unavailable operation before its first write and report initialization failure. It must not silently publish an empty workbook as a successful initialization. Styles and other metadata remain assigned to their later operation slices.

### Explicit R1/R2 seam

R1 cannot enable workbook-owned cell writes without the authoritative write-ahead journal required by CS-001C and assigned to R2. The proposed sequence is one unpublished integration branch with separately reviewable R1 and R2 commits. R1 may define a typed mutation port for caller migration, but any operation not yet backed by R2 must fail explicitly before writing. There is no fallback to a raw `Worksheet` mutator. The branch cannot merge or ship at the R1-only checkpoint; R2 must provide journal-backed behavior before supported workbook edits are re-enabled.

R2's initial writable allowlist is exactly `setCellValue`, `setCellFormula`, `clearCellContent`, and `clearCellFormula`. Generic `deleteCell` and structural deletion, including `InsertColumnCommand` and `DeleteColumnCommand`, are R5 work and remain rejected for workbook-owned sheets in R1. A future R2 internal deletion-like step requires its own specifically validated, reversible cell-content operation; it does not make generic `deleteCell` a public R2 operation.

The same sequencing limit applies to formula-result status. R1 must not label an existing formula cache `current` until R3 supplies generation ownership and cache recovery. A read view may report formula results as pending/unavailable in the interim; R3 enables current/stale status-aware formula reads and binder consumption.

If the API owner requires R1 to merge or ship independently, this boundary is not implementable as written: preserving workbook edits would require either R2's journal or an unsafe mutable compatibility path. That choice must return to design review rather than being resolved by silently expanding R1.

## 3. Affected production files

| Area | Expected files | R1 change |
| --- | --- | --- |
| Workbook owner and lookup | `packages/core/src/workbook.ts` | Store owner identity and sheet-ID lookup; expose owner-backed views for `getSheet()` and `activeSheet`; provide atomic initial-sheet bootstrap; prevent public access to raw sheet storage and mutable service instances. Post-publication sheet lifecycle mutators reject until their transaction/journal scope is authorized. |
| Standalone and owned worksheet boundary | `packages/core/src/worksheet.ts` | Preserve standalone behavior; add private ownership/capability checks for owned raw mutators; return detached data through the view adapter rather than exposing internal cells, stores, or drawing layer. |
| Public type and export boundary | `packages/core/src/index.ts`, `packages/core/src/types.ts` or a new `packages/core/src/workbook-access-types.ts` | Export the view/read snapshot types and approved owner-facing API. Do not export capability tokens, raw owner records, internal bridge emitters, or implementation classes. Keep `Worksheet` available for standalone use with explicit documentation. |
| View and capability implementation | New core module, proposed `packages/core/src/WorkbookSheetView.ts` plus a private capability module | Resolve views by IDs on every call; clone/freeze nested results; validate and revoke capabilities. Exact module split is an implementation detail, but ownership remains in `Workbook`. |
| Event and service escape surfaces | `packages/core/src/eventBridge.ts`, `packages/core/src/EventBus.ts`, workbook service getters in `workbook.ts` | Hide raw bridge management and emit authority; expose subscription/query facades only. Do not change event ordering or generation publication in R1; R4 owns that behavior. |
| React read and view consumers | `packages/react/src/CyberSheet.tsx`, `packages/react/src/components/ExcelApp.tsx`, `StatusBar.tsx`, `CommentPanel.tsx`, `components/backstage/panels/ExportPanel.tsx`, `packages/react/src/useCyberSheet.ts` | Replace workbook-owned reads and props with `WorkbookSheetView`; keep mutation callbacks on the typed port for R2. |
| Canvas renderer | `packages/renderer-canvas/src/ExcelRenderer.ts`, `CanvasRenderer.ts`, `DataManager.ts`, `ExportPlugin.ts`, `EditingManager.ts` | Replace retained raw sheet references and read paths with views/snapshots; editing methods route through the typed port and remain unavailable until R2. |
| Framework adapters | `packages/vue/src/useCyberSheet.ts`, `packages/angular/src/CyberSheetService.ts`, `packages/svelte/src/cyberSheetStore.ts`, plus `packages/react/src/useCyberSheet.ts` | Expose read views and the typed mutation port; do not return a raw workbook-owned sheet. |
| Core commands and event boundary | `packages/core/src/CommandManager.ts`, `FormattingController.ts`, `eventBridge.ts`, `EventBus.ts` | Remove public mutable sheet/event access. Command writes are migrated to the journal-backed port in R2; event ordering remains R4. |
| XLSX and examples | Read-only paths in `packages/io-xlsx/src/export.ts`; bootstrap and access sites in `examples/comments-example.ts`, `formula-editing-example.tsx`, `react-excel-viewer.tsx`, `react-canvas-viewer.tsx`, and `test-projects/vanilla-js/main.js` | Read through views; migrate construction to the atomic bootstrap API. Imports/progressive loading and dynamic sheet creation stay gated as described below. |

The inventory also points to command/controller, worker, import, progressive-load, and pivot consumers. Their behavior changes are excluded below; source changes needed solely to keep the integration branch type-correct must not implement their later transaction, worker, persistence, or metadata contracts.

### 3.1 R1-only integration checkpoint — proposed boundary freeze

The R1-only checkpoint is a non-releasable integration-branch state. The source classification joins 131 candidate paths: 113 package source paths and 18 example/test-project paths. It covers 1,486 relevant/conditional semantic rows and all 450 ownership-flow rows in those paths; 62 semantic rows marked not relevant were excluded from behavior decisions. The accepted candidate worklist and both R0.1 source registers remain unchanged. The final supervisory review accepted and closed this source-classification boundary on 2026-10-18, including the correction assigning the two structural column-command `deleteCell` records to R5 and the bootstrap/initial-data limit. The path/flow decisions, their current hashes, and the classification rules are recorded in [CS-002D4-R1-boundary-freeze.md](CS-002D4-R1-boundary-freeze.md), [the semantic disposition register](CS-002D4-R1-semantic-boundary-dispositions.tsv), [the flow disposition register](CS-002D4-R1-flow-boundary-dispositions.tsv), and [the module disposition register](CS-002D4-R1-module-boundary-dispositions.tsv). The boundary remains planning evidence, not an implementation allowlist.

At the R1-only checkpoint, every affected first-party workspace—core, React, renderer-canvas, IO-XLSX, Vue, Angular, and Svelte—must typecheck and build; included example/test-project workspaces must also compile under their configured build path. Callers may not use `as any`, cast a view back to `Worksheet`, or retain a direct write escape to satisfy compilation. Workbook-owned mutations not enabled by R1 must reject before any state, graph, event, revision, or metadata write. This applies even when a typed mutation port is present; R2 enables only journal-backed cell-content operations. The owner-approved focused R1 tests, focused-test guard, typecheck, and build remain the verification plan. No command has been run or is authorized before implementation authorization.

R1-only deliberately leaves workbook-owned writes unavailable: cell value/formula/clear operations, paste and command mutations, styles/metadata/drawings, structural edits, and post-publication sheet add/delete/rename reject before writes until their journal-backed slices are authorized. Public import/progressive-load entrypoints also reject before writing or exposing a candidate until R6 provides staged restore; worker ownership, pivot mutation, and calculation-current status remain under their later slices. Standalone `Worksheet` behavior remains available. Existing tests remain discovered and assertions intact; any workbook-mutation behavior temporarily unavailable in R1 must be restored and pass in the R1+R2 integration result. No R1-only state may merge or ship.

The first-party packages currently share version `0.1.0`; React, renderer-canvas, Vue, Angular, Svelte, and io-xlsx declare core/renderer peers on `^0.1.0`. The supervisory reviewer confirmed the coordinated strategy: affected first-party packages use mutually compatible API ranges, and dependent peer ranges are updated together according to actual API compatibility. Release engineering selects exact future versions and ranges. This planning decision authorizes no package version or peer metadata change.

## 4. Public export and type changes

Proposed public surface:

- Add the API-owner-approved `WorkbookSheetView`, `WorkbookCellRead`, and detached `ReadonlyCellSnapshot` types.
- Add or reuse branded `WorkbookId` and `WorksheetId` types from D4.1. A bound view stores IDs, not a display name or raw worksheet pointer.
- Add the API-owner-approved atomic initial-workbook construction API `Workbook.create({ sheets: [...] })`, which creates one or more initial sheets before any view or observer is exposed. The current `new Workbook(); addSheet()` pattern cannot remain the bootstrap path if `addSheet()` is a workbook-owned mutation.
- Change `Workbook.getSheet(name)` and `Workbook.activeSheet` to return owner-backed views. No workbook lookup returns `Worksheet`.
- Remove or close the public `addSheet()` raw-Worksheet return path. The initial-sheet factory is the bootstrap exception; adding/removing/renaming sheets after publication is rejected until the sheet-lifecycle journal work is authorized.
- Keep `Worksheet` exported for standalone construction and use. Document that a worksheet adopted by a workbook cannot be mutated through an unscoped raw reference.
- Remove public mutation/emission authority from `Workbook.eventBus` and `WorkbookEventBridgeManager`; retain an external subscribe-only surface. Keep bridge setup and emit methods internal.
- Replace public workbook getters that return mutable style, pivot, index, invalidation, or recompute implementations with query-only facades or make them internal. Do not remove standalone service exports without a separate compatibility decision.
- Do not publish a public mutating `Workbook.transact()` implementation in R1. R2 owns journal-backed mutation execution. A type-only mutation port may be introduced for migration, but runtime calls before R2 must reject deterministically before writes.

The package line is currently `0.1.0`. **API-owner decision recorded 2026-10-17:** classify the proposed API change as breaking; require migration notes; approve `WorkbookSheetView`, `WorkbookCellRead`, and `ReadonlyCellSnapshot`; approve the atomic `Workbook.create({ sheets })` direction; use read-only/query-only workbook service facades; and keep R1 unpublished until R2 provides journal-backed writes. The supervisory review confirmed a coordinated first-party release line and simultaneous peer-range updates for affected packages; ranges must reflect actual API compatibility. Release engineering will select exact future versions/ranges. No package version or peer metadata change is authorized by this planning decision. R0 accepts a breaking change policy, not a numeric version.

## 5. Caller migration sequence

1. **Core boundary:** implement ID-backed views and the private capability check; add atomic initial-sheet bootstrap; audit all workbook return paths and mutable nested values against the R0.1 registers.
2. **Core read consumers:** migrate renderer data access, workbook display/navigation, search, status and comment reads, and XLSX export reads to snapshots/views. Initial files include `packages/react/src/components/ExcelApp.tsx`, `CyberSheet.tsx`, `StatusBar.tsx`, `CommentPanel.tsx`, `packages/renderer-canvas/src/ExcelRenderer.ts`, `CanvasRenderer.ts`, `DataManager.ts`, `ExportPlugin.ts`, and `packages/io-xlsx/src/export.ts`.
3. **Framework surfaces:** update `packages/react/src/useCyberSheet.ts`, `packages/vue/src/useCyberSheet.ts`, `packages/angular/src/CyberSheetService.ts`, and `packages/svelte/src/cyberSheetStore.ts` to expose a workbook view and a typed mutation port, never the raw owned `Worksheet`.
4. **Workbook creation sites:** migrate `new Workbook(); addSheet(...)` initialization in examples, framework setup, test fixtures, and demos to the bootstrap factory. Dynamic UI sheet creation (for example the React viewer's Add Sheet action) remains disabled/rejected until R5 authorizes sheet lifecycle mutations.
5. **Examples and tests:** label tests that intentionally exercise standalone `Worksheet`; move workbook-owned read cases to views; preserve assertion strength and test discovery.
6. **Mutation consumers:** command, UI edit, paste/clear, collaboration, and patch application callsites move to journal-backed operations in R2. During the unpublished R1/R2 integration branch, no callsite may fall back to direct workbook-owned `Worksheet` mutation. Restore only the four allowlisted cell-content operations after R2's journal slice passes; generic `deleteCell` and structural deletion remain assigned to R5.
7. **Deferred integrations:** worker RPC, import/progressive restore, pivot metadata, and ordered event batches remain in R4–R6/R5 as mapped by the implementation readiness assessment.

Each candidate in the semantic register is evaluated using its `reviewed_relevance`, `ownership_evidence`, and `migration_disposition`; conditional rows are split by standalone versus workbook-owned use. The conservative disposition is not applied mechanically to standalone calls or test callbacks.

## 6. Required R1 test plan

These are proposed tests for a separately authorized implementation; none has been added or run.

| Test family | Required assertions |
| --- | --- |
| Retained view | A view retained before owner revision replacement resolves the current sheet by stable ID; rename preserves identity; deletion followed by same-name recreation does not retarget the old view. |
| Bootstrap | A fresh workbook with multiple initial sheets publishes no view until all IDs and initial sheet state are valid; returned handles are views; duplicate names reject without exposing a partial workbook; generated IDs are unique and monotonic. |
| Raw handle and adoption | A raw `Worksheet` retained before adoption rejects each owned mutator before cell, formula, graph, event, or revision changes. The same methods on a standalone `Worksheet` retain current behavior. |
| Capability ownership | A capability from another workbook or transaction is rejected. Expired capabilities reject after commit/abort/throw/validation failure. No capability token can be forged through public TypeScript fields or serialized identifiers. |
| Detached async closure | A callback that starts delayed work and returns cannot use an escaped handle after revocation; the failure is observable and does not mutate candidate or committed state. |
| Snapshot isolation | Mutating returned cell data and nested comments, styles, hyperlinks, components, arrays, maps, sets, drawing snapshots, and service query results leaves owner state unchanged. |
| Service/event authority | External callers can subscribe but cannot emit workbook events, register raw sheet bridges, or mutate service state through a getter. |
| Unsupported operations | Sheet lifecycle, structure, styles, drawing writes, metadata, and other excluded mutation families fail with a stable error before the first write. |
| Owner isolation | Matching names/addresses in two workbooks do not cross-resolve views or capabilities; deleted IDs never resolve to another workbook's sheet. |
| Package migration | Core and affected package declarations compile without unsafe casts; standalone worksheet tests remain explicit and pass after implementation is authorized. |

Suggested focused suite files: `packages/core/__tests__/workbook-sheet-view.test.ts`, `workbook-capability.test.ts`, `workbook-owned-escape.test.ts`, plus focused adapter tests in affected package test directories. The capability terminal-state tests may exercise a private owner harness in R1; end-to-end transaction mutation, abort atomicity, and journal rollback belong to R2.

Suggested commands after implementation is separately authorized (not run for this packet):

```sh
PATH="$PINNED_NODE_BIN:$PATH" node ./node_modules/jest/bin/jest.js \
  --config packages/core/jest.config.cjs \
  --ci --runInBand --coverage=false \
  packages/core/__tests__/workbook-sheet-view.test.ts \
  packages/core/__tests__/workbook-capability.test.ts \
  packages/core/__tests__/workbook-owned-escape.test.ts

PATH="$PINNED_NODE_BIN:$PATH" npm run typecheck --workspaces --if-present
PATH="$PINNED_NODE_BIN:$PATH" npm run check:no-focused-tests
PATH="$PINNED_NODE_BIN:$PATH" npm run build
```

These focused checks do not replace R2's transaction gates or the separately authorized D4.6 frozen-105 comparison. Adapter tests should run with each affected package's checked-in Jest config; no package suite is to be skipped because of migration cost.

## 7. Explicit exclusions

- CS-001C authoritative write-ahead journal, complete inverse capture, and patch rollback authority (R2).
- Staged workbook mutation state, atomic mutation commit, working writes through the transaction handle, and the first four cell-content operations (R2). R1-only mutation attempts reject before write.
- D4.5 calculation generation checkpoints, cache/spill restoration, stale-cache binding rules, retries, and late worker result rejection (R3).
- Workbook mutation/result event ordering and renderer invalidation batch delivery (R4). R1 only removes public emit/bridge bypass authority.
- Additional journal-supported families, post-publication sheet add/delete/rename, pivots, styles, merges, structural edits, and metadata mutation (R5). R1's bootstrap factory creates a new owner before publication and does not authorize later sheet lifecycle changes.
- Worker ownership/revision/generation protocol and D4.4 import/restore integration (R6).
- Frozen-105 candidate comparison, adoption decision, performance campaign, merge, release, and baseline reset (R7 / D4.6, separately authorized).

## 8. Rollback and stop conditions

- Develop on an isolated, unpublished branch with separate R1 and R2 commits. Do not merge or publish an R1-only state; it can temporarily reject workbook-owned writes while the journal-backed port is incomplete.
- Keep persisted workbook formats and the frozen 105-failure identity reference unchanged. R1 introduces no persisted capability token or workbook schema migration.
- If any view exposes a raw mutable object, any raw owned mutator writes without a live capability, or a rejected operation leaves state/events changed, stop the migration and revert the R1 commit before proceeding.
- If compile migration requires `as any`, casts to `Worksheet`, or a compatibility route that mutates owned state directly, stop and revise the API boundary; do not ship the escape.
- If the bootstrap factory or temporary loss of post-publication Add Sheet is unacceptable for the target release, do not expand R1 into unjournaled sheet mutations. Obtain a separate R5 authorization or return the scope to design review.
- Roll back by reverting the isolated R1 commit and its consumer signature changes. Since no persistent state is written by this API layer, no data rollback is needed. Do not release until R2 restores the supported cell-write path and all approved gates pass; if post-publication Add Sheet is a required release feature, R5 must also close before release.

## 9. Authorization checklist and boundary-freeze record

Before implementation starts, the API owner and supervising reviewer must record all approval groups from §1.1. The API owner and supervisory reviewer approved the decisions below on 2026-10-17:

| Decision | Proposed default | Status |
| --- | --- | --- |
| Breaking release and migration | Class the API change as breaking; require migration notes. Release engineering selects exact future versions and peer ranges. | API owner approved 2026-10-17 |
| Public read API | `WorkbookSheetView`, `WorkbookCellRead`, and detached `ReadonlyCellSnapshot`; workbook lookups never return raw `Worksheet`. | API owner approved 2026-10-17 |
| Bootstrap API | Atomic `Workbook.create({ sheets: [...] })`; no partial instance/view escapes on failure. | Direction and proposed signature approved 2026-10-17; detailed contract remains in boundary freeze |
| Mutable service getters | Public callers receive query-only/subscription-only facades; owner mutation and event emission/bridge registration remain private. Exact getter-by-getter disposition is part of the boundary freeze. | Facade direction approved 2026-10-17; getter matrix remains in boundary freeze |
| R1/R2 release seam | One unpublished integration branch; separate R1 and R2 commits/gates; R1 cannot merge or ship alone, and workbook-owned writes reject until R2. | Approved in principle by supervisory review and API owner; implementation authorization withheld |
| Coordinated peer dependencies | Affected first-party packages use mutually compatible API ranges; update dependent peer ranges together based on actual published compatibility. | Supervisory reviewer confirmed 2026-10-17; exact versions/ranges deferred to release engineering |
| R1 migration and compile boundary | Disposition all 131 candidate paths, 1,486 relevant/conditional semantic rows, and 450 ownership-flow rows; require affected workspace type/build compatibility, no unsafe casts or mutable escapes, and pre-write rejection for workbook mutations unavailable in R1. | Accepted and closed for design/source-classification scope on 2026-10-18; execution unauthorized |
| Focused verification and stop gates | Approve §6 tests and package checks, including bootstrap atomicity, retained identity, raw-handle rejection, snapshot isolation, revocation, async closure, standalone compatibility, and unsupported-operation rejection. | Plan approved by user 2026-10-17; no tests/checks authorized for execution before implementation authorization |
| D4.6 adoption comparison | Frozen-105 candidate comparison remains separate and requires distinct authorization. | Not authorized here |

**Current decision:** the boundary is accepted and closed for documented design/source-classification scope. The API-owner decisions, focused verification plan, and coordinated peer-dependency strategy are recorded. The 131-path, 1,486-semantic-row, and 450-flow source classifications and exact R1-only compile/runtime policy are complete in the supplementary boundary freeze and registers. No R1 implementation, test execution, build, baseline capture, merge, or release authorization is granted. A separate implementation decision is required before production work or verification runs. R0/R0.1 remain closed for source-accounting scope only. The frozen 105-failure reference remains unchanged.
