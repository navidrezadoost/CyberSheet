# CS-002D4-R1 PKG-02F — Lifecycle verification

## Workbook disposal evidence

The focused PKG-02F test disposes a Workbook from inside a one-shot typed row-height listener. The listener observes the committed staged value; later subscribers and later entries in the same committed publication list do not run. The row and column mutations staged in the transaction remain committed. Existing PKG-02D coverage disposes from a Cell bridge callback and verifies that later subscribers/publications stop. PKG-02E coverage verifies bridge handles are released, repeated disposal and unsubscribe are idempotent, post-disposal `on`/`once` throw synchronously, and a separate Workbook remains active.

The existing queue regression `workbook-mutation-queue.p1-pkg-01.test.ts` exercises disposal while a transaction callback is suspended, cancellation of queued/in-flight work, and revocation of late transaction capabilities. Its Journal/Snapshot variants are included in the focused selection.

No change was required to Workbook disposal in PKG-02F. The existing implementation marks disposed before `EventBus.removeAll()`, which deactivates active lazy Cell/Style bridge handles and clears listeners before queued cancellation proceeds. The Workbook facade prevents later bridge activation.

## Focused verification

Final serialized Jest command selected these ten suites:

- `EventBus.test.ts`
- `eventbus-reentrancy.p1-pkg-02f.test.ts`
- `workbook-dimension-events.p1-pkg-02e.test.ts`
- `workbook-event-contract.p1-pkg-02d.test.ts`
- `EventBus.workbook-bridge.test.ts`
- `workbook-row-height-journal.p1-pkg-02a.test.ts`
- `workbook-column-width-journal.p1-pkg-02b.test.ts`
- `workbook-seven-operation-differential.p1-pkg-02c.test.ts`
- `workbook-mutation-queue.p1-pkg-01.test.ts`
- `workbook-owned-escape.test.ts`

Result: **10 suites passed, 163/163 tests passed, 0 failed**. This includes Journal/Snapshot transaction parity, seven-operation differential behavior, commit-only event delivery, rollback suppression, repeated dimension event frequency, recovery-required handling, queue behavior, EventBus bridges, and the disposal coverage above. No full Core suite was run.

Core `tsc --noEmit`, `scripts/check-no-focused-tests.mjs`, and `git diff --check` passed. Jest emitted existing ts-jest `globals` deprecation and TS151001 `esModuleInterop` advisories; neither failed verification.

## Protected sidecars

The protected manifest `docs/engineering/CS-002D4-R1-PKG-01K-core-sidecar-sha256.txt` has SHA-256 `a6b89cdc3ccd8bfc8c054e5fafcb4dc84ed9ba1347eb2597a3e7bef938969b6c`. All 237 entries verified before and after Jest and the sorted per-entry verification outputs compared byte-for-byte equal. The nine generated Core source JavaScript sidecars were temporarily parked during Jest and restored by a shell trap. No protected sidecar bytes or manifest entries changed.
