# CS-002D.4 — Cross-sheet dependencies: production integration design review

Status: **Design only.** No production code, no merge, no release authorization. This document
specifies the required integration decisions authorized by the CS-002D.2R closure review. It does
not propose copying the experimental coordinator
([`packages/core/src/experimental/WorkbookCalculationPrototype.ts`](../../packages/core/src/experimental/WorkbookCalculationPrototype.ts))
into the production path. The prototype proved behavior; its full-formula scans, range
materialization, and value-only worksheet proxy are explicitly **not** approved as the scalable
production implementation (see §9, Non-goals).

Review disposition (CS-002D.4 design review): accepted as a completed design-review **draft**;
normative identity, migration, cycle, transaction, and persistence contracts carried refinement
requirements (corrections A–F), now incorporated. The **revised** review accepted all six corrections
as design progress and requested three final specification refinements — fully normative worksheet-ID
adoption lifecycle (§1), unambiguous single cycle-finalization authority by calculation mode (§6),
and three-axis snapshot/manifest version vocabulary (§0, §5) — all incorporated in this revision.
**No implementation phase is authorized.** The next permitted activity is **design-only** D4.1
specification work — the pivot `worksheetId` producer/consumer inventory (§1a) and the exact workbook
ownership lifecycle (§1) — followed by D4.2 against the actual `FormulaContext`/`FormulaValue` types
(§2), with D4.3 remaining blocked on CS-001C.

**D4.1 authorized and delivered (design & audit only):**
[CS-002D4.1 — Identity & pivot-migration specification](CS-002D41-identity-and-pivot-migration-spec.md)
— source-grounded `worksheetId` producer/consumer inventory (each occurrence classified as sheet
name, opaque id, or fixture literal with evidence), the workbook-owned allocator + name↔id bimap,
adoption/import/stale-ID contracts, the rename/delete/restore/duplicate/import migration decision
table, legacy-record migration with explicit unresolved-reference handling, and an acceptance-test
matrix. The one open implementation-contract decision is the stale-ID policy (O1 invalidate
recommended vs. O2 reject-if-published).

Predecessors: [CS-002D.2 design + prototype](CS-002D2-cross-sheet-dependencies.md) (closed,
experimental scope). The seven decision areas below map 1:1 to the closure review's authorization
table.

---

## 0. Current production facts (verified, not assumed)

These are the load-bearing facts the design must reconcile. Each is cited to source so reviewers can
re-verify.

| Fact                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Source                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Worksheet identity is a **process-local monotonic** `ws-${nextWorksheetIdentity++}`, allocated in the constructor; `getWorksheetId()` returns it opaquely.                                                                                                                                                                                                                                                                                                                                                                | [worksheet.ts](../../packages/core/src/worksheet.ts#L84), [worksheet.ts](../../packages/core/src/worksheet.ts#L170), [worksheet.ts](../../packages/core/src/worksheet.ts#L1525)                                                                             |
| `Workbook` holds `sheets = Map<string, Worksheet>` keyed by **display name**, plus `_active?: string`. `getSheet()` resolves by **name**, not id.                                                                                                                                                                                                                                                                                                                                                                         | [workbook.ts](../../packages/core/src/workbook.ts#L21), [workbook.ts](../../packages/core/src/workbook.ts#L39)                                                                                                                                              |
| Name/id are already conflated at the boundary: pivot paths pass a field called `worksheetId` to `getSheet()`, which actually resolves names — and the field's stored values are **mixed** (one production-representative path stores a name, `worksheetId: worksheet.name`). Flagged P1 in the CS-002D progress report.                                                                                                                                                                                                   | [workbook.ts](../../packages/core/src/workbook.ts#L117), [pivot-formula-integration.test.ts](../../packages/core/__tests__/pivot-formula-integration.test.ts#L86), [docs/engineering/CS-002D-progress-report.md](../engineering/CS-002D-progress-report.md) |
| Per-worksheet DAG is `DependencyGraph` (packed `row*COL_MULT+col` keys) coordinated by `RecalcCoordinator.registerFormula(row,col,deps,ranges)`. Range watchers live in a separate `rangeDependencies` map.                                                                                                                                                                                                                                                                                                               | [DependencyGraph.ts](../../packages/core/src/dag/DependencyGraph.ts#L343), [DependencyGraph.ts](../../packages/core/src/dag/DependencyGraph.ts#L961)                                                                                                        |
| `getPrecedents()` returns **point** precedents only; value-cell range watchers are invisible to it.                                                                                                                                                                                                                                                                                                                                                                                                                       | [worksheet.ts](../../packages/core/src/worksheet.ts#L2476)                                                                                                                                                                                                  |
| Formula evaluation is `FormulaEngine.evaluate(cellRef: string, context)` with a `worksheet` in context; references are resolved textually/positionally. The prototype binds cross-sheet values by **textual substitution** + a `valueOnlyView` Proxy.                                                                                                                                                                                                                                                                     | [ARCHITECTURE.md](../../ARCHITECTURE.md#L516), [WorkbookCalculationPrototype.ts](../../packages/core/src/experimental/WorkbookCalculationPrototype.ts#L663)                                                                                                 |
| The atomic mutation pipeline is `SpreadsheetEngine.run(cb)` → `mutation → commit → schedule → evaluate → notify`; it is "the ONLY legal way to mutate state".                                                                                                                                                                                                                                                                                                                                                             | [SpreadsheetEngine.ts](../../packages/core/src/SpreadsheetEngine.ts#L260)                                                                                                                                                                                   |
| Transactions are `TransactionContext` (a `PatchRecorder` session + a first-write cell-snapshot journal). The **worksheet mutation journal is authoritative** on rollback. Single-open-transaction is enforced at `EngineWorkerHost`.                                                                                                                                                                                                                                                                                      | [TransactionContext.ts](../../packages/core/src/transaction/TransactionContext.ts#L124), [TransactionContext.ts](../../packages/core/src/transaction/TransactionContext.ts#L222)                                                                            |
| Events buffer during a transaction and coalesce into one aggregate on commit; no events fire mid-transaction.                                                                                                                                                                                                                                                                                                                                                                                                             | [worksheet.ts](../../packages/core/src/worksheet.ts#L270), [transaction-enforcement.test.ts](../../packages/core/src/__tests__/transaction-enforcement.test.ts)                                                                                             |
| Persistence is per-worksheet `WorksheetSnapshot` whose **object** `version` field is a versioned value (a decoded v1 snapshot is upgraded to **v2** by the registered upgrader), serialized by the CSEX binary codec at **`FORMAT_VERSION = 2`** (decoding v1 via a stepwise `SnapshotUpgrader`). The snapshot object version and the binary encoding version are **distinct axes**. **No workbook-level manifest exists.** Range watchers are **not** serialized; they are rebuilt from formula text on `applySnapshot`. | [SnapshotCodec.ts](../../packages/core/src/persistence/SnapshotCodec.ts#L111), [SnapshotCodec.ts](../../packages/core/src/persistence/SnapshotCodec.ts#L234), [docs/engineering/CS-002D-progress-report.md](../engineering/CS-002D-progress-report.md)      |
| The prototype uses a **separate** identity domain (`xsheet-${seq}`) and a **separate** envelope (`cybersheet-workbook-prototype` v1).                                                                                                                                                                                                                                                                                                                                                                                     | [WorkbookCalculationPrototype.ts](../../packages/core/src/experimental/WorkbookCalculationPrototype.ts#L158), [WorkbookCalculationPrototype.ts](../../packages/core/src/experimental/WorkbookCalculationPrototype.ts#L95)                                   |

**Baseline obligation carried forward:** the accepted functional baseline is **105** failures.
Future comparison runs must preserve Jest `--json` and compute identity-level diffs before any
regression conclusion (per the closure review's documented evidence limitation).

---

## 1. Sheet identity

**Required decision:** Reconcile production `ws-*` identities with prototype `xsheet-*`
identifiers; establish a single authoritative workbook-owned identity.

**Decision.** Make the **workbook** the identity authority and collapse the two domains into one.

1. Identity becomes `(Workbook instance, WorksheetId)`, where `WorksheetId` is a branded opaque
   string allocated and owned by the `Workbook`, not the `Worksheet`. Retire the prototype's
   `xsheet-*` domain entirely; do not introduce a second scheme into production.
2. The `Worksheet`'s process-local `ws-*` counter is **demoted** to a construction-time fallback for
   standalone worksheets created outside a workbook (today's default). When a worksheet is adopted
   by a workbook (`addWorksheet`, restore, import, clone), the workbook assigns the authoritative id
   and the worksheet records it. One worksheet → exactly one authoritative id for its lifetime in
   that workbook.
3. Introduce a workbook-owned **id↔name** bimap to replace the current name-only
   `Map<string, Worksheet>`. `getSheet(name)` keeps its name contract; add `getSheetById(id)` as the
   graph/binding contract. All cross-sheet bindings key on **id**; names remain mutable labels.
4. The pre-existing name/id conflation (pivot `worksheetId` → `getSheet` resolving names,
   [workbook.ts](../../packages/core/src/workbook.ts#L117)) is **not** resolved by a direct
   `getSheetById` swap in this phase. The field's stored values are currently mixed (see §1a and
   correction B), so the call site cannot be retargeted until those values are classified. This work
   is scoped to the pivot-id migration inventory (§1a) and coordinated with CS-006A, not treated as a
   cosmetic rename.

**Rules (normative — persisted, workbook-scoped IDs).** The open question is now resolved:
**IDs are persisted and workbook-scoped** (not ephemeral). Monotonic allocation; a deleted id is
never reused within a workbook instance; rename preserves id; same-object `applySnapshot` preserves
id; delete-then-recreate yields a **new** id (matching current worksheet semantics,
[CS-002D progress report](../engineering/CS-002D-progress-report.md)); importing a sheet into another
workbook **allocates a fresh id** and remaps that sheet's qualified bindings; whole-workbook
clone/restore **preserves** ids in a fresh owner with newly allocated graphs/caches/subscriptions,
and never permits an old reference to bind to a replacement sheet. Because IDs are persisted, the
workbook manifest (§5) **must** serialize them and the allocator **must** resume from the persisted
high-water mark (`nextSheetSequence`). §1 and §5 therefore share one identity contract, not two
independent assumptions.

**Adoption lifecycle for the worksheet ID (normative — single rule, refinement 1).** There is no
optional or "recommended" behavior; the lifecycle is fixed:

1. An **unowned** worksheet (constructed outside any workbook) receives its construction-time `ws-*`
   identity and keeps it for as long as it stays unowned.
2. **Adoption into a workbook** (`addWorksheet`, restore, import, clone) assigns the authoritative
   persisted workbook id **exactly once**, replacing the construction-time identity. From that point
   `getWorksheetId()` returns the workbook-authoritative id.
3. After adoption the id is **immutable**: subsequent renames and same-object `applySnapshot` cannot
   alter it. It changes only when the worksheet is imported into a _different_ workbook (which is a
   fresh adoption allocating a new id, §1 import rule).

**Stale standalone-ID handling (must not silently mis-bind).** A caller that captured the
construction-time `ws-*` id **before** adoption must not have that stale value silently continue to
resolve under the new authoritative identity. The design requires one of: (a) the pre-adoption id is
invalidated so a lookup by it fails explicitly rather than resolving the adopted sheet, or (b)
adoption is only legal for worksheets whose construction-time id has not yet been published to any
consumer. Consumers remain contractually forbidden from parsing id values
([CS-002D progress report](../engineering/CS-002D-progress-report.md)); a published id is stable for
the worksheet's lifetime in its owning workbook and only changes on import into a different workbook.
Standalone (no-workbook) worksheets retain today's `ws-*` runtime behavior unchanged.

### 1a. Pivot `worksheetId` migration inventory (correction B — required before any call-site change)

The `getSheetById` retargeting in item 4 is conditional on an evidence-based classification. The
field is demonstrably **not** uniformly an id today: at least one production-representative path
stores a **name** (`worksheetId: worksheet.name`,
[pivot-formula-integration.test.ts](../../packages/core/__tests__/pivot-formula-integration.test.ts#L86)),
while fixtures use opaque literals like `'ws1'`
([pivot-registry.test.ts](../../packages/core/__tests__/pivot-registry.test.ts#L33)). The field also
feeds partial recomputation and slicer source extraction
([PivotRecomputeEngine.ts](../../packages/core/src/PivotRecomputeEngine.ts#L63),
[workbook.ts](../../packages/core/src/workbook.ts#L39)), so a wrong reclassification would silently
break recompute, not just lookup.

Required design artifact (coordinated with CS-006A):

1. **Producer/consumer inventory** of every `worksheetId` write and read across pivot registration
   ([PivotRegistry.ts](../../packages/core/src/PivotRegistry.ts#L42)), rebuild/partial recompute
   ([PivotRecomputeEngine.ts](../../packages/core/src/PivotRecomputeEngine.ts#L63)), snapshot
   caching/serialization, slicer source extraction, and tests — classifying each occurrence as
   _stores-a-name_, _stores-an-id_, or _fixture-literal_.
2. A **migration rule** for legacy pivot records whose `worksheetId` holds a name: deterministically
   resolve the name to the workbook-authoritative id at load (or re-registration) time, with a
   defined behavior when the name no longer resolves (reject vs. mark stale).
3. Only after the inventory proves a given call site reads an id may that site be retargeted to
   `getSheetById`. Until then both `getSheet(name)` and `getSheetById(id)` coexist and the pivot
   paths keep their current resolution to avoid a behavior change.

---

## 2. Formula evaluation

**Required decision:** Replace temporary textual substitution with an AST-level (or equivalent
typed) reference-binding contract.

**Decision.** Replace string substitution with a **typed qualified-reference node** resolved through
an evaluation-context binding provider — no formula text rewriting at evaluation time.

1. Extend the parser/AST so a qualified reference (`Sheet!A1`, `'Q'!A1:B2`) parses to a typed node
   carrying `{ sheetRef, kind: cell|range, coords, inBounds }` rather than being stripped by
   `SHEET_QUALIFIED_REFERENCE` and re-injected as a literal. The `inBounds` classification the
   scanner already computes (row 0, oversized coords → `#REF!`) becomes a parse/bind-time property,
   preserving the CS-002D.2R closure guarantee that an invalid reference never creates a valid
   binding.
2. Resolution moves into the evaluation context: the engine asks a **workbook-provided binder** to
   resolve `(sheetId, coord)` to an already-computed value. The current `FormulaContext`
   ([formula-types.ts](../../packages/core/src/types/formula-types.ts#L41)) carries `worksheet`,
   `currentCell`, and lambda/recursion state but **no workbook-aware resolver**, confirming the
   extension point: add an optional workbook reference binder to `FormulaContext` rather than
   rewriting formula text. This replaces the `valueOnlyView` Proxy and the
   `renderScalar`/`renderArrayElement` literal encoders, both prototype-only shims (§9). The binder
   returns typed `FormulaValue` results, eliminating the quoting/escaping surface entirely.
3. Resolution is **value-only by contract**: because the workbook scheduler visits nodes in
   topological order (§6), the binder reads cached precedent values and never recursively evaluates a
   precedent's raw formula. This is the production-safe form of what the prototype approximated with
   a Proxy.
4. The binder must map every `FormulaValue` variant
   ([formula-types.ts](../../packages/core/src/types/formula-types.ts#L16)): scalar
   (number/string/boolean/null), **range** (1D/2D `FormulaValue[]`/`FormulaValue[][]`),
   **spreadsheet error** (`Error`), and **lazy** (`() => FormulaValue` thunk) — so a cross-sheet
   reference to a spilled array, an error cell, or a lazily-evaluated precedent is bound with the
   same semantics as a local reference. `#REF!` (missing/deleted sheet, out-of-bounds coord) and
   `#NAME?` (unrecognized name syntax) dispositions are preserved from the prototype and must be
   covered by parity tests.

**Rationale.** Textual substitution is unsafe at production scale (quoting, locale, error-literal
collisions, re-parse cost per recalc). A typed binder is O(1) per reference, carries error state
explicitly, and keeps the production expression parser authoritative.

**Scope guard.** INDIRECT/OFFSET dynamic references, whole-column/row, 3D (`Sheet1:Sheet3!A1`),
external-workbook, named ranges, and structured references remain **out of scope** and must be
designed before any of them bind cross-sheet edges.

---

## 3. Dependency ownership

**Required decision:** Specify how local DAG edges and workbook-qualified edges coexist without
conflicting invalidation.

**Decision.** **Two-tier ownership with a single invalidation entry point.**

1. **Local tier (unchanged):** each `Worksheet` keeps its `DependencyGraph` + `RecalcCoordinator`
   for same-sheet point and range edges. No duplication of local edges into the workbook tier.
2. **Qualified tier (new, workbook-owned):** a workbook index owns only **cross-sheet and
   qualified-self** edges, keyed by `(dependentSheetId, dependentKey) → qualified precedents`. This
   is the production evolution of the prototype `depModel.qualified`, but it must **not** re-derive
   local edges by scanning formula text (the prototype's `localCells`/`localRanges` duplication
   existed only to work around `getPrecedents` being point-only — §9). Instead, the qualified tier
   reuses the local `RecalcCoordinator`'s authoritative edge set for same-sheet dependencies.
3. **Range watchers:** qualified range precedents are registered as **compact rectangles** (the same
   representation as `DependencyGraph.rangeDependencies`,
   [DependencyGraph.ts](../../packages/core/src/dag/DependencyGraph.ts#L343)), **not** materialized
   per cell. The prototype's per-cell `targetKeys` scan
   ([WorkbookCalculationPrototype.ts](../../packages/core/src/experimental/WorkbookCalculationPrototype.ts#L601))
   is a correctness device, not a production query path. **Minimal correct integration** (§7) may
   reuse bounded rectangle membership, but **performance-certified default adoption** requires an
   indexed rectangle query (see §6 and correction F); the two adoption tiers must not be conflated.
4. **Single invalidation entry point:** a worksheet mutation dirties (a) its local dependents via the
   local coordinator and (b) cross-sheet dependents via the workbook index, in that order, through
   **one** workbook-level `notifyChanged(sheetId, row, col)`. Derived (`origin: "formula-result"`)
   writes must transitively dirty cross-sheet readers (CS-002D.2R Finding E) — the design must keep
   that propagation while respecting the user-mutation journal exclusion.

**Invariant.** No cell participates in both tiers for the _same_ edge. Local edges are owned locally;
qualified edges are owned by the workbook. Invalidation order is deterministic and idempotent.
Cycle _finalization_, however, is **not** split between tiers — see §6: a single workbook authority
commits every cyclic result exactly once, because an SCC may contain both local and cross-sheet
edges.

---

## 4. Transactions

**Required decision:** Integrate cross-sheet changes with CS-001C's authoritative mutation journal
and event atomicity.

**Decision.** Cross-sheet changes flow through the **existing** transaction machinery, not a parallel
one.

1. The prototype's synchronous snapshot/rollback `transaction()` is a reference boundary and is
   **not** promoted. Production cross-sheet mutations must execute inside the authoritative pipeline
   (`SpreadsheetEngine.run` → `TransactionContext`,
   [SpreadsheetEngine.ts](../../packages/core/src/SpreadsheetEngine.ts#L260),
   [TransactionContext.ts](../../packages/core/src/transaction/TransactionContext.ts#L124)).
2. **Multi-sheet atomicity gap (must be designed):** today `TransactionContext` and the recorder are
   scoped to a **single** `Worksheet` ([TransactionContext.ts](../../packages/core/src/transaction/TransactionContext.ts#L139)),
   and `EngineWorkerHost` enforces one open transaction over one worksheet. A cross-sheet edit that
   changes sheet A and dirties a formula on sheet B needs a **workbook-scoped** transaction envelope
   that (a) opens per-worksheet recorders, (b) commits/rolls back all of them atomically (LIFO
   inverse application per sheet), and (c) coalesces events into a single workbook-level aggregate.
   This is the central new transactional contract and must be specified against CS-001C before any
   code.
3. **Event atomicity:** preserve "no events mid-transaction, one aggregate on commit"
   ([worksheet.ts](../../packages/core/src/worksheet.ts#L270)) at the **workbook** level — buffer all
   participating worksheets' events and publish one coalesced workbook event after the cross-sheet
   recalc completes.
4. **Recalc-once:** recalculation runs exactly once after commit/rollback (as the worker host already
   does for a single sheet, [EngineWorkerHost.ts](../../packages/core/src/worker/EngineWorkerHost.ts#L221)),
   extended to drain the workbook dirty set across sheets.
5. Async callbacks remain rejected (synchronous-only), consistent with both the engine and the
   prototype.

**Normative sequence (correction D).** A workbook transaction must execute in exactly this order,
for both success and failure, so that an aborted transaction never publishes transient calculated
values:

1. **Stage & validate** the complete multi-sheet mutation across all participating worksheets while
   events remain buffered (no mid-transaction emission,
   [worksheet.ts](../../packages/core/src/worksheet.ts#L270)).
2. **Commit or roll back atomically** — all participating worksheets succeed together, or all are
   reverted together (LIFO inverse application per sheet via each sheet's authoritative journal,
   [TransactionContext.ts](../../packages/core/src/transaction/TransactionContext.ts#L222)). There is
   no partial-commit state.
3. **Rebuild/update affected dependency registrations** (local edges via each `RecalcCoordinator`;
   qualified edges via the workbook index) from the now-committed formula text.
4. **Recalculate the resulting committed state exactly once**, draining the workbook dirty set across
   sheets.
5. **Publish only the permitted, coalesced events** — one workbook-level aggregate.

**Failure/rollback precision.** "Recalc exactly once after commit/rollback" is **not** symmetric: on
rollback, recalculation may be required to restore **cache consistency** to the pre-transaction
committed state, but it must run against the restored inputs only and must **never** expose the
aborted transaction's intermediate calculated results. A failed transaction publishes either no
event or an event describing solely the reversion to prior committed state — never transient values
produced inside the aborted scope.

**Dependency.** This area is **blocked on CS-001C** owning the authoritative journal contract; the
workbook transaction envelope must be an extension of it, not a competitor. The normative sequence
above is an architectural requirement, not an implemented guarantee.

---

## 5. Persistence

**Required decision:** Define versioned workbook manifests, ID migration, clone/import behavior, and
compatibility with existing snapshots.

**Decision.** Introduce a **versioned workbook manifest** wrapping existing per-worksheet
`WorksheetSnapshot`s; do not change the worksheet snapshot format.

**Version vocabulary (correction E, refinement 3 — three distinct axes).** Three independent version
numbers exist and must never be conflated:

- The **worksheet snapshot _object_ version** — the `WorksheetSnapshot.version` field
  ([SnapshotCodec.ts](../../packages/core/src/persistence/SnapshotCodec.ts#L111)). This is a
  **versioned object field, not a constant**: a freshly produced snapshot carries the current object
  version, and a decoded **v1** snapshot is **upgraded to v2** by the registered upgrader (its
  `version` field becomes `2`). Describing it as unconditionally `1` is incorrect; the design must
  treat it as a value that an upgrader advances.
- The **CSEX _binary encoding_ version** — `FORMAT_VERSION = 2`
  ([SnapshotCodec.ts](../../packages/core/src/persistence/SnapshotCodec.ts#L234)), which encodes at
  v2 and decodes v1 through its registered `SnapshotUpgrader` pipeline.
- The **workbook _manifest_ version** — introduced by this design (`manifestVersion` below), evolving
  independently of both worksheet axes.

A document must always state which of the three it means.

1. **Manifest shape.** `{ format: "cybersheet-workbook", manifestVersion, nextSheetSequence,
sheets: [{ id, name, payloadVersion, payloadLength, state }], order }`. This generalizes the
   prototype envelope
   ([WorkbookCalculationPrototype.ts](../../packages/core/src/experimental/WorkbookCalculationPrototype.ts#L95))
   but uses the reconciled, **persisted** production id scheme (§1). Embedding the existing CSEX
   `WorksheetSnapshot` payload is a **proposed packaging choice, not automatic backward
   compatibility**: the manifest therefore defines its **own envelope/framing** — explicit per-sheet
   `payloadLength` and `payloadVersion` (the CSEX binary version of each embedded blob) — so a reader
   can frame, length-check, and version-dispatch each worksheet payload without guessing. The
   manifest reader and the worksheet decoder evolve on independent version axes.
2. **Qualified edges are derived, not serialized.** As in the local DAG (range watchers rebuilt from
   formula text on `applySnapshot`), cross-sheet edges are **rebuilt from formula text after all
   sheets are installed** (the prototype's deterministic second-pass bind). The manifest's trusted
   relationship data is _formula text + the persisted id + the id↔name table_; no mutable adjacency
   map is persisted or trusted.
3. **Validation before exposure.** Reject unknown manifest versions, malformed/duplicate ids,
   duplicate names, inconsistent sequence counters, mismatched `payloadLength`, unsupported
   `payloadVersion`, and invalid worksheet coordinates **before** publishing a restored workbook —
   staging every worksheet through `applySnapshot` first (the prototype's Finding-C two-pass restore,
   promoted as a hard requirement).
4. **ID migration.** Define a `SnapshotUpgrader`-style stepwise pipeline at the **workbook** layer
   (mirroring the per-worksheet one, [SnapshotCodec.ts](../../packages/core/src/persistence/SnapshotCodec.ts#L148))
   for manifest versions. For legacy inputs with **no manifest** (loose `WorksheetSnapshot`s), define
   a deterministic adoption path that allocates persisted ids, resumes `nextSheetSequence`, and
   records provenance. This path, plus the pivot `worksheetId` name→id migration (§1a), must land
   before any full-fidelity claim.
5. **Clone vs import.** Clone/restore preserves persisted ids in a fresh owner with newly allocated
   graphs/caches/subscriptions. Import into an existing workbook allocates fresh ids and remaps that
   sheet's qualified bindings (§1). Both must be covered by round-trip and binding-integrity tests,
   including the invalid/duplicate-id and name-collision rejection cases.
6. **Fidelity caveat (no full-fidelity claim yet).** The prototype validated JSON round-trips for
   fixtures only. Before claiming full-fidelity workbook persistence, the manifest must (a) version or
   explicitly exclude the sections existing worksheet snapshots omit (pivots, charts, data
   validation, protection, named ranges), (b) resolve legacy no-manifest inputs, and (c) define
   rejection behavior for invalid or duplicate ids. Until all three are specified, persistence is
   "minimal correct," not "full fidelity."

---

## 6. Scheduling

**Required decision:** Preserve deterministic cycle commitment, cached-value ordering, and event
delivery across worksheet and engine entry points.

**Decision.** A **workbook-level deterministic scheduler** composes per-sheet schedulers; it does not
replace them.

1. **Topological order across sheets.** Build a transient workbook scheduling view from local
   precedents (owned by each `RecalcCoordinator`) plus qualified precedents (workbook tier), and emit
   a deterministic topological order (stable tiebreak by `(sheetId, packKey)`, as the prototype's
   Kahn-by-dependentKey does).
2. **Cycle commitment — single workbook authority (correction C, refinement 2).** Cycle
   classification and result commitment are owned by **exactly one** scheduler per calculation,
   selected by calculation mode, so two finalization paths can never coexist in one pass:
   - **Workbook-coordinated calculation:** the **workbook scheduler** owns _all_ cycle classification
     and result commitment for that pass. It builds one effective dependency relation (local edges
     supplied by each `RecalcCoordinator` plus qualified edges from the workbook tier) and commits
     each cyclic formula result exactly once. Local schedulers may supply graph data and execute
     independent, non-cyclic work, but **must not** finalize any cycle during a workbook pass —
     including a purely-local SCC — because an SCC can contain both local and cross-sheet edges.
   - **Standalone worksheet calculation** (no workbook coordinating the pass): the local
     `RecomputeScheduler`
     ([RecomputeScheduler.ts](../../packages/core/src/RecomputeScheduler.ts#L292)) retains its
     existing authority unchanged.

   Mode is determined by who drives the pass (the single-entry-point rule, item 6 below), not by the
   shape of any individual cycle.

3. **SCC members vs. blocked descendants.** Both an actual SCC member and a node merely downstream of
   a cycle may receive `#CIRC!`, but the design must **distinguish** them: diagnostics must identify
   true SCC membership and must not falsely label every blocked descendant as a cycle member. The
   prototype's Kahn pass conflates them (everything not emitted is "cyclic"); production must separate
   "is in a cycle" from "is blocked by a cycle."
4. **Cached-value ordering.** Precedents hold computed values before dependents evaluate (§2's
   value-only binder). This replaces the `valueOnlyView` Proxy with an ordering guarantee.
5. **Event delivery.** Reuse the derived-result batching boundary
   (`beginFormulaResultEventBatch`/`endFormulaResultEventBatch`,
   [worksheet.ts](../../packages/core/src/worksheet.ts#L363)) across all participating worksheets;
   clear the dirty set **before** flushing deferred results so listener edits remain dirty for the
   next pass (prototype-proven ordering).
6. **Single entry point.** Cross-sheet recalc must be driven by the workbook coordinator; independent
   per-sheet `autoRecalculate()` cannot guarantee workbook order/event semantics.

**Minimal correct vs. performance-certified (correction F).** This section's **correctness** contract
(single cycle authority, deterministic order, exactly-once commitment) is required for _any_
integration. The **scalability** mechanisms — indexed rectangle queries, incremental SCC maintenance,
worker scheduling, async functions, cancellation — are required only for **performance-certified
default adoption** and are **later work**. Full scans are ruled out for scalable production, but
nothing here asserts an indexed design already exists; §3's rectangle-query requirement is an
adoption target, not an available implementation.

---

## 7. Adoption gates

**Required decision:** Require existing functional identities, XLSX, coordinate, cycle, patch,
transaction, and controlled performance verification.

No production merge is permitted until **all** gates below pass with preserved evidence.

| Gate                | Requirement                                                                                                                                                                                                                                                                                                                  | Evidence                                                                             |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Functional baseline | The **105** functional-failure identity set is unchanged (identity-level diff, not count).                                                                                                                                                                                                                                   | Jest `--json` with/without the change; preserved raw JSON + identity diff.           |
| XLSX                | Import/export round-trips unaffected for single- and multi-sheet workbooks.                                                                                                                                                                                                                                                  | XLSX suite green; sample round-trip fixtures.                                        |
| Coordinate          | Out-of-bounds and invalid coordinates resolve to `#REF!` with no graph binding (CS-002D.2R closure parity).                                                                                                                                                                                                                  | Coordinate + qualified-ref parity tests.                                             |
| Cycle               | Local, cross-sheet, and mixed-tier cycles (incl. self-edges) commit to `#CIRC!` exactly once; true SCC members are distinguished from blocked descendants.                                                                                                                                                                   | Cycle suite incl. new mixed-tier + SCC-membership cases.                             |
| Patch               | Patch algebra invertibility holds across cross-sheet edits.                                                                                                                                                                                                                                                                  | `fuzz-patch-algebra` + multi-sheet extension.                                        |
| Transaction         | Workbook-scoped commit/rollback is atomic across sheets; one aggregate event; recalc-once; **no transient values published on abort**.                                                                                                                                                                                       | Transaction + fuzz-transaction multi-sheet extension.                                |
| Performance         | Records **workload sizes, memory, evaluation counts, runtime distributions, and acceptable thresholds**. The two timing-flaky benchmarks are **measured and reported** (not silently excluded); they are tracked separately from deterministic correctness and must not pass/fail-gate on their current unstable thresholds. | Benchmark runs with full workload metadata + runtime distributions; variance report. |

Each gate must preserve its raw artifacts; conclusions are drawn from identity-level diffs, never
from aggregate counts.

---

## 8. Phasing (design artifacts only — no code authorized)

All phases below are **proposed** design artifacts. None is authorized for production implementation.
The review prioritizes D4.1 (pivot-ID inventory), D4.5 (unified cycle authority), and the D4.3
CS-001C dependency as the next permitted design-only refinements.

1. **D4.1 Identity & ownership spec** (§1, §1a, §3): workbook-scoped **persisted** id authority,
   id↔name bimap, two-tier edge ownership, and the \*\*pivot `worksheetId` producer/consumer inventory
   - name→id migration rule\*\* (coordinated with CS-006A). _Blocks everything else; the pivot
     inventory blocks any call-site retargeting._ **Delivered:**
     [CS-002D4.1 specification](CS-002D41-identity-and-pivot-migration-spec.md).
2. **D4.2 Typed binding contract** (§2): define the binder interface against the **actual**
   `FormulaContext` and `FormulaValue` types
   ([formula-types.ts](../../packages/core/src/types/formula-types.ts#L16)) — adding a workbook
   reference resolver to `FormulaContext` and specifying scalar, range (1D/2D), spreadsheet-error
   (`Error`), and lazy (`() => FormulaValue` thunk) binding behavior; plus the `#REF!`/`#NAME?`
   parity matrix. _Depends on D4.1._
3. **D4.3 Workbook transaction envelope** (§4): extension of CS-001C; multi-sheet atomicity, the
   normative stage→commit→rebuild→recalc→publish sequence, and the no-transient-values-on-abort
   guarantee. _Blocked on CS-001C._
4. **D4.4 Workbook manifest & migration** (§5): three-axis version vocabulary, own envelope/framing
   (per-sheet `payloadLength`/`payloadVersion`), validation, clone/import, upgrader pipeline, legacy
   no-manifest adoption.
5. **D4.5 Workbook scheduler** (§6): single cross-tier cycle authority, SCC-member vs.
   blocked-descendant distinction, deterministic order + delivery.
6. **D4.6 Adoption gate harness** (§7): identity-diff tooling (closes the preserved-JSON evidence
   gap) and the performance-metrics schema (workload sizes, memory, evaluation counts, runtime
   distributions, thresholds) before any integration lands.

---

## 9. Non-goals and explicitly rejected carry-overs

The following prototype mechanisms **must not** be promoted as-is; they proved behavior but are not
the production implementation:

- **Full-formula scans** to find dependents (`propagateDirty` iterating `depModel`,
  [WorkbookCalculationPrototype.ts](../../packages/core/src/experimental/WorkbookCalculationPrototype.ts#L417))
  — replace with indexed queries.
- **Range materialization** (per-cell `targetKeys` membership tests,
  [WorkbookCalculationPrototype.ts](../../packages/core/src/experimental/WorkbookCalculationPrototype.ts#L601))
  — replace with compact rectangle watchers + indexed rectangle queries (§3).
- **Value-only worksheet Proxy** (`valueOnlyView`,
  [WorkbookCalculationPrototype.ts](../../packages/core/src/experimental/WorkbookCalculationPrototype.ts#L1090))
  and **textual literal substitution** (`renderScalar`/`renderArrayElement`) — replace with the typed
  binder (§2).
- **Local-edge re-derivation** in the coordinator's dependency model — reuse the authoritative local
  `RecalcCoordinator` edges instead (§3).
- The **`xsheet-*`** id domain and the **`cybersheet-workbook-prototype`** envelope — superseded by
  the reconciled production id scheme and `cybersheet-workbook` manifest (§1, §5).

The experimental coordinator remains **non-exported and opt-in**. CS-002D.2R is closed for the
experimental scope. CS-002D.3, broader CS-002 architecture, and other release-blocking workstreams
remain open. No commit, production merge, or release authorization is granted by this document.
