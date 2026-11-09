# P1-08AZ Lane B — Svelte Initialization Characterization

## Scope and exact records

This lane characterized the current `initializeCyberSheet` behavior in `packages/svelte/src/cyberSheetStore.ts` for these two exact flow records. Both ledger rows remain `open-not-reconciled`.

| Exact key | Frozen source anchor | Current executable location | Outcome |
| --- | --- | --- | --- |
| `fe024667fe8a202eeccd` | `cyberSheetStore.ts:42`, historical `const workbook = new Workbook()` | `initializeCyberSheet`: empty-data guard at lines 42–44, `Workbook.create` and sheet lookup at lines 48–50, renderer construction at lines 52–54, `store.set` at line 69 | Empty configuration succeeds; the actual Core Workbook factory issues the returned `Sheet1` view. A renderer instance is constructed and initialized state is published to the writable store. |
| `23922f2142e40bda34cc` | `cyberSheetStore.ts:47`, historical `options.data.forEach(...)` | Current non-empty-data guard at lines 42–44, before `Workbook.create` (48), renderer construction (52), and `store.set` (69) | Non-empty initial cell data rejects with the existing R2 authorization error before Workbook creation, renderer construction, or initialized store publication. |

The frozen anchors describe removed code. The characterization follows the current initializer and does not restore `new Workbook()`, the old data loop, or post-publication writes.

## Test and observations

Added `packages/svelte/src/__tests__/cyber-sheet-store-initialization.p1-08az.test.ts`. It invokes the actual exported `initializeCyberSheet` and `createCyberSheetStore` functions. The empty-bootstrap case uses the real `Workbook.create()` and verifies the returned worksheet is a Workbook-issued sheet view, has the expected name, and is the state published through Svelte's real `writable` store. The canvas renderer constructor is mocked only to observe that renderer construction occurs; this test does not claim completed canvas painting.

The rejection case passes non-empty initial data and observes the existing rejection. A spy confirms `Workbook.create()` is not called, the renderer constructor is not called, and the store receives no state update beyond the writable's initial null state. No failure was corrected because both observed outcomes match the current guard and bootstrap behavior.

Commands and results, run from `packages/svelte`:

- `npx vitest run --config vitest.config.ts src/__tests__/cyber-sheet-store-initialization.p1-08az.test.ts` — 1 file, 2/2 tests passed.
- `npm run typecheck` — passed (`tsc -p tsconfig.json --noEmit`).

An initial Vitest invocation from the repository root did not discover the package test because the package configuration includes paths relative to `packages/svelte`; rerunning from the package directory found and passed the test. The first implementation of the renderer mock also failed because Vitest requires class constructor mocks when invoked with `new`; the test was adjusted to use a class mock and the final run passed.

## Change and evidence boundary

Only the focused test and this lane report were added. No production source, implementation ledger, frozen register, or shared reconciliation report was changed. No ledger disposition was promoted. This lane did not run the full Svelte suite, browser rendering, or any Core/React suite. The renderer is mocked, so the evidence is about initializer/store publication and owner-issued view identity, not visible pixels. A workspace `packages/svelte/node_modules` symlink points to the primary checkout's node_modules; it was present for package commands and was not modified by this lane.

Test SHA-256: `3989b189a7f3976e5ebf34c8d65bfdcd80b087409682cecc21e9f698cde6a214`.
