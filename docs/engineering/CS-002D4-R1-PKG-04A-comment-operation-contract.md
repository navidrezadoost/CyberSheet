# CS-002D4-R1 PKG-04A — One-comment deletion contract proposal

**Status:** Technical proposal for owner review; not approved and not implementation authorization.
**Baseline:** Git `88b09634f17f3b39d88a88c5428f76b426459a2b`; 398 dirty paths at PKG-04A start, preserved.
**D5-01 owner decision:** Pending.
**Overall CS-002D4-R1:** WITHHELD.

## Scope

Specify one Workbook-owned operation that deletes a comment identified by `(sheet, address, commentId)`, with the initial slice fixing reply cascading to `true`. The proposal adds no comment creation or editing, history, persistence behavior, Application event, or generalized mutation family. Existing standalone `Worksheet.deleteComment` remains the source behavior and is not redefined here.

Candidate call shapes from the directive:

```ts
workbook.mutationPort.deleteComment(sheet, address, commentId): Promise<void>;

workbook.transact((tx) => {
  tx.deleteComment(sheet, address, commentId);
});
```

These signatures are proposals. In particular, the port's return type and the observable result for a missing ID require owner approval. For compatibility, this document recommends that the port resolve to a boolean matching standalone `Worksheet.deleteComment` (`true` if at least one matching record was removed, `false` otherwise), while the transaction-context method stages a `void` operation whose result is determined during commit. An owner may instead approve `Promise<void>` with silent no-op behavior. Neither choice is presently authorized.

## Source-established behavior

`Worksheet.deleteComment(address, commentId, deleteReplies = true)` in `packages/core/src/worksheet.ts` looks up the cell's comments and returns `false` if the cell or collection is absent. It builds a set beginning with the requested ID, repeatedly adds comments whose `parentId` is already in the set, then replaces the collection with a filtered array. The loop reaches descendants at any depth and terminates even for cyclic parent references because IDs already in the set are not re-added. Filtering preserves the relative order of retained comments. If the result is empty, the cell's `comments` property is set to `undefined` rather than deleting that property. A missing ID leaves the count unchanged, returns `false`, and emits no event. A successful removal emits exactly one Worksheet event, even when multiple descendants are removed.

Identity is the string `CellComment.id` within the specified cell's collection, not a workbook-global identity. The lookup and filter are cell-local. Duplicate IDs in the same cell are not prohibited by this API; with cascading enabled, entries with that ID and descendants identified through `parentId` are all removed. A reply can itself be deleted by its ID and, under the fixed cascade policy, its own descendants are removed. Deleting a missing parent ID does not remove orphaned descendants that merely point at that absent ID, because no comment record is removed and the method returns before publication.

`CellComment` includes text, author, optional avatar, resolution state, creation/edit `Date`s, optional `parentId`, optional position, optional rich-text runs/styles, and optional arbitrary metadata (`packages/core/src/types.ts`). The graph can therefore contain nested mutable objects. Current `addComment` appends to the cell's array; `updateComment` replaces one array entry with a shallow spread plus `editedAt`; `deleteComment` replaces the array with `filter`. The delete implementation does not mutate retained comment objects or the old array in place.

`getCell` returns a detached read; owner reads recursively detach/freeze arrays and objects and clone `Date`s. `getComments` obtains comments through `getCell`, so its result is detached. The raw `Worksheet.getAllComments()` implementation instead copies the comments array shallowly while iterating stored cells, so its `CellComment` entries are references to stored comment objects. `WorkbookSheetView.getAllComments()` wraps that result in its recursive `detached` helper. Thus the owner view is detached, while a direct raw Worksheet enumeration is an aliasing surface; arbitrary `metadata` may also originate as a caller-held object supplied to `addComment`. Rollback must not rely on undocumented alias assumptions.

## Proposed transaction semantics

1. Validate the issued sheet ownership and address before any state change. Resolve the exact cell; do not create a cell for a deletion attempt.
2. Identify records by `id` within the addressed cell only. Use the fixed `deleteReplies = true` cascade from the existing standalone default.
3. If the cell, collection, or ID is absent at application time, preserve state and event history. Recommended port result is `false`; transaction staging itself does not promise a pre-commit result. No-op behavior is subject to owner approval.
4. If present, remove the target plus all transitive descendants, preserving order of survivors. Preserve the CellRecord and all unrelated fields. Set `comments` to `undefined` when the collection becomes empty; do not remove the cell record.
5. A repeated deletion of the same ID in one transaction is evaluated in staged order: the first successful deletion removes the subtree and records one event; a subsequent attempt is a no-op and records none. If an earlier operation removed an ancestor, a later delete of its former descendant is a no-op. If a child is deleted first and its parent later, each successful staged operation records its own deletion event.
6. Buffer events through the existing transaction commit path. A clean rollback restores the exact prior comment state and publishes neither Worksheet nor Workbook comment-delete notifications. Observer errors after the commit point do not reverse committed state.

## Event contract proposal

Preserve the existing public names and payloads:

- Worksheet: `{ type: 'comment-deleted', address, commentId }` (`SheetEvents` in `packages/core/src/types.ts`). One event for each successful staged deletion; none for a no-op.
- Workbook: `comment-delete` with `{ row, col, commentId }`, emitted through the existing `WorkbookEventBridgeManager` mapping in `packages/core/src/eventBridge.ts`. No reply IDs or newly invented event types are added.

The existing bridge is lazy and attaches as a Worksheet listener when a Workbook EventBus subscriber activates `comment-delete`. Therefore existing Worksheet listener registration behavior applies; this proposal does not assert a new global cross-surface observer-completion order. D5-01 remains pending owner clarification, and D5-05 remains the separate unresolved authority/schema question for any Application-level event surface.

## Approval and change boundary

No authorized D5-01 owner response or comment-operation owner approval is present in the evidence available at this checkpoint. This document recommends a bounded, compatibility-preserving technical contract; it does not amend `CS-002D4-R1-authoritative-contracts.md`, approve D5-01 or D5-05, or authorize production implementation. A separate explicit implementation authorization is required after the applicable owner decisions. Global D2-11 remains unresolved outside operation-specific closures.

## Source map

- `packages/core/src/worksheet.ts:2993-3013` — add and get comments.
- `packages/core/src/worksheet.ts:3025-3094` — update/delete, cascade, no-op return, event emission.
- `packages/core/src/worksheet.ts:1000-1015` — detached `getCell` read.
- `packages/core/src/worksheet.ts:3099-3112` — enumerating comments and navigation ordering.
- `packages/core/src/types.ts:411-438,479-480,652-659` — comment graph, cell storage field, event schemas.
- `packages/core/src/eventBridge.ts:20-25,98-108` — bridge event registration and `comment-delete` payload.
- `packages/core/src/worksheet.ts:894-927,930-946` — existing transaction cell-state capture and restore; current captures are shallow at Cell fields.
- `packages/core/src/worksheet.ts:4168-4205` — object snapshot cell clone, including nested comment position/rich-text/style/metadata shallow copies.
- `packages/core/src/persistence/SnapshotCodec.ts:618-626,735-743` — binary cell comment JSON encoding/decoding; no persistence change proposed.
- `packages/core/src/PivotInvalidationEngine.ts:256-260` — comment events explicitly ignored for pivot invalidation.
- `packages/core/src/search/FindService.ts:43-47,200-205,251-255`, `packages/react/src/utils/commentPanelUtils.ts:61-80`, and `packages/react/src/components/CommentPanel.tsx:95-105` — current read/search/UI consumers.

No tests or production files were changed in PKG-04A.
