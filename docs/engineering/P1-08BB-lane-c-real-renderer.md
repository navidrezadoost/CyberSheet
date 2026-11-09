# P1-08BB Lane C — Real CanvasRenderer failure characterization

## Scope and provenance

This lane inspected the current `packages/renderer-canvas/src/CanvasRenderer.ts` and exercised its exported `CanvasRenderer` class directly. The source SHA-256 in this lane is `0ef737707bd12aa3e8c70d5b2026a0d9d1c9ded3801494ac22588b72d5f7e059`, matching the coordinator's main-tree source hash at lane start. No production source or renderer configuration was changed.

The renderer constructor obtains the 2D context before appending its canvas. It appends the canvas at line 546, then constructs a `ResizeObserver` via `observeResize()` at line 549, calls `resize()`, installs DOM listeners, optionally subscribes to the drawing layer, subscribes to Worksheet events, and finally redraws. `dispose()` disconnects an established observer, removes installed listeners and subscriptions, and removes the instance's canvas. If construction throws, JavaScript does not return an instance through which callers can invoke `dispose()`.

## Characterization

Added `packages/renderer-canvas/__tests__/renderer-failure-cleanup.p1-08bb.test.ts` using the actual renderer implementation. The existing jsdom setup supplies a 2D canvas context; the test then injects a deterministic platform failure by replacing the standard global `ResizeObserver` constructor to throw. This is after canvas attachment and before resize, listener installation, renderer-owned subscriptions, or the first paint. No production hook or constructor mock is used.

Observed results:

- When `getContext('2d')` returns `null`, the actual constructor throws before the canvas is appended; the container has no canvas.
- When `ResizeObserver` construction throws, the exception propagates and one canvas remains attached to the container. No canvas event listeners were installed before the throw.
- A subsequent actual renderer construction succeeds. It appends a second canvas and installs its listeners. Calling `dispose()` disconnects its observer, removes those listeners, and removes that retry's canvas. The canvas from the failed constructor remains attached.
- When a public `drawingLayer.on('changed', callback)` implementation throws, failure occurs later: the canvas has been attached and resized, the observer has been constructed and observed the container, and six canvas listeners plus window `mouseup` and document `visibilitychange` listeners have been installed. The exception propagates. The observer's `disconnect()` is not called; matching listener removals are not called; and `drawingLayer.off()` is not called. The Worksheet event subscription and first redraw occur after the throwing `on` call and therefore are not reached.

The test harness manually removes the listeners, disconnects the observed fake, and removes the failed canvas in `finally` so the failed construction does not contaminate later tests. That is test isolation, not application cleanup. The cases distinguish pre-attachment context failure, post-attachment/pre-listener ResizeObserver-construction failure, and post-listener drawing-layer-subscription failure. They directly show which resources are present at each injected throw point; they do not establish a specified cleanup contract or implement one. Browser painting and framework behavior are not covered.

## Verification and limits

Focused Jest result: 1 suite, 3/3 tests passed. The first trial intentionally asserted that disposal of the successful retry left the container empty; it failed because the original failed-attempt canvas remained. The final test records this outcome by identity and asserts that only the failed-attempt canvas remains. Core generated sidecars were temporarily isolated for each Jest invocation and restored byte-for-byte; with them present, Jest resolved an ESM `.js` sidecar in place of the TypeScript source and did not execute.

The renderer package `tsc --noEmit` check could not pass in this lane: its project reference expects `packages/core/dist/index.d.ts`, which is absent, and emitted TS6305 project-reference errors (with dependent implicit-any diagnostics). No build was run to manufacture that prerequisite. The focused test was type-transformed and executed by ts-jest. Existing ts-jest deprecation and TS151001 advisories were non-failing.

No production change, Workbook cleanup claim, framework state claim, or transaction/rollback claim is made. This lane's evidence is limited to the tested constructor order and the observable container/listener/observer state in jsdom.
