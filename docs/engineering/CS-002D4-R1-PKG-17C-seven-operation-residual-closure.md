# CS-002D4-R1 PKG-17C — Seven-operation residual closure

**Scope:** Review the existing StyleCache reference-lifecycle evidence (C1) and add a focused characterization for the immediate post-write fault cut of `clearCellContent` and `clearCellFormula` (C2). No production code, public API, mutation operation, contract, or owner decision changed. The lane author did not run Jest. The coordinator's first shared selection exposed four incorrect merged-member expectations; after correction, the serialized 24-suite selection passed 308/308 tests. The first result is preserved in PKG-17E as a test-authoring correction, not a production failure.

## C1 — StyleCache reference lifecycle

**Finding: no leak or incorrect release is demonstrated by the available evidence.** The current source implements structural-style interning with per-style reference counts and removes a style from its strong bucket when its tracked count reaches zero (`packages/core/src/StyleCache.ts`, `intern()` and `release()`). Workbook mutation source interns staged styles before apply, releases provisional references on successful rollback, and releases displaced references after commit. These paths are consistent with the source comments and existing bounded tests; source inspection alone is not a runtime proof of private reference-count correctness.

Existing executable coverage already observes the relevant supported call paths:

- `packages/core/__tests__/workbook-mutation-queue.p1-pkg-01.test.ts:640` checks that Journal and Snapshot commits call `release` once for each displaced style reference in a repeated-style transaction.
- The same file at line 670 checks rollback releases provisional styles while retaining the original public style state.
- The same file at line 984 injects a failure immediately after style allocation and checks provisional release, exact public state restoration, and inactive journal state for both strategies.
- PKG-02C, PKG-08B, PKG-12A, and PKG-13B provide adjacent style commit, event, merged-member, and rollback evidence, as mapped in PKG-16B.

Those tests spy on `StyleCache.release` calls and observe public cell/snapshot state. They do **not** inspect the Workbook's private cache reference counts, prove canonical-style refcount equivalence against every live cell, or show bucket removal/retention for every interning and restoration path. The exported StyleCache's `size()` and metrics report unique cache entries, not per-style reference counts, and are not an oracle for the private Workbook cache. No leak has been reproduced. D2-11 residual R03 therefore remains unchanged: exact private count correctness is unverified, and no public getter or test-only production hook is added here.

## C2 — Immediate post-clear fault cut

Added `packages/core/__tests__/workbook-clear-cell-immediate-fault-cuts.p1-pkg-17c.test.ts`. The original four cases target the existing `after-cell-record` seam immediately after the clear write and before dependency cleanup: `clearCellContent` × Journal/Snapshot and `clearCellFormula` × Journal/Snapshot. Each fixture starts with an existing, populated, formula-bearing styled cell (`B1`, formula `=A1+1`) and its direct dependency (`A1`). Thus these four cases exercise existing formula-bearing cells only. Four additional fault cases exercise the same two operations and strategies through merged member `B2`, with effective storage at anchor `A1`. Four more cases characterize absent-cell no-op behavior for both operations and strategies; they expect the `after-cell-record` seam not to be reached. Overall, the test file now contains eight immediate fault cases and four no-op cases.

| Requested coverage shape | Covered? | Evidence boundary |
| --- | --- | --- |
| Existing populated formula-bearing cell | Yes | The original four fault cases target B1 with a value, formula, style, and direct A1 dependency. |
| Absent cell | Yes, no-op only | Four cases cover both clear operations under both strategies; the seam is not reached, so these are not injected fault cuts. |
| Existing value-only cell | No | No non-formula content-clear case is included. |
| Existing formula-bearing cell | Yes | Both ordinary-coordinate cases and merged-member cases exercise formula-bearing state. |
| Merged member address | Yes, fault cases | Four cases request member B2; after rollback, public `getCell(B2)` must alias anchor A1 while raw `forEachNonEmptyCell` state has no separate B2 record. Formula and dependency remain at A1. |
| Existing empty/no-op cell | No | No pre-existing allocated cell with empty content or absent formula is characterized. |

The injected exception occurs immediately after the target cell record changes and before the clear path proceeds to dependency cleanup. Each case asserts:

- the intended hook fired and the injected error propagated;
- the full captured non-empty cell state and dependency-graph state match the before image;
- no Worksheet event was published;
- Workbook mutation health is healthy after rollback; and
- the write journal is inactive with no retained before-images.

The eight fault cases cover the immediate post-cell-record boundary for ordinary and merged-member coordinates in existing formula-bearing cells. The absent-cell cases are explicitly no-op characterization: because the Worksheet returns before writing a cell record, an immediate post-clear injected failure cannot occur at `after-cell-record` for that input. Omitted cases include value-only `clearCellContent`; an allocated but already-empty cell; a formula-free allocated cell for `clearCellFormula`; merged-anchor requests as a separate address; injected faults after dependency cleanup, FormulaEngine notification, recalculation notification, and event buffering; volatile/range-watcher graph combinations; and restore/discard failure paths. It does not establish every formula graph shape or phase, or global D2-11 completeness. It adds no new seam.

**Initial coordinator execution and correction.** The initial 24-suite selection reported 23 suites and 304 tests passing; the four failures were confined to the merged cases' assertion that `raw.getCell(member)` should be `undefined`. That expectation was incorrect because the public Worksheet read resolves a merged member to its effective anchor. The test now expects the anchor's formula/value through the member read and checks the raw `forEachNonEmptyCell` state for absence of a separate member-coordinate record, while retaining exact cell/graph before-image equality. The corrected test passed in the serialized 24-suite selection (308/308); raw initial and corrected outputs are retained in PKG-17E.

## Disposition and next evidence

No production defect was established, so no correction was made. The C2 test provides a deterministic probe of an existing supported rollback invariant. The corrected test passed; only this named clear-operation fault boundary gains direct evidence. No source correction was needed.

Private StyleCache refcount equivalence remains an explicit internal observability gap. Existing tests cover release calls and externally visible restored style state, but a stronger private-count claim requires a stable, authorized internal test oracle; this lane does not introduce one. Global D2-11 and overall CS-002D4-R1 acceptance remain **UNRESOLVED** and **WITHHELD**, respectively.
