# CS-002D4-R1 PKG-02C — Performance and Resource Characterization

## Method

The benchmark test `workbook-seven-operation-benchmark.p1-pkg-02c.test.ts` applies one seeded, 70-operation mixed workload to two Worksheets inside one transaction. Every operation kind is included; row and column dimensions are repeatedly targeted. The cases use two sheets, a small fixture (20 × 12 per sheet, 16 prepopulated cells per sheet), and a larger fixture (1,000 × 30 per sheet, 2,000 prepopulated cells per sheet). Seed: `0x02c2026` (decimal 2,891,814). Each case has one warm-up followed by seven measured transactions. Node: v24.22.0.

The harness records wall-clock transaction time, Workbook health, and detached per-Worksheet Journal settlement diagnostics. Snapshot cases also report an inactive/empty Journal, as expected, because Snapshot is the selected reference strategy. It does not force garbage collection or claim heap-reclamation timing. Style reference ownership is independently verified by the existing PKG-01/02B tests that observe provisional-reference release on rollback and displaced-reference release on commit.

## Raw results

All seven samples per case are retained in [raw benchmark samples](CS-002D4-R1-PKG-02C-benchmark-raw.json); the Jest output containing the emitted raw JSON is retained in [benchmark output](CS-002D4-R1-PKG-02C-benchmark-output.txt).

| Fixture | Strategy | Median ms | Range ms | Journal / health settlement |
| --- | --- | ---: | ---: | --- |
| Small | Journal | 0.9217 | 0.8009–1.1316 | Both Worksheet journals inactive with zero cell before-images; Workbook healthy |
| Small | Snapshot | 0.9167 | 0.7961–1.1815 | No active Journal; Workbook healthy |
| Large | Journal | 0.8318 | 0.7696–0.9071 | Both Worksheet journals inactive with zero cell before-images; Workbook healthy |
| Large | Snapshot | 12.8556 | 12.1897–16.6231 | No active Journal; Workbook healthy |

The larger fixture shows a clear capture-cost difference for this sparse 70-operation transaction, but these short Jest samples are environment-sensitive and are not product latency guarantees or a universal crossover threshold.

## Resource result and limits

Each timed operation returns with Workbook health `healthy`. For Journal, both participating Worksheet diagnostics report `active: false`, zero retained cell before-images, and an inactive graph journal with empty structure/dirty keys. For Snapshot, no Journal is opened. Existing focused tests additionally verify style-reference settlement, clean rollback, recovery-required behavior on uncertain cleanup, and rejection of subsequent writes after recovery-required. No forced GC, heap-growth claim, or long-running resource guarantee is made.

The production default remains Journal and Snapshot remains an internal comparison path. No mutation family, public API, persistence format, or performance threshold changed.
