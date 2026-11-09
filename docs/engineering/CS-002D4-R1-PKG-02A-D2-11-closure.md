# CS-002D4-R1 PKG-02A — D2-11 Row-Height Inventory Closure

**Operation-specific status:** closed for Workbook-owned `setRowHeight` within PKG-02A evidence and tests
**Global D2-11 status:** unresolved
**Overall CS-002D4-R1 acceptance:** WITHHELD

## Operation-specific effects covered

| D2-11 concern | PKG-02A result |
| --- | --- |
| Authority | New port/context methods resolve only this Workbook's issued sheet view or Worksheet ID and call the guarded Worksheet setter under its existing private capability. |
| Primary state | Explicit row entries in the Worksheet's sparse `#rowHeights` map only. No cell, formula graph, style, visibility, pivot, sheet-count, or external persistence state is changed. |
| Validation | All operations are preflighted before apply: row is a finite integer in `1..rowCount`; height is finite and positive. No maximum is imposed. |
| Exact before-image | First-touch sparse before-image records both map presence and value, preserving absent versus explicit 20 px. |
| Rollback | Journal restores sparse row entries; Snapshot independently restores a full explicit row-height map. Mixed cell/dimension transactions share the existing operation commit point. |
| Commit | All staged writes apply before the shared commit point. A pre-commit failure rolls back; post-commit observer failures do not uncommit. |
| Events | One generic `sheet-mutated` per staged row-height call, including same-value calls, buffered until commit and ordered by staging across Worksheets. Clean rollback publishes no events. Listener exceptions are isolated. |
| History | No Workbook undo/redo history. Existing standalone React command history is unchanged. |
| Cancellation | Queued operation cancelled before apply on Workbook disposal; no row-height state or event is produced. No async cancellation claim is made inside synchronous apply. |
| Recovery | Injected row restoration and pre-discard cleanup failures yield `recovery-required`; the primary operation and rollback errors are retained and later writes reject. |
| Compatibility/derived state | Standalone setter retains its permissive direct-event behavior. Generic event remains consumable by renderer observers; actual canvas painting is outside this Core guarantee. |
| Persistence | No binary SnapshotCodec or XLSX persistence change; the operation is in-memory only. |

The acceptance suite passed **116/116 tests across five suites**, including the original five cell-write regressions and Journal/Snapshot comparisons. Core typecheck, diff hygiene, and all 237 protected sidecar checks passed; details are in [PKG-02A verification](CS-002D4-R1-PKG-02A-verification.md).

## Boundary of closure

This closes the row-height-specific side-effect map exercised by PKG-02A. It does not resolve D2-11 globally. Column width, insertion/deletion, visibility, comments, drawings, conditional formatting, Pivot state, external host persistence, and Workbook undo history remain separate mutation families and are not covered. The known shared self-await limitation also remains unchanged.

The existing Incremental Journal remains the production default for the five cell-write operations and now covers this separately authorized row-height operation in the same transaction mechanism. Snapshot remains internally selectable for comparison. No global D2-11 claim, R1 acceptance promotion, or authorization for a subsequent operation is implied.
