# CS-002D4-R1 PKG-06B — Rollback fault matrix

**Scope:** Test-only executable model of the proposed bounded comment-delete before-image.
**Implementation status:** No Workbook mutation-port operation or production rollback path is exercised or added.
**Policy basis:** PKG-05A Option C, operation-local retained comments-array reference, deletion only.

## Fault-cut matrix

| Cut / condition | Test-model setup | Expected and asserted model result | Evidence classification |
| --- | --- | --- | --- |
| First effective write | Two effective deletes on one cell, followed by a repeated no-op | One before-image is retained for the cell and remains the original comments-array reference | Simulated; transferable capture invariant |
| Absent cell | Missing-address delete; separately, modeled unexpected allocation after an absent-state capture | Normal delete is a no-op and creates no before-image; rollback helper removes a transient cell to restore absence | First clause mirrors observed delete behavior; allocation rollback is model-only and not reachable through current delete |
| Present cell, undefined comments | Missing-ID delete; separately, synthetic comments-field allocation followed by failure | No-op creates no before-image/event. In fault model, rollback preserves the same cell identity, removes the transient comments field, and retains `comments === undefined` | No-op mirrors current method; synthetic write/restore is model-only |
| Multiple deletes on one cell | Delete a duplicate-ID root with transitive replies, then delete a survivor, then retry that survivor | All matching IDs and descendants are filtered; survivors retain order; first before-image is not overwritten; only effective deletes queue events | Standalone algorithm behavior modeled; transaction rollback remains simulated |
| Duplicate identifiers and cascade | Two comments share an ID; child and grandchild descend from that identifier chain | Both duplicate nodes and descendants are removed; unrelated survivors remain ordered | Mirrors inspected `Worksheet.deleteComment` filter/cascade algorithm |
| No-op suppression | Missing cell, undefined/empty comments, and missing ID | No capture, write, or publication event | No-op logic is consistent with current Worksheet method; transaction buffering simulated |
| Identity and alias preservation | Original array includes shared nested object and cycle; replace array, then fail | Restores the same array and comment nodes, preserving shared references and cycle; unrelated cell fields stay intact | Reference semantics are executable model evidence, not Workbook Journal/Snapshot evidence |
| Failure before replacement | Inject immediately after capture and before array assignment | Original array reference and cell state remain; no event is published | Simulated failure cut |
| Failure after replacement | Inject immediately after array assignment | Original array reference, nodes, aliases, cycle, and unrelated fields are restored; no event is published | Simulated failure cut |
| Failure during restoration | Throw at restore entry after an operation failure | Both errors are retained, events remain suppressed, and model enters recovery-required state | Simulated error classification; must be verified against real strategy policy |
| Commit/publication | Two successful effective deletes | Events remain buffered during transaction work and publish after successful work, one per effective delete | Ordering/frequency inside this local model only; no cross-surface guarantee |

## Transfer boundary for a future implementation package

The following are suitable as direct assertion targets once the deletion operation is separately authorized and wired into real strategies:

- Capture the first before-image only when a delete changes the comment collection; preserve it across later writes to the same cell.
- Preserve absent-cell versus present-cell state, and distinguish `comments: undefined` from an absent cell. Model coverage now includes absent-cell removal and present-cell identity/undefined-field restoration at a synthetic allocation cut.
- On rollback, restore the original array reference and exact comment-node/nested graph identities, without cloning the graph.
- Preserve unrelated cell value/style state, suppress all buffered comment events on rollback, and publish exactly one event for each effective committed delete.
- Verify the same observable state with independent Journal and Snapshot implementation paths; Snapshot must not delegate to Journal restoration.
- Verify restoration failure retains both error classes and uses the actual Workbook recovery-required policy.

These are transfer criteria, not results already established for Journal or Snapshot comment deletion. In particular, the absent-cell allocation case exercises a model helper because current `Worksheet.deleteComment` returns before allocating a missing cell. It does not show that the production operation can create such a cell.

## Non-claims

This matrix does not prove atomicity, event buffering, recovery health, or Journal/Snapshot parity in Workbook. It does not change the seven-operation boundary, authorize `Workbook.mutationPort.deleteComment`, assert general metadata cloning, or define owner-facing metadata support. PKG-05's external-alias mutation limitation still applies: reference restoration cannot rewind an in-place mutation made through a retained alias.

Overall CS-002D4-R1 acceptance remains **WITHHELD**.
