import type { EventAPI } from '@cyber-sheet/core';

export function registerRendererLazyBridges(
  _eventBus: EventAPI,
  _getRenderer: () => unknown,
): void {
  // R1 removes public bridge-registration authority. R4 owns event publication.
}

export function reactivateRendererLazyBridges(_eventBus: EventAPI): void {
  // R1 has no external bridge registration to reactivate.
}
