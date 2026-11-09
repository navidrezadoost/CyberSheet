# CS-002D4-R1 PKG-06C — Governance and integration characterization

**Scope:** Lane C governance and integration review. Lane C itself reuses established verification and authority evidence and did not run Jest/typecheck or repeat the prior authority search. The coordinator completed the integrated verification recorded below. No Workbook comment operation is authorized.
**Inspected revision:** `88b09634f17f3b39d88a88c5428f76b426459a2b` (current HEAD at inspection).
**Overall CS-002D4-R1 acceptance:** WITHHELD.

## Comment-operation contract requiring decision

PKG-04A's source-grounded candidate remains one Workbook-owned deletion addressed by `(sheet, address, commentId)`, with `deleteReplies=true` fixed for the initial slice. The technical proposal describes `mutationPort.deleteComment(...)` and `tx.deleteComment(...)`, but the return type is unresolved: the port could expose the standalone boolean result, or resolve `void`; the transaction-context method stages the operation. No public API exists yet.

The decision record for the authorized owner must settle, at minimum:

1. **Identity and scope:** comment `id` is looked up within the specified cell, not globally. Duplicate IDs are currently possible in standalone storage. Whether one matching record means deleting every entry sharing that ID, and how the descendant cascade treats them, must be explicit.
2. **Cascade:** whether deletion always removes the target and all transitive replies (`deleteReplies=true`), including when the target itself is a reply.
3. **Absent state and no-op:** behavior for an absent cell, missing/undefined comments collection, or missing ID; return value; whether repeated operations in one transaction are evaluated in staged order; and whether a no-op emits nothing.
4. **State and rollback:** preserve survivor order, unrelated CellRecord state, cell presence, and exact comments-array reference under the proposed deletion-only Policy C before-image. Clarify the invariant that the replacement-only delete and synchronous transaction apply/rollback window contain no intervening mutation of the retained graph.
5. **Events:** retain Worksheet `comment-deleted` and Workbook `comment-delete` with the existing payloads, their effective-delete frequency, and commit-only publication/rollback suppression. No Application event is implied.
6. **Ownership and authorization:** identify attributable Workbook/API and Worksheet/API approval for their respective scopes and separately authorize implementation after contract resolution.

The user's review and acceptance of the PKG-04 documentation is recorded as **user-provided review evidence**, as required by the PKG-06 directive. It is not a designated API owner decision, authority/delegation basis, approval of D5-01 or D5-05, approval of the proposed comment semantics, or implementation authorization. Existing PKG-04C / PKG-05C records say the consolidated owner request was not transmitted and no attributable response was obtained. This lane relies on those findings and deliberately does not repeat the unsuccessful authority search. No owner decision is newly claimed here.

## Integration evidence and its bounds

The current source inspection confirms the existing Workbook mutation port and transaction context expose the seven operations only: `setCellValue`, `setCellFormula`, `clearCellContent`, `clearCellFormula`, `setCellStyle`, `setRowHeight`, and `setColumnWidth` (`packages/core/src/workbook.ts`). Production strategy remains Incremental Journal; Snapshot comparisons are selected through existing test hooks. No comment-delete entry point, staged operation, or eighth operation was added.

PKG-03C's reported serialized integration run passed **11 suites / 170 tests**: cross-level compatibility, EventBus, EventBus reentrancy, dimension events, event contract, Workbook bridge, row-height and column-width Journal tests, seven-operation Journal/Snapshot differential, mutation queue, and owner escape. PKG-04B added the standalone comment/bridge regression, for **12 suites / 173 tests**. PKG-05B added the graph test, for **13 suites / 190 tests**. These are existing reported results, not new PKG-06 execution.

That evidence covers the seven-operation transaction/event lifecycle, staged state visibility, tested rollback suppression, Journal/Snapshot comparison, EventBus reentrancy and `once`, listener-failure isolation, Workbook disposal, and existing standalone comment behavior. It does **not** prove Workbook-owned comment-delete rollback, comment event buffering in a transaction, or approval of proposed no-op/return semantics. Existing comment tests remain standalone plus bridge-mapper characterization.

### Serialized integration command for the coordinator

After Lane A/B test paths are finalized, run Jest once, serialized, with the established Core configuration and reversible source-sidecar isolation. The existing integration selection is exactly:

```sh
NODE_OPTIONS=--experimental-vm-modules node node_modules/jest/bin/jest.js \
  --config packages/core/jest.config.cjs --runInBand \
  packages/core/__tests__/workbook-cross-level-compatibility.p1-pkg-02g-c.test.ts \
  packages/core/__tests__/EventBus.test.ts \
  packages/core/__tests__/eventbus-reentrancy.p1-pkg-02f.test.ts \
  packages/core/__tests__/workbook-dimension-events.p1-pkg-02e.test.ts \
  packages/core/__tests__/workbook-event-contract.p1-pkg-02d.test.ts \
  packages/core/__tests__/EventBus.workbook-bridge.test.ts \
  packages/core/__tests__/workbook-row-height-journal.p1-pkg-02a.test.ts \
  packages/core/__tests__/workbook-column-width-journal.p1-pkg-02b.test.ts \
  packages/core/__tests__/workbook-seven-operation-differential.p1-pkg-02c.test.ts \
  packages/core/__tests__/workbook-mutation-queue.p1-pkg-01.test.ts \
  packages/core/__tests__/workbook-owned-escape.test.ts \
  packages/core/__tests__/worksheet-comment-existing-contract.p1-pkg-04.test.ts \
  packages/core/__tests__/worksheet-comment-graph.p1-pkg-05.test.ts \
packages/core/__tests__/worksheet-comment-metadata-boundary.p1-pkg-06a.test.ts \
packages/core/__tests__/workbook-comment-delete-rollback-model.p1-pkg-06b.test.ts
```

The coordinator substituted both confirmed Lane A/B paths and ran the 15-suite selection once successfully, serialized with `--runInBand` and the reversible nine-group source-sidecar isolation procedure. Result: **15 suites / 201 tests passed**. An initial attempt compiled 14 suites successfully (193 tests passed) but the Lane B model was compile-blocked by a test-only DOM `Comment` type collision and catch-result narrowing errors; the model was corrected, and the passing rerun is the acceptance result. The initial and final outputs are retained separately. The protected Core sidecar manifest (`PKG-01K-core-sidecar-sha256.txt`, 237 entries; digest `a6b89cdc3ccd8bfc8c054e5fafcb4dc84ed9ba1347eb2597a3e7bef938969b6c`) passed before and after each attempt, with identical command outputs. Do not run this selection concurrently with other Jest or sidecar-mutating work.

At the integrated gate, `npm run typecheck --workspace @cyber-sheet/core`, `node scripts/check-no-focused-tests.mjs`, and `git diff --check` passed. Raw Jest, initial Jest attempt, typecheck, and hygiene outputs are preserved in the adjacent PKG-06C output files. No command was executed within Lane C itself.

## Independent blockers

**Legacy Workbook/Pivot integration:** Historical evidence distinguishes three failure stages: seven suites were stopped by TypeScript diagnostics (zero tests executed); 18 Pivot formula integration cases failed in fixture setup when post-publication `Workbook.addSheet()` rejected, before intended assertions; and one BT-2 merged-read identity assertion executed and failed on reference identity. A later Pivot snapshot integration retry also stopped at compilation because internal registry/store accessors were unavailable (zero tests). Separately, the standalone Pivot selection passed 3 suites / 50 tests. These categories are independent; standalone Pivot success does not provide Workbook-owned Pivot registration or lifecycle integration. PKG-06C did not rerun or repair any of them.

**Shared FIFO self-await:** The existing queue regression deliberately awaits a mutation-port promise from within its own active transaction and observes the transaction remain pending until disposal cancels the queue. `Workbook.transact` documentation advises staging nested writes through its supplied context and not awaiting independently queued mutation-port work inside the callback. This limitation is shared queue/API behavior, not a comment graph failure and not a Journal-only issue. PKG-06C does not claim a detector or fix.

These blockers must not be merged into a single Pivot/transaction failure classification, and neither changes the seven-operation evidence or authorizes expanding the operation set.

## Status and handoff

- PKG-04 documentation review: recorded as user review evidence only.
- Workbook/API and Worksheet/API owner decisions: not established by this review; no authority search repeated.
- D5-01 Option C: proposed, not approved; authoritative wording remains unchanged.
- D5-05 Application event authority/schema: unresolved and separate; no Application forwarding is proposed here.
- Workbook-owned comment deletion: not implemented; the eighth operation remains unauthorized.
- PKG-06 integration selection: complete; 15 suites / 201 tests passed, including both new test-only lanes. This does not establish production Journal/Snapshot comment deletion behavior.

The coordinator integrated the Lane A metadata probe and Lane B test-only fault-cut model with the established selection. The remaining step is owner/contract approval followed by separate implementation authorization. Test-only model results are not production Journal/Snapshot comment rollback evidence. No production, ledger, frozen-register, historical-manifest, or authoritative-contract change was made by this lane. Overall CS-002D4-R1 acceptance remains **WITHHELD**.
