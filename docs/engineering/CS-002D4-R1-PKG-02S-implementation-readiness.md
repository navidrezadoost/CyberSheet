# CS-002D4-R1 PKG-02S — Implementation Readiness

**Disposition:** **READY WITH PREREQUISITES**
**PKG-02 implementation:** **NOT AUTHORIZED**
**Journal default:** Incremental Journal for the existing five cell-write operations
**Overall CS-002D4-R1 acceptance:** **WITHHELD**

## Finding

Workbook-owned `setRowHeight` is a suitable first post-cell mutation candidate for a bounded package. Its primary state is one sparse per-Worksheet map; it does not intrinsically require cell formulas, dependency graph changes, Pivot state, merge representation, or sheet lifecycle. The owner path can follow existing Workbook FIFO transactions, per-Worksheet capability checks, rollback handling, and post-commit event publication.

The scope is materially smaller than a general structural mutation. The operation is not implementation-ready without the prerequisites below because the current transaction machinery does not journal row dimensions, current direct Worksheet events bypass Workbook cell-write buffering, and the public value/event policies need to be pinned.

## Required prerequisites before PKG-02 implementation authorization

1. **API owner decision:** approve the additive signatures `mutationPort.setRowHeight(sheet, row, heightPx): Promise<void>` and `transaction.setRowHeight(sheet, row, heightPx): void`, including the row/height validation rule and a decision on whether a maximum height exists. No behavior is exposed in PKG-02S.
2. **Event owner decision:** approve event frequency for same-value/repeated writes and confirm use of the existing generic `sheet-mutated` event through the Workbook commit buffer. The proposal preserves current standalone event semantics and publishes no rollback event.
3. **Implementation authorization:** explicitly authorize the separate implementation package after reviewing this scope, side-effect matrix, and test plan. This planning authorization does not itself grant that permission.
4. **Engineering check before merge:** implement exact sparse-map before-images in Journal, independently extend the Snapshot comparison state, and pass the acceptance tests for mixed cell/dimension operations, rollback, events, cancellation, and recovery-required behavior. Keep D2-11 global status unresolved until other families are inventoried.

These are bounded prerequisites, not evidence that the candidate crosses Workbook/Pivot lifecycle, merged-read, or D7 boundaries. No alternative mutation family is recommended at this point.

## Proposed implementation sequence

1. Add the two additive methods to `WorkbookMutationPort` and `WorkbookTransactionContext`; add a distinct staged operation.
2. Validate ownership, row bounds, and approved height constraints before applying any operation.
3. Extend the per-Worksheet Journal with first-touch sparse row-height before-images that preserve missing-vs-explicit-default state.
4. Extend the internal Snapshot reference state independently to include all explicit row-height entries.
5. Make the owner operation's event enter the existing commit sink; publish only after the shared transaction commit point. Keep standalone setters unchanged.
6. Add internal, non-exported apply/restore failure seams and execute the acceptance test plan.
7. Run scoped Core typecheck and affected Core transaction tests; verify protected generated sidecars. Do not use full Core historical failures as a blanket gate.

## Deferred / excluded

- No Workbook row-height implementation or Worksheet setter change in PKG-02S.
- No row/column insertion, column width, row visibility, style-driven auto-fit, Pivot, merged reads, lifecycle, external persistence, or general history API.
- No production default change; Snapshot remains an internal comparison strategy.
- Existing standalone caller and permissive setter compatibility remains unchanged.
- Existing Workbook shared self-await limitation remains documented and unresolved.
- D2-11 remains globally unresolved; this matrix will cover one operation only.

## Next bounded package recommendation

After the API/event owner decisions and separate implementation authorization, execute a row-height-only Workbook Journal extension package against the acceptance suite in `CS-002D4-R1-PKG-02S-acceptance-test-plan.md`. If the owner declines the event or value policy, update this plan with the narrower agreed contract before coding. Do not silently substitute a column-width or structural mutation.

## Integrity and change boundary

PKG-02S started at HEAD `88b09634f17f3b39d88a88c5428f76b426459a2b` with 331 dirty paths. This checkpoint adds only the four PKG-02S planning documents. No source, test, ledger, frozen register, historical evidence, Journal algorithm/default, or generated sidecar was changed. No tests or builds were run. Final documentation integrity checks are recorded in the execution report.
