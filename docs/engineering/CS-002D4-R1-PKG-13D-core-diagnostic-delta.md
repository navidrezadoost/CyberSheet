# CS-002D4-R1 PKG-13D — Core diagnostic delta

## Compared runs

Both runs used the Core TypeScript-first Jest config with serialized execution under the repository-declared Node 24/npm 11 toolchain. PKG-11 is the prior recorded full Core diagnostic; PKG-13D is the current full-discovery run with no exclusions. Neither is a newly established clean-tree acceptance baseline.

| Metric | PKG-11 | PKG-13D | Delta |
| --- | ---: | ---: | ---: |
| Discovered suites | 298 | 302 | +4 |
| Passed suites | 286 | 290 | +4 |
| Failed suites | 7 | 7 | 0 |
| Skipped suites | 5 | 5 | 0 |
| Total tests | 7,473 | 7,485 | +12 |
| Passed tests | 7,273 | 7,285 | +12 |
| Failed tests | 18 | 18 | 0 |
| Skipped tests | 173 | 173 | 0 |
| Todo tests | 9 | 9 | 0 |

The expanded current worktree includes four additional discovered suites and 12 tests. Do not attribute the entire inventory delta solely to PKG-13. PKG-13A/B/C's focused results and the broader 22-suite adjacent result are separately recorded. The exact current full-run output is `CS-002D4-R1-PKG-13D-full-core-jest-output.txt`, SHA-256 `04b947ca89d5a17a7094817c3a63c8968116b229ca6b8fda28bf64f05bf54e46`.

## Failure identity and stage

The same seven suite paths failed as in PKG-11. One suite, `pivot-formula-integration.test.ts`, has 18 fixture setup failures: attempts to add a sheet after Workbook publication are rejected by the current lifecycle guard. Six other suites fail at TypeScript compilation and run zero tests because tests expect unsupported Workbook Pivot registry/snapshot/invalidation APIs or mutable Worksheet methods on `WorkbookSheetView`.

Therefore, this run has zero executed assertion failures. It does not demonstrate that all Core behavior is correct, nor does the unchanged failure set prove there was no interaction with other dirty worktree changes. It shows only that the four added suites contributed 12 passing tests and did not alter the observed failure count or identities under this run.

## Disposition

Classify the current Core state as **expanded diagnostic with unchanged known Pivot integration blockers**. Do not characterize the 18 setup failures as 18 product assertion failures, and do not treat the 6 compilation failures as executed tests. Workbook-owned Pivot lifecycle remains unauthorized; no fixture compatibility shim, assertion weakening, API addition, baseline recapture, or disposition promotion was made. Overall CS-002D4-R1 acceptance remains **WITHHELD**.
