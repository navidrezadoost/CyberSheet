# WP-A-NEXT Lane D — Decision and verification readiness kit

**Status:** nonbinding preparation only. Templates are intentionally blank; they do not choose or approve contracts. D1–D7 remain `PENDING`.

## D1–D7 register

| ID | Decision area | Authority scope | Current status |
| --- | --- | --- | --- |
| D1 | Post-publication sheet lifecycle | Workbook/API | `PENDING` |
| D2 | Journal commit/rollback and metadata publication | Workbook/API | `PENDING` |
| D3 | Workbook-owned pivot lifecycle | Workbook/API | `PENDING` |
| D4 | Snapshot freshness and stale-read response | Workbook/API | `PENDING` |
| D5 | Event authority, ordering, and observer isolation | Workbook/API | `PENDING` |
| D6 | Retained-view invalidation and reacquisition | Workbook/API | `PENDING` |
| D7 | BT-2 merged-read identity | Worksheet/API | `PENDING` |

Renderer constructor exception cleanup and framework initializer Workbook disposal are related to the broader lifecycle review but are separate, unresolved contract questions. They are not folded into D1–D7 by this template.

## Blank decision record (one per D item)

```text
Decision ID and title:
Decision authority name / role:
Authority designation reference:
Decision: approve | reject | defer
Date and approved decision channel:
Contract wording decided (quote or attach exact text):
Evidence reviewed (artifact, revision, file/hash, test/log reference):
Known evidence limitations:
Compatibility effects and affected consumers:
Migration / deprecation expectations:
Failure, recovery, and rollback risks:
Observer / event implications, if applicable:
Approved bounded implementation scope (leave blank unless separately approved):
Acceptance evidence required:
Deferred prerequisite / owner / review date (if deferred):
Rationale and constraints:
```

Possible responses are approve, reject, or defer. A rejection should identify the contract to preserve or the alternative to return for review. A deferral should name a prerequisite, responsible role, and review trigger/date. Silence, code changes, test outcomes, or a recommendation are not a decision.

## Evidence-completeness criteria

Before an owner decision is recorded, the decision packet should identify:

1. The exact question and decision boundary, including excluded adjacent contracts.
2. The designated decision owner and authority source.
3. Current source paths and revision, with hashes where a fixed artifact is reviewed.
4. Existing tests and observed outcomes, separating source inspection, search results, fixture/setup failures, executed assertions, and runtime evidence.
5. Relevant consumers and compatibility surface, including public exports and known first-party caller paths.
6. Failure semantics, transaction/commit point, event visibility, retained-handle behavior, and recovery expectations where applicable.
7. Missing evidence and unresolved alternatives, without presenting an inference as observed behavior.
8. The exact disposition requested: approve, reject, or defer; implementation authorization is a separate record.

Search reports must preserve their query, scope, exclusions, exit status, and output. Lexical search is useful for candidate reachability, but cannot prove runtime reachability, universal unreachability, or absence of external consumers. Frozen-register alignment can be claimed only when the register source is available and independently joined.

## Verification / implementation-authorization checklist

Complete this checklist only after the relevant owner has recorded the contract decision:

- [ ] The decision record names the authority, date, and exact approved wording.
- [ ] The implementation request references only the approved contract and operation set.
- [ ] Contract dependencies and sequencing are resolved or explicitly scoped out.
- [ ] Public API and compatibility effects are identified, with migration needs recorded.
- [ ] Failure and rollback semantics are testable through supported seams; no private test hook is assumed.
- [ ] Required unit, integration, consumer, and failure-path evidence is listed with explicit pass criteria.
- [ ] Observer/event ordering and listener-failure expectations are specified where relevant.
- [ ] Ownership/lifecycle cleanup expectations distinguish renderer resources from Workbook lifetime.
- [ ] Ledger, frozen-register, baseline, and sidecar handling is stated without implicit promotion or recapture.
- [ ] A separate implementation authorization names files/scope, prohibitions, and completion gates.
- [ ] Verification results and any residual limitation are recorded before review closure.

This kit does not establish technical correctness, decide which enforcement strategy to adopt, or authorize production/test/ledger/register changes.
