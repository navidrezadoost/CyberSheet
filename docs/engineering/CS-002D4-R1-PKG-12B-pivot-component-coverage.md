# CS-002D4-R1 PKG-12B — Pivot component coverage

**Scope:** standalone Pivot components only. No Workbook lifecycle or public API assumptions are used.
**Production changes:** none.
**Test execution:** coordinator ran the serialized component selection; all four suites and 50 tests passed.

## Existing coverage reviewed

The current component tests provide direct evidence for several independently testable contracts:

| Component | Existing coverage | Boundary |
| --- | --- | --- |
| `PivotSnapshotStore` | CRUD, explicit missing reads, replacement, pivot-ID validation, clearing/disposal, size | Stores internal snapshots by ID; it does not detach or freeze values. |
| `PivotRecomputeEngineImpl` | dirty/clean rebuild behavior, repeated queries, rebuild failure and retry, reentrancy, deterministic output | Direct registry/store/engine composition; not Workbook integration. |
| Partial recompute | full/partial equivalence and injected publication, builder, and registry failures | Internal component recovery; not D2 transaction rollback or Workbook lifecycle. |
| Snapshot transformation and query | named aggregate, null, Error, zero, and query behavior in `pivot-named-binding-integration.p1-08ah.test.ts` | Standalone Worksheet → PivotEngine → transformer/store/GetPivotData. |

## Added regression

Added one case to `packages/core/__tests__/pivot-snapshot-store.test.ts`: after a valid snapshot is published, `set()` with a snapshot whose embedded `pivotId` does not match the target throws and leaves the previously published object, row payload, and store size unchanged. This directly exercises the store's validate-before-replace invariant. It neither changes store behavior nor claims Workbook-level last-good lifecycle semantics.

The test and adjacent component suites ran under Node `v24.22.0`, npm `11.19.1`, Jest `30.5.2`, and the opt-in TypeScript-first resolver:

```sh
PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PATH \
NODE_OPTIONS=--experimental-vm-modules \
node node_modules/jest/bin/jest.js \
  --config packages/core/jest.typescript-first.config.cjs --runInBand \
  packages/core/__tests__/pivot-snapshot-store.test.ts \
  packages/core/__tests__/pivot-recompute.test.ts \
  packages/core/__tests__/pivot-named-binding-integration.p1-08ah.test.ts \
  packages/core/__tests__/pivot-partial-recompute-safety.p1-08x.test.ts
```

**Observed result:** 4 suites passed, 50/50 tests. Raw output: `CS-002D4-R1-PKG-12R-pivot-component-jest-output.txt`. All 237 protected sidecar hashes passed immediately before and after; the saved output files are byte-identical. No failure occurred in this selection.

## Component-level conclusions

- A failed `PivotSnapshotStore.set()` validation cannot overwrite an existing entry because the ID check precedes `Map.set`; the added assertion locks that behavior.
- The store itself holds and returns object references. Its “immutable snapshots” documentation describes replace-don't-mutate usage, not runtime freezing or detached reads. Detachment is performed separately at Workbook read boundaries.
- Existing recompute tests already cover builder failure retention of dirty state, missing snapshot on first-build failure, successful retry, and later PKG-08X/AA publication-failure recovery. Repeating those scenarios here would add little coverage.
- `PivotSnapshotTransformer` preserves an `Error` value in a `PivotRow`, and the standalone named-binding integration test verifies an Error reaches `GetPivotData`. That does not verify serialization or detached Workbook reads.

## Explicit exclusions

This lane does not expose registry/store/group-state internals, activate `createPivot()` or `deletePivot()`, alter stale formula behavior under D3-06, or use post-publication sheet mutation. All Workbook-owned Pivot creation, invalidation, refresh, status, and disposal claims remain blocked on the approved facade and lifecycle contract. Overall CS-002D4-R1 acceptance remains **WITHHELD**.
