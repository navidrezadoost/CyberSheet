# CS-002D4-R1 PKG-02S — Operation Scope

**Disposition:** one operation source-validated; implementation planning only
**Candidate:** Workbook-owned `setRowHeight`
**PKG-02 implementation:** not authorized
**Production mutation default:** Incremental Journal for the existing five cell-write operations
**Overall CS-002D4-R1 acceptance:** WITHHELD

## Baseline

- Starting HEAD: `88b09634f17f3b39d88a88c5428f76b426459a2b`.
- Starting `git status --short`: 331 paths; the existing dirty worktree was preserved.
- The PKG-01K report records 237/237 Core sidecar hashes matching after restoration. The same manifest was checked at the start of PKG-02S; all 237 entries matched. No sidecar was changed by this documentation checkpoint.
- PKG-01J and PKG-01K readiness/gate reports and D2-11 in `CS-002D4-R1-authoritative-contracts.md` were reviewed. No broad Core suite was run.

## Source-validated operation

`Worksheet.setRowHeight(row, px)` is implemented in `packages/core/src/worksheet.ts` next to `getRowHeight`, `setRowHeights`, and `setColumnWidth`. It stores `px` in the private `#rowHeights: Map<number, number>` and immediately emits the generic `{ type: "sheet-mutated" }` event. `getRowHeight(row)` returns the stored number or `20` when the map has no entry. The setter has no local range, finiteness, positivity, or no-op check; it emits even when assigning the same effective value.

The row coordinate follows existing Worksheet row indexing: one-based. The current setter itself does not enforce that convention. Any new Workbook operation must validate row as an integer in `1..rowCount` before mutation; this is a proposed owner-path contract, not existing behavior. `heightPx` must be finite and greater than zero. No maximum height is established by this source path; the React manual/AutoFit UI uses its own conversions/caps and is not a Core API contract. The maximum-height policy must be recorded by the API owner before implementation.

The prototype-owned-mutator guard list includes `setRowHeight` and `setRowHeights`. A call on an adopted Worksheet is rejected unless the Workbook's private capability authorizes it. `WorkbookSheetView` exposes `getRowHeight` only. Thus the candidate does not provide an existing Workbook mutation path and must not call a public raw Worksheet setter from the new owner entrypoint without the established capability path.

## Proposed additive API shape

Subject to the value-policy decision below, add the following methods to the existing interfaces in `packages/core/src/workbook-access-types.ts`:

```ts
interface WorkbookMutationPort {
  setRowHeight(sheet: WorksheetId | WorkbookSheetView, row: number, heightPx: number): Promise<void>;
}

interface WorkbookTransactionContext {
  setRowHeight(sheet: WorksheetId | WorkbookSheetView, row: number, heightPx: number): void;
}
```

`mutationPort.setRowHeight` is an independent FIFO operation, matching the five current mutation-port methods. `transaction.setRowHeight` stages one operation in the current FIFO slot, matching the cell-write transaction-context pattern. Resolve an issued view or Worksheet ID to the owning Worksheet at staging time; copy primitive arguments; revalidate target existence and row bounds before apply. Do not expose a raw Worksheet, capability, or new internal state API. The existing exported `WorkbookMutationPort` and `WorkbookTransactionContext` types are already exported from `packages/core/src/index.ts`; adding methods is an additive type-surface change and needs no new standalone barrel symbol.

Use a distinct operation discriminant such as `{ kind: 'setRowHeight', worksheetId, row, heightPx }`; do not route it through a cell address or style operation. Preserve the FIFO rule and documented direct/indirect self-await limitation. A transaction callback must use its supplied context for this operation and must not await an independent mutation-port promise from inside the same transaction.

## Existing callsites and consumers

- `packages/core/src/FormattingController.ts`: formatting can increase row height to satisfy a minimum-height option, using `getRowHeight` then `setRowHeights` after a style transaction. This path is Worksheet-level, not Workbook-owned, and is not converted in this scope.
- `packages/react/src/utils/formatOperations.ts` and `packages/react/src/components/ribbon/HomeTab.tsx`: manual row-height changes snapshot prior numeric heights and use standalone `Worksheet.setRowHeight` for execute/undo. `requireStandaloneWorksheet` keeps this UI command path out of Workbook-owned writes. It is not Workbook transaction history.
- `packages/renderer-canvas/src/CanvasRenderer.ts`: row heights feed cached row tops, range geometry, rendering, hit testing, page layout, and resizing. The renderer listens for `sheet-mutated`/`filter-changed`, invalidates its layout cache and grid lines, clears a prior partial dirty rectangle, then schedules a full redraw. This is observer/derived renderer state, not Core-owned row-height state. A committed Workbook event should preserve the existing generic invalidation signal; this package does not change renderer behavior or promise a completed paint.
- `Worksheet.extractSnapshot()` / `applySnapshot()` in `worksheet.ts` include explicit row-height entries. `SnapshotCodec.ts` documents its binary Worksheet snapshot as excluding row heights, and the binary section table has no row-height section. No `rowHeight`/`rowHeights` path was found under `packages/io-xlsx/src`. The `FileOperations` default-row-height preference is not evidence that per-row dimensions are serialized. Persistence formats are not to be silently expanded by this operation.

## Boundaries

Only explicit row-height mutation is selected. Column widths, row insertion/deletion, hidden/visible rows, style-driven auto-fit, Workbook or Worksheet lifecycle, Pivot state, merged reads, file-format persistence, and general structural mutations remain excluded. Existing standalone calls retain their current API and semantics unless a separate compatibility decision authorizes a change.

See [the D2-11 matrix](CS-002D4-R1-PKG-02S-D2-11-side-effect-matrix.md), [acceptance plan](CS-002D4-R1-PKG-02S-acceptance-test-plan.md), and [readiness decision](CS-002D4-R1-PKG-02S-implementation-readiness.md).
