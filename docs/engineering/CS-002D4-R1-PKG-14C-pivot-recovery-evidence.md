# CS-002D4-R1 PKG-14C — Pivot publication and recovery evidence

**Scope:** Standalone Pivot registry, recompute, snapshot-store, and query components. This evidence does not establish Workbook-owned Pivot lifecycle or publication.
**Production changes:** None.
**New focused test:** `packages/core/__tests__/pivot-recompute-validation-retry.p1-pkg-14c.test.ts` (passed in the PKG-14D focused selection).

## Existing coverage reviewed

The existing suite coverage makes most of the PKG-14C recovery matrix redundant:

| Boundary | Existing evidence | Current limit |
| --- | --- | --- |
| Failed partial publication, last-good retention, and full fallback | `pivot-partial-recompute-safety.p1-08x.test.ts` cases for a failed incremental publication and subsequent full rebuild | Exercises injected store failure; it does not claim rollback of accumulator writes. |
| Full builder failure after group-state population; failed snapshot publication before/after `set`; later retry | Same P1-08X file, including builder/publication failure and retry cases | Component recovery only; no generation token or Workbook publication coordinator. |
| Partial and full publication followed by `markClean` failure | Same P1-08X file | Registry dirty/rebuilding state is observable here; no monotonic generation guarantee is defined. |
| Invalid snapshot ID rejected without replacing prior entry | `pivot-snapshot-store.test.ts`, “rejected replacement preserves the previously published snapshot” | Tests the store directly, not the recompute-engine failure path. |
| Initial build failure then successful retry; query returns `#CALC!` while still dirty | `pivot-recompute.test.ts`, builder-failure and retry cases | The initial-failure case has no prior successful snapshot. |
| Error value through transform/store/query, including identity and native fields | `pivot-named-binding-integration.p1-08ah.test.ts` and `pivot-error-publication.p1-pkg-13c.test.ts` | Standalone in-process component behavior, not a detached Workbook error DTO. |

## Incremental test added

The gap was the composition of two already characterized rules: `PivotSnapshotStore.set()` validates that the snapshot's `pivotId` matches its key, while recompute catches a publication exception and must remain dirty. No prior cited case exercised a naturally invalid builder result while a last-good snapshot was already present and then proved a later valid retry replaces it.

The new test passed 1/1 in PKG-14D and performs three synchronous builds for one registered pivot:

1. A valid initial snapshot is published and the registry becomes clean.
2. The builder returns a snapshot carrying a different Pivot ID. `ensureFresh()` absorbs the validation error; the prior snapshot object remains published, `dirty` remains true, and `rebuilding` is cleared.
3. The builder returns a valid ID again. The retry publishes the new snapshot and marks the registry clean.

This test verifies the existing identifier-validation boundary and retry behavior. It does not assert timestamps as generations, add generation semantics, define stale snapshot formula behavior, or prove atomicity across Workbook-owned collaborators. Raw output is `CS-002D4-R1-PKG-14D-focused-verified-jest-output.txt`.

## Other priorities and limits

- **Dirty/clean generations:** `PivotRegistry` records dirty/clean flags and a `lastBuiltAt` timestamp, while `PivotRecomputeEngineImpl` runs synchronously. The interfaces expose no build generation, source generation, publication token, or asynchronous completion. No generation consistency assertion is introduced.
- **Duplicate publication:** repeated `Map.set` replacement is covered at store level; no stronger deduplication or identity rule is specified. Recompute's clean fast path and existing one-build tests cover the supported synchronous path.
- **Disposal:** `PivotSnapshotStore.clearAll()` and registry clearing have direct component tests. An in-flight disposal/publication race cannot occur in the current synchronous recompute interface; Workbook disposal and late publication remain an owner-level lifecycle question.
- **Repeated failures:** P1-08X already exercises failure followed by retry, including later source edits and invalidated incremental state. No test-only failure cut was added inside an accumulator's individual mutation sequence.
- **Validation:** this lane adds only the mismatched-pivot-ID recompute composition. Other malformed snapshot rules are not inferred; the store's stated validation is ID correspondence.

## Disposition

The new test adds a narrow integration of existing standalone component behavior. Other named recovery paths have prior focused evidence and are not duplicated. No reproduced defect against an approved invariant was found, so no production correction is proposed. Workbook-owned Pivot creation, disposal, generation coherence, D3-06 stale formula behavior, and cross-collaborator atomicity remain outside this lane. Overall CS-002D4-R1 acceptance remains **WITHHELD**.
