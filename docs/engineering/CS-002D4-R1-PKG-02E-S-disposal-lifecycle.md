# CS-002D4-R1 PKG-02E-S — Workbook Event Subscription Lifecycle

**Status:** Proposed lifecycle contract; implementation is not authorized in this package.

## Current behavior from source and PKG-02D characterization

| Lifecycle action | Current behavior |
| --- | --- |
| No subscriber | No Worksheet listener is installed for an inactive lazy Workbook bridge. |
| First subscriber to a bridged event | `EventBus.on()` activates the bridge; `WorkbookEventBridgeManager` installs one Worksheet listener on each current Worksheet for that event. |
| Additional subscriber | Shares the existing event bridge; it does not install a second Worksheet listener. |
| Non-final unsubscribe | Removes that callback but keeps the event bridge and Worksheet listeners active. |
| Final unsubscribe | Deactivates the bridge and disposes its Worksheet listeners. |
| Re-subscribe after final unsubscribe | Activates a fresh bridge and listener set. |
| `Workbook.dispose()` with active subscriptions | Stops event publication via `shouldContinue`, but does not call `EventBus.removeAll()`; bridge Worksheet listeners remain until explicit unsubscribe. |
| Repeated Workbook disposal | `Workbook.dispose()` returns immediately after the first call. |
| Subscribe after disposal | Currently accepted by the facade and may install Worksheet bridge listeners, although future dispatch is suppressed. This is an unclosed lifecycle gap. |
| Unsubscribe after disposal | Current explicit unsubscribe deactivates its bridge; repeated calls are harmless. |
| Disposal during publication | The active callback can dispose the Workbook. `shouldContinue()` then stops later listeners and commit events. State was already committed. |

PKG-02D's focused tests directly verified lazy install, shared subscription, final unsubscribe/re-subscribe, disposal during publication, and the fact that active bridge listener handles remain undisposed after Workbook disposal until explicit unsubscribe.

## Proposed disposal contract

1. The Workbook owns its internal EventBus and all active bridge listener handles.
2. First `Workbook.dispose()` marks disposed and immediately calls internal `EventBus.removeAll()` once. This deactivates every active bridge, releases its Worksheet subscription handles, and clears public listeners before queued mutation cancellation finishes.
3. A Workbook disposed during an event callback immediately ends current publication after that callback. The committed state remains committed; no later listener or event in the publication journal runs.
4. Repeated Workbook disposal is safe and does not re-run teardown.
5. Public `eventBus.on()` and `once()` after disposal should fail synchronously with `WorkbookOperationCancelledError`, consistent with Workbook operations rejecting after disposal. This exact behavior needs API-owner approval because EventAPI currently has no disposed-state contract. `off()` and previously returned unsubscribe closures should remain safe and idempotent.
6. Cleanup is instance-local. Disposing one Workbook must not remove listeners or bridge state from another Workbook.
7. Standalone Worksheet listener lifecycle is unchanged. The Workbook must release only listener registrations created by its own active bridges; it must not clear unrelated Worksheet subscribers.

## Required lifecycle tests

The acceptance suite must instrument Worksheet listener disposables and prove they are each called once on final unsubscribe and once on Workbook teardown, including teardown while the queue is active. It must also prove disposal reentrancy, active EventBus dispatch stop, no event after disposal, post-dispose subscription rejection, repeated disposal idempotence, and isolation between two Workbooks subscribed to the same event name.

## Source ownership for eventual implementation

- `packages/core/src/EventBus.ts`: bridge activation/deactivation and `removeAll()` semantics.
- `packages/core/src/eventBridge.ts`: ownership and idempotent teardown of Worksheet bridge subscriptions.
- `packages/core/src/workbook.ts`: public EventAPI facade and first-dispose cleanup ordering.
- `packages/core/__tests__/EventBus.workbook-bridge.test.ts` and a focused PKG-02E bridge-lifecycle suite: observable lifecycle tests.

No source or tests are modified by PKG-02E-S.
