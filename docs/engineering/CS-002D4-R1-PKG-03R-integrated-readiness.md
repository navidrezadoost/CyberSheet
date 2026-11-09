# CS-002D4-R1 PKG-03R — Integrated readiness gate

**Outcome: READY WITH PREREQUISITES**
**Overall CS-002D4-R1 acceptance: WITHHELD**
**Implementation authorization: NOT GRANTED**

PKG-03A, B, and C completed their separately scoped evidence work. No production behavior, test source, authoritative contract, ledger disposition, frozen register, acceptance baseline, or persistence format changed in PKG-03. The next candidate is sufficiently bounded for owner and authorization review, but its contract/authority prerequisites are not yet satisfied.

## Baseline and change boundary

- Starting Git HEAD: `88b09634f17f3b39d88a88c5428f76b426459a2b`.
- Starting shared worktree inventory at the beginning of PKG-03: 388 dirty paths. All pre-existing work was preserved. Workstream A, B, C, and this reconciliation add only their named documentation artifacts.
- Production transaction default remains Incremental Journal. Snapshot remains a test-only comparison strategy. The supported transaction operation set remains seven.
- Protected Core manifest: `docs/engineering/CS-002D4-R1-PKG-01K-core-sidecar-sha256.txt`; SHA-256 `a6b89cdc3ccd8bfc8c054e5fafcb4dc84ed9ba1347eb2597a3e7bef938969b6c`; 237 entries. Manifest checks passed before and after the two serialized PKG-03C Jest windows, with byte-identical verification outputs.

## Workstream reconciliation

### PKG-03A — Contract authority and D5 governance

Outcome: **AUTHORITY UNVERIFIED — ESCALATION REQUIRED**. Repository materials refer to a project-owner role approving the original D0–D7 behavioral choices, but do not identify a named/scoped D5 owner, delegation basis for a clarification, or an approved decision channel. The prior Workbook/API and Worksheet/API designation requests are drafts marked unsent. Option C remains a proposal and was not transmitted. No authoritative contract edit or Application bridge/schema change occurred. See [authority report](CS-002D4-R1-PKG-03A-governance-and-authority.md), [decision bundle](CS-002D4-R1-PKG-03A-D5-decision-bundle.md), and [final status](CS-002D4-R1-PKG-03A-final-status.md).

D5-05 remains unresolved. Engineering can map implementation reachability, existing event payloads, bridge activation, and migration risk; only an authorized product/API contract owner can decide Application event authority, stable names/payloads, intended audience, forwarding guarantee, and compatibility policy. Formal contract maintenance requires an attributable authorized decision, exact normative wording, effective date, authority reference, change-control link, and verification that D5-05 boundaries remain explicit.

### PKG-03B — D2-11 transaction coverage

The current Workbook transaction surface remains exactly: `setCellValue`, `setCellFormula`, `clearCellContent`, `clearCellFormula`, `setCellStyle`, `setRowHeight`, and `setColumnWidth`. PKG-02A/B close only their respective row-height and column-width slices; PKG-02C supplies seven-operation Journal/Snapshot integration evidence. D2-11 remains globally unresolved.

The ten named D2-11 families were mapped individually: formula dependency graph, volatile state, row/column dimensions, visibility, comments, drawings, conditional formatting, Pivot accumulators/snapshots, external host persistence, and undo history. Structural row/column edits remain a cross-family concern and were not reclassified as dimension setters.

The highest-ranked bounded candidate is **transactional deletion of one existing comment**, fixed to the existing `deleteReplies=true` cascade, with one-cell exact-state rollback and existing `comment-deleted` / `comment-delete` events. The proposed design explicitly handles the shallow CellRecord before-image, buffered publication, no-op semantics, and both Journal/Snapshot paths. It adds no Application event and does not imply history or persistence coverage. See [coverage map](CS-002D4-R1-PKG-03B-D2-11-coverage-map.md), [priorities](CS-002D4-R1-PKG-03B-operation-priorities.md), and [next-operation design](CS-002D4-R1-PKG-03B-next-operation-design.md).

### PKG-03C — Core integration and baseline recovery

Historical PKG-01J reports 9 failed suites / 19 failed tests in its then-current broad diagnostic: seven suites stopped at TypeScript diagnostics; 18 Pivot formula integration cases failed during fixture setup at rejected post-publication `Workbook.addSheet()`; one executed BT-2 assertion failed on merged-read object identity. These failures did not reach the transaction strategy selector and were not proven to originate in a particular historical change. PKG-02C separately retried the old Workbook Pivot snapshot integration fixture: missing internal accessors at compile time, zero tests executed. PKG-01K repaired only the EventBus fixture path; it did not waive the Pivot blockers.

The isolated serialized bounded verification passed. The first unisolated attempt at the 11-suite event/transaction selection failed 10 suites / 133 tests on stale generated JavaScript missing DependencyGraph journal methods, with 1 suite / 37 tests passing. After parking/restoring the nine source-sidecar groups, the identical selection passed:

- Event, seven-operation, Journal/Snapshot, and PKG-02D/E/F/02G-C selection: 11 suites, 170/170 tests.
- Standalone `getpivotdata`, `pivot-snapshot-store`, and `pivot-recompute`: 3 suites, 50/50 tests.

No full Core suite was run, no historical baseline was recaptured, and no Pivot integration fixture was repaired. `Workbook` retains private Pivot registry/store state; public `getPivotSnapshot()` is read-only/detached, while `createPivot()`, `deletePivot()`, and post-publication `addSheet()` are unavailable. Standalone Pivot tests cannot substitute for Workbook-owned registration, dirtying, source integration, or lifecycle tests. The shared FIFO self-await limitation remains a separate blocker. See [baseline classification](CS-002D4-R1-PKG-03C-core-baseline-classification.md), [environment procedure](CS-002D4-R1-PKG-03C-test-environment-reproducibility.md), and [integration verification](CS-002D4-R1-PKG-03C-integration-verification.md).

## Dependency register

| Dependency | Status | Reconciliation |
| --- | --- | --- |
| D5-01 Option C clarification | `OWNER-DECISION-REQUIRED` | Engineering tests passed, but formal authority and owner response are absent. Keep authoritative wording unchanged. |
| D5-05 Application event authority/schema | `OWNER-DECISION-REQUIRED` if any Application event is required | The proposed comment-delete slice can avoid adding Application forwarding; it must not claim complete three-level propagation. |
| Comment-delete API semantics and owner designation | `OWNER-DECISION-REQUIRED` | Confirm missing-ID no-op behavior, fixed reply cascade, and owner scope before implementation authorization. |
| Exact comment CellRecord before-image and rollback | `VERIFICATION-DEPENDENT` | B's design identifies detached comment/cell state and required Journal/Snapshot failure cuts; implement only in a separately authorized package. |
| Protected Core source-sidecar testing procedure | `INDEPENDENT` | Nine source-sidecar groups were parked/restored serially; all 237 protected manifest entries matched. No concurrent Jest or sidecar job was run. |
| Legacy Workbook/Pivot integration | `BLOCKED` | Current public creation/lifecycle/accessor paths are unavailable; a public owner contract or approved test route is required. No API was added. |
| Global D2-11 | `VERIFICATION-DEPENDENT` | The remaining families have distinct owners and rollback surfaces; only the seven current operations are covered by the transaction gate. |
| Shared FIFO self-await | `BLOCKED` | Separate known limitation; no fix or characterization expansion in this package. |
| External persistence and Workbook-owned undo | `OWNER-DECISION-REQUIRED` | Neither is included in the selected comment operation; require separate contract and host/API scope. |

## Evidence integrity and hygiene

PKG-03C used Node v26.10.0, Jest 30.5.2, and TypeScript 6.0.3. Each Jest invocation was serialized with `--runInBand` and the reversible source-sidecar isolation procedure. Existing ts-jest deprecation and TS151001 warnings were non-failing. No TypeScript source or test file changed in PKG-03, so Core typecheck was not rerun; the cited PKG-02C typecheck remains historical evidence, not a fresh PKG-03 result.

`git diff --check` and document whitespace checks passed at final integration. SHA-256 evidence hashes for the nine A/B/C workstream reports are listed below; all are working-tree report artifacts at this starting revision, not committed source evidence. No full-suite status is claimed.

| Workstream artifact | SHA-256 |
| --- | --- |
| PKG-03A governance and authority | `c271b43c853a586f9d20476c513784beab7ceb00012f9202c73fcac329107747` |
| PKG-03A D5 decision bundle | `edcd8777bac0102cc4de3620da1c88a4912122f98c904f2e3b217efc09e5f914` |
| PKG-03A final status | `a19a4d9a12a810ea4414ea0419eb3c76e08794f811c9dc52a4df00f61c06e480` |
| PKG-03B D2-11 coverage map | `d2f531d6c1d415bbf9d58c0a71292ee31b31b1494ed25fe851a70539efe28147` |
| PKG-03B operation priorities | `28a2040247180dd279ae2e37a23c5e35c00bf0f5b449cf41b9138ab9739b0457` |
| PKG-03B next-operation design | `f40f96f26a984d6567693e30816aa3f693d854f3d4f484f3190dba3137673099` |
| PKG-03C Core baseline classification | `acb2215c1d0d1c0478c3ee3669b6c7555fde54d371b994fd7dd83520f0067a64` |
| PKG-03C test-environment reproducibility | `492e8d201597f6a242db6d3d252aa0bffca140c16ab312053d4f2f9c82f08802` |
| PKG-03C integration verification | `28e523a71288bae54705194032dc73b560c74bc300a7ab950bbf2e9cec1a1353` |

## Next implementation recommendation

Recommend a separate bounded authorization for **one-comment transactional deletion** only after:

1. Project leadership designates the Workbook/API and Worksheet/API decision authority and approved response channel, or records a formal deferral with a responsible authority and date.
2. The authorized owner confirms missing-comment no-op behavior and the initial `deleteReplies=true` cascade semantics.
3. D5-01 receives an attributable decision. If Option C is approved, preserve current event timing and avoid any claim of a global cross-surface order. If strict ordering is required, stop and obtain a distinct compatibility/implementation authorization. Do not add Application forwarding; if required, resolve D5-05 first.
4. The operation package receives explicit implementation authorization and verifies the exact CellRecord/comment before-image, events, rollback/recovery, and no-side-effect matrix under both strategies.

This is a recommendation only. PKG-03R does not authorize an eighth operation. Overall CS-002D4-R1 acceptance remains **WITHHELD**.
