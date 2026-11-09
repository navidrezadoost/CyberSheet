# CS-002D4-R1 PKG-05R — Integrated readiness

**Disposition: READY WITH SPECIFIC TECHNICAL PREREQUISITES**
**Starting revision:** `88b09634f17f3b39d88a88c5428f76b426459a2b`
**Starting worktree:** 410 existing status entries were preserved.
**Production transaction strategy:** Incremental Journal.
**Workbook mutation operations:** Seven; Workbook-owned comment deletion remains unauthorized.
**Overall CS-002D4-R1 acceptance:** WITHHELD.

## Lane outcomes

| Lane | Deliverable | Result |
| --- | --- | --- |
| PKG-05A — Graph domain and restoration policy | `PKG-05A-comment-graph-domain.md`; `PKG-05A-exact-restoration-policy.md` | Recommends operation-local retained before-image (Policy C) for deletion only. Source shows replacement-only deletion, but no common general metadata clone domain. |
| PKG-05B — Regressions | `PKG-05B-comment-regression-evidence.md`; focused tests `worksheet-comment-existing-contract.p1-pkg-04.test.ts` and `worksheet-comment-graph.p1-pkg-05.test.ts`; raw outputs `PKG-05B-jest-output.txt` and `PKG-05B-jest-attempts.txt` | Tests cover standalone behavior, graph/alias semantics, unsupported oracle values, and existing Journal/Snapshot rollback with comments as unrelated state. They do not claim comment deletion in a Workbook transaction. |
| PKG-05C — Integration and authority | `PKG-05C-integration-and-authority.md` | Revalidates earlier seven-operation evidence without rerunning it; records supplied PKG-04 review as user review evidence only. No new owner authority or approval was found. |

## Metadata and restoration findings

`CellComment.metadata` is statically `Record<string, unknown>` and has no runtime validator. `Worksheet.addComment` shallow-stores nested input references, returns the stored comment object, and emits that same object. Raw standalone `getAllComments()` shallow-copies the arrays but exposes comment nodes. Worksheet adoption does not clone comment cell data, so a pre-adoption comment reference can remain live in the internal dev-import attachment path.

Current read/copy paths are not a single exact graph policy. Standalone `getCell` uses a memoized recursive copy that preserves tested cycles and shared aliases, while its Date copies are per occurrence and Map/Set copies remain mutable. Owner detachment has no cycle memoization, duplicates shared aliases, converts Map/Set, and maps functions to `undefined`. Object snapshot cloning is shallow for metadata and dates. The binary SnapshotCodec uses JSON and cannot round-trip arbitrary JavaScript graph semantics.

**Policy C is recommended only for the bounded delete rollback:** retain the target cell presence and original comments-array reference once before the first effective write; restore that reference without traversing it. The existing deletion path filters into a replacement array and does not mutate the original array or its nodes. The seven existing transaction operations modify other CellRecord fields or dimension maps, not the comment graph. Their synchronous apply/rollback boundary and buffered event publication do not run ordinary callers between capture and restore. The new test deliberately mutates a nested alias between capture and restore and shows that a reference before-image cannot undo that mutation. Therefore the implementation must keep the replacement-only/no-reentrant-mutation invariant and must not generalize this approach to comment update/add.

## Remaining specific technical prerequisites

1. **Owner-facing metadata domain:** Decide whether cyclic graphs and node types such as Map/Set, functions, accessors, and class instances are supported in Workbook-owned comment data. Current type and ingress paths admit more than owner read detachment can safely represent; a cyclic comment makes the current owner read throw `RangeError`, and several other nodes are transformed. Policy C avoids clone loss in rollback but does not make these reads well-defined.
2. **Alias lifetime at ownership transition:** Confirm whether retained pre-adoption comment references in the internal import path are outside the supported caller contract. They can mutate owned data, so the no-interleaving assumption applies only inside the synchronous deletion/rollback window, not to arbitrary surrounding time.
3. **Exact operation contract and authorization:** A designated owner must approve the proposed API, fixed reply cascade, missing/no-op and return semantics, existing Worksheet/Workbook events, and the operation-local before-image rule. The consolidated C1–C5 request remains unsent because the authority chain and approved response channel are unverified. A separate explicit implementation authorization is still required.

Until these points are resolved, do not add the eighth operation. No production change is needed for this package's characterization; the observed owner-read cycle limitation is recorded as evidence, not silently corrected.

## Verification

Serialized Jest selection included the established 11 transaction/event suites, the PKG-04 comment event test, and the PKG-05 graph test:

- **13 suites passed; 190/190 tests passed.**
- The selection revalidated FIFO/commit/rollback, listener behavior, disposal, existing seven-operation Journal/Snapshot differential coverage, and standalone comment behavior.
- Both Journal and Snapshot tests with comments present passed for an injected failure in an existing cell-value transaction; this is not comment-delete rollback parity.
- Core typecheck passed.
- Focused-test hygiene passed; no `.only`/focused markers.
- `git diff --check` passed. New PKG-05 artifacts passed trailing-whitespace and final-newline checks.
- Protected Core sidecars passed 237/237 before and after the serialized Jest run; outputs were identical. Manifest SHA-256: `a6b89cdc3ccd8bfc8c054e5fafcb4dc84ed9ba1347eb2597a3e7bef938969b6c`.
- Preserved verification artifacts: `PKG-05B-jest-output.txt` SHA-256 `76f8fff4abfcd51f0f64aa3c0162780c26d32e179085df490aa0c4192fea58db`; `PKG-05B-jest-attempts.txt` SHA-256 `1fe5dfad554360490290aa2bca144100a37addcf8749ed1aa380c565bfc6c998`.
- The full Core suite and Workbook-owned Pivot integration were not run.

Two intermediate new-test compile errors were corrected and retained in the attempt log; the final raw successful Jest output is preserved separately. PKG-03C's earlier unisolated stale generated-JavaScript failures remain distinct from the passing sidecar-isolated run. Historical compile/setup/assertion failures in Core/Pivot are not represented as fixed.

## Authority and next action

PKG-04's documentation review is recorded as user-provided review evidence at the user's direction. It is not a Workbook/API, Worksheet/API, or D5 owner designation; it does not approve D5-01, D5-05, the comment contract, or implementation. No external request was sent, and no owner response is claimed.

The next implementation candidate remains Workbook-owned deletion of one comment with fixed `deleteReplies=true`. Before authorizing it, the designated owners need to decide the owner-facing metadata domain and alias-transition boundary, approve the exact operation/no-op/event contract, and issue separate bounded implementation authorization. Once authorized, acceptance must test independent Journal and Snapshot before-images, sparse absence, repeated deletes, rollback suppression, recovery-required errors, and the synchronous replacement-only invariant. Do not modify persistence, Application forwarding, Pivot APIs, the seven existing operations, ledger/register evidence, or overall R1 status through this handoff.

Overall CS-002D4-R1 acceptance remains **WITHHELD**.
