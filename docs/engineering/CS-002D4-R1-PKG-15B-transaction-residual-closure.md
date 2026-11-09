# CS-002D4-R1 PKG-15B — Transaction residual closure

**Scope:** Reduce one high-risk D2-11 uncertainty in the existing seven-operation Workbook transaction family. This report adds bounded evidence only; global D2-11 remains unresolved. No production code, transaction contract, event schema, mutation operation, ledger, or frozen register was changed.

## Selected residual and rationale

PKG-14B's residual register R02 identifies incomplete formula-graph subphase coverage. The existing graph fault matrix in `workbook-mutation-queue.p1-pkg-01.test.ts` injects failures at graph-registration phases under Journal and Snapshot, but each transaction uses one Worksheet. PKG-13B exercises mixed state across Alpha and Beta, including formula graph changes, but its injected failure is at `after-cell-record`, not immediately after dependency registration on the later Worksheet. The cross-product of a completed earlier Worksheet formula write and a later Worksheet graph registration followed by pre-commit failure was therefore not directly represented.

The focused PKG-15B case selects that boundary. It does not repeat the PKG-14B before/after-operation cuts, add a Cartesian formula grammar matrix, or claim exhaustion of formula graph shapes.

## State owner, write path, and invariant

The affected owners are the per-Worksheet cell store and `DependencyGraph`, coordinated by the Workbook transaction. `Workbook.transact()` stages writes; formula application writes the cell record, extracts dependencies, and registers them through the Worksheet graph path. The test uses the existing internal `after-dependency-registration` failure seam to throw on the second registration, immediately after Beta's graph registration and before transaction commit; Alpha's earlier formula write and both graph registrations have been applied.

The tested invariant is the existing transaction rollback contract: a pre-commit failure with successful restoration returns all participating Worksheets to their exact captured state, emits no buffered Worksheet or Workbook cell notifications, closes their cell-write journals, and leaves Workbook mutation health `healthy`. This does not assert formula-language semantics, observer order across surfaces, rollback after commit, or recovery from a failed restore.

## Executable evidence

Added `packages/core/__tests__/workbook-multisheet-formula-graph-rollback.p1-pkg-15b.test.ts`, with one Journal and one Snapshot case. Both cases:

- Seed independent dependency graphs on Alpha and Beta and capture each exact Worksheet snapshot plus detached graph state.
- Stage formula writes on Alpha followed by Beta, then inject at the second `after-dependency-registration` callback.
- Compare both Worksheets' complete snapshots and graph states with their pre-transaction states.
- Assert no Worksheet events or Workbook `cell-value-change` / `cell-formula-change` events escaped.
- Assert the journals are inactive and Workbook health is `healthy` after restoration.

**Execution result:** Both Journal and Snapshot cases passed in the serialized Lane D focused rerun. The 15-suite selection passed 201/201 tests. The initial attempt failed only because the test asserted exactly two total hook callbacks; Snapshot restoration also invokes the observation hook. The test now asserts that the one-shot fault at the intended second registration was reached. Initial and corrected raw outputs are preserved in the PKG-15D evidence files. The protected sidecar check passed 237/237 before and after the corrected run with identical outputs.

## Residual disposition

| PKG-14B residual | PKG-15B disposition | Remaining boundary |
| --- | --- | --- |
| R01 — Other mutation families | Unchanged / excluded | Structural edits, visibility, comments, drawings, conditional formatting, and other paths remain outside the seven operations. |
| R02 — Formula graph side effects | Narrowly reduced | Adds a cross-Worksheet graph-registration fault case under both strategies. Other graph shapes, cycles, ranges, volatile transitions, and operation/phase combinations remain unexhausted. |
| R03 — Private StyleCache counts | Unchanged | No public/private cache-count oracle added. |
| R04 — Cross-level event ordering / Application | Unchanged | No global callback order or Application forwarding is inferred. |
| R05 — Pivot invalidation reachability | Unchanged | Workbook-owned Pivot lifecycle remains unsupported and unauthorized. |
| R06 — External effects | Unchanged | Persistence, history, rendering completion, and host resources remain outside this in-memory transaction evidence. |
| R07 — PKG-14B direct cases | Retained | Its 30 cases remain distinct and unchanged. |

No D2-11 disposition is promoted. Overall CS-002D4-R1 acceptance remains **WITHHELD**.
