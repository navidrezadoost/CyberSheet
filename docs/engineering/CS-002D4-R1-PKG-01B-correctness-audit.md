# CS-002D4-R1 PKG-01B — Rollback Correctness Audit

**Date:** 2026-10-31
**Starting revision:** `88b09634f17f3b39d88a88c5428f76b426459a2b`
**Overall R1 acceptance:** WITHHELD

## Baseline and change boundary

The worktree was already broadly dirty at start. In the PKG-01 surface, `packages/core/src/workbook.ts` and `packages/core/src/workbook-access-types.ts` were modified; `packages/core/src/workbookMutationTestHooks.ts` and `packages/core/__tests__/workbook-mutation-queue.p1-pkg-01.test.ts` were already untracked. The primary reconciliation report, package lock, numerous Core/React/renderer files, and prior engineering materials were also dirty. These were preserved.

PKG-01B-specific changes are limited to the transaction coordinator's internal phase timing hooks and successful style-reference release in `packages/core/src/workbook.ts`; additional internal test timing callbacks in `packages/core/src/workbookMutationTestHooks.ts`; expanded tests in the existing PKG-01 queue test; the benchmark harness under `packages/core/benchmarks/`; and the three PKG-01B reports/data artifacts. `Worksheet.ts`, the ledger, frozen registers, and reconciliation dispositions were not changed by this package. The earlier IDE-only `packages/core/__tests__/tsconfig.json` remains unrelated and untouched by PKG-01B.

## Inspected implementation paths

- Workbook FIFO admission, cancellation, async transaction callback and context revocation: `packages/core/src/workbook.ts` (`#enqueueMutation`, `#drainMutationQueue`, `transact`, and `dispose`).
- Snapshot boundary and five-operation apply/commit/rollback path: `packages/core/src/workbook.ts` (`#applyCellWriteBatch`). Each participating Worksheet captures cells and dependency graph before mutation. Events are buffered and published after the commit point.
- Snapshot content: `packages/core/src/worksheet.ts` (`captureWorkbookCellWriteState`, `restoreWorkbookCellWriteState`, `beginWorkbookCellWriteBatch`, `finishWorkbookCellWriteBatch`, and `discardWorkbookCellWriteBatch`). Cells are copied as shallow cell records; the graph snapshot copies formula nodes, predecessor edges, range watchers, volatile membership, and exact dirty membership.
- Cell mutations and dependency updates: `packages/core/src/worksheet.ts` (`setCellValue`, `setCellFormula`, `clearCellContent`, `clearCellFormula`, `setCellStyle`). The five Workbook operations replace top-level cell value/formula/style state; they do not mutate an existing nested value in place.
- Input ownership: `cloneWriteData()` in `packages/core/src/workbook.ts` accepts primitives, dense arrays, and plain data objects; it detaches/freezes values and styles staged through the authorized transaction context. Rich-text and entity values are plain nested data shapes.
- Style interning and release: `packages/core/src/StyleCache.ts` (`intern`, `release`, `removeFromBucket`). A style with a zero reference count is removed from its strong-reference bucket.
- Failure injection: `packages/core/src/workbookMutationTestHooks.ts`, a non-barrel internal module. It can fail between operations and before rollback; no production API or Worksheet private-field mutation is used.

## State coverage matrix

| State or guarantee | Evidence | Finding / boundary |
| --- | --- | --- |
| Values, formula text, and cached result values | Expanded mixed-operation rollback test fails after all five supported operation kinds have applied; nested entity-value rollback test also passes. | Restored from captured cell records. The formula result is restored as stored cached value; this does not verify a formula evaluator recalculation. |
| Formula nodes, direct dependencies, and range watchers | Mixed rollback checks precedents/dependents and a range formula; nested-value test checks precedents. Source snapshot copies formula nodes, predecessor lists, and ranges. | Covered for transaction application failures between operations. No injected failure inside an individual Worksheet mutation helper. |
| Volatile registrations | Failure test records `volatileCount` before and after a formula-target state change and rollback. Source snapshot copies the volatile set. | Count and registration retention are verified; the owner guard correctly prevents a retained raw Worksheet from invoking `flushVolatiles` after adoption. |
| Dirty/recalculation membership | Mixed rollback records `dirtyCount` and verifies a previously clean formula remains clean; nested rollback records the exact count. Source copies and restores the dirty set. | Public checks do not enumerate the exact internal dirty set; exact membership restoration is supported by source inspection plus representative behavior. |
| Style identity and cache references | Red/green replacement regression covers three sequential styles on one cell. A rollback-after-allocation test verifies provisional reference release and original style contents. | The cell style is internally canonical. Public owner reads detach style results, so the tests do not claim public reference identity. |
| Retained detached read results | Nested entity value is read before a failed update; the retained result and restored owner read remain equivalent. | Confirms the tested nested object is not altered by replacing a cell value and rolling back. |
| Buffered mutation events | Mixed rollback and two-Worksheet rollback require zero observed events. | No committed event publishes for a cleanly rolled-back transaction. |
| Multi-Worksheet rollback | Two participating sheets are changed, the third operation fails, and both prior values are restored with no events. | Exercises the Workbook's all-participant snapshot/restore path. |
| Rollback failure and health transition | Existing injection causes rollback to fail; both operation and rollback errors remain available, health becomes recovery-required, and queued/later writes reject. | Covered. No repair/recovery API is part of PKG-01. |
| Queue progress after ordinary failure | Four queued operations alternate injected failures and success. | Later requests continue after clean rollback. |
| FIFO and cross-Workbook isolation | Existing FIFO tests and a 100-request burst preserve event order; another Workbook progresses while one queue is suspended. | Per-Workbook serialization is observed in the focused tests. |
| Async callback and retained context | Suspended callback queues an independent operation; transaction context use after completion throws. | Late context cannot stage a write. |
| Queue self-await | Test awaits `mutationPort` from within the active transaction, observes it remain pending, then disposes the Workbook to release the queue. | The documented self-await hazard is real. No runtime guard was added because the queue cannot distinguish safe fire-and-forget use from an awaited independent request without broader async-context machinery. |
| Disposal with suspended transaction | Existing test disposes while callback awaits; active and queued promises reject, late context is revoked, and no staged write applies. | Cancellation before commit is covered. |
| Disposal during event publication | Existing test confirms committed state remains, while disposal stops later events/observers. | Disposal after commit does not reverse state; it prevents remaining publication and queue work. |
| Observer failures and observer-generated writes | Existing test throws from one listener and queues a separate write; another listener still runs, commit remains, and the queued write completes. | Observer errors do not reverse committed state. |
| Commit generation/history | No Workbook transaction generation or history API is present in the inspected path. | Not applicable to the present five-operation surface; no generation/history guarantee is claimed. |

## Reproduced correctness defect and bounded correction

Before the successful-commit release loop was added, the new repeated-style replacement regression failed: one suite failed, one test failed, and 15 were skipped by the focused name filter. Three assignments in one successful transaction produced zero `StyleCache.release()` calls, although `StyleCache.intern()` increments a reference for each staged style. Therefore the displaced initial style and intermediate styles remained strongly retained by the cache bucket.

The bounded correction releases each `previousStyle` from buffered `style-changed` commit events after the commit point and before event publication. On rollback, the original references remain in the restored cell state and the already-existing rollback path releases every provisional prepared style. The full focused selection is green after the fix. This does not change public APIs or extend the supported mutation families.

## Shallow snapshot assessment

For the five transaction operations, the current synchronous apply stage assigns a staged value, formula, or interned style to the cell record; it does not mutate old rich-text/entity nested data in place. Staged rich-text/entity values are detached and frozen by `cloneWriteData()`. A shallow cell-record snapshot therefore retains the pre-transaction value/style references needed to restore that record, while the formula graph and dirty metadata are separately copied.

This conclusion is bounded to the inspected five-operation apply path. The tests cover a nested entity value and nested rich-text replacement, not every import/adoption path or arbitrary future Worksheet side effect. A future operation that mutates nested cell data in place, mutates dimensions/visibility, or introduces async work during apply would require extending the snapshot/journal coverage.

## Verification

Commands, run with Node `v24.22.0` and npm `11.19.1`:

```sh
NODE_OPTIONS=--experimental-vm-modules npx jest --config packages/core/jest.config.cjs --runInBand packages/core/__tests__/workbook-mutation-queue.p1-pkg-01.test.ts packages/core/__tests__/workbook-owned-escape.test.ts packages/core/src/__tests__/transaction-enforcement.test.ts
npm run typecheck --workspace @cyber-sheet/core
git diff --check
```

Focused result: 3 suites passed, 43 tests passed after the multi-Worksheet case was added. Core typecheck passed. `git diff --check` passed. The Jest run emitted the existing ts-jest `globals` deprecation and TS151001 `esModuleInterop` advisory, plus Node's experimental VM Modules warning. The full Core suite was not run.

## Residual limits

- Full cell and dependency-state snapshots scale with worksheet state; measured costs are reported separately.
- Fault injection fails between public operations or before restoration, not inside individual storage/DAG writes.
- There is no runtime self-await detection.
- Peak memory and browser behavior were not established.
- The Workbook disposal path's broader cache/Worksheet object lifetime is not redefined here.
- Formula calculation itself is not part of the PKG-01 benchmark fixture.

No ledger disposition, frozen register, reconciliation status, acceptance baseline, renderer, pivot, or persistence file was changed. Overall R1 acceptance remains WITHHELD.
