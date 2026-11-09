# CS-002D4-R1 PKG-15B — Fault and recovery results

**Lane:** B — D2-11 transaction closure
**Verification owner:** Lane D (serialized Core Jest)
**Current result:** Passed under Journal and Snapshot in the serialized PKG-15D focused window. The first run exposed an over-specific callback-count assertion in the test; the one-shot fault was reached as intended, while Snapshot restoration invoked the hook again. The corrected assertion checks that the intended fault was reached rather than counting rollback callbacks.

## Fault scenario

`workbook-multisheet-formula-graph-rollback.p1-pkg-15b.test.ts` creates two Workbook-owned Worksheets with existing values and formulas. A single Workbook transaction stages a formula write on Alpha and then one on Beta. The existing internal `after-dependency-registration` hook throws on its second invocation, immediately after Beta's dependency registration and before transaction commit. Alpha's earlier formula write and both graph registrations have therefore been applied before rollback begins.

The same deterministic cut runs separately with Journal and Snapshot selected through the existing test hook. The test captures each Worksheet's object snapshot and detached dependency-graph state before the transaction, and records Worksheet events plus Workbook value/formula bridge events.

## Recovery oracle

After the injected operation error, the test requires:

1. The original injected error is propagated.
2. Alpha and Beta snapshots and graph states equal their individual pre-transaction states.
3. Neither Worksheet nor Workbook cell notification escaped the aborted transaction.
4. The formula addresses introduced by the failed transaction have no graph precedents.
5. Both cell-write journals are inactive and Workbook mutation health is `healthy`.

This establishes recovery only for the tested graph shape, fault seam, and successful rollback path. It does not validate partially restored state, force rollback failure, establish formula semantic support, or cover all graph mutation phases.

## Lane D execution record

Fill this section from the serialized run; preserve the actual raw output path and sidecar manifest results.

| Strategy | Result | Tests | Raw output |
| --- | --- | ---: | --- |
| Journal | Passed | 1 | `docs/engineering/CS-002D4-R1-PKG-15D-focused-rerun-jest-output.txt` |
| Snapshot | Passed | 1 | `docs/engineering/CS-002D4-R1-PKG-15D-focused-rerun-jest-output.txt` |

Required focused command (run with the repository's TS-first Core Jest config, `--runInBand`, and protected sidecar checks immediately before and after):

```sh
NODE_OPTIONS=--experimental-vm-modules node node_modules/jest/bin/jest.js \
  --config packages/core/jest.typescript-first.config.cjs --runInBand \
  packages/core/__tests__/workbook-multisheet-formula-graph-rollback.p1-pkg-15b.test.ts
```

The focused rerun passed 15 suites / 201 tests, including both Lane B cases. Before and after the Jest window, 237/237 protected Core sidecars passed; the sorted check outputs were byte-identical. The first-run output is preserved at `docs/engineering/CS-002D4-R1-PKG-15D-focused-jest-output.txt`; it records 14 passing suites and the original Snapshot callback-count assertion failure. No production source changed. D2-11 remains unresolved outside the defined seven-operation and tested fault boundaries. Overall CS-002D4-R1 acceptance remains **WITHHELD**.
