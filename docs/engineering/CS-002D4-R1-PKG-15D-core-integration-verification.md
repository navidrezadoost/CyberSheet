# CS-002D4-R1 PKG-15D — Core integration verification

**Starting revision:** `88b09634f17f3b39d88a88c5428f76b426459a2b`
**Starting worktree:** 606 dirty paths before PKG-15 lane files; preserved without reset, clean, or broad staging.
**Protected sidecars:** 237 Core JS/map/declaration-map entries, manifest SHA-256 `a6b89cdc3ccd8bfc8c054e5fafcb4dc84ed9ba1347eb2597a3e7bef938969b6c`.
**Runtime:** Node 24.22.0, npm 11.19.1, TypeScript-first opt-in Core Jest config, `--runInBand`, `NODE_OPTIONS=--experimental-vm-modules`.

## Focused verification

The serialized selection included new PKG-15A formula compatibility and PKG-15B multi-Worksheet graph rollback tests, PKG-13/14 merge/formula and transaction cases, seven-operation differential coverage, dimension and Workbook/EventBus bridge suites, mutation queue coverage, and standalone Pivot recompute/snapshot/query coverage.

| Run | Result | Sidecar integrity | Evidence |
| --- | --- | --- | --- |
| Initial focused run | 14/15 suites; 200/201 tests. One Lane B Snapshot test-harness assertion expected exactly two total hook callbacks, while Snapshot restoration also invoked the hook. The intended fault was reached and production behavior assertions were not reached in that case. | 237/237 before and after; outputs identical. | `CS-002D4-R1-PKG-15D-focused-jest-output.txt`; status and manifests in `...focused-status.txt` and `...focused-sidecars-*.txt`. |
| Corrected focused rerun | 15/15 suites; 201/201 tests passed, including new 15A and 15B suites. | 237/237 before and after; outputs identical. | `CS-002D4-R1-PKG-15D-focused-rerun-jest-output.txt`; status and manifests in `...focused-rerun-status.txt` and `...focused-rerun-sidecars-*.txt`. |

The test was corrected to assert that the one-shot failure at the second dependency-registration callback was reached, rather than asserting a total callback count that includes restoration. The failure evidence remains preserved. No production source was changed.

## Full Core diagnostic

The no-exclusion Core Jest run discovered 307 suites: 295 passed, 7 failed, and 5 skipped. Of 7,538 tests, 7,338 passed, 18 failed during fixture setup, 173 were skipped, and 9 were todo. The seven failing suites are the same legacy Pivot integration set as PKG-14: six fail TypeScript compilation because fixtures depend on unavailable Workbook Pivot internals or mutable `WorkbookSheetView` APIs; `pivot-formula-integration.test.ts` executes 18 tests that all fail during setup when its fixture calls the unavailable post-publication `Workbook.addSheet()`. No intended assertions execute in those cases. No executed assertion failure was reported in the full run.

The focused result adds exactly 17 passing tests and two suites relative to the PKG-14 inventory; the same seven blocked suites and 18 setup failures remain. This is a diagnostic comparison, not a clean baseline. The full raw output SHA-256 is `5eb3d438f6743c8f5b7b2d84dabe909aa35f9cbf5834645c3d229661a03816ee`. Protected manifest checks passed 237/237 before and after, with byte-identical outputs.

## Other verification

- Core typecheck: passed; raw output `CS-002D4-R1-PKG-15D-core-typecheck-output.txt`.
- Focused-test hygiene: passed; no focused markers.
- `git diff --check`: passed at the recorded hygiene run.
- PKG-15 Markdown whitespace/final-newline scan: passed at the recorded run; the report inventory was subsequently expanded and final hygiene is re-run at integration close.
- No production correction was authorized or made in PKG-15.

The final diagnostic delta and all failure classifications are recorded separately in `CS-002D4-R1-PKG-15D-diagnostic-delta.md`. Overall CS-002D4-R1 acceptance remains **WITHHELD**.
