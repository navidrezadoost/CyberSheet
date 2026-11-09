# WP-A — D0–D7 Stakeholder Selections and Gap Analysis (Draft)

**Status:** DOCUMENTATION DRAFT — NOT A FORMAL CONTRACT APPROVAL OR IMPLEMENTATION AUTHORIZATION.

This draft records behavior choices reported in the supplied discussion transcript and identifies technical details still needed for testable contracts. The transcript says these choices were made by the client, but does not provide a durable authority designation for D0–D7. Accordingly, **D0 remains `PROPOSED`; D1–D7 remain `PENDING`** until the correctly designated owners record formal decisions through an approved channel.

This document does not alter the earlier D0/D1–D7 proposals. Its gap notes summarize previously recorded evidence and limitations; they are not a fresh source audit, test run, or the advisor's WP-A assessment. Lane C remains gated on verified archive delivery.

## 1. Reported behavior selections

The following are stakeholder-reported target behaviors from the supplied discussion. The “unresolved specification” column records details the discussion itself leaves open; it must not be filled by assumption.

| ID | Reported selection | Scope conveyed by the discussion | Unresolved specification before formal approval |
| --- | --- | --- | --- |
| D0 — Concurrency | Sequential execution: at most one active modification operation per Workbook; later operations wait in arrival order. If one operation fails, complete its D2 rollback, then continue with the next independent queued operation. | Per-Workbook mutation scheduling. This is a reported selection, not evidence that current code has a FIFO queue or single-writer enforcement. | Define operation boundary, what counts as an arrival, async work, nested/reentrant writes, enqueue result, cancellation, queue failure/recovery, fairness/backpressure, and behavior when rollback itself fails. Ensure a failed operation does not poison later queued work. |
| D1 — Sheet lifecycle | Excel-style: adding and deleting sheets after open is permitted unless Workbook structure is locked. | The transcript explicitly selects add/delete and structural lock. It lists rename/move/hide as operations to consider under the lock, but does not clearly record a separate selection for each. | Define supported operations, lock creation/release/authorization, final-sheet deletion, sheet-name/ID rules, formula/chart/pivot dependencies, atomic publication, retained references, and undo/redo. Treat rename/move/hide as unselected until confirmed. |
| D2 — Failure and rollback | All-or-nothing for one multi-step operation: failure reverts every change associated with that operation. | The examples cover multiple cell writes and the technical implications extend to formulas, sheets, auxiliary data, pivots/charts, history, and events. The full rollback surface is not specified. | Define the atomic operation boundary; covered state; pre-commit and rollback-failure behavior; irreversible effects; history rules; event timing; retry behavior; and what a caller observes. Distinguish state rollback from already-observed external side effects. |
| D3 — Pivot refresh | Configurable automatic or manual refresh, with manual refresh as the default. | The transcript explicitly limits this choice to refresh timing. | Define configuration scope/default persistence, manual refresh entrypoint, source-mutation invalidation, cache sharing, explicit versus query-triggered refresh, stale reads, refresh errors, deletion/disposal, and event order. These are not settled by the refresh-mode selection. |
| D4 — Previous data / reads | Independent copy: previously returned data remains static; new reads access the latest recorded data. | Intended separation of earlier observations from later Workbook state. | Define what objects are copied, shallow/deep rules for nested values (including Date/Map/Set and extensible metadata), frozen versus mutable copies, read generation, “latest” commit point, stale snapshot signaling, and behavior of retained views versus detached snapshots. |
| D5 — Events | After successful commit, event propagation sequence is Sheet, then Workbook, then Application. | The transcript supplies a high-level scope order and says failed operations should not emit a success/final-change event. | Define event names/payloads, which operations emit each level, one-versus-many event cardinality, ordering among event types, listener registration order, exception isolation/reporting, reentrant writes, suppression/batching, and cross-sheet operations. No FIFO queue or listener policy follows from this selection alone. |
| D6 — Deleted-sheet references | A reference to a deleted sheet becomes invalid and returns/raises an explicit error; it must not silently re-link to another sheet. | The summary says invalid references do not automatically relink elsewhere. The transcript also raises stable identity if a new sheet reuses the old name. | Define what “reference” covers (sheet view, service, formula, pivot source, callback, address, or cached snapshot), exact error type/timing, tombstone/generation behavior, same-name recreation, rollback restoration, and reacquisition. |
| D7 — Merged-cell reads | Merged members have identical values while each returned object instance is independent. The supplied implementation note also says preserve the requested address while deriving value from the anchor. | Separates value equivalence from JavaScript object identity. | Define which cell fields use anchor versus requested-member address, write redirection, style/metadata/comments, nested object copying, snapshot lifetime, and whether the no-shared-reference rule applies to every read API. |

## 2. Gap analysis against previously recorded evidence

This is a preliminary evidence map, not the independent source analysis requested under WP-A-REVIEW-01. It uses existing reports and decision packages; their historical findings have not been re-run or independently validated here.

| ID | Previously recorded evidence / current known boundary | Gap to the reported target | Next evidence needed |
| --- | --- | --- | --- |
| D0 | The earlier D0 proposal records concurrency/reentrancy questions but no conclusion that the current Workbook enforces one writer or queues operations. Existing materials do not establish FIFO behavior or nested-write handling. | Reported sequential queue behavior is not established in current implementation evidence. | After verified advisor receipt, trace every mutation entrypoint and nested observer path; distinguish synchronous/asynchronous operations and journal bypasses. Add no queue or test hook before formal scope approval. |
| D1 | Existing AR/AW materials report post-publication sheet mutators as rejecting in relevant public paths; initial `Workbook.create({ sheets })` is supported. | Add/delete-unless-locked is a requested behavior that differs from the recorded post-publication boundary. Lock semantics and dependent formula/pivot/chart behavior are also open. | Confirm exact current public paths and lock support; map consumers and identity/index publication; define structural operations and failure/undo behavior before an implementation slice. |
| D2 | Existing transaction/command evidence covers bounded standalone operations, but prior reports do not establish all-or-nothing rollback across Workbook-owned cell, formula, structural, pivot, metadata, history, and event state. P1-08K.04 also records no supported setter-failure injection path for a particular deletion command. | Whole-operation rollback is broader than the characterized paths; rollback failure and already-observed side effects remain unspecified. | Map journal coverage and mutation bypasses; identify supported failure seams; characterize state, history, and event visibility at each operation boundary. Decide explicit semantics for rollback failure. |
| D3 | Existing pivot work distinguishes standalone correctness from unresolved Workbook-owned lifecycle. The reconciliation report records bounded recompute recovery behavior, while legacy Workbook pivot integration setup remains blocked by unavailable post-publication APIs. | Refresh mode selection does not define Workbook ownership, cache sharing, source invalidation, errors, or public freshness. | Map registry/cache/source dependencies and public callers; define manual/automatic trigger semantics, error behavior, and lifecycle separately. |
| D4 | Earlier reports distinguish detached read snapshots from owner-view access and record unresolved public snapshot freshness/stale-read semantics. | “Old version static; new reads latest” does not specify read generations, nested-copy guarantees, formula/pivot cache freshness, or what a retained WorkbookSheetView means. | Separate internal cache invalidation, public snapshot versioning, retained handle validity, and detached value-copy semantics. Test nested supported values and failed refresh behavior after contract approval. |
| D5 | Existing EventBus and bridge tests provide bounded behavior, but prior reports state that Workbook owner/event bridge suites are compile-blocked or cannot establish desired owner event sequencing. | Sheet → Workbook → Application order, listener failure handling, and failed-operation event suppression are not established as a complete public contract. | Trace actual event publishers/bridges; identify ordering and listener exception behavior under success, rollback, and reentrancy. Keep proposals such as FIFO dispatch or suppression separate from observed behavior. |
| D6 | Existing owner-view/lifecycle reports state that post-publication lifecycle transitions and retained-view invalidation/reacquisition are unresolved. | No verified deletion/tombstone/recreation contract establishes explicit invalidation without retargeting. | Map retained references in services/frameworks and WorkbookSheetView resolution; define generation/tombstone semantics, rollback restoration, and error surfaces. |
| D7 | The P1-08AW merge-read decision package records that current `getCell()` resolves merged-member value through the anchor and returns detached snapshots per call; the separate BT-2 test expects same-reference identity and has a runtime failure. | The reported value-equivalent independent-copy choice appears closer to the characterized behavior, but requested-address preservation and nested snapshot semantics need precise confirmation. No owner decision has been recorded. | Confirm each read API's address/value/style behavior and mutation redirection; define supported nested types and update the BT-2 contract only after a separate Worksheet/API owner decision and test authorization. |

## 3. Contract choices versus implementation gaps

The reported selections are behavioral preferences, not proof of Excel compatibility or of a suitable implementation design. In particular:

- D0 queueing, D2 rollback, and D5 event publication interact but describe distinct guarantees. A queue does not itself make operations atomic, and an all-or-nothing state change does not specify observer behavior.
- D1 structure locking is a separate Workbook capability and authorization rule. The Excel analogy does not determine Cyber Sheet's lock API or compatibility surface.
- D3 manual-by-default refresh does not settle Pivot cache ownership, invalidation timing, or stale-read policy.
- D4 detached copies, stale caches, retained views, and “latest” reads are separate concepts and need separate normative definitions.
- D6 applies potentially to JavaScript handles and cached objects as well as formulas. Formula `#REF!` behavior alone cannot define service/view lifecycle.
- D7 value equivalence and independent object identity do not establish address, write-redirection, or nested-value semantics.
- Requirements concerning formulas, charts, pivots, sheet names/IDs, undo/redo, listeners, and rollback failure are technical implications or open questions until explicitly selected and recorded by the owner.

## 4. Preliminary dependency map

These are candidate relationships for the authorized advisor review, not mandatory approval order or a claim that implementations must ship together.

| Decision | Contract-level questions to coordinate | Potential operation-specific implementation dependency |
| --- | --- | --- |
| D0 | Reentrancy may affect D2 commit/rollback, D5 subscriber writes, and D6 retained-reference observation. | A queue operation may require a concurrency guard for a specific D2 or D6 mutation, but only if source tracing shows overlap/reentrancy can occur on that path. |
| D1 | Sheet lifecycle interacts with D2 rollback, D5 events, and D6 handle invalidation. | Add/delete implementation may need journal publication and invalidation steps; D0 is relevant only if those operations can overlap or reenter. |
| D2 | Failure visibility must agree with D5 event timing and operation-specific D1/D3 state changes. | Rollback support depends on concrete state writes and reversible mutation coverage; do not assume all commands share one transaction. |
| D3 | Refresh, invalidation, snapshot freshness, and publication event rules touch D2/D4/D5. | A particular refresh mode may require mutation serialization, but this is not established for all pivot reads or writes. |
| D4 | “Latest” read semantics interact with D3 refresh ownership and D5 publication; D6 handles may outlive snapshots. | Snapshot generation/freshness markers may be independent of the selected transaction implementation. |
| D5 | Event order and listener errors must be consistent with D0 reentrancy and D2 commit point. | Event dispatch may need a guard or queue only for code paths with reentrant writes; do not presume FIFO application events. |
| D6 | Sheet deletion/lifecycle (D1), rollback (D2), and observable invalidation (D5) need compatible wording. | D0 is a prerequisite only for operations whose concurrent/reentrant behavior affects handle resolution. Analyze per operation. |
| D7 | No dependency on D0–D6 is presumed; evaluate only if actual shared-cell/snapshot paths demonstrate one. | Merged-read value snapshots can be reviewed separately from Workbook mutation queue design. |

## 5. Evidence classification and formalization gates

When this draft is reviewed, classify each statement as one of:

- **Stakeholder-reported selection:** present in the supplied discussion, but not yet owner-approved.
- **Excel-confirmed:** supported by a cited authoritative Excel specification/help source; do not infer Cyber Sheet API semantics from Excel behavior.
- **Cyber Sheet source-confirmed:** directly observed in a specific source path and revision.
- **Test-confirmed:** observed by a named test whose setup reaches the relevant path and whose assertions execute.
- **Proposed design choice:** a recommendation for Cyber Sheet, not an existing behavior or Excel requirement.
- **Unsupported / unresolved:** lacks sufficient source, test, or authoritative compatibility evidence.

Before any item becomes a formal contract, the record must identify the designated owner and authority basis, exact normative wording, approved durable decision channel, date, compatibility scope, unresolved limitations, and acceptance evidence. Implementation requires a separate bounded authorization.

## 6. Smallest next checkpoint

Do not begin a new implementation or source-audit wave from this draft. The existing gate remains:

1. Manually deliver the approved WP-A evidence archive to the existing advisor conversation.
2. Obtain receipt and independent archive/payload integrity verification.
3. Have the advisor complete the WP-A-REVIEW-01 deliverables, challenge the reported selections, and separate source facts from compatibility recommendations.
4. Route the owner-designation requests through an approved project-leadership channel.
5. Reconcile findings in `WP-A-REVIEW-02-decision-reconciliation-template.md`; preserve disagreements and make D0/D2/D6 implementation dependencies operation-specific.
6. Only after formal owner decisions, issue a separate implementation authorization for an approved, testable slice.

No source, test, ledger, frozen-register, historical manifest, or baseline change is authorized by this draft. No tests or builds were run. D0 remains **PROPOSED**, D1–D7 remain **PENDING**, and overall CS-002D4-R1 acceptance remains **WITHHELD**.
