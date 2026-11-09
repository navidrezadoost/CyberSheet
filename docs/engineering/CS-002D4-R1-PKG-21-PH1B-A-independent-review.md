# CS-002D4-R1 PKG-21 PH1B — Independent source and security review

**Candidate:** `CS-002D4-R1-PKG-21-CANDIDATE-01`
**Base:** `88b09634f17f3b39d88a88c5428f76b426459a2b`
**Review:** read-only against the extracted archive overlay; no candidate or shared source was edited.

## Findings

| Area | Classification | Evidence and disposition |
| --- | --- | --- |
| Seven-operation boundary and commit buffering | ACCEPTABLE, bounded | `workbook.ts` stages the seven declared operation kinds, preflights, applies participating sheets, commits, then publishes. The candidate suite covers all seven. This does not prove global D2-11 completeness. |
| Journal first-write capture and graph error propagation | ACCEPTABLE, bounded | Worksheet cell/dimension before-images and graph journal paths exist; formula graph mutation exceptions propagate into Workbook rollback. Existing focused tests cover selected failures. |
| Workbook adoption and raw Worksheet capability isolation | CORRECTION REQUIRED | `createDevImportWorksheet()` returns a mutable raw Worksheet; `attachDevImportSheet()` calls exported-in-module `adoptWorksheetByWorkbook()`, which dynamically invokes `worksheet.adoptByWorkbook()`. A caller can shadow that method before attachment, preventing the original method from setting ownership and locking the instance. The Workbook still stores a capability. The seven mutators can likewise be shadowed before adoption. The prototype wrappers and `Object.preventExtensions` do not protect this pre-adoption dispatch. A successor needs an adversarial regression and adoption that does not dispatch through mutable instance properties. |
| Snapshot rollback state equivalence | CORRECTION REQUIRED | `extractSnapshot()` does not represent the formula graph dirty set. `applySnapshot()` clears/rebuilds the graph and registers formulas, marking them dirty; Snapshot rollback then commits the graph journal. A pre-rollback clean graph can therefore become dirty. Snapshot tests in the overlay use no formula/style state. Style-cache reference balance under Snapshot restoration is also not established. |
| Snapshot failure cleanup | INSUFFICIENT EVIDENCE / residual | The injected failure occurs after `applySnapshot()` has reset stores. `rollbackWorkbookMutationBatch()` exits before clearing its transaction journal, injector, pending events, and transaction-active flag. The test checks recovery-required health and rejects later Workbook mutations, but not the cleanup state. |
| Rollback-failure assertion | INSUFFICIENT EVIDENCE | The test hook throws before rollback begins. `workbook.ts` collects that hook error and still calls each Worksheet rollback; this does not inject an actual restoration failure. |
| EventBus compatibility | CORRECTION REQUIRED | Candidate `EventBus.emit()` snapshots listeners and catches/swallow errors. The base behavior iterated the live Set and propagated listener errors; PKG-02F records the accepted change as `once` consumption before nested dispatch, with disposal stopping the current dispatch. A copied listener list means `removeAll()` during a callback cannot stop already-copied listeners. Preserve ordinary EventBus semantics and contain failures only at the authorized committed-event boundary. |
| Public package surface | CONTRACT DECISION REQUIRED | The root barrel exposes `transact`, `mutationPort`, `WorkbookTransactionContext`, and new error/health types. D0-06 has not decided exact signatures, stability, identity visibility, or migration/versioning. Candidate source is not activated. |
| Post-disposal subscription errors | CONTRACT DECISION REQUIRED | Candidate throws generic `Error` from `on()`/`once()` after disposal. PKG-02E describes a specific cancellation error as a proposal requiring owner approval. |
| FIFO/self-await | INSUFFICIENT EVIDENCE; known limitation | A promise-tail queue is present and the API notes self-await risk. The Phase 1 queue probe points to a nonexistent test file and ran zero tests. Ordering, queued cancellation, context revocation, and nested writes remain unverified. |
| Internal hooks and strategy exports | ACCEPTABLE, bounded | Hook and strategy modules are not re-exported from the package root. Broad declaration output still contains declarations; package build and consumer runtime isolation were not verified in PH1B. |

## Gate assessment

Candidate-01 is not technically qualified. The ownership bypass and Snapshot dirty-state mismatch are concrete correction findings. EventBus ordinary-dispatch compatibility is also inconsistent with the accepted behavior record. Recovery cleanup, FIFO behavior, and resource parity need targeted evidence. Do not infer historical provenance from this prospective reconstruction. Any correction belongs in a separately identified Candidate-02 with new hashes; Candidate-01 remains unchanged.
