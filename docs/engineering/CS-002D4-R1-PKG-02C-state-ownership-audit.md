# CS-002D4-R1 PKG-02C — State Ownership Audit

**Scope:** Existing seven Workbook-owned transaction operations only. Journal remains the production default; Snapshot was selected only through the internal test override. No production behavior or mutation contract changed by PKG-02C. One private, unexported test hook was added at the Workbook batch-settlement boundary because no supported failure seam existed there.

## Baseline and evidence reviewed

- Starting revision: `88b09634f17f3b39d88a88c5428f76b426459a2b`.
- Starting worktree: 347 paths reported by `git status --short`; it was already broadly dirty. Existing modifications were preserved.
- Protected Core sidecar manifest: `CS-002D4-R1-PKG-01K-core-sidecar-sha256.txt`, SHA-256 `a6b89cdc3ccd8bfc8c054e5fafcb4dc84ed9ba1347eb2597a3e7bef938969b6c`; 237 entries.
- Reviewed PKG-01I production/verification evidence and PKG-02A/02B implementation, verification, and operation-specific D2-11 closure reports.

## Ownership findings

| State | Journal path | Snapshot reference path | Evidence / boundary |
| --- | --- | --- | --- |
| Cell records and formula records | Captures sparse cell before-images before the batch. | Captures detached full Workbook cell-write state, including worksheet cell records. | Mixed seven-operation exact-state comparison and fault tests. |
| Dependency graph | Uses the graph mutation journal for changed formula nodes and dirty propagation. | Captures formula-node membership, predecessor edges, range dependencies, volatile membership, and exact dirty membership. | PKG-01 fault-cut tests exercise cell, predecessor, range watcher, formula-node, dirty, and volatile phases. |
| Row heights and column widths | Retains sparse map presence/value before-images; absent entries remain distinct from explicit default values. | Copies the explicit row-height and column-width maps as part of the worksheet state. | PKG-02A/02B sparse-state regressions and PKG-02C fixture. |
| Hidden columns | Not mutated by this operation set; retained independently in Worksheet state. | Not included in the cell-write Snapshot capture. | Mixed fixture verifies hidden-column membership remains unchanged; the seven operations have no hidden-column write path. |
| StyleCache references | Workbook interns styles before Worksheet writes; displaced references are released after commit; provisional references are released on clean rollback. | Uses the same Workbook-level interning and settlement path; Snapshot does not own a separate cache. | PKG-01 and PKG-02B tests spy on release behavior for displaced and provisional references. |
| Buffered events | Worksheet batches route events into the Workbook commit list; successful settlement publishes after commit. | Same event-batch path. | Interleaved staged-order and mixed failure tests. |
| Workbook health | Remains healthy after complete restoration; records a rollback error and blocks later mutations when restoration is uncertain. | Same behavior; uncertainty is not retried through the alternate strategy. | Recovery-required regressions and PKG-02C mixed rollback. |
| Transaction context and FIFO lifecycle | Revocable transaction context and serialized queue own application and cancellation. | Same queue and transaction context; strategy changes only the before-image mechanism. | Existing PKG-01 queue/cancellation/disposal tests reran unchanged. |

The per-Worksheet Journal is intentionally sparse for changed cells, dimensions, and graph mutations. Snapshot here means a full copy of the existing cell-write slice (cells, row heights, column widths, and formula graph), not a complete Worksheet snapshot: hidden columns, styles outside cells, filters, and unrelated Worksheet state are outside these seven mutation operations. Snapshot is a reference implementation, not a production fallback. The two paths are independently selected in tests and begin with equivalent fixtures. On a failed mutation, the Workbook attempts restoration of the selected state mechanism. If restoration or settlement fails, it records both the operation and rollback errors, enters `recovery-required`, and rejects subsequent mutations; there is no Snapshot replay after an uncertain Journal rollback.

## Redundancy and limits

The Journal stores the first before-image for a changed cell or dimension key, while the staged event list retains every successful staged event. Repeated writes therefore share one sparse before-image but preserve one event per write. Snapshot captures each participating Worksheet once per transaction, regardless of the number of writes. Both strategies use common preflight, style preparation, event buffering, and queue control.

The internal test hooks can fail before/after supported cell, graph, style, row-height, and column-width boundaries, before rollback, and immediately before settling each Worksheet's event batch. The settlement hook is unexported and inert unless explicitly installed by tests. The hooks do not expose arbitrary interruption inside every individual Map/WeakMap primitive. The current evidence verifies settlement through public observation and existing internal diagnostics; it does not claim a general transaction implementation for unrelated mutation families. Binary `SnapshotCodec` still omits row-height and column-width maps and was not changed.

## Disposition

No reproducible seven-operation defect was found in this package's mixed differential, failure, or event integration checks; no production correction was needed. The only source edit adds the private test-only failure seam described above. This closes only integration evidence for the existing seven operations. Global D2-11 remains unresolved, no eighth operation is authorized, and overall CS-002D4-R1 acceptance remains **WITHHELD**.
