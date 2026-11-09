# CS-002D4-R1 PKG-13C — Pivot publication and recovery

**Scope:** standalone Pivot components. Workbook-owned Pivot APIs and lifecycle remain unavailable and unauthorized.
**Production changes:** none.
**Verification:** focused regression passed 1/1 in the serialized PKG-13D window; adjacent Pivot/component selection passed within 22 suites / 302 tests.

## Source-grounded component boundaries

| Component | Current boundary | Existing evidence / limit |
| --- | --- | --- |
| `PivotEngine` | Synchronously generates a `PivotTable` from its standalone `Worksheet`; it does not publish to a store. | PKG-08/11/12 characterize calculation, named aggregates, nulls, zero, and calculated-field `Error` values. It cannot prove Workbook source ownership or refresh lifecycle. |
| `PivotSnapshotTransformer` | Copies headers and cell values into a new snapshot row structure. Values, including `Error`, are assigned as references. | The new PKG-13C test directly characterizes identity and native fields across transform, store, and query. It does not establish a public detached DTO. |
| `PivotSnapshotStore` | Validates matching `pivotId`, then synchronously calls `Map.set`; get returns the stored reference. | PKG-12B already verifies invalid replacement leaves the prior snapshot. Its store immutability is replace-don't-mutate guidance, not runtime freezing or detachment. |
| `PivotRegistryImpl` | Replaces frozen metadata records for dirty/clean/rebuilding state; fields include `dirty`, optional `lastBuiltAt`, and `rebuilding`. | It has no source/build generation counters, error status, atomic coordinator, or cross-store publication transaction. |
| `PivotRecomputeEngineImpl` | Synchronously tries partial recompute then full builder; writes the snapshot before `markClean`; catches failures, keeps dirty, clears rebuilding in `finally`. | PKG-08X/AA cover partial/full failure, store throw-before/after, markClean failure, retained last-good snapshots, state invalidation, and retry. This is component recovery evidence only. |
| Invalidation/dependency tracking | Synchronous observer/batch logic marks registered pivots dirty; disposal removes subscriptions and pending dirty IDs. | Existing component suites exercise supported direct interfaces. No Workbook-owned public lifecycle or generation semantics follows from this internal mechanism. |
| `GetPivotData` | Ensures freshness, returns `#CALC!` if still dirty, then queries the store and returns the row's original value. | Error-valued query outcomes are component-level. Formula behavior with stale Workbook-owned last-good snapshots remains subject to D3-06. |

## Publication and recovery assessment

No further failure-path test was added for behaviors already independently covered by PKG-08X/AA and PKG-12B. In particular, those tests already cover a bad snapshot ID rejected before replacement, full-builder failure retaining the last-good snapshot, a later successful retry, store failures before and after publication, mark-clean failures, and partial-state invalidation before retry. Repeating those cases would not add meaningful independent evidence.

The new regression is limited to an observable gap in the existing Error-value coverage: the prior standalone test verifies `instanceof Error` and `message` after transform/query, but not that the same Error and its native `name` survive the entire component chain. The PKG-13C test builds a standalone `PivotTable` containing a named `RangeError`, then checks identity and native fields after `transformToPivotSnapshot()`, `PivotSnapshotStore.set/get()`, and `GetPivotData.query()`. This is in-process component behavior, not the shape of a detached Workbook result.

### Fault cuts not supported by current interfaces

- `PivotSnapshotStore.set()` has one synchronous validation check followed by `Map.set()`. There is no public/injected cut between the map's atomic entry replacement and return. A subclass can throw before or after `super.set()`, which is already characterized, but this does not simulate interruption inside the native map write.
- `PivotRecomputeEngineImpl` is synchronous. It exposes no asynchronous pause/cancellation/publication fence or source/build generation. Stale concurrent completion ordering is therefore not a current component scenario to test.
- Partial recompute mutation internals do not expose a supported fault injector between accumulator and row-metadata writes. Existing PKG-08X tests inject at supported extractor/builder/store/registry boundaries and verify whole-state invalidation; they do not establish rollback atomicity inside that mutation sequence.
- Registry, snapshot store, and process-global group-state updates are separate component writes. There is no shared transaction coordinator in these interfaces. The Workbook-level creation/publication contract remains a separate owner decision, not an inferred property of direct component composition.

## Error representation dependency

The current standalone path preserves an Error reference through `PivotSnapshotTransformer`, `PivotSnapshotStore`, and `GetPivotData`; the new regression is intended to pin that fact. The Workbook's generic `detachReadonly()` copies enumerable object properties. Standard `Error.name` and `Error.message` are non-enumerable, so that helper is not evidence of meaningful Error fidelity for a detached Workbook Pivot read.

Authoritative D3-05 requires last-good snapshot and refresh status/error metadata, but does not define the DTO representation of an Error stored in a snapshot row. PKG-11C records the unresolved choice between a stable spreadsheet-error record and an immutable Error-compatible clone. No public DTO, generic detachment rule, formula stale-result policy, or Workbook API is selected here. D3-06 remains independent and unresolved.

**Disposition:** standalone component recovery coverage remains supported by PKG-08X/AA and PKG-12B; PKG-13C adds a narrow Error-instance preservation regression. Workbook-owned Pivot publication, status/generation coherence, and detached Error DTO semantics remain pending owner contract decisions. Overall CS-002D4-R1 acceptance remains **WITHHELD**.
