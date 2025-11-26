import { mockCanvas } from '@cyber-sheet/test-utils';

// Ensure canvas and context exist
mockCanvas();

// Polyfill ResizeObserver for jsdom
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface Global {
      ResizeObserver: any;
    }
  }
}

if (typeof (globalThis as any).ResizeObserver === 'undefined') {
  (globalThis as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
