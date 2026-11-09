# CS-002D4-R1 PKG-13A — Graph regression evidence

**Execution status:** Verified in the serialized coordinator window: 1 suite, 3/3 tests passed. Raw output: `CS-002D4-R1-PKG-13D-lane-a-jest-output.txt`.

## Regression matrix

| Case | Strategy | Mutation path | Assertions prepared |
| --- | --- | --- | --- |
| A1 origin comparison | Journal | One transaction writes formulas at a merge anchor and three non-anchor members across four distinct merge ranges | Formula text remains as supplied; each formula is stored and registered at its effective anchor; relative-looking A1, row/column mixed, and absolute tokens all produce the literal J8 dependency; non-anchor graph nodes remain empty; source `cell-changed` events preserve each requested address. |
| Mixed failure after partial graph mutation | Journal | Formula at first merged member, formula at second merged member, value at third merged member; fault after the third CellRecord write | The thrown operation error is preserved; exact sparse snapshot returns to its initial state; formula graph has no stale edges; Worksheet event publication is suppressed; Workbook remains healthy. |
| Mixed failure after partial graph mutation | Snapshot | Same fixture and cut, independently selected Snapshot strategy | Same restoration assertions, independently exercising the Snapshot reference path. |

The formula-clear, formula-to-value dependency cleanup, and single-merge formula/style rollback cases are already directly covered by `workbook-merged-member-integrity.p1-pkg-12a.test.ts`; PKG-13A avoids duplicating those scenarios. PKG-13A extends the failure matrix to multiple merge ranges and a mixed formula/value transaction.

## Contract interpretation and non-claims

The A1 text `J8` names the J8 coordinate in the current parser. Dollar markers are ignored by dependency extraction, so the three tested mixed/absolute spellings map to the same dependency coordinate. The tests do not claim that `$` has no meaning in formula copy/fill operations; copy/fill translation is outside this API call and no merged-member origin rule was found in the authoritative contract.

The current graph extractor strips sheet-qualified A1 references because its graph addresses are local to one Worksheet. Cross-sheet graph semantics were excluded rather than inferred from tests for formula evaluation. No formula parser behavior was changed.

## Coordinator execution record

The coordinator's full command, environment, typecheck, and protected-sidecar verification are recorded in `CS-002D4-R1-PKG-13D-integration-verification.md`. A failure would be a characterization result until its expectation is checked against an approved contract; it is not by itself permission to edit `worksheet.ts`.

No production correction is proposed by this lane. `packages/core/src/worksheet.ts` was already modified at Lane A start by prior PKG-12 work, and this lane did not edit it. Overall CS-002D4-R1 acceptance remains **WITHHELD**.
