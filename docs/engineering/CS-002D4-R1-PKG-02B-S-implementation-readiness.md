# CS-002D4-R1 PKG-02B-S — Implementation Readiness

**Disposition: READY WITH PREREQUISITES**
**Candidate:** Workbook-owned single-column width update
**Implementation authorization:** Not granted by this planning checkpoint

## Why this is bounded

The source path is local to the existing per-Worksheet dimension Map and the established Workbook FIFO/capability/batch/Journal mechanism. Width writes do not inherently require formula graph, style-cache, merge, Pivot, or Workbook lifecycle changes. The renderer already observes generic `sheet-mutated` and invalidates layout; no renderer behavior change is needed to characterize a scheduled invalidation. The candidate is a distinct operation, not general dimension support.

The six currently implemented operation kinds are five cell writes plus row height. The proposed column-width method is a seventh kind if added to that existing set. All seven must be exercised together before implementation readiness is upgraded.

## Preconditions for implementation approval

1. **API authority:** Approve or revise both additive signatures: `mutationPort.setColumnWidth(sheet, column, widthPx): Promise<void>` and `transaction.setColumnWidth(sheet, column, widthPx): void`.
2. **Validation authority:** Decide one-based `1..colCount`; finite positive px; whether any Core maximum exists; zero-width rejection. Keep visibility in the separate visibility store.
3. **Event authority:** Approve generic `sheet-mutated` publication and whether same-value writes are eventful. This plan proposes one event per staged write, preserving current standalone setter frequency and transaction order.
4. **Transaction design acceptance:** Approve exact sparse Journal before-images and independent Snapshot full-map restoration, including absent-versus-explicit-80 fidelity and mixed seven-kind multi-sheet rollback.
5. **Separate implementation authorization:** Authorize the source/API/test changes after reviewing the above decisions. PKG-02B-S itself does not authorize them.

## Proposed design gates

- Keep Incremental Journal as the production default. First-touch width before-image is `{present:false}` or `{present:true,widthPx}` per column and Worksheet. Repeated writes retain only the initial image.
- Snapshot comparison copies the complete set of explicitly stored widths and restores it independently.
- Validate every operation and target before starting mutation on any sheet. During apply, use private Workbook capability, batch event routing, FIFO order, and a single commit point.
- On pre-commit failure, restore width and every other staged operation in reverse Worksheet/touch order, discard buffered events, and preserve queue health if rollback succeeds. If restoration fails, retain both failures and set recovery-required.
- Keep standalone `Worksheet.setColumnWidth` unchanged. Do not add user-facing Workbook undo/history.
- Treat `extractSnapshot/applySnapshot` in-memory support separately from binary persistence: the current binary codec drops explicit width entries. No persistence work is included.

## Open decisions

| Decision | Current evidence | Required resolution |
| --- | --- | --- |
| Public method naming/parameters | Proposed `setColumnWidth(sheet,column,widthPx)`; no owner method exists. | Workbook/API owner approves exact names and types. |
| Index validation | Normal APIs use one-based columns; raw setter accepts any map key. | Approve integer bounds or specify compatibility requirements. |
| Width validation/max | Current setter accepts any number; callers have unrelated local limits. | Approve finite-positive rule and explicitly state whether a Core maximum exists. |
| Same-value event rule | Standalone setter emits every call; row-height owner path emits one event for each staged setter call. | Approve per-staged-write event preservation or intentional coalescing/no-op suppression. |
| Persistence expectation | Object snapshots include widths; binary codec excludes them; scoped XLSX source search found no width mapping. | Confirm this operation is transactional in-memory only; persistence remains separate unless owner expands scope. |

These are operation-level decisions, not a new architectural/lifecycle blocker. If the API owner cannot approve the listed policies, readiness becomes BLOCKED pending that decision. Until approval, the result is **READY WITH PREREQUISITES**.

## Verification and change boundary

Starting HEAD: `88b09634f17f3b39d88a88c5428f76b426459a2b`. Starting dirty path count: 339. All 237 entries in the PKG-01K Core sidecar SHA-256 manifest passed. Source, tests, ledger, frozen registers, historical reports, and generated sidecars were not changed. No tests, builds, typechecks, or baselines were run. `git diff --check` was run after the documentation changes; outcome is recorded in the completion response. Overall CS-002D4-R1 acceptance remains WITHHELD.
