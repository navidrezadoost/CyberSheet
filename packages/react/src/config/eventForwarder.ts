import type { EventBus } from '@cyber-sheet/core';

const FORWARDABLE_EVENTS = [
  'cell-value-change',
  'cell-formula-change',
  'cell-style-change',
  'cell-hover',
  'cell-hover-end',
  'cell-mousedown',
  'cell-dblclick',
  'selection-change',
  'scroll',
  'scroll-end',
  'comment-add',
  'comment-edit',
  'comment-delete',
  'command-execute',
  'command-undo',
  'command-redo',
] as const;

export function attachOnEventForwarder(
  eventBus: EventBus,
  onEvent: (event: string, payload: unknown) => void,
  eventFilter?: (event: string) => boolean,
): () => void {
  const unsubs = FORWARDABLE_EVENTS.map((eventName) =>
    eventBus.on(eventName, (payload) => {
      if (eventFilter && !eventFilter(eventName)) return;
      onEvent(eventName, payload);
    }),
  );

  return () => unsubs.forEach((unsub) => unsub());
}
