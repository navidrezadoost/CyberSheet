# CS-002D4-R1 PKG-02E — Verification record

## Focused tests

Command (Node v24.22.0, serialized Jest):

```sh
NODE_OPTIONS=--experimental-vm-modules node node_modules/jest/bin/jest.js \
  --config packages/core/jest.config.cjs --runInBand \
  packages/core/__tests__/workbook-dimension-events.p1-pkg-02e.test.ts \
  packages/core/__tests__/workbook-event-contract.p1-pkg-02d.test.ts \
  packages/core/__tests__/EventBus.workbook-bridge.test.ts \
  packages/core/__tests__/workbook-row-height-journal.p1-pkg-02a.test.ts \
  packages/core/__tests__/workbook-column-width-journal.p1-pkg-02b.test.ts \
  packages/core/__tests__/workbook-seven-operation-differential.p1-pkg-02c.test.ts \
  packages/core/__tests__/workbook-mutation-queue.p1-pkg-01.test.ts \
  packages/core/__tests__/workbook-owned-escape.test.ts
```

Result: **8 suites passed, 150/150 tests passed; 0 failed**. The focused set covers payload typing and values, same/repeated writes, staged values versus final committed state, mixed Cell/Style/row-height/column-width ordering across Worksheets, Worksheet-before-Workbook dimension notification, rollback under Journal and Snapshot, listener exceptions, post-disposal rejection, bridge cleanup, and isolation between Workbook instances. It also reruns the existing row-height, column-width, seven-operation, queue, ownership, and EventBus bridge regressions.

Before and after the successful Jest invocation, `sha256sum -c docs/engineering/CS-002D4-R1-PKG-01K-core-sidecar-sha256.txt` checked all 237 protected entries; the two sorted verification outputs compared byte-for-byte equal. During Jest, the nine protected generated Core source `.js` sidecars were moved to a temporary directory and restored by a shell trap. No sidecar contents were edited.

An intermediate mixed-order test assertion expected Cell/Style Workbook bridge callbacks before Worksheet observers. The first run showed Worksheet observers registered earlier in this test execute first, consistent with the existing bridge's registration-dependent ordering. The test expectation was corrected to the observed order; production Cell/Style behavior was not changed. The final focused run is green.

## Typecheck and hygiene

- `node node_modules/typescript/bin/tsc -p packages/core/tsconfig.json --noEmit` — passed.
- `node scripts/check-no-focused-tests.mjs` — passed: “No focused test markers found.”
- `git diff --check` — passed after the source, tests, and reports were prepared.
- No full Core suite or build was run.

Jest printed the existing ts-jest `globals` deprecation and TS151001 `esModuleInterop` advisories; both were non-failing.

## Protected sidecar integrity

Protected manifest: `docs/engineering/CS-002D4-R1-PKG-01K-core-sidecar-sha256.txt`.

Manifest SHA-256: `a6b89cdc3ccd8bfc8c054e5fafcb4dc84ed9ba1347eb2597a3e7bef938969b6c` (237 entries). `sha256sum -c` passed for all 237 manifest entries after test execution. The manifest and protected payloads are not modified by PKG-02E.

No tests, packages, or acceptance baselines outside the focused authorized verification were changed or recaptured.
