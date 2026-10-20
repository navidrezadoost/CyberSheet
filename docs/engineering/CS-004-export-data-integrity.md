# CS-004 — Export Data Integrity

**Priority:** P0 · **Status:** Open · **Owner:** React export / core I/O maintainers  
**Opened:** 2026-10-17 · **Source:** CS-000F senior engineering review

## Problem

`ExportPanel` implements CSV serialization inline and can silently lose or corrupt workbook data:

- It hard-caps reads at 100 rows and 26 columns, omitting populated cells outside A1:Z100.
- It calls `getCellValue` with zero-based row/column indices although the public `Address` contract in `packages/core/src/types.ts` defines one-based indices.
- The selected comma/semicolon/tab delimiter is ignored; fields are always joined with commas.
- Escaping is comma-specific rather than delimiter-specific. The newline check and row join use the literal `\\n` sequence rather than an actual line feed, so multiline records are not correctly represented.
- Export exceptions are caught without visible error feedback.

This is a data-loss defect and blocks release of the CSV export path.

## Required change

Move delimited-text generation into a reusable export service used by the UI. The service must iterate populated cells sparsely while preserving the sheet’s full used-data bounds and declared address convention. Keep serialization independent from React and surface failures to the user through the export flow.

Do not claim XLSX/CSV fidelity based only on the UI panel completing a download. Keep export semantics and error results explicit at the service boundary.

## Acceptance coverage

The regression suite must prove:

- Every populated cell through the used range is exported, including data beyond row 100 and column 26, without scanning the full worksheet rectangle.
- One-based address translation is correct at top-left, interior, and far-corner cells.
- Comma, semicolon, and tab delimiters are honored and delimiters inside values are quoted correctly.
- Embedded CR, LF, and CRLF line breaks are escaped according to the selected format; quotes are doubled; empty cells remain structurally represented.
- Unicode survives serialization; line endings are deterministic and actual line separators, not backslash text.
- Export failures are surfaced and do not report completion or trigger a misleading download.
- A sparse far-corner fixture has deterministic cell-visit/read counts to guard against rectangular scans.

## Reproduction

In the UI, choose CSV export for a sheet with data outside A1:Z100, then try a semicolon or tab delimiter. Inspect the downloaded bytes for omitted cells, delimiter behavior, and row separators. Source locations: [ExportPanel.tsx](/home/navidrezadoost/Documents/Github/cyber-sheet-excel/packages/react/src/components/backstage/panels/ExportPanel.tsx:150) and [types.ts](/home/navidrezadoost/Documents/Github/cyber-sheet-excel/packages/core/src/types.ts:1).

## Related release issue: Create Copy destination

`CreateCopyPanel` offers OneDrive, local, and SharePoint choices, but the create handler always invokes browser download; `selectedLocation` does not affect the operation. Until destination providers exist, the UI must expose only the supported local download or implement and verify each provider. The async callback also closes over `workbook` without listing it in its dependency array. This is tracked with CS-004 as a release blocker for destination misrepresentation, separate from CSV serialization acceptance.

Ribbon toggle-group behavior and BorderButton preset inference remain separate lower-priority UI tickets.
