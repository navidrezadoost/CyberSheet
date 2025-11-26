import '@testing-library/jest-dom';

// Polyfill requestAnimationFrame for jsdom
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g: any = globalThis as any;
g.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(cb, 0) as unknown as number;
