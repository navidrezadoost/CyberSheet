# CS-002D4-R1 PKG-12C — Consolidated implementation decisions

**Status: PENDING — FORMAL OWNER DESIGNATIONS AND CONTRACT RESPONSES NOT ESTABLISHED**
**Scope:** Reconcile the existing contract and authorization records for Workbook Pivot lifecycle, Workbook comment deletion, D5-01/D5-05, and related blockers. This is a status consolidation, not a new authority search, submission, approval, or implementation authorization.
**Overall CS-002D4-R1 acceptance:** WITHHELD.

## Decision status

| Decision area | Current recorded status | What remains undecided or unauthorized |
| --- | --- | --- |
| Workbook/API and Worksheet/API decision authority | **AUTHORITY UNVERIFIED / DESIGNATION DEFERRED** | No attributable named owner, scoped delegation basis, required concurrence, and approved response channel is evidenced by the existing governance records. Project leadership has not supplied a durable designation or explicit deferral with an accountable authority and review date. |
| Workbook-owned Pivot lifecycle | **PROPOSAL FOR OWNER REVIEW; NO DECISION OR IMPLEMENTATION AUTHORIZATION** | PKG-11C proposes a narrow public Workbook facade and maps migration of seven legacy integration suites. No owner has approved that facade, its signatures, lifecycle, or the required compatibility rules. Existing `createPivot()`/`deletePivot()` declarations remain unavailable; no Pivot registry/store exposure, post-publication sheet creation, or transaction operation is authorized. |
| Workbook-owned comment deletion | **CONTRACT DEFERRED; IMPLEMENTATION NOT AUTHORIZED** | PKG-07C retains the PKG-04C decision request as untransmitted. The owners have not settled the API/return shape, missing-ID behavior with orphan descendants, cascade and duplicate-ID semantics, no-op/events, exact-address rollback, or merged non-anchor behavior. No eighth mutation operation is authorized. |
| D5-01 cross-level event ordering | **PENDING OWNER DECISION** | Option C (commit-boundary propagation) is a compatibility recommendation supported by PKG-02G-C characterization, not an approved clarification. The authoritative wording and disposition remain unchanged. |
| D5-05 Application event authority and schema | **UNRESOLVED — SEPARATE DECISION** | No authority, operation coverage, stable event names/payloads, forwarding owner, lifecycle, or migration policy is approved. D5-01 cannot settle D5-05. No Application forwarding is authorized. |
| D3-06 stale Pivot formula result policy | **UNRESOLVED-BLOCKER** | Decide whether formula reads may return a stale last-good Pivot result or must return a calculation error in automatic mode, and define the public result behavior. Object snapshot/status reads do not decide formula semantics. |
| D7-05 merged-read public DTO shape | **UNRESOLVED-BLOCKER** | Decide the backwards-compatible representation of requested address, effective address, and merge range. D7-02 is owner-approved; that approval does not settle the DTO shape or authorize a separate API change. |
| Global D2-11 transactional inventory | **UNRESOLVED-BLOCKER** | Complete operation-family coverage for all side effects before claiming global D2 completion. Operation-specific closures do not imply global closure. |
| Shared FIFO self-await behavior | **KNOWN LIMITATION; NO FIX AUTHORIZED HERE** | Existing queue evidence records that awaiting separately queued mutation-port work from inside its active transaction can self-await. This is distinct from the contract decisions above and remains outside these approvals. |

## Evidence reconciliation

This checkpoint reuses, rather than repeats, the existing authority investigation. The reviewed records are:

- `CS-002D4-R1-PKG-04C-consolidated-owner-decisions.md` — C1–C5 request, marked request-ready and not transmitted; no owner decision or implementation authorization recorded.
- `CS-002D4-R1-PKG-07C-authorization-decision.md` and `CS-002D4-R1-PKG-07R-authorization-and-readiness.md` — authority/designation remains deferred; comment contract questions remain open; implementation is unauthorized.
- `CS-002D4-R1-PKG-11C-pivot-lifecycle-contract.md` — source-grounded Pivot facade proposal and blocked-suite migration map, explicitly proposal-only.
- `CS-002D4-R1-PKG-02G-D-owner-authority.md`, `...-decision-record.md`, and `...-final-disposition.md` — no verifiable D5-01 owner, delegation, approved channel, or response; Option C was not transmitted and the authoritative contract was not changed.
- `CS-002D4-R1-PKG-03A-governance-and-authority.md` and `CS-002D4-R1-authoritative-contracts.md` — authority gap and the recorded statuses of D2-11, D3-06, D5-05, and D7-05.

PKG-11's Core run improved the diagnostic count but did not clear the Pivot integration gate: six Pivot suites were compile-blocked by unavailable/internal lifecycle assumptions and one suite had fixture-setup failures from unsupported post-publication sheet creation; no intended Pivot assertions ran in those cases. Standalone Pivot tests do not demonstrate Workbook-owned integration. The available evidence likewise does not convert comment transaction-model tests or passing prior package tests into owner-approved semantics or production authorization.

The repository records a role-level statement that the project owner approved the original D0–D7 choices, but the governance records say there is no separately signed decision record, named-owner designation, or authority basis in the reviewed snapshot for these new decisions. No authority is inferred from code authorship, repository access, user review, passing tests, or prior acceptance of documentation. No request was transmitted and no response or approval is claimed by this consolidation.

## Required leadership action

Project leadership must issue a durable, attributable designation—or an explicit dated deferral—for each applicable decision scope:

1. **Workbook/API owner:** Workbook Pivot lifecycle and mutation/transaction API contracts, with explicit scope and exclusions.
2. **Worksheet/API owner:** comment storage/deletion and Worksheet event compatibility, with explicit scope and exclusions.
3. **D5 decision authority:** D5-01 interpretation and, separately, D5-05 Application event authority/schema. State whether joint concurrence is required.

Each designation must identify the owner name and role, authority/delegation basis and limits, decision scope, required concurrence, approved durable submission/response channel, and effective date. If deferred, name the responsible authority, unmet prerequisite, and decision or review date. Once the channel is established, route the existing PKG-04C and D5-01 materials through it; this document does not send them.

The designated owners should return attributable decisions with exact approved wording and scope. For Pivot, resolve the PKG-11C owner-decision list, including source identity, first publication/failure behavior, refresh semantics and D3-05 details, configuration/deletion scope, disposal, and excluded event/API behavior. D3-06 must be decided before stale-formula expectations are migrated. For comment deletion, resolve C4 in PKG-04C/PKG-07C before any implementation decision. Any implementation authorization must then be a separate explicit record with bounded scope, acceptance criteria, and exclusions.

## Governance boundary

This document makes no technical choice on behalf of an owner. It does not amend authoritative contracts, approve Option C, approve the Pivot facade, approve comment semantics, or authorize implementation. D5-05 and global D2-11 remain unresolved. No production source, tests, ledger dispositions, frozen registers, or historical manifests were changed. No tests or builds were run for this documentation-only consolidation.

Overall CS-002D4-R1 acceptance remains **WITHHELD**.
