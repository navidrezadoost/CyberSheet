# CS-002D4-R1 PKG-02A — Verification

**Result:** focused verification passed
**Starting HEAD:** `88b09634f17f3b39d88a88c5428f76b426459a2b`
**Starting dirty paths:** 335

## Focused tests

Ran the new row-height regression together with the existing Workbook mutation queue, owner-escape, Workbook EventBus bridge, and transaction-enforcement suites:

```text
npx jest --config packages/core/jest.config.cjs --runInBand \
  packages/core/__tests__/workbook-row-height-journal.p1-pkg-02a.test.ts \
  packages/core/__tests__/workbook-mutation-queue.p1-pkg-01.test.ts \
  packages/core/__tests__/workbook-owned-escape.test.ts \
  packages/core/__tests__/EventBus.workbook-bridge.test.ts \
  packages/core/src/__tests__/transaction-enforcement.test.ts
```

Result: **5 suites passed, 116/116 tests passed**. The focused selection covers both Journal and Snapshot rollback paths for row-height and mixed writes; validation and exact sparse-map restoration; multi-row and multi-Worksheet commit/rollback; committed event frequency/order and listener isolation; disposal cancellation; recovery-required; standalone compatibility; and the existing five cell-write operations.

Jest emitted the existing ts-jest `globals` deprecation and TS151001 `esModuleInterop` advisories. They were non-failing. No full Core suite was run.

## Typecheck and hygiene

- `npm run typecheck --workspace @cyber-sheet/core` — passed.
- `git diff --check` — passed.
- Focused marker scan for `.only`/`.fit` in the PKG-02A test — no markers found.
- No build or benchmark harness was needed or run.

## Sidecar protection

The PKG-01K protected Core sidecar manifest was checked before and after the Jest invocation. The 27 generated Core source sidecars were copied to a temporary location and removed only during the serialized Jest run, then restored. All manifest entries matched both before and after: **237/237 SHA-256 checks passed**. No sidecar contents or manifest entries changed.

One initial parking attempt used a cross-device `rename` and failed before moving any file. No sidecar was lost or modified; the retry used copy/restore and both manifest checks passed. This procedural attempt did not run a test.

## Scope and worktree

No test marker, assertion weakening, generated file update, ledger/register change, historical evidence rewrite, production default change, or unrelated mutation family was introduced by PKG-02A. The worktree remains dirty. The three implementation source files were dirty before this package and were preserved; PKG-02A edits are the row-height API/journal/event changes described in the implementation report. The previously untracked internal hook and mutation-strategy files were extended without adding a public export; the strategy's runtime behavior did not change. No reset or cleanup was performed.
