# CS-002D4-R1 PKG-02F — Final disposition

## Decision

The suspected EventBus `once` reentrancy defect was reproduced and corrected within the authorized scope. The one-shot wrapper is consumed before user code; isolated dispatch additionally ignores a consumed wrapper already present in a copied listener snapshot.

## Evidence summary

- Red regression before correction: 1 suite failed, 1 test failed. A nested same-event emission invoked the same `once` subscription twice.
- Final focused verification: 10 suites passed, 163/163 tests passed, 0 failed.
- Core typecheck, test-marker hygiene, and `git diff --check`: passed.
- Protected sidecars: 237/237 verified before and after Jest; per-entry outputs identical.
- The production delta for PKG-02F is limited to the `EventBus.once` wrapper. No mutation operation, event schema, Application bridge, Pivot API, or persistence behavior was added or changed.

## Exact PKG-02F files

- `packages/core/src/EventBus.ts`
- `packages/core/__tests__/eventbus-reentrancy.p1-pkg-02f.test.ts`
- `docs/engineering/CS-002D4-R1-PKG-02F-eventbus-reentrancy.md`
- `docs/engineering/CS-002D4-R1-PKG-02F-lifecycle-verification.md`
- `docs/engineering/CS-002D4-R1-PKG-02F-compatibility.md`
- `docs/engineering/CS-002D4-R1-PKG-02F-final-disposition.md`

Previously authorized PKG-02D/02E source, tests, reports, ledgers, frozen registers, and unrelated dirty worktree files were preserved.

## Remaining limits and recommendation

D5-01 cross-level Cell/Style ordering, D5-05 Application event authority and schema, and global D2-11 remain unresolved. The shared FIFO self-await limitation and legacy Pivot snapshot-integration compile blocker remain independent. Overall CS-002D4-R1 acceptance remains **WITHHELD**.

Recommended next bounded step: continue with the separately authorized PKG-02G gate, if issued; otherwise make no further production changes until the next directive resolves the remaining event-contract and ownership prerequisites.
