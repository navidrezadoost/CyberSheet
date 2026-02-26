import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// Polyfill requestAnimationFrame for jsdom
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g: any = globalThis as any;
g.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(cb, 0) as unknown as number;

// Polyfill TextEncoder / TextDecoder — jsdom does not expose them as globals
// even though Node ≥ 11 has them in the `util` module.
if (typeof g.TextEncoder === 'undefined') g.TextEncoder = TextEncoder;
if (typeof g.TextDecoder === 'undefined') g.TextDecoder = TextDecoder;
