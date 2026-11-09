# CS-002D4-R1 PKG-01H — Performance Verification

## Method and environment

The established [PKG-01C Snapshot/Journal harness](../../packages/core/benchmarks/p1-pkg-01c-journal-comparison.ts) was rerun against the same current source and fixture logic, selecting strategies through the internal test hook. It covered sparse stored-cell sheets of 1,000, 10,000, 50,000, and 100,000 cells; transactions of 1, 10, and 100 writes; a formula-heavy sheet; same-cell overwrite; two-Worksheet transactions; 500-node dependency graphs (high fan-out, long chain, and overlapping ranges); and 100-write rollback samples.

Environment: Node `v24.22.0`, Linux x64, AMD Ryzen 9 7845HX, reported heap limit 4,496,293,888 bytes. Harness metadata reports five trials per workload. No forced garbage collection was used. Heap delta is observational and is not peak or retained memory. Fixture construction is outside the timed transaction path according to the harness. No universal latency target was defined.

The run produced **244 samples across 56 workload groups with zero harness errors**. Raw samples: [PKG-01H benchmark JSON](CS-002D4-R1-PKG-01H-benchmark-raw.json), SHA-256 `0fb4aca4d0b3bdbb1d105622054ef26635b3febc622ffe835e9bab5fcea4bbeb`.

## Sparse transaction medians

Milliseconds per transaction, Snapshot / Journal:

| Stored cells | 1 write | 10 writes | 100 writes |
| ---: | ---: | ---: | ---: |
| 1,000 | 3.433 / 0.082 | 3.446 / 0.187 | 3.931 / 0.939 |
| 10,000 | 28.862 / 0.141 | 32.859 / 0.188 | 31.204 / 1.098 |
| 50,000 | 142.889 / 0.124 | 141.453 / 0.364 | 144.475 / 1.066 |
| 100,000 | 290.791 / 0.237 | 292.414 / 0.398 | 293.032 / 1.215 |

## Additional samples

| Workload | Snapshot | Journal | Interpretation |
| --- | ---: | ---: | --- |
| 100-write rollback, median across 20 samples per strategy | 100.477 ms | 0.445 ms | Snapshot ranged 3.467–353.296 ms; observed timing varied substantially. |
| Formula-heavy, 10k cells / 100 writes, median of 5 | 31.748 ms | 1.083 ms | Fixture and local workload only; no product target. |
| Same-cell overwrite, 10k / 100 writes | 29.529 ms | 0.635 ms | Sparse journal capture scales with touched state in this case. |
| Two worksheets, 10k stored cells each / 100 operations | 60.539 ms | 1.088 ms | Multi-Worksheet workload sample. |

Adversarial 500-formula-node graph median milliseconds for 1 / 10 / 100 writes:

| Graph | Snapshot | Journal |
| --- | --- | --- |
| High fan-out | 1.463 / 1.548 / 2.085 | 0.029 / 0.092 / 0.681 |
| Long chain | 1.465 / 1.527 / 2.116 | 0.031 / 0.087 / 0.648 |
| Overlapping ranges | 1.668 / 1.793 / 2.160 | 0.040 / 0.101 / 0.657 |

The samples consistently show lower measured transaction latency for Journal in these fixtures, while Snapshot cost rises with total stored-cell count. This supports the performance feasibility of a bounded strategy cutover, not a user-facing performance guarantee. There was no browser benchmark, forced-GC retained-memory comparison, or independent historical-source build. Memory readings are noisy observations only.

## Reproduction and verification

Harness compile/run used Node 24.22.0 and the exact PKG-01C harness:

```sh
build_dir=$(mktemp -d /tmp/pkg01h-build.XXXXXX)
PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PATH npx tsc --ignoreConfig \
  --outDir "$build_dir" --rootDir . --target ES2022 --module commonjs \
  --moduleResolution node --ignoreDeprecations 6.0 --esModuleInterop \
  --skipLibCheck --types node packages/core/benchmarks/p1-pkg-01c-journal-comparison.ts
/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin/node \
  "$build_dir/packages/core/benchmarks/p1-pkg-01c-journal-comparison.js" \
  > docs/engineering/CS-002D4-R1-PKG-01H-benchmark-raw.json
```

The harness typecheck passed. The 92-test focused Core selection and Core package typecheck passed. The nine generated Core `.js` sidecars were parked and restored around the Jest invocations; the complete 28-file sidecar SHA-256 manifest (27 protected generated sidecars plus tracked ChartBuilder JS sidecar) matched before and after. `git diff --check` passed. Full Core was not run and no acceptance baseline was recaptured.
