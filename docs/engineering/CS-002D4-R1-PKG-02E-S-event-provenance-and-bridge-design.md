# CS-002D4-R1 PKG-02E-S — Event Provenance and Bridge Design

**Status:** Design proposal only. No production event or transaction source changed.

## Current source path

1. `Workbook.transact()` stages a discriminated `CellWriteOperation` array in callback order (`packages/core/src/workbook.ts:54-63,329-379`).
2. The Workbook applies those operations in order (`workbook.ts:575-588`). Each dimension operation carries explicit target `worksheetId`, row/column, and height/width.
3. During an owned batch, `Worksheet.setRowHeight` and `setColumnWidth` write their maps then call `#_emitOrBuffer({ type: 'sheet-mutated' })` (`packages/core/src/worksheet.ts:851-862,2140-2166`). The Worksheet event sink appends `{ worksheet, capability, event }` to `commitEvents` (`workbook.ts:534-539`). The event itself contains no mutation provenance.
4. A successful batch crosses the commit point before the ordered `commitEvents` publication loop (`workbook.ts:594-608,683-707`). Clean rollback discards Worksheet pending batches (`worksheet.ts:958-970`) and no commit event is published.
5. The current Worksheet bridge maps `cell-changed` and `style-changed` to flat named Workbook EventBus events (`packages/core/src/eventBridge.ts:14-53`). It does not bridge `sheet-mutated`.

## Bounded provenance design

Use the already staged operation as the sole source of typed dimension metadata. Do not change `SheetEvents` and do not infer a dimension operation from `sheet-mutated`.

Proposed publication record:

```ts
type CommittedPublication =
  | { order: number; phase: 'worksheet'; worksheet: Worksheet; capability: Capability; event: SheetEvents }
  | { order: number; phase: 'workbook-dimension'; eventName: 'row-height-change' | 'column-width-change'; payload: WorkbookDimensionEvent };
```

For each staged operation, the apply loop establishes its operation index. The existing event sink records Worksheet events with that index. For `setRowHeight`/`setColumnWidth` only, after the guarded setter returns successfully, the Workbook appends a typed record built directly from that operation's explicit fields. The ordered publication journal then emits entries by stage index, with the dimension's Worksheet event before its typed Workbook event. No read-after-write reconstruction is involved; repeated writes retain separate stage indices and separate payloads.

If any operation or commit preflight fails before the commit point, discard the entire publication journal. After commit, publish synchronously in original staged order. Listener failures are isolated and cannot roll state back. Disposal during dispatch stops later publications using the existing `shouldContinue`/disposed check.

The typed dimension record is transaction-owned metadata, not a new Worksheet event and not a new mutation operation. The event bridge should emit it only from the committed publication path when the matching Workbook EventBus event has subscribers. No per-Worksheet listener is required for this provenance path; the existing Cell/Style bridge remains lazy and Worksheet-backed.

## Alternatives rejected

- **Inspect `sheet-mutated` and read current dimensions after commit:** cannot identify which of multiple repeated operations produced an event or recover each intermediate staged value.
- **Add row/column fields to generic `sheet-mutated`:** changes the existing public Worksheet event contract and still couples unrelated generic invalidations to operation types.
- **Forward all Worksheet events:** expands public event names/frequency and risks duplicate or unrelated notifications.
- **Coalesce by final state:** loses one-event-per-staged-write behavior.
- **Reorder by Worksheet map/iteration:** violates global staged transaction order.

## Lifecycle ownership

The current lazy Cell/Style bridges are registered by `WorkbookEventBridgeManager` and their Worksheet listener disposables are held in its `wiring` map (`eventBridge.ts:112-150`). `EventBus.removeAll()` already deactivates every active bridge and clears listeners (`packages/core/src/EventBus.ts:105-110`), but `Workbook.dispose()` does not currently call it (`workbook.ts:1088-1096`). The Workbook owns `#internalEventBus` and is the correct cleanup owner.

Proposed disposal change for a separately authorized implementation: when disposal first marks the Workbook disposed, immediately call `#internalEventBus.removeAll()` exactly once, before cancellation/queue completion. This must be safe during EventBus dispatch: `shouldContinue` already checks `!#disposed`, so no later subscriber or staged event runs. Repeated `dispose()` remains idempotent. It must not touch other Workbook instances.

The Workbook's public `eventBus` facade directly binds `on`/`once`/`off` today (`workbook.ts:216-220`) and can currently establish a new bridge after disposal even though delivery is suppressed. That post-disposal subscription behavior is unspecified. The design recommends rejecting `on` and `once` after disposal with the existing `WorkbookOperationCancelledError` pattern, while `off` and previously returned unsubscribe closures remain idempotent no-ops after teardown. This behavior requires API-owner approval; it is not implemented here.

## Ordering caveat for existing bridges

`Worksheet.publishWorkbookCellWriteEvent` dispatches Worksheet listeners in registration order (`worksheet.ts:973-1001`). The lazy Workbook bridge is one such listener and synchronously calls EventBus `emit` (`eventBridge.ts:141-145`, `EventBus.ts:90-103`). Therefore a Workbook Cell/Style listener can run before another Sheet listener registered later. D5-01's arrow notation may imply a stricter level ordering; current source does not guarantee that all Sheet observers complete before Workbook observers. Changing existing Cell/Style ordering would be a separate compatibility decision. The typed dimension design above can guarantee Sheet-before-Workbook for its own events by publishing the typed record after Worksheet notification returns.
