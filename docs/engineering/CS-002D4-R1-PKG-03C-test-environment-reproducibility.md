# CS-002D4-R1 PKG-03C — Test-environment reproducibility

**Starting revision:** `88b09634f17f3b39d88a88c5428f76b426459a2b`
**Protected sidecar manifest:** `CS-002D4-R1-PKG-01K-core-sidecar-sha256.txt`; SHA-256 `a6b89cdc3ccd8bfc8c054e5fafcb4dc84ed9ba1347eb2597a3e7bef938969b6c`; 237 entries.

## Tool versions

| Tool | Version used |
| --- | --- |
| Node | v26.10.0 (`node --version`) |
| Jest | 30.5.2 (`node node_modules/jest/bin/jest.js --version`) |
| TypeScript | 6.0.3 (`node node_modules/typescript/bin/tsc --version`) |

PKG-01J/PKG-02C historical commands used repository Node v24.22.0 with Jest serialized and `NODE_OPTIONS=--experimental-vm-modules`. PKG-03C used the currently installed Node v26.10.0. Results are recorded as separate bounded runs, not as an identical-runtime historical comparison.

## Generated source-sidecar hazard and reversible procedure

The nine generated Core source groups can shadow current TypeScript during Jest resolution. A prior PKG-03C verification attempt confirmed this hazard: suites failed with runtime `DependencyGraph.beginMutationJournal` / `setMutationFailureInjector` missing from the resolved generated implementation. The focused reruns parked the nine groups' existing `.js`, `.js.map`, and `.d.ts.map` files under `/tmp/pkg03c-sidecars-88b09634f17f3b39d88a88c5428f76b426459a2b`, ran one Jest process with `--runInBand`, and restored every moved path via a shell `EXIT` trap. The groups were `ExcelColor`, `dag/DependencyGraph`, `headerFooter`, `sdk/errors`, `sdk/pivot`, `storage/CellStoreV1`, `storage/ICellStore`, `types`, and `types/entity-types`.

Exact serialized, reversible isolation shell used for the first PKG-03C run (the second run used the same block with its three Pivot test paths):

```bash
set -euo pipefail
park=/tmp/pkg03c-sidecars-88b09634f17f3b39d88a88c5428f76b426459a2b
paths=(
 packages/core/src/ExcelColor
 packages/core/src/dag/DependencyGraph
 packages/core/src/headerFooter
 packages/core/src/sdk/errors
 packages/core/src/sdk/pivot
 packages/core/src/storage/CellStoreV1
 packages/core/src/storage/ICellStore
 packages/core/src/types
 packages/core/src/types/entity-types
)
restore() {
 for base in "${paths[@]}"; do
  for ext in js js.map d.ts.map; do
   src="$park/$base.$ext"
   dst="$base.$ext"
   if [[ -e "$src" ]]; then mkdir -p "$(dirname "$dst")"; mv "$src" "$dst"; fi
  done
 done
}
trap restore EXIT
for base in "${paths[@]}"; do
 for ext in js js.map d.ts.map; do
  file="$base.$ext"
  if [[ -e "$file" ]]; then mkdir -p "$park/$(dirname "$file")"; mv "$file" "$park/$file"; fi
 done
done
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

Do not overlap this process with another Jest run or another sidecar parking/restoration task. Do not remove, clean, or rewrite the protected artifacts. Verify the full protected manifest before and after every testing window.

The PKG-03C before/after manifest outputs were byte-identical, 237/237 entries. Manifest bytes and hash were unchanged. The prior PKG-02G-C focused run also documented the same source-sidecar resolution hazard and restoration requirement.

## Safe additional coverage

The current test selection covers seven-operation Journal/Snapshot behavior, Workbook event bridges, typed dimensions, EventBus lifecycle, and standalone Pivot query/recompute units. It does not attempt the compile-blocked legacy Workbook/Pivot fixtures or historical full Core suite. The latter remain gated because they require unsupported internal accessors and post-publication sheet creation; no destructive cleanup or broad baseline recapture was needed.
