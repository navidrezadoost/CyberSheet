# P1-08AR — Workbook API owner approval request

**Status:** pending Workbook/API owner decision. This request records the architecture proposal for adjudication; it is not an approval, implementation authorization, or claim that the proposed behavior is already supported.

**Decision authority:** the designated Workbook/API owner. No owner decision was available in this work session, and this request has not been delivered through an external communication channel.

**Evidence basis:** [P1-08AO Workbook ownership contract decision package](P1-08AO-workbook-contract-decision-package.md), the accepted AJ pivot decision package referenced by the reconciliation report, AQ's seven compile-blocked owner-contract suites, and the current public Workbook/WorkbookSheetView boundary. The compile failures demonstrate a mismatch between historical test assumptions and current public declarations; they do not independently establish which contract should be implemented.

## Decisions requested

For each row, the owner should select **approve**, **reject**, or **defer**, and record an owner name, date, and rationale. All statuses remain **pending** until that decision is recorded.

| Contract | Proposed decision for review | Current status | Decision authority | Supporting evidence / unresolved choice |
| --- | --- | --- | --- | --- |
| Post-publication sheet lifecycle | Keep the validated initial `Workbook.create({ sheets })` batch supported. Decide whether a first implementation slice supports add, delete, rename, activation, or a smaller subset. Require final-sheet deletion rules, atomic directory/index publication, and retained-view behavior before enabling operations. | pending | Workbook/API owner | AO proposal; current `addSheet`, `deleteSheet`, `renameSheet`, and active-sheet mutation paths reject post-publication operations. Seven owner-oriented test files assume capabilities not present in the current view contract. |
| Workbook journal atomicity and metadata publication | Make the Workbook journal the sole transaction owner. Define pre-commit rollback with no visible events, atomic publication of sheet identity/index/metadata, and observer failure isolation after commit. Decide whether a supported diagnostic channel is required before dispatch. | pending | Workbook/API owner | AO proposal; current tests assume mutation and rollback boundaries that are not exposed by the owner view. Commit point and observer behavior need explicit definition. |
| Workbook-owned pivot lifecycle | Decide public create, explicit/query-triggered refresh, invalidation, delete, and dispose operations. Keep mutable registries, anchors, dependency indexes, snapshots, and group state private. Preserve full rebuild for non-reversible aggregations. | pending | Workbook/API owner | AO and AJ proposals; seven compile-blocked owner tests depend on pivot registry/lifecycle access. Standalone pivot coverage does not establish Workbook authority. |
| Snapshot freshness | Choose a detached snapshot envelope with an explicit freshness/generation indicator, or define an explicit error result for dirty/stale reads. Specify failed-refresh behavior so an old snapshot cannot appear current. | pending | Workbook/API owner | AO proposal and accepted recompute recovery evidence; public stale-read shape and failure semantics remain undecided. |
| Event authority and ordering | Make committed Workbook journal operations authoritative. Decide exact names and order for source mutation, `pivot-dirty`, structural change, and snapshot publication. Dispatch after commit; isolate listener exceptions so committed state and later observers are unaffected. | pending | Workbook/API owner | AO proposal; existing bridge tests are compile-blocked and cannot establish the desired event contract. Exact names and diagnostics channel remain open. |
| Retained view invalidation and reacquisition | Decide whether rename invalidates old name-bound views and requires reacquisition by the new name, whether deletion tombstones retained views so they fail closed, and how generation changes are observed. | pending | Workbook/API owner | AO proposal; current `WorkbookSheetView` identity is owner-mediated, while lifecycle transition semantics are not available for direct characterization. |

## Owner response form

For each contract above, record:

```text
Contract:
Decision: approve | reject | defer
Decision owner:
Date:
Rationale / constraints:
Approved implementation scope (if any):
```

An `approve` response should identify a bounded implementation slice and its acceptance evidence. A `defer` response should state the prerequisite or review date. Until the response is recorded by the decision authority, all six rows remain pending and no Workbook lifecycle or pivot API implementation is authorized.

## Proposed smallest implementation slice for owner review

**Candidate only; not approved or authorized.** If the owner wants a first lifecycle implementation, consider post-publication activation of an already-published sheet only. The operation would switch the active sheet among existing sheets while preserving sheet IDs, sheet-directory membership, and all retained view objects. It would not create, delete, or rename sheets, alter pivot state, or add mutable capabilities to `WorkbookSheetView`.

This slice depends on explicit decisions for journal commit semantics, active-sheet metadata publication, event name/order, and listener-exception isolation. It cannot be implemented independently while those authority and publication rules remain pending. On approval, the contract should require: invalid target rejection without mutation; successful activation publishes the active ID before post-commit notification; listener failures do not roll back or hide committed state; repeat activation behavior is defined; and retained handles to both existing sheets remain valid. Focused evidence should cover success, invalid target, same-sheet activation, event order, a throwing listener followed by another listener, and retained-handle reads. No such behavior is represented as implemented by this proposal.

## Delivery record

This file is a local decision package only. It has not been sent to the Workbook/API owner or any external channel. All six decisions remain **pending**; no response, approval, rejection, implementation scope, or authorization is implied. Delivery and the owner's recorded response must precede any implementation proposal based on this handoff.
