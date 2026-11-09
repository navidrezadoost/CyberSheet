# CS-002D4-R1 PKG-20B — Public surface and declaration audit

**Disposition:** Candidate-specific exposure is **UNVERIFIED — REQUIRED CANDIDATE ABSENT**. The PKG-19D candidate at `/tmp/pkg19d-candidate` was unavailable at this checkpoint, and no replacement candidate was reconstructed. This report separates prior PKG-19 candidate review from read-only checks of the currently checked-out package metadata and build artifacts. It does not qualify the PKG-19 candidate for integration.

## Candidate evidence carried forward

PKG-19A reviewed the nine-file prospective candidate and found:

- The root barrel exported `Worksheet`, `Workbook`, and the proposed workbook access types, but did not export `DependencyGraph` or `workbookMutationTestHooks`.
- The candidate source module `worksheet.ts` exported internal diagnostic/failure functions, and internal methods appeared on the exported `Worksheet` declaration. The candidate's `Workbook` also had the `@internal` static `isWorkbookIssuedSheetView` method. PKG-19A classified the declaration/deep-import boundary as insufficiently evidenced.
- `workbookMutationTestHooks.ts` provided `setWorkbookMutationTestHooks()` and cleanup through a returned `dispose()` registration. The test-hook module was intentionally absent from the root barrel; production `workbook.ts` called internal hook-dispatch functions.
- PKG-19D recorded candidate hashes for the two PKG-19C corrections (`EventBus.ts` and `workbook.ts`) and the seven unchanged PKG-18B files. Those recorded hashes are historical evidence only; the candidate files were not available for rehashing here.

The PKG-19D report specifically leaves test-hook declaration/subpath exposure open. No exact PKG-19 candidate runtime or declaration behavior is inferred below from these observations.

## Current package-map check

Read the current `packages/core/package.json`, Core build script, `packages/core/tsconfig.json`, and `tsconfig.base.json`. The package declares only four package subpaths: `.`, `./sdk`, `./patch`, and `./snapshot`. Its `files` field includes `dist`; there is no wildcard export. The runtime build script names the root, SDK, patch, and SnapshotCodec entry points. TypeScript is configured to emit declarations, but neither Core nor the base tsconfig sets `stripInternal: true`.

A temporary consumer fixture symlinked the checked-out `packages/core` package into `/tmp` and tested the package map. Supported root and named subpath runtime resolution succeeded; bare package imports of `@cyber-sheet/core/dist/worksheet.js`, `.../dag/DependencyGraph.js`, and `.../workbookMutationTestHooks.js` were rejected with `ERR_PACKAGE_PATH_NOT_EXPORTED`. A TypeScript Bundler-resolution fixture successfully used root `Worksheet`/`WorkbookSheetView`, SDK `createSpreadsheet`/`SpreadsheetSDK`, and Snapshot `snapshotCodec`/`WorksheetSnapshot` imports. TypeScript rejected those three unsupported bare deep imports with TS2307. Runtime loading of root, SDK, and Snapshot entries succeeded. Exact commands, outputs, and config/declaration hashes are retained in [the consumer probe output](CS-002D4-R1-PKG-20B-consumer-probe-output.txt).

These probes establish the behavior of the **current checked-out package metadata/artifacts**, not the missing PKG-19D candidate. They do not establish that filesystem-relative imports are supported public APIs. Direct filesystem access bypasses the `exports` contract and must remain classified as unsupported unless separately documented.

## Declaration-surface finding in the checked-out artifacts

The current checked-out `dist/index.d.ts` exports `Worksheet` and `Workbook`. In these declarations, `Worksheet` includes `@internal` members such as `adoptByWorkbook`, `isWorkbookOwned`, `assertOwnedMutationEntry`, and `onMutation`; `Workbook` includes `isWorkbookIssuedSheetView`. A consumer fixture using the supported package root successfully type-checked references to those members. This is enabled by declaration emission without `stripInternal` and by those classes being root-exported. The probe is not evidence that every such member is callable to obtain mutation authority; for example, source adoption checks a module-private key.

The checked-out `dist` contents also do not exactly match the checked-out source barrel: for example, the source barrel currently exports `WorkbookTransactionContext`, while the existing `dist/index.d.ts` does not. The external fixture therefore characterizes the package artifacts presently on disk, not a fresh build of the source and not the PKG-19D candidate. No build was run and no artifacts were changed.

The PKG-19A candidate review further reports that the candidate's `DependencyGraph` journal/diagnostic methods were public members of its class declaration and that two Worksheet diagnostic functions were exported from their source module. Candidate-specific declaration and runtime resolution for those exact members remains unverified here. Current package metadata does not grant them a supported bare subpath.

## Hook exposure and disposition

The checked-out source `workbookMutationTestHooks.ts` uses a module-local `WeakMap`, exposes a registration function only from that source module, and returns a disposer which removes the registration only if it is still the active registration. The root barrel does not export this module. The package export map also blocks a bare `@cyber-sheet/core/dist/workbookMutationTestHooks.js` import. No consumer fixture successfully installed hooks, mutated owner-controlled state through a hook, or exercised the PKG-19D runtime bundle: that requires the absent candidate or an authorized fresh candidate build.

**No correction was applied.** Narrowing declarations with `stripInternal`, changing package exports, or relocating hooks would alter package publication behavior and requires candidate-specific evidence plus a compatibility decision. No approved contract was found in the reviewed PKG-19 records that authorizes an export-policy or declaration-generation change in this lane. The exact next evidence prerequisite is restoration of the PKG-19D candidate or explicit authorization to create a fresh isolated candidate from its recorded source hashes, followed by a consumer fixture against that candidate's build outputs.

## Conclusion

The published package map distinguishes supported root/named subpath access from unsupported bare deep imports. However, `@internal` annotations are not stripped from declarations under current config, and internal members of root-exported classes are accessible to a type consumer. This is a concrete declaration-boundary concern in the checked-out artifacts; whether it violates an approved compatibility contract, and whether the PKG-19D candidate shares the exact behavior, remain unresolved. Hook registration and candidate owner-state mutation reachability are not established. The candidate remains **BLOCKED — CONTRACT/EVIDENCE DECISION REQUIRED**, and this audit authorizes no source, package export, declaration policy, or API changes.

**Scope exclusions:** no source/test changes, no build, no candidate reconstruction, no new package exports, no test-hook API exposure, no owner-contract decision, and no shared-worktree integration.
