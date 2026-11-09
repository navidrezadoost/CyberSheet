# CS-002D4-R1 PH1C Lane A — Ownership and EventBus regression qualification

**Review base:** Candidate-02 archive SHA-256 `5f9370222130e721b9a4da015d72c165d36ec471a1d43fd0670502f9d3666839`. Tests ran in isolated PH1C Lane A copy; its added probes did not modify Candidate-02 or the shared source.

## Results

- **Confirmed Candidate-02 ownership defect:** `assertOwnedMutationEntry` is omitted from the pre-adoption own-property rejection list. Prototype mutator wrappers call that method dynamically; installing an own no-op method before adoption bypasses the raw-Worksheet guard. The lane-local adversarial test reproduced the write bypass. A correction is required.
- Own shadows of `adoptByWorkbook` and `setCellValue` are rejected before ownership/capability publication. Explicit `Worksheet.prototype.setCellValue.call(raw, ...)`, foreign Workbook views, and raw Worksheets passed as owner targets reject; valid Workbook-port mutations succeed. Prototype method replacement is blocked by the non-configurable descriptor; replacing an adopted Worksheet's prototype is blocked by non-extensibility.
- Candidate-02 formula graph dirty-state restoration passed its focused case.
- EventBus ordinary instances use live Set iteration and propagate callback exceptions; `once` is consumed before nested callback dispatch. Workbook committed-observer exceptions are isolated; disposal during current dispatch stops later listeners.
- Multi-sheet Worksheet and Workbook value/formula observers see committed state. The test does not impose cross-surface observer completion order. Source dispatch order is observed implementation behavior only and does not establish a D5-01 global ordering contract.

## Verification

With a temporary symlink to the shared repository dependency tree (removed after the run), normal ts-jest diagnostics enabled:

```sh
NODE_OPTIONS=--experimental-vm-modules node node_modules/jest/bin/jest.js \
  --config packages/core/jest.config.cjs --runInBand \
  packages/core/__tests__/workbook-mutation-port.p1-pkg-21.test.ts \
  packages/core/__tests__/sdk/event-contract.test.ts
```

Latest adversarial run: **2 suites, 1 failed / 41 passed**; the sole failure reproduces the `assertOwnedMutationEntry` shadow. A filtered adversarial run passed 6 tests with 16 skipped; it is supplementary, not a green full selection. `EventBus.test.ts` was run separately with normal diagnostics and remains compile-blocked (TS2551 at lines 53, 69, 73, 77 for `WorkbookSheetView.setCellValue`; TS2345 at lines 91–92 passing a view where a standalone `Worksheet` is required; zero tests executed). The two other selected suites passed in that attempt. Existing ts-jest deprecation and TS151001 advisories appeared. `git diff --check` passed.

## Candidate-03 correction check

Candidate-03 adds `assertOwnedMutationEntry` to the pre-adoption protected own-property list. The focused Candidate-03 selection, including the ownership and Snapshot recovery regressions, passed **2 suites / 23 tests**. This closes the reproduced Candidate-02 ownership bypass for the tested supported boundary; it does not qualify Candidate-03 as a whole. The unchanged `EventBus.test.ts` remains compile-blocked by its `WorkbookSheetView`/`Worksheet` fixture mismatch and had zero tests execute. D0-06 remains independent and pending.

**Disposition:** Candidate-02 is not qualified. Candidate-03 contains the bounded ownership correction and passes its focused regressions. Candidate-wide qualification remains open pending the other PH1C gaps and D0-06.
