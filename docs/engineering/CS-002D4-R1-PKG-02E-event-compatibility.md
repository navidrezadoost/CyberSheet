# CS-002D4-R1 PKG-02E — Compatibility review

## Additive Workbook event API

Two names are now typed on the existing `Workbook.eventBus` API:

| Event | Payload |
| --- | --- |
| `row-height-change` | `{ worksheetId: WorksheetId; row: number; heightPx: number }` |
| `column-width-change` | `{ worksheetId: WorksheetId; column: number; widthPx: number }` |

Payloads identify the Workbook-owned worksheet and carry the staged values. The EventBus still accepts other string event names with an `unknown` payload contract. Public exports flow through the existing EventBus export in `packages/core/src/index.ts`; no export wiring or Application event authority was changed.

## Delivery and ordering

Only successful Workbook transaction/port dimension writes emit these events. Each successful staged operation emits one matching Worksheet `{ type: 'sheet-mutated' }` event followed by one Workbook typed event. The combined publication list retains global staged order across Worksheets and operation types. Same-value and repeated writes remain eventful once per staged write. Failed/rolled-back work publishes neither event.

Standalone Worksheet setters retain their existing behavior and generic event shape. No generic `sheet-mutated` event is forwarded to Workbook. Existing Workbook Cell and Style bridge names, payloads, and relative dispatch behavior are unchanged. Because those bridge listeners run from Worksheet mutation-listener dispatch, their position relative to arbitrary Worksheet observers can still depend on registration order; this slice does not redefine that contract.

## Disposal compatibility

Disposal now explicitly removes active Workbook EventBus bridges and clears subscribers. Calls to `on`/`once` after disposal fail synchronously with `WorkbookOperationCancelledError`. `off`, returned unsubscribe functions, and repeated `dispose()` calls are idempotent. Tests verify that disposing one Workbook leaves a second Workbook's active cell bridge usable.

## Deliberate non-changes

- No Cell/Style payload or bridge behavior changes.
- No Application-level forwarding, event authority, or migration policy.
- No row/column mutation families beyond the already-authorized staged operations.
- No Journal default, Worksheet event schema, persistence, renderer, or Pivot behavior changes.

Overall CS-002D4-R1 acceptance remains **WITHHELD**.
