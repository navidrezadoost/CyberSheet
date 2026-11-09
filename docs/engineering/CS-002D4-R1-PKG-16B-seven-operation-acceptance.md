# CS-002D4-R1 PKG-16B — Seven-operation acceptance

**Scope:** Bounded technical acceptance assessment for the seven currently authorized Workbook mutation operations, based on executable assertions and source evidence recorded in PKG-02 through PKG-15. This is an evidence reconciliation; no Jest was run in Lane B. No source, test, contract, operation set, ledger disposition, or frozen register was changed here.

**Classification rule:** “Technically verified in defined scope” requires direct evidence for the material state, fault, and publication boundaries listed in the directive. “Verified with enumerated gaps” means meaningful behavior is directly established, but a relevant state owner or failure cut is not. No accepted-contract defect is reproduced by the cited evidence. Formula grammar/reference-origin questions are kept separate from transaction restoration. Global D2-11 remains unresolved.

## Operation disposition

| Operation | Classification | Directly established scope | Material remaining gaps |
| --- | --- | --- | --- |
| `setCellValue` | **VERIFIED WITH ENUMERATED GAPS** | Workbook owner validation and transaction staging; merge-anchor storage; sparse `null` no-op; replacement of a formula clears its tested graph state; first-touch cell restoration; mixed Journal/Snapshot rollback; multi-Worksheet formula-graph failure after an earlier Worksheet write; commit-only notifications and observer isolation in the cited cases. | No exhaustive value-to-formula/style transition × every graph phase × merge topology cross-product. Sparse-cell allocation and mixed rollback are tested, but not every metadata/merge state. Formula semantic and cross-sheet dependency contracts are separate unresolved questions. |
| `setCellFormula` | **VERIFIED WITH ENUMERATED GAPS** | Staged and owner-checked Workbook writes; tested formula registration and clearing/replacement; merge-anchor graph registration while retaining requested-address event provenance; exact tested cell/graph restoration under Journal and Snapshot; commit-only publication; cross-Worksheet registration-failure rollback in both strategies. | Graph shapes and phases remain incomplete: cycles, range watchers, volatile transitions, every registration/dirty/recalculation subphase and combinations with all operation orders are not exhausted. Formula grammar, `$` support, formula-origin semantics, cross-sheet references, and result/Error policy require separate contract decisions. |
| `clearCellContent` | **VERIFIED WITH ENUMERATED GAPS** | Existing or empty-content semantics in the bounded operation inventory; content clear included in successful seven-operation commit and in mixed Journal/Snapshot rollback; cell/graph state and pending notifications restore/suppress in the exercised sequence. | No isolated late-fault test whose fault occurs immediately after a content-clear write, for both absent and populated formula-bearing cells and merge members. Current direct fault evidence is through shared cell-record/graph transaction scenarios. |
| `clearCellFormula` | **VERIFIED WITH ENUMERATED GAPS** | Formula removal while retaining value/style, tested no-op when no formula, merge-anchor graph clearing, and graph cleanup; included in seven-operation commit and mixed rollback. Journal/Snapshot restoration is shown for tested formula shapes and transaction cuts. | No complete operation-specific matrix for failure immediately after formula clearing across formula graph shapes, volatile/range state, merge topology, and repeated writes. Formula evaluation semantics remain separate. |
| `setCellStyle` | **VERIFIED WITH ENUMERATED GAPS** | Workbook style interning and owner path; style commit/event behavior; exact public cell/snapshot restoration in mixed Journal/Snapshot rollback, including provisional style assignment followed by later failure; merged-member style rollback; committed listener-failure isolation. | Private StyleCache reference counts have no direct oracle. Commit release of displaced references and rollback release of provisional references are source-described and indirectly exercised through public state, but counts/leak behavior are not directly verified. No exhaustive same-cell style/value/formula/merge cross-product. |
| `setRowHeight` | **VERIFIED WITH ENUMERATED GAPS** | Validation, owner checks, staging, ordered application, sparse absence versus explicit default restoration, repeated writes, both strategies, multi-Worksheet rollback, event frequency/order, cancellation/disposal, clean rollback health, restoration-failure recovery-required state, and mixed seven-operation behavior. | No assertion covers every possible dimension-map/transaction subphase combination with all other operations. Renderer paint completion, persistence, history, and external effects are outside this operation scope. |
| `setColumnWidth` | **VERIFIED WITH ENUMERATED GAPS** | Validation, owner checks, staging, ordered application, sparse absence versus explicit default restoration, repeated writes, both strategies, multi-Worksheet rollback, event frequency/order, cancellation/disposal, clean rollback health, restoration-failure recovery-required state, and mixed seven-operation behavior. Object snapshots preserve widths; the binary codec omission is separately recorded compatibility behavior. | No assertion covers every possible dimension-map/transaction subphase combination with all other operations. Renderer paint completion, persistence, history, and external effects are outside this operation scope. |

## Shared transaction guarantees and boundaries

The PKG-14B direct acceptance cases add, for each of the seven operations, a failure before the first operation applies and a second failure after that operation applies but before a later operation, under both Journal and Snapshot. They compare exact Worksheet snapshots, require no buffered events to escape, and require healthy mutation status after successful restoration. Two publication-disposal cases establish that disposal during committed publication preserves committed state and suppresses later queued publication. Result: 30/30 executions passed as recorded by PKG-14D.

PKG-15B adds a distinct higher-risk cut: Alpha's formula write and graph change have applied; Beta formula registration then fails immediately after registration. Under both Journal and Snapshot, both sheets' snapshots and graph observations match their before images, no Worksheet or Workbook cell notifications escape, journals close, and health remains healthy. The focused selection passed 15 suites / 201 tests as recorded by PKG-15D. This narrows, but does not exhaust, formula-graph rollback risk.

The evidence also covers commit-only publication and listener failure isolation. It does not establish a universal callback-completion order across Worksheet and Workbook EventBus surfaces. D5-01 remains unresolved/approval-pending as recorded elsewhere; no ordering guarantee is added here.

## Why no operation is classified as blocked or contract-dependent

The cited runs report no reproduced violation of an already approved contract for these seven operations. The open points are evidence gaps, private-state observability limits, or separate semantic/authority decisions; they are not evidence of a current rollback defect. The formula syntax and merged-member formula-origin decisions do not determine whether the transaction restores the state it captured. Likewise, no authority is inferred for Workbook-owned Pivot lifecycle, comment deletion, Application forwarding, persistence, or additional mutation operations.

Accordingly, no operation is classified **BLOCKED BY TECHNICAL DEFECT** or **CONTRACT DECISION REQUIRED** for the bounded transaction acceptance question. This must not be read as acceptance of the separate formula, event, Pivot, comment, or global transaction contracts.

## Remaining D2-11 work

PKG-14B's residual register remains the governing gap list, with PKG-15B narrowing only R02:

- Other mutation families and their state owners remain outside the seven operations.
- Formula graph coverage still lacks cycles/ranges/volatile and complete subphase × operation × ordering combinations.
- Private StyleCache counts and reference lifecycle lack a direct oracle.
- Cross-level event completion ordering and Application forwarding remain unresolved/unauthorized.
- Workbook-owned Pivot invalidation cannot be end-to-end asserted through an unavailable public registration/lifecycle path.
- Persistence, undo history, completed rendering, and host resources remain external to this in-memory slice.
- Restoration/cleanup failure pathways are covered at selected cuts, not every owner and cleanup phase.

Therefore the package does **not** close global D2-11 and does not promote overall CS-002D4-R1 acceptance. Lane E's synchronized acceptance selection is the current verification authority for any new integrated result; historical pass counts cited here remain attributed to their original packages.

## Evidence index

Operation-level details and exact sources/tests are traced in [PKG-16B evidence traceability](CS-002D4-R1-PKG-16B-evidence-traceability.md). Primary reconciliations are PKG-02A/B/C, PKG-08B, PKG-09C, PKG-12A, PKG-13B, PKG-14B, and PKG-15B. PKG-14D and PKG-15D are the recorded execution reports. No Lane B test execution is claimed.
