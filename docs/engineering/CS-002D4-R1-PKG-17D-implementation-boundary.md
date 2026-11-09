# CS-002D4-R1 PKG-17D — Formula and Pivot implementation boundary

**Purpose:** Specify bounded implementation seams and acceptance evidence for the characterized formula compatibility gap and Workbook-owned Pivot integration.
**Evidence basis:** PKG-16C formula compatibility decision boundary, PKG-16D seven-suite migration gate, and PKG-11C Pivot lifecycle proposal.
**Status:** Design/readiness specification only. No formula option, Pivot API, DTO, contract, or implementation is approved here.
**Changes and verification:** Documentation only; no source, tests, API declarations, or contracts changed; no tests run.
**Overall CS-002D4-R1 acceptance:** WITHHELD.

## Current evidence that constrains the boundary

PKG-16C characterizes the standalone `Worksheet` formula path: plain `E5` evaluates, while `E$5`, `$E5`, and `$E$5` currently return `#NAME?`; the Worksheet-local dependency extractor nevertheless records all four as literal E5 dependencies. Formula text entered through a merged non-anchor is stored at the anchor without rewriting, and the current edge remains tied to the literal reference coordinate. These are before-state observations, not selected compatibility behavior. No cross-sheet formula behavior is established.

PKG-16D records seven blocked Workbook Pivot suites: six compile failures and one `pivot-formula-integration.test.ts` fixture-setup failure affecting 18 cases. No intended Workbook Pivot assertion in those suites ran. Existing standalone engine, recompute, snapshot-store, and GetPivotData tests cover component behavior, but cannot demonstrate Workbook-owned registration, source invalidation, detached read, or formula behavior over Workbook Pivot state. Current `createPivot()` and `deletePivot()` reject as unavailable; private registry/store access and post-publication `addSheet()` are not migration routes.

These facts define two distinct implementation problems: (1) formula grammar/reference interpretation and graph consistency; (2) a proposed Workbook-owned Pivot lifecycle/read surface. Workbook Pivot formula integration sits downstream of both and remains blocked by D3-06.

## Boundary 1 — Local formula compatibility

### Authorized source boundary after a separate contract decision

The implementation boundary must follow the option selected in PKG-16C and must keep parse/evaluate/reference extraction aligned:

| Contract choice | Minimum production seam | Minimum acceptance evidence | Explicit exclusions unless separately selected |
| --- | --- | --- | --- |
| **F1 — support dollar-marked A1** | Shared token/parser representation consumed by evaluator and dependency extraction; Worksheet formula write/replace/clear graph integration. Preserve row/column lock bits in tokens. | Plain/mixed/absolute four-form matrix for parse, value, unchanged/stated formula text, precedent/dependent edges; precedent edits; replace/clear edge cleanup; merged-origin tests under the independently selected rule; Journal and Snapshot failure behavior where formula writes participate. | Copy/fill/rewrite transformation semantics, cross-sheet references, XLSX round trips, Workbook-owned formula visibility, and Pivot integration. `$` lock bits alone do not authorize copy/fill behavior. |
| **F2 — retain restricted syntax** | A single explicit validation/error boundary for the three currently unsupported spellings, plus graph registration/cleanup consistent with that decision. If rejected on write, reject before cell, graph, event, or transaction state changes; if accepted but unsupported at evaluation, specify deterministic result and dependency treatment. | Plain references remain evaluator/extractor consistent; each dollar form exercises the selected write-time rejection or evaluation-time result; assert no misleading live edge, stale edge after replace/clear, and no partial mutation on rejection. | New A1 support, silent formula rewrite, cross-sheet evaluation, and copy/fill anchoring. |
| **F3 — versioned compatibility** | Formula-version carrier and dispatch through parser, evaluator, and extractor, plus workbook persistence/import/export and migration behavior. | Old/new versions in one workbook; version selection/defaulting; formula replacement and graph consistency; persistence round trips; migration, downgrade, and older-reader behavior. | Any partial implementation that stores a version without matching parser/evaluator/extractor/persistence rules. Cross-sheet/XLSX semantics remain separately gated by D6-06. |

The accepted boundary should not duplicate a regex in the evaluator and an independent scanner in the extractor. The requirement is semantic consistency: every accepted reference token resolves and creates the same dependency; a rejected/unsupported token must not leave an edge implying successful support. The current tests provide a before-state oracle but do not select F1, F2, or F3.

### Independent merged-formula origin decision

F1/F2/F3 does not decide reference origin when a formula is entered through a merged non-anchor. Before touching formula storage/extraction for this case, the contract must select whether references are interpreted literally from submitted text, rebased from the requested member, rebased from the effective anchor, or handled by another explicit rule. The chosen rule must jointly define submitted address, effective storage address, formula text transformation, graph target, recalculation result, and event address. D7-01–D7-04 concern merged reads/anchor storage and do not settle this formula-entry rule; D7-05 remains a distinct merged-read DTO blocker.

Minimum tests, after approval: run the selected reference matrix at ordinary cells and at an anchor/non-anchor pair; assert formula text, effective stored cell, exact graph edge, recalculated value, and requested-address event provenance. Do not add copy/fill tests unless that operation's lock semantics are included in the decision.

## Boundary 2 — Workbook-owned Pivot lifecycle/read

The smallest proposed integration is the PKG-11C narrow owner facade, not public registry, snapshot-store, dependency-index, anchor-index, recompute-engine, or group-state access. An implementation directive would need to activate only the exact approved methods. The PKG-11C candidate uses a same-Workbook source identity (`WorkbookSheetView` and/or immutable `WorksheetId`), Pivot creation after complete initial build, coherent detached read/status, and explicit refresh. `Workbook.create({ sheets })` supplies all initial sheets; the seven existing transaction operations remain the only cell/dimension mutation operations.

| Slice | Minimum behavior to implement only after approval | Required observable acceptance evidence |
| --- | --- | --- |
| **P1: owner creation and first publication** | Validate Workbook liveness and source identity; use owner-private Worksheet access; build and validate first snapshot before exposing a fresh registered Pivot; no caller-visible residue after failed create. Configuration detachment/accepted values must be explicit, including `CalculatedValueSpec.compute` callback handling. | Create against same-Workbook source; reject foreign/unknown source without registry/readable snapshot residue; verify first snapshot and status only after successful publication; inject an approved failure point and prove no discoverable partial Pivot. |
| **P2: detached read/status and source invalidation** | Publish a coherent detached snapshot/status observation; source writes through existing `transact()` make the Pivot stale/advance the approved generation only after commit; preserve WorkbookSheetView read-only masking. | Repeat-read isolation; mutate returned nested data and show later reads unchanged; commit relevant and unrelated/no-op writes; observe only the approved freshness/result change. Do not assert private dirty flags or global cross-layer observer order. |
| **P3: refresh/failure/disposal** | Implement only the approved manual/automatic policy, last-good retention, stale/failure representation, and disposal fence. Do not place Pivot creation/configuration/refresh into the seven-operation D2 transaction as an eighth write. | Explicit refresh or approved lazy-read behavior; failed refresh preserves last-good result and reports approved state/error; transaction stays committed; retry publishes a validated result; disposed Workbook rejects lifecycle calls and prevents late publication. |

The legacy suite migration is then contract-driven: partial recompute and sanity assertions use public result/generation behavior while internal accumulator checks stay component-level; snapshot integration uses public creation/read/refresh rather than store pokes; invalidation bridge tests use committed transactions rather than internal index inspection; slicer owner tests require an explicitly approved update operation; anchor and persistence assertions remain separate if excluded. See PKG-16D's per-suite mapping for the exact seven-suite replacement plan. No cast to mutable `Worksheet`, private-state access, test-only accessor, or unsupported post-publication `addSheet()` may be used to make legacy suites compile.

## Downstream boundary — Pivot formulas and error values

`queryPivotData()` / GETPIVOTDATA integration must not be implemented or tested as a stale-data contract until **D3-06** defines formula behavior when the last successful Pivot snapshot is stale. That decision must state whether formula consumers receive the stale value, a spreadsheet error, or another result and how freshness is surfaced. The object read contract (`snapshot` plus status) does not implicitly decide formula result semantics.

An independent detached-value decision is required before a public Workbook Pivot read is expected to preserve Error fields. Standalone evidence shows Error identity/prototype/name/message survive the in-process calculation → transform → store → query route. It does not prove detached Workbook DTO fidelity: generic `detachReadonly()` copies enumerable object fields, while standard Error `name` and `message` are non-enumerable. The owner must select a stable spreadsheet-error DTO or an immutable Error-compatible representation, define exact fields and compatibility, and test repeat-read isolation. Snapshot cell Errors and status `lastError` are separate values and need separate shape rules. This DTO choice does not resolve D3-06.

Once these prerequisites are decided, the smallest downstream integration test should create a Workbook Pivot through the approved facade, produce a known Pivot value, query it through the approved formula route while fresh, then independently test the approved stale policy. If an Error-valued row is in scope, verify its selected DTO and isolation separately. Do not use a test-only route to seed the private Workbook store.

## Dependencies and remaining decisions

| Decision/prerequisite | Needed for | Current state/effect |
| --- | --- | --- |
| Formula owner selects F1, F2, or F3, including deterministic unsupported-dollar behavior and existing-formula treatment | Any formula parser/evaluator/extractor correction | **Pending.** No compatibility option is approved by PKG-16C. |
| Formula owner selects merged-member reference origin and storage/text/graph/event rules | Formula implementation touching merged-member references | **Pending and independent** of the F-option choice. |
| Workbook/API owner approves minimum Pivot lifecycle facade, source identity, config/callback rule, first-publication failure semantics, sync/async shape, and initial supported operations | P1 creation/read integration | **Pending proposal.** Current `createPivot()` remains unavailable; no internal accessor substitute. |
| D3-01 manual default reconciliation with current lazy-refresh read behavior; D3-05 status vocabulary, generation/read coherence, and failure/error metadata | P2/P3 observable semantics | D3-01 is owner-approved with manual default, but its interaction with lazy reads remains unresolved; D3-05 has delegated engineering questions identified in PKG-11C. |
| D3-06 stale-snapshot formula result policy | GETPIVOTDATA/query integration when stale | **Unresolved direct blocker.** Fresh snapshot query testing need not define stale behavior. |
| Detached Pivot Error value DTO and separate status `lastError` shape | Error-valued detached snapshots/status | **Unresolved.** Standalone Error identity tests are not this contract. |
| D6-06 cross-sheet/XLSX formula behavior | Cross-sheet grammar, identity, import/export | Separate prerequisite; excluded from local A1 slice. |
| Slicer mutation, anchor/destination lifecycle, snapshot persistence, deletion, or new events | Only the respective legacy assertions if retained | Not included in minimum facade by implication; each needs explicit scope. D5-05 Application forwarding remains unresolved and is unnecessary for this proposal. |

No formal contract status changes are made by this specification. The known D3-02/03/04 requirements remain: failed refresh retains the last successful result, stale/failure is observable, and an automatic refresh failure does not roll back a committed source edit. Their concrete DTO, timing, and generation semantics still must follow the approved D3-05/facade decisions. D5-01 does not establish global cross-event-surface completion order; no new Workbook/Application event is required for the minimum read facade.

## Recommended implementation order after authorization

1. **Contract closure:** record the formula option and merged-origin rule; record the minimum Pivot facade and D3-01/D3-05 read/refresh semantics; decide detached Error DTO if Error values are included; resolve D3-06 before any stale formula assertion. These are scoped decisions, not a general owner survey.
2. **Formula-local slice:** implement the selected parser/evaluator/extractor/Worksheet boundary and its formula/merge/rollback tests. Keep cross-sheet/XLSX and unapproved copy/fill out. This slice can proceed independently of Workbook Pivot lifecycle once its own formula decisions are approved.
3. **Pivot P1/P2 slice:** implement owner registration, first publication, detached coherent read/status, and committed-source invalidation using initial Workbook sheets and the existing seven-operation transaction port. Migrate only the corresponding non-formula portions of the seven blocked suites; keep internals in component tests.
4. **Pivot P3 and formula integration:** add refresh failure/retry/disposal guarantees under the approved D3 semantics. Add GETPIVOTDATA/stale-result tests only after D3-06; add Error DTO assertions only after value-shape approval.
5. **Migration and integrated verification:** update each legacy suite without weakening its supported intent; split unsupported assertions into component tests or mark their separate prerequisite. Re-run focused selections and the serialized Core diagnostic without excluding the seven legacy Pivot suites; classify compile/setup/assertion outcomes distinctly.

This order is a proposed dependency map, not an implementation authorization. No source/test/API edit, contract promotion, ledger change, new D2 operation, Workbook-owned Pivot enablement, or acceptance-baseline change is authorized here. Overall CS-002D4-R1 acceptance remains **WITHHELD**.
