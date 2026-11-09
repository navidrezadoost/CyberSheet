# CS-002D4-R1 PKG-02G-S — Cross-level event ordering matrix

**Scope:** Source and contract analysis only. No production or test files changed. Source line references below are from the PKG-02G-S review of revision `88b09634f17f3b39d88a88c5428f76b426459a2b` plus the already-dirty PKG-02E/F worktree.

## Contract baseline

The authoritative contracts state:

- D5-01: committed mutation events propagate Sheet → Workbook → Application.
- D5-02: committed-change events publish only after commit.
- D5-03: listener failures are isolated/reported and do not prevent other listeners.
- D5-04: listeners are dispatched individually in deterministic registration order; async listeners are not awaited inside the mutation slot.
- D5-05: Application event authority and stable Application event names/payloads remain unresolved.
- D2-08: one publication point follows applied journal state and required validation/recalculation; pre-publication exceptions roll back and post-publication observer errors cannot uncommit.
- D2-11: the complete transactional side-effect inventory remains a global blocker.

D5-01 names a propagation path but does not say whether the arrow requires every Worksheet observer to return before any Workbook observer begins. D5-02 and D2-08 establish the commit boundary; they do not establish cross-level callback completion ordering. D5-04 defines deterministic registration order within a dispatcher but does not define one registration sequence shared by distinct Sheet and Workbook dispatchers.

## Current publication model

`Workbook.transact()` applies staged operations in their original array order. Each buffered Worksheet event is appended to `commitEvents` by the event sink during the setter. For row/column operations, the typed Workbook record is appended after the setter returns. After commit, the Workbook iterates this list in order. A typed dimension event is therefore emitted after that operation's complete `Worksheet.publishWorkbookCellWriteEvent()` call.

For Cell/Style, `publishWorkbookCellWriteEvent()` first runs internal mutation listeners, then calls the Worksheet emitter's isolated snapshot dispatch. The lazy Workbook bridge subscribes through `worksheet.on()` and emits synchronously from that Worksheet emitter callback. Thus the relative order of a Workbook callback and other public Worksheet callbacks follows their Worksheet listener registration order. All callbacks still run after the entire transaction has committed and see final transaction state, subject to disposal stopping the remaining publication.

## Operation matrix

| Staged operation | Worksheet event | Workbook event(s) | Provenance and callback ordering | Commit visibility, reentrancy, errors/disposal, cross-Worksheet order |
| --- | --- | --- | --- | --- |
| `setCellValue` | `cell-changed` | `cell-value-change` | Workbook bridge maps the event's address, previous/current value, and formula. It is a normal Worksheet listener. Earlier direct Worksheet listeners run first; a bridge registered earlier runs first. | Transaction state is fully committed before any callback. Repeated writes remain in staged publication order; the Worksheet setter itself suppresses a same-value write when no formula is being cleared. Workbook callbacks are synchronous and reentrant; Workbook `once` is consumed before user code (PKG-02F). Observer failures are isolated. Disposal stops subsequent observers/publications. Commit-list order is global across sheets. |
| `setCellFormula` | `cell-changed` | `cell-value-change`, and `cell-formula-change` when resulting formula is non-null | Both names derive from the same Worksheet event. Their relative order follows the registration order of the two lazy Worksheet bridge listeners, interleaved with direct Worksheet listeners according to each listener's registration. | Both public Workbook notifications refer to the committed cell and final transaction state. Formula writes can therefore produce two Workbook callbacks for one Worksheet event. Reentrant, failure, disposal, and cross-sheet rules match `setCellValue`. |
| `clearCellContent` | `cell-changed` when content existed | `cell-value-change`; no `cell-formula-change` after formula removal | The value bridge maps the cell event. The formula bridge only emits when the resulting cell still has a formula. There is no named formula-removal event established here. Worksheet registration order controls cross-level observer timing. | No event for the setter's empty-cell no-op. Otherwise post-commit; current cell reads show final cleared state. Reentrant/failure/disposal and staged-order rules match `setCellValue`. |
| `clearCellFormula` | `cell-changed` when a formula existed | `cell-value-change`; no `cell-formula-change` after formula removal | Same bridge source as content clear. No distinct formula-clear notification is inferred. Registration-order behavior is unchanged. | No event if no formula existed. Otherwise post-commit; resulting formula is absent. Reentrant/failure/disposal and staged-order rules match `setCellValue`. |
| `setCellStyle` | `style-changed` | `cell-style-change` | The Workbook style bridge maps address and style from the Worksheet event and runs as a Worksheet listener. Ordering against direct Worksheet observers is registration-dependent. | State is already committed and observers see final transaction state. Repeated staged style writes retain commit-list order. Reentrant, error-isolation, disposal, and cross-sheet behavior match the value path. |
| `setRowHeight` | `sheet-mutated` | `row-height-change` | Typed payload comes from the staged operation. The Worksheet event is completely dispatched before the typed Workbook record is emitted. It does not use the generic lazy bridge. | One pair per successful staged write, including same-value/repeated writes; no pre-commit event and none on clean rollback. Subscribers can read the final dimension even for an earlier staged payload. Typed listeners are reentrant/error-isolated; disposal stops later subscribers and commit records. Global staged order is retained. |
| `setColumnWidth` | `sheet-mutated` | `column-width-change` | Same provenance and deterministic Sheet-before-Workbook completion as row height. | Same frequency, commit, rollback, reentrancy, error, disposal, and global staged-order guarantees as row height. |

### Cross-cutting details

- The Worksheet emitter uses `Array.from(listeners)` and isolated dispatch: each Worksheet listener is visited in registration order from a per-event snapshot; a thrown listener is reported without blocking the next eligible listener. Adding/removing listeners affects nested or later dispatches, not the already-created snapshot, except disposal's `shouldContinue` stops it.
- Workbook's isolated EventBus also snapshots each emission in registration order and isolates listener and reporter failures. Workbook disposal clears the EventBus and its bridge disposables; the disposed guard stops further callbacks in the active publication.
- The non-isolated standalone `EventBus` path iterates the live `Set`, so mutation visibility differs from Workbook's isolated mode. PKG-02F characterized both; it did not normalize them into one scheduler.
- All operation applications finish before `commitPointReached`; the later publication loop visits the global `commitEvents` sequence. Thus callback timing inside a Worksheet event does not expose a partially applied transaction.
- Standalone Worksheet mutations are not Workbook transactions. They publish directly on the Worksheet surface; PKG-02E's typed dimension events are emitted only from the Workbook commit path.
- Application-level propagation is not present in this Core bridge. D5-05 remains an independent blocker.
