# CS-002D4-R1 PKG-02F — EventBus reentrancy investigation

## Starting state

Starting revision: `88b09634f17f3b39d88a88c5428f76b426459a2b`. At the start of PKG-02F, the shared worktree contained 371 dirty paths from earlier work. Those changes were preserved; PKG-02F did not reset, stage, or commit the worktree.

## Reproducer and result

Added `packages/core/__tests__/eventbus-reentrancy.p1-pkg-02f.test.ts` and first ran the same-event nested-emission regression against the pre-correction EventBus implementation. The red run reported one suite failed and one test failed: a `once('pulse', ...)` callback received `outer`, emitted `pulse` synchronously with `nested`, and was invoked a second time with `nested` before its original invocation returned.

This confirmed the suspected defect. In both ordinary live-Set dispatch and isolated snapshot dispatch, removing the wrapper after calling user code leaves a window for a nested emit to find it. Snapshot dispatch introduces a second case: a wrapper already copied into an outer dispatch snapshot may still be visited after a nested emit removes it from the live set.

## Correction

In `EventBus.once`, the wrapper now has a private `consumed` flag. On first invocation it marks itself consumed and removes itself from the event set before calling user code. Later visits to the wrapper return immediately. The flag protects against outer dispatch snapshots; removing first prevents nested emits from discovering the listener. No public signature, event name, payload, or dispatch queue changed.

The red reproducer is now green. Additional tests cover nested emission of the same and another event, multiple one-shot listeners, a throwing callback under listener isolation, ordinary plus one-shot listeners, sequential emission, and explicit `off` before emission.

## Dispatch mutation semantics characterized

- Without listener-error isolation, `EventBus.emit` iterates the live `Set`. Removing a not-yet-visited listener skips it; adding a listener during dispatch can make it eligible in that dispatch. Self-removal takes effect immediately. Nested emit observes the current live set.
- With listener-error isolation, `emit` iterates a snapshot. A listener removed after snapshot creation remains eligible in that current dispatch; additions are absent from that snapshot. A nested emit takes a fresh snapshot and sees the changed live set. The consumed guard prevents a one-shot wrapper already in a snapshot from executing twice.
- An isolated listener exception is reported and does not block later eligible listeners. A throwing `once` subscription is already consumed and cannot be rearmed by the exception.
- Workbook disposal uses the isolated mode's `shouldContinue` guard. Disposal clears subscribers/deactivates bridges, and the current EventBus dispatch stops before invoking another subscriber.

The test run initially caught expectation mistakes in the new tests (including ordinary listeners continuing during a nested emit). Those assertions were corrected to match the observed dispatch rules; the original product red reproducer remains documented above and was fixed by the production change.
