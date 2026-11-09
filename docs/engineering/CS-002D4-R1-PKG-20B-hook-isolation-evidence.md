# CS-002D4-R1 PKG-20B — Hook and consumer-isolation evidence

## Evidence boundary

The requested PKG-19D candidate copy (`/tmp/pkg19d-candidate`) was absent. No candidate copy was available in the Git worktree list. Accordingly, this lane did not test candidate runtime hooks, did not test candidate source declarations, and did not claim owner-state isolation for the candidate. The following are separated by provenance:

1. **Prior candidate reports:** PKG-19A and PKG-19D findings and hashes carried forward without re-execution.
2. **Current package metadata/artifact probes:** temporary external consumer fixture against the shared checkout's `packages/core` symlink and existing `dist` artifacts.
3. **Unverified candidate claims:** any statement about the exact PKG-19D build/deep import, hook installation from a consumer, or owner-controlled mutation route.

## Prior PKG-19 evidence

PKG-19A reports that the candidate root barrel omitted `workbookMutationTestHooks` and `DependencyGraph`; the hook module was used internally by `workbook.ts`. It also reports that `Worksheet` and `DependencyGraph` declaration surfaces retained internal methods and that the public static `Workbook.isWorkbookIssuedSheetView` was present. PKG-19D lists the final nine-file candidate hashes, including `worksheet.ts` `0150d8e2367225864192dee64e0d4eeafd56f12f0fe66e038c0233772bda27fc` and `workbookMutationTestHooks.ts` `186a5894adf019f823d7ab990370c158e9ad6eb372f69d9e30a9a75777d25cd4`; neither was recomputed because the candidate files are unavailable. PKG-19A classified hook/declaration exposure as insufficient evidence, not as a proven supported-contract violation.

## Current external consumer probe

Fixture path: recorded in `/tmp/pkg20b-consumer-path.txt`. It symlinks `node_modules/@cyber-sheet/core` to the current `packages/core` tree. Exact commands and raw results are retained in [the consumer probe output](CS-002D4-R1-PKG-20B-consumer-probe-output.txt) and summarized here and in the companion PKG-20B audit.

| Probe | Current checkout result | What it establishes |
| --- | --- | --- |
| Node package resolution: `@cyber-sheet/core`, `/sdk`, `/patch`, `/snapshot` | All resolve to their configured `dist/esm` entry paths. | Named runtime subpaths are reachable under current package metadata. |
| Node package resolution: bare `/dist/worksheet.js`, `/dist/dag/DependencyGraph.js`, `/dist/workbookMutationTestHooks.js` | All rejected: `ERR_PACKAGE_PATH_NOT_EXPORTED`. | The current `exports` map blocks these bare deep imports. |
| TypeScript root + SDK + Snapshot imports under `moduleResolution: Bundler` | Passed. | Current built declarations allow the selected supported root/subpath imports. |
| TypeScript supported-root references to `Worksheet.adoptByWorkbook`, `isWorkbookOwned`, `assertOwnedMutationEntry`, and `onMutation`; `Workbook.isWorkbookIssuedSheetView` | Passed. | Those internal-marked members are present in the current declarations and visible through root-exported classes. This alone does not establish that they grant mutation authority. |
| TypeScript bare deep imports for Worksheet, DependencyGraph, and test hooks | Failed with TS2307. | Current package exports do not resolve those deep imports as supported package paths. |
| Runtime loading: Workbook, Worksheet, SDK factory, Snapshot codec | All loaded; tested exports had expected function/object types. | Current configured runtime entries load. It does not test hook installation or a candidate-specific bundle. |

The current `dist` artifacts are not synchronized with all current source exports: the shared source index exports `WorkbookTransactionContext`, while current `dist/index.d.ts` does not. This is why the fixture intentionally asserts only symbols actually present in those checked-in/on-disk artifacts. No build was run to regenerate them.

## Hook installation and cleanup

Read-only source inspection of current `workbookMutationTestHooks.ts` shows:

- Hook registrations are keyed by Workbook in a module-local `WeakMap`.
- `setWorkbookMutationTestHooks()` returns a disposer. It deletes the hook and clears the strategy override only when that exact hook object remains registered, so disposal of a superseded registration does not clear a newer one.
- The root barrel does not export the setter or dispatch functions.
- `packages/core/package.json` exposes no hook-specific subpath; its package export map has only `.`, `./sdk`, `./patch`, and `./snapshot`.
- Current source `workbook.ts` imports hook dispatchers, so they are present as an internal production-source dependency. That observation is not proof that the setter can be reached through an installed package runtime entry.

No consumer registration or subsequent unregistration was dynamically exercised: the candidate package build was unavailable. No public test-hook getters, mutable internals, or new export routes were added.

## Required follow-up

Restore the exact PKG-19D candidate or separately authorize creating an isolated copy from the reported nine-file hashes. Then run the consumer fixture against its generated package: positive type/runtime root and named subpath imports; negative bare deep imports; declaration inspection for Worksheet/DependencyGraph/Workbook identity members; and a hook-registration attempt through every supported package entry. A separate compatibility decision is needed before altering `stripInternal`, package exports, or member signatures. Keep filesystem-relative imports categorized as unsupported regardless of whether a local developer can reach them.

**Lane B disposition:** exact candidate hook isolation and declaration verification remain **UNVERIFIED**; package-map behavior is verified for the current shared checkout only. No shared source/test files, candidate sources, package metadata, ledger, registers, or acceptance baselines were changed.
