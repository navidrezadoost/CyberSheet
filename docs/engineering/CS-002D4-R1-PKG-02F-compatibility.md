# CS-002D4-R1 PKG-02F — Compatibility review

## Production change

Only `EventBus.once` changed. It marks its private wrapper consumed and removes the wrapper from the live event listener set before entering user code. A consumed check also makes a wrapper harmless if it already exists in an isolated dispatch snapshot. Ordinary `on` subscriptions are not wrapped or otherwise modified.

This preserves the public EventBus API and PKG-02E event schemas. Workbook dimension payloads, Cell/Style event names and payloads, transaction staging, Journal default, FIFO scheduling, and Application event behavior were not changed.

## Exception and disposal behavior

Under listener-error isolation, a thrown one-shot callback is reported once, remains consumed, and does not prevent later eligible listeners from running. Without isolation, callback exceptions continue to propagate as before, but the one-shot listener is already removed. If a callback disposes its Workbook, disposal clears the remaining listener set and the dispatch continuation check stops subsequent subscribers. Already-committed transaction state remains committed.

## Compatibility limits

Dispatch mutation behavior intentionally remains mode-specific: ordinary EventBus iteration uses its live Set; Workbook's isolated mode uses a per-emission snapshot. The tests characterize these current rules rather than introducing a generalized dispatch model.

The change does not address D5-01 cross-level Cell/Style ordering ambiguity, D5-05 Application event authority/schema, global D2-11 completeness, or the shared FIFO self-await limitation. No full Core suite or browser behavior is claimed.
