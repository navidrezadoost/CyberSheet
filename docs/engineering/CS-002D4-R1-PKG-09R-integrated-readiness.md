# CS-002D4-R1 PKG-09R — Integrated Core reliability readiness

**Gate outcome: CORE RELIABILITY IMPROVED — PARTIAL BASELINE**
**Overall CS-002D4-R1 acceptance: WITHHELD**

PKG-09 expands opt-in Core resolver evidence, captures a serialized full Core diagnostic, and corrects one reproducible standalone/seven-operation sparse-state defect. The expanded run remains non-green, and it preceded the narrow correction. Six Pivot-related suites remain compile-blocked, 18 Pivot integration cases remain fixture-setup blocked, and the historical merged-read identity assertion remains an executed failure. No full Core run was repeated after the correction, so this is not a post-correction suite baseline or frozen acceptance recapture.

## Starting state and execution environment

- Starting Git HEAD: `88b09634f17f3b39d88a88c5428f76b426459a2b`.
- Starting worktree: 450 status paths were dirty; existing changes were preserved. The package work added resolver test/configuration artifacts, reports and raw outputs, one focused regression, and the narrowly scoped `Worksheet.setCellValue()` correction.
- Runtime: Node `v26.10.0`, npm `12.2.0`, Jest `30.5.2`, TypeScript `6.0.3`. The repository declares Node `24.22.x` and npm `11.19.x`; the observed engine mismatch is recorded, not normalized.
- Protected Core sidecar manifest: 237 entries, file SHA-256 `a6b89cdc3ccd8bfc8c054e5fafcb4dc84ed9ba1347eb2597a3e7bef938969b6c`.

## Lane A — Opt-in resolver compatibility

The TypeScript-first resolver remains limited to paired, extensionless relative/absolute requests inside `packages/core/src`. Explicit extensions, bare/package imports, JavaScript-only modules, and requests outside that source boundary retain default Jest resolution. The default Core Jest config was not changed.

Coverage was expanded for absolute source paths, nested TS-to-paired dependency resolution, explicit `.ts`/`.js`, bare package delegation, `moduleNameMapper`, Jest mocks, paired outside-source relative/absolute imports, and JS-only/CJS artifacts. Node smoke checks and syntax checks passed. The full Core run used the opt-in resolver and did not report the resolver suite among its failures. See [Lane A report](CS-002D4-R1-PKG-09A-resolver-compatibility.md) and its test in `packages/core/__tests__/core-typescript-first-resolver.p1-pkg-08a.test.ts`.

## Lane B — Expanded Core diagnostic

Jest ran serially with `NODE_OPTIONS=--experimental-vm-modules`, `packages/core/jest.typescript-first.config.cjs`, and `--runInBand`. The command selected all **298** suites; no suites were excluded. This diagnostic was captured before Lane C's correction.

- **284 suites passed, 9 failed, 5 skipped.**
- **7,266 tests passed, 20 failed, 173 skipped, 9 todo.**
- Exit code 1; elapsed time 189.713 seconds.
- Full raw output: [PKG-09B Jest output](CS-002D4-R1-PKG-09B-expanded-jest-output.txt), SHA-256 `82971f6470b53c637afe61ca33fbd4e909b793d582aa21ab6a8114d322ba70cb`.

Failure classification:

| Class | Suites / test cases | Interpretation |
| --- | ---: | --- |
| TypeScript compilation | 6 suites; zero tests executed | Legacy Pivot tests assume mutable `Worksheet` results or unavailable Workbook Pivot registry/store/invalidation accessors. |
| Fixture/setup rejection | 1 suite / 18 cases | `pivot-formula-integration.test.ts` attempts post-publication `Workbook.addSheet()`, which rejects before the intended assertions. |
| Executed assertions | 2 suites / 2 assertions | One historical standalone merged-cell reference-identity assertion; one absent-cell sparse-state assertion subsequently reproduced and corrected by Lane C. |
| Resolver/runtime infrastructure | 0 | No test-runner resolution failure was observed. |

These categories do not establish 20 independent product defects. In particular, the Pivot compile/setup cases do not execute the intended Workbook-owned Pivot assertions. Standalone Pivot success does not establish unavailable Workbook registry, invalidation, or lifecycle behavior. The run is diagnostic for the current dirty worktree, not a clean historical comparison or frozen acceptance baseline. See [inventory](CS-002D4-R1-PKG-09B-expanded-core-inventory.md) and [failure analysis](CS-002D4-R1-PKG-09B-expanded-verification.md).

## Lane C — Bounded null-write correction

The red reproducer showed that `setCellValue(address, null)` materialized a cell record when the address was absent, despite `getCellValue()` returning `null` and the source documenting same-value writes as no-mutation/no-event. The correction validates and resolves the address, then checks absent-null and existing same-value/no-formula cases before recording the Workbook before-image or allocating the cell. Formula-bearing cells continue through the normal mutation path, so writing a formula cell's displayed null still clears its formula and emits its existing event.

Evidence sequence:

1. Pre-correction isolated red: **1 suite / 1 test failed** at the sparse-cell allocation assertion. Raw output: [red reproducer](CS-002D4-R1-PKG-09C-null-write-red-output.txt), SHA-256 `2afb4ddbc81c120fd150f89401828cdcc6583b7ca30e9ab5dad43564f172284b`.
2. First post-correction attempt: the focused file had two fixture/setup errors because the test attempted a raw formula write after Worksheet adoption; the existing owner guard rejected it. The adjacent suites passed **81/81**. This output is retained as [fixture setup failure](CS-002D4-R1-PKG-09C-fixture-setup-failure-output.txt), SHA-256 `2fb2b276105db4695d96d7bf0ef65abbe6398c689fc6fc56143c954a7a152d5a`.
3. Corrected fixture seeded formulas before adoption. The focused regression plus seven-operation differential and mutation-queue suites passed: **3 suites / 83 tests**. This covers standalone repeated writes, Workbook Journal and test-only Snapshot writes, formula clearing, and adjacent transaction behavior. Raw output: [green verification](CS-002D4-R1-PKG-09C-null-write-green-output.txt), SHA-256 `3dbc0575dadfd900f2cf50080d9a31ee5db4185f869c62815959733fa1853ce0`.

No new API, event schema, transaction operation, or default strategy was introduced. The correction is in `packages/core/src/worksheet.ts`; test coverage is in `packages/core/__tests__/worksheet-null-write-noop.p1-pkg-09c.test.ts`. The focused evidence does not replace a post-correction full Core diagnostic.

## Verification and integrity

- Core typecheck after the final test-fixture edit: `npm run typecheck --workspace @cyber-sheet/core` passed. Raw output: [typecheck output](CS-002D4-R1-PKG-09R-core-typecheck-output.txt), SHA-256 `dfae70c19a0fed21e271996ffdb8575414536784ac4ff63c3f9463073f2b2af1`.
- Focused-test hygiene: `node scripts/check-no-focused-tests.mjs` passed; no focused markers found.
- `git diff --check`: passed.
- The protected 237-entry sidecar manifest passed before and after the full Core run, the failed fixture attempt, and the final green selection. Each before/after `sha256sum -c` output was byte-identical. A final post-run check also passed 237/237; raw output is [final sidecar check](CS-002D4-R1-PKG-09R-final-sidecar-check.txt). Manifest bytes and protected sidecars remain unchanged.
- Final hygiene and manifest summary: [PKG-09R hygiene output](CS-002D4-R1-PKG-09R-hygiene-output.txt).
- Existing ts-jest deprecation and TS151001 `esModuleInterop` notices were non-failing.

## Governance, remaining blockers, and next bounded work

No Pivot accessors, Pivot lifecycle APIs, post-publication sheet creation, comment operation, Application event forwarding, or eighth Workbook mutation operation was added. D5-01 Option C remains proposed; D5-05 Application events remain unresolved; global D2-11 remains open. The prepared PKG-07 comment-delete blueprint remains implementation preparation only, with owner decisions still required for API signature/result semantics, missing IDs and orphan descendants, duplicate IDs/transitive cascade, event names/payload/no-op frequency, merged non-anchor coordinates and exact-address rollback, and Policy C metadata-array reference behavior (C1–C5 authority remains deferred).

The merge identity assertion and Pivot compile/setup blockers remain separate. A next bounded package should select one compile-blocked Pivot fixture and determine whether it can be migrated to an existing supported public behavior without casts, private access, or new APIs; otherwise preserve the owner-contract blocker. Do not treat the successful null-write correction or this diagnostic as R1 acceptance.

**Disposition:** Core reliability improved with a partial diagnostic baseline; Pivot integration and historical assertion failures remain. No acceptance baseline was recaptured. Overall CS-002D4-R1 acceptance remains **WITHHELD**.
