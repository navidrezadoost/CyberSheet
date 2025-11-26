# Roadmap & Acceptance Criteria

## Phase 1 (MVP)
- Core: Workbook/Worksheet, filters API, events
- Renderer: headers, grid, cell text, selection, scroll + DPR
- React: wrapper component
- Acceptance:
  - Render 100x26 in <50ms (DPR 2)
  - Smooth scroll at 60 FPS on mid-tier device
  - Basic filters hide rows as expected

## Phase 2 (Styles & UX)
- Styles: fills, borders, alignment, number formats
- Resizing: column/row resizing, selection expansion
- XLSX colors/styles import (adapter, no heavy deps)
- Acceptance:
  - Fills/borders pixel-accurate to Excel baseline
  - Number formats for common patterns (#,##0.00, %, date)
  - Resize interactions within 16ms response

## Phase 3 (Formulas & Editing)
- Formula engine subset, dependency graph, recalculation
- Autofilter UI affordances and sort
- Copy/paste and edit box
- Acceptance:
  - Recalc within 16ms for 5k dependent cells
  - Autofilter dropdown on headers with visual parity
