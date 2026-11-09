# CS-002D4-R1 PKG-03C — Integration verification

**Starting revision:** `88b09634f17f3b39d88a88c5428f76b426459a2b`
**Starting worktree:** 388 dirty paths when PKG-03 began; preserved.
**Production strategy:** Incremental Journal. Snapshot was selected only through existing test hooks.
**Full Core suite:** Not run; historical baseline not recaptured.

## Serialized bounded verification

Environment: Node v26.10.0, Jest 30.5.2, TypeScript 6.0.3. Jest runs used `NODE_OPTIONS=--experimental-vm-modules`, the Core Jest config, `--runInBand`, and the reversible nine-group source-sidecar isolation procedure described in `CS-002D4-R1-PKG-03C-test-environment-reproducibility.md`.

The first attempt at the 11-suite selection, before source-sidecar isolation, failed 10 suites / 133 tests; 1 suite / 37 tests passed. The failures were runtime `DependencyGraph.beginMutationJournal` or `setMutationFailureInjector` missing-method errors from stale generated source-side JavaScript. The same 11-suite command passed after the nine generated source groups were parked and restored. Treat the initial result as a test-resolution hazard, not evidence of a transaction regression.

### Transaction and event selection

The first current run used these 11 suites:

```text
workbook-cross-level-compatibility.p1-pkg-02g-c.test.ts
EventBus.test.ts
eventbus-reentrancy.p1-pkg-02f.test.ts
workbook-dimension-events.p1-pkg-02e.test.ts
workbook-event-contract.p1-pkg-02d.test.ts
EventBus.workbook-bridge.test.ts
workbook-row-height-journal.p1-pkg-02a.test.ts
workbook-column-width-journal.p1-pkg-02b.test.ts
workbook-seven-operation-differential.p1-pkg-02c.test.ts
workbook-mutation-queue.p1-pkg-01.test.ts
workbook-owned-escape.test.ts
```

Exact invocation form:

```sh
NODE_OPTIONS=--experimental-vm-modules node node_modules/jest/bin/jest.js \
  --config packages/core/jest.config.cjs --runInBand \
  packages/core/__tests__/workbook-cross-level-compatibility.p1-pkg-02g-c.test.ts \
  packages/core/__tests__/EventBus.test.ts \
  packages/core/__tests__/eventbus-reentrancy.p1-pkg-02f.test.ts \
  packages/core/__tests__/workbook-dimension-events.p1-pkg-02e.test.ts \
  packages/core/__tests__/workbook-event-contract.p1-pkg-02d.test.ts \
  packages/core/__tests__/EventBus.workbook-bridge.test.ts \
  packages/core/__tests__/workbook-row-height-journal.p1-pkg-02a.test.ts \
  packages/core/__tests__/workbook-column-width-journal.p1-pkg-02b.test.ts \
  packages/core/__tests__/workbook-seven-operation-differential.p1-pkg-02c.test.ts \
  packages/core/__tests__/workbook-mutation-queue.p1-pkg-01.test.ts \
  packages/core/__tests__/workbook-owned-escape.test.ts
```

**Result:** 11 suites passed, 170/170 tests passed. This exercises the supported seven-operation Journal/Snapshot slice and event lifecycle without asserting any eighth operation.

### Standalone Pivot selection

Exact serialized invocation:

```sh
NODE_OPTIONS=--experimental-vm-modules node node_modules/jest/bin/jest.js \
  --config packages/core/jest.config.cjs --runInBand \
  packages/core/__tests__/getpivotdata.test.ts \
  packages/core/__tests__/pivot-snapshot-store.test.ts \
  packages/core/__tests__/pivot-recompute.test.ts
```

**Result:** 3 suites passed, 50/50 tests passed. These tests do not use Workbook registry/store accessors or claim Workbook-owned Pivot integration.

## Failure classification

No failures occurred in the bounded current PKG-03C runs. Historical PKG-01J evidence remains nine failed suites / 19 failed tests, classified as seven compile-blocked suites, 18 Pivot fixture setup failures, and one executed BT-2 merged-read identity assertion. PKG-02C separately retried `workbook-snapshot-integration.test.ts`: compile-time missing registry/snapshot-store accessors, zero tests executed. Those failures were not rerun here and are not represented as newly observed or fixed.

The package's current source has no public `getPivotRegistry()` or `getPivotSnapshotStore()`. `getPivotSnapshot()` is a detached read, while `createPivot()`, `deletePivot()`, and post-publication `addSheet()` currently reject. There is no supported public fixture that supplies equivalent Workbook-owned registration/lifecycle behavior. Standalone calculation tests passed, but cannot replace missing integration reachability.

## Integrity and hygiene

- Protected Core sidecar manifest checked before and after both Jest runs: 237/237 entries passed; before/after command output identical.
- Manifest SHA-256 remained `a6b89cdc3ccd8bfc8c054e5fafcb4dc84ed9ba1347eb2597a3e7bef938969b6c`.
- No source or test files were changed in PKG-03C; the workstream added only its three reports. Therefore Core typecheck was not rerun. Existing PKG-02C typecheck passed; PKG-03C's own scope is documentation and bounded test execution.
- `git diff --check` is recorded at the PKG-03R integration gate after all workstream documents are integrated.
- Existing ts-jest `globals` deprecation and TS151001 `esModuleInterop` advisories were non-failing.

Remaining: no full Core baseline recapture; no Pivot accessors or sheet lifecycle enabled; the shared FIFO self-await limitation remains separate. Overall CS-002D4-R1 acceptance remains WITHHELD.
