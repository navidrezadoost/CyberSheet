# CS-002D4-R1 PKG-08B — Seven-operation regression expansion

## Scope and change boundary

This lane adds one focused Core test file, `packages/core/__tests__/workbook-seven-operation-observer-isolation.p1-pkg-08b.test.ts`. It does not modify production code, transaction test hooks, existing tests, public event schemas, or operation inventory. The test uses the existing `Workbook.transact`, `WorkbookSheetView`, EventBus, and `setWorkbookMutationTestHooks` APIs, and runs the same scenario under the existing Journal and Snapshot strategies.

No Jest invocation was run in this lane because PKG-08 verification serializes Core runs that can touch the shared generated source sidecars. The coordinator should execute this file in the approved serialized verification selection and report its actual result. Typecheck is likewise left to the coordinator's integrated gate.

## New acceptance evidence

The new test stages all seven existing operation kinds in one transaction spanning two attached Worksheets: value write, formula write, content clear, formula clear, style write, row-height write, and column-width write. It installs throwing and later-observer listeners on the Workbook EventBus for cell-value and row-height notifications, then checks that later listeners ran and that the reporter observed the corresponding failures.

After the transaction resolves, it verifies the committed values on both views, the formula and its precedent/dependent links, formula/content clears, interned style, row height, column width, and healthy mutation state. It also checks that each Worksheet observed at least one event. Assertions are per event surface; the test makes no claim about relative callback completion order between Worksheet and Workbook EventBus observers.

The test adds integration evidence for observer-failure isolation during a mixed multi-Worksheet commit. It does not inject a failure during the mutation phase and therefore does not add rollback evidence. The existing differential, dimension, event, and mutation-queue tests remain responsible for Journal/Snapshot equivalence, late rollback and exact state restoration, sparse dimension entries, queue disposal, bridge lifecycle, no-op/frequency behavior, and other reentrancy cases.

## Verification handoff and limits

- New test cases authored: 2 (Journal and Snapshot parameterizations); execution result pending coordinator verification.
- Production behavior/API changes: none.
- Workbook comment deletion: not included.
- Protected sidecars: not touched by this lane; verify around serialized Jest runs at the integrated gate.
- Overall CS-002D4-R1 acceptance remains **WITHHELD**.
