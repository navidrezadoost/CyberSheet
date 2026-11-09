# CS-002D4-R1 PKG-03B — Next Operation Design

**Selected family:** transactional deletion of one existing cell comment.
**Status:** implementation-ready proposal only; no implementation authorization.
**Global D2-11:** UNRESOLVED. **Overall CS-002D4-R1:** WITHHELD.

## Why this slice

`Worksheet.deleteComment(address, commentId, deleteReplies = true)` is already guarded on Workbook-owned Worksheets, mutates the `comments` field of one CellRecord, and emits an existing `comment-deleted` Sheet event ([worksheet.ts](../../packages/core/src/worksheet.ts#L190-L213), [worksheet.ts](../../packages/core/src/worksheet.ts#L3051-L3093)). The existing bridge maps that Sheet event to Workbook `comment-delete` with `{ row, col, commentId }` ([eventBridge.ts](../../packages/core/src/eventBridge.ts#L14-L25), [eventBridge.ts](../../packages/core/src/eventBridge.ts#L101-L109)). WorkbookSheetView already exposes comment reads ([workbook-access-types.ts](../../packages/core/src/workbook-access-types.ts#L54-L80)).

The bounded implementation could reuse Workbook's existing port/context, per-Worksheet capability, FIFO, Journal/Snapshot selection, commit-event buffering, post-commit publication, and recovery-required handling. It should remain one new operation kind; it is not permission to add general comment support. The proposed initial operation uses the current `deleteReplies=true` behavior so descendants of the selected thread root are removed exactly as today. Comment add/update remain separate families because add mutates an array in place and allocates an ID/time, while update replaces an array element and updates `editedAt`.

## Proposed API and operation semantics

After separate authorization, add the same additive signature to `WorkbookMutationPort` and `WorkbookTransactionContext`:

```ts
deleteComment(
  sheet: WorksheetId | WorkbookSheetView,
  address: Address,
  commentId: string,
): Promise<void>; // port

deleteComment(
  sheet: WorksheetId | WorkbookSheetView,
  address: Address,
  commentId: string,
): void; // transaction context
```

The initial API fixes `deleteReplies` to `true`; callers cannot supply a different cascade policy in this slice. Resolve/copy the owner, address and ID when staging; re-resolve and validate the issued target and one-based cell address before any write. If no matching comment exists, preserve current no-op behavior: no state change and no event. On a match, remove the selected comment and all descendants on that same cell using the existing parentId traversal. Do not remove other comments, sibling threads, or content at other addresses. Existing standalone API remains untouched.

Before authorization, the API owner must confirm whether a missing comment remains a successful no-op (recommended for compatibility) and that the default cascade stays `true`. No Workbook undo/redo result or persistence guarantee is implied.

## Exact-state rollback design

### Journal

Before the first operation on a cell, capture a detached exact before-image keyed by `(worksheetId, packedAddress)`: cell presence plus the entire CellRecord, including an independently cloned comments array and every comment's nested data/Date values. A missing CellRecord must restore as missing; an existing record must restore with exact value, formula, style reference/ownership, icon, component, and comments contents. For this bounded delete, non-comment CellRecord fields must remain unchanged. Capture only one target CellRecord per touched address; repeated deletions to the same address retain the first before-image.

The current Journal's generic before-image uses `{ ...cell }` and therefore is shallow ([worksheet.ts](../../packages/core/src/worksheet.ts#L590-L607)); do not rely on that alone as the contractual exactness proof. Current deletion replaces `c.comments` with a filtered array and does not mutate comment objects in the old array, so the old reference may happen to survive rollback. The implementation should use explicit deep-detached comment state rather than relying on that incidental property. No StyleCache refcount adjustment should occur because the operation cannot change style.

### Snapshot comparison path

Extend the existing comparison state with detached comments as part of its CellRecord snapshot, independently of the sparse Journal implementation. Do not reuse Journal restoration. Compare Journal and Snapshot results over the same initial fixture and failure cuts.

### Events and commit

Stage the existing `{ type: "comment-deleted", address, commentId }` Sheet event in the Workbook commit queue; do not call the current direct `#events.emit` during apply. At the commit point, publish it through the existing isolated Worksheet publisher. If the Workbook `comment-delete` bridge is active, it maps the committed Sheet event to its existing Workbook event/payload. A clean pre-commit failure discards both pending event forms. Preserve same operation frequency: one Sheet event for each actual deletion, zero for a missing-ID no-op. Do not add a new event name, payload, Application bridge, or global cross-surface callback-order assertion.

## Owner and side-effect boundary

| Concern | Bounded treatment |
| --- | --- |
| Mutation authority | Only this Workbook's issued view/ID; raw adopted Worksheet `deleteComment` remains guarded; use existing private capability. |
| Primary state | One CellRecord's comments list at one address. |
| Formula / volatile graph | No change expected; assert graph and formula values remain unchanged. |
| StyleCache | No style mutation or intern/release operation expected; assert health/refcounts remain stable through existing diagnostics where available. |
| Visibility / dimensions | No change. |
| Drawings / conditional formatting | No change. |
| Pivot | No value/formula invalidation expected. Check actual observer wiring and assert Pivot freshness/snapshot metadata unchanged in a fixture where feasible. |
| Worksheet event | Existing `comment-deleted`, only after commit. No generic `sheet-mutated` event is currently emitted by the standalone delete path; do not add one implicitly. |
| Workbook event | Existing lazy bridge `comment-delete`, payload `{row, col, commentId}`; no new schema. |
| Application | No Application forwarding. Any request to forward requires D5-05 authority/schema. |
| History | No Workbook undo/redo. |
| Persistence | No binary SnapshotCodec/XLSX change. Comment save behavior is not inferred from this in-memory operation. |
| Reentrancy / disposal | Follow existing queue and post-commit disposal guards; queued-before-start disposal cancels, committed publication cannot roll state back. |

## Acceptance-test matrix for a separately authorized package

| Case | Setup / failure cut | Required result under Journal and Snapshot |
| --- | --- | --- |
| Owner admission | Foreign Workbook view/ID, raw adopted Worksheet, invalid row/column, malformed/empty ID | Reject before state mutation or event publication; both Workbooks remain healthy. |
| Single root, no replies | Cell with unrelated value/formula/style and two unrelated comments | Delete only the named comment; preserve non-comment fields and other comments exactly; one `comment-deleted` event. |
| Thread cascade | Root, child, grandchild and sibling comments on same address; delete root | Remove root plus descendants; retain sibling; one event for requested root ID, matching existing source semantics. |
| No matching comment | Missing cell, empty comments, or unknown ID | No-op; no created CellRecord, no Worksheet/Workbook event, health stays healthy. |
| Event bridge active/inactive | With and without `eventBus.on('comment-delete', ...)` | Sheet event occurs after commit; Workbook event is lazy and payload matches existing bridge; inactive bridge creates no Workbook notification. Do not assert a total order against unrelated cross-surface observers. |
| Final-state visibility | Direct Worksheet observer and Workbook bridge read `getComments` during callback | They observe committed post-delete state. |
| Rollback before mutation | Inject failure before apply | Exact state unchanged; no event; queue usable. |
| Rollback after deletion | Apply one delete, then fail a later staged operation on same/other Worksheet | Restore exact original CellRecord/comments on all sheets; suppress all committed events; health healthy if restore succeeds. |
| Repeated address | Delete two comments at the same address in one transaction | First-touch before-image restores the original full comment list; successful commit removes intended IDs in stage order. |
| Rollback failure | Inject during detached cell/comment restore | Preserve operation and rollback errors; mutation health becomes recovery-required; subsequent mutation rejects. |
| Listener failure | Throw from an observer after commit; later observer subscribed | State remains committed; failure isolated/reported; later observers continue; no rollback. |
| Disposal around publication | Dispose while queued and during committed publication | Queued unstarted operation cancels with no state/event; disposal during publication follows existing stop guard and cannot uncommit already committed deletion. |
| Cross-surface ordering | Arrange direct Sheet listeners before/after activating `comment-delete` bridge | Assert payload, committed state, and within-surface order only; never assert global completion precedence between all Sheet and Workbook listeners. |
| Unrelated state | Formula, style, dimensions, visibility, CF and Pivot sentinel state | Exact equality before/after except selected comments; no graph, style, dimension, visibility, CF or Pivot side effect. |
| API/compatibility | Existing standalone Worksheet delete tests and Workbook transaction tests | Standalone behavior remains byte/behavior compatible; only owner-backed additive path uses transaction. |

## D5 independence assessment

This candidate does **not** require a new D5-05 Application event name, payload, bridge, or authority if kept within the already-existing Sheet `comment-deleted` and Workbook `comment-delete` surfaces. It must not claim Application-level propagation. If an Application event is required for this mutation, it is blocked on D5-05.

The candidate is technically implementable using the current Worksheet-to-Workbook bridge and does not need a newly invented cross-level order. However, D5-01 remains pending owner approval. The operation can preserve present bridge semantics without asserting a global completion order (consistent with proposed Option C), but cannot be represented as formally D5-01-closed. If the owner rejects Option C or requires strict all-observers-before-next-layer sequencing, stop and produce a separate compatibility plan before implementation.

This is an implementation design, not authorization. A future package must receive the operation/API owner's approval for no-op and thread-cascade semantics plus explicit implementation authorization. No other D2-11 family closes as a result.
