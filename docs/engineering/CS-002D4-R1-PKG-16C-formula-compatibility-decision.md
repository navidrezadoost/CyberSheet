# CS-002D4-R1 PKG-16C — Formula compatibility decision boundary

**Status:** Decision required; no option approved by this record.
**Scope:** Compare F1, F2, and F3 using PKG-14A/15A evidence and the current authoritative contracts.
**Implementation or test changes:** None authorized or made by Lane C.

## Current evidence and contract boundary

PKG-14A and PKG-15A establish a source-backed behavior, not an Excel-compatibility decision:

- In the exercised standalone `Worksheet` path, `=E5+1` evaluates to `11` when E5 is `10`. `=E$5+1`, `=$E5+1`, and `=$E$5+1` currently evaluate to `#NAME?`.
- The Worksheet-local dependency extractor recognizes all four spellings and registers each as the literal E5 dependency. Thus the evaluator and dependency extractor currently disagree about which formula references are evaluable.
- A formula submitted through a merged non-anchor is stored at the merge anchor with the submitted text unchanged. The current A1 graph edge remains the literal referenced coordinate; the reference is not rebased to the anchor or requested member.
- Replacement, clearing, recalculation, requested-address events, and selected Journal/Snapshot rollback behavior have focused characterization. The 15A matrix passed 15/15 relevant tests in the PKG-15 focused run; PKG-14A's five-case matrix passed in its recorded PKG-14 run.
- No cross-sheet behavior is established. The current Worksheet-local extractor excludes sheet-qualified references. D6-06 separately requires cross-sheet parser and XLSX round-trip verification.

The authoritative contracts do not settle the A1 grammar, the expected result/error for dollar-marked references, or the reference origin for formulas entered through merged members. D7-01 through D7-04 concern merged reads and anchor storage/provenance; they do not define formula-entry rebasing. D7-05 remains the separate public merged-read DTO blocker. D6-06 is not approval for local `$` token support. No option below is implied by D2 rollback coverage or by the current extractor's behavior.

## Alternatives

| Dimension | F1 — Support dollar-marked A1 references | F2 — Preserve restricted formula syntax | F3 — Versioned compatibility behavior |
| --- | --- | --- | --- |
| Defined grammar | Accept plain, mixed, and absolute A1 references (`E5`, `E$5`, `$E5`, `$E$5`) in the supported formula dialect. A canonical token representation must retain row/column lock bits. | Keep the supported grammar restricted to the currently evaluated plain A1 form; explicitly designate the three dollar-marked forms unsupported. The owner must choose whether unsupported input is rejected at write time or retained but returns a specified formula error at evaluation. | Associate formulas with an explicit compatibility/dialect version. A legacy version retains its approved existing behavior; a later version may support the F1 grammar only under its own explicit rules. Define where the version is stored and how it is selected before adopting this option. |
| Evaluation and dependency extraction | Normalize all accepted spellings through one parser/token representation. For in-place evaluation, each token resolves to its literal row and column; `$` lock bits must remain available to any approved copy/fill or rewrite operation. Extraction must use the same parsed reference set as evaluation so a formula cannot track a reference the evaluator rejects. | For accepted plain A1 tokens, evaluation and extraction remain aligned. For unsupported spellings, rejection/error handling and graph behavior must also align: no live dependency should imply successful support for a formula that is rejected or evaluates as unsupported. Existing behavior (literal edge plus `#NAME?`) is evidence only, not a contract choice. | Dispatch parsing/evaluation/extraction by the formula's version. Each version must have a defined grammar, result/error mapping, and matching dependency rules; version must not be inferred from formula text or the current runtime default. |
| Relative/absolute anchoring | Define lock semantics for operations that move, copy, fill, or rewrite formulas. `$` does not change the literal coordinate during ordinary evaluation, but controls transformation behavior when such operations are in scope. The rule must identify whether a transformation changes formula text and graph targets together. | With no `$` grammar, lock behavior is out of scope for accepted formulas. If compatibility requires rejecting marked forms, define deterministic diagnostics and prevent partial formula/graph mutation. | Preserve each version's anchoring rules. Define whether an upgrade migrates existing formula text/lock bits and whether downgrade is permitted or rejected. |
| Merged-member entry origin | Decide independently whether references in a formula submitted through a merged member are literal, based on the requested member, based on the effective anchor, or governed by another named rule. Specify storage at the anchor, formula text transformation (if any), and graph targets as one coherent behavior. Do not infer this from F1's `$` support. | The same origin decision is still required for supported formulas. A restricted grammar does not answer whether a formula entered through a member is rebased. Preserve current literal behavior only if the owner expressly selects it. | Specify merge-origin behavior per version and any migration of formulas already stored at anchors. Do not silently apply a new origin rule to legacy formulas. |
| Compatibility consequences | Expands accepted syntax for callers that currently receive `#NAME?`; likely improves compatibility for formulas containing mixed/absolute references. Parser/evaluator consistency becomes required. Existing stored text can remain unchanged if the new parser accepts it, subject to the approved origin rule. | Minimizes grammar expansion but makes the current dollar-marked behavior an explicit limitation. Reject-at-write is behaviorally stricter than current acceptance/storage; evaluation-time errors preserve formula storage but require deterministic diagnostics and aligned dependency cleanup. Existing formulas need a defined handling path. | Gives explicit compatibility control but adds version selection, persistence, import/export, mixed-version, migration, and downgrade questions. It can preserve historical interpretation while enabling a deliberate newer dialect, at the cost of more state and lifecycle complexity. |
| Source change boundary if later authorized | Formula tokenizer/parser and evaluator; formula-reference extractor or a shared parser/token service; Worksheet formula graph registration/recalculation integration; possibly formula transformation sites if the owner includes copy/fill. No changes are authorized here. | Formula validation or error production at the selected boundary; dependency extraction/registration so unsupported formulas do not leave misleading active edges; rollback/event checks if rejection occurs during a transaction. No changes are authorized here. | Formula metadata/version selection and persistence/import/export boundaries, parser/evaluator/extractor dispatch, Worksheet registration, and migration handling. This is the broadest source boundary and may implicate serialization APIs. No changes are authorized here. |
| Migration and persisted data | Decide whether existing formulas containing `$` that currently yield `#NAME?` begin calculating after upgrade, whether recalculation is automatic, and how cached/display results are treated. Preserve source formula text unless an explicit rewrite is approved. | Define how existing stored dollar-marked formulas behave after rollout: remain stored with a stable error, be rejected on edit, or undergo an explicit migration. Do not silently drop dependency edges or rewrite formulas. | Requires a versioned migration plan for existing and newly written formulas, persistence compatibility, default version for old workbooks, and behavior when a newer file is opened by older software. Decide whether migration is explicit, automatic, reversible, or prohibited. |
| Required authority | Designated formula/API contract authority; Workbook/Worksheet/API concurrence if required by the formal designation. A separate implementation authorization is required after contract approval. | Same authority. The owner must choose both the restricted grammar and unsupported-input behavior. Separate implementation authorization is required. | Formula/API authority plus the owner of workbook/document persistence and compatibility policy; Workbook/Worksheet/API concurrence as designated. Separate implementation authorization is required. |

### F1 — direct acceptance tests required after approval

1. For each of the four spellings, verify parse result, calculated value, formula text, and exactly matching precedent/dependent edges in an ordinary cell.
2. Change each referenced precedent and verify the expected dirty/recalculation result. Replace and clear each formula and verify old-edge removal, new-edge registration, and graph cleanup.
3. For mixed/absolute markers, test copy/fill or another reference-transforming operation only if that operation is explicitly included in the approved contract; verify each `$` lock independently.
4. Submit formulas at a merge anchor and a non-anchor. Verify the selected origin rule, stored formula text, effective storage coordinate, graph target, recalculation, and requested-address event provenance.
5. Exercise supported formulas through the authorized standalone and Workbook-owned paths separately. Owner-view cached-value masking remains in force unless separately changed by an approved contract.
6. Inject an authorized formula/graph failure and verify atomic state, dependencies, events, and health under Journal and Snapshot where those transaction paths are in scope.
7. Keep cross-sheet evaluation and XLSX round trips outside the local F1 claim until the D6-06 evidence/decision gate is satisfied.

### F2 — direct acceptance tests required after approval

1. Verify every accepted plain-A1 form evaluates and extracts the same literal dependency.
2. For each dollar-marked form, assert the chosen boundary exactly: either write-time rejection with no cell/graph/event mutation, or retained formula with the specified deterministic evaluation result and explicitly defined dependency treatment.
3. Verify formula replacement and clear remove any prior edges, and that a rejected/unsupported formula cannot leave stale dependencies or trigger unrelated recalculation.
4. Repeat at an ordinary cell and merged anchor/member using the separately selected origin rule; confirm event address and storage coordinate semantics.
5. Verify the unsupported-input contract through each authorized public formula path and test Journal/Snapshot rollback if the decision permits transactional writes before rejection.

### F3 — direct acceptance tests required after approval

1. Verify explicit version selection and that legacy formulas keep the legacy grammar/result behavior while newer-version formulas follow the approved expanded grammar.
2. Verify version persistence and round trips through each included save/load/import/export format; verify old files receive the approved default without guessing from formula contents.
3. Test mixed-version workbooks, formula replacement, recalculation, dependency extraction, merged-member origin, and any version migration for both versions.
4. Verify downgrade/older-reader behavior and ensure unsupported versions fail explicitly without silently changing formulas or graph state.
5. Verify migration atomicity, rollback, events, and cached/display result policy under the approved transaction and persistence contracts.
6. Keep XLSX cross-sheet behavior specifically gated by D6-06; a local dialect version does not by itself establish cross-sheet identity or round-trip compatibility.

## Decision and authorization gate

No F1/F2/F3 decision or formal approval evidence is present in the reviewed PKG-14A/15A records or the authoritative contract clauses. The current exact approval state is therefore **PENDING OWNER DECISION**; no contract wording or disposition is changed by this report. The formal record must identify the designated authority, scope, decision text, approval channel, effective date, and any required Workbook/Worksheet/persistence-owner concurrence. Approval of a compatibility option is not implementation authorization.

Before implementation planning can be finalized, the owner must settle at minimum:

1. Supported formula grammar and deterministic result/error behavior for all four A1 spellings.
2. Whether `$` markers affect only transformations or also any other supported formula operation, with copy/fill semantics explicitly in or out of scope.
3. Reference origin for formulas entered through a merged non-anchor, including whether source text is rewritten and how graph targets correspond.
4. Whether the decision applies identically to standalone and Workbook-owned paths, while respecting current owner-view cached-value masking.
5. Treatment of existing formulas and cached/display values after a compatibility change.
6. Cross-sheet and XLSX scope, explicitly coordinated with D6-06 rather than assumed from local A1 support.
7. If F3 is selected, the version carrier, old-workbook default, persistence/migration and downgrade rules, and the authority for those compatibility choices.

The smallest next step is an attributable formula/API owner decision choosing F1, F2, or F3 and filling the option-specific unresolved points above. Only after that decision should a separate bounded implementation directive authorize the exact parser/extractor/Worksheet or persistence surface and its acceptance tests. Existing characterization remains useful as the before-state oracle; it does not authorize a production correction. Overall CS-002D4-R1 acceptance remains **WITHHELD**.
