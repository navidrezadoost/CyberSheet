# CS-002D4-R1 PKG-19C — EventBus and disposal compatibility

**Scope:** Isolated compatibility review of the prospective PKG-18 Workbook candidate. No shared production source or test file was changed. No full Core suite was run.

## Candidate and method

Copied `/tmp/pkg18b-candidate` to `/tmp/pkg19c-candidate`; both are detached candidates at base revision `88b09634f17f3b39d88a88c5428f76b426459a2b`. PKG-19C did not write to `/tmp/pkg18b-candidate`. Candidate Jest was run with `packages/core/jest.typescript-first.config.cjs` to avoid resolving stale generated source-side JavaScript instead of TypeScript. Candidate dependencies used its existing `node_modules` symlink.

## C1 — Workbook mutation-port availability

**Disposition: AVAILABLE WITHIN THE SEVEN-OP CANDIDATE SCOPE; broader API contract remains open.** The candidate's seven operation `mutationPort` methods are wired to `Workbook.transact()`. The new isolated test commits a Workbook-owned `setCellValue` and observes the resulting value and healthy mutation state. Existing row/column journal, seven-operation differential, event, and transaction suites exercise additional public port operations.

The old `workbook-owned-escape.test.ts` assertion named `R1 mutation port has stable typed calls that reject before any write` conflicts with the subsequent operation-specific Journal packages and is not a current acceptance assertion. It was excluded by the exact Jest name pattern below and is counted as skipped, not passed. This finding does not approve a new operation, resolve general synchronous compatibility/versioning, or close D0-06. The authoritative contract record still describes that broader compatibility question as unresolved.

## C2 — Subscription after Workbook disposal

**Disposition: DOCUMENTED CONTRACT VIOLATION IN THE UNFIXED CANDIDATE; isolated candidate correction verifies conformance.** The accepted PKG-02E lifecycle record says `eventBus.on()` and `once()` reject synchronously after disposal with `WorkbookOperationCancelledError`. Before the PKG-19C correction, the candidate's public facade directly bound these methods to its internal EventBus. `dispose()` cleared existing listeners but did not prevent a new listener from being registered afterward.

A new focused isolated test exercises both calls after disposal. In `/tmp/pkg19c-candidate/packages/core/src/workbook.ts`, the facade now checks the Workbook's existing disposed/mutation guard before delegating `on` or `once`; `off` remains idempotent. This candidate-only change creates no Application event surface. The new isolated test is `packages/core/__tests__/workbook-event-disposal-compatibility.p1-pkg-19c.test.ts`.

## PKG-02F `once` compatibility

The PKG-18 reconstruction deliberately retained clean-base `once` behavior. The accepted PKG-02F correction requires consuming and removing the one-shot wrapper before user code, and protecting isolated dispatch snapshots against a consumed wrapper. The clean-base candidate failed the unchanged PKG-02F reentrancy suite: **1 suite failed, 5/10 tests failed**. Failures include nested same-event re-emission invoking a one-shot callback again; the throwing-callback case recursively re-enters.

In the isolated PKG-19C copy only, `EventBus.once()` now uses the accepted consumed flag, removes itself before calling user code, and ignores a wrapper already present in an isolated snapshot. No event names, payloads, or ordinary dispatch ordering changed. The focused correction follows the implementation and evidence recorded in `CS-002D4-R1-PKG-02F-eventbus-reentrancy.md` and `CS-002D4-R1-PKG-02F-final-disposition.md`.

## Event and disposal coverage

The unchanged PKG-02D/E/G and PKG-02F suites exercised lazy bridge activation/deactivation, formula value notifications, typed row/column payloads, event frequency, same-value/no-op behavior, multi-Worksheet staged notifications, commit-visible state, listener failure isolation, bridge disposal, subscription disposal, disposal during publication, and nested dispatch. The PKG-02F suite directly covers once/nested re-emission and listener mutation under isolated and non-isolated modes. Existing PKG-02G evidence defines only commit-boundary cross-surface semantics; this run adds no global observer-completion ordering guarantee.

## Verification

The final focused command, run in `/tmp/pkg19c-candidate`, was:

```sh
NODE_OPTIONS=--experimental-vm-modules node node_modules/jest/bin/jest.js \
  --config packages/core/jest.typescript-first.config.cjs --runInBand \
  --testNamePattern='^(?!.*R1 mutation port has stable typed calls that reject before any write).*' \
  packages/core/__tests__/workbook-event-disposal-compatibility.p1-pkg-19c.test.ts \
  packages/core/__tests__/eventbus-reentrancy.p1-pkg-02f.test.ts \
  packages/core/__tests__/workbook-dimension-events.p1-pkg-02e.test.ts \
  packages/core/__tests__/workbook-event-contract.p1-pkg-02d.test.ts \
  packages/core/__tests__/workbook-cross-level-compatibility.p1-pkg-02g-c.test.ts \
  packages/core/__tests__/EventBus.workbook-bridge.test.ts \
  packages/core/__tests__/workbook-seven-operation-differential.p1-pkg-02c.test.ts \
  packages/core/__tests__/workbook-owned-escape.test.ts
```

**Result:** 8 suites passed; 56 tests passed, 1 skipped, 57 total. The one skip is the single obsolete disabled-mutation-port assertion above. No assertion was edited. Core typecheck (`npm run typecheck --workspace @cyber-sheet/core`) passed. Candidate `git diff --check` passed.

`EventBus.test.ts` was checked separately with the TypeScript-first resolver and remains compile-blocked before test execution: its legacy Workbook bridge tests call `Workbook.addSheet()` and mutate `WorkbookSheetView`, and pass that view to APIs requiring `Worksheet` (TS2551/TS2345). This compile incompatibility is independent of the EventBus reentrancy suite, which ran and passed after the isolated correction.

An initial attempt with the ordinary Jest config was not used as runtime evidence: stale generated `DependencyGraph.js`/`CellStoreV1.js` resolution caused missing-method errors; `EventBus.test.ts` also had the independent compile diagnostics above. The TypeScript-first rerun avoids the generated-JavaScript resolution hazard. Jest emitted existing ts-jest deprecation and TS151001 advisories.

## Isolated-copy change inventory

Only the following three candidate paths were changed for PKG-19C:

| Candidate path | Purpose | SHA-256 after PKG-19C |
| --- | --- | --- |
| `packages/core/src/EventBus.ts` | Restore accepted PKG-02F consumed-before-callback `once` behavior. | `6e95d462949efbbc4de64cf7e0def3c2daa49e7fb9f168189bdbac133efc4b2d` |
| `packages/core/src/workbook.ts` | Reject `on`/`once` after disposal using the existing Workbook disposed guard. | `5c0d08c0631699aff00f733571191bc1c1040e4013b961c22c2de9d36f678cdb` |
| `packages/core/__tests__/workbook-event-disposal-compatibility.p1-pkg-19c.test.ts` | Direct C1 successful mutation-port and C2 post-disposal subscription assertions. | `8d7b361a5d592f3f890258eef18a4c66b6fcffd49ea21ab2155ba6aca20098f5` |

These are red/green compatibility findings in the isolated candidate, not shared-tree modifications or integration authorization. Do not transfer these files to the shared tree absent the PKG-19 coordinator's separate integration decision. D0 remains **PROPOSED**, D1–D7 remain **PENDING**, and overall CS-002D4-R1 acceptance remains **WITHHELD**.
