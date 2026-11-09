# CS-002D4-R1 PKG-15A — Formula parser/evaluator analysis

**Scope:** Read-only source and contract trace plus a focused executable characterization matrix. **Production edits:** None. **Test execution:** Deferred to PKG-15 Lane D's serialized verification window.

## Contract boundary

The reviewed authoritative contract does not specify whether mixed or absolute A1 references containing `$` must evaluate, nor how a formula entered through a merged non-anchor should translate references. D7-01 through D7-04 govern effective merged-cell reads/storage/provenance; they do not establish formula-entry rebasing. D7-05 leaves the public provenance DTO unresolved. D6-06 calls for cross-sheet parser/XLSX verification and is not a local dollar-token approval. PKG-14E separately records that the formula/API authority must settle supported A1 grammar, merge-member reference origin, cross-sheet behavior, and result/error semantics before parser changes.

Accordingly, this lane distinguishes observed implementation from guaranteed compatibility. No Excel compatibility promise is inferred from the extractor's comments or regex.

## Current executable path

1. `Worksheet.setCellFormula()` (`packages/core/src/worksheet.ts:1217–1281`) resolves a merged member to its anchor for cell storage and graph registration. It preserves the supplied formula text. Dependency extraction receives the originally requested address converted to zero-based coordinates, then maps extracted A1 dependencies to the public one-based graph and registers those edges against the resolved anchor.
2. The A1 extractor (`packages/core/src/utils/formula-reference-extractor.ts:14–70, 73–84`) uses literal coordinate patterns that permit an optional `$` before the column and row. Its A1 branch does not use the current-cell origin to translate references. Thus `E5`, `E$5`, `$E5`, and `$E$5` each identify literal E5 in the local graph.
3. `Worksheet.autoRecalculate()` evaluates dirty formula graph nodes through `#evaluateFormulaNode()` (`worksheet.ts:2466–2475`). `FormulaEngine.evaluateInternal()` strips `=` and invokes its entity/member-chain tokenizer only when `needsTokenization()` detects member-access syntax; ordinary A1 expressions go directly to `evaluateExpression()` (`FormulaEngine.ts:285–307). There is no general lexer that canonicalizes `$` markers in ordinary cell-reference tokens. The cell-reference expression branch (`FormulaEngine.ts:1015–1022`) accepts letters and digits without `$`; `parseCellReference()` repeats that restriction (`FormulaEngine.ts:1417–1433`). In the existing public Worksheet fixture, the three dollar-marked forms currently produce `#NAME?`; plain `=E5+1` produces 11 from E5=10.
4. `Worksheet.clearCellFormula()` (`worksheet.ts:1180–1203`) resolves the effective anchor, clears formula dependencies, notifies recalculation, and emits with the originally requested address. Replacement similarly removes/re-registers graph edges through `setCellFormula()`.

The implementation therefore has a concrete extractor/evaluator syntax difference. It does not establish whether the evaluator's behavior is a defect: the governing formula compatibility decision is absent.

## Merge coordinate observations

The PKG-15A test matrix exercises formula placement in an ordinary G1 cell, the A1 merge anchor, and the B2 non-anchor member of an A1:B2 merge. It compares the four literal spellings, the effective stored formula cell, extracted precedent/dependent edges, recalculation, source invalidation, formula replacement, and clearing. The non-anchor write currently stores/registers at A1 while preserving its submitted formula text and the literal E5 precedent; it does not rebase the formula to match the anchor's address.

No cross-sheet dependency behavior is claimed: the extractor strips sheet-qualified references because this graph stores Worksheet-local `Address` values. No Workbook-owned formula result is asserted; owner-view formula cached values remain unavailable/masked under existing rules.

## Required owner decision

The formula/API authority must explicitly decide:

- Whether the supported formula grammar includes `E$5`, `$E5`, and `$E$5` as evaluable A1 references.
- The expected value/error result for each supported spelling.
- Whether formula references entered through a merged member use literal coordinates, requested-member origin, effective-anchor origin, or another explicit rule.
- Whether those choices apply to standalone and Workbook-owned formula paths, and how cross-sheet support relates to D6-06.

Until that decision is recorded, retain the characterization matrix and do not alter formula text, tokenization, reference origins, dependency registration, or error mapping.
