# P1-08BA Lane B — Svelte renderer failure characterization

## Current sequence and exact evidence

This lane exercises `initializeCyberSheet`. The initializer creates a Workbook and obtains `Sheet1` at [cyberSheetStore.ts:48–50](../../packages/svelte/src/cyberSheetStore.ts:48), invokes the renderer at [lines 52–54](../../packages/svelte/src/cyberSheetStore.ts:52), and only then creates state and calls `store.set()` at [lines 56–71](../../packages/svelte/src/cyberSheetStore.ts:56).

For the AZ empty-bootstrap key `fe024667fe8a202eeccd`, the BA test makes the renderer constructor throw after the actual Core Workbook factory has run. `initializeCyberSheet` rejects with that same error; the store subscriber sees only its initial null state, with no worksheet or renderer publication. The test confirms `Workbook.create()` and the renderer constructor were each called once. The Workbook and view allocated before the exception have no returned handle in this failed call; no rollback is observed.

The paired unsupported-data key `23922f2142e40bda34cc` remains open and unchanged; its pre-creation rejection was established in AZ, not repeated as a BA renderer-failure case.

The test then retries the same supported initializer and writable store with a clean renderer construction. The second call succeeds, publishes the Workbook-issued `Sheet1` view and renderer, and produces one initialized-state notification. This characterizes retry after failure, not disposal of the first inaccessible Workbook.

## Verification and boundary

- Focused command: `npx vitest run --config vitest.config.ts src/__tests__/cyber-sheet-store-renderer-failure.p1-08ba.test.ts` from `packages/svelte` — 1 file, 1/1 test passed.
- Package typecheck: `npm run typecheck` — passed.
- The actual initializer, Core Workbook, and Svelte writable store are used. The renderer constructor is mocked; canvas painting and browser behavior are not observed.
- No production source, ledger, frozen register, or earlier manifest changed. The six AZ ledger dispositions remain `open-not-reconciled`.
