# P1-08AZ Lane A — Vue initialization characterization

## Exact records and current source mapping

Both selected frozen identities are flow records in `packages/vue/src/useCyberSheet.ts`; each remains `open-not-reconciled` in the implementation ledger.

| Exact key | Frozen occurrence | Current executable behavior | Evidence |
| --- | --- | --- | --- |
| `6259cce6d4a24bfe5859` | Line 40, `onMounted(async () => {` | The current mounted callback dynamically imports Core and the renderer. With no initial data, it creates a workbook using `Workbook.create({ sheets: [{ name: 'Sheet1' }] })` (line 53), obtains `Sheet1` (line 54), constructs `CanvasRenderer` (line 57), then assigns the worksheet and renderer refs (lines 61–62). | Focused test used actual Core source, observed one `Workbook.create` call with the expected sheet config, and verified `Workbook.isWorkbookIssuedSheetView(...) === true` for the composable worksheet ref and the view passed to the renderer. The renderer constructor is a test spy. |
| `4fc14dcd20ac44a9a6d4` | Frozen line 52, `options.data.forEach((row, rowIndex) => {` | That historical loop is absent from the current source. The live non-empty-data guard is at lines 47–49; it throws before `Workbook.create`, `getSheet`, renderer construction, or ref assignment. | Focused test mounted the real composable with `data: [['sentinel']]`, captured the exact rejection through Vue's app error handler, and observed no Workbook factory, sheet getter, renderer constructor, worksheet ref, or renderer ref publication. |

The test executes the current `useCyberSheet` composable and actual Core source. Its test-specific Vitest config maps the Core import to `packages/core/src/index.ts` and maps only the renderer import to a narrow constructor spy. It verifies that a real Workbook-issued view is published, but does not validate canvas painting or browser interaction.

## Verification

- Focused command: `npx vitest run --config vitest.p1-08az.config.ts` from `packages/vue` — 1 suite, 2/2 tests passed.
- Package typecheck: `npm run typecheck` from `packages/vue` — passed.
- The ordinary package Vitest config could not resolve the workspace renderer package because this isolated checkout has no renderer `dist` entry. A lane-local test config resolves Core directly to its source entry and maps the renderer import to a test spy; no shared or production configuration was changed.
- The first exploratory attempt using the ordinary config failed before running tests (0 tests); the successful focused run used the lane-local config above.

## Change boundary and disposition

Added only the focused test, its renderer mock boundary module, the lane-local Vitest config, and this report. `packages/vue/src/useCyberSheet.ts`, other production sources, the implementation ledger, and all frozen registers were not changed. No disposition is promoted. The two exact records remain open. No Vue production capability was added, and no behavior beyond the tested composable/Core initialization boundary is inferred.
