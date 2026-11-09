# CS-002D4-R1 PKG-12A — Core transaction and read integrity matrix

**Lane status:** One merged-member formula dependency defect was reproduced and corrected with a bounded source change; focused and adjacent verification passed.

## Existing coverage reviewed

| Area | Prior evidence | Existing boundary | PKG-12A assessment |
| --- | --- | --- | --- |
| Sparse cell states and null no-op | PKG-09C, `worksheet-null-write-noop.p1-pkg-09c.test.ts` | Absent-null writes do not allocate; same-value and formula-clear paths are separately covered in standalone and Workbook Journal/Snapshot modes. | No duplicate case added. |
| Mixed mutation equivalence and rollback | PKG-02C `workbook-seven-operation-differential.p1-pkg-02c.test.ts`; PKG-08B observer-isolation test; PKG-11B focused seven-operation selection | Seven operation kinds, multiple Worksheets, exact state, event visibility, Journal/Snapshot comparison, rollback and observer isolation. Existing rollback injections target dimensions/batch settlement, not a merged member coordinate. | Extend the interaction boundary specifically for merged cells. |
| Merge read identity and write redirection | PKG-10B migration of `merge-api.test.ts`; `merge-read-identity-safety.p1-08as.test.ts` | D7-02 detached anchor/member reads and standalone value-write redirection. Existing formula test checks that the displayed formula is visible through anchor/member reads. | Did not assert dependency graph ownership at the effective anchor for a Workbook transaction; PKG-12A added that coverage and corrected the reproduced defect. |
| Formula/value clearing | PKG-09C null-write tests; PKG-02C mixed formula/content clear; PKG-11B seven-operation selection | Clearing and dependency behavior at ordinary coordinates; no merged-member transactional formula registration/clear assertion found. | New formula graph mapping regression added; no clearing semantics changed. |
| Events after commit, listener failures, disposal | PKG-02D/E/F/G-C and PKG-08B; PKG-11B event selection | Event bridge lifecycle, final committed state visibility, listener isolation, frequency/no-op behavior, and queue/disposal cases. | No duplicate generic event tests added. New rollback case checks buffered event suppression for merged-member writes. |
| Protected test resolution | PKG-08–11 verification reports and 237-entry sidecar manifest | Use declared Node/npm and opt-in TypeScript-first Core Jest config; sidecars are verified around serialized runs. | PKG-12R followed this procedure; every serialized test window retained identical before/after sidecar output. |

## Newly targeted gap

`Worksheet.setCellFormula()` resolves the storage cell through `#ensureCell(addr)` and records a before-image through a helper that itself resolves merged addresses (`worksheet.ts:589-596, 1229-1249`). It originally extracted dependencies using the requested address and called `registerDependencies(addr, ...)` (`worksheet.ts:1251-1281`), while storage used the effective anchor. The corrected implementation registers and notifies the resolved address. `clearCellFormula()` and value replacement also clear/notify using the resolved address. Public `cell-changed` events continue to identify the requested address.

The new test first reproduced missing anchor precedents in both Journal and Snapshot; the initial corrected test expected the view to expose the cached formula value, which correctly failed because the owner view masks it. After updating that expectation, the test reproduced the missing anchor dependency. The narrow source fix moved formula graph registration, formula-engine callback, recalculation notification, and clear paths to the resolved anchor while preserving requested-address events.

The new Journal/Snapshot rollback cases cover a style write and formula write through the merged member, inject failure at the second `after-cell-record` phase, and assert exact snapshot restoration, no committed Worksheet events, empty graph state, and healthy Workbook status. The multi-sheet success case checks that value and style operations through merged member coordinates are visible consistently through both anchor and member reads and create only the anchor cell records.

## Added test inventory

`packages/core/__tests__/workbook-merged-member-integrity.p1-pkg-12a.test.ts` contains five test executions when parameterized:

- Journal and Snapshot formula/dependency-anchor mapping (2).
- Journal and Snapshot merged-member rollback/event suppression (2).
- Multi-Worksheet merged-member value/style commit and read redirection (1).

The final focused run passed 5/5; the seven-suite adjacent compatibility selection passed 152/152. The test does not add a mutation operation, change event schemas/order, assert a cross-surface callback order, or exercise Workbook-owned Pivot behavior.
