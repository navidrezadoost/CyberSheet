# CS-002D4-R1 PKG-14A — Formula coordinates through merged cells

**Scope:** Lane A source and contract review, plus a focused characterization test. **Verification:** PKG-14D passed 5/5 Lane A cases in the three-suite focused selection. **Production changes:** None.

## Contract boundary

The authoritative D7 clauses do not define how a formula's references should be translated when its input address is a merged non-anchor member:

- D7-01 makes the anchor's effective cell content observable through a merged-member read.
- D7-03 requires requested-address and merge-anchor provenance to be represented consistently to consumers.
- D7-04 keeps the anchor as the sole stored value/style source and requires read provenance; it does not define formula-entry translation.
- D7-05 leaves the compatible public read DTO unresolved.

These clauses do not specify copy/fill semantics, whether A1 references should be re-based to the anchor or requested member, or whether formulas written through a member should be rewritten at all. No such rule is inferred here. D2-01 and D2-11 cover rollback and the completeness of the transactional side-effect inventory, respectively; a focused formula/graph rollback case is evidence for this mutation family, not global D2-11 closure.

## Current source behavior

In `packages/core/src/worksheet.ts`, `#resolveAnchor()` maps a member address to the merge anchor (1040–1060). `setCellFormula()` stores the provided formula text on that resolved cell, but passes the original requested address to dependency extraction (1217–1281). The extractor's default A1 mode parses literal coordinates; the current-cell origin is relevant to its R1C1 mode (see `packages/core/src/utils/formula-reference-extractor.ts:14–21, 24–70`). The Worksheet then normalizes extracted coordinates into the public one-based graph and registers them against the resolved anchor.

Consequently, current A1 dependency tracking preserves reference tokens as literal coordinates regardless of whether the formula is submitted at the anchor or a merged member. `$` markers do not change the extracted graph coordinate. This describes dependency registration; it is not a contract decision about formula copy/fill, relative-reference translation, or serialized Excel behavior.

Formula recalculation is characterized separately through a standalone `Worksheet` with the current `FormulaEngine`, where `autoRecalculate()` is available. The dependency extractor recognizes `E5`, `E$5`, `$E5`, and `$E$5` as the same literal E5 graph edge, but the current formula evaluator's cell-reference token path accepts only letters followed by digits; the dollar-marked forms therefore currently evaluate to `#NAME?` while their graph edges remain registered. This is a parser/evaluator support difference, not evidence that merged-member reference translation is required or that the extracted coordinate is wrong. Only plain `=E5+1` is used to assert numeric recalculation and precedent-change propagation. Workbook-owned formula-result reads remain masked/unavailable under the current owner view. The Workbook transaction case therefore checks the explicitly supplied display value and graph/event state; it does not claim owner-backed formula evaluation.

## Cross-sheet boundary

No cross-sheet dependency assertion is included. The current extractor removes sheet-qualified A1 references because a Worksheet-local `Address` graph cannot represent another sheet (`formula-reference-extractor.ts:24–25, 96–102, 170–173`). D6-06 independently leaves parser identity and XLSX round-trip behavior for later verification. This lane neither claims cross-sheet dependency tracking nor changes that boundary.

## Decision status

This is characterization, not an approval to rebase or rewrite formulas. A production change that translates formula tokens needs an explicit, operation-specific rule for the origin coordinate and compatibility evidence. Until then, keep the submitted formula string intact and treat the existing literal A1 graph as implementation behavior. Overall CS-002D4-R1 acceptance remains **WITHHELD**.
