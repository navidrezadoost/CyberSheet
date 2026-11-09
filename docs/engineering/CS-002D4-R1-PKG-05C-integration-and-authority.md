# CS-002D4-R1 PKG-05C — Integration and authority reconciliation

**Scope:** Independent reconciliation of existing PKG-03/04 evidence and supplied user review evidence. No tests were rerun and no source, test, or other documentation file was changed in this lane.

**Baseline:** Git HEAD `88b09634f17f3b39d88a88c5428f76b426459a2b`; 410 dirty status entries were present when PKG-05C began. Existing shared-worktree changes were preserved.

**Overall CS-002D4-R1 acceptance:** WITHHELD.

## Integration evidence revalidated

The findings below are rechecked against the existing PKG-03C and PKG-04 reports. These are reported prior results, not fresh verification by PKG-05C.

| Boundary | Existing evidence | Limit |
| --- | --- | --- |
| Seven authorized mutation kinds | PKG-03C's serialized 11-suite selection passed **170/170**. The PKG-02C differential suite compares Journal and Snapshot behavior. The mixed transaction selection covers value/formula writes and clears, style, row height, and column width across sheets. | No eighth operation was introduced. Snapshot was selected through test hooks; production strategy remains Incremental Journal. This is not a full Core baseline. |
| Commit and rollback events | The selection includes Workbook event/bridge and dimension-event tests, plus mixed-operation rollback cases. Successful staged writes publish after the commit point; rollback suppresses staged notifications. Listener failures are isolated under the tested event surfaces. | Event assertions cover documented per-surface and staged operation behavior. They do not impose a universal cross-layer callback-completion order; D5-01 Option C remains proposed, not approved. |
| FIFO and disposal | The selection includes `workbook-mutation-queue.p1-pkg-01.test.ts`, `EventBus.test.ts`, and `eventbus-reentrancy.p1-pkg-02f.test.ts`. PKG-02F records nested dispatch, corrected `once` behavior, listener isolation, and disposal behavior; queue tests cover queued mutation cancellation on Workbook disposal. | The shared FIFO self-await limitation remains separately unresolved. Prior coverage does not close that limitation or establish new guarantees outside the tested calls. |
| Journal/Snapshot comparison | The seven-operation differential suite and row/column dimension transaction regressions exercise both strategies by existing test hooks, including mixed state, staged events, rollback, sparse dimension entries, and recovery classification. | This does not establish comment-operation rollback parity. PKG-04 explicitly left comment graph restoration pending. |
| Existing comment behavior | PKG-04B's focused standalone comment/bridge test joined the selection: **12 suites, 173/173 tests passed**. It covers standalone cascade/no-op behavior and the existing lazy comment-event mapper. | It does not execute Workbook-owned comment deletion, commit/rollback for comments, or owner-approved API semantics. |

The primary PKG-03C result is **11 suites / 170 tests passed**, with protected source-sidecar hashes checked before and after. PKG-04B's expanded result is **12 suites / 173 tests passed**, also serialized after reversible source-sidecar isolation. PKG-04B additionally reports Core typecheck, focused-test hygiene, and `git diff --check` passed. PKG-05C did not repeat those commands.

## Generated source-sidecar hazard and integrity classification

PKG-03C records an initial, unisolated attempt at its 11-suite selection: **10 suites / 133 tests failed and 1 suite / 37 passed**. The failures were runtime missing-method errors (`DependencyGraph.beginMutationJournal` and `setMutationFailureInjector`) because generated source-side JavaScript shadowed current TypeScript. After parking the nine generated source groups, running Jest serialized with `--runInBand`, and restoring them through the reversible procedure, the same selection passed. Classify the initial result as a module-resolution/test-environment hazard, not a transaction regression and not a Pivot failure.

The protected manifest at `docs/engineering/CS-002D4-R1-PKG-01K-core-sidecar-sha256.txt` has 237 entries and SHA-256 `a6b89cdc3ccd8bfc8c054e5fafcb4dc84ed9ba1347eb2597a3e7bef938969b6c`. PKG-03C reports identical before/after manifest output (237/237); PKG-04B reports all 237 entries passing before and after its Jest window. Those reports establish preservation for their respective runs. PKG-05C did not touch or rehash sidecars.

## Historical Core and Pivot failures remain separate

PKG-03C's historical classification preserves distinct failure stages from PKG-01J/PKG-02C:

- Seven suites were compile-blocked by test/API type mismatches, including mutable `Worksheet` assumptions for `WorkbookSheetView` and absent private/internal Pivot accessors. Those suites executed **zero tests**.
- Eighteen Pivot formula integration cases failed during fixture setup when post-publication `Workbook.addSheet()` rejected. Registration and intended assertions were not reached.
- One BT-2 merged-read identity assertion did execute and fail on reference identity, while serialized contents were equal. This is a separate read-contract issue, not a transaction path.
- The PKG-02C snapshot integration retry also failed at TypeScript diagnostics for absent Pivot registry/store accessors and executed **zero tests**.

The bounded standalone Pivot selection later passed **3 suites / 50 tests**, but it does not exercise Workbook-owned registration, lifecycle, source-sheet integration, or publication. These historical compile/setup/assertion outcomes were not rerun or repaired in PKG-05C. They are not evidence that Workbook Pivot integration is green, nor are they attributed to the sidecar hazard.

## User review evidence and authority boundary

The PKG-05 user directive explicitly asks that review and approval of the PKG-04 documentation be recorded as user-provided review evidence. PKG-05C records that instruction as project-user review evidence for PKG-04 artifacts. It is **not** evidence of a designated Workbook/API, Worksheet/API, or D5 contract owner; does not establish delegated authority to amend D5-01 or decide D5-05; and is not formal contract approval or production implementation authorization.

The existing PKG-04C consolidated C1–C5 request and authorization-status record remain accurate. PKG-05C found no new attributable owner designation, authority basis, approved channel, or decision response. Accordingly, no edit to the consolidated C1–C5 packet is warranted. C1 remains unverified; D5-01 Option C remains proposed and pending owner decision; D5-05 remains a distinct unresolved contract; comment-operation contract approval remains separate from implementation authorization; and no eighth mutation is authorized.

## Handoff

PKG-05C reconciles existing seven-operation and governance evidence only. It makes no metadata-policy selection because that belongs to the PKG-05A technical evidence, and it makes no new comment readiness claim. The comment graph/exact-restoration results from PKG-05A and executable comment regressions from PKG-05B must be considered by PKG-05R together with this evidence. Any future implementation still requires the applicable attributable owner/contract decisions and a separate explicit bounded authorization.

No external transmission or owner approval is claimed. No production change, eighth operation, Application forwarding, Pivot API, persistence change, merge, release, or overall acceptance promotion is authorized. Overall CS-002D4-R1 acceptance remains **WITHHELD**.
