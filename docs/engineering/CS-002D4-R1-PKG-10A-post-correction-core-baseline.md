# CS-002D4-R1 PKG-10A — Post-correction full Core diagnostic

**Outcome:** Post-correction diagnostic captured; Core remains non-green. This is not a frozen acceptance baseline or clean-worktree regression comparison.
**Run window:** One serialized Jest process; no source/test edits were made during the run.

## Starting state and execution

- Git HEAD: `88b09634f17f3b39d88a88c5428f76b426459a2b`.
- Worktree status count observed immediately before the run: 463 paths; existing changes preserved.
- Runtime: Node `v26.10.0`, npm `12.2.0`, Jest `30.5.2`, TypeScript `6.0.3`, ts-jest `29.4.15`.
- Jest command:

```sh
NODE_OPTIONS=--experimental-vm-modules node node_modules/jest/bin/jest.js \
  --config packages/core/jest.typescript-first.config.cjs \
  --runInBand --verbose
```

- Scope: all **298** suites discovered by the opt-in Core configuration; no path exclusions. Jest completed in `181.377 s`, exit code `1` because of the failures listed below.
- Complete unfiltered output: [`CS-002D4-R1-PKG-10A-post-correction-core-jest-output.txt`](CS-002D4-R1-PKG-10A-post-correction-core-jest-output.txt), SHA-256 `f373de279f9530c71c53cbc6f1b6be02292a12f155c33781a5f7d508712d8fc2`.

## Results and failure stages

Jest reported **285 passed suites, 8 failed suites, 5 skipped suites** (298 total); **7,272 passed tests, 19 failed tests, 173 skipped tests, and 9 todo** (7,473 total).

| Failed suite | Stage and count | Observed failure |
| --- | --- | --- |
| `packages/core/__tests__/merge-api.test.ts` | Executed assertion: 1 | The BT-2 non-anchor merged-cell test expects reference identity with the anchor cell; received data serializes equally but is not the same object. |
| `packages/core/__tests__/pivot-formula-integration.test.ts` | Fixture setup: 18 cases | `Workbook.addSheet()` rejects post-publication sheet creation before the intended Pivot assertions run. |
| `packages/core/__tests__/workbook-snapshot-integration.test.ts` | TypeScript compilation: 0 tests | Missing Workbook Pivot snapshot-store and registry accessors (TS2551/TS2339). |
| `packages/core/__tests__/workbook-pivot-integration.test.ts` | TypeScript compilation: 0 tests | Missing Workbook Pivot registry accessor (TS2339). |
| `packages/core/__tests__/pivot-slicers.test.ts` | TypeScript compilation: 0 tests | Mutable `Worksheet` assumptions and unavailable registry access (including TS2740/TS2339). |
| `packages/core/__tests__/pivot-partial-sanity.test.ts` | TypeScript compilation: 0 tests | Mutable `Worksheet` assumptions and unavailable registry access. |
| `packages/core/__tests__/pivot-partial-recompute.test.ts` | TypeScript compilation: 0 tests | `WorkbookSheetView` does not expose the mutable `Worksheet` APIs required by the fixture (TS2740). |
| `packages/core/__tests__/pivot-invalidation-workbook-bridge.test.ts` | TypeScript compilation: 0 tests | Missing Pivot registry APIs and mutable Worksheet methods on `WorkbookSheetView` (TS2339/TS2551). |

The eight failed suites account for 19 failed cases: six suites stopped at TypeScript compilation, the Pivot formula suite reported 18 setup failures, and the merge suite reached one failed assertion. No assertion from the six compilation-blocked suites ran. The setup failures are not executed Pivot correctness assertions. The opt-in resolver compatibility suite passed; there were no resolver-resolution failures.

## Comparison with PKG-09B

PKG-09B used the same HEAD, Node/Jest/TypeScript versions, opt-in config, serialized `--runInBand --verbose` command, and 298-suite selection. It was also run on a dirty worktree, not a clean historical baseline.

| Metric | PKG-09B before the PKG-09C correction | PKG-10A post-correction | Observed delta |
| --- | ---: | ---: | ---: |
| Suites passed | 284 | 285 | +1 |
| Suites failed | 9 | 8 | -1 |
| Suites skipped | 5 | 5 | 0 |
| Tests passed | 7,266 | 7,272 | +6 |
| Tests failed | 20 | 19 | -1 |
| Tests skipped | 173 | 173 | 0 |
| Todo tests | 9 | 9 | 0 |
| Total tests | 7,468 | 7,473 | +5 |

The prior standalone absent-null sparse-cell assertion in `worksheet-null-write-noop.p1-pkg-09c.test.ts` is no longer a failing suite in this run. The remaining eight failed suites are the same merge identity and Pivot compile/setup groups recorded in PKG-09B. The discovered suite count is unchanged, while the test total increased by five; therefore the aggregate delta is reported without attributing every pass-count change solely to the correction. This remains diagnostic evidence, not proof of origin relative to unrelated dirty-worktree edits.

## Sidecar integrity

Protected manifest: [`CS-002D4-R1-PKG-01K-core-sidecar-sha256.txt`](CS-002D4-R1-PKG-01K-core-sidecar-sha256.txt), SHA-256 `a6b89cdc3ccd8bfc8c054e5fafcb4dc84ed9ba1347eb2597a3e7bef938969b6c`, containing 237 entries.

- Pre-run: all 237 entries passed `sha256sum -c`.
- Post-run: all 237 entries passed `sha256sum -c`.
- The complete pre-run and post-run check outputs were byte-identical; each output SHA-256 was `a4374e59790f227bba349c82f605762c2d15eeae35e22f0e6b9c015052d34d73`.
- The opt-in resolver ran with sidecars in place; none were parked, deleted, or rewritten by this procedure.

No source or test files were modified during the Jest window. No full-suite failure is attributed to the resolver or to the PKG-09C correction unless the recorded case directly establishes that relationship. The Pivot Workbook integration gate and BT-2 merge identity assertion remain unresolved. Overall CS-002D4-R1 acceptance remains **WITHHELD**.
