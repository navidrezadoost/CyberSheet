# CyberSheet Progress Report — CS-002D

**Status:** Bounded audit complete; cross-sheet architecture open · **Priority:** P0 · **Reported:** 2026-10-17  
**Branch:** `main` · **Base HEAD:** `ec75a6e5d3e916047d42378f087e19251e30092b` · **Worktree:** uncommitted  
**Environment:** Manjaro Linux 6.12.94-1 (x86_64); Node v24.22.0; npm 11.19.1; TypeScript 6.0.3; Jest via package configs; browser: N/A.

## Goal and expected behavior

Audit worksheet identity, cross-sheet references, compact range watchers, coordinate packing, relocation, and rollback. Repair demonstrated local defects while preserving the CS-002C core failure identities and the existing coordinate, cycle, patch, transaction, and XLSX gates. A workbook-scoped graph rewrite requires a proved failing scenario and a separate design decision.

## Identity and dependency findings

| Boundary | Representation and observed behavior | Decision |
| --- | --- | --- |
| Local graph identity | Each `Worksheet` owns a `DependencyGraph`. Nodes are numeric `row * 20_000 + col`, with no sheet component. Identical coordinates on separate sheets do not collide because the graphs are separate. `FormulaEngine` also has a coordinate-only private dependency map. | Keep the local graph for local formulas; cross-sheet edges need a workbook-scoped layer or a scoped node key. |
| Worksheet ID | Previously `ws-${name}-${Date.now()}`. Creating same-named sheets in separate workbooks during the same millisecond produced identical IDs. | IDs now use a process-local monotonic sequence independent of the mutable sheet name. Rename and same-object `applySnapshot()` retain the ID; deleting and recreating a sheet gives a new ID. |
| Persisted identity | `WorksheetSnapshot` and `SnapshotCodec` contain cells, DAG edges, and other sheet state, but no worksheet ID or workbook manifest. Loading into a new `Worksheet` therefore produces a new ID. | Persisted workbook identity, import/clone policy, and duplicate-ID handling require a versioned workbook snapshot design. Do not infer identity from sheet names. |
| Cross-sheet reference | The extractor formerly stripped `Source!` and registered `A1` as a *local* precedent. The evaluator returns `#NAME?` for `=Source!A1+1`; editing `Source!A1` does not dirty the dependent. | Qualified tokens are now excluded from local graph registration, preventing false local invalidation. Evaluation and propagation remain open P0 architecture work. |
| Compact range watchers | Rectangles live in `DependencyGraph.rangeDependencies`; interior, inclusive boundary, nested, and overlapping edits dirty the correct formulas. They are not serialized in the binary DAG section. | `applySnapshot()` reconstructs watchers from each restored formula while retaining the serialized direct edges. Replacement, clearing, rollback, and row relocation have focused coverage. Explicit ranges registered without corresponding formula text are still not persisted. |
| Coordinate packing | `packKey()` accepts zero-based internal coordinates but previously skipped validation in production; an oversized column could alias a different row. Public worksheet reads and graph diagnostics lacked bounds checks. | Packing now rejects unsafe row/column inputs in all environments. Public cell reads, graph queries, lazy evaluation, and snapshot graph/cell inputs validate one-based Excel bounds before packing or replacing live state. |

The diagnostic cross-sheet probe used two sheets named `Source` and `Target`, assigned `Source!A1=10`, then set `Target!B1` to `=Source!A1+1`. It expected 11 and received `#NAME?`. A separate probe set the formula first, edited `Source!A1`, and expected `Target!B1` to be dirty; it was false. The probe was intentionally removed after the failing run so the already-red release suite did not acquire two known failures. To reproduce, create those sheets with a shared `FormulaEngine`, call `target.autoRecalculate()`, and inspect `target.getCellValue({row:1,col:2})` and `target.isDirty({row:1,col:2})` after editing the source.

The desired assertion can be rerun as a temporary Jest test under `packages/core/__tests__/`:

```ts
const wb = new Workbook();
wb.setFormulaEngine(new FormulaEngine() as any);
const source = wb.addSheet('Source');
const target = wb.addSheet('Target');
source.setCellValue({ row: 1, col: 1 }, 10);
target.setCellFormula({ row: 1, col: 2 }, '=Source!A1+1');
target.autoRecalculate();
expect(target.getCellValue({ row: 1, col: 2 })).toBe(11); // received '#NAME?'
source.setCellValue({ row: 1, col: 1 }, 20);
expect(target.isDirty({ row: 1, col: 2 })).toBe(true); // received false
```

## Files changed and public API

- `packages/core/src/worksheet.ts`: generated IDs; read/graph boundary checks; atomic validation of snapshot cell and graph coordinates; watcher reconstruction on snapshot restore; one-based lower bounds in contiguous-region scanning.
- `packages/core/src/storage/CellStoreV1.ts`: unconditional packed-key validation.
- `packages/core/src/utils/formula-reference-extractor.ts`: exclude complete sheet-qualified references from local dependency extraction, including quoted sheet names and ranges.
- `packages/core/__tests__/cs-002d-dependency-boundaries.test.ts`: nine focused identity, isolation, range, lifecycle, snapshot, rollback, and boundary regressions.
- `packages/core/__tests__/workbook-pivot-integration.test.ts`: assert ID independence from sheet name and stability across rename.
- `packages/core/__tests__/chaos.test.ts`: convert a read-only probe from zero-based to the documented one-based public address contract.

No method signatures changed. `getWorksheetId()` values are now opaque sequence IDs without the sheet name or timestamp; consumers must not parse them. Invalid reads and graph queries that previously returned empty/null data may now throw `RangeError`. Snapshot application rejects invalid graph coordinates before altering the current worksheet.

## Tests and exact results

- Focused CS-002D and workbook ID suites: `PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PATH node ./node_modules/jest/bin/jest.js --config packages/core/jest.config.cjs --ci --runInBand --coverage=false --silent packages/core/__tests__/cs-002d-dependency-boundaries.test.ts packages/core/__tests__/workbook-pivot-integration.test.ts` — **pass**, 2 suites / 16 tests at first run. The CS-002D suite was then expanded to nine tests; its isolated rerun passed 1 suite / 9 tests. The final full core run includes all nine.
- Full core: `PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PATH node ./node_modules/jest/bin/jest.js --config packages/core/jest.config.cjs --ci --runInBand --logHeapUsage --coverage=false --json --outputFile=/tmp/cs-002d-final-core-results.json` — **fail**, 235 suites: 212 passed, 18 failed, 5 skipped. Of 6,938 tests: 6,651 passed, 105 failed, 173 skipped, 9 todo. Runtime 68.902 seconds; zero runtime-error suites. Against `/tmp/cs-002c-final-core-results.json`, **0 new failed identities, 0 resolved, 105 unchanged**. The additional suite contains nine new passing tests.
- IO-XLSX: `NODE_OPTIONS=--experimental-vm-modules PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PATH node ./node_modules/jest/bin/jest.js --config packages/io-xlsx/jest.config.cjs --ci --runInBand --coverage=false --silent` — **pass**, 2 suites, 25 passed / 2 skipped.
- `PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PATH npm run build` — **pass**. `PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PATH npm run check:no-focused-tests` — **pass**. `git diff --check` — **pass**.
- A deliberately failing cross-sheet diagnostic probe ran in isolation: 2 tests failed with the `#NAME?` and missing-dirty results described above. It was removed before the final full run. The 10,000-operation memory-growth assertion failed once under the first full-suite load and passed when rerun alone; the final full run passed it. No expectation or threshold was changed.

The existing full-core baseline remains red due to the same 105 identities recorded in the [CS-002C inventory](CS-002C-failure-inventory.json). The new suite has no skips or weakened expectations. Jest emitted its existing ts-jest advisories; npm emitted its existing global `tmp` configuration warning.

## Benchmarks and quality effects

No controlled before/after benchmark was run. The 10,000-operation memory assertion is load-sensitive and is not a memory-growth certification. Hardware and dataset for a controlled benchmark are therefore not reported. No security audit or browser run was performed. The XLSX gate passed; no XLSX serialization behavior changed. The snapshot fix restores formula-derived range invalidation without expanding large rectangles into per-cell edges.

## Open defects and escalation

| Severity | Defect / risk | Owner | Reproduction and workaround |
| --- | --- | --- | --- |
| P0 | Cross-sheet formulas evaluate as `#NAME?` and source edits do not invalidate dependents. No workbook-scoped dependency identity exists. | Workbook / formula architecture owner | Use the `Source` / `Target` two-sheet probe above. No verified workaround for live cross-sheet formulas; use same-sheet references only. Design stable sheet-scoped keys, evaluation context, rename/delete semantics, and workbook event propagation before implementation. |
| P1 | `Workbook.getSheet()` resolves names, while some pivot paths pass a field called `worksheetId` to it; IDs and names are not interchangeable. | Workbook / pivot integration owner | Trace `Workbook.buildPivot()` and `createPivot()` with `ws.getWorksheetId()` as the source selector. Keep this under CS-006A unless the workbook identity design changes its contract. |
| P1 | Snapshot format does not persist sheet identity or explicit manually registered range watchers. Rehydration into a different worksheet creates a new ID. | Persistence / workbook owner | Encode `ws.extractSnapshot()`, decode, apply to a new worksheet, and compare IDs; manually registered watcher rectangles cannot be recovered from formula text. Same-object restoration preserves ID; formula-derived watchers are reconstructed. |
| P1 | Structural insertion can move a populated cell beyond Excel limits, and worksheet `rowCount` / `colCount` can grow beyond the public address contract. | Worksheet structure owner | Populate the last Excel row or column, then insert before it; inspect remapped state and graph rebuild. Avoid insertion that would move populated cells beyond XFD1048576. A preflight plus dimension policy needs a focused ticket because default `colCount` is already 16,384. |
| P2 | `dag-debug.test.ts` still uses `(0,0)` and remains one of the 105 pre-existing failures. | Core test owner | Run the suite, migrate its fixture to one-based coordinates, and retain strict worksheet validation. |
| P2 | 10,000-operation memory-growth ratio varies under full-suite load. | Performance owner | Run the named assertion in `InsertDeleteColumn.test.ts` under controlled, repeated conditions with heap snapshots. No threshold change was made. |

Pivot and statistics failures remain under CS-006A and CS-005A. CS-001C mutation-journal, CS-004 export integrity, and clean-checkout CI obligations remain separate.

## Next focused ticket

**CS-002D.2 — Cross-sheet dependency design and persisted identity.** Specify a workbook-level dependency index keyed by stable sheet ID and local packed cell key, formula reference parsing/evaluation, rename/delete behavior, and snapshot clone/restore semantics against the failing two-sheet probe before changing the graph model. Preserve the 105-identity core baseline and the passing XLSX gate. No commit or production merge was made.
