# CS-002D4-R1 PKG-04A — Exact state and rollback proposal

**Status:** Proposed technical design; not approved and not implemented.
**Baseline:** Git `88b09634f17f3b39d88a88c5428f76b426459a2b`; 398 dirty paths at PKG-04A start, preserved.
**Strategy:** Incremental Journal remains the production strategy. Snapshot is the independent fallback/test strategy already selected through test hooks.
**Overall CS-002D4-R1:** WITHHELD.

## State boundary

The only operation-owned data is the `comments` field of the addressed Worksheet cell record, plus the event records that represent successful deletes. The cell's value, formula, style, icon, hyperlink, spill metadata, custom component, dependency graph, dimensions, row/column styles, visibility, drawings, and other cells are outside the operation's write set and must remain unchanged. A missing cell is not allocated. For a present cell, deleting its final comment sets `comments: undefined` while retaining the cell record.

The comment graph must be treated as nested state: `CellComment.position`, `richText` entries and their styles, `metadata`, and `Date` fields. `metadata` is typed as `Record<string, unknown>` and does not guarantee a shallow, immutable leaf graph. The source's ordinary owner read path returns detached data, but add/update APIs and internal storage do not establish a universal prohibition on all retained references. A shallow CellRecord copy is therefore not an acceptable general exact before-image.

## Canonical before-image

For each `(worksheet identity, packed cell address)`, capture only the first pre-mutation state in the transaction:

```ts
type CommentDeleteBeforeImage =
  | { cellPresent: false }
  | {
      cellPresent: true;
      cellRecord: Cell;
      commentsPresent: boolean;
      comments: DetachedComment[] | undefined;
    };
```

`DetachedComment` here means a value-preserving detached copy of the complete supported comment graph: preserve comment order, primitive values, optional-field presence, valid Dates by timestamp, arrays and plain records recursively, and shared/cyclic references only if the supported comment data contract explicitly permits them. Today `metadata: unknown` has no explicit clone/serialization contract for functions, symbols, Maps, Sets, accessors, cycles, or custom prototypes. This is a technical prerequisite to close before implementation: either define and validate a serializable plain-data metadata graph at the ownership boundary, or specify a supported graph-aware clone that can restore those values exactly. Do not silently use JSON cloning, which loses Dates, `undefined`, aliases, and unsupported values.

For a current delete, the implementation replaces `cell.comments` with a filtered array and does not mutate the prior array or comment nodes. Retaining the prior array reference is sufficient for this one implementation path only if all mutation paths remain replacement-only and no alias can mutate its contents during the active transaction. The recommended contract uses the detached tree above so exactness does not depend on that incidental implementation detail.

## Journal strategy

1. During preflight, validate sheet ownership, address, and comment ID type/shape without modifying state. Resolve whether the target exists at commit application time; prior staged deletes can change that answer.
2. Immediately before the first effective mutation for a cell, capture one detached before-image. Keep an explicit `cellPresent` bit and `commentsPresent` bit so sparse cell absence, a present cell with `comments === undefined`, and any permitted present-but-empty array are not conflated.
3. Apply each staged delete in order. The first before-image is not overwritten by repeated writes or repeated deletes.
4. On rollback, restore only the affected cell comment field and any cell record needed by its prior presence. The preferred identity rule is to keep an already-present CellRecord object and restore its comment field in place, because comment deletion itself does not replace the record. If an accepted invariant requires record identity to be replaced instead, explicitly document that invariant; current public reads are detached, and the generic transaction Journal currently restores cells by installing a shallow copied record rather than preserving internal object identity.
5. If the cell was originally absent, ensure no cell created by this operation remains. Current delete does not create one, but exact restoration must preserve absence even if a future apply path allocates.
6. Discard all buffered deletion events on clean rollback. If restoration fails, retain the primary operation error and restoration errors in the existing recovery-required error model; do not claim healthy state.

## Snapshot strategy

Snapshot captures its own before-image independently from the Journal inverse. Do not call Journal rollback helpers from the Snapshot path. A full Worksheet snapshot is an existing fallback option, but the operation's exact state slice is only the addressed comment field and cell-presence marker; a targeted detached comment slice avoids overwriting unrelated state that is not part of the operation. If the existing transaction architecture requires a full-sheet state snapshot for its strategy, capture it independently and verify that restoring it preserves exact comments and unrelated state without publishing rollback events. In either design, use the same detached graph semantics and absent-state distinctions as the Journal path.

## Repeated deletion and event rollback

Record one before-image per target cell for the whole transaction, not one image per attempted operation. Compute success/no-op against the transaction's evolving state. A successful delete appends one `comment-deleted` event; a missing target appends none. If a target is deleted more than once, only the first effective occurrence emits. If the transaction later fails, restore the original tree once and suppress every buffered comment event from that failed transaction. Journal and Snapshot acceptance must produce identical final comment state, event trace (empty on rollback), and recovery-health classification at every supported fault cut.

## Fault-cut acceptance design (future implementation tests)

These are proposed acceptance requirements, not tests added by PKG-04A:

| Fault cut | Required postcondition |
| --- | --- |
| Before first comment write | Exact original cell presence and comment graph; no events; healthy unless cleanup itself fails. |
| After deletion array replacement | Exact original graph/order restored; unrelated cell fields and all other cells unchanged; no Worksheet or Workbook comment notifications. |
| After multiple deletes of the same cell | Restore the first transaction-entry tree, not an intermediate state; no events after rollback. |
| After successful deletion of final comment | On commit, same cell record remains with `comments === undefined`; one Worksheet and existing bridged Workbook delete event. |
| Deleting absent cell/collection/ID | No cell allocation, no event, no changed state; repeated attempts remain no-op. |
| Restoration failure | Recovery-required state, with operation error and all restore errors retained; later mutation rejected as existing policy requires. |
| Snapshot strategy at equivalent cuts | Same exact state/event/error outcomes as Journal; independent capture and restore path. |

## Source and limitation map

- `packages/core/src/worksheet.ts:3052-3094`: current delete algorithm and event.
- `packages/core/src/worksheet.ts:590-606,640-660`: generic Journal first-cell before-image is shallow; restore installs a copied cell record.
- `packages/core/src/worksheet.ts:894-927,930-946`: snapshot state capture/restore currently shallow-copies Cell fields and rebuilds cell storage.
- `packages/core/src/worksheet.ts:4168-4205`: object snapshot clone copies comment nodes and selected nested fields, but metadata only one level deep.
- `packages/core/src/persistence/SnapshotCodec.ts:618-626,735-743`: binary persistence encodes comment arrays as JSON; this package does not authorize changing its format.

No implementation, production/test change, or persistence change is authorized by this design. Exact restoration of unrestricted `metadata: unknown` remains a contract prerequisite unless existing data constraints are shown to be sufficient by owner-approved evidence.
