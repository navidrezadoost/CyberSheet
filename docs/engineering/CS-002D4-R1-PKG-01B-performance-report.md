# CS-002D4-R1 PKG-01B — Transaction Performance Characterization

**Date:** 2026-10-31
**Starting revision:** `88b09634f17f3b39d88a88c5428f76b426459a2b`
**Decision scope:** PKG-01 transaction performance characterization; no PKG-02 work started.

## Environment and method

- Linux x64, AMD Ryzen 9 7845HX with Radeon Graphics.
- Node `v24.22.0`, npm `11.19.1`, TypeScript from the repository dependency tree.
- The repository's declared Node and npm versions were used.
- Workload transactions ran in one Node process. Each batch-size sample started from a fresh Worksheet containing exactly the listed number of stored cells.
- Sparse fixtures placed one value at every other row. The transaction changed 1, 10, or 100 different cells in one authorized Workbook transaction. The comparison performed the same number of direct standalone Worksheet writes, each with its normal Worksheet transaction wrapper.
- Each workload was repeated three times. Reported ranges are the minimum and maximum of those three runs; they are not statistically stable tail percentiles.
- Snapshot timing measures `captureWorkbookCellWriteState()` across participating sheets. Apply timing sums the measured Worksheet mutation calls. Total transaction timing includes queue/callback/staging, snapshot, apply, commit handling, and test-hook instrumentation.
- Rollback cases staged 100 writes and injected failure before operation index 50, after 50 operations had applied. Rollback timing includes restore, batch discard, and provisional style release.
- The formula-heavy case contained 10,000 stored cells, 5,000 formula nodes, and 5,000 dependency edges. It measured one 100-cell transaction in three trials.
- Heap delta is `heapUsed` after minus before the transaction. No forced garbage collection was run between those readings; negative and highly variable deltas are retained as observed. No per-workload peak RSS claim is made.

Exact raw samples and runtime metadata are in [the raw benchmark JSON](CS-002D4-R1-PKG-01B-benchmark-raw.json), SHA-256 `a5289ea71ae049fbac88a6bea5d6865ffc80c646d58c1f564197561f8ede4463`.

## Reproduction

From the repository root, with the declared Node toolchain on `PATH`:

```sh
npm exec -- esbuild packages/core/benchmarks/p1-pkg-01b-transaction-benchmark.ts --bundle --platform=node --format=esm --outfile=packages/core/benchmarks/.p1-pkg-01b-benchmark.tmp.mjs
node --expose-gc packages/core/benchmarks/.p1-pkg-01b-benchmark.tmp.mjs > docs/engineering/CS-002D4-R1-PKG-01B-benchmark-raw.json
rm packages/core/benchmarks/.p1-pkg-01b-benchmark.tmp.mjs
```

`--expose-gc` was present for environment consistency but the harness does not call `global.gc()`. The temporary bundle is generated from the checked-in TypeScript harness and removed after the run.

## Results

Times are milliseconds. `Transaction` and `Snapshot` are medians of three runs. `Apply` is the median sum of per-operation timings. `Standalone` is the median time for the same number of direct Worksheet writes. Transaction ranges show minimum–maximum across three trials.

| Initial stored cells | Writes | Transaction median (range) | Snapshot median | Apply median | Standalone median |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1,000 | 1 | 2.98 (2.79–4.54) | 2.86 | 0.045 | 0.033 |
| 1,000 | 10 | 3.39 (3.07–3.77) | 3.26 | 0.058 | 0.068 |
| 1,000 | 100 | 3.55 (3.55–3.79) | 2.83 | 0.417 | 0.392 |
| 10,000 | 1 | 28.87 (28.74–32.98) | 28.64 | 0.119 | 0.108 |
| 10,000 | 10 | 29.38 (29.12–31.30) | 29.09 | 0.175 | 0.154 |
| 10,000 | 100 | 29.25 (29.18–31.07) | 28.34 | 0.528 | 0.531 |
| 50,000 | 1 | 152.13 (146.08–155.33) | 151.48 | 0.385 | 0.136 |
| 50,000 | 10 | 149.47 (148.67–152.85) | 149.12 | 0.242 | 0.182 |
| 50,000 | 100 | 148.13 (147.88–153.65) | 147.35 | 0.507 | 0.587 |
| 100,000 | 1 | 298.45 (297.27–302.55) | 298.15 | 0.200 | 0.136 |
| 100,000 | 10 | 300.21 (295.97–316.02) | 299.82 | 0.291 | 0.282 |
| 100,000 | 100 | 300.49 (297.28–304.77) | 299.41 | 0.694 | 0.682 |

The transaction cost is dominated by the full-state capture at every tested size. At 100,000 initial cells, capture took about 298–299 ms at the median regardless of whether the transaction changed 1, 10, or 100 cells. Increasing stored cells 100-fold, from 1,000 to 100,000, increased the median single-write capture from 2.86 ms to 298.15 ms. This is consistent with a cost that grows with stored state. The standalone comparison does not include Workbook queueing or snapshots.

### Injected rollback

Each row is the median of three 100-write attempts, failing before write 51 after 50 writes had applied.

| Initial stored cells | Total failed transaction | Snapshot | Apply before failure | Restore and cleanup |
| ---: | ---: | ---: | ---: | ---: |
| 1,000 | 3.77 ms | 2.74 ms | 0.20 ms | 0.70 ms |
| 10,000 | 33.57 ms | 28.14 ms | 0.23 ms | 3.16 ms |
| 50,000 | 167.26 ms | 149.14 ms | 0.34 ms | 17.57 ms |
| 100,000 | 331.18 ms | 292.66 ms | 0.68 ms | 37.70 ms |

### Formula-heavy and memory observations

For 10,000 stored cells with 5,000 formula nodes and 5,000 edges, the 100-write transaction median was 29.96 ms: 29.19 ms snapshot and 0.45 ms apply. This is one formula density and does not characterize recalculation: the fixture provides cached values and does not install a formula evaluator.

Heap deltas were noisy without forced GC. Across repeated sparse transaction samples, median observed deltas were about 1.29 MB at 1,000 cells, 11.99 MB at 10,000, 13.27 MB at 50,000, and 26.84 MB at 100,000; the observed ranges were -0.95–2.00 MB, 11.54–12.27 MB, -72.58–15.56 MB, and -271.88–28.64 MB respectively. These values cannot establish peak memory use. The reproducible evidence is the timing and the raw per-trial values, not a heap threshold.

## Limitations

The benchmark is Node-only, uses one Workbook and one participating Worksheet, and has no browser painting or user-perceived latency measurements. The three repetitions support a descriptive median and observed range, not a reliable p95 estimate. Workload values are deterministic and sparse; formula coverage is limited to one 10k fixture. There is no product latency target or supported maximum spreadsheet size in this evidence, so the results do not alone establish a release-acceptability threshold.
