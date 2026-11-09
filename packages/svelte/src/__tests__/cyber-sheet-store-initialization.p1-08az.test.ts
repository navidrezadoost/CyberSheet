import { Workbook } from '@cyber-sheet/core';
import { CanvasRenderer } from '@cyber-sheet/renderer-canvas';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCyberSheetStore, initializeCyberSheet } from '../cyberSheetStore';

vi.mock('@cyber-sheet/renderer-canvas', () => ({
  CanvasRenderer: vi.fn(),
}));

describe('P1-08AZ Svelte store initialization', () => {
  const container = document.createElement('div');
  const rendererInstance = { dispose: vi.fn() } as unknown as CanvasRenderer;

  beforeEach(() => {
    vi.mocked(CanvasRenderer).mockImplementation(
      class {
        constructor() {
          return rendererInstance;
        }
      } as never,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.mocked(CanvasRenderer).mockReset();
  });

  it('publishes a Workbook-issued empty sheet view and renderer for empty bootstrap', async () => {
    const createSpy = vi.spyOn(Workbook, 'create');
    const store = createCyberSheetStore();
    const observed: unknown[] = [];
    const unsubscribe = store.subscribe((state) => observed.push(state));

    const result = await initializeCyberSheet(container, store);

    expect(createSpy).toHaveBeenCalledOnce();
    expect(createSpy).toHaveBeenCalledWith({ sheets: [{ name: 'Sheet1' }] });
    expect(Workbook.isWorkbookIssuedSheetView(result.worksheet)).toBe(true);
    expect(result.worksheet?.name).toBe('Sheet1');
    expect(result.renderer).toBe(rendererInstance);
    expect(vi.mocked(CanvasRenderer)).toHaveBeenCalledOnce();
    expect(observed).toHaveLength(2); // writable's initial value, then initialized state
    expect(observed[0]).toMatchObject({ worksheet: null, renderer: null });
    expect(observed[1]).toBe(result);
    unsubscribe();
  });

  it('rejects non-empty initial data before Workbook, renderer, or initialized store publication', async () => {
    const createSpy = vi.spyOn(Workbook, 'create');
    const store = createCyberSheetStore();
    const observed: unknown[] = [];
    const unsubscribe = store.subscribe((state) => observed.push(state));

    await expect(
      initializeCyberSheet(container, store, { data: [['unsupported']] }),
    ).rejects.toThrow('Initial workbook cell data is unavailable until the R2 journal slice is authorized');

    expect(createSpy).not.toHaveBeenCalled();
    expect(vi.mocked(CanvasRenderer)).not.toHaveBeenCalled();
    expect(observed).toHaveLength(1); // only writable's initial null state
    expect(observed[0]).toMatchObject({ worksheet: null, renderer: null });
    unsubscribe();
  });
});
