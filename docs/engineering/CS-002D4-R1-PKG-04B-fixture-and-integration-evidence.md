# CS-002D4-R1 PKG-04B — Fixture and integration evidence

**Baseline:** Git HEAD `88b09634f17f3b39d88a88c5428f76b426459a2b`; shared worktree already contained unrelated changes and was preserved.
**New executable artifact:** `packages/core/__tests__/worksheet-comment-existing-contract.p1-pkg-04.test.ts`.
**Production changes:** None.

## Fixture boundary

The focused fixture constructs a standalone `Worksheet`, uses its public `addComment` and `deleteComment` methods, and observes events through `Worksheet.on`. The bridge case creates an `EventBus`, installs `setupWorkbookLazyBridges(() => [sheet], bus)`, subscribes to `comment-delete`, deletes a standalone comment, and disposes the subscription.

This fixture directly reaches the current Worksheet code and bridge mapper. It does not create an adopted sheet, call an owner mutation path, exercise Workbook transaction staging, or prove rollback, commit-only publication, or Workbook bridge behavior for a future owned deletion. The actual Workbook bridge's lazy mapper is characterized as an existing component only.

## Source-established integration constraints

- `Worksheet.deleteComment` is currently standalone and returns a boolean. Workbook ownership guards prevent using raw adopted Worksheet mutation as an owner route.
- `WorkbookSheetView.getComments` returns detached comment data. Normal owner reads do not expose internal comment arrays for mutation.
- `WorkbookEventBridgeManager` already maps Worksheet `comment-deleted` to EventBus `comment-delete` with `{row, col, commentId}` and lazily wires a Worksheet subscription.
- The current delete is a cell-local filter replacement, emits one Worksheet event for an effective delete, and emits none for a missing target. It does not allocate an absent cell. Removing the last entry sets the field to `undefined` while retaining the CellRecord.
- No production test hook or fake Workbook API was introduced to bridge the current reachability gap.

## Integration boundary

The fixture and test are intentionally isolated from the seven-operation transaction implementation. They do not alter its staged kinds, FIFO, commit boundary, rollback path, error recovery, event buffering, or Journal/Snapshot selection. The proposed Workbook comment operation needs its own acceptance tests only after explicit implementation authorization.
