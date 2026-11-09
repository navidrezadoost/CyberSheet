# CS-002D4-R1 PKG-12A — Regression results and execution handoff

**Status: COMPLETED — BOUNDED RED/GREEN VERIFICATION PASSED**

This lane authored one focused regression file and its coverage matrix. The coordinator ran serialized Jest windows under Node 24 with the opt-in TypeScript-first resolver and verified the protected sidecars around every window. The first attempt also exposed and corrected a test expectation that conflicted with the owner-view formula-cache masking contract; the corrected test then reproduced the graph-coordinate defect before the narrow source correction.

## Change inventory

- Added `packages/core/__tests__/workbook-merged-member-integrity.p1-pkg-12a.test.ts` (5 parameterized executions covering merged-member formula graph mapping, Journal/Snapshot rollback and event suppression, and a multi-sheet merged-member value/style commit).
- Added `docs/engineering/CS-002D4-R1-PKG-12A-core-integrity-matrix.md`.
- `packages/core/src/worksheet.ts` now uses the resolved merge anchor for formula dependency registration, formula-engine callbacks, recalculation notifications, dependency clearing on formula clear, and dependency clearing when a value replaces a formula. Emitted `cell-changed` addresses retain the originally requested address.
- The implementation-ledger dispositions, frozen registers, protected sidecars, and historical outputs were not modified.
- Raw outputs are preserved in PKG-12R files listed below.

## Red/green evidence

| Run | Result | Interpretation |
| --- | --- | --- |
| Initial focused attempt | 1 suite; 3 passed, 2 failed | The two failures were an invalid expectation that a WorkbookSheetView exposes a formula cached value. The approved owner-view contract masks it to `null`; no product defect was established by this attempt. Output is `CS-002D4-R1-PKG-12R-core-focused-red-output.txt`. |
| Corrected focused test, before source correction | 1 suite; 3 passed, 2 failed | Both Journal and Snapshot confirmed that the formula is stored at the merge anchor but its dependency edge is absent from the anchor. This deterministically reproduced the graph-coordinate defect. Output is `CS-002D4-R1-PKG-12R-core-focused-output.txt` (preserved as the red record). |
| Focused test after correction | 1 suite; 5/5 passed | Formula registration, clearing, and value replacement through merged members use the effective anchor; exact rollback and event suppression pass under Journal and Snapshot. Output: `CS-002D4-R1-PKG-12R-core-focused-green-output.txt`. |
| Adjacent compatibility selection | 7 suites; 152/152 passed | Merge API, detached read identity, sparse null no-op, seven-operation differential/observer isolation, queue, and the new regression pass together. Output: `CS-002D4-R1-PKG-12R-core-adjacent-jest-output.txt`. |

All four Jest windows had 237/237 protected sidecar hashes pass before and after, with byte-identical before/after check outputs. The complete Core typecheck, test hygiene scan, and `git diff --check` passed at PKG-12R.

## Serialized commands and raw evidence

Environment used: Node `v24.22.0`, npm `11.19.1`, Jest `30.5.2`, TypeScript `6.0.3`; opt-in config `packages/core/jest.typescript-first.config.cjs`; all tests serialized with `--runInBand`.

The raw initial and corrected-red outputs are retained; the final green run was:

```sh
PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PATH \
NODE_OPTIONS=--experimental-vm-modules \
node node_modules/jest/bin/jest.js \
  --config packages/core/jest.typescript-first.config.cjs \
  --runInBand \
  packages/core/__tests__/workbook-merged-member-integrity.p1-pkg-12a.test.ts
```

The adjacent compatibility run was:

```sh
PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PATH \
NODE_OPTIONS=--experimental-vm-modules \
node node_modules/jest/bin/jest.js \
  --config packages/core/jest.typescript-first.config.cjs \
  --runInBand \
  packages/core/__tests__/workbook-merged-member-integrity.p1-pkg-12a.test.ts \
  packages/core/__tests__/merge-api.test.ts \
  packages/core/__tests__/merge-read-identity-safety.p1-08as.test.ts \
  packages/core/__tests__/worksheet-null-write-noop.p1-pkg-09c.test.ts \
  packages/core/__tests__/workbook-seven-operation-differential.p1-pkg-02c.test.ts \
  packages/core/__tests__/workbook-seven-operation-observer-isolation.p1-pkg-08b.test.ts \
  packages/core/__tests__/workbook-mutation-queue.p1-pkg-01.test.ts
```

Unfiltered outputs and sidecar checks are stored in `docs/engineering/CS-002D4-R1-PKG-12R-*`. The final post-run manifest check contains 237 successful entries. Core typecheck, test hygiene, and `git diff --check` pass; their raw output files are also under the PKG-12R prefix.

## Interpretation boundaries

- Red evidence showed the formula cell was anchored at `(1,1)` while the precedent edge was not registered there; using the resolved address corrected this bounded defect.
- No seven-operation API, event payload, cross-surface ordering, Pivot behavior, or overall R1 acceptance status changed.
- The new regression and source correction do not establish global transaction closure beyond the tested supported operation set or change unrelated sparse-state semantics.
