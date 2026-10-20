# CS-002D4.1 — Identity & pivot-migration specification

Status: **Design & audit only (P0 architecture dependency).** No production code, no runtime
integration, no merge. This specification is the authorized D4.1 deliverable under
[CS-002D.4](CS-002D4-production-integration-design.md): a source-grounded `worksheetId`
producer/consumer inventory, the workbook-owned identity contract, the worksheet
adoption/import/stale-ID rules, the legacy pivot-record migration, and an acceptance-test matrix.
It does **not** replace any `getSheet(name)` call with `getSheetById(id)` — those call sites are
classified here first, as required, and coordinated with CS-006A.

Deliverable contents (per the authorization):

- §1 Source-location inventory of every `worksheetId` producer/consumer, each classified with
  evidence as **sheet name**, **opaque ID**, or **fixture literal**.
- §2 The central ambiguity and the latent defect it already causes.
- §3 Proposed API / type contracts (allocator, name↔ID bimap, adoption/import/stale-ID).
- §4 Migration decision table (rename, delete, restore, duplicate names, import).
- §5 Legacy pivot-record migration + failure handling for unresolved references.
- §6 Acceptance-test matrix.
- §7 CS-006A coordination and non-goals.

---

## 0. Current identity surface (verified facts)

| Fact                                                                                                                                                                                                                                                            | Source                                                                                                                |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `Workbook.sheets` is `Map<string, Worksheet>` keyed by **display name**; `getSheet(name)` is a pure name lookup.                                                                                                                                                | [workbook.ts](../../packages/core/src/workbook.ts#L22), [workbook.ts](../../packages/core/src/workbook.ts#L489)       |
| `addSheet(name, …)` constructs `new Worksheet(name, rows, cols, formulaEngine, this)` and stores it under **name**. The workbook does **not** assign or pass any identity; the worksheet keeps its construction-time `ws-*` id, which the workbook never reads. | [workbook.ts](../../packages/core/src/workbook.ts#L410)                                                               |
| Worksheet identity is the process-local monotonic `ws-${nextWorksheetIdentity++}`, exposed by `getWorksheetId()`. It is **never** used as the workbook's map key.                                                                                               | [worksheet.ts](../../packages/core/src/worksheet.ts#L170), [worksheet.ts](../../packages/core/src/worksheet.ts#L1525) |
| `renameSheet(old,new)` mutates `ws.name` and rebuilds the **name-keyed** map. It does **not** update any `pivot.worksheetId`, anchor-index key, or invalidation subscription key.                                                                               | [workbook.ts](../../packages/core/src/workbook.ts#L454)                                                               |
| `deleteSheet(name)` removes the name key only. It does **not** unregister or invalidate pivots whose `worksheetId` referenced that sheet.                                                                                                                       | [workbook.ts](../../packages/core/src/workbook.ts#L432)                                                               |
| `PivotMetadata.worksheetId: string` is documented as "Which worksheet owns this pivot" but its domain (name vs id) is unspecified.                                                                                                                              | [PivotRegistry.ts](../../packages/core/src/PivotRegistry.ts#L41)                                                      |
| The `PivotAnchorIndex` key is `"sheetId:row:col"`, and its own doc example is `"Sheet1:5:3"` — i.e. a **name** used as the sheet discriminator.                                                                                                                 | [PivotAnchorIndex.ts](../../packages/core/src/PivotAnchorIndex.ts#L33)                                                |

---

## 1. `worksheetId` producer / consumer inventory

### 1.1 Consumers (reads) — what the value must be to work

| #   | Site                                                    | Operation on `worksheetId`                                                   | Domain the code **requires**                             | Evidence                                                                                                                               |
| --- | ------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | `Workbook.buildPivot(pivotId, config, worksheetId)`     | `this.getSheet(worksheetId)`; throws `Worksheet '…' not found` if unresolved | **NAME** (name-keyed `getSheet`)                         | [workbook.ts](../../packages/core/src/workbook.ts#L116)                                                                                |
| C2  | `PivotRecomputeEngine` source-data extractor (injected) | `(worksheetId, range) => this.getSheet(worksheetId)`                         | **NAME**                                                 | [workbook.ts](../../packages/core/src/workbook.ts#L39), [PivotRecomputeEngine.ts](../../packages/core/src/PivotRecomputeEngine.ts#L73) |
| C3  | `Workbook.getSlicerDistinctValues`                      | `this.getSheet(pivot.worksheetId)`; throws if unresolved                     | **NAME**                                                 | [workbook.ts](../../packages/core/src/workbook.ts#L319)                                                                                |
| C4  | `PivotRegistry.list(worksheetId?)`                      | equality filter `p.worksheetId === worksheetId`                              | **opaque token** (any stable string; never dereferenced) | [PivotRegistry.ts](../../packages/core/src/PivotRegistry.ts#L214)                                                                      |
| C5  | `PivotBuilder` type signature                           | passes `worksheetId` straight to C1                                          | **NAME** (transitively)                                  | [PivotRecomputeEngine.ts](../../packages/core/src/PivotRecomputeEngine.ts#L63)                                                         |

### 1.2 Producers (writes) — what each actually stores

| #   | Site                                                                        | Stored value                                                          | Classification                                                                                                                    | Evidence                                                                                                                                                                                                                                                 |
| --- | --------------------------------------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1  | `Workbook.createPivot(name, worksheetId, config)`                           | forwards caller's `worksheetId` to `register` **and** to `buildPivot` | **NAME required** (else C1 throws at create)                                                                                      | [workbook.ts](../../packages/core/src/workbook.ts#L349)                                                                                                                                                                                                  |
| P2  | `pivot-formula-integration.test.ts` registration                            | `worksheetId: worksheet.name`                                         | **SHEET NAME** (production-representative)                                                                                        | [pivot-formula-integration.test.ts](../../packages/core/__tests__/pivot-formula-integration.test.ts#L86)                                                                                                                                                 |
| P3  | `workbook-pivot-integration.test.ts` registrations (×7)                     | `worksheetId: ws.getWorksheetId()`                                    | **OPAQUE ID** (`ws-*`)                                                                                                            | [workbook-pivot-integration.test.ts](../../packages/core/__tests__/workbook-pivot-integration.test.ts#L39)                                                                                                                                               |
| P4  | `pivot-registry.test.ts`, `pivot-staleness.test.ts`, `getpivotdata.test.ts` | `worksheetId: 'ws1'`                                                  | **FIXTURE LITERAL** (neither a real id nor a real sheet name; only used with C4-style equality/registry CRUD, never dereferenced) | [pivot-registry.test.ts](../../packages/core/__tests__/pivot-registry.test.ts#L33), [pivot-staleness.test.ts](../../packages/core/__tests__/pivot-staleness.test.ts#L43), [getpivotdata.test.ts](../../packages/core/__tests__/getpivotdata.test.ts#L42) |

### 1.3 The adjacent "sheetId" discriminator (GETPIVOTDATA / anchors)

A second, related identifier flows through the anchor path and must be classified alongside
`worksheetId` because D4.1 unifies identity:

| #   | Site                                                                                   | Value used as "sheetId"                                | Classification                             | Evidence                                                                                                                        |
| --- | -------------------------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| A1  | `GETPIVOTDATA` formula                                                                 | `workbook.resolvePivotAt(addr, worksheet.name)`        | **NAME**                                   | [exotic-functions.ts](../../packages/core/src/functions/exotic/exotic-functions.ts#L190)                                        |
| A2  | `Workbook.resolvePivotAt(address, sheetId)` → `pivotAnchorIndex.get(address, sheetId)` | pass-through                                           | **NAME** (from A1)                         | [workbook.ts](../../packages/core/src/workbook.ts#L168)                                                                         |
| A3  | `Workbook.setPivotAnchor(pivotId, anchor, sheetId)` → `pivotAnchorIndex.set(...)`      | caller-supplied; index key `"sheetId:row:col"`         | **NAME** (must match A1 for lookup to hit) | [workbook.ts](../../packages/core/src/workbook.ts#L182), [PivotAnchorIndex.ts](../../packages/core/src/PivotAnchorIndex.ts#L33) |
| A4  | Phase 30b invalidation subscription                                                    | `pivotInvalidationEngine.observeWorksheet(ws.name, …)` | **NAME**                                   | [workbook.ts](../../packages/core/src/workbook.ts#L120)                                                                         |

**Summary classification.** `worksheetId` is **genuinely polymorphic today**: every _dereferencing_
consumer (C1–C3, C5) requires a **name**; the only id-storing producer (P3) is safe _only_ because
its tests exercise registry CRUD/equality (C4) and anchor lookups keyed independently by name — not
`buildPivot`. Fixture literals (P4) work for the same reason. The anchor/GETPIVOTDATA path (A1–A4)
is uniformly **name-as-sheetId**.

---

## 2. Central ambiguity and the latent defect

1. **Dereference requires name; one producer stores an id.** If any `getWorksheetId()`-sourced
   `worksheetId` (P3) ever reached `buildPivot` (C1), `getSlicerDistinctValues` (C3), or the
   recompute extractor (C2), `getSheet` would return `undefined` and the code throws
   `Worksheet '<ws-…>' not found`. The current suite avoids this only because those fixtures never
   drive a rebuild through C1–C3. This is a **latent correctness defect**, not a cosmetic naming
   issue — it is exactly why the review forbade a blind `getSheetById` swap.
2. **Rename breaks name-stored references.** `renameSheet` (0.§) does not update `pivot.worksheetId`,
   so a pivot registered with `worksheet.name` (P2) becomes **dangling** after a rename: C1/C3 then
   throw. A pivot registered with the opaque id (P3) survives rename conceptually but is
   **unresolvable** by the name-keyed `getSheet`. Neither domain is currently correct across rename.
3. **Delete leaves orphans.** `deleteSheet` does not unregister dependent pivots or clear their
   anchors; a subsequent rebuild throws, and a later same-name sheet could silently re-bind a
   name-stored `worksheetId` to a different worksheet.
4. **Anchors use name-as-id.** A1–A4 use `worksheet.name` as the anchor discriminator, so a rename
   also silently invalidates GETPIVOTDATA resolution (the set-time key no longer matches the
   get-time key).

**Conclusion.** The field must be migrated to a single **workbook-authoritative persisted ID** domain
(CS-002D.4 §1), with a name→ID resolution at the boundary and lifecycle hooks on rename/delete. No
call site may be retargeted until its stored values are reclassified per §1 and migrated per §5.

---

## 3. Proposed API / type contracts (design only)

> These are proposed shapes for the D4.1 contract. None is authorized for implementation.

### 3.1 Workbook-owned ID allocator

```
type WorksheetId = string & { readonly __brand: 'WorksheetId' }; // opaque; never parsed

interface WorksheetIdAllocator {
  allocate(): WorksheetId;        // monotonic; never reuses a freed id within this workbook
  highWaterMark(): number;        // persisted as manifest `nextSheetSequence` (CS-002D.4 §5)
  resume(from: number): void;     // restore allocator after load; must be > max persisted id
}
```

- Monotonic, workbook-scoped, **persisted** (CS-002D.4 §1). A deleted id is never reused within the
  same workbook instance.
- Distinct from the worksheet's construction-time `ws-*` counter, which remains only the
  standalone/unowned fallback.

### 3.2 Name↔ID bimap (lookup contract)

```
interface SheetDirectory {
  byId(id: WorksheetId): Worksheet | undefined;      // new graph/binding contract
  byName(name: string): Worksheet | undefined;       // preserves today's getSheet(name)
  idOf(name: string): WorksheetId | undefined;       // boundary name→id resolution
  nameOf(id: WorksheetId): string | undefined;
  rename(id: WorksheetId, newName: string): void;    // updates name side only; id stable
  add(ws: Worksheet, id: WorksheetId): void;
  remove(id: WorksheetId): void;
}
```

- `getSheet(name)` keeps its exact current behavior (C-grade compatibility). `getSheetById(id)` is
  **added**, not substituted. Both coexist until §5 migration reclassifies each consumer.
- All cross-sheet bindings and pivot ownership key on **id**; names remain mutable labels.

### 3.3 Adoption, import, and stale-ID policy

Adoption lifecycle is the single normative rule from CS-002D.4 §1 (refinement 1):

1. Unowned worksheet → construction-time `ws-*` id.
2. Adoption into a workbook (`addSheet`/restore/import/clone) → allocator assigns the authoritative
   `WorksheetId` **exactly once**; thereafter `getWorksheetId()` returns it.
3. Post-adoption the id is **immutable** across rename and same-object `applySnapshot`; it changes
   only on import into a _different_ workbook (a fresh adoption).

**Stale-ID decision required (the one open D4.1 contract item the review flagged).** CS-002D.4 §1
permits two behaviors for a caller that captured the pre-adoption `ws-*` id; D4.1 must pick **one**
and specify its failure semantics:

| Option                            | Behavior                                                                                   | Failure semantics                                                                                     | Trade-off                                                                 |
| --------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **O1 — Invalidate** (recommended) | Adoption invalidates the pre-adoption id; lookups by it fail explicitly.                   | `byId(staleId)` returns `undefined`; callers must re-resolve via `idOf(name)`. No silent mis-binding. | One-time breakage for any pre-adoption capture; simplest to reason about. |
| **O2 — Reject-if-published**      | Adoption is only legal while the construction-time id has not been handed to any consumer. | `adopt()` throws `IdentityAlreadyPublished` if the id was observed.                                   | Requires tracking id publication; stricter but higher bookkeeping cost.   |

Recommendation: **O1**, because publication tracking (O2) is itself error-prone and the explicit
`undefined` on a stale lookup is the safest default. Final selection is the authorized D4.1 decision.

**Decision (recorded — CS-002D4.1 review).** **O1 is selected and normative.** Adoption explicitly
invalidates the pre-adoption `ws-*` id; a lookup by a stale pre-adoption id **must fail
deterministically** (`byId(staleId)` → `undefined`) and **must never** silently forward to the
adopted worksheet. Required conditions on O1:

1. Adoption occurs only through a **controlled workbook API** (`addSheet`/restore/import/clone) — the
   single place that allocates the authoritative `WorksheetId` and invalidates the prior id.
2. Stale lookups fail deterministically and observably; callers recover by re-resolving the current
   id via `idOf(name)`. There is no fallback that resolves a stale id to the adopted sheet.
3. This is locked by acceptance test **T10 (O1 branch)**: `byId(stale)` returns `undefined` after
   adoption. The O2 branch is retired.

### 3.4 Pivot ownership field

- `PivotMetadata.worksheetId` is re-specified to hold a **`WorksheetId`** (not a name, not a free
  string). Introduce the typed field behind the migration in §5; keep the equality-only consumer
  (C4) working unchanged since it never dereferences.
- The anchor discriminator (A1–A4) migrates from `worksheet.name` to `WorksheetId` in lockstep, so
  set-time and get-time keys remain a matched pair across rename.

---

## 4. Migration decision table (deterministic lifecycle behavior)

| Event                              | Required deterministic behavior                               | Pivot `worksheetId`                                                                      | Anchor key                             | Notes                                                                           |
| ---------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------- |
| **Rename**                         | id is stable; only the name label changes                     | **unchanged** (keyed by id)                                                              | **unchanged** (keyed by id)            | fixes defect §2.2/§2.4 — rename no longer breaks pivots or GETPIVOTDATA         |
| **Delete**                         | dependent pivots are deterministically handled before removal | pivots on the deleted id are **unregistered** (or explicitly marked unresolved — see §5) | anchors for the deleted id **removed** | no orphan rebuild; a later same-name sheet gets a **new** id and cannot re-bind |
| **Restore (clone/whole-workbook)** | persisted ids preserved in a fresh owner                      | **preserved**                                                                            | rebuilt from preserved ids             | graphs/caches/subscriptions newly allocated (CS-002D.4 §1, §5)                  |
| **Duplicate names**                | rejected before exposure                                      | n/a (rejected)                                                                           | n/a                                    | manifest validation rejects duplicate names and duplicate ids (CS-002D.4 §5)    |
| **Import into another workbook**   | fresh id allocated; bindings remapped                         | **reassigned** to the new id                                                             | re-keyed to new id                     | old references must not resolve in the new owner (stale-ID policy §3.3)         |

---

## 5. Legacy pivot-record migration & unresolved-reference handling

**Migration rule (name→id, deterministic).** On load of any pivot record whose `worksheetId` is not a
recognized `WorksheetId`:

1. Classify per §1: if the value equals a current sheet **name**, resolve it through `idOf(name)` to
   the authoritative `WorksheetId` and rewrite the record.
2. If the value is an opaque `ws-*` token (P3-style) that matches an adopted worksheet's recorded
   construction-time id, map it to that worksheet's authoritative `WorksheetId`.
3. If the value is a **fixture literal** (P4) with no matching sheet, it is a non-production artifact;
   migration tooling flags it and leaves it to the test to update (these records never reach C1–C3).

**Unresolved-reference failure handling (must be explicit, not a silent throw).** When a
`worksheetId` cannot be resolved at migration or at consume time, the contract is:

- **At migration:** reject the manifest with a precise diagnostic (`unresolved pivot worksheet
reference '<value>' for pivot '<id>'`) **before** exposing restored state — consistent with the
  CS-002D.4 §5 validate-before-exposure requirement.
- **At query/rebuild time (post-migration, e.g. the referenced sheet was deleted):** the pivot is
  marked **unresolved** and its snapshot query returns a deterministic `#REF!` (matching the existing
  "missing snapshot → `#REF!`" behavior, [PivotSnapshotStore.ts](../../packages/core/src/PivotSnapshotStore.ts#L67)),
  rather than throwing `Worksheet '…' not found` as C1/C3 do today.

**Coordination.** Because this changes `PivotMetadata` and the anchor key domain, it is executed
**with CS-006A**, not as a standalone rename. No `getSheet(name)` call site (C1–C3) is retargeted to
`getSheetById` until its producer set is proven id-valued by the §1 inventory and migrated by this
rule.

---

## 6. Acceptance-test matrix (design targets — not yet authorized to implement)

| ID  | Scenario                                                   | Expected outcome                                                                                   |
| --- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| T1  | Register pivot via `createPivot`, then `renameSheet`       | pivot remains resolvable; rebuild succeeds; value unchanged (defect §2.2 fixed)                    |
| T2  | GETPIVOTDATA against an anchored pivot, then `renameSheet` | resolution still hits (anchor keyed by id, defect §2.4 fixed)                                      |
| T3  | `deleteSheet` with a dependent pivot                       | pivot deterministically unregistered/marked unresolved; no orphan throw; anchors cleared           |
| T4  | Delete sheet, then create a new sheet with the same name   | new sheet gets a **new** id; old pivot does not re-bind                                            |
| T5  | Clone/restore a workbook with pivots                       | ids preserved; pivots rebuild identically in the fresh owner                                       |
| T6  | Import a sheet (with a pivot) into another workbook        | fresh id allocated; pivot remapped; old id does not resolve in new owner                           |
| T7  | Load legacy record with `worksheetId = <name>`             | migrated to `WorksheetId`; rebuild succeeds                                                        |
| T8  | Load legacy record with unresolved `worksheetId`           | manifest rejected at load with precise diagnostic (no partial exposure)                            |
| T9  | Post-migration pivot whose sheet was deleted               | query returns `#REF!`, not a thrown error                                                          |
| T10 | Stale pre-adoption id lookup (**policy O1, selected**)     | `byId(stale)` returns `undefined` after adoption; never forwards to the adopted worksheet          |
| T11 | `PivotRegistry.list(id)` equality filter (C4)              | unchanged behavior under id-valued field                                                           |
| T12 | Baseline guard                                             | the **105** functional-failure identity set is unchanged (identity-level diff, preserved `--json`) |

---

## 7. CS-006A coordination, scope, and disposition

- The `PivotMetadata.worksheetId` type change, the anchor-key domain change, and the name→id
  migration are **coordinated with CS-006A**; D4.1 owns the identity contract, CS-006A owns the pivot
  metadata/record changes.
- **Not retargeted in this phase:** C1, C2, C3, C5 keep `getSheet(name)` until their producers are
  proven id-valued and migrated. `getSheetById(id)` is added alongside, never as a blind swap.
- **Out of scope:** typed formula binding (D4.2, depends on this identity spec), multi-sheet
  transactions (D4.3, blocked on CS-001C), and the full adoption gates (functional/XLSX/coordinate/
  cycle/transaction/patch/performance).

**Disposition.** CS-002D.2R remains closed (experimental scope). CS-002D.4 architecture is accepted.
This D4.1 specification is **design & audit only**. The previously-open stale-ID policy is now
**decided: O1 (explicit invalidation of pre-adoption ids)** is normative (§3.3), conditioned on
adoption through a controlled workbook API and deterministic failure of stale lookups. No other
implementation-contract decision remains open. The **105-failure functional baseline remains the
reference inventory, not a newly verified test result.** The experimental prototype stays
non-exported. No commit, merge, or release is authorized.
