# CS-002D4-R1 PKG-02G-S — Compatibility acceptance-test plan

**Status:** Planned cases only. No tests were added or run in PKG-02G-S; production behavior was not changed.

## Harness and common assertions

Use a Workbook with two Workbook-issued views and subscribe direct Worksheet listeners before and after activating the relevant Workbook bridge. Record a single ordered trace containing layer, observer ID, event name, payload, and a read of committed state. For transactions, assert no callback while staging and exact callbacks only after `transact()` resolves. Parameterize commit/rollback cases by Journal and Snapshot where the test hook permits. Keep standalone Worksheet mutation cases separate because they are not Workbook commit publications.

## Required cases

| Case | Setup / operation | Assertions |
| --- | --- | --- |
| Bridge registered before Worksheet observer | Activate `cell-value-change` / `cell-style-change`, then subscribe direct Worksheet listener; stage matching writes. | Capture present ordering: bridge callback can precede later Worksheet listener. Every callback reads final committed state. |
| Worksheet observer before bridge activation | Subscribe direct listener first, then activate lazy Workbook event. | Worksheet observer precedes Workbook callback. Confirm bridge is installed once and removed after final unsubscribe. |
| Multiple observers | Two Worksheet observers and two Workbook observers in both registration orders. | Exact per-dispatch registration order and exception isolation; no assertion that separate APIs share one global order under Option C. |
| Formula with multiple notifications | Stage `setCellFormula`; subscribe to both existing formula and value names in both activation orders. | One Worksheet `cell-changed`; `cell-value-change` plus conditional `cell-formula-change` for formula result. Assert payload compatibility and observed registration-dependent interleaving. Clearing formula/content yields no formula-removal event. |
| Interleaved seven-operation trace | Mix value, formula, both clears, style, row-height, and column-width writes across two sheets. | Exact global operation order; operation-specific Worksheet event and Workbook event(s); dimension Sheet-complete-before-Workbook; all callback reads reflect final committed state. |
| Multiple Worksheets | Alternate operations between Alpha and Beta. | Per-sheet and Workbook events retain global staged order; sheet IDs/addresses/payloads map to the proper view. |
| Same-value/repeated writes | Repeat dimension values and repeat effective style/value writes according to each setter's existing no-op rules. | Preserve actual existing per-operation event frequency. Dimension writes remain one pair per successful staged write; cell setter no-op guards are not changed. |
| Nested synchronous emission | In a Workbook callback, synchronously trigger a distinct/nested EventBus notification without awaiting a queued mutation. | Record exact nested trace. `once` executes at most once; ordinary event behavior remains as PKG-02F. Avoid awaiting an independent mutation from inside the active transaction slot. |
| `once` subscribers | Register multiple `once` listeners; first nests same-event emission and another event. Include a throwing one-shot listener under Workbook's isolated mode. | Each one-shot subscription is called once; error is reported; later eligible listeners continue. |
| Listener exceptions | Throw independently from Worksheet, Workbook, and diagnostic reporters. | Committed state is not undone; failures are isolated/reported; other listeners run unless disposal explicitly stops publication. |
| Disposal in publication | Dispose from an early Worksheet observer, a Workbook Cell/Style callback, and a typed dimension callback. | State remains committed; later observers/publications stop; bridge handles release; `on/once` cannot reactivate; independent Workbook still publishes. Option B must explicitly assert its changed disposal timing. |
| Clean rollback | Inject supported pre-commit failure after mixed writes under Journal/Snapshot. | No Worksheet or Workbook success callbacks escape; exact state restored; Workbook remains healthy. |
| Late subscribe/unsubscribe | Subscribe after previous last-unsubscribe; remove one of several listeners; remove final listener; repeat unsubscribe. | One bridge activation per zero-to-one transition, deactivation on one-to-zero, idempotent cleanup, no duplicate callbacks. |

## Acceptance gate

Before tests are implemented, the contract owner must select Option A, B, or C and clarify whether D5-01's arrows impose cross-layer observer completion order. If B is selected, approve timing/migration and disposal behavior. The chosen option's tests must run for both Journal and Snapshot, include the existing PKG-02D/E/F suites and seven-operation differential cases, and retain current public names/payloads unless separately authorized. This plan itself approves no code or contract change.
