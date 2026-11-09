# CS-002D4-R1 PKG-02E-S — Typed Dimension Event Contract Proposal

**Status:** Proposed contract for owner review; not approved and not implemented.
**Scope:** Existing Workbook-owned `setRowHeight` and `setColumnWidth` transaction operations only.
**Production default:** Incremental Journal, unchanged.

## Decision context

D5-01 requires committed observable mutation events to propagate Sheet → Workbook → Application. PKG-02D confirmed that row and column dimensions currently publish only the generic Worksheet event `{ type: 'sheet-mutated' }`. D5-05 leaves stable event names/payloads and Application-level event authority unresolved. PKG-02A/B document one Worksheet event per successful staged dimension write, including same-value and repeated writes; PKG-02B/C verify commit-only publication, rollback suppression, and cross-Worksheet staged order.

## Proposed names and payloads

The approved direction is narrow typed Workbook events, never automatic forwarding of arbitrary `sheet-mutated` notifications:

```ts
export type WorkbookRowHeightChangeEvent = {
  worksheetId: WorksheetId;
  row: number;
  heightPx: number;
};

export type WorkbookColumnWidthChangeEvent = {
  worksheetId: WorksheetId;
  column: number;
  widthPx: number;
};

// Event names on Workbook.eventBus:
// 'row-height-change'   -> WorkbookRowHeightChangeEvent
// 'column-width-change' -> WorkbookColumnWidthChangeEvent
```

These are exact proposals, not production interfaces. `worksheetId` is selected over the draft `sheetId`: the public owner-backed `WorkbookSheetView` exposes `readonly worksheetId: WorksheetId`, and `WorksheetId` is publicly exported. The index values and committed values use the same names as the transaction context (`row`/`heightPx`, `column`/`widthPx`). Payloads are flat records, matching the existing Workbook bridge's flat payload convention. They carry no mutable Worksheet, capability, journal, or Workbook internal state.

Existing bridge payloads (`cell-value-change`, `cell-formula-change`, `cell-style-change`) are flat and omit sheet identity. The proposal adds a canonical identity only to the new dimension event payloads; it does not alter existing names or payloads.

## Source compatibility assessment

`EventAPI` currently accepts `event: string` and a handler receiving `unknown`; `Workbook.eventBus` exposes only `on`, `once`, and `off`. There is no authoritative typed Workbook event registry. The proposed names follow the established `*-change` convention and are accepted by the current string-based surface, but typed subscription is not currently available. An additive typed event map/overload and public type exports should be reviewed as part of formal approval. Existing generic-string callers must continue to typecheck, and existing Cell/Style event payloads must remain byte-for-byte shape compatible.

`WorkbookSheetView.on` remains unchanged and continues receiving `SheetEvents`, including generic `sheet-mutated`. This makes the Workbook event a new additive observation route, not a replacement or duplicate forwarding of the Worksheet event.

## Eligible mutations and delivery semantics

- Only a successful Workbook-owned `setRowHeight` transaction operation produces `row-height-change`.
- Only a successful Workbook-owned `setColumnWidth` transaction operation produces `column-width-change`.
- A standalone `Worksheet` setter continues to publish its existing generic Worksheet event only; standalone sheets have no Workbook owner or Workbook EventBus.
- Each successful staged dimension call produces exactly one typed Workbook event, including same-value and repeated writes. Do not coalesce by final state.
- The event payload comes from the staged transaction operation (`worksheetId`, row/column, requested committed height/width), not from post-commit reads and not by inspecting a generic `sheet-mutated` event.
- Listeners observe the final committed Workbook state. No dimension notification is published before the commit point. Any clean pre-commit rollback discards all staged typed events.
- Global order follows staged transaction order across Worksheets. For a dimension operation, publish the existing Worksheet `sheet-mutated` notification first and the corresponding Workbook typed event after the Worksheet's synchronous observer dispatch has completed. This ordering makes the new route Sheet-before-Workbook for that operation.
- Application-level forwarding is not specified here. D5-05 still requires a separate authority/schema/migration decision before claiming the complete three-level route.

## Prerequisites before implementation

The Workbook/API event owner must approve these exact names and payloads, the additive typed EventAPI declaration/export strategy, same-value frequency, and the post-disposal subscription rule. In addition, the D5-01 meaning of cross-level ordering needs confirmation for existing Cell/Style bridges: those bridges currently emit into Workbook EventBus from within Worksheet listener dispatch, so the relative order of Workbook and other Worksheet listeners can depend on Worksheet listener registration order. PKG-02E-S does not change existing Cell/Style delivery to resolve that.
