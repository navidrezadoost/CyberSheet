# CS-002D4-R1 PKG-16R — Integrated acceptance readiness

**Gate outcome: READY WITH TECHNICAL BLOCKERS**
**Overall CS-002D4-R1 acceptance: WITHHELD**
**No merge, release, reset, staging, or acceptance promotion performed.**

PKG-16 prepared a complete path/status inventory, bounded acceptance evidence for the seven authorized Workbook operations, formula compatibility alternatives, a per-suite Pivot integration migration map, reproducible bounded verification, and a leadership decision packet. The evidence is useful for review, but production-source provenance is not sufficiently mapped to assemble independently reproducible implementation candidates from the accumulated dirty worktree. The seven legacy Pivot suites also remain blocked by unsupported integration fixtures/APIs. These are technical readiness blockers, not a finding of a new product defect.

## Change inventory and candidate integration units

At PKG-16 start, HEAD was `88b09634f17f3b39d88a88c5428f76b426459a2b`. The full status snapshot contains 652 individual changed/untracked paths: 105 modified, 2 deleted, and 545 untracked. Inventory TSV SHA-256 is `f250b42132c1993686634be38a6b759830f4588a300ebed2074e670299396402`. Categories are 52 production-source paths, 155 tests, 232 documentation files, 158 raw evidence files, 19 infrastructure/package files, 27 protected generated sidecar paths, and 9 other/example/build artifacts.

The 27 dirty generated sidecars are part of the 237-entry protected manifest. Package/file labels are recorded only as search hints unless supported by the cited workstream report. Most production-source hunks predate PKG-16 and cannot be attributed to one package from status or filename alone. The inventory records this uncertainty path by path. At close, all 652 starting paths retained identical status, no baseline paths were missing, and 26 PKG-16 report/evidence paths had been added; HEAD was unchanged. See `CS-002D4-R1-PKG-16A-worktree-integrity.txt`.

Candidate groups are mapped in PKG-16A: seven-operation transaction core; formula/merge; standalone Pivot; owner-dependent Workbook Pivot; comment deletion; React/renderer/framework flows; Jest/resolver infrastructure; and documentation/raw evidence. `workbook.ts`, `worksheet.ts`, `DependencyGraph.ts`, and public type/configuration files are shared conflict points. PKG-15 reports/tests form a reviewable evidence set, not a production commit. No isolated candidate worktree was created because source-hunk provenance and dependency closure are incomplete. Results are for the accumulated dirty worktree only.

## Seven-operation bounded acceptance

All seven operations are classified **VERIFIED WITH ENUMERATED GAPS** in PKG-16B:

| Operation | Classification | Principal residual |
| --- | --- | --- |
| `setCellValue` | Verified with enumerated gaps | Formula/style/merge transition and graph-phase cross-products are incomplete. |
| `setCellFormula` | Verified with enumerated gaps | Graph shapes/phases are not exhaustive; formula syntax, origin, cross-sheet, and error rules remain separate decisions. |
| `clearCellContent` | Verified with enumerated gaps | No dedicated immediate post-clear fault matrix for absent/populated, formula, and merge cases. |
| `clearCellFormula` | Verified with enumerated gaps | Formula graph/volatile/range/merge failure combinations and repeated-write cuts are incomplete. |
| `setCellStyle` | Verified with enumerated gaps | Private StyleCache reference counts and leak behavior have no direct oracle. |
| `setRowHeight` | Verified with enumerated gaps | Not every dimension-map/operation subphase cross-product is exercised; renderer/persistence/history effects excluded. |
| `setColumnWidth` | Verified with enumerated gaps | Same dimension-map cross-product and external effects remain outside the tested scope. |

PKG-15B directly adds one Journal/Snapshot multi-Worksheet graph rollback cut. The synchronized PKG-16 selection passed 22 suites / 294 tests. These results do not close global D2-11. Other mutation families, complete formula graph phases, private StyleCache counts, event/application boundaries, persistence/history/rendering, and every restoration/cleanup cut remain unresolved or outside scope.

## Formula compatibility alternatives

PKG-16C compares F1 (support mixed/absolute A1 tokens), F2 (preserve a restricted grammar with explicit rejection/error and dependency alignment), and F3 (versioned dialect behavior). Current evidence remains: plain `=E5+1` evaluates, dollar-marked forms produce `#NAME?` while registering literal E5 dependencies, and merged-member writes store unchanged text at the anchor without rebasing. No option is approved; formula/API owner decision and separate implementation authorization are required. D7-05 merged-read DTO is separate.

## Pivot integration migration readiness

PKG-16D maps the seven blocked suites individually. Six are compile-blocked by unavailable Workbook Pivot accessors/mutable-view assumptions; `pivot-formula-integration.test.ts` has 18 fixture-setup failures because it calls unsupported post-publication `addSheet()`. No intended assertion ran in those setup cases. Standalone Pivot tests cover portions of component calculation, snapshot, query, and recovery behavior but do not prove Workbook-owned registration, refresh, or disposal.

The minimum owner-approved sequence is: initial-sheet source identity and registration/first publication; detached snapshot/status reads; invalidation through existing transactions; explicit refresh with last-good failure behavior; disposal preventing late publication; optional configuration/delete only if separately approved. D3-06 is required for stale formula expectations; detached Error representation requires a separate Error DTO decision. No registry/store accessor, mutable Worksheet escape, cast, or post-publication sheet API is approved.

## Verification and candidate reproducibility

- Runtime: Node 24.22.0, npm 11.19.1, TypeScript 6.0.3, Jest 30.5.2, ts-jest 29.4.15. Core dependency listing exited 0.
- PKG-16 bounded TS-first Core selection: **22 suites / 294 tests passed**, including seven-operation, formula/merge, standalone Pivot, resolver, event, and queue suites.
- Core typecheck passed. Focused-test hygiene found no focused markers.
- The PKG-15D full Core diagnostic remains the current full-run reference because PKG-16 changed no production/test inputs: 307 suites, 295 passed, 7 failed, 5 skipped; 7,338 tests passed, 18 unsupported fixture-setup failures, 173 skipped, 9 todo; no executed assertion failures. The seven blocked Pivot suites are unchanged.
- All 237 protected sidecar checks passed before and after the PKG-16 bounded Jest window, byte-identically; a final check also passed.
- `git diff --check` and the final PKG-16 Markdown whitespace/final-newline scan passed.
- No candidate was isolated or called clean-tree verified. Full Core was not rerun because no PKG-16 source/test change justified repeating the PKG-15 diagnostic.

Exact commands, raw outputs, and hashes are in PKG-16E and PKG-15D. Frozen registers, ledger dispositions, contracts, and historical baselines were not changed. The dirty worktree was preserved without reset, clean, restore, stage, commit, or merge.

## Authority, release gates, and blockers

PKG-16F preserves the existing governance state: Workbook/API, Worksheet/API, and D5 owners remain unverified/deferred; D0 remains proposed; D1–D7 remain pending. Formula syntax/origin, D2-11 global completeness, Workbook Pivot lifecycle, D3-06, Pivot Error representation, comment deletion, D5-01, D5-05, and D7-05 have no new approval or implementation authorization. Workbook-owned Pivot lifecycle, comment deletion, and Application forwarding remain unauthorized.

Remaining PKG-16 blockers are: (1) per-hunk production-source provenance and dependency mapping; (2) seven legacy Pivot integration suite blockers; (3) global D2-11 residuals, including StyleCache and graph subphase coverage; (4) required formula, Pivot, comment, and event owner decisions; and (5) the project-wide release acceptance process. No accepted-contract defect was reproduced by the PKG-16 bounded selection.

## Next bounded action

Project leadership must establish attributable decision owners and approved response channels, or record accountable dated deferrals. Engineering should then reconcile production source hunks against the existing package evidence before preparing candidate integration units. Contract owners can decide the PKG-16C formula alternatives and existing Pivot/comment/event questions; each selected contract change still needs its own bounded implementation authorization. Keep R1 acceptance **WITHHELD** until the technical and governance gates are reviewed together.
