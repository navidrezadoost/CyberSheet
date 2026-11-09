# CS-002D4-R1 PKG-04A — Comment deletion event and side-effect matrix

**Status:** Source inventory and proposed transaction boundary; not owner-approved.
**Baseline:** Git `88b09634f17f3b39d88a88c5428f76b426459a2b`; 398 dirty paths at PKG-04A start, preserved.
**D5-01:** Pending owner decision. **D5-05:** unresolved. **Global D2-11:** unresolved outside operation-specific closures.

## Event matrix

| Case | Current standalone Worksheet behavior | Existing Workbook bridge | Proposed owned transaction behavior |
| --- | --- | --- | --- |
| Existing target with no descendants | Removes matching ID; returns `true`; emits one `comment-deleted(address, commentId)`. | If `comment-delete` bridge is active, emits `{ row, col, commentId }`. | Buffer and publish the same two event forms only after commit; no new name or payload. |
| Existing root with replies, fixed cascade `true` | Removes the root and every transitive descendant in the same cell; returns `true`; one Worksheet event for the requested ID, not one per removed reply. | One matching bridged event. | Same cascade and event frequency. |
| Existing reply with descendants | Removes the addressed reply and its descendants; leaves its ancestors and siblings. | One matching bridged event. | Same. |
| Missing cell, absent/empty collection, or unknown ID | Returns `false`; no mutation and no Worksheet event. A dangling child is not removed when the requested parent ID itself has no record. | No event. | No cell allocation, no event, and a no-op result per owner-approved return contract. |
| Duplicate ID entries in one cell | IDs are not validated unique here; filtering removes all entries matching that ID and the reachable descendant set; one event. | One matching bridged event. | Preserve this existing behavior unless owner approves identity validation as a separate contract change. |
| Repeated same-ID delete in one transaction | Not an existing Workbook transaction API. | N/A. | First effective delete emits once; subsequent no-op attempt emits none. Rollback suppresses both Worksheet and Workbook notifications. |

## Event provenance and payloads

The source event is defined in `SheetEvents` as:

```ts
{ type: 'comment-deleted'; address: Address; commentId: string }
```

`WorkbookEventBridgeManager` already registers a `comment-delete` bridge. Its handler maps the Worksheet event to:

```ts
{ row: address.row, col: address.col, commentId }
```

It does not expose reply IDs, full comment records, sheet ID, or a deletion count. The bridge subscription is lazy and is wired to Worksheets when Workbook EventBus listeners activate the event. This proposal preserves that shape and routing. It does not add Application forwarding, establish a cross-level callback completion order, or change any Cell/Style/dimension event schema.

## Side-effect inventory

| Surface | Source-grounded current behavior | Proposed boundary / verification |
| --- | --- | --- |
| Cell record | `comments` array is replaced by `filter`; on final deletion the field becomes `undefined`; no cell allocation occurs for absent-cell delete. | Only the target cell's comment field may change. Preserve every unrelated field, record presence, and comment order. |
| Comment graph | Cascade reads `id` and `parentId`; removed entries may contain Date, position, rich-text/style, and arbitrary nested metadata. | Capture/restore the complete prior graph without lossy JSON or shallow nested copies. Keep unsupported-metadata graph rules explicit. |
| Dependency graph / formula state | PivotInvalidationEngine explicitly ignores `comment-added`, `comment-updated`, and `comment-deleted`. Comment text is not formula dependency input. | No DAG, formula registration, dirty set, volatile state, or recalculation scheduling change. Assert parity. |
| Style cache | Delete does not read or write style state. | No style allocation/release or cache reference change. |
| Other Worksheet state | No dimension, visibility, merge, filter, conditional-format, drawing, or row/column-style writes in the current delete method. | Preserve as out-of-scope and unchanged. Global D2-11 is not closed by this narrow inventory. |
| Event buffers | Standalone method emits immediately through Worksheet emitter. Current owned cell-write batch buffers events via its event sink and commit list, but comment deletion is not one of the seven supported transaction kinds. | New owned operation must append to the same commit-only publication pipeline. Failed commit produces no public comment events. |
| Workbook bridge / UI | Existing bridge maps to `comment-delete`; React forwards that event, and CommentPanel refreshes its comment projection on add/edit/delete. | Keep names and payload unchanged so existing consumers refresh; verify both listener-active and listener-inactive cases. |
| Search and comment panel | `FindService` searches comment text and comment replacement updates a found comment. `commentPanelUtils` builds roots/replies and latest timestamps from `getAllComments`; CommentPanel listens to bridged events. | After commit, fresh reads/search/panel projection must omit the deleted subtree and preserve surviving order/content. No additional side effects implied. |
| Persistence | `WorksheetSnapshot` includes cell comments; `SnapshotCodec` JSON-encodes/decodes the comments array. | In-memory transaction rollback must restore the comment tree. No binary format or persistence API change is authorized. |
| History / external services | The existing delete method has no Workbook undo stack or external persistence side effect. | Do not add undo history, file durability, or host notifications in this operation. |

## Ordering and publication boundary

For a future transaction operation, all successful comment state writes must complete before Worksheet and Workbook observers are called. This is consistent with D5-02/commit-only publication and the existing Workbook transaction publication path. The exact relative completion order across independent Worksheet subscriptions and Workbook EventBus listeners remains governed by D5-01; PKG-02G-S proposed Option C but PKG-02G-C/D did not establish owner approval. No callback ordering beyond the accepted existing per-surface rules is newly promised here.

D5-05 governs whether an Application event surface exists and owns stable event names/payloads; PKG-04A does not settle it. D5-01 is pending; if a designated owner requires strict cross-level ordering, this event/transaction design must be revised under separate authorization. Global D2-11 and the shared FIFO self-await limitation also remain independent blockers.

## Current source map

- `packages/core/src/worksheet.ts:3052-3094` — deletion semantics and Worksheet event.
- `packages/core/src/types.ts:411-438,652-659` — comment data shape and Worksheet event union.
- `packages/core/src/eventBridge.ts:20-25,98-108` — event bridge registration and Workbook payload.
- `packages/core/src/PivotInvalidationEngine.ts:256-260` — comment events ignored for pivot invalidation.
- `packages/core/src/persistence/SnapshotCodec.ts:618-626,735-743` — persistence encoding/decoding.
- `packages/core/src/search/FindService.ts:43-47,200-205,251-255` — comment search and replacement consumers.
- `packages/react/src/utils/commentPanelUtils.ts:61-80`; `packages/react/src/components/CommentPanel.tsx:95-105`; `packages/react/src/config/eventForwarder.ts:10-18` — UI projection, refresh subscription, and forwarding.

No tests or production files were changed in PKG-04A.
