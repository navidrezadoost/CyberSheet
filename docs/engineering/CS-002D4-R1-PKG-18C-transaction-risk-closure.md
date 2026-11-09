# CS-002D4-R1 PKG-18C — Targeted transaction risk closure

**Scope:** Targeted review of StyleCache ownership evidence and reconciliation of PKG-17C's immediate clear-operation rollback tests. One focused test was added for repeated canonical styles assigned across Worksheets before an injected post-apply rollback. No production source, public API, mutation operation, contract, or owner decision changed. Lane E owns execution; this lane did not run Jest or typecheck.

## C1 — StyleCache lifecycle

### Source behavior

`packages/core/src/StyleCache.ts` implements a Workbook cache with strong hash buckets and a `WeakMap` reference count (lines 461–479). `intern()` increments the tracked reference for a structurally equal style and returns the canonical object (lines 504–526); a new canonical object starts at count one (lines 538–544). `release()` decrements a count or removes the object from its strong bucket when the last reference is released (lines 678–695). `clear()` removes all strong buckets and resets metrics (lines 555–571).

`packages/core/src/workbook.ts` interns every staged style before Worksheet mutation and retains one provisional reference per style operation (lines 546–555). A preparation failure releases references already acquired (lines 556–562). A clean rollback releases all provisional references after restoring sheet state (lines 678–680 and 724–728); a rollback/restore error skips that release and marks the Workbook recovery-required, preserving cache references while the corresponding cell state may be uncertain. After successful commit, each displaced style reference is released (lines 741–746).

Workbook disposal cancels work and calls `#finalizeDispose()` after the active queue settles, but that finalizer currently clears Pivot-related stores and does not call `#styleCache.clear()` (`workbook.ts:770–779`, `1149–1162`). This is an implementation/lifecycle observation, not a confirmed contract violation: no approved Workbook-disposal requirement for StyleCache reclamation or supported cache observer is established by the evidence reviewed here. No test reaches the private cache through reflection and no production seam was added.

### Existing evidence and remaining limit

`packages/core/__tests__/workbook-mutation-queue.p1-pkg-01.test.ts` already verifies:

- Journal and Snapshot repeated same-cell style replacement release each displaced reference (`:640–668`).
- Journal and Snapshot rollback release provisional style references and preserve the prior style (`:670–696`).
- A fault immediately after style allocation releases the provisional reference and restores public state (`:984–1005`).
- The mixed seven-operation rollback restores style state across two Worksheets (`packages/core/__tests__/workbook-transaction-side-effect-matrix.p1-pkg-13b.test.ts:22–91`), but does not assert the style cache's per-operation releases.

Those checks observe release calls and public cell/snapshot state. They do not inspect private reference counts or prove cache bucket membership for every live cell. `StyleCache.size()` and metrics expose unique-entry counts, not per-style counts; the Workbook's cache itself has no supported observer. Therefore exact private refcount equivalence, release-failure recovery, and disposal-time cache clearing remain unverified. No leak or incorrect release is reproduced by this review.

### Narrow additional rollback cut

Added `packages/core/__tests__/workbook-style-cache-cross-sheet-rollback.p1-pkg-18c.test.ts`. For each of Journal and Snapshot it stages two structurally equal styles on different Worksheets, counts `after-cell-record` callbacks, and injects on callback three: after both style writes applied, during the subsequent value write. The test uses only the established `StyleCache.prototype.release` spy and Workbook mutation failure hook. It expects:

- both Worksheet snapshots equal their pre-transaction snapshots;
- no Worksheet event is published and Workbook health returns to `healthy`;
- exactly two provisional releases occur and both calls receive the same canonical style object; and
- neither target cell retains the staged style.

This closes a narrow evidence gap: existing cross-Worksheet rollback covered a style write but did not directly count the two provisional references when equal styles were interned for separate sheet assignments. The test is pending Lane E execution; no passing result is claimed here. It does not establish private refcount internals beyond the observable calls or cover a rollback failure where state remains uncertain.

## C2 — Clear-operation test reconciliation

`packages/core/__tests__/workbook-clear-cell-immediate-fault-cuts.p1-pkg-17c.test.ts` currently contains eight injected rollback cases and four no-op cases. The injected cases cover both `clearCellContent` and `clearCellFormula`, Journal and Snapshot, an ordinary formula cell, and a merged-member address resolved to its anchor. Each throws at `after-cell-record`, before dependency cleanup. The cases compare captured non-empty cell and dependency-graph state before and after, check no event publication, healthy mutation state, and an inactive/empty write journal. The four absent-cell cases establish no-op behavior and correctly expect the hook not to fire.

The merged-member check distinguishes effective/public reads from stored-coordinate enumeration: `getCell(member)` resolves to the anchor, while `forEachNonEmptyCell` has no separate member record. This corrects the earlier test-authoring assertion described in PKG-17E; the original failure was not a product failure. PKG-17E records the corrected shared selection at 24 suites / 308 tests passing.

Current method order in `packages/core/src/worksheet.ts` is explicit: `clearCellContent()` records a before-image, returns for absent or already-empty content, clears value/formula, invokes `after-cell-record`, and only then clears dependencies for formula cells (`:1143–1177`). `clearCellFormula()` records a before-image, returns for absent cells or absent formula text, deletes formula text, invokes the same immediate hook, and then clears dependencies (`:1180–1208`). Consequently:

- Existing PKG-17C injected cuts are formula-bearing cells only; they test rollback of both the changed record and graph state.
- Value-only `clearCellContent` has no dedicated immediate-cut case. Its post-write path has no dependency deletion, so its record restoration is a distinct, small coverage gap. PKG-17C's broader operation rollback tests do not inject at this exact post-write point.
- `clearCellFormula` on a formula-free cell is a no-op; the no-op matrix uses an absent cell and does not separately characterize a present value-only cell.
- Merge-anchor requests, faults after dependency cleanup, formula-engine/recalculation callbacks, event-buffering, and restoration/discard failures are not covered by PKG-17C's immediate cut.

No additional clear test was added in this lane: Lane C's only new test is the identified multi-Worksheet StyleCache rollback cut, and Lane E owns the bounded verification run. The value-only immediate cut remains a documented candidate if the integrated gate determines it is necessary; the current evidence does not establish a deterministic defect.

## Disposition

**No deterministic supported-contract defect established.** The new test adds a bounded rollback-release assertion for two Worksheets without exposing cache internals. Its result is pending Lane E. StyleCache's exact private refcount invariants, disposal cleanup expectations, and the listed clear-operation phase gaps remain limitations; no broad fault matrix or production correction is justified by the current evidence. Global D2-11 remains unresolved, and overall CS-002D4-R1 acceptance remains **WITHHELD**.
