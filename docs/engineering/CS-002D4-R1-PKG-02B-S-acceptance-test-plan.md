# CS-002D4-R1 PKG-02B-S — Acceptance Test Plan

This is a future implementation test specification. PKG-02B-S adds no tests and runs no test/build command. Suggested focused suite: `packages/core/__tests__/workbook-column-width-journal.test.ts`, using existing internal Workbook mutation test hooks without exporting a public failure hook.

## Fixture and observations

Use a Workbook with two sheets, issued `WorkbookSheetView`s, the proposed mutation port and transaction context, and separate standalone Worksheet fixtures. Observe `getColumnWidth`, `extractSnapshot().columnWidths`, `extractSnapshot().hiddenCols`, row-height state, cell values/formulas/styles, emitted per-sheet and Workbook events, and `getMutationHealth()`. Run the owner mutation scenarios under both the default Journal strategy and the internal Snapshot reference strategy; restore Journal as the default after comparison.

The API/event owner must settle proposed constraints before implementation: one-based integer column within `1..colCount`; finite positive pixel width; whether any Core maximum exists; same-value event frequency. The current standalone setter is permissive and eventful, which remains a separate compatibility baseline.

## Acceptance matrix

| Case | Setup / action | Required result |
| --- | --- | --- |
| Port success | Call `mutationPort.setColumnWidth(view, col, px)` and await. | Getter and explicit snapshot entry reflect the px value; Workbook remains healthy; one `sheet-mutated` publishes after commit. |
| Transaction success | Stage `tx.setColumnWidth(view, col, px)` and resolve callback. | Value commits in FIFO order; context cannot be used after callback; event follows committed operation order. |
| Target authority | Pass foreign Workbook view, unissued object, unknown Worksheet ID, and removed/unavailable target as supported by existing lifecycle. | Reject before any dimension change or event. Never accept raw Worksheet. |
| Column validation | Try zero, negative, fractional, NaN, infinities, and values above current `colCount`. | Reject during preflight before any Worksheet mutation; no event; Workbook stays healthy. The exact error class/message should follow the approved contract. |
| Width validation | Try zero, negative, NaN, positive/negative infinity, and non-number runtime inputs. | Reject preflight; no state/event changes. Pin any approved Core maximum; absent an approved maximum, all finite positive widths are accepted. |
| Absent vs explicit default | Start with one absent column and one explicitly stored 80 px column; stage writes then force later-operation failure. | Both effective getters read 80 after rollback; object snapshots prove the absent key stayed absent and explicit 80 stayed present. |
| Repeated same-column writes | Write a column multiple times in one transaction, then fail after the final write. | Journal captures only original first-touch state; rollback returns exactly to it. On success, final value is the last staged value. Event frequency follows the approved rule; proposal is one event per staged call. |
| Multiple columns | Mutate several columns, including absent and explicit entries, then fail. | All targeted keys restore exactly; untouched keys remain identical. |
| All seven operation kinds | Interleave `setCellValue`, `setCellFormula`, `clearCellContent`, `clearCellFormula`, `setCellStyle`, `setRowHeight`, and `setColumnWidth` across two sheets. | Success and forced rollback preserve FIFO semantics, exact cell/graph/dimension state, all-or-nothing pre-commit behavior, and event ordering. Candidate joins the six current kinds; no wider atomicity claim. |
| Multi-Worksheet failure | Write cell, row height, and width on Sheet A, then width/cell on Sheet B; fail during B apply. | Restore all touched state on both sheets; suppress buffered events; queue remains usable if rollback succeeds. |
| Failure before width map write | Inject after earlier operations but immediately before width map update. | Earlier cells/row heights restore; width remains unchanged; no event; Workbook remains healthy. |
| Failure after width map write | Inject immediately after primary map update. | Width map restores exact presence/value; earlier mixed state restores; no event; queue continues. |
| Journal/Snapshot equivalence | Repeat success, absent/explicit default, repeated writes, pre/post-write failure, multi-column, and multi-sheet cases under both strategies. | Compare full explicit column-width lists, row-height lists, cell/graph state, hidden columns, event trace, and mutation health. Snapshot must restore independently; production default remains Journal. |
| Event buffering and order | Subscribe to sheet and Workbook bridges; stage width between cell and row-height writes. | No listener sees an intermediate event. After success, each operation's required events publish in exact staged global order. Observer exceptions are diagnostics after commit and cannot roll back state. |
| Same-value event | Assign current effective/stored value, including absent-default effective 80 and explicit 80. | Assert approved policy explicitly. Under current compatibility proposal, each staged setter call emits one post-commit event and rollback emits none. |
| Hidden column independence | Hide a column, change its width, then show it. | Width write does not alter hidden membership; visibility API continues to control hidden state independently. |
| Cancellation/disposal | Cancel/dispose while callback is pending before commit; separately dispose after commit. | Before commit: no width write/event and later context calls reject. After commit: state stays committed, consistent with queue semantics. |
| Rollback failure | Fail after write and inject width restoration failure. | Reject with `WorkbookMutationRollbackError` retaining operation and rollback causes; Workbook health is recovery-required; later mutation admission is rejected; no pending event is published. |
| Standalone compatibility | Call standalone `Worksheet.setColumnWidth` for new, same, zero, negative, and non-finite values in an isolated fixture. | Future Workbook implementation must not change legacy setter validation or its direct event behavior absent a separately authorized compatibility change. |
| Snapshot object behavior | `extractSnapshot`, mutate, then `applySnapshot` from the captured object. | In-memory object snapshot restores explicit width entries. This is not a test of binary persistence. |
| Binary/persistence boundary | Encode/decode a snapshot with explicit widths; inspect current supported format behavior. | Record that current `SnapshotCodec` omits width entries; do not assert persistence that the current format does not implement. Any persistence enhancement requires separate authorization. |

## Internal failure injection

Future implementation should add internal-only phases around column map mutation and restoration, modeled on row-height phases, plus the existing apply-index hook for later-operation failure. Tests must use the existing private test-hook route; no production public hook or test-only exported API is permitted. Run rollback-failure cases for both strategies if the internal failure mechanism supports them. Do not confuse an injected failure with a production failure occurrence.

## Verification for a future implementation package

Run the focused new suite, the existing Workbook queue/Journal/Snapshot suites, and Core typecheck. Run `git diff --check`, focused-test marker hygiene, and the then-current protected sidecar manifest check before and after. Do not rerun the full Core suite as an implicit requirement; scope additional checks to changed behavior. These are future gates and were not run for this planning checkpoint.
