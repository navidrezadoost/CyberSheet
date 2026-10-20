# CS-002D4-R0 — API and Escape-Path Migration Contract

**Status:** Architecture accepted · R0/R0.1 accepted and closed for source-accounting scope · R1 not authorized · **Priority:** P0

**Reported:** 2026-10-17

**Authorization:** R0 source inventory and migration design only. R1 production implementation is not authorized.

**Parent:** [CS-002D implementation-readiness assessment](CS-002D4-implementation-readiness-assessment.md)

## 1. Purpose and R0 disposition

R0 defines the public API migration and the source accounting required before owner-backed workbook read views and transaction handles can be implemented. The current API exposes mutable `Worksheet` instances through `Workbook.getSheet()`, `activeSheet`, and `addSheet()`. The core barrel also exports `Worksheet`, command/controller types, worker hosts, patch APIs, and `DrawingLayer`. A return-type-only change would therefore leave direct handles, nested references, service getters, internal adapters, and event publication paths capable of bypassing workbook isolation.

**Public compatibility decision: make the ownership change in an explicitly breaking release.** The current `0.1.0` package line is pre-1.0, so release engineering must select the project’s semver-compatible breaking version number; the API change itself must be announced as breaking, with a migration guide and compile-time errors for old mutation paths. Do not silently change `getSheet()` runtime behavior while retaining a mutable `Worksheet` return type. Do not ship an unsafe mutable compatibility escape for workbook-owned sheets. Standalone `Worksheet` usage remains supported.

R0 source accounting began as a reproducible candidate inventory, not as a claim that every generated name match is semantically a worksheet use. CS-002D4-R0.1 adds a stable per-candidate decision overlay and a separate source-flow register. The API-family migration matrix in §7 remains the governing implementation grouping and acceptance evidence.

## 2. Reproducible source inventory

The line-level register is [CS-002D4-R0-callsite-inventory.tsv](CS-002D4-R0-callsite-inventory.tsv). It covers code under `packages/`, `examples/`, `scripts/`, and `test-projects/`, including tests and test helpers. Each row contains scan family, repository-relative path, line, matched symbol, initial classification, migration target, verification scenario, and the source line as captured.

Regenerate from repository root with:

```sh
python3 docs/engineering/CS-002D4-R0-inventory-generator.py
```

Check that the checked-in inventory matches deterministic regeneration without rewriting it:

```sh
python3 docs/engineering/CS-002D4-R0-inventory-generator.py --check
```

The generator’s exact patterns, exclusions, classifications, and output schema are checked in alongside the register. It excludes documentation prose, generated `dist/`, coverage, and dependency directories; it includes comments only when a code line contains a match after the line-prefix comment filter. The register should be regenerated after source/API changes and reviewed as a diff.

Current generated register:

| Scan family | Rows | Meaning |
| --- | ---: | --- |
| `workbook` | 365 | `getSheet`, `activeSheet`, `activeSheetName`, `addSheet`, `deleteSheet`, `renameSheet` references |
| `mutator` | 4,098 | Direct calls to known worksheet/workbook mutation families, including test call sites |
| `read` | 2,160 | Direct worksheet query candidates; generic `find` and `findAll` matches require contextual review |
| `escape` | 166 | Mutable service/object exposure candidates, including event-bus use |
| `raw_type` | 994 | `Worksheet` type/API declaration candidates in imports, parameters, returns, constructors, and fields |
| **Total** | **7,783** | Candidate line/symbol rows; one source line may appear in more than one family |

The counts are scan rows, not unique source lines or unique public consumers. A row is not proof that the named receiver is a workbook-owned `Worksheet`. R0 completion is based on review of all rows relevant to the owned workbook API, not on the total or a green scan.

### 2.1 CS-002D4-R0.1 semantic reconciliation

The companion [semantic review register](CS-002D4-R0.1-semantic-review.tsv) gives every candidate a stable content key, duplicate occurrence ordinal, relevance decision, actual statically resolved receiver type/member declaration where available, ownership evidence, migration disposition, accountable component, and justification. It records 7,783 unique candidate keys: 1,946 relevant, 869 not relevant, and 4,968 owner-polymorphic candidates. The owner-polymorphic disposition explicitly preserves standalone `Worksheet` behavior and requires workbook-owned consumers to split into read-view and transaction-capability paths; it is not an assumption that the instance is standalone or workbook-owned.

The [flow review register](CS-002D4-R0.1-flow-review.tsv) adds 3,639 source-flow rows; some overlap the direct callsite register. Its final receiver classifier distinguishes worksheet owner objects from containers that hold worksheets. The register records 696 workbook/sheet handles or aliases, 947 worksheet handles passed to calls, 1,887 callbacks containing worksheet mutation, two source rows for one raw `Worksheet[]` return path in the core event bridge (method declaration and return site), one external access to the workbook's private sheet map, 16 accesses to that map contained within `Workbook` internals, two writes through returned cell objects, and 88 returned-service chains. The example access at `examples/comments-example.ts:408` indexes the private `Map<string, Worksheet>` as if it were an array; it is recorded as an external private-store access and must migrate to owner-backed lookup. The event-bridge collection remains internal and must not cross the owner boundary as raw worksheets. No confirmed destructured worksheet/workbook method extraction or computed worksheet API access was found in the scanned sources. Every row in both registers has a stable unique key and migration disposition; neither register has an open/manual-review row.

Regenerate/check both overlays with the pinned repository Node runtime:

```sh
PATH="$PINNED_NODE_BIN:$PATH" node docs/engineering/CS-002D4-R0.1-semantic-reconciler.mjs
PATH="$PINNED_NODE_BIN:$PATH" node docs/engineering/CS-002D4-R0.1-semantic-reconciler.mjs --check
```

The original Python scanner remains regex candidate discovery. The semantic reconciler uses the TypeScript compiler API on all `.ts`, `.tsx`, `.js`, and `.jsx` files under the inventoried source roots, and separately inspects `<script>` blocks in `.html`, `.vue`, and `.svelte` files. For these patterns, review rules explicitly account for: local aliases (following the resolved symbol or initializer), worksheet collections and private sheet-store access, destructured methods (receiver loss), computed member access (allowlist/reject dynamic writes), callback capture (capability lifetime), and mutations through returned objects/services (freeze, detach, or use explicit mutators). The template pass is source-context based and does not claim TypeScript type resolution. Dynamic evaluation, reflection, generated code, and flows crossing an opaque external library boundary remain limits of static inventory; implementation review must add focused source tracing when such a boundary is encountered.

The reconciler reports diagnostics from its ad-hoc TypeScript `Program` as supporting metadata only. Its type output is used when resolvable; rows with `any`, template-only, or owner-polymorphic types retain explicit migration dispositions rather than being treated as proof of ownership. These inventory results are source-accounting evidence, not runtime verification.

### 2.2 Public package and source surfaces

| Surface | Source evidence | Migration consequence |
| --- | --- | --- |
| Core exports | `packages/core/src/index.ts` re-exports `worksheet`, `workbook`, `eventBridge`, `CommandManager`, controllers, commands, worker hosts, patch APIs, and `DrawingLayer`. | Define which exports are standalone-only, read-only, transaction-scoped, or internal. Remove direct mutable store/engine exports where callers could bypass the owner. |
| Workbook APIs | `packages/core/src/workbook.ts`: `getSheet`, `activeSheet`, `addSheet`, `deleteSheet`, `renameSheet`, `activeSheetName`, pivot/service getters, event bus, import/export and pivot helpers. | Replace mutable sheet returns and direct workbook mutations with owner-backed views and transaction methods. Gate metadata/service writes. |
| Worksheet APIs | `packages/core/src/worksheet.ts`: public mutation, query, graph, spill, snapshot, drawing, and metadata methods. | Maintain a method-level eligibility manifest. Standalone methods remain; workbook-owned calls require a transaction or private engine capability. |
| Framework package entry points | `packages/react/src/index.ts`, `packages/renderer-canvas/src/index.ts`, `packages/io-xlsx/src/index.ts`, `packages/vue/src/index.ts`, `packages/angular/src/index.ts`, `packages/svelte/src/index.ts`; framework packages import core types and receive workbook/sheet values. | Publish the new view/transaction types and update emitted declarations for every package in the breaking release. |
| Data/worker entry points | `EngineWorkerHost`, `WorkerEngineProxy`, `FormulaWorkerHost`, `FormulaWorkerProxy`, `SpreadsheetSDK`, `CollaborationEngine`, import/progressive-load functions. | Distinguish mutation RPCs, staged restore, internal calculation, and read snapshots; include transaction and owner identity where applicable. |

## 3. Proposed public API and compatibility rules

### 3.1 New public contract

The next breaking API presents workbook reads and writes as different capabilities:

```ts
interface WorkbookSheetView {
  readonly id: WorksheetId;
  readonly name: string;
  readCell(address: Address): WorkbookCellRead;
  getCell(address: Address): ReadonlyCellSnapshot | undefined;
  // Detached or immutable query methods only.
}

interface WorkbookTransaction {
  readonly id: TransactionId;
  getSheet(idOrName: WorksheetId | string): TransactionSheet;
  // Workbook mutations only when their family is journal-supported.
}

interface TransactionSheet {
  readonly id: WorksheetId;
  setCellValue(address: Address, value: CellValue): void;
  setCellFormula(address: Address, formula: string, cachedValue?: CellValue): void;
  clearCellContent(address: Address): void;
  clearCellFormula(address: Address): void;
}

workbook.getSheet(idOrName): WorkbookSheetView | undefined;
workbook.transact<T>(callback: (tx: WorkbookTransaction) => T): Promise<MutationResult<T>>;
```

This is an interface contract, not a commitment to the exact final names. `getSheet()` returns a read-only view in the breaking release; mutation does not remain on that view. `transact()` callbacks are synchronous, return-value thenables are rejected before commit, and every transaction handle checks a revocable runtime capability on each method call. `MutationResult` distinguishes committed/current from committed/stale calculation outcomes, as specified by accepted D4.3.

No generic `unsafeGetWorksheet()` or raw `Worksheet` adapter is provided for workbook-owned sheets. Such an adapter would defeat retained-handle and nested-object isolation. Users who need standalone behavior may construct/use a standalone `Worksheet` without adopting it into a `Workbook`.

### 3.2 Migration release policy

1. Publish the breaking view/transaction API in an explicitly breaking release with updated package declarations and migration guide.
2. In that release, workbook-owned sheet lookup returns `WorkbookSheetView`; old source that invokes mutators on `getSheet()` fails type checking. Runtime raw mutator calls against an adopted/detached `Worksheet` throw a stable owner/capability error before writing.
3. Direct `Worksheet` construction and mutation remains the compatibility path for standalone sheets. A standalone sheet cannot later be adopted while a live mutable handle remains capable of writing; adoption must detach/revoke that handle or reject adoption.
4. Do not retain a deprecated mutable `getSheet()` overload that can bypass the new owner. If an intermediate release adds the new API before the breaking release, it may do so additively, but that release does not claim transaction isolation or production adoption readiness.
5. Framework and renderer packages update peer dependency ranges together so an older adapter cannot compile against the new core type and silently use stale runtime assumptions.

The repository package files currently report `0.1.0` for core, React, renderer-canvas, IO-XLSX, Vue, Angular, and Svelte. Release engineering must decide whether to publish a 0.x breaking minor or establish a 1.x major. R0 chooses a breaking release policy, not a numeric version.

## 4. Capability and retained-handle contract

### 4.1 Ownership checks

- Every `Workbook` owns a private opaque `WorkbookId`, current workbook revision, active transaction ID, and sheet ID directory.
- Workbook lookup returns a stable view proxy keyed by `(WorkbookId, WorksheetId)`, never the underlying `Worksheet` instance. Every read resolves against the currently published immutable state revision.
- Transaction lookup returns a `TransactionSheet` keyed by `(WorkbookId, TransactionId, WorksheetId)` and the staged candidate. It does not expose the raw worksheet.
- Every mutating wrapper validates: workbook still alive; transaction is active; capability owner matches; target sheet ID resolves inside that candidate; operation is in the eligible mutation manifest; and candidate revision is current.
- Transaction identifiers/capabilities are runtime-unforgeable module-private values (for example, WeakMap-held records or private symbols), not a TypeScript-only `private` property, string token, or user-supplied sheet name.
- Internal scheduler/result-commit and D4.4 restore capabilities are separate, non-exported, phase-scoped capabilities. They cannot invoke user mutation APIs or start another journal.

### 4.2 Revocation and asynchronous callbacks

The transaction callback is synchronous. On callback return, rejection, validation failure, abort, or commit, the owner revokes its capability before any staged candidate can be discarded or published. Every delayed use of an escaped `TransactionSheet` checks revocation and throws before a write. Callback thenables are rejected; a detached async continuation may run but cannot mutate candidate or committed state after revocation.

No method returns a raw candidate `Worksheet`, mutable store, `Cell`, `DrawingLayer`, or iterator callback containing a live mutable `Cell`. Any callback API operating on cells receives detached immutable snapshots. Asynchronous work requiring mutation must call a new transaction after the prior transaction resolves; the old capability is never extended or rebound.

### 4.3 Retained handles and standalone mode

A retained `WorkbookSheetView` continues resolving the latest published state for its stable `WorksheetId`, including after rename and successful commit. After deletion, its reads report the documented missing-sheet result; if a same-name sheet is later created, the old view does not retarget. A retained `TransactionSheet` becomes unusable on all completion paths.

A raw standalone `Worksheet` remains directly mutable under its existing standalone contract. It has no workbook identity, no cross-sheet guarantees, and no workbook scheduler. Adoption of a standalone sheet into a workbook must either create a detached staged copy and revoke the original mutator path or reject while mutable aliases exist. Identity follows D4.1 O1; a stale construction-time ID is invalid after adoption and cannot be forwarded.

## 5. Mutable escape closure

TypeScript `Readonly<T>` and `readonly` properties are not runtime isolation. The boundary must close these object paths:

| Current source path | Required R1/API disposition |
| --- | --- |
| `Worksheet.getCell()` returns a shallow `Object.freeze({ ...cell })`; nested values may remain shared. `forEachNonEmptyCell()` currently supplies `any`. | Return a deep immutable or detached `ReadonlyCellSnapshot`; replace raw-cell iteration with snapshot iteration. Mutating nested comments/style/hyperlink/component data must not mutate owner state. |
| `getComments`, `getConditionalFormattingRules`, `getAllFilters`, style getters, `getHiddenRows/Cols`, and related queries return objects, arrays, maps, sets, or nested values with differing clone depth. | Define clone/freeze depth per type. Return immutable wrappers or detached deep copies. A `ReadonlyMap` view backed by a mutable `Map` is insufficient if callers can recover or mutate the backing object. |
| `Worksheet.getDrawingLayer()` returns a mutable drawing layer; exported `DrawingLayer` has mutating APIs and events. | Workbook views expose detached drawing snapshots. Drawing writes route through transaction methods with journal-supported payloads; otherwise they reject. Do not expose the internal layer. |
| `Workbook.getStyleCache()`, `getPivotRegistry()`, `getPivotSnapshotStore()`, dependency-index/invalidation/recompute getters. | Public API gets query-only facades with copied return data. Mutating services move behind workbook-owned transaction/scheduler internals. Avoid returning concrete mutable implementation types. |
| Public `Workbook.eventBus` and `WorkbookEventBridgeManager` subscriptions to per-sheet `Worksheet.on()`. | External API supports subscription only; only the workbook owner emits commit envelopes. Internal bridge registration/emission is non-exported. Raw worksheet mutation events are not forwarded for workbook-owned sheets. |
| Module-global `groupStateStore` used by workbook pivot paths. | Replace with owner-scoped store before workbook staging; clone/stage/commit it by workbook owner. No cross-workbook shared mutable pivot group state. |
| Public `Worksheet` export and constructor; raw worksheet held by React, renderer, command, IO, and framework code. | Preserve the class for standalone users, but do not return workbook-owned internal instances. On adoption, revoke/detach legacy mutation handles. No capability bypass through exported setters. |
| Mutable callback and async closure escape from `Workbook.transact`. | Pass only transaction wrappers/snapshots, revoke on synchronous callback completion, and validate capability at every call. A delayed callback cannot mutate a later committed candidate. |

## 6. Initial transaction eligibility manifest

The first owner-backed view/transaction release starts with this allowlist only:

| Disposition | Initial API operations |
| --- | --- |
| `journal-supported` | `setCellValue`, `setCellFormula`, `clearCellContent`, and `clearCellFormula` on **existing** sheets through `TransactionSheet`. Formula mutation records before-state first and updates staged local graph state; D4.5 later computes the committed dirty closure. |
| `read-only` | Workbook sheet lookup, names/IDs/order, address reads, detached cell snapshots, dimensions, used-range, immutable style/merge/filter/metadata query snapshots. Formula values carry current/pending/stale/unavailable status. |
| `transaction-only-internal` | Graph registration/invalidation, formula result writes, spill materialization, scheduler commit, workbook event bridge, and state pointer publication; private capabilities only. |
| `staged-restore-only` | `applySnapshot`, XLSX import/progressive load, manifest restore/clone/import. Use D4.4 candidate construction and swap; reject while a normal transaction is active. |
| `rejected-before-write` | Add/delete/rename sheet and active-sheet changes; pivot/slicer/reference mutations; styles; merges; direct spill metadata writes; filters/visibility; validation/conditional formatting/protection/freeze/header-footer; row/column dimensions; comments/icons/components/hyperlinks/drawings; sort/row/column structure changes; direct graph/DAG/recalc calls; raw stores and mutable `DrawingLayer` access; generic patch operations outside the four content operations. |

The initial slice can update values/formulas on multiple pre-existing worksheets in one transaction. It does not claim to support worksheet lifecycle or general workbook metadata until those families have full journal semantics. Unsupported operations throw a stable error naming the API/family before any candidate write; no path silently falls back to a raw worksheet.

## 7. Consumer migration matrix

The path/line register supplies source call sites. This matrix assigns an API target and verification scenario to each owning consumer area.

| Consumer / source family | Current dependency class | Target API/type | Implementation dependency | Verification scenario |
| --- | --- | --- | --- | --- |
| Core `Workbook` and `Worksheet` (`packages/core/src/workbook.ts`, `worksheet.ts`) | Mutable lookups/add-sheet returns; direct internal state; query APIs | Public `WorkbookSheetView`; `TransactionSheet`; private backing worksheet | Owner state wrapper, staged candidate, capability enforcement, immutable snapshot types | Retain view through commit/delete/rename; raw old worksheet writes reject; no read sees staged revision. |
| React workbook UI (`packages/react/src/components/ExcelApp.tsx`, `CyberSheet.tsx`, `StatusBar.tsx`, `CommentPanel.tsx`, backstage and ribbon files) | Read plus user mutations from `activeSheet`/`getSheet`; passes worksheet into children | Read-only views for display; transaction callback/mutator service for edits; transaction-safe dialog commit | Core public API migration plus React prop/event redesign | Editing, formatting, navigation and comments do not mutate before transaction; abort shows no intermediate UI state. |
| React/core commands (`CommandManager`, `FormattingController`, `PasteCommand`, `ClearCellsCommand`, `InsertCellsCommand`, `DeleteCellsCommand`, `DataCommands`, `WorksheetCommands`, review/conditional-format commands) | Direct mutation, often command-local inverse state | Commands accept `TransactionSheet`/transaction context; undo/redo submits a new journaled transaction | Command interface update; allowlist or explicit rejection for unsupported command families | Batch command failure aborts entire staged transaction; command undo projection preserves covered state. |
| Renderer canvas (`ExcelRenderer`, `EditingManager`, `CanvasRenderer`, `DataManager`, `ExportPlugin`, chart and virtualization managers) | Long-lived raw worksheet references; direct edits, reads, event subscriptions | Owner-backed view for rendering; callback to transaction service for edits; committed event envelope subscription | Renderer constructors/types and event bridge migration | Rendered snapshot stays on committed revision; edit commits once; abort produces no renderer invalidation/value event. |
| Core `eventBridge.ts` / `EventBus` | Raw per-sheet event forwarding and public event emission | Workbook commit/result subscription API; private bridge emission | Mutation journal projection and event contract | No raw event leakage, duplicate bridge registration, or ordering drift; result batch precedes completion event. |
| XLSX import/export (`packages/io-xlsx/src/import.ts`, `export.ts`, `progressive.ts`, `index.ts`) | Export reads sheets; import and progressive APIs mutate workbook/sheets and expose them | Export from immutable workbook snapshot; import/restore through D4.4 staged restore only | D4.4 implementation and view snapshot schema | Single/multi-sheet import does not expose partial candidate; export hashes/semantics match supported fidelity. |
| Framework adapters (`packages/{react,vue,angular,svelte}/src/*Service*`, hooks, components) | Expose raw `Workbook`/`Worksheet` and perform starter writes | Expose Workbook API with read view and explicit transaction method; standalone worksheet overload only if clearly typed | Core type migration and adapter semver/peer dependency alignment | Framework sample write uses transaction; retained adapter view follows current revision and cannot mutate owner. |
| Worker adapters (`EngineWorkerHost`, `WorkerEngineProxy`, `FormulaWorkerHost`, protocol types) | One-sheet transaction host, raw patch operations, no-op recalc in EngineWorkerHost | Workbook owner ID + transaction/revision/generation envelope; same journal owner; read snapshot protocol | Workbook coordinator, real formula result acceptance, worker protocol versioning | Foreign/revoked transaction rejected; no-op evaluator cannot pass; stale result writes/events rejected. |
| Spreadsheet SDK, collaboration and search (`SpreadsheetSDK`, `CollaborationEngine`, `FindService`) | Direct worksheet writes/patches across APIs | Explicit transaction context for user operations; private engine capability for internal calculation | Call graph and API consumer migration; collaboration conflict ordering | Multi-op apply is all-or-nothing; failed remote patch leaves committed revision unchanged. |
| Pivot, styles, drawings and metadata services | Public getters expose mutable implementations; global group store | Read-only domain facades; mutations journaled later or rejected initially; per-workbook state stores | R5 mutation-family slices and workbook-scoped ownership | Mutating a retrieved object cannot change workbook; separate workbooks remain isolated. |
| Examples, docs, scripts and test projects | Teach direct sheet mutation and mutable `getSheet()` use | Update to `transact()` for workbook-owned edits; keep explicit standalone examples | Migration guide and automated examples/type-check pass | All published examples compile under new public declarations; tests label standalone vs workbook-owned path. |
| Tests and fixtures (`packages/core/**/__tests__`, `packages/core/test`, renderer and IO tests) | Direct `Worksheet` and `getSheet()` usage spans standalone and workbook tests | Explicit helper for standalone sheet vs workbook view/transaction; no accidental cast escape | Test fixture inventory and type migration | Test discovery unchanged; retained-handle/abort tests cover every R1 surface; frozen-105 diff has no unexplained new failures. |

The R0.1 registers account for the current direct candidates and supported source-flow patterns. The implementation plan must append and disposition any newly discovered candidate, including an opaque alias or ownership flow that crosses a boundary the static scan cannot resolve; broad text search alone cannot prove that no alias escaped.

## 8. R1 entry gate

R1 implementation may be separately authorized only after this migration contract is accepted and the API owner confirms the breaking-release policy. R1 itself must remain a narrow owner-view/capability slice; it must not claim complete transaction implementation.

### 8.1 Required tests and evidence

- **Retained view isolation:** retain `WorkbookSheetView` before a transaction; during staged writes verify that the retained view and independent workbook readers continue to read the old committed revision; after commit they resolve the new revision by stable ID.
- **Transaction view:** `TransactionSheet` reads its staged changes; it cannot target another owner; after commit, abort, callback throw, and validation failure every retained transaction handle rejects before any write.
- **Raw handle rejection:** retain/acquire a raw `Worksheet`; after workbook ownership/adoption, every public mutator and raw store/drawing escape either rejects before a write or is unavailable by type/runtime. Verify no cell, graph, event, or revision mutation occurred.
- **Detached async closure:** launch a delayed continuation from the synchronous callback, return without awaiting it, and let transaction commit/abort revoke capability. When the continuation later calls a mutation method, it rejects and cannot mutate staged or committed state. Also verify the rejection is observable without turning the transaction result into a false success.
- **Nested-object isolation:** attempt to alter returned cell fields and nested comments/styles/hyperlinks/components; mutate arrays/maps/sets/drawing/query snapshots; verify committed and staged owner state is unchanged unless an explicit transaction mutator was used.
- **Service getter isolation:** retrieve pivot/style/event services and verify the public object cannot mutate backing workbook state or emit commit/result events. Separate workbooks have independent pivot group/service state.
- **Standalone compatibility:** direct `new Worksheet()` mutation, local reads, and worksheet-local recalculation retain their existing standalone contract; adopting it follows the explicitly defined revoke/detach/reject rule.
- **Unsupported operation rejection:** invoke every initially rejected operation through transaction and legacy raw handles. Assert stable error and full state equality before/after, including no journal record or observer event.
- **Public package migration:** type-check every package and example against the new declarations; verify no `as any`/cast/escape route is required to keep existing workbook mutations compiling.
- **Regression evidence:** preserve test discovery and assertion strength. Run D4.6 candidate core comparison against the frozen 105-identity set with durable raw Jest JSON and identity diff when implementation is separately authorized; no baseline recapture/reset.

### 8.2 R1 passes only when

1. No workbook-owned internal `Worksheet`, mutable service, nested live object, or valid transaction capability escapes its lifetime.
2. All inventoried source consumers are migrated or documented as standalone-only; every scan candidate is marked relevant/not relevant and unresolved alias flows are zero.
3. The read-only view remains owner-backed across state swaps; no stale proxy retargets by sheet name.
4. Unsupported workbook mutation families reject before writes, including calls through direct, renderer, command, worker, and framework paths.
5. Targeted R1 tests pass; package type/build checks pass when authorized; D4.6 regression comparison has no unexplained candidate-only failure identities and no hidden/missing tests.

R1 passing does not complete CS-001C, D4.3, worker integration, all mutation family coverage, or D4.6 overall adoption. Those are separate gates and implementation authorizations.

## 9. R0 review checklist and deferred implementation work

CS-002D4-R0.1 completed the authorized semantic reconciliation: every generated candidate has a recorded disposition, and the supported source-flow scan has no unresolved rows. The supervisory review accepted and closed R0/R0.1 for source-accounting scope on 2026-10-17. The 4,968 owner-polymorphic candidates have a conditional migration decision; they are not unresolved rows. Preserve the reconciled TSVs and their recorded SHA-256 values as audit artifacts. This closure does not prove runtime ownership or consumer migration. The original inventory remains a broad discovery scan; new candidates or opaque ownership flows found during implementation planning must be appended and dispositioned before their call sites are migrated.

Implementation work remains separate: build the owner-backed state model; wire the authoritative journal; migrate call sites; implement capability checks/revocation and immutable snapshots; add generation checkpoints/event routing; broaden transaction eligibility; then run D4.6 gates. R0 closure does not authorize R1 or any production code, tests, builds, benchmark campaign, baseline run, merge, or release. The [R1 authorization packet](CS-002D4-R1-authorization-packet.md) is prepared; API-owner approval of the breaking-release policy and supervisory authorization of the exact R1 scope remain prerequisites.

The 105-failure core identity reference remains frozen and reference-only. The experimental coordinator remains non-exported. The original nine-phase recovery roadmap remains governing.

No production code was changed. No tests, builds, benchmarks, browser/security checks, or baseline captures were run. R0.1 ran only the deterministic inventory/reconciliation generators and their output checks; all R1 implementation and runtime verification remain separately unauthorized.
