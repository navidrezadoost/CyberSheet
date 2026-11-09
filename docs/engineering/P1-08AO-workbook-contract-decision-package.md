# P1-08AO — Workbook ownership contract decision package

**Status:** proposed contract for a separately authorized implementation slice. This document changes no Workbook or pivot API. It supplements the AJ.05 pivot proposal with sheet lifecycle and event authority decisions.

## Sheet lifecycle

| Operation | Before publication | After publication | Ownership and guarantees for a future authorized slice |
| --- | --- | --- | --- |
| Create | Supported only as a validated member of the initial `Workbook.create({ sheets })` batch. All initial sheets are constructed, adopted, and indexed before the Workbook is returned; the first listed sheet is initially active. There is no separately published add-then-attach path. | Deferred; current `addSheet()` intentionally rejects. | Workbook owns the journal entry and atomically commits sheet identity, name/ID indexes, owner view generation, event bridge, and pivot invalidation subscription. A failed pre-commit step leaves no published sheet or event. |
| Delete | Deferred; bootstrap accepts the initial directory as a whole and does not expose a mutable pre-publication Workbook. | Deferred; current `deleteSheet()` intentionally rejects. | Future journal entry must reject deletion of the final sheet; remove the directory entries, active-sheet reference, view resolution, pivot anchors/dependencies/snapshots and subscriptions as one commit. Pre-commit failure restores the old directory. Successful deletion tombstones old views. |
| Rename | Deferred; choose the final validated name in the initial specification. | Deferred; current `renameSheet()` intentionally rejects. | Future journal entry validates Excel name rules and uniqueness, atomically changes name lookup and all name-based pivot/formula metadata, invalidates cached views, and preserves worksheet identity. Failure before commit retains the old name and view generation. |
| Activate | Initial activation is supported only by deterministic selection of the first sheet in the `create()` batch. Arbitrary activation is deferred. | Deferred; current `activeSheetName` setter intentionally rejects. | Future activation is Workbook-owned view state with a journaled old/new active worksheet ID. It must not mutate sheet contents. Commit invalidates active-view consumers and then emits the activation event; failure retains the prior active sheet. |

For all future post-publication lifecycle work, the Workbook is the sole transaction owner. Stage complete replacement indexes and dependent metadata first; publish them together in one journal commit. Before commit, failure rolls back staged state and emits nothing. After commit, a listener exception cannot roll back committed state. Old `WorkbookSheetView` handles resolve through a generation-aware identity: rename invalidates stale name-bound handles and callers reacquire by the new name; deletion makes retained views fail closed. These are contract recommendations awaiting an implementation authorization.

## Pivot lifecycle

The AJ.05 table remains the operation-level proposal. This checkpoint recommends the following owner-safe public boundary:

- **Create:** support a Workbook method that validates and detaches the configuration, builds its first full result, then journals definition, anchor, dependency links, initial snapshot, and freshness metadata as one publication. No partially registered pivot is visible.
- **Refresh:** support an explicit Workbook refresh and an internal lazy refresh invoked by query. Read one consistent source generation and stage detached results. Publish the snapshot and matching group state before marking clean. Keep the existing calculated-field full-rebuild fallback gate; non-reversible aggregations must not use partial recomputation.
- **Invalidate:** only committed Workbook-managed source mutations may mark dependent pivots dirty. Standalone invalidation engines remain standalone utilities; callers receive no mutable registry or index.
- **Snapshot and metadata reads:** expose detached immutable metadata and result objects. Recommend an explicit freshness field on a snapshot envelope; the stale-snapshot return shape remains an API design decision because the current getter can expose an old snapshot after refresh failure. Queries against a dirty pivot must return the documented calculation error and must never imply that the retained snapshot is current.
- **Delete:** support a single Workbook-owned journal operation that removes registry metadata, snapshot, anchor, dependency links, group state and invalidation subscriptions together. A failure before commit preserves all old entries.
- **Dispose:** idempotently detach sheet observers and clear all pivot-owned state. Disposal must not require exposing the mutable stores or registry.

Raw `Worksheet`, `PivotRegistry`, snapshot store, invalidation engine, recompute engine, dependency index, anchor index, and group-state store remain private. The stale snapshot envelope/error shape, event names, and whether refresh is a public or query-only operation require final API-owner approval before implementation. The non-reversible aggregation full-rebuild gate is retained without qualification.

## Event authority and ordering

Only Workbook journal commits may publish owner-level events. A standalone Worksheet continues to emit its standalone events. Owner-view calls cannot directly emit cell changes or structural changes because they cannot mutate a Workbook sheet.

| Event | Authority | Proposed order |
| --- | --- | --- |
| `cell-change` | Workbook mutation journal after committed cell writes | Deterministic address order, followed by derived `pivot-dirty` events for affected pivots. |
| `structural-change` | Workbook sheet/row/column lifecycle journal after committed structural metadata | After the structural commit; any pivot invalidations caused by the structure follow it. |
| `pivot-dirty` | Workbook invalidation coordinator only, derived from a committed source or structure change | After the source event and before any later refresh publication. No event for a rolled-back mutation. |
| `snapshot-publication` | Workbook pivot refresh journal after the replacement snapshot and matching freshness metadata commit | Last in the refresh event batch; observers can immediately read the published fresh snapshot. |

Dispatch occurs after state publication. Each observer is invoked independently; one observer exception is captured and reported through a diagnostic/error hook, and does not prevent later observers from receiving the committed event. Observer errors never undo committed state. If the current dispatcher cannot provide this isolation, owner-level event dispatch requires a journal-owned adapter rather than broader direct access to the existing `EventBus`. Exact event names and diagnostics channel remain contract questions. The retained assertions in `EventBus.workbook-bridge.test.ts` and `pivot-invalidation-workbook-bridge.test.ts` are blocked references for this decision, not evidence that the owner contract already exists.

## Required next implementation gate

Authorize one journal slice at a time. Start with post-publication sheet lifecycle only after the Workbook owner approves the four operation rows and event ordering. Pivot lifecycle requires a separate slice after stale-read semantics and snapshot envelope are decided. Keep all seven owner-blocked Core suites unchanged until public APIs support their original owner assertions or a standalone migration demonstrably preserves the original intent. Do not use casts, mutable view escape hatches, or test-only owner getters.
