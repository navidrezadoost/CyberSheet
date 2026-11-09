# CS-002D4-R1 PKG-08R — Core reliability readiness

**Gate outcome: CORE RELIABILITY IMPROVED — GOVERNANCE BLOCKERS REMAIN**

PKG-08 improved focused Core test resolution and added direct seven-operation observer-failure evidence. It did not implement or authorize Workbook comment deletion, change Pivot lifecycle APIs, or resolve the remaining ownership and contract decisions. Overall CS-002D4-R1 acceptance remains **WITHHELD**.

## Baseline and scope

- Starting Git revision: `88b09634f17f3b39d88a88c5428f76b426459a2b`.
- Starting worktree: 438 status entries; existing changes were preserved.
- Lane A added an opt-in Core Jest config and a scoped resolver. Lane B added one focused Journal/Snapshot test. Lane C added a read-only Pivot integration classification. This gate adds its integration report and raw verification outputs. No production source, Workbook mutation API, authoritative contract, Pivot test fixture, protected sidecar, frozen register, or historical manifest changed.
- The implementation ledger and earlier package evidence were not modified.

## Lane A — Resolver and sidecar reliability

The default Jest extension order places `.js` ahead of `.ts`; the prior PKG-03C record documents stale generated Core source sidecars shadowing current TypeScript and changing failure behavior. Added `packages/core/jest.typescript-first.config.cjs`, which opt-in loads `packages/core/test/typescript-first-resolver.cjs`.

The resolver reorders `.ts`/`.tsx` before JavaScript only for extensionless relative or absolute requests resolving inside `packages/core/src` when a same-stem TypeScript source and `.js` sibling both exist. Explicit extensions, bare/package imports, paths outside Core source, and JavaScript-only Core modules use Jest's default resolver. The normal Core Jest config remains unchanged; the remedy is opt-in. The five-case resolver test verifies TypeScript selection and current `DependencyGraph` methods, explicit `.js` handling, JavaScript-only resolution, and `.cjs` runtime-artifact loading.

The opt-in configuration was exercised with protected sidecars present; no parking or deletion was needed. The focused run passed, establishing the resolver for the tested import paths. This does not establish that every Core import pattern or the full Core suite is free of resolution hazards.

## Lane B — Seven-operation regression expansion

Added `workbook-seven-operation-observer-isolation.p1-pkg-08b.test.ts`. Under both Journal and Snapshot, it commits all seven existing operation kinds across two Worksheets while throwing Workbook EventBus observers are registered for value and row-height events. It verifies later observers are called, listener errors are reported, committed cell/formula graph/style/dimension state remains visible, Worksheet surfaces observed events, and mutation health remains healthy. Assertions do not impose a cross-surface callback completion order.

This adds direct commit-path listener-failure coverage for a mixed multi-Worksheet transaction. It does not inject a failure during mutation and adds no new rollback claim. Existing focused tests continue to carry the direct evidence for exact rollback, sparse dimension state, queue disposal, EventBus reentrancy, and Journal/Snapshot equivalence.

## Lane C — Pivot integration classification

The read-only Lane C report separates historical evidence by execution stage:

- Seven suites stopped at TypeScript diagnostics involving unavailable/internal Pivot accessors or mutable-`Worksheet` assumptions; zero tests ran in those suites.
- Eighteen historical Pivot formula cases failed during fixture setup when post-publication `Workbook.addSheet()` rejected; their intended Pivot assertions were not reached.
- One separately executed standalone `merge-api.test.ts` assertion failed on merged-cell object identity; it is not a Workbook Pivot integration failure.
- Current public Workbook Pivot creation/deletion and post-publication sheet creation remain unavailable. Registry and snapshot-store state remain private; `getPivotSnapshot()` is a detached read. Standalone Pivot tests do not establish Workbook-owned registration, dirtying, lifecycle, or publication.

No historical blocker was rerun or reattributed in Lane C. The smallest legitimate future integration route is an owner-approved Workbook Pivot lifecycle surface exercised through initial Workbook sheets, existing transactions, and detached snapshot reads, followed by separate authorization. Do not repair old fixtures using casts, private access, fake accessors, or unsupported post-publication sheet creation.

## Integrated verification

Serialized Jest command used `NODE_OPTIONS=--experimental-vm-modules`, Jest 30.5.2, `--runInBand`, and `packages/core/jest.typescript-first.config.cjs`. The selection included the established 11-suite transaction/event group, three standalone Pivot suites, and the two new Lane A/B suites.

- Jest: **16 suites passed; 227/227 tests passed**.
- Core typecheck: `npm run typecheck --workspace @cyber-sheet/core` passed.
- Test hygiene: no focused test markers found.
- `git diff --check`: passed. Added artifacts also passed trailing-whitespace and final-newline checks.
- Protected Core sidecars: the 237-entry manifest was verified before and after Jest, and the `sha256sum -c` outputs matched exactly. Manifest SHA-256 remains `a6b89cdc3ccd8bfc8c054e5fafcb4dc84ed9ba1347eb2597a3e7bef938969b6c`. Sidecar contents were not parked, deleted, or changed.
- Raw outputs: `CS-002D4-R1-PKG-08R-jest-output.txt`, `CS-002D4-R1-PKG-08R-typecheck-output.txt`, and `CS-002D4-R1-PKG-08R-hygiene-output.txt`.

The existing ts-jest `globals` deprecation and TS151001 `esModuleInterop` advisory appeared during Jest and were non-failing. No full Core suite ran and no baseline was recaptured. The successful bounded selection does not classify the full historical failure set or prove it originated before or after any unrelated dirty-worktree changes.

## Comment-operation governance boundary

The PKG-07 blueprint and harness remain preparation only. The outstanding comment-operation owner decisions include API signature and result semantics; ordinary missing-ID behavior; missing ID with orphan descendants (preserve current standalone-compatible cascade or use a Workbook-only existence precheck); duplicate IDs and transitive cascade; no-op/event frequency and payload; merged non-anchor coordinate support and exact-address rollback; and the Policy C replacement-only comments-array-reference invariant. The C1–C5 authorization record remains deferred/not authorized: no named scoped owner, delegation basis, approved decision channel, or attributable decision has been established. D5-01 remains pending, D5-05 remains separate and unresolved, and no eighth Workbook mutation operation is authorized.

## Next bounded work

Retain the opt-in resolver for future focused Core runs after its coverage is extended to any newly identified import forms. For Workbook Pivot integration, obtain the public lifecycle contract and authority decision before changing fixtures or APIs. For comment deletion, obtain the outstanding owner decisions and a separate bounded implementation authorization. These governance prerequisites are independent; neither is satisfied by this package's passing tests.
