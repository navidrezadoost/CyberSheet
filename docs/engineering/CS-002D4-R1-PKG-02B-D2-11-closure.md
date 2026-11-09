# CS-002D4-R1 PKG-02B — D2-11 Column-Width Closure

**Operation-specific status:** Workbook-owned single-column width operation implemented and focused acceptance passed.
**Global D2-11 status:** UNRESOLVED.
**Overall CS-002D4-R1 acceptance:** WITHHELD.

| D2-11 area | PKG-02B result |
| --- | --- |
| Ownership and entrypoint | Added `setColumnWidth` to the existing Workbook mutation port and transaction context; resolves issued views/IDs and uses the private Worksheet capability. |
| Validation | Preflight requires one-based integer column in `1..colCount`, runtime numeric finite positive width in pixels, and introduces no maximum. |
| Exact state | Sparse Journal preserves absence versus explicit 80 px and captures only first touch; Snapshot independently preserves the full explicit width map. |
| Mixed transaction | The seventh operation joins five cell writes and `setRowHeight`; focused tests exercise all seven kinds and multiple Worksheets under Journal and Snapshot. |
| Events | One `sheet-mutated` event per staged write, including same-value writes; events buffer until commit and publish in staged global order. Clean rollback emits none. |
| Visibility | Width mutation leaves hidden-column membership unchanged; visibility remains a separate store and operation. |
| Failure/recovery | Before/after map-write and restore failures are injectable only through internal hooks. Clean rollback restores state; failed restoration retains both errors and transitions Workbook to recovery-required. |
| Standalone/history | Standalone setter behavior and existing React history path are unchanged. No Workbook undo/redo history was added. |
| Persistence | In-memory object snapshots retain explicit widths. Binary SnapshotCodec continues to omit column widths; no persistence changes or promises were added. |
| Verification | Focused selection passed 7 suites / 189 tests; Core typecheck passed; 237/237 protected sidecar hashes and `git diff --check` passed. One legacy Pivot snapshot integration suite remains compile-blocked and is outside this operation. |

This closes only the tested `setColumnWidth` transaction slice. It does not establish transactional guarantees for bulk resizing, AutoFit, structural edits, visibility, persistence, renderer lifecycle, Pivot state, or other D2-11 mutation families. No R1 acceptance promotion is implied.
