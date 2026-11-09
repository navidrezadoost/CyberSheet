# CS-002D4-R1 PKG-21 PH1B — Transaction recovery and queue review

**Scope:** Candidate-01 source and available focused evidence. No production edits, new candidate tests, or fault hooks were added in PH1B.

## C1 — Snapshot restoration failure

The candidate exposes an internal `snapshotRestoreFailure` test hook. The existing test injects an apply failure and then throws from this hook during `applySnapshot()`, after snapshot restoration has reset stores. The Workbook preserves both error objects in `WorkbookMutationRollbackError`, reports `recovery-required`, and rejects later mutations. This establishes those public error/health observations.

It does not establish complete restore (none is claimed), event suppression on this failure path, or cleanup of the Worksheet transaction journal, transaction-active flag, graph injector, pending event arrays, and restore callback. Source inspection shows the throw exits `rollbackWorkbookMutationBatch()` before its normal cleanup statements. The failure test does not inspect cleanup. Separately, the test named “rollback itself fails” throws from `beforeRollback`; Workbook records the hook error and still executes rollback, so that test does not demonstrate a failing restoration.

Successful Snapshot rollback also has an exact-state gap: formula graph dirty-state is not included in the snapshot; graph reconstruction registers formulas as dirty and the rollback path commits that graph journal. Add a formula-bearing clean-before-image case and compare graph state. Style reference accounting under restore remains unproven.

## C2 — FIFO and transaction context

The candidate queues transactions on a promise tail and deactivates a transaction context after the callback resolves. The planned queue test path in the Phase 1 record did not exist and Jest ran zero cases. PH1B found no direct test evidence for FIFO ordering, queued cancellation, disposal of queued/in-flight work, context revocation, or nested context writes. The documented self-await limitation remains: awaiting another transaction queued behind the active callback can wait on itself. No contract or implementation change is proposed here.

## C3 — EventBus

The overlay’s 13-test suite verifies nested `once` consumption and listener exception isolation. The independent source audit found ordinary `emit()` changes from base live-Set iteration/propagated listener errors to copied listeners/swallowed errors. This also changes what happens when a listener disposes the bus during dispatch. That is a compatibility correction requirement, not a passing characterization. Dedicated disposal-during-dispatch and ordinary error-propagation cases are absent.

## C4 — D2-11 residual

The pre-adoption dispatch shadow is a materially relevant ownership residual: it can bypass the seven-operation port boundary before a Worksheet is adopted. Snapshot formula dirty-state mismatch is a second exact-state residual. Neither supports a global D2-11 closure. A separately identified successor should address these and add adversarial/fault tests before any integration consideration.
