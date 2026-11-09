# CS-002D4-R1 PKG-15C — Pivot component hardening

**Scope:** Independently supported Pivot calculation, snapshot transformation/store/query, and recompute components. This review does not expose or activate Workbook-owned Pivot lifecycle.
**Production changes:** None.
**New tests:** None; the reviewed failure and publication invariants already have direct focused coverage, and no additional case was found that could be tested without inventing a component contract.

## Reliability review

PKG-14C's invalid-ID replacement/retry test closes the remaining composition gap identified there: with a last-good snapshot present, a recompute builder returning a mismatched `pivotId` does not replace that snapshot, leaves the pivot dirty, clears `rebuilding`, and permits a later valid retry to publish and clean it.

The current component suite and prior package evidence cover the other PKG-15C priorities as follows:

| Boundary | Existing executable evidence | Current limit |
| --- | --- | --- |
| Snapshot validation and atomic replacement | `packages/core/__tests__/pivot-snapshot-store.test.ts`: mismatched ID is rejected before replacement; prior object and store size remain intact. PKG-14C composes this with recompute and retry. | Store validation is limited to ID correspondence; it is not a general schema validator. |
| Failed rebuild and last-good preservation | `pivot-recompute.test.ts`, `pivot-partial-recompute-safety.p1-08x.test.ts`, and `pivot-recompute-validation-retry.p1-pkg-14c.test.ts`. | Recovery is synchronous component behavior, not a Workbook publication transaction or generation fence. |
| Partial recompute fallback and dirty-state consistency | P1-08X/AA tests cover partial publication failure, builder failure after group-state population, state invalidation, retry, `dirty`, and `rebuilding`. | They do not prove rollback of every accumulator sub-operation or transaction-level atomicity. |
| Error-valued row publication | `pivot-error-publication.p1-pkg-13c.test.ts` covers Error identity, native prototype, custom `name`, and `message` through transform, store, and `GetPivotData`; `pivot-named-binding-integration.p1-08ah.test.ts` covers calculated Error values and queries. | This is an in-process standalone value path. It does not choose a public detached Error DTO. |
| Disposal and clearing | `pivot-snapshot-store.test.ts` exercises `clearAll`, reuse after clearing, and store CRUD. Registry clear/unregister and anchor cleanup have component tests. | An asynchronous in-flight disposal/publication race is not represented in the synchronous recompute API. Workbook disposal integration is not reachable for Pivot lifecycle. |
| Repeated invalidation and clean fast path | `pivot-recompute.test.ts`, `pivot-invalidation.test.ts`, and `pivot-invalidation-workbook-bridge.test.ts` cover dirty/clean rebuild behavior, no-op invalidation, and no rebuild when clean. | No source/build generation token exists; generation ordering is not inferred from timestamps. |
| Obsolete/duplicate publication | Store replacement, clean-path single-build behavior, and the PKG-14C rejected replacement/retry are covered. | No async builder or approved generation/cancellation token exists against which an obsolete completion contract could be asserted. |

## Hardening decision

No new production correction or test is justified by the current evidence. The store's only explicit validation is pivot-ID correspondence; adding schema, deep-freeze, generation, or stale-publication rules would expand that contract. The recompute engine and its injected builder are synchronous, and the builder contract describes deterministic, side-effect-free computation. Introducing asynchronous lifecycle, cancellation fencing, or re-entrant unregister behavior as a test target would characterize unsupported capability rather than harden an existing supported path.

No new Error identity test is needed: the exact standalone calculation → transform → store → query boundary already has direct coverage. The detached Workbook helper is a separate boundary and is addressed in `CS-002D4-R1-PKG-15C-public-read-boundary.md`.

## Verification handoff

No Jest command was run by this lane. Lane D owns all serialized Jest execution and should include the new package lane's selected evidence only if it adds a focused test; this lane adds none. The prior PKG-14D evidence records the PKG-14C retry case and adjacent standalone Pivot selection. No protected Core sidecar was read for mutation, parked, or rewritten by this review.

## Disposition

Standalone Pivot component reliability has focused evidence for current synchronous validation, last-good retention, failure/retry, partial fallback, Error identity, clearing, and clean-path behavior. This does not establish Workbook-owned Pivot creation, publication, detached-read semantics, disposal integration, or formula behavior for stale snapshots. D3-06 and the Workbook facade/Error representation decisions remain separate. Overall CS-002D4-R1 acceptance remains **WITHHELD**.
