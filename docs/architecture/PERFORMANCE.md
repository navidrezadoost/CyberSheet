# Performance Playbook

## Targets (MVP baseline)
- Scrolling: 60 FPS on 10k visible cells viewport on mid-tier laptops
- Initial render: < 50ms for 100x26 default grid on DPR=2
- Memory: O(visible) rendering allocations, O(non-empty) data storage

## Measurement methodology
- Use `performance.now()` and custom markers
- OffscreenCanvas where supported for text measurement warmup
- Micro-bench harness (to be added) under packages/renderer-canvas/bench

## Techniques
- Virtualization of rows/cols; only draw visible area
- Device-pixel snapping for crisp hairlines
- Text measurement cache keyed by font+string, LRU-bounded
- Batched fills/strokes; avoid state changes mid-batch
- Dirty rectangles on sheet events (future), full redraw as fallback

## Budgets
- Text measure per frame: <= 500 calls (prefer cached)
- Draw calls per frame: <= 2k operations
- GC pressure: avoid per-cell allocations inside loops
