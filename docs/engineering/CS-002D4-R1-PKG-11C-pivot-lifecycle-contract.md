# CS-002D4-R1 PKG-11C — Workbook Pivot lifecycle contract proposal

**Status:** PROPOSAL FOR OWNER REVIEW — no contract decision or implementation authorization
**Scope:** Public Workbook-owned Pivot lifecycle and migration requirements for the seven blocked integration suites
**Production, test, and API changes:** None in this package
**Overall CS-002D4-R1 acceptance:** WITHHELD

## Purpose and decision requested

This package proposes the smallest public Workbook boundary that can support real Workbook-owned Pivot integration without exposing mutable implementation services. It is a contract proposal, not evidence that the proposed lifecycle exists today. The owner should decide whether to authorize this boundary, choose among the alternatives below, or defer it with an identified prerequisite.

The proposal separates four concerns that existing tests often combine: source-sheet identity, pivot configuration, a published computed snapshot, and the refresh state describing that snapshot. It does not make the Pivot registry, dependency index, recompute engine, group-state store, anchor index, or snapshot store public.

## Evidence boundary: existing behavior and approved contracts

The following are current source or contract facts, not new promises:

- `Workbook.create({ sheets })` publishes a Workbook with its initial sheets; it requires at least one initial sheet. Post-publication `addSheet()` currently throws because the sheet-lifecycle journal slice is not authorized. See `packages/core/src/workbook.ts` and the PKG-10C fixture review.
- `WorkbookSheetView` is an owner-issued, read-only view with `workbookId` and immutable `worksheetId` identity. It exposes reads and a subscription, but not raw Worksheet mutation or internal Pivot state. See `packages/core/src/workbook-access-types.ts`.
- The Workbook keeps the registry, snapshot store, dependency index, invalidation engine, recompute engine, and anchor index in private fields. `createPivot()` and `deletePivot()` are declared but currently reject as unavailable. `getPivotSnapshot()` can only read an already registered pivot, lazily asks the recompute engine to refresh a dirty pivot, then returns a detached result. It does not create a pivot.
- `queryPivotData()` and `queryPivotDataAt()` are public read paths. The former can trigger refresh for a dirty pivot; formula result behavior for stale snapshots remains governed by D3-06.
- `PivotSnapshotStore` documents explicit snapshot publication and no implicit store creation. `PivotRegistryImpl.register()` currently initializes metadata as clean while assuming an immediate build. A future public create path must ensure that assumption is true or change the internal lifecycle deliberately; a partially initialized public pivot must not be exposed as fresh.
- The builder uses a concrete internal Worksheet, computes via `PivotEngine`, populates incremental group state, and transforms the result to a snapshot. That internal requirement does not justify exposing the Worksheet to callers.
- The authoritative contract records D3-01 as owner-approved (refresh mode configurable, manual default), D3-02 (a failed refresh preserves the last successful result), D3-03 (failure and stale status are observable), D3-04 (automatic refresh failure does not roll back the committed source edit), D3-05 as a delegated engineering decision (last-good snapshot plus freshness generation/status/error metadata, publish only after a complete validated build), and D3-06 as unresolved (formula behavior when only a stale last-good snapshot exists).
- D6-01 through D6-04 are owner-approved deleted-sheet/disposed-resource requirements; D6-05 requires stable references by Workbook ID plus immutable Worksheet ID. Sheet deletion itself is not enabled by this proposal.
- D5-05 remains unresolved. The Core Workbook bridge has no approved Application-level event authority or stable event names/payload schema. No new Application event is proposed here.
- The seven existing Workbook transaction operations remain the only operations in the D2 transaction context. Pivot creation, configuration, refresh, deletion, or publication must not be inserted as an eighth transaction write by implication.

Relevant source entry points include `packages/core/src/workbook.ts` (Workbook construction, private Pivot collaborators, current unavailable methods, query methods, and builder), `packages/core/src/workbook-access-types.ts` (WorkbookSheetView and seven-operation contexts), `packages/core/src/PivotEngine.ts` (`PivotConfig` and calculation), `packages/core/src/PivotRegistry.ts`, `packages/core/src/PivotSnapshotStore.ts`, and `packages/core/src/PivotRecomputeEngine.ts`.

## Proposed public facade

### Identity and source binding

Bind a Pivot to the source by immutable identity, not by sheet display name:

```ts
type WorkbookPivotSource = WorksheetId | WorkbookSheetView;

type CreateWorkbookPivotOptions = {
  name: string;
  source: WorkbookPivotSource;
  config: WorkbookPivotConfig;
  refreshMode?: 'manual' | 'automatic';
};
```

The Workbook must verify that a supplied view is an authentic view issued by that same Workbook, or resolve the supplied `WorksheetId` only within that Workbook. A foreign Workbook's view/ID and an unknown ID must be rejected before registry, dependency, group-state, anchor, or snapshot publication. Store the resolved immutable `WorksheetId` in metadata. Display names may be included in diagnostics/UI metadata, but must not be used as the durable binding key. Rebinding to another worksheet is not an ordinary config update; require delete/recreate or a separately approved source-rebind operation.

`WorkbookSheetView` already provides a branded `worksheetId` and `workbookId`; accepting it is convenient for callers, while accepting `WorksheetId` is useful for persisted references. Neither route should return or retain a caller-visible raw `Worksheet` reference.

### Candidate methods

The following signatures are an owner-review starting point. They intentionally do not expose internal stores or engines. Promise-returning mutation methods are recommended so their interaction with Workbook disposal and queued source writes can be specified, but exact sync/async compatibility is a contract decision.

```ts
type WorkbookPivotError = Readonly<{
  name: string;
  message: string;
  code?: string;
}>;

type WorkbookPivotFreshness = 'fresh' | 'stale' | 'refreshing' | 'failed';

type WorkbookPivotStatus = Readonly<{
  pivotId: PivotId;
  sourceWorksheetId: WorksheetId;
  refreshMode: 'manual' | 'automatic';
  freshness: WorkbookPivotFreshness;
  sourceGeneration: number;
  builtGeneration?: number;
  lastSuccessfulBuildAt?: number;
  lastError?: WorkbookPivotError;
}>;

type WorkbookPivotRead = Readonly<{
  status: WorkbookPivotStatus;
  /** Last successfully published snapshot, absent before the first successful build. */
  snapshot?: PivotSnapshot;
}>;

createPivot(options: CreateWorkbookPivotOptions): Promise<PivotId>;
getPivotRead(pivotId: PivotId): WorkbookPivotRead | undefined;
getPivotSnapshot(pivotId: PivotId): PivotSnapshot | undefined; // compatibility surface
getPivotStatus(pivotId: PivotId): WorkbookPivotStatus | undefined;
refreshPivot(pivotId: PivotId): Promise<WorkbookPivotRead>;
updatePivotConfig?(pivotId: PivotId, config: WorkbookPivotConfig): Promise<WorkbookPivotStatus>;
deletePivot?(pivotId: PivotId): boolean | Promise<boolean>;
```

`getPivotRead()` is proposed as the coherent detached read: snapshot and status must describe the same publication/freshness observation. Separate `getPivotSnapshot()` and `getPivotStatus()` reads are useful for compatibility but can straddle a concurrent commit/refresh unless callers accept that limitation. Whether the existing `getPivotSnapshot()` keeps its current lazy-refresh behavior or becomes a last-good-only read requires an explicit compatibility decision. It must not silently change as part of implementing the facade.

The optional config-update and delete methods are not prerequisites for the smallest create/source-edit/read integration gate. Their signatures and lifecycle should be approved separately if excluded from that gate. The existing `deletePivot(pivotId): boolean` declaration is currently unavailable; changing it to async would be a public signature change and must be called out in migration/release notes.

### Configuration detachment and accepted values

The Workbook should snapshot the caller's configuration at the API boundary, validate it, and retain an immutable internal copy. Later caller mutation of arrays, ranges, slicer state, or nested options must not alter registered metadata or recomputation. Reads of configuration, if ever offered, should return a detached DTO rather than the retained object.

`PivotConfig` currently includes `CalculatedValueSpec.compute`, an opaque runtime function explicitly documented as non-serializable. A deep detached data-only DTO cannot preserve that callback by value. The owner must choose one of these rules before publishing a Workbook API:

1. Define `WorkbookPivotConfig` as a serializable subset and reject callback-based calculated value specs at this boundary; or
2. Permit runtime callbacks under a separate, explicit identity/lifetime contract that states callbacks are retained references, are not persisted, and must remain valid until delete/dispose.

The first option is preferred for an immutable, reproducible Workbook configuration. Do not imply that JSON cloning is valid for current `PivotConfig`, or silently drop callbacks. Validate cycles, accessors, custom prototypes, and unsupported values before publishing any Pivot state.

### Detached snapshot and status DTOs

All returned nested arrays/records must be detached and deeply readonly. A caller mutating its received object must neither mutate Workbook state nor any subsequent read. The status object must not include registry/store references or mutable error instances.

`PivotRow` allows `CellValue | Error`. Current generic `detachReadonly()` copies enumerable own properties; standard `Error` fields such as `message` are non-enumerable. As a result, that helper does not by itself define a useful detached representation for an Error nested in a Pivot snapshot. Before claiming DTO fidelity, specify whether such values are normalized to a stable spreadsheet error DTO (recommended: stable code and message with documented round-trip semantics) or cloned as an Error-compatible immutable value. This is an evidence-based design gap, not a claim that a particular test has reproduced loss of error information.

Status errors should be detached `{ name, message, code? }` records. Avoid exposing thrown Error identity/stack or internal exception objects. The owner should define whether `freshness: 'failed'` is a separate state or whether failure is represented as `stale` plus `lastError`; D3-03 requires both stale status and failure observability, but does not prescribe these exact enum values.

## Lifecycle and publication proposal

### First creation and first snapshot

Creation must not publish a Pivot that appears fresh without a first successfully built snapshot. Recommended sequence:

1. Validate Workbook liveness, source identity/ownership, name/config validity, supported features, and relevant source range.
2. Capture the source generation and build a candidate snapshot using owner-private source access. Do not expose the raw Worksheet or an initializing registry entry.
3. Validate the candidate snapshot and detach/normalize its public representation.
4. Publish registry metadata, source dependency registration, initial snapshot, and generation/status as one externally observable lifecycle completion. Resolve `createPivot()` only after this publication.
5. If validation/build/publication fails, leave no publicly discoverable Pivot, snapshot, dependency registration, anchor, or group-state residue. An internal ID counter may skip an ID after failure; this is an owner decision and should not be observable as a partially created Pivot.

If implementation constraints require an internal pre-build registration, it must remain unobservable and must be removed on every failed path. Do not set metadata clean before successful snapshot validation/publication; current `PivotRegistryImpl.register()` assumes an immediate build and therefore cannot alone enforce the proposed completion condition.

No output-grid anchor is included in the minimum API. If anchors are required, define their worksheet/address identity, uniqueness, publication, deletion, and rollback as a separate lifecycle surface; do not conflate the source sheet with the destination sheet.

### Source writes, generations, and automatic refresh

The seven existing Workbook operations are the only source mutation routes in scope. A Pivot source observer must process only committed Worksheet events from those writes. For a multi-operation/multi-Worksheet transaction, invalidation must not cause a builder to read a partially applied transaction. Generation advancement and stale status become externally observable no earlier than the source commit point.

- **Manual mode (D3-01 default):** a committed relevant source edit marks the Pivot stale and advances source generation. No automatic build is required merely because a read occurs unless the owner explicitly retains the existing lazy-read behavior as the manual policy. Expose the stale status and last-good snapshot; an explicit `refreshPivot()` performs the build.
- **Automatic mode:** after a relevant source transaction commits, schedule refresh from the committed state. The source transaction remains committed if refresh fails (D3-04); publish a replacement snapshot only after the full build and validation succeed (D3-05). A failed refresh preserves the last-good snapshot (D3-02) and makes stale/failure status observable (D3-03).
- A no-op/unrelated transaction must not advance a Pivot's source generation or cause a spurious refresh unless an operation-specific invalidation rule says otherwise.
- A transaction covering multiple changes to the same source should result in a coherent post-commit build. The owner should decide whether automatic refresh is coalesced once per Workbook transaction; coalescing is recommended.

The proposal does not make Pivot accumulators part of the D2 rollback journal. PKG-08X/AA recovery evidence is bounded recompute fallback evidence, not proof of transaction-level rollback of group state. On any failed incremental attempt, use the documented safe full-build fallback/invalidation behavior; do not publish stale accumulator state as a fresh snapshot.

**D3-06 remains a blocker for formula reads.** `getPivotRead()` can expose a stale last-good snapshot together with status as a new explicit read contract, but this does not decide whether `GETPIVOTDATA` returns a stale value, an error, or a result with separate freshness metadata. Keep formula semantics versioned separately. Do not make formula behavior follow the new object-read contract implicitly.

### Optional configuration update

If approved, `updatePivotConfig()` applies a detached, fully validated config to the same Pivot ID and source Worksheet ID. Proposed semantics: invalid input is rejected before state change; the old config and last-good snapshot remain readable until a replacement build succeeds; successful publication advances config/build generation and makes status fresh; failed rebuild retains the previous last-good snapshot and makes the Pivot stale/failed. Whether config edits in manual mode merely mark stale or eagerly rebuild follows the approved refresh policy. Changing source Worksheet identity is excluded.

Config update is not a Workbook cell transaction operation and must not run within `Workbook.transact()` as an implicit eighth operation. If true atomic coupling with source writes/config updates is required, that is a new contract prerequisite, not supplied by this proposal.

### Failure, cancellation, disposal, and missing source

- Before first snapshot publication, any failed create rejects and leaves no visible partial Pivot state, as above.
- For an existing Pivot, failed refresh retains the last successful snapshot, reports stale/failure metadata, and does not undo a committed source edit.
- A cancellation before a queued lifecycle request starts produces no publication. A running synchronous build may not be preemptible; if asynchronous build work is later introduced, define its cancellation and publication fence explicitly. A canceled/failed build must never publish a result for an obsolete source generation.
- After Workbook disposal, new create/update/refresh operations reject with the Workbook's documented disposed/cancelled error family. Disposal clears internal Pivot resources and prevents late queued work from publishing. A caller retaining an already detached snapshot/status DTO may continue to read that copy; it does not retain Workbook authority.
- If future sheet deletion/disposal is enabled, a Pivot bound to that immutable Worksheet ID becomes `missing-source`/disposed and cannot silently rebind to a same-name replacement (D6-01/02/03/05). The exact public error/status and whether Pivot deletion remains possible after source deletion require alignment with D6. This proposal does not enable sheet deletion or define post-deletion behavior beyond preserving those approved constraints.
- Listener exceptions and event forwarding must follow the relevant event-surface contract; a listener failure must not be misreported as a failed Pivot calculation if snapshot publication already committed.

## Event and ordering implications

The minimum facade needs no new Workbook or Application event. Callers can inspect `getPivotRead()`/`getPivotStatus()` after the existing source commit. Automatic refresh may be scheduled internally after commit.

D5-01 is still pending owner approval of the proposed commit-boundary interpretation; it does not grant a global observer-completion order. Any source-invalidated event or Pivot-refreshed event added to the Workbook EventBus would need its own payload, timing, failure, and compatibility definition. Application-level forwarding remains blocked by D5-05, including stable names, authority, payloads, and migration policy. Do not add an Application bridge or claim a complete Sheet → Workbook → Application sequence in this package.

Under the pending D5-01 proposal, the guaranteed statement is that observers see committed source state at their respective event surfaces; the relative completion order of Worksheet and Workbook observers is unspecified. If automatic recompute depends on the Worksheet event bridge, test only the approved public final-state and freshness outcomes; do not assert a cross-surface listener order unless D5-01 is formally clarified to require it.

## Facade alternatives

| Alternative | Advantages | Problems | Assessment |
| --- | --- | --- | --- |
| **A. Narrow Workbook lifecycle facade** (`createPivot`, detached read/status, explicit refresh; optional update/delete) | Keeps owner authority inside Workbook; lets integration tests use initial `Workbook.create()` sheets and seven-operation source writes; permits real refresh/status lifecycle assertions; preserves private registry/store/engine. | Requires precise creation, stale-read, failure, config, cancellation, and compatibility contracts; current unavailable declarations need activation. | **Recommended for owner review**, staged so create/refresh/read precede optional config/delete.
| **B. Public registry/snapshot/group-state getters** | Historical tests can directly inspect collaborators and register fixtures. | Leaks mutable/internal authority, lets callers bypass adoption, commit, invalidation, publication, and cleanup rules; would create a broad compatibility burden. | Reject; does not preserve encapsulation.
| **C. Return a mutable Worksheet or accept arbitrary Worksheet in Workbook Pivot calls** | Reuses current PivotEngine constructor and makes legacy fixtures easier to set up. | Violates the WorkbookSheetView/read-only boundary and owner identity enforcement; enables writes outside the seven-operation transaction surface. | Reject.
| **D. Keep Workbook integration unavailable; test only standalone engine/recompute components** | No new public lifecycle contract or compatibility surface. | Cannot satisfy Workbook-owned source observation, dirtying, first publication, failure, disposal, or formula integration acceptance. | Valid only if the product intentionally declines Workbook-owned Pivot support; not a substitute for integration evidence.
| **E. Add test-only hooks/accessors or cast around public types** | Could make old tests compile quickly. | Tests would exercise a private/unsupported route and overstate public support. | Reject for acceptance tests; internal unit tests may test a component directly without claiming Workbook integration.

## Seven blocked-suite migration map

The PKG-09B expansion classifies six suites as compile-blocked and `pivot-formula-integration.test.ts` as setup-blocked. Earlier historical summaries with different categories are not substituted for that current inventory. Migration must retain the original intended assertion when a supported public contract exists; it must not preserve obsolete setup assumptions by casts, private getters, or post-publication `addSheet()`.

| Suite | Existing blocker / intended evidence | Migration under the proposed facade | Still blocked or separately scoped |
| --- | --- | --- | --- |
| `pivot-partial-recompute.test.ts` | Compile-time use of `Workbook.addSheet()` as mutable Worksheet and absent internal Pivot/group-state access. Intended incremental results and partial-recompute behavior. | Construct source sheet in `Workbook.create({ sheets })`; create via facade; write through `transact()`; assert detached snapshots/status and full-vs-incremental result equivalence. | Internal accumulator counts/groups belong in direct `PivotGroupStateStore`/recompute component tests, not Workbook API tests. |
| `pivot-slicers.test.ts` | Compile-time Worksheet/view mismatch and absent registry accessor; slicer lifecycle assertions depend on registered Workbook Pivot. | Preserve standalone slicer evaluation on standalone `Worksheet`/`PivotEngine`; move Workbook-owned slicer persistence/invalidation assertions to a facade test using create/read/config update if update is approved. | Slicer update/clear public methods and their transaction, snapshot, and refresh semantics need explicit inclusion; facade proposal alone does not activate undocumented existing methods. |
| `pivot-partial-sanity.test.ts` | Compile-time assumptions about internal registration/group state and mutable source sheet. | Use initial Workbook sheets plus supported source writes; validate public snapshot output against fresh `PivotEngine.generate()` oracle. | Keep internal accumulator sanity assertions at component layer; do not add a public group-state getter. |
| `workbook-snapshot-integration.test.ts` | Compile-time calls to absent `getPivotRegistry()`/`getPivotSnapshotStore()` and post-publication sheet creation. | Seed all sheets at Workbook creation; exercise first snapshot, detached read, source commit, stale/refresh, last-good failure state, disposal. | Direct store persistence/mutation assertions remain internal unit tests. Snapshot binary persistence is not established by the lifecycle facade and needs its own authorized persistence contract. |
| `workbook-pivot-integration.test.ts` | Compile-time `new Workbook()`/addSheet and registry accessor assumptions. | Migrate to `Workbook.create()` and facade methods; assert duplicate names/IDs, source identity, first publication, source change and delete only if those are approved acceptance requirements. | Anchor behavior is out of minimum scope; destination/anchor contract is separate. |
| `pivot-invalidation-workbook-bridge.test.ts` | Compile-time dependency/invalidation internal access and mutable Worksheet methods on a view. | Exercise actual source mutation through seven-operation `transact()`; observe stale/fresh generation and detached output through public status/read. | Internal dependency-index ranges, exact registry dirty flags, and event bridge internals remain unit-test concerns. Do not assert D5-05 Application events. |
| `pivot-formula-integration.test.ts` | Runtime fixture setup fails because it calls unavailable post-publication `addSheet()`; intended formula and query assertions are not reached. | Seed all sheets before publication; create via facade; perform source writes via transaction; then test `queryPivotDataAt()`/GETPIVOTDATA only under an explicit approved stale-result policy. | D3-06 blocks asserting stale last-good formula behavior; source cross-sheet formulas and new sheet lifecycle are separate contract requirements. |

This mapping describes a migration path, not a claim that rewriting is authorized now. Suites whose source intent cannot be mapped to the facade's approved contract should remain separately classified instead of losing assertions or being silently deleted.

## Owner decisions requested

1. Approve/reject/defer Workbook-owned Pivot lifecycle support and choose the narrow facade versus no supported owner integration.
2. Confirm source identity accepts `WorkbookSheetView`, `WorksheetId`, or both, and requires same-Workbook provenance.
3. Approve first-publication failure semantics and whether create is synchronous or asynchronous.
4. Confirm the D3-01 manual default in relation to current lazy refresh on `getPivotSnapshot()`/`queryPivotData()`; state whether manual means explicit refresh only, or permits lazy read-triggered refresh.
5. Decide D3-05's status vocabulary, generation/coalescing policy, read coherence, and error representation; explicitly keep D3-06 formula result policy separate.
6. Decide whether callbacks in `CalculatedValueSpec` are rejected, retained under a runtime-only lifecycle, or replaced by a serializable representation.
7. Decide whether config update and deletion are in the first release; specify their sync/async signatures and failure/disposal behavior.
8. Confirm that no new Workbook/Application Pivot events are included now; if any are required, route event authority/schema under D5-01/D5-05 before implementation.
9. Confirm that Workbook disposal prevents late publication and that future source deletion follows D6 stable-ID/no-rebind rules.

## Acceptance and authorization boundary

This document supplies an owner-reviewable contract candidate and a migration map. It does not:

- approve or change D3, D5, D6, or D2-11;
- activate current `createPivot()` or `deletePivot()` declarations;
- add a Pivot method to `WorkbookMutationPort` or `WorkbookTransactionContext`;
- enable post-publication sheet creation, source rebinding, anchors, slicer mutations, or Application forwarding;
- grant access to mutable registry/store/group-state internals;
- authorize edits to production code, API declarations, tests, or the seven legacy suites.

Recommended next gate: obtain the Workbook/API owner's recorded answers to the decisions above, then authorize a smallest public-facade implementation slice with explicit first-snapshot, source-generation, stale-read, and failure acceptance tests. Resolve D3-06 before migrating stale-formula expectations; keep D5-05 and source sheet deletion outside that slice unless separately approved. Overall CS-002D4-R1 acceptance remains **WITHHELD**.
