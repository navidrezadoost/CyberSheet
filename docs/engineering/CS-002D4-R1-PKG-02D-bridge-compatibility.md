# CS-002D4-R1 PKG-02D — Bridge Compatibility and Dimension-Event Policy

## Finding

The seven operations expose two different event routes:

1. Cell value/formula/style writes emit typed Worksheet events that the lazy Workbook EventBus bridge maps to existing named events (`cell-value-change`, `cell-formula-change`, and `cell-style-change`).
2. Row-height and column-width writes emit a generic Worksheet `{ type: 'sheet-mutated' }`. It is visible to subscribers through `WorkbookSheetView.on`; the Workbook EventBus does not forward it.

The lazy bridge activates only when the first listener subscribes to a bridged named event. One Worksheet listener per current Worksheet is installed for that event; additional public subscribers share the bridge. Removing a non-final subscriber leaves it active. Removing the final subscriber disposes the Worksheet listeners; a later first subscriber installs them again. This prevents bridge listeners from being installed when no subscriber exists.

Workbook disposal stops mutation publication, including during an active publication loop. It does **not** currently deactivate lazy Workbook EventBus bridges or clear their listeners. The public unsubscribe closure does deactivate a bridge and release its Worksheet listener handles. This is a lifecycle retention limitation, not a transaction rollback failure; no disposal change is made here.

## D5 compatibility assessment

D5-01 is not silent: it approves propagation of a committed mutation's observable events from Sheet to Workbook to Application. A dimension mutation currently produces a committed observable Sheet event, so the current absence of Workbook-level delivery is not demonstrated to satisfy the broad wording of D5-01.

At the same time, D5-05 explicitly leaves stable event names/payload schema and Application-level authority unresolved. The generic `sheet-mutated` payload carries no operation, target dimension, index, or value, and forwarding every generic Worksheet event would affect many mutation families outside this package. Automatically bridging all Worksheet events is expressly unsuitable: it could create new public notifications, change frequency, or duplicate delivery.

## Recommendation

**AUTHORIZE FUTURE WORKBOOK BRIDGE** as a separately scoped contract/API decision and implementation prerequisite. Keep the current dimension events Worksheet-level for this package. The follow-up should first settle the narrowly typed dimension event name and payload, affected operation scope, compatibility/migration behavior, and whether Workbook-level observation is sufficient while D5-05's Application authority remains unresolved. It must not forward every `sheet-mutated` event.

This recommendation records a required next decision; it does not implement or itself authorize the bridge. No PKG-02D code changes the public event surface. If project/API owners choose not to add a Workbook bridge, they must reconcile that policy explicitly with D5-01 before claiming this propagation requirement complete.

## Compatibility and integration limits

- Existing named cell/style event payloads remain unchanged.
- Dimension event frequency remains one generic Worksheet event per successful staged write, including repeated and same-value writes as characterized in PKG-02A/B.
- No event escapes before commit; rollback publishes no success events.
- Listener exceptions remain isolated after commit.
- No Application event bridge, renderer redesign, public API, or new mutation family is introduced.
- The legacy Pivot snapshot integration suite remains independently compile-blocked by missing Pivot accessors. It does not establish a failure in this event contract.
- The known shared self-await limitation is unchanged and remains outside this review.
