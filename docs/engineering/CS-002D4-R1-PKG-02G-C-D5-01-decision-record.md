# CS-002D4-R1 PKG-02G-C — D5-01 decision record

**Status:** PENDING OWNER APPROVAL
**Preferred interpretation:** Option C — Commit-Boundary Propagation
**Authority evidence:** No named D5-01 contract owner response or approval record was available for this checkpoint. This engineering recommendation is not approval.

## Question

The authoritative contract says that committed mutation events propagate `Sheet → Workbook → Application`. It does not say whether this arrow specifies a propagation lineage or requires every observer at one layer to finish before any observer at the next layer begins. D5-02 places committed-change notifications after commit, and D5-04 specifies deterministic ordering within a dispatcher, but neither specifies a total callback order across Worksheet and Workbook event surfaces. The Application layer is separately unresolved by D5-05.

## Options considered

| Option | Meaning | Compatibility assessment |
| --- | --- | --- |
| A — Preserve current bridge behavior without clarification | Retain lazy Cell/Style Workbook bridges as Worksheet subscribers; preserve dimension event sequencing. | No timing change, but leaves the meaning of D5-01's arrow unresolved. It cannot be represented as proof of strict cross-level ordering. |
| B — Require Worksheet observer completion before Workbook notification | For each staged mutation, finish public Worksheet dispatch before sending the corresponding Workbook event. | Changes observable callback timing for Cell/Style consumers and requires a separate implementation and migration decision. It is unsupported absent an owner decision requiring strict order. |
| C — Define the arrow at the commit boundary | Treat the arrow as propagation lineage. Require notifications to observe committed state and preserve staging order and each dispatcher's documented listener ordering/failure isolation, while leaving completion order across event surfaces unspecified. | Matches existing behavior, D2-08's commit point, and D5-02's post-commit requirement without a timing migration. It does not establish Application forwarding or settle D5-05. |

## Proposed owner clarification

The following wording is submitted for the D5-01 contract owner's decision; it is **not approved**:

> Sheet → Workbook → Application describes the propagation lineage of committed observable mutation events. It does not require all observers at a preceding layer to finish before notification begins at the next layer. All observers of a committed transaction see state after its commit point. Within each event surface, dispatch follows its documented ordering and listener-failure isolation rules. Relative completion order between observers registered through different event surfaces is unspecified unless an operation-specific contract explicitly requires otherwise.

## Source and compatibility basis

- `docs/engineering/CS-002D4-R1-authoritative-contracts.md`, D5-01–D5-05 and D2-08: D5-01 names the propagation path; D5-02 makes publication post-commit; D5-03/D5-04 define listener isolation and per-dispatch dispatch behavior; D5-05 leaves Application authority and schema unresolved.
- `docs/engineering/CS-002D4-R1-PKG-02G-S-contract-options.md`: records A/B/C and identifies B's observable timing change and C's compatibility rationale.
- `packages/core/src/workbook.ts`: staged operations are applied before commit events are published. Cell/Style Workbook bridge callbacks are attached through Worksheet subscriptions; their relative position to other Worksheet observers follows subscription order. Dimension event publication follows its Worksheet event dispatch.
- `packages/core/src/worksheet.ts` and `packages/core/src/EventBus.ts`: Worksheet notifications and Workbook EventBus notifications have separate dispatch surfaces; listener errors are isolated according to their respective implementations.
- `packages/core/__tests__/workbook-cross-level-compatibility.p1-pkg-02g-c.test.ts` and the PKG-02D/E/F compatibility suites: exercise commit visibility, bridge activation orders, staging, dispatcher behavior, and disposal without asserting a universal cross-surface callback order.

## Boundaries and decision record

This proposal clarifies only D5-01's cross-level ordering interpretation. It does not establish Application event names, payloads, authority, or forwarding; those remain D5-05 matters. Global D2-11 remains unresolved beyond operation-specific closures. It does not decide the shared FIFO self-await limitation or the unrelated Pivot integration compilation blocker.

**Owner decision:** PENDING OWNER APPROVAL. No owner identity, authority basis, response, effective date, or approved contract-maintenance record was supplied. Keep the authoritative D5-01 text unchanged until the authorized owner decides and the contract-maintenance procedure is completed.
