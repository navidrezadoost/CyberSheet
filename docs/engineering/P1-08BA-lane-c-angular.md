# P1-08BA Lane C — Angular renderer failure characterization

## Current sequence and exact evidence

This lane exercises `CyberSheetService.createRenderer`. The current service creates a Workbook and obtains `Sheet1` at [CyberSheetService.ts:44–46](../../packages/angular/src/CyberSheetService.ts:44), then calls `CanvasRenderer` at [lines 48–50](../../packages/angular/src/CyberSheetService.ts:48). The result object is created only after renderer construction at [line 52](../../packages/angular/src/CyberSheetService.ts:52), and the async method returns it at [line 60](../../packages/angular/src/CyberSheetService.ts:60).

For the AZ empty-bootstrap key `15e24e21b223893dd76b`, the BA test makes the renderer constructor throw after the actual Core Workbook factory has run. The service promise rejects with the injected error, `Workbook.create()` and the renderer constructor were each called once, and the supplied container stays empty. No result containing the worksheet or renderer is returned. The Workbook and view allocated before the throw are not otherwise externally observable, so this test does not establish rollback or cleanup.

The paired unsupported-data key `0ae42ec4d5dc06ff8ba8` remains open and unchanged; its pre-creation rejection was established in AZ, not repeated as a BA renderer-failure case.

The same service instance is then called again with a renderer constructor that succeeds. It returns a Workbook-issued `Sheet1` view and renderer and appends one canvas to the test container. Retry success does not establish cleanup of the inaccessible Workbook from the failed call.

## Verification and boundary

- Focused command: `npm test -- --runInBand src/__tests__/cyber-sheet-service-renderer-failure.p1-08ba.spec.ts` from `packages/angular` — 1 suite, 1/1 test passed.
- Package typecheck: `npm run typecheck` — passed.
- The test uses the actual `CyberSheetService` and source-backed Core Workbook, with a renderer mock. It does not exercise browser paint or real renderer cleanup.
- No production source, ledger, frozen register, or earlier manifest changed. The six AZ ledger dispositions remain `open-not-reconciled`.
