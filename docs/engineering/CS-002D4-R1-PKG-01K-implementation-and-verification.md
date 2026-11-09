# CS-002D4-R1 PKG-01K — Implementation and Verification

## Change

Changed only `packages/core/__tests__/EventBus.workbook-bridge.test.ts`, a pre-existing untracked test file in the dirty worktree. The tests previously used `new Workbook()`, post-publication `addSheet()`, and `sheet.setCellValue()` on a `WorkbookSheetView`. The direct setter is absent from that read-only interface; the fixture could not compile and could not observe Workbook-owned event publication.

The test now uses `Workbook.create({ sheets: [...] })`, retrieves the issued view, and stages the same three values with `await workbook.transact(transaction => transaction.setCellValue(...))`. The existing event payload and assertion requirements are preserved: expected value-change event, no callback before subscription, one callback after subscription, and no callback after unsubscribe. A temporary red reproducer of the original direct-view setter calls failed at TypeScript compilation with TS2551 (`setCellValue` is absent from `WorkbookSheetView`); the corrected fixture then passed as part of the 4-suite / 97-test selection. The test source was restored to its corrected content after the red run.

This is a bounded test-fixture correction under the PKG-01K allowance to correct a fixture that contradicts the current API. It introduces no production change, mutation family, pivot/sheet lifecycle capability, or public contract. Current runtime evidence applies to this named event bridge and the already-authorized five cell-write transaction slice only.

## Verification

The persistent output is [PKG-01K focused verification output](CS-002D4-R1-PKG-01K-focused-verification-output.txt). It records exact commands and output.

| Check | Result |
| --- | --- |
| Focused transaction/ownership/enforcement selection before the fixture correction | 3 suites, 95/95 passed |
| Corrected event bridge plus focused transaction selection | 4 suites, 97/97 passed |
| Core package typecheck | Passed |
| `git diff --check` | Passed |
| Core sidecar integrity | 237/237 paths and SHA-256 values matched the pre-test manifest after restoration |
| Historical nine-suite/full Core diagnostic | Not rerun in PKG-01K; PKG-01J records it as prior evidence, not a fresh result |

The sidecar manifest is [PKG-01K Core sidecar SHA-256 inventory](CS-002D4-R1-PKG-01K-core-sidecar-sha256.txt), containing 237 paths with SHA-256 `a6b89cdc3ccd8bfc8c054e5fafcb4dc84ed9ba1347eb2597a3e7bef938969b6c`. The test harness temporarily parks nine generated Core source `.js` sidecars. One checksum attempt was issued while those files were still parked and reported them unavailable; the restoration trap returned them, and the final post-restoration check passed all 237 entries, including after the red/green test. The retained output includes both the initial command-order error and the successful final check.

## Change attribution and boundaries

- Production source: unchanged by PKG-01K.
- Test source: only the EventBus Workbook bridge fixture above was changed by PKG-01K.
- PKG-01J reports and historical diagnostics: unchanged.
- Ledger, frozen registers, and acceptance baseline: unchanged.
- Journal default: unchanged; Snapshot remains internally selectable.
- Full Core: not rerun; the earlier 9-suite/19-test result remains historical evidence and is not claimed as freshly reproduced.

The implementation-dispositions ledger remains SHA-256 `9eeedfffa3c0c986a9c9b6282e707994aeb7eee56b37288e2eacc8ca8f768058`.

The initial worktree status query showed 333 dirty paths at HEAD `88b09634f17f3b39d88a88c5428f76b426459a2b`. The final status query showed 338; the five added visible paths are the three PKG-01K reports, the sidecar manifest, and this focused-output artifact. The EventBus test file was already untracked at the initial query, so its bounded content edit did not increase the path count. The worktree remains dirty and no unrelated path was cleaned or reset.

No test was removed, skipped, or weakened. The known self-await limitation remains unresolved and was not part of this correction.
