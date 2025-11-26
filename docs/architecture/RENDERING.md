# Rendering Pipeline Details

1. Layout
   - Compute visible range from scroll offsets and row/col sizes
   - Map to device pixels (DPR) and snap grid lines to 0.5px offsets
2. Layers
   - Background -> Headers -> Grid -> Cell fills -> Borders -> Text -> Selection -> Overlays
3. Text
   - Font: Segoe UI/Arial 11px default; cache measure per string/font
   - Horizontal alignment: left/center/right; vertical middle baseline adjust
4. Selection
   - Rect from min/max row/col; stroke 2px highlight
5. Virtualization
   - Iterate until width/height overflow; break when out-of-view
6. Dirty region (future)
   - Track changed cells/rows; redraw minimal rects

Edge cases & notes
- Large numbers of thin columns: ensure headers don’t crowd; ellipsize
- RTL locales (future): invert x-axis ordering
- High-DPR screens: ensure crisp lines with pixel rounding
