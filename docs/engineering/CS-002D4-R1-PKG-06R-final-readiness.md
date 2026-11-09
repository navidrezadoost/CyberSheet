# CS-002D4-R1 PKG-06R — Final readiness

**Readiness: TECHNICALLY READY — OWNER AUTHORIZATION PENDING**
**Starting revision:** `88b09634f17f3b39d88a88c5428f76b426459a2b`
**Starting worktree:** 418 existing status entries; preserved.
**Production strategy:** Incremental Journal. The existing operation set remains seven.
**Overall CS-002D4-R1 acceptance:** WITHHELD.

## Outcome

PKG-06 characterized current metadata ownership boundaries and exercised the deletion-only retained-reference policy through an isolated test model. The evidence supports preparing a one-comment deletion implementation package without first normalizing all metadata at adoption or changing standalone `Worksheet` compatibility.

Policy C is narrowly applicable: immediately before the first effective deletion, retain the cell's presence and original `comments` array reference; deletion then replaces that property with a filtered array; rollback restores the retained reference without walking the graph. The direct source path is replacement-only, and the apply/rollback path is synchronous with event publication deferred until commit. The model exercises pre- and post-replacement failures, repeated deletes, duplicate identifiers and descendants, no-ops, absent versus present cells, exact aliases/cycles, event suppression, and restoration failure.

The model's transaction/fault machinery is intentionally test-only. Existing seven-operation and EventBus suites ran in the same integrated selection, and PKG-05 separately showed existing cell-value rollback preserving comment state when comments were untouched. No combined production comment-delete plus existing-operation transaction can be exercised before the new operation exists; the future implementation package must add that direct Journal/Snapshot interaction coverage.

This is readiness evidence for a future implementation, not proof that a Workbook Journal or Snapshot comment-delete path exists or works. No such path was implemented or connected. That implementation package must independently test Journal and Snapshot state restoration, error/recovery behavior, and commit-only events.

## Metadata boundary and ownership decision status

Runtime storage accepts nested values beyond the useful guarantees of current readers and persistence. Standalone reads preserve tested cycles and shared object aliases; Workbook-owned reads can transform Maps/Sets/functions/class instances, duplicate aliases, and throw on cycles. Adoption retains pre-existing comment graphs and aliases. Object snapshots shallow-copy metadata; binary JSON persistence is not a JavaScript graph round trip.

These findings do not require broad normalization for deletion-only reference restoration because Policy C need not traverse or clone comment metadata. They remain owner-facing compatibility questions: which nested values are supported by Workbook reads/persistence, and whether pre-adoption aliases retained through internal import are part of the supported caller contract. **No API owner designation, contract-owner approval, or implementation authorization was found or inferred.** PKG-04 documentation review remains user-provided review evidence only.

The exact contract still needs an attributable owner decision on `deleteComment(sheet, address, commentId)`, fixed `deleteReplies=true`, duplicate-ID and cascade semantics, absent/missing/no-op behavior and return type, existing Worksheet `comment-deleted` and Workbook `comment-delete` events, the Policy C replacement-only boundary, and pre-adoption alias support. No D5-01/D5-05 change is made; D5-01 remains pending and D5-05 remains unresolved.

## Executed verification

The serialized Core selection used `packages/core/jest.config.cjs`, `--runInBand`, `NODE_OPTIONS=--experimental-vm-modules`, and reversible isolation of the nine generated source-sidecar groups documented in PKG-03C. It included the established seven-operation, EventBus, queue, ownership, and comment suites, plus both new PKG-06 probes.

- **Final run: 15 suites passed; 201/201 tests passed.**
- The first integrated attempt had 14 suites pass / 193 tests pass and one test suite blocked at TypeScript compilation. The cause was test-only: a local `Comment` type collided with the DOM global, and the caught result needed narrowing. Both were corrected before the final passing run. The initial and final outputs are retained separately.
- Core typecheck passed: `npm run typecheck --workspace @cyber-sheet/core`.
- Focused-test hygiene passed: `node scripts/check-no-focused-tests.mjs`.
- `git diff --check` passed.
- Protected sidecars passed **237/237 before and after each Jest attempt**, with identical before/after check output. Manifest digest: `a6b89cdc3ccd8bfc8c054e5fafcb4dc84ed9ba1347eb2597a3e7bef938969b6c`.
- Runtime: Node v26.10.0, Jest 30.5.2, TypeScript 6.0.3. Existing ts-jest deprecation and TS151001 advisories were non-failing.
- Full Core suite and legacy Workbook/Pivot integration suites were not run.

Preserved raw verification artifacts and SHA-256:

| Artifact | SHA-256 |
| --- | --- |
| `CS-002D4-R1-PKG-06C-jest-output.txt` | `8e956bcac789b6aace93f72516ffb6bb73d9a0be322de126b157406748cdf88b` |
| `CS-002D4-R1-PKG-06C-jest-attempts.txt` | `48a938272f17eaed302fc9bd9d4fed64e95e4a5b609253835e553f489a80e84d` |
| `CS-002D4-R1-PKG-06C-typecheck-output.txt` | `dfae70c19a0fed21e271996ffdb8575414536784ac4ff63c3f9463073f2b2af1` |
| `CS-002D4-R1-PKG-06C-test-hygiene-output.txt` | `955afb3c996eacb38fb130936be1cf2bbe12ed121468deae159ea18a12886116` |
| `CS-002D4-R1-PKG-01K-core-sidecar-sha256.txt` | `a6b89cdc3ccd8bfc8c054e5fafcb4dc84ed9ba1347eb2597a3e7bef938969b6c` |

## Independent blockers and next authorization

The historical Workbook/Pivot failures remain separated by stage: compile-blocked tests ran zero assertions; Pivot integration fixture setup failed before intended assertions when unsupported post-publication sheet creation was attempted; one merged-read identity assertion executed and failed. The shared FIFO self-await limitation is independent. PKG-06 did not rerun or alter either area.

Next, obtain attributable Workbook/API and Worksheet/API contract decisions and a separate implementation authorization. Then implement only the approved one-comment deletion in a dedicated package. Its acceptance must exercise actual Journal and Snapshot paths independently, including exact before-images, effective/no-op event behavior, rollback suppression, restore-failure health classification, and the no-intervening-mutation invariant. Do not add a general graph normalizer, persistence changes, Application forwarding, or a broader mutation family as part of that work.

PKG-06 added two focused test-only suites and its evidence reports/output files; no production source, public API, ledger disposition, frozen register, historical manifest, or authoritative contract was modified. The starting dirty worktree was preserved. The eighth Workbook mutation operation remains unauthorized. Overall CS-002D4-R1 acceptance remains **WITHHELD**.
