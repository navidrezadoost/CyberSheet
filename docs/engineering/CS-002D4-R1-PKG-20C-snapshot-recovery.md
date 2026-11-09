# CS-002D4-R1 PKG-20C — Snapshot restoration-failure recovery

**Date:** 2026-11-03

**Disposition:** **RESIDUAL TEST GAP CONFIRMED — CANDIDATE SEAM JUSTIFIED; EXECUTION BLOCKED**

**Candidate:** PKG-19D isolated candidate was required; its directory was unavailable at this checkpoint.

**Shared-tree source/tests:** unchanged by this lane.

## Scope and evidence boundary

PKG-20C was assigned to `/tmp/pkg20c-candidate`, an isolated copy of `/tmp/pkg19d-candidate`. Neither candidate directory nor the earlier `/tmp/pkg18b-candidate` source was present when this lane began. The coordinator confirmed that the temporary worktree registration was prunable and directed this lane not to reconstruct the candidate or substitute the shared dirty source. Accordingly, no candidate fault injection, queue rerun, test, or typecheck is claimed here. Findings below distinguish the prior PKG-19 records from read-only inspection of the current shared tree.

PKG-19B reports successful Snapshot rollback for injected *apply* failures at `after-cell-record`, `after-predecessor-removal`, and `after-dependency-registration`, with state restored, pending Worksheet events suppressed, and health remaining healthy. It separately reports Journal restoration failure at `during-column-width-restore`, yielding a retained operation/rollback error, `recovery-required`, and rejection of a later write. PKG-19B explicitly says this restoration-failure cut was verified for Journal only. PKG-19D also records that Snapshot restoration failure was not injected because the candidate contained no supported restoration-failure seam. These are historical run reports, not fresh reproduction in PKG-20C.

## Fault-seam assessment

The available candidate hook inventory described by PKG-19 includes `beforeRollback` and Worksheet fault phases, including `after-row-height-restore-before-discard`. These can fail before restore begins or after restore has completed; they do not deterministically interrupt Snapshot state restoration itself. The documented row/column restore phases exercise Journal's sparse-map restore path. There is therefore no evidenced legitimate internal seam for a failure *during* Snapshot restoration.

An internal candidate-only seam is justified by the already approved rollback/recovery acceptance requirements. PKG-02S requires rollback-failure coverage, and PKG-02A records that if restoration or rollback cleanup fails, the error retains both causes, mutation health becomes `recovery-required`, and later writes reject. PKG-02B-S requires Journal/Snapshot comparisons for rollback-failure points. PKG-16B traceability explicitly cautions that Snapshot is independently selectable and that recovery evidence remains limited to named cases. The seam should be narrow, non-public, deterministic, scoped to a registered Workbook test-hook instance, and capable of failing at a defined point within `restoreWorkbookCellWriteState()`; it must not add an eighth operation, change recovery semantics, or claim exact restoration after an injected restoration failure.

The isolated test should first cause a primary apply failure, then throw from the Snapshot restore seam. It should assert: both errors are retained by the existing rollback error; health is `recovery-required`; a later queued mutation rejects before apply; no buffered Worksheet or Workbook event from the failed transaction publishes; temporary batch/transaction context is cleaned or its retained state is explicitly described as unavailable while recovery is required. It must not assert exact state restoration after restore has itself failed. A separate clean-retry/recovery operation is not implied by this contract.

No seam was added in PKG-20C because the candidate source was unavailable. This is a justified, narrowly scoped candidate-only follow-up, not permission to modify shared production source.

## Required next action

Restore or recreate the exact PKG-19D candidate through an authorized reproducible mechanism, then make the candidate-only internal fault seam and run the Snapshot restoration-failure test under the TypeScript-first Core Jest configuration. Preserve red/green output, candidate hashes, and sidecar evidence. If the exact candidate cannot be recovered, PKG-20C must remain unexecuted rather than substituting the dirty shared tree.

No shared production/test source, public API, operation set, Journal default, Snapshot contract, ledger, frozen register, or baseline was changed. Overall CS-002D4-R1 acceptance remains **WITHHELD**.
