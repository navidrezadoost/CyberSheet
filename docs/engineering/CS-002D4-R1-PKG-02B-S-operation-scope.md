# CS-002D4-R1 PKG-02B-S — Operation Scope

**Checkpoint:** bounded source investigation and implementation planning
**Candidate:** Workbook-owned single-column `setColumnWidth`
**Production mutation default:** Incremental Journal for the existing five cell-write operations and `setRowHeight`
**Authorization:** No implementation in this checkpoint
**Overall CS-002D4-R1 acceptance:** WITHHELD

## Repository and evidence boundary

The starting revision was `88b09634f17f3b39d88a88c5428f76b426459a2b`. `git status --short` listed 339 paths before this checkpoint. The worktree was already dirty, including the PKG-02A changes in `worksheet.ts`, `workbook.ts`, and `workbook-access-types.ts`; those files were read only and their existing changes were preserved. The PKG-01K protected Core sidecar manifest passed `sha256sum -c` for all 237 entries. The PKG-02S and PKG-02A planning, implementation, verification, and D2-11 closure reports and the authoritative contract inventory were reviewed.

This checkpoint adds only the four PKG-02B-S documents. It does not modify production source, tests, the ledger, frozen registers, prior reports, or sidecars. No tests or builds were required or run.

## Current source path

`Worksheet` stores explicit widths in `#colWidths: Map<number, number>` in `packages/core/src/worksheet.ts` (near line 509). The map comment says `px`. `getColumnWidth(col)` returns the stored number or `80`; `setColumnWidth(col, px)` stores the supplied value and immediately emits `{ type: "sheet-mutated" }` (near lines 2111–2116). The setter itself performs no column-range, finiteness, positivity, maximum, or same-value checks. Normal callers use one-based column addresses, but this setter alone does not enforce that convention.

The method is in `WORKSHEET_OWNED_MUTATOR_METHODS`, so an adopted Worksheet setter call is guarded by the Workbook capability mechanism. `WorkbookSheetView` exposes `getColumnWidth(column)` and has no setter. The proposed port and transaction-context APIs are therefore additive; they do not exist today.

Proposed shape, subject to API-owner approval:

```ts
workbook.mutationPort.setColumnWidth(sheet, column, widthPx);
workbook.transact((tx) => tx.setColumnWidth(sheet, column, widthPx));
```

`widthPx` names the existing internal unit explicitly. This proposal covers one column per operation only. It excludes bulk resizing, AutoFit, insertion/deletion, visibility, freezing, Pivot state, and general layout operations.

## State, defaults, and adjacent behavior

- An absent `#colWidths` entry reads as `80` px. A stored entry with value `80` reads the same but is distinct: `extractSnapshot()` emits explicit entries, `applySnapshot()` reconstructs the map, and structural index remapping also transforms the map.
- Hidden columns use `VisibilityStoreV1`'s separate hidden-column `Set`; hide/show operations do not encode visibility by writing a zero width. A width operation must not change that state.
- The React `setColumnWidthsInRange` command captures effective getter values and restores them through `setColumnWidth`. Thus existing UI undo can materialize an explicit default-valued entry where the prior state was absent. This existing standalone history is not exact sparse-state undo and is not part of the proposed Workbook transaction history.
- The React column-width UI converts its entered value to pixels with `Math.max(12, Number(value) * 8)`. That is a UI conversion/minimum, not a Core setter contract or evidence of a Core maximum. Canvas resize uses integer pixel widths; AutoFit has a local 400 px cap.
- `WorksheetSnapshot` extraction/application carries `columnWidths`. The binary `SnapshotCodec` declares widths/heights excluded and its current section table has no dimension section, so binary codec round-tripping omits the explicit map. A scoped search of `packages/io-xlsx/src` found no column-width import/export mapping; this is a search result, not a guarantee about every external format or host adapter.

## Operation boundary and proposal

1. **Authority:** Resolve an issued view or Worksheet ID through the owning Workbook; require the adopted Worksheet's private capability for the setter. Do not expose the raw Worksheet or capability. Calls enter the existing FIFO queue.
2. **Coordinate:** Propose a one-based integer column from `1` through the target Worksheet's current `colCount`. This matches addresses, column labels, snapshot entries, and normal consumers, while the legacy setter currently does not validate it.
3. **Value:** Propose a finite, strictly positive pixel width. Reject zero and negative values so a dimension write cannot silently stand in for visibility. No Core maximum is evidenced; do not import the React or Canvas local caps into Core. Whether a maximum is required remains an owner decision.
4. **Events:** Preserve the established generic `sheet-mutated` event. The current standalone setter emits on every call, including same-value writes. Proposal: each staged write publishes one such event after commit, in transaction order, and same-value writes remain eventful for compatibility. Any coalescing or no-op suppression needs explicit approval.
5. **Atomic boundary:** Validate all staged target columns and values before touching any Worksheet; then capture state, begin all participating sheet batches, apply in FIFO order, finish all batches and Journal state, mark one commit point, and publish buffered events. A failure before the commit point restores all participating sheet state and suppresses pending events. A restoration failure records both failures and makes the Workbook recovery-required.
6. **Scope:** Keep mutation queue cancellation/disposal semantics and the documented direct/indirect self-await limitation unchanged. This operation does not add command history or change renderer architecture.

## Remaining decisions and handoff

Before implementation, the API owner must approve the proposed API names/signatures, one-based bounds, finite-positive pixel value rule, whether any Core maximum exists, and same-value event frequency. The implementation authorization must separately include the operation. Persistence behavior is an existing limitation to disclose; adding or changing persistence is outside scope. The operation is bounded to the existing owner/capability and FIFO transaction architecture and does not require a new Workbook lifecycle contract.

Implementation readiness is **READY WITH PREREQUISITES**. The source path, dimension storage, and transaction integration points are identified, but validation and event policy remain proposed rather than approved. See the side-effect matrix, acceptance plan, and readiness report. D2-11 remains globally unresolved and R1 acceptance remains WITHHELD.
