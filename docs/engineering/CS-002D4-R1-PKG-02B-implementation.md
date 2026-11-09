# CS-002D4-R1 PKG-02B — Workbook-Owned Column Width Implementation

**Disposition:** bounded Workbook-owned `setColumnWidth` implementation complete
**Production strategy:** Incremental Journal remains default; Snapshot remains an internal reference strategy
**Overall CS-002D4-R1 acceptance:** WITHHELD

## Baseline and change boundary

Starting HEAD was `88b09634f17f3b39d88a88c5428f76b426459a2b`; `git status --short` listed 343 paths. The worktree was already dirty. The existing six-operation mutation slice and all unrelated changes were preserved.

PKG-02B changed:

- `packages/core/src/workbook-access-types.ts` — additive mutation-port and transaction-context signatures.
- `packages/core/src/workbook.ts` — seventh staged operation, port/context wiring, preflight validation, and authorized apply path in the existing FIFO batch.
- `packages/core/src/worksheet.ts` — exact sparse Journal before-images, independent Snapshot state, and event buffering for owned width changes. Standalone setter behavior remains unchanged.
- `packages/core/src/workbookMutationTestHooks.ts` — internal-only width write/restore failure phases; not exported from the public Core barrel.
- `packages/core/__tests__/workbook-column-width-journal.p1-pkg-02b.test.ts` — focused owner transaction and compatibility regressions.
- Three PKG-02B reports: verification, D2-11 closure, and this implementation record.

The exported API interfaces were already re-exported from `packages/core/src/index.ts`, so no barrel edit was needed. No renderer, React, binary persistence, XLSX, ledger, frozen-register, or unrelated mutation-family change was made.

## API and preflight contract

Added:

```ts
workbook.mutationPort.setColumnWidth(sheet, column, widthPx): Promise<void>
workbook.transact((tx) => tx.setColumnWidth(sheet, column, widthPx)): Promise<void>
```

The transaction context method stages a width operation; it does not write immediately. Targets use the existing Workbook-issued view/Worksheet ID resolution and capability path. Preflight rejects non-integer or out-of-range columns and any width that is not a runtime number, is non-finite, or is `<= 0`. No coercion, clamping, rounding, or maximum was added. All staged operations are validated before any mutation. The raw adopted Worksheet setter remains guarded.

## Journal, Snapshot, and commit behavior

The Journal stores a first-touch before-image per column and Worksheet as either `{present:false}` or `{present:true,widthPx}`. It captures before assignment, keeps the original image across repeated writes, restores touched columns in reverse first-touch order, and deletes an originally absent map entry. It does not copy the full width map. Participating Worksheets continue to roll back in reverse order.

The Snapshot reference independently captures all explicit column-width entries into `WorkbookCellWriteState` and restores the full map from that detached state. It does not call Journal restoration. Journal remains the default strategy.

During an owned batch, `Worksheet.setColumnWidth` uses the existing event sink after its before/after failure seams, publishing one generic `sheet-mutated` event per staged write. Same-value and repeated writes remain eventful. Events publish only after the shared commit point and retain global staged order. A clean pre-commit rollback emits no buffered success events. Post-commit observer failures remain isolated by the existing Workbook publisher. Width writes do not alter the visibility store, dependency graph, or cell state.

Internal test phases cover before width-map write, after width-map write, and during width restoration. The existing after-restoration/before-batch-discard hook covers the post-restore cleanup failure point. No public failure hook was added.

## Compatibility and boundaries

The five existing cell-write kinds and `setRowHeight` remain unchanged, yielding seven operation kinds. Standalone `Worksheet.setColumnWidth` still stores permissively and directly emits for each call; React undo/history was not changed. Width changes remain transactional in memory only: object snapshots preserve explicit widths, while the binary SnapshotCodec omits them. No persistence behavior is promised or changed. The known independent mutation-port self-await limitation remains unchanged.
