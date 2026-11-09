# CS-002D4-R1 PKG-10R — Integrated Core readiness

**Gate: POST-CORRECTION CORE BASELINE ESTABLISHED — diagnostic only**
**Overall CS-002D4-R1 acceptance: WITHHELD**

The full post-PKG-09 Core diagnostic completed across all discovered suites and every failure is classified by stage and ownership/contract boundary. It establishes a reproducible current diagnostic, not the frozen historical acceptance baseline or a clean-worktree regression comparison. Core is still non-green; Workbook-owned Pivot integration remains unreachable through current supported public APIs, and the legacy merge identity assertion conflicts with an approved contract.

## Starting state and environment

- Git HEAD: `88b09634f17f3b39d88a88c5428f76b426459a2b`.
- Worktree was already dirty. Immediately before the PKG-10A Jest run, Lane A observed 463 status paths; those changes were preserved.
- Runtime: Node `v26.10.0`, npm `12.2.0`, Jest `30.5.2`, TypeScript `6.0.3`, ts-jest `29.4.15`. The repository-declared Node/npm versions differ from the observed versions.
- Resolver: opt-in `packages/core/jest.typescript-first.config.cjs`; default Core Jest configuration unchanged.
- Protected sidecars: the PKG-01K manifest has 237 entries and SHA-256 `a6b89cdc3ccd8bfc8c054e5fafcb4dc84ed9ba1347eb2597a3e7bef938969b6c`.

## Lane A — Full post-correction Core diagnostic

One serialized Jest process used `NODE_OPTIONS=--experimental-vm-modules`, the opt-in resolver, `--runInBand --verbose`, and the full Core test inventory. No suites were excluded. The run completed in 181.377 seconds, exit code 1:

- **298 suites:** 285 passed, 8 failed, 5 skipped.
- **7,473 tests:** 7,272 passed, 19 failed, 173 skipped, 9 todo.
- Raw output: [PKG-10A full Core Jest output](CS-002D4-R1-PKG-10A-post-correction-core-jest-output.txt), SHA-256 `f373de279f9530c71c53cbc6f1b6be02292a12f155c33781a5f7d508712d8fc2`.

The eight failed suites contain three failure classes:

| Class | Suites / cases | Classification |
| --- | ---: | --- |
| TypeScript compilation | 6 suites; 0 tests executed | Legacy Pivot fixtures use unavailable registry/store/invalidation accessors or require mutable `Worksheet` APIs from a read-only `WorkbookSheetView`. |
| Fixture setup | 1 suite / 18 setup failures | `pivot-formula-integration.test.ts` calls post-publication `Workbook.addSheet()`, which rejects before intended Pivot assertions. |
| Executed assertion | 1 suite / 1 assertion | `merge-api.test.ts` expects anchor/member `getCell()` reads to share object identity; detached reads return equal contents in distinct objects. Lane B classifies this as an incompatible test expectation under approved D7-02. |

There were no test-runner resolver failures. The expanded resolver compatibility suite was not among the failed suites. The six compile-blocked suites and 18 setup failures do not execute the Workbook-owned Pivot behavior their historical fixtures intended to test.

### Delta from PKG-09B pre-correction diagnostic

PKG-09B and PKG-10A used the same HEAD, opt-in resolver, serialized full Core selection, and 298-suite inventory. The test count increased by five because the focused null-write test grew from one case to six cases to cover standalone, Journal, Snapshot, and formula-clearing behavior.

| Category | PKG-09B | PKG-10A | Delta/classification |
| --- | ---: | ---: | --- |
| Passed suites | 284 | 285 | +1 |
| Failed suites | 9 | 8 | -1 |
| Skipped suites | 5 | 5 | Unchanged |
| Passed tests | 7,266 | 7,272 | +6: five added regression cases plus the formerly failing sparse-state case |
| Failed tests | 20 | 19 | -1: absent-null sparse-state assertion now passes |
| Skipped tests | 173 | 173 | Unchanged |
| Todo tests | 9 | 9 | Unchanged |
| Total tests | 7,468 | 7,473 | +5 new focused cases |

The same eight residual suites and same 19 failure cases remain: six compile-blocked, 18 setup-blocked, and one executed BT-2 assertion. No failure changed execution stage. No newly failing suite appeared. The null-write test passes post-correction. These are observed deltas in a dirty worktree; they do not establish provenance of other historical failures.

## Lane B — Merge identity disposition

**Disposition: TEST EXPECTATION INCOMPATIBLE.** The authoritative contract `docs/engineering/CS-002D4-R1-authoritative-contracts.md` marks D7-02 owner-approved: merged anchor/member read objects are independently owned, and equal contents do not imply object identity. `Worksheet.getCell()` resolves a member address to the anchor, then returns a detached read; `WorkbookSheetView` detaches again. The existing BT-2 `toBe(anchor)` assertions conflict with that rule. The existing AS characterization verifies equal content with distinct frozen/detached reads and passes. D7-05's public provenance DTO shape remains a separate unresolved blocker.

The serialized focused run executed `merge-api.test.ts` and `merge-read-identity-safety.p1-08as.test.ts` together: **2 suites, 1 passed and 1 failed; 61 tests passed and 1 failed**. The only failure was the unchanged BT-2 identity assertion. Raw output: [PKG-10B merge Jest output](CS-002D4-R1-PKG-10B-merge-jest-output.txt), SHA-256 `d9323410caf725b4fb6ea181830a666e562868c4fef237fce20171581232d55b`. Neither production code nor the historical assertion was changed. Contract-compatible test migration remains a separate authorization.

## Lane C — Pivot fixture reachability

**Disposition: Workbook-owned Pivot integration characterization is blocked by the current public API boundary.** The reviewed `workbook-snapshot-integration.test.ts` depends on unavailable public registry/store accessors. `Workbook.create({sheets})` supports initial sheet creation, and the existing seven-operation transaction API can populate source cells, but the resulting `WorkbookSheetView` is read-only. `PivotEngine` accepts a concrete mutable `Worksheet`; Workbook registry/store are private; `createPivot()`, `setPivotAnchor()`, and `deletePivot()` reject; `getPivotSnapshot()` only returns a detached snapshot for a pivot already registered internally. Consequently, no faithful fixture can reach Workbook-owned registration, snapshot publication, invalidation/rebuild, or deletion/disposal through supported public APIs.

Copying view values into a standalone Worksheet would characterize conversion plus standalone Pivot generation, not Workbook integration. Calling the public snapshot getter for an unknown ID would only demonstrate `undefined`. Neither was presented as equivalent evidence. No Pivot test or source API was added. The specific lifecycle-contract prerequisite and source trace are recorded in [PKG-10C](CS-002D4-R1-PKG-10C-pivot-fixture-migration.md).

## Verification and integrity

- Core typecheck: `npm run typecheck --workspace @cyber-sheet/core` passed. Raw output: [PKG-10R typecheck](CS-002D4-R1-PKG-10R-core-typecheck-output.txt).
- Focused reproduction/compatibility: Lane B's two-suite run completed with the counts above; Lane A's full run covered the corrected null-write regression.
- Test hygiene: `node scripts/check-no-focused-tests.mjs` passed; no focused test markers found.
- `git diff --check`: passed. PKG-10 Markdown whitespace/final-newline checks passed.
- Sidecar integrity: all 237 protected hashes passed before/after both Jest windows; each window's complete before/after `sha256sum -c` outputs were byte-identical. A final post-run check also passed 237/237; see [final sidecar output](CS-002D4-R1-PKG-10R-final-sidecar-check.txt) and [hygiene record](CS-002D4-R1-PKG-10R-hygiene-output.txt). No sidecar was parked, deleted, or rewritten.
- No full historical acceptance baseline was recaptured. Existing ts-jest deprecation and TS151001 `esModuleInterop` notices were non-failing.

## Scope and next bounded work

The PKG-09 null-write correction remains the only production change in this package sequence; PKG-10 made no production or historical assertion changes. No Workbook-owned comment deletion, eighth operation, Pivot registry/accessor/lifecycle API, post-publication sheet creation, default Jest config change, binary persistence, Workbook history, Application forwarding, D5-01/D5-05 change, or global D2-11 disposition change occurred.

For merge reads, retain the BT-2 incompatibility finding and separately authorize any migration of the historical assertion to D7-02 value/detachment expectations; address D7-05 provenance shape separately. For Workbook-owned Pivot integration, the smallest next step is an owner decision defining a supported registration/build/read/invalidation/deletion surface. Until then, preserve the six compile blockers and setup failures as reachability/contract blockers rather than manufacturing test access. **Diagnostic completeness is established; Core integration readiness remains incomplete. Overall CS-002D4-R1 acceptance remains WITHHELD.**
