# CS-002D4-R1 PKG-21 PH1B — Legacy test compatibility

The archived `packages/core/__tests__/EventBus.test.ts` was attempted without filtering in the archived Candidate-01 verification. It fails at ts-jest compilation with `TS2551` where tests call `setCellValue` on `WorkbookSheetView`, and `TS2345` where the view is passed to `CommandManager` and `SetValueCommand`, which accept raw `Worksheet`. Zero tests execute.

The `TS2551` diagnostics reflect the read-only Workbook view boundary. The commands' standalone Worksheet constructor contract explains the `TS2345` diagnostics; no supported Workbook-view command integration path is evidenced. These are fixture/API compatibility blockers, not executed EventBus assertions or an accepted runtime regression. They do not justify casts, mutable views, post-publication `addSheet()`, private owner access, or enabling unsupported Workbook routes.

The candidate mutation port is Promise-based. The unchanged C1 test expects synchronous `toThrow` behavior and fails at `workbook-owned-escape.test.ts:387` when run as part of the unfiltered four-suite selection. Preserve it until D0-06 is decided and a separate bounded test migration is authorized. The `CommandManager` cases may be migrated to standalone Worksheet/EventBus fixtures only with an explicit test-change scope; the current shared-worktree version has pre-existing edits and was not overwritten.

**Disposition:** legacy EventBus suite remains compile-blocked; C1 remains an executed assertion incompatibility pending contract/migration authority. No test file was modified during PH1B.
