# P1-08BA Lane A — Vue renderer failure characterization

## Current sequence and exact evidence

This lane exercises the current `useCyberSheet` mounted initializer. After dynamic imports and the existing guards, it creates a Workbook and obtains `Sheet1` at [useCyberSheet.ts:53–55](../../packages/vue/src/useCyberSheet.ts:53). It calls the renderer constructor at [line 57](../../packages/vue/src/useCyberSheet.ts:57), then only afterward assigns `worksheet` and `renderer` refs at [lines 61–62](../../packages/vue/src/useCyberSheet.ts:61).

For the AZ empty-bootstrap key `6259cce6d4a24bfe5859`, the BA characterization injects a constructor exception after the real Core `Workbook.create()` call. The renderer error reaches Vue's configured app error handler; the Workbook factory and renderer constructor are each called once, while both composable refs remain `null`. The container has no canvas. Unmount removes the mounted element. Thus the test observes no partially published worksheet or renderer; the already-created Workbook allocation itself has no external handle in this path and is not shown to have been rolled back or disposed.

The paired unsupported-data key `4fc14dcd20ac44a9a6d4` remains open and unchanged; its pre-creation rejection was established in AZ, not repeated as a BA renderer-failure case.

A second clean mount succeeds using the same composable after the renderer spy stops throwing. The returned sheet is again a real Workbook-issued `Sheet1` view. This shows a fresh initialization can succeed after the failed attempt; it does not prove cleanup of the inaccessible Workbook from that attempt.

## Verification and boundary

- Focused command: `npx vitest run --config vitest.p1-08ba.config.ts` from `packages/vue` — 1 suite, 1/1 test passed.
- Package typecheck: `npm run typecheck` — passed.
- The test uses the actual Core source entry and a throwing renderer-constructor spy. Canvas painting, real renderer cleanup, and browser behavior are not observed.
- No production source, ledger, frozen register, or earlier manifest changed. The six AZ ledger dispositions remain `open-not-reconciled`.
