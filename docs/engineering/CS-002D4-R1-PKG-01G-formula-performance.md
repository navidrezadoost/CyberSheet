# CS-002D4-R1 PKG-01G — Standalone Formula Performance

## Method

The harness [p1-pkg-01g-formula-performance.ts](../../packages/core/benchmarks/p1-pkg-01g-formula-performance.ts) compares the current local graph journal with a controlled, source-equivalent no-op-journal condition. Both variants run the same current `Worksheet.setCellFormula()` code, same formulas, same setup, same Node process and fixture sizes. For the control only, `DependencyGraph.beginMutationJournal()` returns a no-op handle; this isolates the graph journal's before-write capture/settlement overhead while retaining the surrounding standalone formula method and cell before-image code.

This is **not** a build of a separate historical PKG-01D source revision and does not measure the entire difference between pre-PKG-01E and current source. It is a controlled journal-overhead comparison. Failed registration cannot be compared with the no-op control because that control intentionally does not provide correct rollback; clean failure and restoration are therefore reported as current-path absolute samples.

Conditions: Node `v26.10.0`, Linux x64, 120 operations per sample, one warm-up and seven measured samples per successful workload, alternating current/control order. Timed section contains only formula writes; fixture setup is excluded. No formula recalculation is run by an engine. The callback workload includes a no-op Formula Engine callback. Failure samples use the supported registration-failure test seam before graph writes and verify the previously absent target cell is restored. This is a short local microbenchmark, not a product latency target.

## Results

Milliseconds per 120 writes, median of seven measured samples:

| Workload | Current local journal | No-op-journal control | Interpretation |
| --- | ---: | ---: | --- |
| Formula creation, direct dependency | 1.503 | 0.958 | Small-sample difference; current journal adds measurable setup/capture cost in this fixture |
| Formula replacement, alternating dependency | 1.171 | 1.184 | Within observed timing noise |
| Repeated replacement, same formula | 1.116 | 1.191 | No observed journal penalty in this sample |
| Range dependency registration | 1.680 | 1.418 | Small-sample difference; range writes are somewhat slower with journal enabled |
| No-op callback notification | 0.823 | 0.709 | Small-sample difference; callback is included in both modes |

Current-path registration failure followed by clean cell restoration: 120 individual failures, median **0.0178 ms per operation**. This measures the failure/restoration branch only; it has no invalid no-op rollback comparator.

The raw samples, including all seven durations for each paired workload and all 120 failure durations, are in [raw JSON](CS-002D4-R1-PKG-01G-formula-performance-raw.json), SHA-256 `b2661213310b1572d592a271c146e5e5849767208a23ef52491615e6971ccc7c`.

## Reproduction

```sh
npx tsc --ignoreConfig --outDir /tmp/pkg01g-build --rootDir . \
  --target ES2022 --module commonjs --moduleResolution node \
  --ignoreDeprecations 6.0 --esModuleInterop --skipLibCheck --types node \
  packages/core/benchmarks/p1-pkg-01g-formula-performance.ts
node /tmp/pkg01g-build/packages/core/benchmarks/p1-pkg-01g-formula-performance.js \
  > docs/engineering/CS-002D4-R1-PKG-01G-formula-performance-raw.json
```

The benchmark harness typecheck and execution succeeded. For deployment comparisons, rerun on the project's supported Node runtime and a stable benchmark host. The 01G output describes this observed environment and is not compared to PKG-01D's Node 24 Workbook transaction measurements.

## Conclusion

The samples show that the local graph journal has a small, workload-sensitive cost in formula creation and range registration, while replacement measurements are close to the no-op control. The sample durations are short and noisy, and no user-facing latency threshold is defined. This evidence identifies no large local regression but is not sufficient to claim a general performance envelope or journal cutover readiness.
