# CS-002D4-R1 PKG-02D — Verification Record

## Baseline and change boundary

- Starting Git revision: `88b09634f17f3b39d88a88c5428f76b426459a2b`.
- Starting worktree: already dirty, 357 `git status --short` entries. The existing state was preserved; no reset, cleanup, or unrelated edit was made.
- Protected sidecar manifest: `docs/engineering/CS-002D4-R1-PKG-01K-core-sidecar-sha256.txt`, SHA-256 `a6b89cdc3ccd8bfc8c054e5fafcb4dc84ed9ba1347eb2597a3e7bef938969b6c`, 237 entries.
- PKG-02D adds one focused test file and four engineering reports. No production source, public API, mutation operation, ledger disposition, frozen register, historical manifest, or acceptance baseline changed.
- The nine generated untracked Core source JavaScript sidecars listed in prior PKG-02 verification were parked and restored around Jest with a shell `trap`; no sidecar contents were edited.

## Focused regression selection

Command (Node v24.22.0 with `NODE_OPTIONS=--experimental-vm-modules`, serialized Jest; the nine generated Core source sidecars were parked/restored during the invocation):

```sh
node node_modules/jest/bin/jest.js --config jest.config.js --runInBand --coverage=false \
  packages/core/__tests__/workbook-event-contract.p1-pkg-02d.test.ts \
  packages/core/__tests__/EventBus.workbook-bridge.test.ts \
  packages/core/__tests__/workbook-row-height-journal.p1-pkg-02a.test.ts \
  packages/core/__tests__/workbook-column-width-journal.p1-pkg-02b.test.ts \
  packages/core/__tests__/workbook-seven-operation-differential.p1-pkg-02c.test.ts
```

Result: **5 suites passed, 53/53 tests passed**.

The four new focused cases establish:

1. No Worksheet bridge listener is installed before public subscription. First subscription installs one listener per Workbook Worksheet; additional subscribers reuse it; non-final unsubscribe keeps it; final unsubscribe disposes it; re-subscribe wires it again.
2. Repeated/same-value row-height writes and column-width writes publish generic Worksheet events only, in staged cross-sheet order, and do not publish a named Workbook `sheet-mutated` event.
3. Workbook EventBus listener exceptions are reported and isolated; later observers run, and committed state remains.
4. Disposal during Workbook notification leaves the committed state intact and stops remaining observers. Separate lifecycle characterization confirms Workbook disposal alone does not dispose bridge listeners; the retained public unsubscribe closure does.

Existing PKG-02A/B/C tests in the same run continue to verify all seven operations, mixed cross-sheet order, no pre-commit visibility, clean rollback event suppression under Journal/Snapshot, same-value dimension frequency, and the existing cell bridge behavior.

## Additional checks

| Check | Result |
| --- | --- |
| Core typecheck: `node node_modules/typescript/bin/tsc -p packages/core/tsconfig.json --noEmit` using Node v24.22.0 | Passed |
| Focused marker hygiene (`.only`, `.fit`, `fdescribe`, `fit`) in the five selected tests | No focused markers found |
| `git diff --check` | Passed |
| Protected sidecar manifest before execution | 237/237 matched; manifest digest as above |
| Protected sidecar manifest after execution | 237/237 matched |
| Full Core suite | Not run; not required by the bounded directive |

Jest emitted the existing ts-jest `globals` deprecation and TS151001 `esModuleInterop` advisories. They were non-failing. The first test attempt failed at TypeScript diagnostics because the new Jest spy lacked an explicit `this` type; the test-only typing was corrected, and the final selection passed. The failed attempt made no source or sidecar changes.

## Adjacent Pivot classification

The legacy `workbook-snapshot-integration.test.ts` compile blocker remains as recorded by PKG-02C: absent `getPivotSnapshotStore()` and `getPivotRegistry()` declarations, zero tests executed. It was not rerun or modified for PKG-02D. This is a compile-time fixture/API block, independent of the event contract; no Pivot accessors were added. Historical Core failures were not reinterpreted.

## Verification limitations

These tests verify synchronous observers and the current event surfaces; they do not establish an Application event bridge or asynchronous-listener scheduling policy. D5-05 remains unresolved. The test also establishes current lazy bridge retention after `Workbook.dispose()`; it does not claim that retaining a disposed Workbook is resource-safe in every host lifecycle.
