# CS-002D4-R1 PKG-01C — Snapshot and Journal Performance Comparison

**Date:** 2026-10-31
**Starting revision:** `88b09634f17f3b39d88a88c5428f76b426459a2b`
**Disposition:** Experimental journal; snapshot path remains the default.

## Environment and method

- Linux x64; AMD Ryzen 9 7845HX with Radeon Graphics; Node `v24.22.0`.
- The same source-built harness and deterministic seeding logic exercised both strategies. Each trial used a fresh Workbook and the same stored-cell count; snapshots and journals were measured in the same Node process.
- Five trials per workload. Tables report median total and phase times. The raw file contains all observations and per-workload minimum/maximum. Five trials do not support a stable tail percentile.
- Sparse cases: 1,000, 10,000, 50,000, or 100,000 stored cells; 1, 10, or 100 distinct value writes; one Worksheet.
- Rollback cases stage 100 distinct writes and inject a failure before write 51, after 50 operations have applied.
- Formula case: 10,000 stored cells, 5,000 formula nodes, 5,000 dependency edges; edit 100 precedent cells to dirty 100 dependent formulas.
- Repeated-cell case overwrites one address 100 times on a 10,000-cell sheet. Multi-sheet case distributes 100 writes across two 10,000-cell sheets.
- Capture is full Worksheet state snapshot or journal creation. Apply is the sum of per-operation timings. Commit cleanup includes closing the batch and style-reference cleanup, excluding observer publication. Rollback excludes initial capture and includes restoration and journal cleanup.
- Heap delta is `heapUsed` after minus before the transaction. No explicit GC is called (the command enables `--expose-gc`, but the harness does not invoke it). These are not peak or retained-memory measurements.

Raw data: [PKG-01C benchmark JSON](CS-002D4-R1-PKG-01C-benchmark-raw.json), SHA-256 `0f2ea3df02f8a958a6a145968f119bc1c15e614ff6611a42fdf35a76d9db9ea3`.

## Sparse successful transactions

All times are milliseconds. Snapshot and journal columns are medians of five trials; journal speedup is descriptive and compares total transaction medians.

| Stored cells | Writes | Snapshot total | Snapshot capture | Journal total | Journal creation | Journal apply | Speedup |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1,000 | 1 | 3.382 | 3.298 | 0.105 | 0.0073 | 0.030 | 32.1× |
| 1,000 | 10 | 2.964 | 2.849 | 0.174 | 0.0087 | 0.071 | 17.1× |
| 1,000 | 100 | 4.051 | 2.800 | 1.003 | 0.0026 | 0.434 | 4.0× |
| 10,000 | 1 | 29.896 | 29.743 | 0.136 | 0.0066 | 0.074 | 220.1× |
| 10,000 | 10 | 28.513 | 28.311 | 0.206 | 0.0044 | 0.111 | 138.5× |
| 10,000 | 100 | 28.830 | 27.787 | 0.972 | 0.0045 | 0.428 | 29.7× |
| 50,000 | 1 | 146.951 | 146.759 | 0.205 | 0.0046 | 0.144 | 717.2× |
| 50,000 | 10 | 143.618 | 143.353 | 0.302 | 0.0045 | 0.228 | 475.0× |
| 50,000 | 100 | 143.842 | 142.718 | 0.998 | 0.0048 | 0.477 | 144.2× |
| 100,000 | 1 | 288.209 | 287.974 | 0.212 | 0.0043 | 0.150 | 1,358.9× |
| 100,000 | 10 | 294.688 | 294.382 | 0.249 | 0.0041 | 0.162 | 1,183.9× |
| 100,000 | 100 | 289.241 | 287.834 | 1.237 | 0.0043 | 0.545 | 233.9× |

The snapshot total is dominated by whole-sheet capture and rises with stored cells. Journal setup remains nearly flat for these low-dependency writes; apply time grows with operation count. Journal total still rises from about 0.10 ms for one write to about 1.04 ms for 100 writes on the 100,000-cell fixture. This demonstrates the intended cost shift for these workloads, not universal O(1) behavior: graph journaling cost depends on actual affected adjacency and dirty closure.

## Rollback

Median milliseconds for a 100-write transaction failing after 50 applies:

| Stored cells | Strategy | Total failed transaction | Capture / journal creation | Apply before failure | Restore / rollback |
| ---: | --- | ---: | ---: | ---: | ---: |
| 1,000 | Snapshot | 3.373 | 2.751 | 0.204 | 0.352 |
| 1,000 | Journal | 0.304 | 0.002 | 0.207 | 0.020 |
| 10,000 | Snapshot | 32.255 | 27.912 | 0.219 | 3.420 |
| 10,000 | Journal | 0.342 | 0.005 | 0.217 | 0.020 |
| 50,000 | Snapshot | 157.857 | 140.607 | 0.271 | 16.630 |
| 50,000 | Journal | 0.402 | 0.005 | 0.267 | 0.021 |
| 100,000 | Snapshot | 316.651 | 281.854 | 0.334 | 33.981 |
| 100,000 | Journal | 0.475 | 0.005 | 0.320 | 0.026 |

## Formula, repeated-cell, and multiple-Worksheet cases

| Workload | Snapshot median | Journal median | Snapshot capture | Journal creation | Journal apply |
| --- | ---: | ---: | ---: | ---: | ---: |
| 10k cells, 5k formulas / 5k edges, 100 precedent edits | 30.127 ms | 1.109 ms | 29.304 ms | 0.0056 ms | 0.675 ms |
| 10k cells, 100 overwrites of one cell | 28.184 ms | 0.618 ms | 27.548 ms | 0.0051 ms | 0.386 ms |
| Two sheets × 10k cells, 100 writes across both | 56.944 ms | 1.048 ms | 55.924 ms | 0.0068 ms | 0.454 ms |

The repeated-cell result exercises first-write-wins capture: the journal stores one cell before-image while all 100 operations still apply. Standalone writes for the same repeated-cell workload had medians of 0.370 ms and 0.365 ms in the snapshot and journal measurement groups; direct standalone writes are not an equivalent atomicity contract.

## Memory and commit cleanup

Heap deltas varied substantially across repeated samples, including negative values after collection. Across sparse groups, per-trial medians ranged from about 1.3 MB to 67.7 MB for snapshots and 0.02 MB to 1.23 MB for journaling. These observations include surrounding JS allocation and collection; they do not establish retained memory. Commit-cleanup medians were about 0.002–0.007 ms across sparse groups for both paths. Raw min/max values are preserved in the JSON.

## Reproduction

```sh
npm exec -- esbuild packages/core/benchmarks/p1-pkg-01c-journal-comparison.ts --bundle --platform=node --format=esm --outfile=packages/core/benchmarks/.p1-pkg-01c-benchmark.tmp.mjs
node --expose-gc packages/core/benchmarks/.p1-pkg-01c-benchmark.tmp.mjs > docs/engineering/CS-002D4-R1-PKG-01C-benchmark-raw.json
rm packages/core/benchmarks/.p1-pkg-01c-benchmark.tmp.mjs
```

## Limitations

This benchmark is Node-only, has no browser or user-perceived latency data, and uses five trials. No stable p95 claim is made. It does not cover pathological high-degree formulas, very large range-watcher registries, arbitrary mutation inside a dependency closure, concurrent Workbooks on separate processes, or retained heap after forced collection. The benchmark selects the experimental journal through a non-barrel internal test hook; production continues to use snapshots by default. The measurements do not create a product latency or size target.
