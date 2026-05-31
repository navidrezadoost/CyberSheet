import type { EventBus } from '@cyber-sheet/core';
import type { CanvasRenderer } from '../../renderer-canvas/src';

const RENDERER_BRIDGE_EVENTS = new Set(['selection-change', 'scroll', 'scroll-end']);
const registeredEventBuses = new WeakSet<EventBus>();

export function registerRendererLazyBridges(
  eventBus: EventBus,
  getRenderer: () => CanvasRenderer | null,
): void {
  if (registeredEventBuses.has(eventBus)) return;
  registeredEventBuses.add(eventBus);
  let selectionDispose: (() => void) | undefined;
  let scrollDispose: (() => void) | undefined;
  let scrollEndTimer: ReturnType<typeof setTimeout> | undefined;
  let scrollEmit: ((payload: unknown) => void) | null = null;
  let scrollEndEmit: ((payload: unknown) => void) | null = null;

  const ensureScrollWire = () => {
    if (scrollDispose || (!scrollEmit && !scrollEndEmit)) return;

    const renderer = getRenderer();
    if (!renderer?.onScrollChange) return;

    const subscription = renderer.onScrollChange(({ x, y }) => {
      const payload = { scrollTop: y, scrollLeft: x };
      scrollEmit?.(payload);
      if (scrollEndEmit) {
        if (scrollEndTimer) clearTimeout(scrollEndTimer);
        scrollEndTimer = setTimeout(() => scrollEndEmit?.(payload), 150);
      }
    });

    scrollDispose = () => {
      subscription.dispose();
      if (scrollEndTimer) {
        clearTimeout(scrollEndTimer);
        scrollEndTimer = undefined;
      }
    };
  };

  const releaseScrollWire = () => {
    if (scrollEmit || scrollEndEmit) return;
    scrollDispose?.();
    scrollDispose = undefined;
  };

  eventBus.registerBridge(
    'selection-change',
    (emit) => {
      const renderer = getRenderer();
      if (!renderer?.onSelectionChange) return;

      const subscription = renderer.onSelectionChange((ranges) => {
        const active = ranges[ranges.length - 1];
        emit({
          ranges,
          activeCell: active?.end ?? active?.start,
        });
      });

      selectionDispose = () => subscription.dispose();
    },
    () => {
      selectionDispose?.();
      selectionDispose = undefined;
    },
  );

  eventBus.registerBridge(
    'scroll',
    (emit) => {
      scrollEmit = emit;
      ensureScrollWire();
    },
    () => {
      scrollEmit = null;
      releaseScrollWire();
    },
  );

  eventBus.registerBridge(
    'scroll-end',
    (emit) => {
      scrollEndEmit = emit;
      ensureScrollWire();
    },
    () => {
      scrollEndEmit = null;
      releaseScrollWire();
    },
  );
}

export function reactivateRendererLazyBridges(eventBus: EventBus): void {
  for (const event of eventBus.getActiveBridgeEvents()) {
    if (RENDERER_BRIDGE_EVENTS.has(event)) {
      eventBus.reactivateBridge(event);
    }
  }
}
