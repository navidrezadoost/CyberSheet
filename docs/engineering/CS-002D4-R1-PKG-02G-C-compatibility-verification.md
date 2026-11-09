# CS-002D4-R1 PKG-02G-C — Compatibility verification

**Interpretation under test:** Option C, commit-boundary propagation.
**Production changes:** None.
**Full Core suite:** Not run.

## Starting state and evidence boundary

- Starting Git HEAD: `88b09634f17f3b39d88a88c5428f76b426459a2b`.
- The worktree already contained 380 dirty paths before PKG-02G-C edits. Those unrelated changes were preserved. This checkpoint added the focused test and three PKG-02G-C reports only.
- Protected Core sidecar manifest: `docs/engineering/CS-002D4-R1-PKG-01K-core-sidecar-sha256.txt`; 237 entries. Its own SHA-256 was `a6b89cdc3ccd8bfc8c054e5fafcb4dc84ed9ba1347eb2597a3e7bef938969b6c` at the starting check.
- Jest initially resolved stale generated source-side JavaScript and failed across existing suites with missing `DependencyGraph.beginMutationJournal` / `setMutationFailureInjector` methods. The nine protected source-sidecar groups were then temporarily isolated during Jest and restored before post-run hash verification. This is a test-resolution condition, not a production source change.

## Focused behavior coverage

New test file: `packages/core/__tests__/workbook-cross-level-compatibility.p1-pkg-02g-c.test.ts`.

- Cell/value and Cell/style Workbook bridge activation before and after direct Worksheet subscriptions; both observers see committed state. No global cross-surface callback order is asserted.
- Mixed seven-operation transaction across two Worksheets, under Journal and Snapshot: value/formula writes, content/formula clears, style write, row height, and column width. Notifications remain unpublished inside the transaction callback, Worksheet staging trace is retained, existing formula/value Workbook names and payloads remain present, and all observers read final committed state.
- Cell no-op suppression and event frequency for repeated dimension writes.
- Clean rollback suppresses Worksheet and Workbook events and restores observed state under Journal and Snapshot.
- Existing PKG-02D/E/F suites exercise typed dimension events, EventBus registration/nesting/`once`, listener failure isolation, and disposal during publication. The compatibility set also includes the seven-operation differential tests under both strategies.

These tests establish observed behavior for the tested operations and surfaces; they do not prove Application-level propagation, a total cross-surface callback order, global D2-11 closure, or formal approval of Option C.

## Commands and results

The initial sidecar baseline check passed:

```sh
sha256sum -c docs/engineering/CS-002D4-R1-PKG-01K-core-sidecar-sha256.txt
```

Focused Jest selection (Node v24.22.0, serialized; the nine source sidecar groups were parked and restored around the run):

```sh
NODE_OPTIONS=--experimental-vm-modules node node_modules/jest/bin/jest.js --config packages/core/jest.config.cjs --runInBand \
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

**Result:** 11 suites passed, 170/170 tests passed. Non-failing existing ts-jest `globals` deprecation and TS151001 `esModuleInterop` advisories were emitted.

Additional checks:

- Core typecheck: `node node_modules/typescript/bin/tsc -p packages/core/tsconfig.json --noEmit` — passed.
- Focused-test hygiene: `node scripts/check-no-focused-tests.mjs` — passed; no focused test markers found.
- `git diff --check` — passed.
- Protected sidecar verification after Jest: `sha256sum -c docs/engineering/CS-002D4-R1-PKG-01K-core-sidecar-sha256.txt` — all 237/237 entries passed. The before and after verification outputs were identical. The manifest SHA-256 remains `a6b89cdc3ccd8bfc8c054e5fafcb4dc84ed9ba1347eb2597a3e7bef938969b6c`.

No full Core suite was run. An unrelated Pivot integration compilation blocker and the shared FIFO self-await limitation remain separate issues; this focused run does not resolve them.
