# CS-002D4-R1 PKG-07C — Authorization decision

**Decision: DEFERRED — AUTHORIZED DECISION CHANNEL AND OWNER RESPONSE NOT ESTABLISHED**

**Scope:** Governance status for the existing PKG-04C consolidated C1–C5 owner-decision request. This record reuses prior authority evidence; it does not repeat the broad owner search, route or transmit the request, appoint an owner, or authorize implementation.

## Decision basis

The PKG-04C consolidated request is explicitly marked request-ready and not transmitted. Its companion authorization-status record says that no named, scoped Workbook/API, Worksheet/API, or D5 authority designation, sufficient delegation record, approved response channel, or attributable owner response is established in the reviewed repository evidence. The PKG-02G-D authority review independently records that the D5-01 owner and amendment authority are not verifiable and that its proposed Option C submission was not sent because no authorized recipient or channel was established.

The existing records identify **project leadership** as the accountable authority at the role level for establishing decision authority. They do not identify a named individual, an approved channel, a delegation instrument, or a deadline. No person is appointed or inferred by this decision.

## C1–C5 status

| Request item | Current decision state | Boundary |
| --- | --- | --- |
| C1 — Designate Workbook/API, Worksheet/API, and D5 decision authority | **DEFERRED** | Requires attributable leadership designation, scope, authority basis, concurrence requirements, and approved durable channel. |
| C2 — D5-01 cross-level ordering | **PENDING OWNER DECISION** | Option C remains an engineering proposal. Authoritative wording and disposition remain unchanged. |
| C3 — D5-05 Application event authority and schema | **UNRESOLVED; SEPARATE DECISION** | Not decided by any D5-01 outcome. No Application forwarding or schema change is authorized. |
| C4 — One-comment deletion contract | **DEFERRED** | Requires the applicable Workbook/API and Worksheet/API owner decisions on semantics and evidence gaps; technical readiness is not contract approval. The missing-ID cascade behavior below is an exact open question. |
| C5 — One-comment deletion implementation | **NOT AUTHORIZED** | Requires established authority, applicable attributable contract decisions, and a separate explicit bounded implementation authorization. No eighth mutation operation is authorized. |

This is a governance deferral, not rejection of the proposed comment operation or approval of any technical option. PKG-05/06 evidence does not supply missing authority: user review, passing tests, and technical readiness are not owner designation or implementation authorization.

## C4 exact question: missing target with orphan descendants

Lane A's source review of `Worksheet.deleteComment` in `packages/core/src/worksheet.ts` identifies a conflict with PKG-04A's broad missing-ID statement. When a cell has a nonempty comment collection, the implementation seeds its deletion set with the requested `commentId` without first checking for a matching comment record. With reply deletion enabled, it then adds records whose `parentId` matches that ID and filters the collection. Consequently, if no target record exists but orphan descendants reference the requested ID, those descendants may be removed; the method can report an effective deletion and emit `comment-deleted`. This means a missing ID is not necessarily a no-op. The empty-cell or absent-collection early return remains distinct.

This is a description of current standalone behavior and an evidence correction, not a finding that the implementation is defective and not an approved Workbook contract. C4 must explicitly choose between:

1. **Standalone-compatible cascade:** preserve the existing cascade behavior, including removal of orphan descendants under a missing requested ID; or
2. **Workbook-specific existence precheck:** require a matching target record before cascading, making a missing target a no-op even if orphan descendants reference its ID.

The applicable owners must decide the compatibility rationale, observable return/no-op result, and Worksheet/Workbook event behavior for the selected case. No choice is made here; C4 remains deferred pending authorized, attributable decisions.

## Next condition

Project leadership must first provide an attributable decision-owner designation and approved response channel for each relevant scope, or issue an attributable deferral identifying the responsible authority, unmet prerequisite, and decision/review date. Only then may the existing C1–C5 request be routed through that approved channel. Record the resulting decisions with their authority basis and effective date. Any implementation requires its own explicit authorization after the applicable contract decisions.

Until that condition is met:

- D5-01 remains pending; Option C remains proposed and the authoritative contract remains unchanged.
- D5-05 remains a separate unresolved contract question.
- No comment deletion production implementation, Workbook API change, event forwarding, mutation-operation expansion, or change to the Journal strategy is authorized.
- No external transmission, owner response, or formal approval is claimed.

PKG-04C supplies the consolidated request and its authorization status; PKG-02G-D supplies the specific D5-01 authority finding; PKG-05C and PKG-06C confirm that subsequent technical and integration reviews did not establish owner authority or approval. The C4 source conflict is recorded as a question for an authorized owner, not as a contract decision. This update performs no broad authority search and changes no production source, tests, authoritative contract, ledger, frozen register, or historical manifest.

Overall CS-002D4-R1 acceptance remains **WITHHELD**.
