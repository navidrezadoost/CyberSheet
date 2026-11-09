# CS-002D4-R1 PKG-01K — PKG-02 Prerequisite Matrix

**Starting HEAD:** `88b09634f17f3b39d88a88c5428f76b426459a2b`
**Starting worktree status:** 333 dirty paths; preserved.
**Production default:** Incremental Journal. Snapshot remains internally selectable.

This matrix extracts the five explicit prerequisites from the completed PKG-01J readiness report without broadening or rewriting them. “Verified” means verified only within the stated boundary; it does not imply all Core or Workbook behavior is verified.

| # | Exact PKG-01J prerequisite | Status | Evidence and boundary | Responsible area / next action |
| --- | --- | --- | --- | --- |
| 1 | Name the exact PKG-02 mutation operations; readiness cannot be generalized to an unspecified mutation family. | **OPEN** | No PKG-02 operation list or package scope is present in the reviewed PKG-01J reports. PKG-01K does not select or invent one. | Package authority/requester must name one mutation family and its owner surface before implementation planning. No owner is self-appointed here. |
| 2 | Map the selected operations to D2-11's transactional side-effect inventory: affected state, rollback, commit publication, event/history order, and failure behavior. | **BLOCKED** pending #1 | D2-11 in `CS-002D4-R1-authoritative-contracts.md` explicitly leaves the global side-effect inventory unresolved. PKG-01I maps and verifies its five cell-write operations only; that evidence cannot be extended to an unnamed family. | Core transaction engineering, after the exact operation family is selected, must produce the operation-specific state/rollback matrix and equivalence gate. |
| 3 | Keep the next slice outside blocked Workbook/Pivot lifecycle paths unless separately authorized. | **VERIFIED as a scope guardrail** | The fixture correction in this package creates its sheet with `Workbook.create()` and writes through `Workbook.transact()`. It does not use post-publication `addSheet()`, pivot registry/snapshot mutation, refresh, or cross-sheet pivot references. It adds no lifecycle capability. | Preserve the exclusion in the PKG-02 scope. If the candidate requires one of these paths, stop for a separate lifecycle contract and authorization. |
| 4 | Keep merged-cell read representation separate; BT-2 must not block a mutation package that does not alter reads or merges. | **VERIFIED as a scope guardrail; D7-05 remains open if relevant** | The approved D7-02 contract requires independent read objects. PKG-01K changes no merge implementation, assertion, read DTO, or merged-cell behavior. No merge test was rerun. | Exclude merged-read changes from a non-read mutation package. If selected work changes that representation, resolve the D7-05 DTO blocker and authorize it separately. |
| 5 | Carry forward the shared self-await limitation; do not claim it is resolved. | **OPEN / limitation retained** | The focused transaction selection passes, but the documented limitation remains: an independent mutation promise awaited from inside the active transaction callback can self-await; safe handling remains to retain it, await the transaction, then await the independent promise. PKG-01K does not change queue/reentrancy behavior. | Any candidate involving callbacks or independent queued work must state whether this condition is reachable and test it without claiming general detection or resolution. |

## Smallest actionable prerequisite and correction

The most directly actionable current ownership gap was a pre-existing event-bridge test fixture that called `setCellValue()` on a read-only `WorkbookSheetView`. It failed typechecking because that operation is not on the view API, so it did not verify event delivery through Workbook-owned mutation. PKG-01K changed only this test fixture to use the supported initial-sheet creation path (`Workbook.create`) and transaction context (`Workbook.transact`). Its original event payload and subscribe/unsubscribe assertions are unchanged. The corrected fixture and the five-operation transaction selection pass together, 4 suites / 97 tests.

This closes one narrow integration-evidence gap for the already-authorized five cell-write operations. It does **not** select a new mutation family, complete D2-11 globally, resolve the six other historical Workbook/Pivot fixture failures, or make PKG-02 ready without its exact scope.

## PKG-02 gate status

The actionable fixture prerequisite is closed. Exact operation selection remains open; the operation-specific D2-11 mapping remains blocked until that selection. The lifecycle, merge-read, and self-await constraints remain as above. No PKG-02 implementation is authorized by these findings.
