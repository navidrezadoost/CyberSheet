# CS-002D4-R1 PKG-07A — Comment deletion implementation blueprint

**Status:** Engineering blueprint only. No API-owner approval or implementation authorization is established here.
**Inspected revision:** `88b09634f17f3b39d88a88c5428f76b426459a2b`.
**Observed worktree:** 432 status entries at inspection; existing changes were preserved. This lane changes this document only.
**Mutation boundary:** One proposed Workbook-owned comment-delete operation; the existing seven operations remain unchanged.
**Production strategy:** Incremental Journal. Snapshot is an independent comparison path selected by existing test hooks.
**Overall CS-002D4-R1 acceptance:** WITHHELD.

## Decision summary

The implementation can use the current transaction and event infrastructure with one operation-specific addition. The replacement-only comment algorithm already emits the existing Worksheet `comment-deleted` event, and the existing bridge maps that event to Workbook `comment-delete`. The current generic Journal and Snapshot cell copies are shallow at the `Cell` boundary, which retains the original `comments` array reference. That is sufficient for this deletion-only write set because deletion replaces the property and does not edit the retained graph. The Journal helper currently normalizes addresses to merged-cell anchors; a comment-delete before-image must instead key the addressed cell exactly, or the contract must explicitly reject non-anchor merged cells.

One material source contradiction must be resolved in the owner contract. PKG-04A says a missing comment ID is a no-op. Current `Worksheet.deleteComment(..., true)` does not first check for a root record: it seeds the cascade set with the requested ID, includes any orphan comment whose `parentId` matches, and can remove that orphan subtree and emit an event. PKG-07 requires a missing-ID no-op. The owner must decide whether the Workbook operation preserves this existing cell-local cascade behavior or adds a Workbook-only root-existence precheck. This finding does not establish a standalone product defect and does not authorize changing standalone behavior.

## Source-level patch plan

The locations below identify the narrow future patch surface, not permission to edit it.

| File and current source location | Proposed implementation change | Boundary |
| --- | --- | --- |
| `packages/core/src/workbook-access-types.ts:27-35` (`WorkbookMutationPort`); `:44-51` (`WorkbookTransactionContext`) | Add exactly `deleteComment(sheet, address, commentId)` to each interface. Transaction-context method stages and returns `void`. Recommended mutation-port return is `Promise<void>` to match the seven existing methods; see unresolved return choice below. | Do not add a general comment operation family. |
| `packages/core/src/workbook.ts:58-65` (`CellWriteOperation`) | Add one discriminant, e.g. `{ kind: 'deleteComment'; worksheetId; address; commentId }`. | No eighth operation beyond this one. No cascade flag in the initial API; policy is fixed to `true`. |
| `packages/core/src/workbook.ts:257-265` (`mutationPort`) | Route the port method through `this.transact(tx => tx.deleteComment(...))`. | Keep queueing, cancellation, disposal, and health checks on the existing path. |
| `packages/core/src/workbook.ts:391-414` (transaction context construction) | Resolve Workbook-issued sheet ownership with `resolveTargetId`, copy the address using `copyAddress`, stage the string ID, and reject use after context revocation through existing `stage`. | Do not retain caller-owned address objects. Do not inspect comment state during callback staging. |
| `packages/core/src/workbook.ts:518-542` (operation preflight), `:605-640` (apply switch) | Validate the one-based address before any Worksheet write; add one switch arm which invokes the guarded Worksheet delete method under the existing capability. Effective/no-op is evaluated in staged operation order against current transaction state. | No cell allocation for absent targets. Keep mixed operations in the same FIFO transaction. |
| `packages/core/src/worksheet.ts:218-230` (`WorkbookCellWriteFailurePhase`), `:252-257` (`WorkbookCellWriteJournal`) | Add test-only fault phases for before replacement, after replacement, and during comment restoration if existing injection coverage cannot distinguish these cuts. Add an exact-address comment before-image only if the existing Journal cell image cannot represent it correctly. | Internal test seams only; never expose a public failure hook. |
| `packages/core/src/worksheet.ts:589-597` (`#recordWorkbookCellWriteBeforeImage`), `:640-648` (Journal restore), `:894-908` / `:930-942` (Snapshot capture/restore) | For comment deletion, record the exact addressed cell's first image, preserving explicit cell presence and the original comments-array reference. Ensure Journal and Snapshot independently restore that reference and do not publish during restore. | Existing helper uses merge-anchor canonicalization; do not use it unchanged for a non-anchor address. |
| `packages/core/src/worksheet.ts:3051-3094` (`deleteComment`) | Reuse or factor the replacement-only cascade with the approved missing-ID rule. Under Workbook batch, retain existing Worksheet event via `_emitOrBuffer`; no-op must avoid replacing state and emitting. Preserve survivor order and set empty comments to `undefined`. | Standalone behavior remains unchanged unless separately authorized. |
| `packages/core/src/workbook.ts:67-70,751-769` and `packages/core/src/eventBridge.ts:102-109` | Keep the existing commit-event sink/publication pipeline and `comment-delete` bridge mapping. No new bridge event/schema is needed for the existing payload. | No Application forwarding; D5-05 remains separate. |

### Exact-address before-image design

For one `(Worksheet identity, packed addressed cell)` preserve whether the cell existed and, when present, the original `comments` property value/reference. A dedicated compact image can be represented as:

```ts
type CommentDeleteBeforeImage =
  | { present: false }
  | { present: true; comments: CellComment[] | undefined };
```

The implementation may instead use the existing cell-image map if its key is the exact addressed coordinate. The before-image is captured once, immediately before the first effective delete in that transaction. It retains the original array reference without traversing metadata. If earlier staged operations already recorded a before-image for the same exact cell, retain the transaction-entry image rather than replacing it. On rollback, restore the original comments property/reference, or ensure the originally absent cell remains absent. Do not claim internal `Cell` object identity: Journal restore currently installs a shallow copied record and Snapshot restore rebuilds records. The exact guarantee is comments-array and comment-graph identity, cell presence, and unchanged non-target fields at the observable state boundary.

The existing Journal helper maps a requested coordinate to its merge anchor before recording. Because `deleteComment` itself reads the exact coordinate, using that helper unchanged can record the wrong cell for comments attached to a non-anchor merged coordinate. The implementation must either add an exact-coordinate capture route for this operation or have the approved contract explicitly reject such addresses before any mutation. Prefer exact-coordinate capture to preserve the existing standalone coordinate behavior.

## Proposed operation behavior and decisions

These are recommendations for owner review, not approved contract text.

| Question | Source evidence | Engineering recommendation | Approval state |
| --- | --- | --- | --- |
| Identity | `CellComment.id` is a string; current lookup is scoped to the addressed cell (`worksheet.ts:3054-3084`). | Cell-local identity `(sheet, address, id)`; no Workbook-global search. | Pending owner decision. |
| Duplicate IDs | The current set/filter removes every record whose `id` equals the target; descendants are then included by parent ID. | Preserve this behavior: delete all target-ID duplicates plus their transitive descendant IDs, preserving survivor order. | Pending owner decision. |
| Reply policy | `Worksheet.deleteComment` defaults `deleteReplies` to `true` (`worksheet.ts:3054-3058`). | Fix cascade to `true` for this one API; do not expose a flag in this slice. | Pending owner decision. |
| Missing cell or comments array | Current standalone returns `false` before mutation (`:3059-3060`). | No-op, no cell allocation, no event. | Recommended; owner decision pending. |
| Missing ID when orphan descendants exist | Current algorithm has no root-existence guard; orphan descendants with `parentId === commentId` can be removed (`:3064-3086`). This contradicts PKG-04A's broad no-op statement and PKG-07's required missing-ID no-op. | Owner must choose: (a) preserve current cascade semantics for the Workbook API, including orphan descendants, or (b) require a matching root ID before cascade, making missing ID a no-op. If PKG-07's no-op is mandatory, recommend (b) only in the new Workbook operation; leave standalone Worksheet semantics untouched. | Blocking owner contract choice. |
| Return | Existing standalone API returns `boolean`; all seven Workbook port methods return `Promise<void>`. A transaction-context operation cannot synchronously report commit-time effect. | Recommend `tx.deleteComment(...): void` and `mutationPort.deleteComment(...): Promise<void>`; distinguish success/no-op through existing events and state. If a boolean is required, explicitly design commit-time result plumbing; do not return a guessed staging-time result. | Blocking owner contract choice. |
| Empty collection | Existing delete sets `comments = undefined` after deleting the final item, retaining the CellRecord (`:3088-3090`). | Preserve `comments === undefined`; do not remove the cell record. | Recommended; owner decision pending. |
| Events | Existing Worksheet event is `{ type: 'comment-deleted', address, commentId }`; existing Workbook bridge emits `comment-delete` with `{ row, col, commentId }`. | One Worksheet event and one existing bridged Workbook event per effective staged delete; none for no-op; preserve names and payloads. | Recommended; owner decision pending. |
| Metadata graph | Delete replaces the array and does not mutate old comment nodes. PKG-05/06 recommend the original reference as a deletion-only before-image. | Preserve the exact original comments-array reference; no deep clone, normalization, or metadata traversal. This depends on replacement-only deletion. | Engineering recommendation; operation owner approval pending. |

## Transaction, publication, and failure design

1. Preflight ownership and address before applying any operations. Stage only immutable identifiers/address copies; do not read the metadata graph during callback construction.
2. Start the existing per-Worksheet Journal or independent Snapshot capture as today. Journal uses sparse first-write images; Snapshot independently captures its state. The comment path must retain exact-coordinate absence/presence and comments reference in both strategies.
3. During ordered application, resolve the current addressed cell and comment array. Apply the owner-approved root/missing-ID rule. On no-op, make no assignment, record no before-image unless an earlier operation already did so, and emit nothing.
4. Immediately before the first effective array replacement, capture the original state once. Build the transitive target-ID set and replacement array without editing the old array or comment graph. Assign filtered survivors, or `undefined` when empty. Preserve the order of survivors.
5. Let the existing Worksheet batch convert the event into the Workbook commit-event queue. A later operation failure causes the selected strategy to restore state and `discardWorkbookCellWriteBatch` to drop buffered events. A clean rollback publishes zero success notifications.
6. At the existing commit point, state is committed before notifications publish. Preserve the current per-event-surface dispatch and listener-failure isolation; observer failure after commit does not roll the deletion back. Existing disposal behavior stops later publications when the Workbook is disposed during dispatch.
7. If restoration throws, retain both the operation error and restoration errors using `WorkbookMutationRollbackError`, mark Workbook health `recovery-required`, and reject later mutation according to existing policy. Do not report a healthy rollback.

The current transaction framework already captures cell state before apply, buffers Worksheet events and restores/discards on failure (`workbook.ts:562-735`; `worksheet.ts:621-672,894-968`). The needed change is localized state identity and exact-coordinate correctness, not a new transaction engine. The current generic Journal image is `{ ...cell }` and Snapshot images likewise shallow-copy the cell. Both preserve the array reference today, but implementation tests must prove that behavior through actual Workbook paths and all relevant fault cuts.

## Compatibility and change boundary

- Keep the existing seven operation signatures and behavior.
- Keep standalone `Worksheet.deleteComment(address, id, deleteReplies?)` behavior and boolean return unchanged in this package.
- Add only one Workbook mutation operation, fixed to cascading deletion; do not add comment add/update, undo history, persistence, Application events, or generalized metadata normalization.
- Retain the existing Worksheet and Workbook event names/payloads; do not assert a global cross-level callback completion order beyond approved D5-01 wording.
- Do not infer Workbook/API or Worksheet/API owner approval from prior user acceptance of documentation or from successful tests.
- D5-05 Application authority/schema remains excluded. Global D2-11 remains unresolved outside its operation-specific closure.

## Explicit prerequisites before implementation

1. Attributable owner decision on the exact API signatures and return/no-op semantics.
2. Explicit choice for missing-ID cascade behavior when orphan descendants exist; PKG-04A must not be cited as proof that current standalone behavior is a no-op in this case.
3. Owner acceptance of duplicate-ID behavior, fixed transitive cascade, event frequency/payload, and Policy C's replacement-only graph invariant.
4. Decision whether merged non-anchor comment coordinates are valid. If valid, implement exact-address before-image capture; do not use merge-anchor Journal capture unchanged.
5. Separate explicit authorization to implement this single operation and its Journal/Snapshot fault tests.

No implementation, owner approval, contract amendment, or D5-01/D5-05 disposition change is made by this blueprint. No tests or typechecks were run in Lane A.
