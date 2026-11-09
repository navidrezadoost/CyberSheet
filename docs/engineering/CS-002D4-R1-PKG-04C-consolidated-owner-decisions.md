# CS-002D4-R1 PKG-04C — Consolidated owner-decision request

**Status:** Request-ready; not transmitted. No owner decision or production authorization is recorded by this document.

**Purpose:** Provide one actionable, consolidated request for the authority and contract decisions that gate the proposed Workbook-owned one-comment deletion operation. It consolidates existing governance evidence; it does not repeat the ownership search or replace the authoritative contract.

## Baseline and evidence boundary

At PKG-04C lane start, Git HEAD was `88b09634f17f3b39d88a88c5428f76b426459a2b` and the shared worktree had 398 dirty paths. Existing work was preserved. PKG-04C is documentation-only: no source, test, contract, ledger, register, or historical manifest change is authorized here.

The existing governance finding is **AUTHORITY UNVERIFIED — ESCALATION REQUIRED**. `CS-002D4-R1-authoritative-contracts.md` records that a project-owner role approved the original D0–D7 choices, while also stating that the repository snapshot contains no separately signed decision record, named-owner designation, or authority basis. PKG-02G-D found no named and scoped D5-01 owner, D5-01 delegation, approved decision channel, or owner response. PKG-03A consolidated the same finding and recorded the Workbook/API and Worksheet/API designation requests as locally prepared and unsent. This package relies on those findings and makes no new authority inference from authorship, commits, repository access, or ordinary review. PKG-04A's source-grounded comment contract and exact-state proposal are now available as technical inputs; they do not change the authority or approval status recorded here.

Relevant evidence:

- `docs/engineering/CS-002D4-R1-authoritative-contracts.md` — D5 clauses, provenance and status labels; D2-08 publication boundary; D2-11 inventory status.
- `docs/engineering/CS-002D4-R1-PKG-02G-D-owner-authority.md` and `...-decision-submission.md` — D5-01 authority gap and untransmitted Option C submission.
- `docs/engineering/CS-002D4-R1-PKG-03A-governance-and-authority.md` and `...-D5-decision-bundle.md` — consolidated owner scopes, D5-01 alternatives, D5-05 question map, and contract-maintenance boundary.
- `docs/engineering/CS-002D4-R1-PKG-03B-operation-priorities.md` and `docs/engineering/CS-002D4-R1-PKG-03R-integrated-readiness.md` — one-comment deletion as a bounded candidate, not an authorization.
- `CS-002D4-R1-PKG-04A-comment-operation-contract.md`, `...-exact-state-and-rollback.md`, and `...-event-and-side-effect-matrix.md` — current source-grounded proposal and explicit remaining metadata-graph prerequisite.

## Consolidated request to project leadership and designated contract owners

Please return one attributable decision record covering C1–C5 below. The same person may hold more than one authority, but each scope and decision must be explicit. If the recipient is not authorized for a requested scope, please identify the responsible authority or record a formal deferral; do not treat routing this request as designation or approval.

### C1 — Designate decision authority

Identify the authorized person or role for each scope, with a traceable authority/delegation basis and approved durable response channel:

1. **Workbook/API:** Workbook mutation-port and transaction API contracts, including the proposed comment operation and any Workbook lifecycle effects.
2. **Worksheet/API:** Worksheet comment storage, identity, deletion behavior, and Worksheet event compatibility.
3. **D5 contracts:** authority to interpret or amend D5-01 and separately decide D5-05 Application-level event authority/schema. State any required joint concurrence between product, Workbook/API, Worksheet/API, or release authorities.

For each designation, record: owner name and role; decision scope and exclusions; authority/delegation source and limits; required concurrence; approved submission and response channel; effective date; and, if deferred, the responsible authority, unmet prerequisite, and decision/review date.

### C2 — Decide D5-01 cross-level ordering

The authoritative wording remains: “A committed mutation's observable events propagate Sheet → Workbook → Application.” The unresolved question is whether the arrows express propagation lineage or require all Sheet observers to finish before Workbook notification begins.

Choose one outcome:

- **A — Retain current behavior and leave interpretation open.** No behavior change; ambiguity remains.
- **B — Require strict observer-completion order.** Sheet observers must complete before the corresponding Workbook observers begin. If selected, identify the required compatibility/migration conditions. This choice has a separate implementation dependency and is not implemented or authorized by this request.
- **C — Clarify commit-boundary propagation (engineering recommendation, not preselected approval).** Adopt the following proposed wording, or return an exact alternative:

  > Sheet → Workbook → Application describes the propagation lineage of committed observable mutation events. It does not require all observers at a preceding layer to finish before notification begins at the next layer. All observers of a committed transaction see state after its commit point. Within each event surface, dispatch follows its documented ordering and listener-failure isolation rules. Relative completion order between observers registered through different event surfaces is unspecified unless an operation-specific contract explicitly requires otherwise.

The PKG-02G-C compatibility tests are implementation evidence for the tested behavior; they are not owner approval. Until an attributable decision is recorded and the authorized contract-maintenance procedure is completed, D5-01 stays at its existing disposition and the authoritative wording stays unchanged.

### C3 — Decide D5-05 separately

D5-05 concerns Application-level event authority and stable event names/payloads. It is a distinct contract decision from D5-01, and approval of C2 does not approve C3. Please decide whether Application-level forwarding is required, for which operations, and which component owns publication/routing and subscription lifecycle. Specify the compatibility commitments, stable names and typed payload/versioning policy, event granularity, listener-error/reentrancy/disposal expectations, and migration/deprecation rules—or explicitly defer each undecided element with an accountable authority and date.

No Application bridge, event schema, or forwarding behavior is authorized by this request. Source reachability or existing Workbook event behavior cannot decide product-level event authority.

### C4 — Approve the one-comment deletion contract

Review the final source-grounded PKG-04A specification and decide whether the bounded initial contract is acceptable. The proposed API shape is:

```ts
workbook.mutationPort.deleteComment(sheet, address, commentId): Promise<void>;

workbook.transact((tx) => {
  tx.deleteComment(sheet, address, commentId);
});
```

The proposed initial operation fixes reply cascade to `deleteReplies = true`. This is a candidate API, not a final contract until the applicable owners approve it. Explicitly decide:

- exact comment identity and lookup scope;
- behavior when the comment ID is missing, the cell is empty, or the comment collection is absent;
- parent-comment deletion and reply cascade (including whether deleting a reply independently is in scope);
- return type and no-op behavior, including whether a no-op publishes anything;
- compatibility with the existing Worksheet `comment-deleted` and Workbook `comment-delete` events, including payload/frequency and commit-only publication;
- any required preservation of comment/reply ordering and exact sparse state on rollback.

Do not approve semantics that conflict with the PKG-04A source evidence or the approved D5-02/D5-03/D5-04 clauses. If the technical evidence is incomplete, record the exact unanswered item rather than infer behavior. C4 is contract approval only; it does not authorize implementation.

### C5 — Make a separate implementation authorization decision

After C1 is established and the applicable C2–C4 outcomes are attributable, issue a separate explicit decision to **AUTHORIZE**, **REJECT**, or **DEFER** implementation of the one-comment Workbook mutation. If authorized, state the bounded scope and acceptance conditions, including:

- API surface and fixed reply-cascade behavior;
- whether this is an eighth transaction operation and how the existing seven-operation boundary is extended;
- required Journal and independent Snapshot before-images, exact rollback/fault-cut expectations, and recovery-required behavior;
- commit-only Worksheet/Workbook event behavior and approved no-op semantics;
- persistence, history, Application forwarding, and unrelated comment operations explicitly excluded;
- required tests, typecheck, sidecar protection, and review/approval record needed for completion.

Engineering readiness, passing tests, or approval of the API contract alone is not implementation authorization. The production strategy remains Incremental Journal unless a separate authorized decision changes it. No eighth mutation operation is added by PKG-04C.

## Response record requested

Please return one durable response in this form. Attach or cite the leadership designation and contract change-control record; if no approved channel is available, this request remains unsubmitted and pending.

```text
Response record ID / approved channel:
Decision date / effective date:

C1 — Authority designations:
Workbook/API owner, scope, basis, concurrence:
Worksheet/API owner, scope, basis, concurrence:
D5-01/D5-05 authority, scope, basis, concurrence:
Deferrals and accountable authority/date:

C2 — D5-01: A / B / C / alternate / defer:
Exact normative wording or required alternative:
Compatibility conditions and rationale:

C3 — D5-05: approve defined boundary / reject / defer:
Authority, operation coverage, owner, names/payloads, lifecycle and migration:

C4 — Comment deletion contract: approve / reject / defer:
API and return type:
Missing-ID / absent-state / reply-cascade / no-op behavior:
Event compatibility and rollback requirements:
Conditions or unresolved evidence:

C5 — Implementation: AUTHORIZE / REJECT / DEFER:
Exact scope, acceptance criteria, exclusions, and authorization reference:
Required review and effective date:
```

An explicit deferral must name the responsible authority, prerequisite, and decision date or review date. Silence, test results, or this request's preparation do not constitute approval.

## Governance boundary

This consolidated submission is prepared for routing only. It has **not** been transmitted because the repository evidence does not establish an authorized recipient or channel. It records no owner decision. D5-01 Option C remains proposed; D5-05 remains separate and unresolved; comment API semantics and production implementation authorization are separate decisions. The authoritative contracts, production code, tests, mutation-operation count, Journal default, ledger dispositions, frozen registers, and historical manifests remain unchanged.

Overall CS-002D4-R1 acceptance remains **WITHHELD**.
