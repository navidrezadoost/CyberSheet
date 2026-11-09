# CS-002D4-R1 PKG-04R — Integrated implementation readiness

**Outcome: READY WITH TECHNICAL PREREQUISITES**
**Starting Git revision:** `88b09634f17f3b39d88a88c5428f76b426459a2b`
**Starting shared worktree:** 398 dirty paths; all pre-existing work was preserved. PKG-04 added documentation and one focused test only.
**Production strategy:** Incremental Journal. Snapshot remains an independent comparison path selected through test hooks.
**Existing production transaction operations:** Seven. No eighth operation was implemented.
**Overall CS-002D4-R1 acceptance:** WITHHELD.

## Workstream outcomes

| Lane | Deliverables | Integrated finding |
| --- | --- | --- |
| PKG-04A — Comment operation | `PKG-04A-comment-operation-contract.md`; `PKG-04A-exact-state-and-rollback.md`; `PKG-04A-event-and-side-effect-matrix.md` | Source-grounded one-comment deletion proposal. Existing cascade, no-op, Worksheet event, and Workbook bridge mapping are specified. Exact rollback for arbitrary nested `metadata: Record<string, unknown>` remains a technical prerequisite. |
| PKG-04B — Executable readiness | `PKG-04B-acceptance-test-matrix.md`; `PKG-04B-fixture-and-integration-evidence.md`; `PKG-04B-verification.md`; `packages/core/__tests__/worksheet-comment-existing-contract.p1-pkg-04.test.ts` | Three tests characterize existing standalone comment storage and the existing lazy bridge mapper. No executable test pretends that an unimplemented Workbook `deleteComment` API exists. Future transaction acceptance cases are retained as a non-executed matrix. |
| PKG-04C — Governance | `PKG-04C-consolidated-owner-decisions.md`; `PKG-04C-authorization-status.md` | One C1–C5 request is prepared but unsent. No approved recipient/channel, owner designation, contract approval, or implementation authorization is evidenced. D5-01 Option C remains proposed; D5-05 stays separate. |
| PKG-04D — Roadmap | `PKG-04D-transaction-roadmap.md`; `PKG-04D-dependency-and-risk-register.md` | One-comment deletion remains the first bounded candidate. Other mutation families remain sequenced by state-owner and rollback closure; structural, drawing, Pivot, durable persistence, history, and asynchronous scheduling work remain deferred. |

No cross-workstream production/test ownership conflict occurred. A/C/D produced independent documentation; B added one isolated characterization test. No authoritative contract, ledger, frozen register, historical manifest, production source, binary persistence format, Journal default, or Workbook API changed.

## Comment deletion semantics and boundary

Current `Worksheet.deleteComment(address, commentId, deleteReplies = true)` uses a cell-local string ID. With the default cascade it removes all same-cell transitive descendants, preserves survivor order, and replaces the comment array. It returns `false` and emits no event when the cell, collection, or requested ID is absent. An effective deletion emits one Worksheet `comment-deleted` event for the requested ID; deleting the final comment sets `comments` to `undefined` and retains the CellRecord. Duplicate IDs are not prohibited by the current implementation. The existing lazy Workbook bridge maps the event to `comment-delete` with `{row, col, commentId}`.

The proposed Workbook API shape remains a proposal:

```ts
workbook.mutationPort.deleteComment(sheet, address, commentId)
workbook.transact((tx) => tx.deleteComment(sheet, address, commentId))
```

The return type and no-op result require owner approval. Proposed transaction behavior buffers only successful deletion events until commit, preserves existing event names/payloads, and suppresses all buffered events on rollback. No cross-surface observer completion order is added. D5-01 has no verified owner decision; D5-05 Application-level forwarding remains unresolved and is not part of this operation.

## Exact-state and rollback prerequisite

The operation is limited to the addressed cell's comment field plus a commit event record. It must preserve sparse cell presence, `comments` absence, ordering, and every unrelated field. Current Worksheet deletion replaces the array rather than mutating its prior comment nodes, but existing generic Journal and Snapshot reference-state paths are shallow at the Cell level. Current comment values may include Dates, position objects, rich-text/style objects, and arbitrary nested metadata. Standalone `getAllComments()` shallow-copies arrays while retaining comment-node aliases; WorkbookSheetView reads are detached, but that does not define a complete contract for all comment metadata graphs.

Before implementation can be technically ready, the supported `metadata` graph must be bounded and validated, or a lossless graph-aware clone/restore contract must be selected. JSON cloning is not sufficient evidence because it loses or changes dates, optional values, aliases, and unsupported graph types. The same value semantics and absent-state distinctions must be independently captured/restored under Journal and Snapshot, with tests for the authorized fault cuts and recovery-required outcomes. This unresolved exact-state question is why this gate is **READY WITH TECHNICAL PREREQUISITES**, rather than technically ready.

## Verification and test evidence

The established 11-suite transaction/event selection was run serialized with the new comment test under the reversible nine-group source-sidecar isolation procedure:

- Jest: 12 suites passed, 173/173 tests passed (170 established tests plus 3 new tests).
- Core `npm run typecheck --workspace @cyber-sheet/core`: passed.
- `node scripts/check-no-focused-tests.mjs`: passed; no focused markers.
- `git diff --check`: passed.
- Protected sidecars: all 237/237 entries passed before and after Jest; manifest SHA-256 `a6b89cdc3ccd8bfc8c054e5fafcb4dc84ed9ba1347eb2597a3e7bef938969b6c`.
- Full Core suite and Workbook-owned Pivot integration suite: not run.

The first attempt at the new suite had one test-only TypeScript error because an unsubscribe callback was treated as a disposable object. The test was corrected and the complete selection passed. Separately, the original unisolated PKG-03C attempt failed 10 suites/133 tests with stale generated source JavaScript missing current DependencyGraph methods; it remains classified as a test-resolution hazard, not a comment or transaction regression. The later isolated PKG-03C run passed 11/11 and 170/170. Historical Core and Pivot blockers remain as previously recorded and were not represented as fixed here.

## Governance and remaining blockers

1. **Technical:** Define the supported nested metadata graph or approved lossless snapshot/restore semantics, then build the implementation-specific Journal/Snapshot fault matrix. This is the direct technical prerequisite for exact rollback.
2. **Authority:** Leadership must establish the Workbook/API, Worksheet/API, and D5 decision owners with an attributable authority basis and approved response channel. The consolidated request remains unsent.
3. **Contract:** The designated owners must decide the API, return/no-op semantics, reply cascade, and event compatibility. D5-01 and D5-05 remain independently unresolved. Contract approval alone is not implementation authorization.
4. **Implementation:** A separate explicit bounded authorization must name the API and acceptance criteria before adding the eighth operation.
5. **Other R1 blockers:** Global D2-11 remains unresolved outside its bounded closures. The historical full Core result is not an acceptance baseline; legacy Workbook Pivot integration remains compile/accessor blocked, and the shared FIFO self-await limitation remains separate.

## Next action

The next implementation candidate remains one-comment Workbook-owned deletion with fixed `deleteReplies=true`, but no implementation is authorized or technically ready yet. The smallest enabling action is an attributable owner decision that (a) bounds/validates the supported comment metadata graph or selects lossless graph-aware restoration, and (b) decides the proposed operation contract and no-op/return behavior. Once those decisions and the authority chain are recorded, issue a separate explicit implementation authorization with Journal/Snapshot fault-cut acceptance tests. Do not begin an implementation package based only on this readiness review or passing standalone tests.

No production behavior, public event schema, mutation kind, persistence format, Journal default, Pivot API, ledger disposition, frozen register, baseline, merge, or release was changed. Overall CS-002D4-R1 acceptance remains **WITHHELD**.
