# CS-002D4-R1 PKG-18E — Integration readiness

## Outcome

**Candidate verification: PASS within the bounded Lane E scope. Shared-worktree integration: NOT PERFORMED.** The prospective candidate at `/tmp/pkg18b-candidate` passed Core typecheck and a serialized 16-suite selection (146 passed, 2 skipped). The protected 237-entry Core sidecar manifest passed after the run. The initial compile and runtime failures and all candidate-only corrections are recorded in `CS-002D4-R1-PKG-18E-isolated-verification.md` and raw outputs.

## Readiness by boundary

| Area | Evidence | Readiness / limitation |
| --- | --- | --- |
| Seven authorized mutation operations | Row height, column width, cell value, formula, content/formula clear, style; Journal/Snapshot differential, mixed-sheet rollback, event publication | Bounded candidate tests passed. No eighth operation was added. |
| Candidate fixture ownership | Workbook-created and dev-import fixture routes | The candidate-only `attachDevImportSheet` capability-map correction was needed for the selected fixtures. This does not authorize general post-publication sheet creation. |
| Formula dependency graph rollback | DependencyGraph Journal tests; multi-Worksheet formula rollback; immediate clear cuts | Tested graph failures propagate to Workbook rollback; extraction/parser failure behavior remains warning-and-continue. Formula grammar/origin and formula compatibility remain separately undecided. |
| Event and listener behavior | Workbook bridge, event contract, dimension events, cross-level compatibility, observer isolation | Existing tested commit and within-surface guarantees passed. Two out-of-scope assertions were filtered; no global cross-layer observer completion or Application forwarding is claimed. |
| Queue/disposal | Transaction disposal publication and queue behavior in the bounded selection | Selected tests passed. Shared FIFO self-await remains unresolved. |
| StyleCache | Cross-Worksheet same-canonical-style rollback overlay | Observable provisional releases and rollback assertions passed. Private exact reference counts, release-failure behavior, and disposal cleanup remain unverified. |
| TypeScript-first resolution | Dedicated resolver config, resolver, test, and fixtures | Resolver test passed. Candidate shares installed dependencies with the main worktree. |
| Broader Core/integration/release | No full Core run, no shared-worktree overlay | Not established. Overall R1 remains WITHHELD. |

## Candidate versus main worktree

Candidate source is a prospective reconstruction, not a proven historical patch. Lane E changed only candidate files and wrote verification/report documents and raw outputs in the shared repository. It did not copy the candidate into the shared source tree, edit shared test assertions, change ledger dispositions or frozen registers, recapture a baseline, or modify the protected sidecars. Candidate source hashes are recorded in the PKG-18B manifest.

The package is ready for an independent review of the candidate and its correction provenance. It is not a recommendation to merge or a production implementation authorization. The first failing candidate run is retained rather than erased from the record.

## Remaining gates

- Review candidate-only capability and failure-seam corrections against the reconstructed source evidence before any integration decision.
- Keep formula syntax/origin, Pivot integration/lifecycle, D5-01/D5-05, global D2-11, and owner-boundary decisions at their existing statuses.
- Resolve the StyleCache exact-private-reference-count and disposal questions only if their contract or risk priority requires it.
- Treat the two filtered assertions as out-of-scope unresolved expectations, not passing tests.
- Any shared-worktree application, broader test selection, or production change requires its own bounded authorization.

**Status:** PKG-18E bounded candidate verification complete. Candidate is reviewable; integrated/release readiness remains open. Overall CS-002D4-R1 acceptance remains **WITHHELD**.
