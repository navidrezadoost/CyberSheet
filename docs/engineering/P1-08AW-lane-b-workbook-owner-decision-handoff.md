# P1-08AW Lane B — Workbook/API owner decision handoff

**Status:** prepared for review; not delivered. All six Workbook/API decisions remain pending. This handoff records options and proposed outcomes for an authorized owner; it is not self-approval or implementation authorization.

**Authority and delivery.** The existing [P1-08AR approval request](P1-08AR-workbook-api-owner-approval-request.md) names only the role **“designated Workbook/API owner.”** Repository evidence reviewed for Lane B does not identify a person's name, contact address, team mailbox, or authorized communication channel. The request itself says it has not been delivered externally. Accordingly, this lane did not send it or represent the local document as delivered. Delivery and owner responses remain outstanding.

## Decisions requested

For each decision, the owner should record **approve**, **reject**, or **defer**, with the decision owner's name, date, rationale, and any bounded implementation scope. The recommendations below are proposals to make the choices concrete; none is approved.

| # | Decision | Owner choice required | Lane B recommendation for adjudication | Evidence and implementation boundary |
| ---: | --- | --- | --- | --- |
| 1 | Post-publication sheet lifecycle | Choose whether to support add, delete, rename, activate, a subset, or defer all. Set final-sheet deletion, atomic directory/index publication, and retained-view rules. | Keep the validated initial `Workbook.create({ sheets })` batch. If authorizing a first slice, consider activation among already-published sheets only; defer add/delete/rename until their own lifecycle contracts are specified. | Current post-publication mutators reject. A future operation must be Workbook-journal-owned and atomically publish identity, indexes, metadata, and invalidation state. No lifecycle API is implemented by this handoff. |
| 2 | Journal rollback/commit and metadata publication | Define the commit point, pre-commit rollback visibility, atomic publication of sheet identity/index/metadata, and observer-failure behavior. Decide whether a diagnostic channel is required. | Make the Workbook journal the sole transaction owner; pre-commit failure leaves no published mutation or event; post-commit observer failures cannot roll back committed state or block later observers. | Current owner-view/test mismatches do not decide these semantics. Any approved scope needs explicit commit and failure evidence before implementation. |
| 3 | Workbook-owned pivot lifecycle | Decide public create, explicit or query-triggered refresh, invalidation, delete, and disposal operations. | Keep mutable registries, anchors, dependency indexes, snapshots, and group state private; publish pivot definition, initial result, and matching metadata atomically; retain full rebuild for non-reversible aggregations. | Standalone pivot behavior does not establish Workbook authority. Refresh visibility and failure behavior depend on decision 4 and event ordering on decision 5. |
| 4 | Snapshot freshness and stale-read response | Choose a detached snapshot envelope with an explicit generation/freshness indicator, or an explicit stale/dirty error result. Define failed-refresh behavior. | Prefer an immutable detached envelope with explicit freshness/generation and a documented error for queries that cannot provide current data; never present an old snapshot as current after refresh failure. | Current getter shape can expose a prior snapshot; the exact public shape and error semantics remain undecided. No snapshot API change is authorized. |
| 5 | Event authority, order, and observer isolation | Approve exact event names/order, source of authority, and handling/reporting for listener exceptions. | Workbook journal commits alone publish owner events. Dispatch after publication; isolate each observer; a throwing listener cannot undo committed state or prevent subsequent listeners. Define source/structural, `pivot-dirty`, and snapshot-publication order. | Existing bridge suites are compile-blocked and cannot establish this contract. Exact names and diagnostic hook remain owner choices. |
| 6 | Retained-view invalidation and reacquisition | Decide behavior after rename, deletion, and generation changes, including how callers reacquire. | Rename invalidates name-bound retained views and requires lookup by the new name; deletion tombstones old views so they fail closed; stable worksheet identity must not silently retarget. | Lifecycle transitions are not available for direct public characterization today. These are proposed safeguards, not current behavior claims. |

## Decision record form

Please complete one row per decision and return it through an authorized owner channel:

```text
Decision number and contract:
Decision: approve | reject | defer
Decision owner:
Date:
Rationale and constraints:
Approved bounded implementation scope (if any):
Prerequisite or review date (if deferred):
```

An approval should state the exact operation(s) authorized and the acceptance evidence required. A rejection should state the contract to preserve. A deferral should name the prerequisite or review date. No answer should be inferred from a test failure, proposal, or local report.

## Dependencies and sequencing

- Decisions 1, 2, 5, and 6 jointly gate any post-publication sheet lifecycle slice; choosing only “activate” still requires journal, metadata-publication, event-order, and observer-isolation decisions.
- Decisions 3 and 4 jointly gate Workbook pivot lifecycle. Pivot refresh and query behavior also depend on the approved freshness and publication event semantics.
- The seven compile-blocked owner-contract suites and the 19 historical pivot integration setup failures remain evidence of missing/currently unavailable contract surfaces, not proof that every requested API should be added.
- Preserve the standalone pivot and recompute results already recorded in the reconciliation report. Do not add casts, private registry access, test-only owner getters, or a mutable escape from `WorkbookSheetView` to make the historical suites compile.

## Delivery record

Prepared locally in the isolated `p1-08aw-lane-b` worktree as `docs/engineering/P1-08AW-lane-b-workbook-owner-decision-handoff.md`. No named person or authorized external channel was found in the repository evidence reviewed; no external message was sent. No owner response was received. The six decisions remain pending, and no Workbook/pivot contract or implementation is approved by Lane B. This lane changed no production source, tests, reconciliation report, shared verification manifest, ledger, or frozen register. No commit or merge was made.

**Sources:** [P1-08AR owner approval request](P1-08AR-workbook-api-owner-approval-request.md), [P1-08AO ownership contract package](P1-08AO-workbook-contract-decision-package.md), and [CS-002D4-R1 reconciliation report](CS-002D4-R1-implementation-reconciliation.md).
