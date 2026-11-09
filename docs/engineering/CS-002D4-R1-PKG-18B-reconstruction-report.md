# CS-002D4-R1 PKG-18B — Reconstruction report

## Result

Lane B created a prospective Workbook transaction reconstruction in detached candidate `/tmp/pkg18b-candidate`, rooted at `88b09634f17f3b39d88a88c5428f76b426459a2b`. It contains the seven-operation port/context, FIFO staging and application, Worksheet ownership capability, Journal and Snapshot restoration, graph before-images, commit-only Worksheet and Workbook event publication, mutation health/recovery, and disposal handling for queued operations.

This reconstruction does not recover the historic patch boundary for the dirty shared worktree. Lane E later applied narrow candidate-only type, dev-import capability, and transaction-test-seam corrections, then passed a bounded Core typecheck and selected tests. This does not establish integrated acceptance, merge, release, or overall R1 acceptance.

## Selective reconstruction and Lane E corrections

`workbook.ts` was rebuilt from the clean-base file using transaction-specific declarations, fields, view-identity registration, transaction/queue/apply methods, and queue-aware disposal. Existing Pivot implementation was preserved. Lane E added a candidate-only capability-map assignment when the development fixture attaches an adopted Worksheet, so the Workbook stores the capability returned by adoption. This enables the reconstructed fixture path used by the focused suite; it does not add or authorize general post-publication sheet creation.

`worksheet.ts` adds the narrow owner capability and Journal/batch helpers, transaction event buffering, before-image calls for the seven authorized write paths, dimension-event routing, and detached graph/journal diagnostics. Lane E wired the existing internal `after-cell-record` fault hook at cell and style record writes. It also separated formula dependency extraction from graph registration: parser/extractor exceptions preserve warning-and-continue behavior, while graph registration exceptions propagate to Workbook rollback. Formula grammar, A1 origin, and result semantics were not changed. These are candidate-only test/transaction corrections, not a formula compatibility decision.

`DependencyGraph.ts` carries the graph Journal and fault seam. `EventBus.ts` has generic event payload/handler and subscription signatures needed for typed event callbacks, while runtime `once` behavior remains clean-base behavior. `events.ts` adds safe per-listener Worksheet publication. No Application event bridge, D5-05 schema, `once` correction, or cross-surface observer-completion ordering was introduced.

## Exact candidate state

- Base Git revision: `88b09634f17f3b39d88a88c5428f76b426459a2b`.
- Nine prospective Core source files are listed with final SHA-256 values in `CS-002D4-R1-PKG-18B-workbook-candidate-manifest.md`.
- Candidate is uncommitted/un-staged. Candidate-only test configuration, resolver support and fixtures, copied evidence tests, and the PKG-18C StyleCache test overlay were used. Existing assertions were not rewritten to make the run pass.
- The shared worktree remained separate from the candidate; Lane E made no shared source or test edits. It updated only authorized PKG-18 evidence documents and raw verification outputs.
- Core typecheck passed. The scoped Jest run passed 146 tests across 16 suites, with two out-of-scope assertions filtered. Detailed chronology is in PKG-18E.

## Dependencies and residual risks

1. **Formula operation:** Focused rollback checks establish tested cell/graph restoration. Formula syntax, origin, and general evaluation compatibility remain separate contract decisions.
2. **Dimensions/events:** Row-height and column-width behavior uses operation-specific Worksheet and Workbook event evidence only; D5-05 Application forwarding is absent.
3. **StyleCache:** The PKG-18C test verifies two observable provisional style releases on cross-Worksheet rollback. Private exact reference counts, release-failure recovery, and disposal-time clearing remain unverified.
4. **Queue contract:** The candidate covers selected FIFO and disposal cases. The shared FIFO self-await limitation remains unchanged.
5. **Mixed source hunks:** The bounded selection cannot prove all untested paths or full Core integration.
6. **Test seams:** Candidate fault hooks and diagnostics are internal and are not exported from the package barrel. Their verification scope is limited to included cases.

## Disposition and handoff

**PROSPECTIVE CANDIDATE BOUNDEDLY VERIFIED — DEPENDENCIES OPEN.** The candidate passed only the authorized Core typecheck and focused test selection after the documented corrections. Do not overlay the candidate onto the shared worktree or promote a ledger disposition on this report. Formula and Pivot decisions, the StyleCache residuals, shared FIFO self-await, full Core status, and integrated acceptance remain open. Overall CS-002D4-R1 acceptance remains **WITHHELD**.

## Boundary checks

- Candidate and shared-worktree `git diff --check` passed.
- Focused-test hygiene found no focused markers.
- The protected Core sidecar manifest passed 237/237 after the candidate-only Jest run; no full Core run or sidecar mutation occurred.
- These checks and bounded tests do not establish release acceptance.
