# CS-002D4-R1 PKG-03A — D5 decision bundle

**Status:** decision preparation only. No D5 decision is newly approved; no package was transmitted.

This bundle consolidates the existing D5-01 Option C proposal and frames the unresolved D5-05 decision for an authorized owner. It preserves the current authoritative contract text.

## D5-01 — cross-level propagation interpretation

### Existing wording

The authoritative contract records:

> A committed mutation's observable events propagate Sheet → Workbook → Application.

The wording does not explicitly say whether the arrows describe propagation lineage or require every observer at a preceding event surface to finish before notification starts at the next surface. D5-02 requires committed events after commit; D5-03 covers listener failure isolation; D5-04 establishes deterministic registration order and failure reporting within a dispatch. Those clauses do not define a total callback order across separate event surfaces.

### Options retained from PKG-02G

| Option | Meaning | Compatibility and status |
| --- | --- | --- |
| A — Preserve current behavior while leaving interpretation open | Keep current event dispatch and do not decide what the arrows mean. | No behavior change, but the ambiguity remains. This is the current interim posture, not a clarification. |
| B — Strict observer-completion order | Require Sheet observers to complete before corresponding Workbook observers begin. | Changes observable Cell/Style callback timing and needs a separate compatibility/migration and implementation authorization. Do not implement without explicit owner direction. |
| C — Commit-boundary propagation | Read the arrows as propagation lineage. Observers see committed state; each surface applies its own documented dispatch rules; cross-surface callback completion order is unspecified unless an operation-specific contract says otherwise. | Recommended for compatibility with current tested behavior and D2-08/D5-02, but remains a proposal pending authorized D5-01 owner approval. |

### Option C wording submitted for decision

> Sheet → Workbook → Application describes the propagation lineage of committed observable mutation events. It does not require all observers at a preceding layer to finish before notification begins at the next layer. All observers of a committed transaction see state after its commit point. Within each event surface, dispatch follows its documented ordering and listener-failure isolation rules. Relative completion order between observers registered through different event surfaces is unspecified unless an operation-specific contract explicitly requires otherwise.

This wording is the existing PKG-02G proposal. It is **not approved** by PKG-03A. The original D5-01 wording remains unchanged in the authoritative contract. PKG-02G-C compatibility results are implementation evidence, not owner authorization.

## D5-05 — Application event authority and schema decision map

The authoritative contracts identify D5-05 as an unresolved blocker: the Core Workbook bridge does not establish Application-level event authority or stable Application event names/payloads. The following map separates product/business authority choices from questions engineering can investigate. The map proposes no answers.

| Decision question | Decision class | Required owner input or engineering evidence |
| --- | --- | --- |
| Which host/application component is the authoritative publisher or router? Is Application propagation required for all committed mutation events, a defined subset, or none in the current compatibility line? | Business/product authority, informed by engineering reachability | Owner must set authority boundary and operation coverage. Engineering can inventory current Workbook/host bridges and reachable consumers; source reachability cannot decide product authority. |
| Which consumers are compatibility commitments, and may existing React/host callbacks be adapted or deprecated? What release/migration window is acceptable? | Business/product and release authority | Owner must define compatibility promise and migration policy. Engineering can enumerate callers, payload consumers, and mechanical migration options. |
| Who owns forwarding and subscription lifecycle: Workbook, host adapter, framework wrapper, or another application service? | Joint contract and architecture decision | Owner assigns authority and ownership boundary; engineering traces current publishers, bridges, disposal behavior, duplicate-delivery risks, and framework adapters. |
| What is the stable event vocabulary, versioning policy, and typed payload shape for each authorized operation? | Owner approves normative public schema; engineering proposes evidence-backed alternatives | Engineering can map existing Cell/Style and row/column event names, payloads, frequency, target identity, stage order, and data already available. Owner decides names as compatibility commitments and whether schema evolution is additive/versioned. |
| Are Workbook events forwarded one-for-one, grouped, or transformed at the Application boundary? How are formulas and multi-operation transactions represented? | Business semantics plus engineering feasibility | Owner decides observable granularity. Engineering maps current staged event multiplicity, formula value/formula notifications, ordering constraints, and representable provenance. |
| What are listener error, reentrancy, and disposal guarantees at the Application surface? | Contract decision informed by existing D5-03/D5-04 and D0 | Owner chooses whether Application observers inherit existing isolation/reentrancy semantics or require additional guarantees. Engineering evaluates viable dispatch/queue integration and lifecycle consequences. |
| What migration and deprecation mechanics apply to existing host callbacks or event names? | Product/release authority | Owner approves compatibility window, aliases, deprecation, and breaking-change treatment; engineering inventories affected APIs and proposes staged implementation/test steps. |

### Engineering questions that can proceed without choosing the contract

The following are investigation tasks, not decisions: inventory all current event publishers and first-party consumers; trace reachability from Worksheet through Workbook to React/host callbacks; document event names, payload fields, frequency and staging order for the seven authorized operations; identify duplicated/omitted delivery and disposal/reentrancy behavior; and estimate implementation/test/migration options. Such investigation must not add a bridge or imply owner approval.

### Business/owner questions that source review cannot answer

Source code cannot establish which layer is contractually authoritative, which event names/payloads are public commitments, which consumers must remain compatible, what migration window is acceptable, whether forwarding is required for all operation families, or who can approve those choices. These require designated decision authority and an attributable decision record.

## Proposed contract-maintenance procedure after valid approval

This is a governance procedure proposal for the authorized owner/contract maintainer; it does not itself authorize editing the contract.

1. **Verify authority and channel.** Attach the leadership designation, authority basis/delegation scope, required concurrence, and approved durable decision channel to the decision record.
2. **Capture the decision verbatim.** Record approve/reject/defer, exact normative text (or exact rejection/alternative), scope, rationale, compatibility boundary, effective date, and decision/change-control identifier. Preserve dissent and conditions.
3. **Resolve dependencies.** For D5-01, state whether A, B, or C is selected. For D5-05, settle authority, operation coverage, ownership, names/payload schema, listener/lifecycle rules, and migration prerequisites. Do not treat D5-01 approval as D5-05 approval.
4. **Make a controlled authoritative-contract update only after approval.** The authorized maintainer updates the applicable D5 clause and provenance/status metadata, links the decision record, and describes superseded wording. Do not rewrite historical evidence, manifests, frozen registers, or implementation dispositions.
5. **Reconcile downstream artifacts.** Update the contract gap/decision records and identify which existing plans/tests are affected. Mark implementation readiness separately; an approved contract is not an implementation authorization.
6. **Obtain a separate bounded implementation authorization.** Define API/schema/migration scope, affected operation families, rollback/compatibility plan, and tests. Implement and verify only after that gate.

If the owner defers, preserve the existing text and pending status, record the responsible authority and prerequisite/date, and do not infer approval from silence or test results.

## Decision-record fields required

```text
Decision ID and clause:
Decision: APPROVE / REJECT / DEFER
Exact approved wording or required alternative:
Owner name and role:
Authority/delegation basis and scope:
Required concurrence:
Approved durable decision channel and record reference:
Decision date / effective date:
Compatibility scope and migration conditions:
Rationale, limitations, and dissent:
Contract-maintenance change reference:
Separate implementation authorization reference (if later issued):
```

No authorized owner, authority basis, approved channel, or response was available in the reviewed records for this workstream. The D5-01 Option C submission remains request-ready but untransmitted; D5-05 remains unresolved.
