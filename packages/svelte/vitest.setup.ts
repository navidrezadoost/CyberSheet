import { vi } from 'vitest';

// Keep the existing Jest-authored suite intact while using Vitest's supported
// Svelte 5 ESM transform. The used jest.fn/spyOn/mockClear APIs map to vi.
Object.defineProperty(globalThis, 'jest', { configurable: true, value: vi });

// jsdom has no layout engine; browsers provide this API and focus assertions
// verify keyboard navigation independently of scroll geometry.
if (!HTMLElement.prototype.scrollIntoView) {
  HTMLElement.prototype.scrollIntoView = function scrollIntoView() {};
}
