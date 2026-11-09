import { vi } from 'vitest';

export const rendererConstructor: any = vi.fn();

export class CanvasRenderer {
  constructor(...args: unknown[]) {
    rendererConstructor(...args);
  }
}
