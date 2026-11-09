# CS-002D4-R1 PKG-02D — Next Gate Recommendation

## PKG-02D disposition

The seven-operation event boundary is characterized. Journal remains the production default; Snapshot remains internally selectable. No event API, production behavior, or mutation family was changed. Overall CS-002D4-R1 acceptance remains **WITHHELD**.

## Recommended next bounded gate

Authorize a **dimension-event contract and compatibility decision** before any bridge implementation. That gate should resolve:

1. Whether row-height and column-width committed events must be observable on Workbook EventBus under D5-01.
2. A narrow stable event name/payload that identifies the affected Worksheet and dimension operation, without forwarding generic `sheet-mutated` events for unrelated mutation families.
3. Whether both cell and dimension notifications are required at the Application level now or whether D5-05 remains a separately staged blocker.
4. Compatibility behavior for existing `WorkbookSheetView.on` consumers and event frequency for repeated/same-value writes.
5. Whether Workbook disposal must deactivate all active lazy bridges automatically, or whether explicit consumer unsubscribe remains the supported lifecycle contract.

After decision-owner approval, a separate implementation authorization can add only the approved typed bridge and disposal behavior, followed by focused contract, compatibility, rollback, and lifecycle tests. This package itself does not authorize that work.

## Still outside scope

Do not add another mutation kind, globally forward Worksheet events, change Journal/Snapshot selection, alter the renderer, add Pivot registry/snapshot APIs, expand D2-11 beyond the seven operations, or reinterpret the historical Core baseline. The shared queue self-await limitation and legacy Pivot compile blocker remain independent follow-up items.
