# CS-002D4-R1 PKG-02E-S — Implementation Readiness Decision

## Disposition

**READY WITH PREREQUISITES** for a separately authorized implementation package. PKG-02E-S itself is documentation-only and does not authorize or perform implementation.

The bounded technical direction is implementable without changing Worksheet events: source the new event from each explicit staged dimension operation, keep one ordered transaction publication journal, and emit the typed Workbook event only after commit and after that operation's Worksheet observer dispatch. Workbook disposal can use the existing internal `EventBus.removeAll()` to release Workbook-owned bridge listeners.

## Proposed event contract

| Event name | Proposed payload |
| --- | --- |
| `row-height-change` | `{ worksheetId: WorksheetId; row: number; heightPx: number }` |
| `column-width-change` | `{ worksheetId: WorksheetId; column: number; widthPx: number }` |

Only successful Workbook-owned `setRowHeight` and `setColumnWidth` staged calls qualify. Standalone Worksheet setters keep their current direct generic `sheet-mutated` event. Existing Worksheet event shape and existing Workbook Cell/Style names/payloads remain unchanged. Application forwarding remains separate under D5-05.

## Acceptance-test matrix

| ID | Acceptance test | Expected result |
| --- | --- | --- |
| E2S-01 | Subscribe to each proposed event; perform one row and one column operation on distinct sheets | Exact names, branded `worksheetId`, correct row/column and committed value |
| E2S-02 | No subscribers, then mutate dimensions | No Workbook event bridge listener or notification is retained/produced |
| E2S-03 | First subscriber per event type with two Worksheets | Exactly one owned bridge route for the event; no duplicate per subscriber |
| E2S-04 | Add second subscriber, remove first, publish | Both initially receive once; after non-final unsubscribe only remaining listener receives once |
| E2S-05 | Remove final subscriber, then resubscribe | All prior bridge disposables released; exactly one fresh route installed |
| E2S-06 | Two same-value writes and multiple repeated writes to one dimension | One typed event per successful staged call with each staged value preserved |
| E2S-07 | Interleave value, row, width, style, and other dimension operations across sheets | Worksheet and Workbook events follow global stage order; each dimension's Worksheet event completes before its typed Workbook event |
| E2S-08 | Observe values during transaction callback/staging | No Worksheet commit notification or Workbook typed event before commit |
| E2S-09 | Inject a clean failure after earlier mixed writes | Exact rollback; no success events on either surface |
| E2S-10 | Subscribe to both dimension types and execute mixed writes | Each operation emits only its matching typed name once; generic Worksheet events do not create duplicates |
| E2S-11 | First listener throws; later listener observes | Error is reported; later listeners run; committed state remains |
| E2S-12 | Dispose with active bridges | Every Workbook-owned Worksheet subscription is detached; unrelated Worksheet listeners remain |
| E2S-13 | Dispose from first callback during publication | Current committed state remains; later listeners and event records stop immediately |
| E2S-14 | Call dispose repeatedly | No duplicate teardown or exception |
| E2S-15 | Subscribe after disposal | Approved synchronous rejection behavior; no bridge/listener is installed |
| E2S-16 | Unsubscribe repeatedly and after disposal | Idempotent; no exception or leaked listener |
| E2S-17 | Subscribe two Workbooks to same event names; dispose one | Only disposed Workbook's listeners detach; the other Workbook still publishes |
| E2S-18 | Run identical dimension sequence under Journal and Snapshot | Same event names, payloads, counts, commit timing, and order |
| E2S-19 | Existing cell/formula/style bridge regression | Existing names and payloads remain unchanged |
| E2S-20 | Existing `WorkbookSheetView.on` and renderer dimension invalidation | Generic Worksheet events and renderer behavior remain unchanged |
| E2S-21 | Standalone Worksheet dimension setters | Existing direct generic event behavior remains; no Workbook event is emitted |
| E2S-22 | Event listener enqueues a later mutation | Later request remains queued after current synchronous publication; no queue self-await redesign is claimed |

## Required owner decisions / dependencies

1. **Workbook/API event owner approval:** approve names `row-height-change` and `column-width-change`, payload field `worksheetId: WorksheetId`, typed event-map/export approach, and one-notification-per-staged-call semantics.
2. **Disposed subscription policy:** approve the proposed synchronous `WorkbookOperationCancelledError` behavior for `on`/`once` after disposal (or explicitly choose another policy). Current code has no Workbook event subscription disposal contract.
3. **D5 level ordering:** confirm whether Sheet → Workbook requires all Worksheet observers to complete before Workbook observers for existing Cell/Style events. Current lazy bridge executes during Worksheet listener dispatch, so global cross-level order can depend on listener registration. If strict ordering is required, separately authorize the compatibility correction; do not silently change existing events in the typed-dimension implementation.
4. **D5-05:** Application event authority, schema, and migration remain separately unresolved. They do not prevent an approved bounded Workbook bridge, but the three-level D5 route cannot be called complete without them.

Once items 1–3 have recorded owner decisions, implementation can be separately authorized. D5-05 is required only for claiming/implementing Application-level propagation, not as an implied expansion of this Workbook-only slice.

## Verification actually performed

- Read-only source and document review of D5-01–D5-05, D2-01/D2-08/D2-11, PKG-02A/B/C/D reports, and relevant Core event, Workbook, Worksheet, and view implementations.
- Recorded starting revision `88b09634f17f3b39d88a88c5428f76b426459a2b` and 362 pre-existing dirty worktree entries. No tests/builds ran because this checkpoint authorizes planning only.
- `git diff --check` passed; all four new reports were also checked for trailing whitespace.
- Protected Core manifest path: `docs/engineering/CS-002D4-R1-PKG-01K-core-sidecar-sha256.txt`; manifest SHA-256 `a6b89cdc3ccd8bfc8c054e5fafcb4dc84ed9ba1347eb2597a3e7bef938969b6c`; its 237/237 listed file hashes matched.
- `packages/core/src/workbookMutationStrategy.ts` still declares `'journal'` as the production default. Ledger/register files were not edited.
- No code, test, ledger, register, sidecar, or historical manifest changes were made.

## Scope boundary

No bridge implementation, public event interface, test, Worksheet event change, mutation family, Journal/Snapshot change, renderer change, persistence change, Pivot API, merge, release, or R1 acceptance promotion is included. Overall CS-002D4-R1 acceptance remains **WITHHELD**.
