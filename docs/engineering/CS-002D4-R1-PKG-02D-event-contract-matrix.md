# CS-002D4-R1 PKG-02D — Seven-Operation Event Contract Matrix

## Scope and governing contract

This review covers only the seven Workbook transaction operations accepted in PKG-02A/B/C: `setCellValue`, `setCellFormula`, `clearCellContent`, `clearCellFormula`, `setCellStyle`, `setRowHeight`, and `setColumnWidth`. It adds no operation or event API.

The authoritative contract is [CS-002D4-R1-authoritative-contracts.md](CS-002D4-R1-authoritative-contracts.md), D5-01 through D5-05, read with D2-01, D2-08, and D2-11. D5-01 approves Sheet → Workbook → Application propagation for observable committed mutation events; D5-02 requires publication after commit; D5-03 isolates listener failures. D5-05 leaves Application authority and stable names/payloads unresolved. D2-08 places event publication after state application and validation at the transaction commit boundary. D2-11 remains globally unresolved outside this seven-operation inventory.

## Operation matrix

| Transaction operation | Worksheet event staged | Workbook EventBus event today | Visibility and frequency | Contract assessment |
| --- | --- | --- | --- | --- |
| `setCellValue` | `cell-changed` | `cell-value-change` | Workbook-issued `WorkbookSheetView.on` and an active Workbook bridge observe after commit. One Worksheet event per successful staged write, including repeated writes; commit-list order is retained. | Sheet → Workbook is implemented for the value event. No Application bridge exists in this Core path. |
| `setCellFormula` | `cell-changed` | `cell-value-change` and, when the resulting cell has a formula, `cell-formula-change` | Both Worksheet and active Workbook subscribers observe after commit. The two public Workbook event names are derived from one Worksheet event; repeated writes retain per-write publication. | Sheet → Workbook is implemented for these existing event names. No Application bridge exists in this Core path. |
| `clearCellContent` | `cell-changed` | `cell-value-change` | The cleared state is committed before Worksheet and Workbook notification. A formula-change event is not emitted by the current bridge handler when the resulting cell has no formula. | Current bridge behavior; do not infer an additional formula-clear contract. |
| `clearCellFormula` | `cell-changed` | `cell-value-change` | The cleared formula state is committed before notification. The current formula bridge only emits when the resulting event cell has a formula. | Current bridge behavior; no distinct formula-removal Workbook event is established. |
| `setCellStyle` | `style-changed` | `cell-style-change` | Worksheet and active Workbook subscribers observe after commit; per-write order is retained. | Sheet → Workbook is implemented for the existing style event. |
| `setRowHeight` | `sheet-mutated` | None | A `WorkbookSheetView.on` subscriber receives one generic event for every successful staged write, including same-value and repeated writes, after commit. Multi-sheet events preserve global staged order. | Observable on the Sheet surface, absent on Workbook EventBus. D5-01 applies broadly to committed observable events, but does not define a dimension event name or payload. |
| `setColumnWidth` | `sheet-mutated` | None | Same as row height: one generic Worksheet event per successful staged write, including same-value/repeated writes, after commit and in global order. | Same D5-01 propagation gap and D5-05 schema blocker. |

## Shared publication behavior

- Transaction callbacks do not publish these events while operations are being staged. Successful commit publishes them synchronously after the state changes are applied.
- Clean rollback discards buffered success events. PKG-02B verifies mixed seven-kind rollback under Journal and Snapshot; PKG-02C verifies the multi-Worksheet failure and batch-settlement cuts under both strategies.
- The commit-event list retains global staged order across Worksheets. PKG-02B's interleaved event regression directly verifies the Worksheet event sequence. Workbook cell bridge events are delivered as the corresponding `cell-changed` entries are published.
- Repeated dimension writes produce repeated generic `sheet-mutated` notifications. No dimension-specific fields are carried in that payload.
- Workbook EventBus dispatch catches each synchronous listener exception, reports it, and continues to later listeners. Observer errors occur after commit and cannot reverse state. The existing Worksheet publisher also isolates observer errors.
- Workbook disposal during publication makes the publisher stop subsequent observers/events, while the state already committed remains committed.

## Required distinction

The Workbook EventBus bridge in `packages/core/src/eventBridge.ts` registers named cell, style, pointer, and comment event bridges. It does not subscribe to or forward the generic `sheet-mutated` event. Dimension changes are currently observable through `WorkbookSheetView.on`, not through a named Workbook EventBus notification. The Core event bridge has no Application-level publication authority.

The exact assertions and verification results are in [PKG-02D verification](CS-002D4-R1-PKG-02D-verification.md). The policy recommendation is in [bridge compatibility](CS-002D4-R1-PKG-02D-bridge-compatibility.md).
