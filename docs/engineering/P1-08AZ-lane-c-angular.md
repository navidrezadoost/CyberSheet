# P1-08AZ Lane C — Angular Initialization Characterization

## Scope and exact records

This lane reviewed only the two assigned Angular flow records. Both ledger dispositions remain `open-not-reconciled`.

| Exact key | Frozen occurrence | Current executable mapping |
| --- | --- | --- |
| `15e24e21b223893dd76b` | `packages/angular/src/CyberSheetService.ts:38`, historical `const workbook = new Workbook()` flow | `CyberSheetService.createRenderer()` at lines 21–34; empty-data guard at lines 38–40; `Workbook.create({ sheets: [{ name: 'Sheet1' }] })` at lines 44–46; renderer construction at lines 48–50. |
| `0ae42ec4d5dc06ff8ba8` | `packages/angular/src/CyberSheetService.ts:43`, historical `options.data.forEach(...)` flow | Current unsupported-data guard at lines 38–40. The old row-iteration path is absent. |

The current source locations were inspected directly. Historical anchors were not treated as executable calls in the current initializer.

## Characterization

Added `packages/angular/src/__tests__/cyber-sheet-service-initialization.p1-08az.spec.ts` with two tests against the real `CyberSheetService.createRenderer()` method:

- **Empty configuration succeeds.** The real Core `Workbook.create()` is called once, the returned `worksheet` passes `Workbook.isWorkbookIssuedSheetView()` and is named `Sheet1`, and the renderer boundary receives that exact view and publishes one canvas into the supplied container.
- **Non-empty initial data is rejected before publication.** `createRenderer(container, { data: [['unsupported']] })` rejects with the existing R2 authorization error. The real `Workbook.create()` spy remains untouched, the renderer constructor is not called, and the container remains empty. Thus this tested path creates neither a Workbook nor renderer/canvas publication.

For the package test harness, `@cyber-sheet/core` is virtually mocked to its unchanged `packages/core/src/workbook.ts` module because the package export points to a `dist` entrypoint that is not built in this lane. This retains the real Workbook implementation. `CanvasRenderer` alone is mocked at its boundary and appends a canvas so publication is observable in jsdom. Production guards and implementation are unchanged.

## Verification and limits

- Focused command: `npm test -- --runInBand src/__tests__/cyber-sheet-service-initialization.p1-08az.spec.ts` from `packages/angular` — **1 suite, 2/2 tests passed**.
- Typecheck: `npm run typecheck` from `packages/angular` — **passed**.
- Initial resolver attempt before the virtual package mock: 0 tests executed because Jest could not resolve the unbuilt `@cyber-sheet/core` package export. The final focused invocation uses the source-backed mock described above.
- No full Angular test suite, browser test, or build ran. The renderer is mocked; this characterizes the service's argument/publication boundary, not completed browser canvas painting or physical rendering.
- No failure was observed for the two tested configurations. This does not characterize other malformed data shapes, collaboration options, renderer exceptions, component lifecycle, or Workbook-owned mutation authority.

Only the focused test and this lane report were added. No Angular production source, implementation ledger, frozen register, or other framework lane file was changed. The exact dispositions are not promoted. This lane makes no broader R1 acceptance claim.
