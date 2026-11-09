# CS-002D4-R1 PKG-14A — Formula coordinate regression matrix

New focused test: `packages/core/__tests__/workbook-merged-formula-coordinate-contract.p1-pkg-14a.test.ts`.

| Case | Route | Assertions | Status in Lane A |
| --- | --- | --- | --- |
| A1 dependency extraction versus evaluator syntax | Standalone Worksheet; formulas submitted through a merged member | All four spellings remain unchanged in anchor storage and extract literal E5 only at the anchor. Plain `=E5+1` evaluates numerically; current FormulaEngine reports `#NAME?` for the three dollar-marked forms. The test does not assert Excel-compatible absolute-reference evaluation. | Passed in PKG-14D |
| Precedent edit / recalculation | Standalone Worksheet with FormulaEngine; plain `=E5+1`, then replacement with `=F5+1` | Anchor becomes dirty after the active precedent changes and `autoRecalculate()` updates the numeric result; replacing formula removes the old E5 edge and registers F5 | Passed in PKG-14D |
| Formula replacement and clear | Standalone Worksheet through member, then Workbook transaction through member | Replacement moves the graph edge from E5 to F5; clear removes the formula edge while preserving the current value | Passed in PKG-14D |
| Requested event address | Workbook transaction formula replacement and clear through B2 member | Cell-change notifications carry B2, while storage and graph use A1 anchor | Passed in PKG-14D |
| Journal rollback | Workbook formula replacement fails after dependency registration | Exact prior sparse snapshot, formula, graph, and event silence are restored; Workbook remains healthy | Passed in PKG-14D |
| Snapshot rollback | Same injected graph-update failure using Snapshot strategy | Same exact restoration and no-event assertions | Passed in PKG-14D |
| Cross-sheet formula dependency | Not exercised | Current Worksheet-local extractor intentionally excludes sheet-qualified references; no claim of support | Excluded |

## Existing adjacent evidence retained

- `workbook-merged-member-formula-origin.p1-pkg-13a.test.ts` already compares anchor/member submissions for relative-looking, mixed, and absolute A1 tokens, checks requested event addresses, and injects mixed multi-merge rollback under Journal and Snapshot.
- `workbook-merged-member-integrity.p1-pkg-12a.test.ts` already covers formula write, clear, formula-to-value replacement, and merged-member rollback under both transaction strategies.

The PKG-14A test adds a plain-A1 standalone recalculation chain, explicitly separates dependency extraction from the current evaluator's dollar-reference limitation, verifies edge replacement/clear through the merged member, and injects a one-shot failure after dependency registration so Snapshot restoration is not faulted a second time. All five Lane A test cases passed in PKG-14D. This does not replace earlier cases or claim that their historical verification was rerun. Overall CS-002D4-R1 acceptance remains **WITHHELD**.
