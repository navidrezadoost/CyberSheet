# CS-002D4-R1 PKG-02A — Workbook-Owned Row Height Implementation

**Disposition:** bounded `setRowHeight` implementation complete
**Strategy:** Incremental Journal remains production default; Snapshot remains internal test reference
**Overall CS-002D4-R1 acceptance:** WITHHELD

## Baseline and change boundary

Starting HEAD was `88b09634f17f3b39d88a88c5428f76b426459a2b`; `git status --short` listed 335 paths. The existing dirty worktree and prior PKG-02S artifacts were preserved.

PKG-02A changed:

- `packages/core/src/workbook-access-types.ts` — added the two authorized API signatures.
- `packages/core/src/workbook.ts` — stages, validates, applies, buffers, commits, and rolls back the new operation through the existing FIFO transaction path.
- `packages/core/src/worksheet.ts` — sparse Journal capture/restore, independent Snapshot dimension state, and batch-aware event routing for owned writes.
- `packages/core/src/workbookMutationTestHooks.ts` — internal-only failure phases for row-height apply/restore boundaries. This file was already untracked in the starting worktree; no public export was added.
- `packages/core/src/workbookMutationStrategy.ts` — corrected the internal default-strategy comment to describe the now-supported row-height transaction as well as cell writes. This file was already untracked at baseline; strategy behavior did not change.
- `packages/core/__tests__/workbook-row-height-journal.p1-pkg-02a.test.ts` — focused regression coverage.
- Three PKG-02A reports: implementation, verification, and D2-11 closure.

The existing dirty state of these source files was preserved. `workbook-access-types.ts`, `workbook.ts`, and `worksheet.ts` were already modified; the test-hook and mutation-strategy files were already untracked. This package's additions are limited to the row-height behavior described here. The only new test path is the PKG-02A row-height regression. No column-width, structural, Pivot, lifecycle, merged-read, persistence, React UI, renderer, or history feature was added.

## API and validation

Added:

```ts
workbook.mutationPort.setRowHeight(
  sheet: WorksheetId | WorkbookSheetView,
  row: number,
  heightPx: number,
): Promise<void>;

workbook.transact((transaction) => {
  transaction.setRowHeight(sheet, row, heightPx);
});
```

The port method enqueues one independent FIFO operation; the transaction-context method stages an operation in the active transaction. Both use existing Workbook-issued view/Worksheet-ID resolution and the existing private Worksheet mutation capability. The operation is a distinct discriminant and shares the same apply/commit/rollback boundary as cell writes.

Before any staged operation is applied, Workbook validates every staged row-height target and value. `row` must be a finite integer in `1..rowCount`; `heightPx` must be finite and strictly positive. There is no additional maximum, rounding, clamping, or normalization. Invalid values throw `RangeError`; ownership/target failures retain the existing Workbook error behavior. A validation failure leaves every staged operation unapplied, emits nothing, and leaves Workbook health unchanged.

## Journal and Snapshot

The Journal records a first-touch before-image per row as either `{ present: false }` or `{ present: true, heightPx }`. Repeated writes preserve the first image. Rollback restores rows in reverse first-touch order and participating Worksheets in reverse order. Absence is restored with `Map.delete`; an explicit `20` is restored as an explicit map entry. Journal state is released on commit, successful rollback, or rollback cleanup.

The internal Snapshot reference independently copies all explicit row-height entries into `WorkbookCellWriteState` and restores the entire explicit map. It does not call Journal restoration. Journal remains the default selected by `getWorkbookMutationStrategy()` absent a test override.

## Events, history, and compatibility

During an owned batch, the Worksheet setter emits through the existing transaction buffer and event sink rather than its standalone direct-event route. Each staged operation produces one generic `sheet-mutated`, including same-value and repeated writes, preserving staged order across sheets. Events publish after commit only. Clean rollback drops them. Existing observer isolation handles listener exceptions after commit; observer failures do not undo committed state.

Outside a Workbook batch, standalone `Worksheet.setRowHeight` retains its existing permissive map write and direct `sheet-mutated` emission. React command undo/redo remains standalone. No Workbook row-height undo history was added. The event allows renderers to invalidate layout, but this Core change does not claim a scheduled or completed canvas paint.

## Failure and recovery behavior

Internal-only test seams cover before-map-write, after-map-write, during-row-restore, and after-restoration-before-batch-discard. Failure before map update leaves source state unchanged. Failure after a write with successful rollback restores exact sparse state and emits no event. If restoration or rollback cleanup fails, the thrown `WorkbookMutationRollbackError` retains the operation error and rollback errors; Workbook enters `recovery-required`, and subsequent writes are rejected. The injected post-restore/pre-discard error is conservatively treated as recovery-required even where the row map itself has been restored.

The existing shared direct/indirect self-await limitation is unchanged. The operation does not extend binary `SnapshotCodec` or XLSX persistence, change renderer code, or introduce a global structural mutation framework.
