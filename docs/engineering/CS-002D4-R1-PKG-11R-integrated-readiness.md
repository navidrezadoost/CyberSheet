# CS-002D4-R1 PKG-11R — Integrated Core and Pivot readiness

**Gate: CORE DIAGNOSTIC IMPROVED — PIVOT AUTHORITY PENDING**
**Overall CS-002D4-R1 acceptance: WITHHELD**

PKG-11 migrated the historical merged-read identity assertion to the existing owner-approved D7-02 detached-read contract and reproduced the expanded Core diagnostic under the repository-declared Node/npm runtime. The merge and supported seven-operation/event selections pass. The full Core diagnostic has no executed assertion failures; remaining failures are limited to six Pivot compile blockers and one fixture/setup blocker with 18 cases. Workbook-owned Pivot integration remains unverified because the current public API has no supported registration/build lifecycle. PKG-11C is a nonbinding contract proposal; no Pivot implementation or API was authorized.

## Starting state and runtime

- Git HEAD: `88b09634f17f3b39d88a88c5428f76b426459a2b`.
- Worktree was already dirty; 472 status paths were present at PKG-11 start. Existing work was preserved.
- Default PATH was Node `v26.10.0` / npm `12.2.0`. The repository declares Node `24.22.x`, npm `11.19.x`, and `npm@11.19.1`.
- The declared runtime was already installed at `/home/navidrezadoost/.nvm/versions/node/v24.22.0`; PKG-11B used command-scoped PATH to select Node `v24.22.0` and npm `11.19.1`. No install, lockfile edit, or shell-profile change occurred.
- Jest `30.5.2`; TypeScript `6.0.3`; opt-in `packages/core/jest.typescript-first.config.cjs`; default Jest config unchanged.
- Protected Core sidecar manifest: 237 entries; SHA-256 `a6b89cdc3ccd8bfc8c054e5fafcb4dc84ed9ba1347eb2597a3e7bef938969b6c`.

## Lane A — D7-02 merge test migration

The authoritative contract marks D7-02 `OWNER-APPROVED`: merged anchor/member reads are independently owned, and equality of contents does not promise object identity. The old BT-2 `toBe(anchor)` assertions contradicted that rule. Lane A changed only the BT-2 test in `packages/core/__tests__/merge-api.test.ts`: it now checks equal anchor content and style, distinct anchor/member read objects, frozen-read mutation rejection, and unchanged later reads. Existing B2/C3 address requests remain; no D7-05 provenance DTO was invented. The historical PKG-10 failure output is retained unchanged.

The migrated `merge-api.test.ts` and existing `merge-read-identity-safety.p1-08as.test.ts` passed together under Node 24: **2 suites, 62/62 tests**. The separate AS characterization covers nested detachment and merged-member setter redirection. No production merge behavior changed. See [PKG-11A migration report](CS-002D4-R1-PKG-11A-merge-test-migration.md).

## Lane B — Declared-runtime verification

### Focused windows

| Selection | Result |
| --- | ---: |
| Migrated merge and detached-read contract | 2 suites, 62/62 tests passed |
| Seven-operation transaction and event selection | 12 suites, 172/172 tests passed |

Both windows ran serialized with `--runInBand`; each had pre/post checks for all 237 sidecars with byte-identical check output. Their raw outputs are [merge](CS-002D4-R1-PKG-11B-merge-jest-output.txt) and [seven-operation/event](CS-002D4-R1-PKG-11B-seven-op-jest-output.txt).

### Full Core diagnostic

The complete opt-in Core selection ran under Node `v24.22.0` / npm `11.19.1`, with no excluded suites. It completed in 103.369 seconds, exit code 1 due to the remaining Pivot blockers:

- **298 suites:** 286 passed, 7 failed, 5 skipped.
- **7,473 tests:** 7,273 passed, 18 failed, 173 skipped, 9 todo.
- Raw output: [PKG-11B full Core Jest output](CS-002D4-R1-PKG-11B-full-core-jest-output.txt), SHA-256 `c6d2eb0ac6da5c68002ccecad329daf6857d958ba7deac30110ebaf4bac0caec`.

All failures are classified by execution stage:

| Class | Suites / cases | Disposition |
| --- | ---: | --- |
| TypeScript compilation | 6 suites; 0 tests executed | Fixtures assume unavailable Pivot registry/store/invalidation APIs or mutable `Worksheet` APIs on `WorkbookSheetView`. |
| Fixture/setup | 1 suite / 18 cases | `pivot-formula-integration.test.ts` uses post-publication `Workbook.addSheet()`, which rejects before the Pivot assertions. |
| Executed assertions | 0 | The BT-2 identity assertion now follows D7-02; the absent-null regression also passes. |
| Resolver failures | 0 | No resolver infrastructure failure was observed. |

### Comparison with PKG-10

The discovered suite/test inventory is unchanged from PKG-10A: 298 suites and 7,473 tests. PKG-11 uses the declared runtime and omits PKG-10's `--verbose`; runtime comparisons are not performance comparisons.

| Metric | PKG-10A | PKG-11B | Delta |
| --- | ---: | ---: | ---: |
| Passed / failed / skipped suites | 285 / 8 / 5 | 286 / 7 / 5 | One failure resolved; one more suite passes |
| Passed / failed tests | 7,272 / 19 | 7,273 / 18 | One assertion passes; one fewer failure |
| Skipped / todo tests | 173 / 9 | 173 / 9 | Unchanged |
| Total tests | 7,473 | 7,473 | Unchanged |

The remaining seven failing suites are precisely the six compile-blocked and one setup-blocked Pivot suites. No newly failing suite or execution-stage change appeared. This is a current diagnostic on a dirty worktree, not a frozen acceptance baseline or clean historical regression comparison.

## Lane C — Workbook Pivot lifecycle contract package

The [PKG-11C proposal](CS-002D4-R1-PKG-11C-pivot-lifecycle-contract.md) recommends owner review of a narrow Workbook-owned facade while preserving private registry/store/engine encapsulation. It covers source identity, create and first snapshot publication, detached snapshot/status reads, freshness generations and invalidation after seven-operation commits, failure and disposal boundaries, optional configuration update/deletion, D3/D2 constraints, D5-05 Application-event separation, alternatives, and migration requirements for all seven blocked suites.

It is **proposal only**. It does not change D3, D5, D6, D2-11, public APIs, test fixtures, or implementation authorization. It separately flags D3-06's stale formula result policy, the interaction of D3-01's manual default with current lazy reads, calculated-value callbacks in config DTOs, and failure/cancellation publication semantics for owner decision. D5-05 remains unresolved; no Application event is proposed.

## Verification and integrity

- Core typecheck under the declared runtime: passed; raw output is [PKG-11B typecheck output](CS-002D4-R1-PKG-11B-core-typecheck-output.txt).
- Test hygiene: passed; no focused markers. `git diff --check`: passed.
- All three Jest windows checked the 237-entry protected manifest before and after; all entries passed and each window's before/after outputs were byte-identical. A final post-run check is included in the PKG-11R hygiene artifacts. No sidecar was parked, removed, or rewritten.
- PKG-10A/10B raw outputs and the frozen historical baseline were preserved unchanged.

## Governance and handoff

No production source, Workbook Pivot API, mutable accessor, post-publication sheet creation, eighth transaction operation, persistence/history behavior, Application forwarding, D5-01/D5-05/D7-05 wording, or global D2-11 disposition changed. Only the authorized BT-2 test expectation was migrated; the PKG-09 narrow null-write correction remains unchanged.

Next bounded action: route the PKG-11C proposal for an authorized Workbook/API owner decision. If approved, separately authorize the smallest facade implementation and its first-publication/source-generation/failure acceptance tests. Resolve D3-06 before migrating stale-formula expectations; keep D5-05 and sheet deletion outside the initial slice unless separately approved. Until then, preserve Pivot integration as an owner-contract boundary rather than granting legacy fixtures private access. **R1 acceptance remains WITHHELD.**
