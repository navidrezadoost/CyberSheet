# CS-002C — Full-Core Failure Inventory

Generated: 2026-10-17 · Branch: `main` · HEAD: `ec75a6e5d3e916047d42378f087e19251e30092b`

## Final pinned run

- Runtime: Manjaro Linux 6.12.94-1 x86_64, Node v24.22.0, npm 11.19.1, TypeScript 6.0.3.
- Command: see the `commands.core` value in the companion JSON.
- Result: 234 suites; 211 passed, 18 failed, 5 skipped. Of 6,929 tests, 6,642 passed, 105 failed, 173 skipped, 9 todo. No suite crashed at runtime. Duration: 61.139 seconds.
- The JSON records every failing suite, full test identity, error type/message, source location where available, original baseline group, and owner.

## Assertion-level comparison

| Comparison | Failed identities | Now passing | Newly failing | Still failing |
| --- | ---: | ---: | ---: | ---: |
| CS-002B pre-CS-002C capture → final | 280 | 175 | 0 | 105 |
| Raw accepted CS-000F.4 core run → final | 138 | 33 | 0 | 105 |

All 105 final failures match individual test identities in both the pre-CS-002C capture and the raw accepted core JSON. The 175 repaired CS-002B identities include the zero-based fixture failures, the GraphInvariantValidator coordinate mismatch, the redundant PasteCommand dependency registration, and the newly exposed cycle/invalidation-related tests reconciled in this ticket.

The accepted CS-000F.4 inventory file contains 144 rows under its top-level `failures` property, but the raw accepted core JSON contains 138 failed core test identities. The six extra inventory rows identify IO-XLSX tests, not core tests. The accepted file was preserved unchanged; this report compares against its raw core JSON rather than treating those six rows as core failures.

## Remaining failed tests by original triage group

| Baseline group | Failed tests |
| --- | ---: |
| PIVOT-CALCULATED-FIELDS | 16 |
| PIVOT-GETPIVOTDATA | 15 |
| PIVOT-SLICER-FILTER | 11 |
| NUMERIC-STUDENT-T | 11 |
| NUMERIC-CHI-SQUARE | 10 |
| NUMERIC-F-DIST | 9 |
| PIVOT-STALE-SNAPSHOT | 7 |
| NUMERIC-NORMAL | 6 |
| PIVOT-PARTIAL-FULL-DIVERGENCE | 3 |
| PIVOT-AGGREGATE-FIELDS | 2 |
| PIVOT-GROUP-UPDATE | 2 |
| FORMULA-DATE-TODAY | 2 |
| CORE-SCHEDULER-INVALIDATION | 2 |
| PIVOT-GROUP-STORE-TEST-API | 2 |
| CORE-ADAPTER-THROTTLE | 1 |
| WORKSHEET-MERGE-PROJECTION | 1 |
| FORMULA-SPILL-CLEANUP | 1 |
| FORMULA-ADDRESS-CONTRACT | 1 |
| PIVOT-PARTIAL-PATH | 1 |
| PIVOT-REGISTRY-METADATA | 1 |
| FORMULA-CF-LOGIC | 1 |

## Remaining failed tests by suite

| Suite | Failed tests |
| --- | ---: |
| `packages/core/__tests__/AlphaVantageDriver.test.ts` | 1 |
| `packages/core/__tests__/conditional-formatting-formula-compiler.test.ts` | 1 |
| `packages/core/__tests__/dag-debug.test.ts` | 1 |
| `packages/core/__tests__/functions/datetime-arithmetic.test.ts` | 2 |
| `packages/core/__tests__/functions/distribution-oracle-validation.test.ts` | 6 |
| `packages/core/__tests__/functions/statistical-week2-day1.test.ts` | 11 |
| `packages/core/__tests__/functions/statistical-week2-day2.test.ts` | 9 |
| `packages/core/__tests__/functions/statistical-week2-day3.test.ts` | 10 |
| `packages/core/__tests__/merge-api.test.ts` | 1 |
| `packages/core/__tests__/pivot-calculated-fields.test.ts` | 16 |
| `packages/core/__tests__/pivot-formula-integration.test.ts` | 15 |
| `packages/core/__tests__/pivot-partial-recompute.test.ts` | 12 |
| `packages/core/__tests__/pivot-partial-sanity.test.ts` | 3 |
| `packages/core/__tests__/pivot-registry.test.ts` | 1 |
| `packages/core/__tests__/pivot-slicers.test.ts` | 11 |
| `packages/core/__tests__/scheduler-composition.test.ts` | 2 |
| `packages/core/__tests__/spill.test.ts` | 1 |
| `packages/core/src/__tests__/phase36a-forced-proof.test.ts` | 2 |

## Classification

- Legacy coordinate fixture drift: repaired at public Worksheet/Search/Clipboard/Spill boundaries while retaining operation generators, seeds, formula text, and expected spreadsheet behavior.
- Product regressions fixed: graph invariant reference coordinates now normalize extractor tokens before key packing; PasteCommand no longer re-registers already-normalized formula dependencies; merge-only structural paste bounds use actual one-based merge addresses; row insertion, column insertion, and row reorder remapping now convert between one-based cell addresses and zero-based structural indexes.
- Harness defect fixed: the synchronous scheduler comparison now attaches a FormulaEngine and explicitly runs `Worksheet.autoRecalculate()` before comparing cached values.
- Existing unresolved defects: all final failing identities are in the accepted raw core failure set. Owners and groups are retained per row in the JSON.
- Environment-sensitive observation: the previous full run also failed one 10k structural memory-growth assertion; the final run passed it. Treat the threshold as run-sensitive; no benchmark campaign was conducted.

## XLSX and guard gates

The IO-XLSX package gate passed separately: 2 suites, 25 passed, 2 skipped. The no-focused-tests guard passed. Full security, browser, and benchmark campaigns were not run.
