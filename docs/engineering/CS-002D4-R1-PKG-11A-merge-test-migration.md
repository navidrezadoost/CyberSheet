# CS-002D4-R1 PKG-11A — BT-2 merge assertion migration

**Disposition:** Historical test expectation migrated to the approved D7-02 identity rule.
**Scope:** `merge-api.test.ts` BT-2 test and this report only.
**Jest:** Not run in this edit lane; serialized verification is handed to the coordinator.

## Contract authority and existing evidence

The authoritative contract record [`CS-002D4-R1-authoritative-contracts.md`](CS-002D4-R1-authoritative-contracts.md) marks D7-02 `OWNER-APPROVED`: reads through anchor and merged-member addresses are independently owned, and equal contents do not imply shared identity. This is the existing approval basis used for this narrowly scoped test migration. No new approval is inferred or requested here.

The existing `packages/core/__tests__/merge-read-identity-safety.p1-08as.test.ts` test independently covers standalone merged-member reads: equal anchor/member values, distinct frozen cell records, detached nested rich-text values, a rejected nested mutation, later reads retaining stored state, and write redirection from a merged member to the anchor. The migrated BT-2 case complements that coverage with the existing simple string value and bold style fixture at A1, then reads B2 and C3.

## Test change

In `packages/core/__tests__/merge-api.test.ts`, changed only the identity-specific BT-2 expectations and title. Both merged-member reads are now checked for deep equality with the anchor read, distinct identity from the anchor, and distinct identity from each other. The test retains the requested B2/C3 addresses and verifies each read carries the anchor's value and bold style. It also checks the returned record is frozen, an attempted value mutation is rejected, and a later read through B2 still observes `AnchorData`.

This is a test expectation migration, not a production implementation change. It does not add requested-address, effective-address, or merge-range fields and makes no claim to resolve D7-05's public DTO shape. Existing read-through-member behavior and write redirection remain in their existing tests.

## Verification handoff

No Jest command was run while editing. The coordinator should run the focused `merge-api.test.ts` selection together with the existing AS read-safety test in its serialized verification window, using the opt-in TypeScript-first Core Jest configuration and checking the protected sidecar manifest before and after. The PKG-10A full-Core raw output remains preserved unchanged.

No production source, resolver, package Jest configuration, sidecar, or unrelated test was modified. Overall CS-002D4-R1 acceptance remains **WITHHELD**.
