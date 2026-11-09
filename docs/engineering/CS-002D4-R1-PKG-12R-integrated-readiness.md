# CS-002D4-R1 PKG-12R — Integrated readiness

**Gate: CORE AND PIVOT COMPONENT RELIABILITY IMPROVED — AUTHORITY PENDING**

**Overall CS-002D4-R1 acceptance: WITHHELD**

PKG-12 added a deterministic merged-member formula-graph regression, corrected the confirmed anchor-coordinate defect, extended standalone Pivot snapshot-store coverage, and consolidated existing authorization records. Workbook-owned Pivot lifecycle and comment deletion remain unavailable for implementation because the required owner decisions and separate implementation authorizations are not evidenced.

## Starting state and execution environment

- Starting Git HEAD: `88b09634f17f3b39d88a88c5428f76b426459a2b`; HEAD did not change.
- The worktree was already broadly dirty and was preserved. No files were staged, reset, cleaned, or committed. A 493-path status count was observed during lane execution; it includes the PKG-12 additions and is not represented as the exact pre-task count.
- Declared runtime used for Jest and Core typecheck: Node `v24.22.0`, npm `11.19.1`; Jest `30.5.2`, TypeScript `6.0.3`.
- Core Jest used `packages/core/jest.typescript-first.config.cjs`, `NODE_OPTIONS=--experimental-vm-modules`, and `--runInBand`.
- Full Core was not rerun. The PKG-11 diagnostic remains the latest full run: 298 suites discovered; 286 passed, 7 failed, 5 skipped; 7,273 passed, 18 failed, 173 skipped, 9 todo. Its seven failures remain six compile-blocked Pivot suites and one setup-blocked Pivot suite; there were no executed assertion failures in that diagnostic.

## Lane A — Core transaction and read integrity

### Finding and correction

The new `workbook-merged-member-integrity.p1-pkg-12a.test.ts` first checks that a formula written through a merged member is stored and registered at the effective anchor. A corrected pre-fix run failed in both Journal and Snapshot: the cell and formula were stored at anchor `(1,1)`, but `getPrecedents(anchor)` was empty because formula dependencies were registered using the requested member address. The initial test attempt also had two invalid expectations that an owner-backed `WorkbookSheetView` exposed a formula cached value; that view intentionally returns `value: null`. The test was corrected to follow the existing read contract before the graph defect was classified.

The narrow correction in `packages/core/src/worksheet.ts` now uses the resolved anchor for formula dependency registration, formula-engine callbacks, recalculation notifications, and dependency clearing when a formula is cleared or replaced by a value. The emitted `cell-changed` event keeps its original requested address; event schemas, frequency, and cross-surface ordering were not changed.

The regression covers formula dependency creation, clearing, and value replacement through a merged member under Journal and Snapshot; exact rollback and suppressed events under both strategies; and a multi-Worksheet merged-member value/style commit. The final focused run passed **5/5**. The adjacent merge, detached-read, sparse-null, seven-operation differential/observer, and queue selection passed **7 suites / 152 tests**. Both raw red attempts and the green outputs are retained in the PKG-12R artifacts.

Relative-reference origin semantics when a formula is entered through a merged non-anchor member remain uncharacterized; this regression uses an absolute precedent. No change was made to formula text parsing or the requested address used to extract relative references.

Existing coverage was reviewed rather than duplicated: PKG-09 null-write behavior; PKG-02C seven-operation mixed rollback and differential equivalence; PKG-08B observer isolation; PKG-10B/AS merged-read detachment and value-write redirection; PKG-02D/E/F/G-C event bridge, ordering, listener failure, and disposal; and PKG-11B queue/event selections.

## Lane B — Standalone Pivot components

Added one `PivotSnapshotStore` regression: a rejected replacement whose embedded `pivotId` does not match the target must preserve the previous published snapshot and store size. The standalone suite also exercises recompute failure/retry, partial-recompute recovery, named binding, transformed rows, and `GetPivotData`. The focused component window passed **4 suites / 50 tests**.

This is component-level evidence only. It does not enable `createPivot()` or `deletePivot()`, add registry/store getters, expose mutable Worksheets, or establish Workbook-owned Pivot creation, invalidation, refresh, status, disposal, or atomic publication.

The PKG-11C Error-detachment observation was examined against current source and contract evidence. `PivotRow` accepts `Error`; the standalone transformer and query path preserve it. Generic Workbook `detachReadonly()` copies enumerable properties, losing standard non-enumerable Error fields. However, D3-05 does not specify the representation of Error values inside snapshot rows, and the Workbook-owned public creation path remains unavailable. This is therefore a concrete contract dependency, not a demonstrated public contract violation. The lane made no DTO or production change. The Pivot owner must decide whether a snapshot-row error uses an immutable Error-compatible value or a detached documented error record before public-read acceptance is tested.

## Lane C — Consolidated authorization gate

`CS-002D4-R1-PKG-12C-consolidated-implementation-decisions.md` reconciles existing records without repeating the unchanged authority search, transmitting a request, or inferring an approval:

- Workbook Pivot lifecycle: PKG-11C remains a proposal; no owner decision or implementation authorization.
- Comment deletion: contract questions remain deferred; implementation is not authorized.
- D5-01: Option C remains an engineering recommendation pending owner approval; authoritative wording is unchanged.
- D5-05, D3-06, D7-05, and global D2-11 remain unresolved at their recorded boundaries.
- Workbook/API, Worksheet/API, and D5 decision authority are not verified by an attributable designation in the reviewed records.
- Shared FIFO self-await remains a known separate limitation.

No optional implementation branch was activated. No owner response or approval is claimed.

## Verification and integrity

| Check | Result |
| --- | --- |
| PKG-12A focused regression after correction | 1 suite, 5/5 passed |
| PKG-12A adjacent Core selection | 7 suites, 152/152 passed |
| PKG-12B standalone Pivot component selection | 4 suites, 50/50 passed |
| Core typecheck | Passed |
| `scripts/check-no-focused-tests.mjs` | Passed; no focused markers |
| `git diff --check` | Passed |
| PKG-12 Markdown whitespace/final-newline scan | 6 Markdown files checked; passed |
| Protected Core sidecar manifest | 237/237 passed before and after every Jest window; each saved before/after output was byte-identical |

The manifest remains `docs/engineering/CS-002D4-R1-PKG-01K-core-sidecar-sha256.txt`, SHA-256 `a6b89cdc3ccd8bfc8c054e5fafcb4dc84ed9ba1347eb2597a3e7bef938969b6c`. No protected sidecar was parked, deleted, or rewritten. The initial invalid-expectation run and pre-fix red run are retained as diagnostic history; the final focused green, adjacent, and Pivot component outputs are separate artifacts. Existing ts-jest `globals` deprecation and TS151001 `esModuleInterop` advisories were non-failing.

Raw outputs and check files use the `CS-002D4-R1-PKG-12R-` prefix under `docs/engineering/`. Lane reports provide the exact test scope. No full Core run, historical baseline recapture, or benchmark was performed.

Raw Jest output SHA-256 values: initial formula-cache expectation attempt `1463aa735d756dbe3300b0c91e2dcb927b6f6d786f1f309de56357016432ff3f`; corrected pre-fix red `aa1aacdbbefd067ff40872bc044255beeb142f0ae7c6d8f9e46bfe74aadb6d46`; focused post-fix green `895bb83980a24c945af8797424380d501ab9a8555dde8333d737ca909ed6e1d3`; adjacent Core selection `7078ad7b7358ff9399f9ecfb7b2e35041c396a3a8bfe4d47bdbb0d1d16e5bc49`; Pivot component selection `77a2d5610007bd2d83bca76e696c7becfada41649bbd8d091ffb893e7bed9115`.

## Change boundary and handoff

The PKG-12 contribution was limited to the reproduced merged-member dependency coordinate correction in `packages/core/src/worksheet.ts`, its focused Core regression, the standalone Pivot snapshot-store regression, and the PKG-12 lane/integrated reports plus raw verification artifacts. Pre-existing dirty work was preserved. PKG-12 did not change the seven-operation public API, default Journal strategy, event payloads/order, persistence, authoritative contracts, D5-05 forwarding, ledger dispositions, frozen registers, or historical acceptance baseline.

The next executable implementation scope depends on an attributable owner decision and separate implementation authorization. For Workbook Pivot, that requires explicit facade/lifecycle choices in PKG-11C, including the Error row-value representation and D3-06 separately. For comment deletion, resolve the existing PKG-07 contract questions first. Until then, continue only independently authorized component verification; do not implement Workbook-owned Pivot lifecycle or comment deletion.

**Overall CS-002D4-R1 acceptance remains WITHHELD.**
