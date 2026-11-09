# CS-002D4-R1 PKG-18B — Workbook candidate manifest

**Candidate:** `/tmp/pkg18b-candidate` (detached Git worktree)
**Base revision:** `88b09634f17f3b39d88a88c5428f76b426459a2b`
**Candidate state:** uncommitted, nine changed source files. Lane E applied candidate-only verification corrections after the initial checks; final hashes are listed below.
**Provenance:** prospective reconstruction only. No current dirty source hunk is claimed as historically attributable.

## Candidate source inventory

| Candidate file | SHA-256 | Reconstructed scope | Source rationale / evidence boundary |
| --- | --- | --- | --- |
| `packages/core/src/workbook-access-types.ts` | `b25def7cada085fbd1fe412fa0f118803f062ebf06ee080da7d6918af77ae2f9` | Seven `WorkbookMutationPort` signatures and `WorkbookTransactionContext` staging signatures. | CORE-0320, PKG-02–17 API and operation evidence. No added operation. |
| `packages/core/src/index.ts` | `5f281437385d2ecd27394241e8cbb90e308ba2a6f6592390fdf93f66e53c87f7` | Additive type export for `WorkbookTransactionContext`. | Required to expose the already-scoped callback type. No runtime export. |
| `packages/core/src/workbook.ts` | `9fce0a1a56a4037469fccafab5862d8fc51edd48fddb684016c5d6ab2ddee2db` | Transaction operation records and detached input cloning; FIFO queue; view-identity resolution; staged seven-operation API; preflight; Journal/Snapshot selection; apply, rollback, commit, event publication; health and disposal queue handling. Lane E added capability-map registration in the dev-import fixture attachment path so reconstructed owner-backed tests use the capability returned by adoption. This does not authorize general post-publication sheet creation. | CORE-0321–0325, 0331; selectively reconstructed from mixed CORE-0326–0335/0338. PKG-02A–G, 08B, 13B–15B and PKG-17 evidence. CORE-0336/0337 Pivot edits and unrelated CORE-0339 dev-import behavior remain excluded. The fixture capability-map assignment is a candidate reconstruction dependency, not a restored product feature. |
| `packages/core/src/worksheet.ts` | `0150d8e2367225864192dee64e0d4eeafd56f12f0fe66e038c0233772bda27fc` | Workbook capability checks; transaction-only Worksheet entry scope; cell, row-height, and column-width before-images; graph snapshot/restore; batch buffering and commit publication; narrowly wired internal fault callbacks; detached graph/journal diagnostics. Candidate-only fault callbacks cover after-cell-record writes, and formula dependency extraction is separated from graph registration so parser failures retain warning-and-continue while graph mutation failures reach Workbook rollback. Formula syntax, origin, and result behavior are not changed. | CORE-0344, 0346/0347, 0351–0354, 0358–0368, 0373/0374, selective method-sized reconstruction within mixed CORE-0348–0350/0355/0378–0380, plus Lane E's narrowly scoped transaction fault-seam wiring. CORE-0369–0372 formula changes remain excluded. Dimension publication is limited to existing Workbook row/column evidence; no Application forwarding. |
| `packages/core/src/dag/DependencyGraph.ts` | `a5918a4bd224071c7c7d2388e096e2af02fa1a0996570453067ea41d5b612c21` | Graph mutation before-image Journal and narrowly scoped failure/diagnostic seams. | CORE-0243–0268; PKG-17B component evidence, with Workbook integration still unverified. |
| `packages/core/src/events.ts` | `4bcc5b34f48b92e285eb31e1acb172540b58fe92eba5d3b72dccbe8ae2257225` | Safe per-listener Worksheet publication helper used after commit. | CORE-0269; PKG-02D–G/14B/15B. Does not impose ordering across event surfaces. |
| `packages/core/src/EventBus.ts` | `2c1e73897b067f1169946784211fc45dd6570081803fe439fd297b1a4dc73bb7` | Generic event payload/handler and `on`/`once`/`off` type signatures, including the narrow row/column event payloads. Runtime `once` wrapper semantics remain the clean-base behavior; no reentrancy correction was imported. | CORE-0013, 0016–0019, 0022/0023; PKG-02E/02G dimension evidence. CORE-0020/0021 runtime `once` edits excluded; no D5-05 Application forwarding or global cross-level completion order. |
| `packages/core/src/workbookMutationStrategy.ts` | `39c065bec11d7371ec72907ca7fca337f98530ac80b11e50aca7a4aff5949171` | Default Journal selector and test-only Snapshot override. | CORE-0342, PKG-02C/16B. |
| `packages/core/src/workbookMutationTestHooks.ts` | `186a5894adf019f823d7ab990370c158e9ad6eb372f69d9e30a9a75777d25cd4` | Internal test-only strategy/fault/timing hooks used by focused transaction evidence. | CORE-0343. Not exported from package barrel and not public API. Lane E should validate whether every included hook is required and may narrow it before treating candidate as review-ready. |

The main-source donor files remain untouched. Candidate files are not a byte copy of the dirty `workbook.ts` or `worksheet.ts`; changes were reconstructed from selected declarations and method sections on the clean base. Lane E made candidate-only typing, fixture-capability, and internal fault-seam corrections after documenting the initial failures. The candidate contains approximately 1,104 insertions and 39 deletions across tracked source files, plus the two internal strategy/hook modules and test-only resolver configuration/fixture inputs. Final verification and the correction chronology are recorded in PKG-18E.

## Required verification inventory for Lane E

Lane E ran the bounded selection serially. The effective inventory is:

- Seven operations and Journal/Snapshot differential: PKG-02A row height, PKG-02B column width, PKG-02C differential, plus PKG-08B observer isolation and PKG-13B side-effect rollback matrix.
- Event contract and listener behavior: PKG-02D, supported PKG-02E dimension-event cases, PKG-02G cross-level compatibility, and Workbook bridge tests. PKG-02F reentrancy was excluded because its `once` correction is a separate change.
- Queue/ownership/disposal: PKG-14B disposal publication and non-conflicting owner-boundary cases. Two stale assertions were filtered: disabled mutation-port behavior and post-disposal subscription rejection.
- Formula graph and multi-sheet rollback: PKG-15B and PKG-17C immediate-clear/fault-cut evidence, with formula syntax/origin behavior held at the clean-base contract.
- Candidate-specific StyleCache cross-sheet rollback: PKG-18C test overlay, included in the passing run.
- TypeScript-first resolver setup: Jest config, custom resolver, compatibility test, test tsconfig, three fixtures, and the paired source-side JavaScript fixtures needed for the resolver's runtime-precedence check.

The 16-suite scoped Jest run passed 146 tests; two out-of-scope assertions were excluded by `--testNamePattern`. Candidate Core typecheck passed. No full Core suite ran. See PKG-18E isolated verification for exact command, chronology, scope, and integrity evidence.
