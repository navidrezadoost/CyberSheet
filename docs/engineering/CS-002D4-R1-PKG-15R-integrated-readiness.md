# CS-002D4-R1 PKG-15R — Integrated readiness

**Disposition: CORE STABILIZATION IMPROVED — AUTHORITY PENDING**
**Overall CS-002D4-R1 acceptance: WITHHELD**

PKG-15 added 17 passing characterization/recovery tests in two new focused suites, reduced one cross-Worksheet D2-11 residual, completed the requested Core diagnostic, and converted existing governance blockers into a prioritized action register. No production source or public contract changed. The disposition reflects improved verification evidence; it does not indicate that the Core product implementation itself received a new production correction.

## Required readiness conclusions

| Area | PKG-15 conclusion | Remaining gate |
| --- | --- | --- |
| Formula parser/evaluator readiness | The graph extractor recognizes plain, mixed, and absolute A1 spellings as the same literal E5 dependency. The tested evaluator accepts `=E5+1`; dollar-marked forms yield `#NAME?`. The 15-case matrix passed across ordinary, merge-anchor, and non-anchor merged-member placement, replacement, clearing, and recalculation. | Formula/API authority must decide supported `$` grammar and result/error behavior before parser changes. |
| Merge-coordinate semantics | Formula submitted through merged non-anchor B2 is stored at anchor A1 without reference translation; the graph records literal E5. | Decide requested-member versus effective-anchor formula origin. D7-05 public provenance DTO remains a separate owner decision. |
| Seven-operation transaction correctness | The added cross-Worksheet formula-graph failure case restored snapshots and dependency graphs under Journal and Snapshot, suppressed Worksheet and Workbook cell events, closed cell journals, and left health healthy. The two PKG-15 cases passed with the adjacent transaction/event window (15 suites / 201 tests). | This is one bounded R02 cut, not a completeness proof. |
| D2-11 residual completeness | One residual was narrowed: a later Worksheet's graph registration failure after an earlier Worksheet formula write. Other graph shapes, fault phases, private cache state, non-operation mutation families, and external side effects remain. | Keep D2-11 unresolved until all authorized-family state owners and fault/recovery cuts are reconciled. |
| Pivot component readiness | Existing tests cover synchronous snapshot validation/replacement, last-good preservation, recompute fallback and retry, dirty/rebuilding recovery, Error identity through standalone transform/store/query, and clear/clean paths. PKG-15C found no useful additional supported component case. | These tests do not grant async lifecycle, generation fencing, Workbook disposal integration, or a public Error DTO. |
| Workbook-owned Pivot integration reachability | The generic Workbook detacher drops standard non-enumerable Error fields, but authorized public APIs cannot currently populate the private Pivot registry/store; the affected read path is not reachable for an Error-valued snapshot. This is a source-observed limitation, not a public-read defect reproduction. | Obtain Workbook/API lifecycle approval and separate Error representation decision before public integration tests. |
| Comment deletion authorization | No authorization or contract state changed. The PKG-07 C1–C5 questions remain deferred and no eighth transaction operation is enabled. | Designated Workbook/API and Worksheet/API owners must decide semantics; a separate bounded implementation authorization is then required. |
| Event and ownership governance | D5-01 Option C remains a proposal, D5-05 Application event authority/schema remains unresolved, and owner designations remain unverified/deferred. D0-05 FIFO self-await remains a known limitation. | Record attributable owner designations and exact contract decisions. No Application forwarding or cross-surface completion order is inferred. |
| Full Core diagnostic | 307 suites: 295 passed, 7 failed, 5 skipped; 7,338 tests passed, 18 setup failures, 173 skipped, 9 todo. Six failures are compile-blocked legacy Pivot suites; one suite has 18 unsupported `addSheet()` fixture-setup failures; no executed assertion failures. Same seven blocked suites and 18 setup failures as PKG-14. | Do not call Core fully green or recapture the baseline. Resolve/migrate blocked fixtures only under supported API authorization. |
| R1 acceptance prerequisites | Focused tests, typecheck, and hygiene pass; 237/237 protected sidecars retain byte-identical check outputs. The worktree was preserved. | Global D2-11 closure, formula and merged-read contract decisions, Workbook Pivot lifecycle and D3-06/Error policy, comment authorization, D5/D7 authority decisions, and legacy Pivot integration failures remain. Overall R1 stays withheld. |

## Verification and change boundary

- Starting revision: `88b09634f17f3b39d88a88c5428f76b426459a2b`; initial dirty worktree: 606 paths before PKG-15 lane files. No reset, clean, or broad staging was performed.
- Focused TS-first Core selection: 15/15 suites and 201/201 tests passed. The first run's Lane B harness-count assertion failure and corrected rerun are both retained in raw outputs.
- Full Core TS-first Jest diagnostic ran once, no exclusions: raw output SHA-256 `5eb3d438f6743c8f5b7b2d84dabe909aa35f9cbf5834645c3d229661a03816ee`.
- Core typecheck passed. Focused-test hygiene, `git diff --check`, and final Markdown whitespace/newline scan passed.
- Protected Core sidecars: 237/237 before and after focused and full Jest windows; check outputs were identical.
- No production implementation, contract text, public API, operation set, Journal default, baseline, ledger disposition, or frozen register changed. No merge or release occurred.

## Next bounded action

Use the PKG-15E register to route the highest-priority formula syntax/reference-origin and D2-11 residual decisions through established authorized channels when designations exist. Keep Pivot and comment implementation gated by their explicit owner decisions and separate bounded authorizations. Do not use the completed diagnostic or passing standalone evidence to imply Workbook-owned Pivot support. Overall CS-002D4-R1 acceptance remains **WITHHELD**.
