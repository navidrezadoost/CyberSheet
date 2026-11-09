# P1-08AW Lane C — BT-2 Merge-Read Identity Decision

**Status:** owner decision pending. This lane records the contract alternatives and recommendation only. It does not change the BT-2 assertion, Worksheet behavior, or any shared reconciliation artifact.

## Evidence

- `packages/core/__tests__/merge-api.test.ts:251–265` preserves BT-2. It reads two merged non-anchor cells and the anchor, then requires both non-anchor reads to be the exact same object as the anchor with `toBe`.
- `packages/core/src/worksheet.ts:566–577` resolves a merged member to the anchor's stored cell, then constructs a detached cell snapshot for each `getCell()` call. The address redirection establishes logical value lookup; it does not return a shared record.
- The separate characterization in `merge-api.test.ts:267–279` confirms equivalent value/style and distinct record identity.
- `packages/core/__tests__/merge-read-identity-safety.p1-08as.test.ts:56–95` covers merged RichText reads: nested runs and styles are detached/frozen, setters through a merged member still update the anchor, and an earlier read stays a snapshot. Its two focused tests are recorded as passing in AT.
- The standalone snapshot helper recursively copies object graphs and freezes ordinary objects and arrays (`worksheet.ts:237–278`). It clones `Date`, and clones `Map`/`Set` without freezing those containers. The supported cell-value family is scalar values, RichText, and Entity (`types.ts:16, 167–180`); extensible nested metadata means any broader immutability promise should name the supported nested-data types precisely.
- AR records that the isolated merge suite has one failure at BT-2 and 59 passing tests. The original assertion remains unchanged.

## Owner choices

| Choice | Contract | Consequences |
| --- | --- | --- |
| **A — Promise identity** | Every merged member read returns the anchor's same object reference. | Preserves BT-2's two `toBe` expectations. It requires an identity-preserving read design and a defined lifetime/invalidation rule across reads and writes. Returning a shared mutable cell would undermine detached-read isolation; a cached immutable snapshot would need explicit freshness and nested-value rules. Any implementation change requires separate authorization. |
| **B — Promise value snapshots; no identity guarantee (recommended)** | Anchor and merged-member reads represent the same cell values at observation time, while each call may return a distinct detached snapshot. Mutation uses Worksheet methods; merged-member writes still redirect to the anchor. | Matches the current address-resolution and detached-read behavior and the separate characterization. BT-2 remains red until a separately authorized test-contract change replaces identity assertions with value and alias-safety assertions. Define the nested data supported by the snapshot contract, including `Map`, `Set`, `Date`, and extensible metadata behavior where applicable. |
| **C — Defer** | Make no identity decision; retain the present implementation and original BT-2 assertion. | Avoids a premature contract choice. BT-2 remains unresolved and the Core merge suite remains non-green. |

**Recommendation to the Worksheet/API owner:** choose B. The public intent that a merged member resolves to the anchor is satisfied by equivalent cell contents; it does not require `getCell()` to expose a shared reference. Keep the current implementation and original assertion unchanged until the owner records a decision and any needed test-only or production authorization is granted separately.

**Decision record:** no owner response was available in this lane. Choice remains pending; no implementation or assertion change is authorized here. No tests were run because this lane is documentation-only.
