import { Workbook } from '@cyber-sheet/core';
import { CanvasRenderer } from '@cyber-sheet/renderer-canvas';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createCyberSheetStore, initializeCyberSheet } from '../cyberSheetStore';

vi.mock('@cyber-sheet/renderer-canvas', () => ({ CanvasRenderer: vi.fn() }));

describe('P1-08BA Svelte renderer-construction failure', () => {
  const container = document.createElement('div');

  afterEach(() => {
    vi.restoreAllMocks();
    vi.mocked(CanvasRenderer).mockReset();
  });

  it('leaves the store initial after a renderer throw and permits a clean retry', async () => {
    const failure = new Error('renderer construction failed');
    const rendererInstance = { dispose: vi.fn() } as unknown as CanvasRenderer;
    const createWorkbook = vi.spyOn(Workbook, 'create');
    const store = createCyberSheetStore();
    const observed: unknown[] = [];
    const unsubscribe = store.subscribe((state) => observed.push(state));

    vi.mocked(CanvasRenderer).mockImplementationOnce(
      class {
        constructor() {
          throw failure;
        }
      } as never,
    );

    await expect(initializeCyberSheet(container, store)).rejects.toBe(failure);

    expect(createWorkbook).toHaveBeenCalledOnce();
    expect(vi.mocked(CanvasRenderer)).toHaveBeenCalledOnce();
    expect(observed).toHaveLength(1);
    expect(observed[0]).toMatchObject({ worksheet: null, renderer: null });

    vi.mocked(CanvasRenderer).mockImplementationOnce(
      class {
        constructor() {
          return rendererInstance;
        }
      } as never,
    );

    const state = await initializeCyberSheet(container, store);

    expect(createWorkbook).toHaveBeenCalledTimes(2);
    expect(vi.mocked(CanvasRenderer)).toHaveBeenCalledTimes(2);
    expect(Workbook.isWorkbookIssuedSheetView(state.worksheet)).toBe(true);
    expect(state.renderer).toBe(rendererInstance);
    expect(observed).toHaveLength(2);
    expect(observed[1]).toBe(state);

    unsubscribe();
    createWorkbook.mockRestore();
  });
});
