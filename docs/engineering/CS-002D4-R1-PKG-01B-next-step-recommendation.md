# CS-002D4-R1 PKG-01B — Next-Step Recommendation

**Date:** 2026-10-31
**Decision:** Recommend a separately bounded incremental-journal evaluation package before expanding Workbook-owned mutation coverage. This is a recommendation, not implementation authorization.

## Recommendation

Select **“Introduce an incremental journal as a separate bounded implementation package.”** Keep the current full-snapshot path as the correctness reference until an alternative passes rollback-equivalence tests and its resource accounting is measured.

The evidence is that a single cell write on a 100,000-cell sparse Worksheet took a median 298.45 ms, with 298.15 ms in snapshot capture; 100 writes took a median 300.49 ms, with 299.41 ms in capture. Across 1,000 to 100,000 cells, single-write snapshot capture rose from 2.86 ms to 298.15 ms. Injected rollback on the 100,000-cell fixture took a median 37.70 ms to restore and clean up after 50 writes, in addition to the 292.66 ms snapshot. The cost is therefore tied mainly to Worksheet state size rather than the number of edited cells. Exact trials and caveats are in the [performance report](CS-002D4-R1-PKG-01B-performance-report.md) and [raw JSON](CS-002D4-R1-PKG-01B-benchmark-raw.json).

This is not a claim that roughly 300 ms violates a product requirement: no supported spreadsheet-size envelope or latency target was provided. It is evidence that expanding the same full-state snapshot to more mutation families would extend a measured O(N + E) cost pattern. A scoped prototype should compare an operation journal or a hybrid of touched-cell snapshots and dependency deltas against this baseline.

## Correctness posture

The five authorized operations now have focused evidence for FIFO queueing, clean rollback, recovery-required on rollback failure, multi-Worksheet restoration, event isolation, style ownership, disposal, and later queue progress. The style audit reproduced and corrected a successful-commit reference leak. The focused tests and Core typecheck pass.

The remaining limits are material: mutation failure injection operates between Worksheet calls rather than within a partially executed storage/DAG update; self-await remains a documented deadlock hazard; formula evaluator recomputation was not part of the benchmark; peak memory and browser behavior are unmeasured; and the full Core suite was not run. These constraints do not justify a broad transaction rewrite inside PKG-01B.

## Suggested next bounded gate

If separately authorized, a PKG-01C evaluation should:

1. State the supported Worksheet-size and latency envelope before selecting a threshold.
2. Prototype only one journaling strategy for the existing five operations, leaving full snapshots available as the comparison path.
3. Run the same clean failure, multi-sheet, formula/dependency, volatile, dirty-state, nested-value, style-refcount, event, disposal, and recovery-required cases against both paths.
4. Measure journal creation, apply, rollback, and retained memory on the same seeded workloads and runtime as PKG-01B.
5. Reject cutover if any state/event result differs from the full-snapshot reference or if journal ownership can retain displaced values/styles after commit or rollback.

No incremental journal, hybrid strategy, PKG-02 mutation family, or acceptance threshold is authorized by this report.

## PKG-02 readiness

**PKG-02 is not recommended for authorization yet.** First resolve the transaction scalability strategy and supported workload envelope. A future decision may still retain full snapshots if product requirements permit their measured cost; the current evidence does not predetermine the final architecture.

Overall CS-002D4-R1 acceptance remains WITHHELD.
