# CS-002D4-R1 PKG-02E — Workbook dimension events and EventBus disposal

## Scope

Implemented the separately authorized PKG-02E slice for Workbook-owned row-height and column-width transactions. The change is limited to typed Workbook events for these existing staged operations and cleanup of Workbook-owned EventBus subscriptions during disposal. It does not forward generic `sheet-mutated` events and does not add an Application bridge.

## Implementation

- `packages/core/src/EventBus.ts` exports `WorkbookRowHeightChangeEvent` and `WorkbookColumnWidthChangeEvent`. `EventAPI` keeps generic string events compatible as `unknown`, while the two new literal names provide strongly typed payloads.
- `packages/core/src/workbook.ts` records a typed publication entry from each staged `setRowHeight` or `setColumnWidth` operation. The Worksheet setter's buffered `sheet-mutated` event enters the commit stream first; after the setter returns, its matching Workbook typed event is appended. Commit publication therefore follows staged operation order and places the typed notification after the corresponding Worksheet notification.
- Repeated and same-value staged writes each publish one typed event, matching the existing one-Worksheet-event-per-write behavior.
- A failed transaction publishes neither Worksheet nor Workbook events. This is verified under both Journal and Snapshot strategies.
- `Workbook.dispose()` marks the instance disposed, invokes internal EventBus `removeAll()` to deactivate active bridges and clear subscribers, then continues cancellation and existing lifecycle cleanup. `on` and `once` reject after disposal with `WorkbookOperationCancelledError`; `off`, unsubscribe closures, and repeated disposal remain safe.
- The PKG-02D bridge lifecycle test now asserts that Workbook disposal deactivates its owned bridge listeners.

## Changed task files

- `packages/core/src/EventBus.ts`
- `packages/core/src/workbook.ts`
- `packages/core/__tests__/workbook-dimension-events.p1-pkg-02e.test.ts` (new)
- `packages/core/__tests__/workbook-event-contract.p1-pkg-02d.test.ts` (disposal expectation updated)

The baseline revision was `88b09634f17f3b39d88a88c5428f76b426459a2b`. The repository already had 366 dirty paths before this task; they were preserved and are not attributed to PKG-02E. The final status count is 371, accounting for the five new task artifacts (one test and four reports).

## Evidence

Focused verification passed: 8 suites, 150 tests. Core package `tsc --noEmit` passed. Focused-test marker hygiene passed, and `git diff --check` passed. The 237-entry PKG-01K protected sidecar manifest matched before and after focused test execution and restoration. No full Core suite, build, renderer/browser check, or acceptance-baseline recapture was run.

See [event compatibility review](CS-002D4-R1-PKG-02E-event-compatibility.md), [verification](CS-002D4-R1-PKG-02E-verification.md), and [D5 disposition](CS-002D4-R1-PKG-02E-D5-disposition.md).

Overall CS-002D4-R1 acceptance remains **WITHHELD**.
