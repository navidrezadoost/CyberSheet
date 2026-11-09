# CS-002D4-R1 PKG-02S — Acceptance Test Plan

This is an implementation-ready test specification for a future, separately authorized Workbook-owned row-height operation. No tests were added or run for PKG-02S. Suggested location: `packages/core/__tests__/workbook-row-height-journal.test.ts`, using the existing Workbook mutation test-hook infrastructure without exporting hooks publicly.

## Contract fixture

Use `Workbook.create({ sheets: [{ name: 'Alpha', rows: 4, cols: 3 }, { name: 'Beta', rows: 3, cols: 2 }] })`, issued `WorkbookSheetView`s, `workbook.mutationPort.setRowHeight`, and `workbook.transact(tx => tx.setRowHeight(...))`. Observe `getRowHeight`, explicit `extractSnapshot().rowHeights`, sheet event listeners, Workbook event bridge where applicable, and `getMutationHealth()`. Never mutate an adopted Worksheet directly. Keep ordinary standalone Worksheet tests separate.

The candidate API is `setRowHeight(sheet, row, heightPx)`. Acceptance requires the owner to settle the maximum-height policy before implementation. Proposed common validation is a one-based integral row within the current sheet and a finite, positive pixel height. A test must pin the actual approved bound and exact rejected-value classes.

## Deterministic cases

| Case | Steps | Required observation |
| --- | --- | --- |
| Successful port mutation | Await one port call. | Effective height changes; Workbook remains healthy; committed `sheet-mutated` observed only after final state is visible. |
| Successful transaction-context mutation | Stage one or several calls and resolve callback. | Each staged row height is applied in transaction order; one operation commit point; events reflect staged order per approved event policy. |
| Invalid row / height | Try row 0, fractional row, `rowCount + 1`, `NaN`, infinities, zero, negative, and any approved maximum violation. | Reject before any row map/snapshot state changes; no committed event; Workbook remains healthy. |
| Exact absent-entry restoration | Start with no explicit height, set to 20 then inject post-write failure. | Rollback removes the map entry; snapshot explicit-row list returns to prior content, even though effective getter reads 20 before and after. |
| Exact explicit-default restoration | Start with explicit height 20, set to another height then fail. | Rollback retains the explicit `row:20` map entry. |
| Repeated writes same row | Stage values 28, 35, then 42 for one row; run both commit and injected rollback. | Commit leaves 42; rollback restores the first before-image, not 28 or 35; event order/frequency matches approved contract. |
| Multiple rows one sheet | Stage two row changes, fail after second primary write. | Both rows restore exactly, including map-entry presence; no event escapes. |
| Mixed cell + row-height operation | In one transaction write a cell and row height, then inject failure after each order permutation. | Both cell/graph and row map restore; no committed event; no leaked style-cache ownership; health remains healthy after successful rollback. |
| Multi-Worksheet commit | Change row heights on Alpha and Beta. | Both maps commit; deterministic cross-sheet event order equals staging order; both render-observer event channels see committed state. |
| Multi-Worksheet rollback | Change both sheets, fail after a Beta write. | Reverse-sheet restoration yields exact original map snapshots on both; no event; healthy if all restoration succeeds. |
| Failure before first apply | Inject before primary-state modification. | No row map changes; no event; ordinary operation error; queue advances. |
| Failure after map write | Inject immediately after row map update. | Exact Journal restoration; no event; healthy queue continuation. |
| Rollback failure | Inject a row restore failure after a primary write failed. | `recovery-required`; error retains operation and rollback failures; subsequent queued write rejected before apply. |
| Event publication | Observe Sheet and Workbook bridge, include multiple row writes, listener throw, and later listener. | No event before commit; committed event order is deterministic; observer failure cannot undo state or block remaining listeners, as required by D5-03/04. |
| Cancellation/disposal | Queue behind a pending async transaction, dispose before row operation admission. | Pending row operation rejects and does not mutate; context captured from a completed callback cannot stage later. Do not assert rollback of already committed work. |
| Standalone compatibility | Standalone Worksheet set same/different heights and subscribe. | Existing getter fallback, permissive setter, event emission, and UI command undo remain unchanged by additive owner implementation. |
| Journal/Snapshot equivalence | Repeat success, each rollback failure point, absent/explicit 20, repeated writes, and multi-sheet cases under both strategies. | Compare explicit maps, effective getters, cells/graph, event trace, mutation health, and rollback diagnostics. Journal must remain production default. |

## Test seam requirement

Use only a non-public test hook. The existing hook module already supports queue/apply/rollback phase injections for cell-write behavior; implementation should extend that seam with row-write and row-restore phases if current callbacks cannot distinguish them. Never add a user-facing fault hook or mutate production internals through reflection in tests.

The tests must capture the event trace and primary row-map state at the commit and rollback boundaries. CanvasRenderer behavior is out of this Core package; a separate renderer regression may only be added under a later explicit scope. Core tests may assert the committed `sheet-mutated` signal but cannot claim an actual scheduled or completed canvas paint.

## Execution gate

Run the new focused Core suite, existing Workbook mutation-queue / Journal / Snapshot suites, and Core typecheck in the implementation package. Verify generated sidecar hashes before and after using the package's then-current protected manifest. Do not rerun the full Core suite as an implicit prerequisite; scope any required broader verification to actual changed behavior. No such verification was run in PKG-02S.
