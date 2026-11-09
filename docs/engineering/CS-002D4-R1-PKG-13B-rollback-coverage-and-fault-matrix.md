# CS-002D4-R1 PKG-13B — Rollback coverage and fault matrix

**Status:** Test and inventory preparation complete; focused execution passed in PKG-13D serialization. No production code was changed by Lane B. Journal remains production default; Snapshot remains an independent test-selected comparison strategy.

## Prior coverage reconciliation

| Evidence | Covered behavior | Boundary / uncovered interaction carried into PKG-13B |
| --- | --- | --- |
| PKG-02A `workbook-row-height-journal.p1-pkg-02a.test.ts` | Row sparse/default restoration, repeated dimension writes, validation, pre/post-write failure, mixed cell+row rollback, multi-Worksheet rollback, recovery-required, committed dimension events. Journal and Snapshot are independently parameterized where shown. | Does not combine row and column changes with repeated same-address formula/value/style mutations and sparse-cell allocation in the same failing transaction. |
| PKG-02B `workbook-column-width-journal.p1-pkg-02b.test.ts` | Column sparse/default state, validation, owner guard, repeated assignments, both strategies, mixed seven-kind commits/rollback, observer errors, recovery classification and queue disposal. | Same combined interaction gap; operation-specific matrix is otherwise broad. |
| PKG-02C `workbook-seven-operation-differential.p1-pkg-02c.test.ts` | Mixed seven-operation state/event differential; exact state, formula graph/dirty summary, multiple Worksheets, dimension writes, rollback after a second dimension map write, and batch-settlement rollback. | Prior fault cuts happen at dimension write or batch settlement, not after a later sparse-cell write following repeated mutation of one formula-bearing address. |
| PKG-08B observer isolation and PKG-02G-C event compatibility | Observer errors after commit, per-surface event behavior, final committed-state visibility, and rollback event suppression. | Observer failure after commit is intentionally separate from physical rollback; not a new gap for this lane. |
| PKG-09C null-write no-op | Absence remains sparse for repeated null assignment in standalone, Journal, and Snapshot; formula-to-null still clears the formula and emits its event. | Covers one specific sparse no-op/cell mutation interaction, not rollback after allocating a previously absent non-null cell. |
| PKG-12A merged-member integrity | Journal/Snapshot anchor graph mapping, value/formula clearing, merged-member formula/style rollback, exact snapshot, graph and event restoration. | Rollback focuses on merged-address correctness and two cell writes; it does not combine dimensions, repeated operations on an existing formula cell, and a new sparse cell. |

## PKG-13B matrix authored

New test: `packages/core/__tests__/workbook-transaction-side-effect-matrix.p1-pkg-13b.test.ts`.

| Fault / state cut | Journal case | Snapshot case | Observable oracle | Status |
| --- | --- | --- | --- | --- |
| Explicit default row height changed on Beta | Yes | Yes | Exact explicit row-height entry restored by full detached Worksheet state comparison | Passed under Journal and Snapshot |
| Previously absent column width changed on Beta | Yes | Yes | Exact explicit column map and all other Beta state restored | Passed under Journal and Snapshot |
| Existing Alpha cell value overwritten, then replaced with formula and style | Yes | Yes | Exact cell record, formula, value, style, graph edges, dirty flags/count, volatile count restored | Passed under Journal and Snapshot |
| Previously absent Alpha cell allocated with a non-null value | Yes | Yes | Fault is injected after the fourth `after-cell-record`; `getCell(C3)` remains absent and snapshot matches before image | Passed under Journal and Snapshot |
| Multi-Worksheet atomic restoration | Yes | Yes | Both Worksheet snapshots plus graph/recalc observations equal their before-images | Passed under Journal and Snapshot |
| Worksheet and Workbook event suppression | Yes | Yes | Worksheet subscriptions and Workbook cell/formula/style/dimension listeners observe no committed events | Passed under Journal and Snapshot |
| Workbook recovery classification after successful rollback | Yes | Yes | `getMutationHealth()` remains `{ status: 'healthy' }` | Passed under Journal and Snapshot |

The test sets strategy explicitly in each parameterized case. Snapshot restoration therefore exercises its own captured `WorkbookCellWriteState` path; it is not treated as Journal-backed evidence. The test deliberately does not combine independent restore-failure injection with successful rollback assertions: PKG-02A/02B already characterize restoration failure and recovery-required behavior.

## Limits and owner-dependent effects

- The scenario observes Worksheet snapshots, graph edges, dirty/recalculation indicators, cell absence, committed events, and Workbook health. It does not inspect private Journal entries or private Snapshot capture objects.
- StyleCache reference accounting is evidenced from source and adjacent style/rollback coverage; the added test observes exact restored cell style but has no public reference-count oracle.
- Formula tests use deterministic simple A1 references; this matrix does not define reference-rewrite, volatile formula, spill, or Error semantics.
- Pivot invalidation is driven by Worksheet event observation in the current source. The public Workbook-owned Pivot registration/creation path is unavailable, preventing an end-to-end transaction-to-Pivot dirty-state assertion. This is an integration reachability gap, not proof of failed invalidation.
- No Application event surface, eighth mutation operation, or new transaction contract is asserted.

## Coordinator handoff

The focused file passed 2/2 tests in the serialized Core Jest window. Raw output and 237-entry before/after sidecar checks are retained in the PKG-13D artifacts. D2-11 global closure still requires complete owner-approved coverage and is not asserted here.
