# CS-002D4-R1 PKG-01J — Strategy Attribution

## Finding

No one of the nine failing suites executes `Workbook.#applyCellWriteBatch()` or calls `getWorkbookMutationStrategy()`. The failures therefore do not exercise a strategy-sensitive path.

| Failure family | Strategy selector reached? | Journal/Snapshot comparison | Attribution |
| --- | --- | --- | --- |
| Seven TypeScript compile-blocked Workbook/Pivot suites | No. ts-jest stops before test execution. | Not applicable: there is no runtime fixture to execute under either strategy. | TEST/CONTRACT DRIFT; ownership/view and internal-pivot-accessor mismatches are documented in the failure matrix. |
| Eighteen failed Pivot formula integration cases | No. Each fails in `beforeEach` at `Workbook.addSheet()`, which throws before pivot registration, source mutation, formula evaluation, or a transaction. | Not applicable. Injecting a strategy override would not alter this earlier lifecycle exception and would not make a meaningful A/B comparison. | TEST/CONTRACT DRIFT; the historical owner-backed lifecycle fixture is not supported by the current API. |
| BT-2 merged-cell identity assertion | No. It constructs and reads a standalone `Worksheet`; it does not create a Workbook. | Not applicable. The read identity behavior is outside the Workbook transaction strategy. | TEST/CONTRACT DRIFT against current approved D7-02 independent-object behavior; no value error is observed. |

This is an execution-path attribution, not proof that every behavior asserted by the blocked tests is correct. The relevant pivot and owner integration behaviors remain unverified until an authorized public-path fixture can reach them.

## Strategy implementation boundary

`packages/core/src/workbookMutationStrategy.ts` sets the private default to `journal`. `packages/core/src/workbook.ts:516` resolves the selected strategy in `#applyCellWriteBatch()`, and the chosen value is held for that batch. The selector is invoked only when a non-empty transaction is applied. Failed tests listed above stop before this point or do not construct a Workbook.

The PKG-01I focused selection was rerun against the current source with no strategy override supplied to the production-default path: 3 suites / 95 tests passed. PKG-01I's equivalence matrix independently exercises the explicit per-Workbook Snapshot override and the default Journal path across the five authorized cell-write operations, including rollback, events, formula/dependency state, StyleCache, queue lifecycle, and recovery-required handling. Thus the nine broad-suite failures do not negate that bounded equivalence evidence.

## Limitations

- No safe clean-tree Journal-versus-Snapshot full-suite comparison was constructed; the worktree is broadly dirty and was preserved.
- The failures are not classified as PRE-EXISTING BASELINE FAILURE solely because prior reports contain matching names. They are classified by current execution evidence and current contract/API shape.
- A future PKG-02 slice that touches sheet lifecycle, pivot registration/refresh, or merged-cell read representation needs its own approved contract and reachable public-path tests. No such slice is approved here.

PKG-02 remains unauthorized. Overall CS-002D4-R1 acceptance remains WITHHELD.
