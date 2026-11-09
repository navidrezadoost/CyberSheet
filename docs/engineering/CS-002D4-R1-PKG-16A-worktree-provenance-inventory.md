# CS-002D4-R1 PKG-16A — Worktree provenance inventory

**Starting HEAD:** `88b09634f17f3b39d88a88c5428f76b426459a2b`
**Status snapshot:** 652 individual paths from `git status --porcelain=v1 --untracked-files=all`; the IDE's earlier collapsed status count was 643.
**Captured evidence:** `CS-002D4-R1-PKG-16A-starting-status.txt` and `CS-002D4-R1-PKG-16A-change-inventory.tsv`.
**Inventory SHA-256:** `f250b42132c1993686634be38a6b759830f4588a300ebed2074e670299396402`.

## Method and limits

The path list was captured before adding the PKG-16A reports. The tab-separated inventory contains one row per changed/untracked path and records porcelain status, path type, a file-category estimate, filename-only package hints, provenance confidence, membership in the 237-entry protected sidecar manifest, an invariant/test-linkage assessment, independent-reviewability, and a dependency assessment. The raw status snapshot is the reproducible path/status source.

Filename or timestamp labels are not treated as provenance. Except for the PKG-15 artifacts already documented at PKG-15R and explicitly attributable to that bounded package, the exact source-hunk origin and authorizing package are unconfirmed unless a package report independently establishes the link. Most pre-existing modified Core/React/renderer source changes cannot be mapped to a single package from status alone. The TSV deliberately marks these rows for source-hunk-to-report reconciliation rather than guessing.

## Inventory summary

| Category | Paths | Assessment |
| --- | ---: | --- |
| Documentation | 232 | Historical reports, decision records, templates, and package documentation; individually inspectable, but not source provenance by themselves. |
| Raw evidence | 158 | Logs, manifests, JSON/TSV outputs, and verification captures; preserve as evidence and map to their report/test. |
| Tests | 155 | Existing and package-specific tests; link each assertion to its approved invariant and production source before assembling an implementation unit. |
| Production source | 52 | Modified tracked Core, React, renderer, XLSX, and test-utils source, plus two untracked Core transaction infrastructure files. Most exact package provenance is unknown at this snapshot. |
| Test/config/package infrastructure | 19 | Package metadata, Jest configs/resolver, Vite config, and test utilities; cross-package test-resolution dependency. |
| Generated/source-sidecar candidates | 27 | The currently dirty generated Core source-sidecar paths; all 27 are present in the protected 237-entry manifest. Preserve them byte-for-byte. |
| Other/examples/build artifacts | 9 | Examples, README, Playwright output/config, and test-results artifacts; not presumed part of a Core implementation unit. |
| **Total** | **652** | **105 modified, 2 deleted, 545 untracked.** |

The 27 sidecar candidates are a subset of the 237 protected manifest paths, not 27 extra unprotected files. The 237-entry manifest SHA-256 is `a6b89cdc3ccd8bfc8c054e5fafcb4dc84ed9ba1347eb2597a3e7bef938969b6c`; PKG-16 verification separately rechecks every entry around Jest windows.

At close, the full status comparison found the same 652 starting paths with identical status and no missing paths; 26 new paths were added for PKG-16 reports, inventories, commands, and verification outputs. HEAD remained unchanged. The exact comparison and new-path list are in `CS-002D4-R1-PKG-16A-worktree-integrity.txt`.

## Known provenance and unresolved paths

- PKG-15A/B/C/D/E/R documents, raw run outputs, and the two PKG-15 regression tests have direct package references in the just-completed PKG-15 reports. PKG-15 added characterization/recovery tests and reports only; it did not change production source.
- The PKG-16 inventory classifies all other paths by file type and evidence label, not presumed package authorship. The package token in a filename is only a search hint.
- `packages/core/src/workbook.ts`, `worksheet.ts`, `FormulaEngine.ts`, `DependencyGraph.ts`, `EventBus.ts`, and the Pivot component source family are shared dependencies across several historical workstreams. A file-level dirty marker does not identify which hunk belongs to which package.
- Existing deleted/untracked Jest config paths must be reviewed as a paired resolver/configuration change before integration; moving only one config can break test discovery or change module resolution.
- The untracked `playwright-report/` and `test-results/` outputs are treated as generated evidence/artifact candidates, not source changes; retain until their owner confirms archival/cleanup policy. No cleanup was performed.

## Review disposition

This inventory is path-complete for the captured worktree, but source-hunk provenance, exact test-to-hunk mapping, and dependency closure remain incomplete for most historical source edits. Therefore, the worktree is **not yet an integration-ready unit**. Use the companion PKG-16A dependency map to review coherent groups. Do not stage, reset, restore, merge, commit, or remove any item based on this inventory alone. Overall CS-002D4-R1 acceptance remains **WITHHELD**.
