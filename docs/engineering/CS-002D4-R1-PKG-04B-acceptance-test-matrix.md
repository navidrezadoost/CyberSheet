# CS-002D4-R1 PKG-04B — Acceptance test matrix

**Status:** Existing-behavior characterization complete; future Workbook mutation acceptance remains non-executable pending implementation authorization.
**Baseline:** `88b09634f17f3b39d88a88c5428f76b426459a2b`; the shared worktree was already dirty and was preserved.
**Production operation count:** Seven; no eighth operation was added.
**Overall CS-002D4-R1:** WITHHELD.

## Executed characterization

The only new executable test is `packages/core/__tests__/worksheet-comment-existing-contract.p1-pkg-04.test.ts`. It tests the existing standalone Worksheet implementation and the existing lazy event bridge component. It does not call a Workbook-owned comment mutation API or claim commit/rollback behavior for comments.

| Behavior | Executable evidence | Result |
| --- | --- | --- |
| Delete a root and transitive replies while retaining unrelated comment order | Standalone Worksheet with root, child, grandchild, and sibling | Pass |
| Missing cell/collection/ID behavior | `deleteComment` return and emitted Worksheet events | Pass; false and no event for no-op |
| Last comment removal | Current cell read and event trace | Pass; `comments` becomes `undefined`, one event |
| Existing Workbook bridge mapping | Standalone Worksheet wired through `WorkbookEventBridgeManager` to `EventBus` | Pass; payload is `{row, col, commentId}` and subscription disposal deactivates the lazy bridge |

These tests establish current component behavior only. The bridge test is not evidence that an adopted Worksheet can be mutated through Workbook authority.

## Future Workbook-operation acceptance specification

The following cases must be added to the executable suite only after a separate implementation authorization introduces a supported API. They intentionally remain a documentation matrix so current Core typechecking and tests do not depend on a nonexistent method.

| Acceptance area | Required assertion for the authorized implementation |
| --- | --- |
| Authority and preflight | Only the owning Workbook's issued sheet view is accepted; invalid address/ID and cross-Workbook sheet reject before writes/events. |
| Identity and cascade | Resolve `commentId` only inside the addressed cell; fixed `deleteReplies=true` removes the target and all transitive descendants, preserving survivor order. Cover root, reply, duplicate IDs, orphan replies, and repeated staged deletion. |
| Sparse state | Distinguish absent cell, present cell without comments, present comment array, and final-comment deletion (`comments === undefined` with the cell retained). No-op calls do not allocate state. |
| Exact state | Compare all CellRecord fields and a detached comment graph, including dates, position, rich text/style, metadata, and optional-field presence. Confirm unrelated cells and Worksheet state remain identical. |
| Journal rollback | Inject supported failures before and after the comment-field write and at restoration; first before-image wins for repeated writes; no rollback events; restoration errors produce the existing recovery-required classification. |
| Snapshot parity | Repeat equivalent fault cuts under Snapshot with its independent capture/restore path; compare final state, event trace, and health classification with Journal. |
| Mixed transaction | Combine comment deletion with each applicable one of the seven existing operation kinds, across multiple sheets; compare exact state and staged event behavior. Do not add an eighth kind beyond the specifically authorized comment operation. |
| Commit publication | State is committed before observers run; Worksheet `comment-deleted` and bridged Workbook `comment-delete` have existing names/payloads and appear only for effective deletions. No-op suppression and repeated-delete frequency follow the owner-approved decision. |
| Event lifecycle | With/without an active lazy bridge, test per-surface ordering only; nested dispatch, listener failure isolation, disposal during publication, and no cross-surface total-order assertion. |
| Side effects | Formula/dependency state, style caches, dimensions, visibility, drawing state, persistence bytes, and history remain unchanged. |

Open technical constraint: `CellComment.metadata` is `Record<string, unknown>`, while current clone paths do not define an exact clone contract for arbitrary nested or custom-prototype values. The authorization gate must settle a supported metadata graph or an exact graph-aware copy before these exact-state assertions can be made complete.

## Scope exclusions

Do not add executable calls to `workbook.mutationPort.deleteComment` or `tx.deleteComment` until those APIs exist under separate authorization. No test helper may monkey-patch production state, bypass Worksheet ownership guards, or manufacture commit semantics. D5-01 and D5-05 remain separate owner decisions; no Application event test is implied.
