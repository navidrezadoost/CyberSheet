# CS-002D4-R1 PKG-05B — Comment regression evidence

**Scope:** Existing comment behavior, test-only exact-state oracle, and interactions with the already authorized seven transaction operations.
**New test:** `packages/core/__tests__/worksheet-comment-graph.p1-pkg-05.test.ts`; PKG-04's `worksheet-comment-existing-contract.p1-pkg-04.test.ts` remains unchanged.
**Production changes:** None. No Workbook-owned comment deletion API or public test hook was added.

## Executable results

The PKG-05 focused selection combines the established 11-suite transaction/event selection with the PKG-04 comment bridge test and this graph suite.

| Case | Evidence/result |
| --- | --- |
| Parent and transitive reply removal; survivor order | Existing PKG-04 test plus PKG-05 duplicate-ID/survivor test pass. |
| Missing cell and missing ID | Existing PKG-04 test returns `false` with no deletion event. |
| Duplicate IDs | Current standalone filter removes every matching ID and descendants reachable through those IDs; test passes. |
| Supported graph oracle | Test-only clone preserves Date values, Map/Set entries, shared references, and cycles in the tested fixture. |
| Unsupported graph oracle values | Functions, symbol values/keys, class instances, accessors, hidden properties, sparse arrays, and custom array properties fail explicitly in the test-only oracle. This is not production ingress validation. |
| Caller-held comment alias | `addComment` returns the stored comment; nested input values remain shared; raw standalone `getAllComments` exposes the stored node. Mutation through the retained alias is observable on a later read. |
| Reference before-image without intervening graph mutation | A local operation model restores the exact original array and comment-node references, aliases, and cycles after array replacement. |
| Nested alias mutation between capture and restore | The local adversarial case demonstrates that retaining a reference cannot rewind an external in-place mutation to the old graph. This documents Option C's no-interleaving boundary; it is not a claim that a production transaction currently exposes such an interleaving. |
| Unrelated CellRecord state | Standalone deletion preserves cell value and style while replacing only comments. |
| Journal/Snapshot behavior around comments | For both strategies, an injected failure in an existing cell-value transaction restores the original cell value, preserves the comment graph read result, and emits no Worksheet event. This does not execute comment deletion through either strategy. |
| Owner read with cyclic comment metadata | Standalone `getCell` preserves the cycle; after owner adoption the current owner read detacher throws `RangeError`. The test records this existing read-boundary limitation. |
| Existing event bridge | PKG-04 test verifies the lazy `comment-delete` mapping and unsubscribe behavior. |

The test oracle is intentionally local to the tests and covers a bounded fixture graph. It makes unsupported values visible instead of normalizing them. It does not define a new public metadata type or guarantee arbitrary JavaScript object support.

The final combined Jest output is preserved at `docs/engineering/CS-002D4-R1-PKG-05B-jest-output.txt` (SHA-256 `76f8fff4abfcd51f0f64aa3c0162780c26d32e179085df490aa0c4192fea58db`). Interim test-authoring diagnostics are preserved at `docs/engineering/CS-002D4-R1-PKG-05B-jest-attempts.txt` (SHA-256 `1fe5dfad554360490290aa2bca144100a37addcf8749ed1aa380c565bfc6c998`).

## Policy C boundary

For deletion-only rollback, the original `comments` array reference is a viable first before-image because deletion replaces the array and does not mutate its old entries. The existing seven cell/dimension operations mutate CellRecord fields or separate dimension maps; they do not edit comment objects or comment arrays. Synchronous application/rollback and buffered publication provide no normal callback between a comment before-image and restoration. A future implementation must preserve this replacement-only, no-reentrant-mutation boundary and capture the before-image immediately before the first effective delete.

This does not close the Workbook-owned metadata contract: raw comment aliases survive pre-adoption into the dev import attachment path, and owner read helpers currently recurse without cycle handling or normalize some node types. The operation-local reference policy avoids traversing these graphs for rollback; it does not repair owner reads or define which graphs are supported by all consumers.

## Test authoring diagnostics retained

Two intermediate failures were test-only TypeScript fixture errors and were corrected before final verification: treating the EventBus unsubscribe callback as a disposable object, and omitting `text` from the test-only stored-cell view. See `CS-002D4-R1-PKG-05B-jest-attempts.txt`; the final raw successful Jest output is `CS-002D4-R1-PKG-05B-jest-output.txt`.

No full Core suite or Workbook-owned Pivot integration suite was run. Historical Core/Pivot failures and the generated source-sidecar resolution hazard remain classified separately in PKG-05C.
