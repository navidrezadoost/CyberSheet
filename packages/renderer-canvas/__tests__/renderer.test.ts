import { mockCanvas } from '@cyber-sheet/test-utils';
import { Workbook, Worksheet } from '@cyber-sheet/core';
import { adoptWorksheetByWorkbook } from '../../core/src/worksheet';
import { StyleCache } from '../../core/src/StyleCache';
import { OwnerBackedWorkbookSheetView } from '../../core/src/WorkbookSheetView';
import { GETPIVOTDATA } from '../../core/src/functions/exotic/exotic-functions';
import { CanvasRenderer } from '../src/CanvasRenderer';
import type { CanvasRendererOptions, FormulaWorkerBridge } from '../src/CanvasRenderer';

describe('CanvasRenderer', () => {
  beforeAll(() => {
    mockCanvas();
  });

  function setViewport(container: HTMLElement, width = 1000, height = 600) {
    Object.defineProperty(container, 'clientWidth', { value: width, configurable: true });
    Object.defineProperty(container, 'clientHeight', { value: height, configurable: true });
  }

  it('creates renderer instance without crashing', () => {
    const container = document.createElement('div');
    const sheet = new Worksheet('Sheet1', 100, 26);
    const renderer = new CanvasRenderer(container, sheet, { debug: false });
    expect(renderer).toBeTruthy();
  });

  it('revokes a retained filter callback after the renderer worksheet is adopted', () => {
    const container = document.createElement('div');
    const worksheet = new Worksheet('RetainedRenderer', 4, 4);
    let filterRequest: Parameters<NonNullable<CanvasRendererOptions['onRequestColumnFilterMenu']>>[0] | undefined;
    const renderer = new CanvasRenderer(container, worksheet, {
      debug: false,
      onRequestColumnFilterMenu: (info) => { filterRequest = info; },
    });
    const internals = renderer as any;
    const canvas = internals.canvas as HTMLCanvasElement;
    canvas.getBoundingClientRect = () => ({
      left: 0, top: 0, right: 1000, bottom: 600, width: 1000, height: 600, x: 0, y: 0, toJSON: () => ({}),
    } as DOMRect);
    jest.spyOn(internals, 'hitTest').mockReturnValue({ type: 'header-col', col: 1 });
    const events: unknown[] = [];
    worksheet.on((event) => events.push(event));

    internals.handleContextMenu(new MouseEvent('contextmenu'));
    expect(filterRequest).toBeDefined();
    const before = worksheet.getColumnFilter(1);
    adoptWorksheetByWorkbook(worksheet, 'renderer-owner');

    expect(() => filterRequest!.apply(['retained-value'])).toThrow(/unavailable/);
    expect(() => filterRequest!.clear()).toThrow(/unavailable/);
    expect(worksheet.getColumnFilter(1)).toEqual(before);
    expect(events).toEqual([]);
    renderer.dispose();
  });

  it('passes only a guarded retained sheet reference to render-layer callbacks', () => {
    const container = document.createElement('div');
    const worksheet = new Worksheet('RetainedLayer', 4, 4);
    const renderer = new CanvasRenderer(container, worksheet, { debug: false });
    const retainedGetterSheet = renderer.sheetReadonly;
    const internals = renderer as any;
    let capturedSheet: unknown;
    renderer.addLayer({
      id: 'retained-sheet-probe',
      stage: 'after',
      draw: (_ctx, api) => { capturedSheet = api.sheet; },
    });
    internals.drawLayers('after', internals.ctx, 100, 100);
    expect(capturedSheet).toBe(retainedGetterSheet);
    expect(capturedSheet).not.toBe(worksheet);
    expect(capturedSheet).toBeInstanceOf(Worksheet);
    expect(Reflect.get(renderer, 'sheet')).toBeUndefined();

    adoptWorksheetByWorkbook(worksheet, 'renderer-layer-owner');
    expect(() => (capturedSheet as Worksheet).setCellValue({ row: 1, col: 1 }, 'blocked')).toThrow(/unavailable/);
    expect(() => (retainedGetterSheet as Worksheet).setCellValue({ row: 1, col: 2 }, 'blocked')).toThrow(/unavailable/);
    expect(worksheet.getCellValue({ row: 1, col: 1 })).toBeNull();
    renderer.dispose();
  });

  it('keeps a retained sheetReadonly formula read aligned with the owner view after adoption', () => {
    const container = document.createElement('div');
    const worksheet = new Worksheet('RetainedFormulaRead', 4, 4);
    worksheet.setCellFormula({ row: 1, col: 1 }, '=1+1', 7);
    const renderer = new CanvasRenderer(container, worksheet, { debug: false });
    const retainedSheet = renderer.sheetReadonly;
    (retainedSheet as Worksheet).setCellValue({ row: 1, col: 2 }, 'standalone write remains available');
    expect(worksheet.getCellValue({ row: 1, col: 2 })).toBe('standalone write remains available');
    adoptWorksheetByWorkbook(worksheet, 'renderer-formula-read-owner');
    const ownerView = new OwnerBackedWorkbookSheetView(
      'renderer-formula-read-owner' as any,
      'renderer-formula-read-sheet' as any,
      () => worksheet,
    );

    expect(retainedSheet).not.toBe(worksheet);
    expect(retainedSheet).toBeInstanceOf(Worksheet);
    expect(Reflect.get(renderer, 'sheet')).toBeUndefined();
    expect(retainedSheet.getCellValue({ row: 1, col: 1 })).toBe(
      ownerView.getCellValue({ row: 1, col: 1 }),
    );
    expect(retainedSheet.getCell({ row: 1, col: 1 })?.value).toBe(
      ownerView.getCell({ row: 1, col: 1 })?.value,
    );
    let retainedIterationValue: unknown;
    (retainedSheet as Worksheet).forEachNonEmptyCell((_row, _col, cell: { formula?: string; value?: unknown }) => {
      if (cell.formula === '=1+1') retainedIterationValue = cell.value;
    });
    expect(retainedIterationValue).toBeNull();
    renderer.dispose();
  });

  it('blocks owner StyleCache access through retained renderer and raw worksheet handles', () => {
    const styleCache = new StyleCache();
    const ownerAccess = {
      internStyle: (style: any) => styleCache.intern(style),
      queryPivotDataAt: () => '#REF!' as const,
    };
    const worksheet = new Worksheet('CanonicalStyleAuthority', 4, 4, undefined, ownerAccess);
    const events: unknown[] = [];
    worksheet.on((event) => events.push(event));
    const cachedStyle = worksheet.canonicalStyle({ bold: true });
    const baseline = styleCache.getMetrics();
    expect(baseline.cacheSize).toBe(1);
    expect(baseline.missCount).toBe(1);
    expect(worksheet.canonicalStyle({ bold: true })).toBe(cachedStyle);
    expect(styleCache.getMetrics().hitCount).toBe(baseline.hitCount + 1);

    const renderer = new CanvasRenderer(document.createElement('div'), worksheet, { debug: false });
    const retainedRendererSheet = renderer.sheetReadonly as Worksheet;
    const retainedRawWorksheet = worksheet;
    Object.defineProperty(worksheet, 'isWorkbookOwned', { configurable: true, value: () => false });
    adoptWorksheetByWorkbook(worksheet, 'canonical-style-authority-owner');
    expect(worksheet.isWorkbookOwned()).toBe(false);
    expect(retainedRendererSheet.isWorkbookOwned()).toBe(true);

    const beforeOwnedCalls = styleCache.getMetrics();
    expect(() => retainedRendererSheet.canonicalStyle({ italic: true, fontSize: 17 })).toThrow(/unavailable/);
    expect(() => retainedRawWorksheet.canonicalStyle({ italic: true, fontSize: 17 })).toThrow(/unavailable/);
    expect(styleCache.getMetrics()).toEqual(beforeOwnedCalls);
    expect(worksheet.getCell({ row: 1, col: 1 })).toBeUndefined();
    expect(events).toEqual([]);
    renderer.dispose();
  });

  it('characterizes pivot query forwarding across Worksheet adoption', () => {
    const calls: unknown[][] = [];
    const worksheet = new Worksheet('PivotQueryForwarding', 10, 10, undefined, {
      internStyle: (style: any) => style,
      queryPivotDataAt: (address: any, sheetName: string, valueField: string, filters: any[]) => {
        calls.push([address, sheetName, valueField, filters]);
        return 42;
      },
    });
    const renderer = new CanvasRenderer(document.createElement('div'), worksheet, { debug: false });
    const retainedRendererSheet = renderer.sheetReadonly as Worksheet;
    const retainedRawWorksheet = worksheet;
    const address = { row: 3, col: 2 };
    const filters = [{ field: 'Region', value: 'West' }];
    adoptWorksheetByWorkbook(worksheet, 'pivot-query-forwarding-owner');

    expect(retainedRendererSheet.queryPivotDataAt(address, 'Revenue', filters)).toBe(42);
    expect(retainedRawWorksheet.queryPivotDataAt(address, 'Revenue', filters)).toBe(42);
    expect(calls).toEqual([
      [address, 'PivotQueryForwarding', 'Revenue', filters],
      [address, 'PivotQueryForwarding', 'Revenue', filters],
    ]);
    expect(retainedRendererSheet.getCell({ row: 1, col: 1 })).toBeUndefined();
    renderer.dispose();
  });

  it('routes GETPIVOTDATA through the real Workbook query service for an absent pivot', () => {
    const workbook = Workbook.create({ sheets: [{ name: 'RealPivotQuery' }] });
    const queryPivotDataAt = jest.spyOn(workbook, 'queryPivotDataAt');
    const worksheet = new Worksheet('RealPivotQuery', 10, 10, undefined, {
      internStyle: (style: any) => style,
      queryPivotDataAt: (address, sheetName, valueField, filters) =>
        workbook.queryPivotDataAt(address, sheetName, valueField, filters),
    });
    const formulaResult = GETPIVOTDATA(
      { worksheet, currentCell: { row: 10, col: 1 } },
      'Revenue',
      { row: 5, col: 2 } as any,
    );

    expect(formulaResult).toBeInstanceOf(Error);
    expect((formulaResult as Error).message).toBe('#REF!');
    expect(queryPivotDataAt).toHaveBeenCalledWith(
      { row: 5, col: 2 },
      'RealPivotQuery',
      'Revenue',
      [],
    );
  });

  it('characterizes onMutation subscriptions before and after adoption', () => {
    const worksheet = new Worksheet('MutationSubscriptionBoundary', 4, 4);
    const renderer = new CanvasRenderer(document.createElement('div'), worksheet, { debug: false });
    const retainedRendererSheet = renderer.sheetReadonly as Worksheet;
    const retainedRawWorksheet = worksheet;
    const beforeAdoptionEvents: unknown[] = [];
    const retainedSubscription = retainedRawWorksheet.onMutation((event) => beforeAdoptionEvents.push(event));
    const disposedEvents: unknown[] = [];
    const disposedBeforeAdoption = worksheet.onMutation((event) => disposedEvents.push(event));
    disposedBeforeAdoption.dispose();

    worksheet.setCellValue({ row: 1, col: 1 }, 'standalone');
    expect(beforeAdoptionEvents).toHaveLength(1);
    expect(disposedEvents).toEqual([]);
    expect(beforeAdoptionEvents[0]).toMatchObject({ type: 'cell-changed' });
    const eventBeforeAdoption = beforeAdoptionEvents[0];

    adoptWorksheetByWorkbook(worksheet, 'mutation-subscription-owner');
    const ownerView = new OwnerBackedWorkbookSheetView(
      'mutation-subscription-owner' as any,
      'mutation-subscription-sheet' as any,
      () => worksheet,
    );
    const afterAdoptionEvents: unknown[] = [];
    const publicOwnerEvents: unknown[] = [];
    const rawSubscription = retainedRawWorksheet.onMutation((event) => afterAdoptionEvents.push(event));
    const rendererSubscription = retainedRendererSheet.onMutation((event) => afterAdoptionEvents.push(event));
    ownerView.on((event) => publicOwnerEvents.push(event));

    expect(() => retainedRawWorksheet.setCellValue({ row: 1, col: 2 }, 'blocked')).toThrow(/unavailable/);
    expect(() => retainedRendererSheet.setCellValue({ row: 1, col: 3 }, 'blocked')).toThrow(/unavailable/);
    expect(() => retainedRawWorksheet.applyCalculatedValue({ row: 1, col: 4 }, 'internal-path-blocked')).toThrow(/unavailable/);
    expect(typeof (ownerView as any).onMutation).toBe('undefined');
    retainedRawWorksheet.emitStandaloneEvent({
      type: 'cell-changed',
      address: { row: 1, col: 1 },
      cell: { value: 'standalone-event-blocked' },
    });
    expect(worksheet.getCellValue({ row: 1, col: 2 })).toBeNull();
    expect(worksheet.getCellValue({ row: 1, col: 3 })).toBeNull();
    expect(worksheet.getCellValue({ row: 1, col: 4 })).toBeNull();
    expect(beforeAdoptionEvents).toHaveLength(1);
    expect(afterAdoptionEvents).toEqual([]);
    expect(publicOwnerEvents).toEqual([]);

    retainedSubscription.dispose();
    rawSubscription.dispose();
    rendererSubscription.dispose();
    expect(eventBeforeAdoption).toMatchObject({ type: 'cell-changed' });
    renderer.dispose();
  });

  it('masks formula cached values when constructed with an already adopted raw Worksheet', () => {
    const container = document.createElement('div');
    const worksheet = new Worksheet('AlreadyAdoptedRenderer', 4, 4);
    worksheet.setCellFormula({ row: 1, col: 1 }, '=1+1', 7);
    adoptWorksheetByWorkbook(worksheet, 'already-adopted-renderer-owner');

    const renderer = new CanvasRenderer(container, worksheet, { debug: false });
    expect(renderer.sheetReadonly.getCellValue({ row: 1, col: 1 })).toBeNull();
    expect(renderer.sheetReadonly.getCell({ row: 1, col: 1 })?.value).toBeNull();
    renderer.dispose();
  });

  it('fails closed on forwarded queries that could reveal cached formula values', () => {
    const container = document.createElement('div');
    const worksheet = new Worksheet('ForwardedFormulaQueries', 4, 4);
    worksheet.setCellFormula({ row: 1, col: 1 }, '=1+1', 7);
    expect(worksheet.getDistinctValues(1)).toContainEqual({ value: '7', count: 1 });
    expect([...worksheet.findIterator({ what: '7', lookIn: 'values' })]).toEqual([
      { row: 1, col: 1 },
    ]);
    expect(worksheet.getSpecialCells({ type: 'formulas', value: 'numbers' })).toEqual([
      { row: 1, col: 1 },
    ]);
    const renderer = new CanvasRenderer(container, worksheet, { debug: false });
    const retainedSheet = renderer.sheetReadonly as Worksheet;
    adoptWorksheetByWorkbook(worksheet, 'forwarded-formula-query-owner');
    const ownerView = new OwnerBackedWorkbookSheetView(
      'forwarded-formula-query-owner' as any,
      'forwarded-formula-query-sheet' as any,
      () => worksheet,
    );

    expect(ownerView.getCellValue({ row: 1, col: 1 })).toBeNull();
    expect(retainedSheet.getCellValue({ row: 1, col: 1 })).toBeNull();
    expect(() => retainedSheet.evaluateIfNeeded({ row: 1, col: 1 })).toThrow(/unavailable/);
    expect(() => retainedSheet.evaluateBatch([{ row: 1, col: 1 }])).toThrow(/unavailable/);
    expect(() => retainedSheet.getDistinctValues(1)).toThrow(/cached values/);
    expect(() => [...retainedSheet.findIterator({ what: '7', lookIn: 'values' })]).toThrow(/cached values/);
    expect(() => retainedSheet.getSpecialCells({ type: 'formulas', value: 'numbers' })).toThrow(/cached values/);
    expect(() => ownerView.findAll({ what: '7', lookIn: 'values' })).toThrow(/cached values/);
    expect(ownerView.findAll({ what: '1+1', lookIn: 'formulas' })).toEqual([
      { row: 1, col: 1 },
    ]);
    renderer.dispose();
  });

  it('fails closed when filtered-row membership depends on a formula cached value', () => {
    const container = document.createElement('div');
    const worksheet = new Worksheet('FormulaFilteredRows', 4, 4);
    worksheet.setCellFormula({ row: 1, col: 1 }, '=1+1', 7);
    worksheet.setCellValue({ row: 2, col: 1 }, 7);
    worksheet.setCellValue({ row: 1, col: 2 }, 'visible-only-distinct');
    worksheet.setColumnFilter(1, { type: 'equals', value: 7 });
    expect(worksheet.getVisibleRowIndices()).toEqual([1, 2]);
    expect(worksheet.getDistinctValues(2, true)).toContainEqual({
      value: 'visible-only-distinct', count: 1,
    });
    const renderer = new CanvasRenderer(container, worksheet, { debug: false });
    const retainedSheet = renderer.sheetReadonly as Worksheet;
    adoptWorksheetByWorkbook(worksheet, 'formula-filter-query-owner');
    const ownerView = new OwnerBackedWorkbookSheetView(
      'formula-filter-query-owner' as any,
      'formula-filter-query-sheet' as any,
      () => worksheet,
    );

    expect(() => retainedSheet.getVisibleRowIndices()).toThrow(/formula cached values/);
    expect(() => ownerView.getVisibleRowIndices()).toThrow(/formula cached values/);
    expect(() => retainedSheet.getDistinctValues(2, true)).toThrow(/formula cached values/);
    expect(retainedSheet.getVisibleRowIndicesExcluding(1)).toEqual([1, 2, 3, 4]);
    expect(ownerView.getVisibleRowIndicesExcluding(1)).toEqual([1, 2, 3, 4]);
    renderer.dispose();
  });

  it('does not let nested optionsReadonly image aliases change later rendering input', () => {
    const container = document.createElement('div');
    const renderer = new CanvasRenderer(container, new Worksheet('OptionsSnapshot', 4, 4), {
      debug: false,
      images: [{
        id: 'test-image',
        source: 'data:image/png;base64,original',
        position: { x: 10, y: 20 },
        size: { width: 30, height: 40 },
      }],
    });
    const exposedOptions = renderer.optionsReadonly as any;

    expect(exposedOptions).not.toBe((renderer as any).options);
    expect(exposedOptions.images).not.toBe((renderer as any).options.images);
    expect(Object.isFrozen(exposedOptions.images[0].position)).toBe(true);
    expect(() => { exposedOptions.images[0].source = 'data:image/png;base64,changed'; }).toThrow();
    expect(() => { exposedOptions.images[0].position.x = 999; }).toThrow();

    const configuredImage = (renderer as any).getConfiguredImages()[0];
    expect(configuredImage.source).toBe('data:image/png;base64,original');
    expect(configuredImage.position.x).toBe(10);
    renderer.dispose();
  });

  it('isolates RenderLayer options and unsubscribes the original drawing layer', () => {
    const container = document.createElement('div');
    const worksheet = new Worksheet('RenderLayerOptions', 4, 4);
    const makeDrawingLayer = () => ({
      getAllObjects: () => [],
      on: jest.fn(),
      off: jest.fn(),
    });
    const originalDrawingLayer = makeDrawingLayer();
    const replacementDrawingLayer = makeDrawingLayer();
    const configuredImage = {
      id: 'configured-image',
      source: 'data:image/png;base64,original',
      position: { x: 3, y: 4 },
      size: { width: 20, height: 30 },
    };
    const renderer = new CanvasRenderer(container, worksheet, {
      debug: false,
      images: [configuredImage],
      drawingLayer: originalDrawingLayer,
    });
    let callbackOptions: Required<CanvasRendererOptions> | undefined;
    renderer.addLayer({
      id: 'mutate-layer-options',
      stage: 'after',
      draw: (_ctx, api) => {
        callbackOptions = api.options;
      },
    });

    expect(callbackOptions).toBeDefined();
    expect(callbackOptions).not.toBe((renderer as any).options);
    const exposedOptions = callbackOptions as any;
    expect(() => { exposedOptions.images[0].source = 'data:image/png;base64,callback-change'; }).toThrow();
    expect(() => { exposedOptions.images[0].position.x = 900; }).toThrow();
    expect(() => { exposedOptions.drawingLayer = replacementDrawingLayer; }).toThrow();
    expect((renderer as any).options.images[0].source).toBe('data:image/png;base64,original');
    expect((renderer as any).options.images[0].position.x).toBe(3);
    expect((renderer as any).options.drawingLayer).toBe(originalDrawingLayer);

    renderer.dispose();
    const registeredListener = originalDrawingLayer.on.mock.calls[0]?.[1];
    expect(originalDrawingLayer.off).toHaveBeenCalledWith('changed', registeredListener);
    expect(replacementDrawingLayer.off).not.toHaveBeenCalled();
  });

  it('disposes its Worksheet event subscription and ignores later Worksheet events', () => {
    const container = document.createElement('div');
    const worksheet = new Worksheet('RendererSubscriptionDisposal', 4, 4);
    const onSpy = jest.spyOn(worksheet, 'on');
    const renderer = new CanvasRenderer(container, worksheet, { debug: false });
    const subscription = onSpy.mock.results[0]?.value as { dispose?: () => void } | undefined;
    const disposeSubscription = jest.spyOn(subscription!, 'dispose');
    const scheduleRedraw = jest.spyOn(renderer as any, 'scheduleRedraw');

    renderer.dispose();
    expect(disposeSubscription).toHaveBeenCalledTimes(1);
    worksheet.setCellValue({ row: 1, col: 1 }, 'after-dispose');
    expect(scheduleRedraw).not.toHaveBeenCalled();
  });

  it('does not schedule invalidation frames after disposal', () => {
    const container = document.createElement('div');
    const renderer = new CanvasRenderer(container, new Worksheet('DisposedInvalidation', 4, 4), { debug: false });
    renderer.dispose();
    const requestFrame = jest.spyOn(window, 'requestAnimationFrame');

    renderer.invalidateRect(0, 0, 10, 10);

    expect(requestFrame).not.toHaveBeenCalled();
    requestFrame.mockRestore();
  });

  it('cancels retained hover frames and ignores their callbacks after disposal', () => {
    const container = document.createElement('div');
    const renderer = new CanvasRenderer(container, new Worksheet('DisposedHover', 4, 4), { debug: false });
    const internals = renderer as any;
    const cellAt = jest.spyOn(internals, 'cellAt').mockReturnValue(null);
    let retainedCallback: FrameRequestCallback | undefined;
    const requestFrame = jest.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      retainedCallback = callback;
      return 812;
    });
    const cancelFrame = jest.spyOn(window, 'cancelAnimationFrame');

    internals.handleMouseMove({ clientX: 20, clientY: 30 } as MouseEvent);
    expect(retainedCallback).toBeDefined();
    renderer.dispose();
    expect(cancelFrame).toHaveBeenCalledWith(812);

    retainedCallback!(16);
    expect(cellAt).not.toHaveBeenCalled();
    requestFrame.mockRestore();
    cancelFrame.mockRestore();
  });

  it('detaches constructor-supplied image arrays and nested objects', () => {
    const container = document.createElement('div');
    const image = {
      id: 'caller-image',
      source: 'data:image/png;base64,initial',
      position: { x: 5, y: 6 },
      size: { width: 15, height: 16 },
    };
    const images = [image];
    const renderer = new CanvasRenderer(container, new Worksheet('ConstructorImageAlias', 4, 4), {
      debug: false,
      images,
    });

    image.source = 'data:image/png;base64,changed';
    image.position.x = 500;
    const renderedImage = (renderer as any).getConfiguredImages()[0];
    expect(renderedImage).not.toBe(image);
    expect(renderedImage.source).toBe('data:image/png;base64,initial');
    expect(renderedImage.position).not.toBe(image.position);
    expect(renderedImage.position.x).toBe(5);
    renderer.dispose();
  });

  it('preserves repeated image-provider calls while detaching each returned result', () => {
    const container = document.createElement('div');
    const image = {
      id: 'provider-image',
      source: 'data:image/png;base64,provider',
      position: { x: 7, y: 8 },
      size: { width: 17, height: 18 },
    };
    const provider = jest.fn(() => [image]);
    const renderer = new CanvasRenderer(container, new Worksheet('ImageProviderAlias', 4, 4), {
      debug: false,
      images: provider,
    });
    provider.mockClear();

    const supplied = (renderer as any).getConfiguredImages();
    expect(provider).toHaveBeenCalledTimes(1);
    expect(supplied[0]).not.toBe(image);
    expect(supplied[0].position).not.toBe(image.position);
    image.position.x = 700;
    expect(supplied[0].position.x).toBe(7);
    expect((renderer as any).getConfiguredImages()[0].position.x).toBe(700);
    expect(provider).toHaveBeenCalledTimes(2);
    renderer.dispose();
  });

  it('detaches nested regions passed to onRender callbacks', () => {
    const container = document.createElement('div');
    setViewport(container);
    const renderReports: Array<{ ms: number; regions: { x: number; y: number; w: number; h: number }[] }> = [];
    const renderer = new CanvasRenderer(container, new Worksheet('OnRenderRegionAlias', 4, 4), {
      debug: false,
      onRender: (info) => renderReports.push(info),
    });
    const internals = renderer as any;
    renderReports.length = 0;
    renderer.invalidateRect(60, 40, 20, 20);
    renderer.redraw();

    const report = renderReports[renderReports.length - 1];
    expect(report.regions.length).toBeGreaterThan(0);
    expect(report.regions[0]).not.toBe(internals.lastDirtyRects[0]);
    const originalX = internals.lastDirtyRects[0].x;
    report.regions[0].x = originalX + 500;
    expect(internals.lastDirtyRects[0].x).toBe(originalX);
    renderer.dispose();
  });

  it('keeps a caller-supplied drawing-layer alias detached when the worksheet is adopted', () => {
    const container = document.createElement('div');
    const worksheet = new Worksheet('RendererDrawingAlias', 4, 4);
    const standaloneLayer = worksheet.getDrawingLayer();
    standaloneLayer.addPicture({
      id: 'before-adoption', source: 'data:image/png;base64,AAAA', sourceType: 'dataUri',
      position: { x: 1, y: 2 }, size: { width: 10, height: 10 },
    });
    const renderer = new CanvasRenderer(container, worksheet, { debug: false, drawingLayer: standaloneLayer });
    expect(renderer.optionsReadonly.drawingLayer).toBe(standaloneLayer);

    adoptWorksheetByWorkbook(worksheet, 'renderer-drawing-owner');
    standaloneLayer.addPicture({
      id: 'after-adoption', source: 'data:image/png;base64,BBBB', sourceType: 'dataUri',
      position: { x: 3, y: 4 }, size: { width: 12, height: 12 },
    });
    const drawings = worksheet.extractSnapshot().drawings;
    expect(drawings?.objects.map((object) => object.id)).toEqual(['before-adoption']);
    expect(renderer.optionsReadonly.drawingLayer).toBe(standaloneLayer);
    renderer.dispose();
  });

  it('characterizes drawing-layer image geometry references in renderer-derived specs', () => {
    const container = document.createElement('div');
    const worksheet = new Worksheet('RendererDrawingGeometryAlias', 4, 4);
    const drawingLayer = worksheet.getDrawingLayer();
    drawingLayer.addPicture({
      id: 'geometry-alias',
      source: 'data:image/png;base64,AAAA',
      sourceType: 'dataUri',
      position: { x: 1, y: 2 },
      size: { width: 10, height: 12 },
    });
    const renderer = new CanvasRenderer(container, worksheet, { debug: false, drawingLayer });
    const internals = renderer as any;
    const drawing = drawingLayer.getObject('geometry-alias')!;
    const imageSpec = internals.getConfiguredImages().find((image: { id: string }) => image.id === 'geometry-alias');

    expect(imageSpec).toBeDefined();
    expect(imageSpec.position).toBe(drawing.position);
    expect(imageSpec.size).toBe(drawing.size);

    imageSpec.position.x = 900;
    imageSpec.size.width = 901;
    expect(drawingLayer.getObject('geometry-alias')?.position.x).toBe(900);
    expect(drawingLayer.getObject('geometry-alias')?.size.width).toBe(901);
    renderer.dispose();
  });

  it('does not give render plugins mutable aliases to cell values retained before adoption', () => {
    const container = document.createElement('div');
    setViewport(container);
    const worksheet = new Worksheet('PluginValueAlias', 4, 4);
    worksheet.setCellValue({ row: 1, col: 1 }, { runs: [{ text: 'original', style: { bold: true } }] });
    const retainedValues: unknown[] = [];
    const renderer = new CanvasRenderer(container, worksheet, { debug: false });
    renderer.addPlugin({
      id: 'retain-render-value',
      getCellBackground: ({ value }) => {
        if (typeof value === 'object' && value !== null && 'runs' in value) retainedValues.push(value);
        return undefined;
      },
    });
    renderer.redraw();
    expect(retainedValues.length).toBeGreaterThan(0);

    adoptWorksheetByWorkbook(worksheet, 'plugin-value-owner');
    const retained = retainedValues[retainedValues.length - 1] as { runs: Array<{ text: string }> };
    retained.runs[0].text = 'changed through plugin';

    expect((worksheet.getCellValue({ row: 1, col: 1 }) as { runs: Array<{ text: string }> }).runs[0].text).toBe('original');
    renderer.dispose();
  });

  it('characterizes unchecked function-valued cell input at the plugin boundary across adoption', () => {
    const container = document.createElement('div');
    setViewport(container);
    const worksheet = new Worksheet('FunctionPluginInput', 4, 4);
    const callerFunction = (() => {
      worksheet.setCellValue({ row: 1, col: 2 }, 'function write');
      return 'wrote';
    }) as unknown as import('@cyber-sheet/core').CellValue;
    worksheet.setCellValue({ row: 1, col: 1 }, callerFunction as any);
    const renderer = new CanvasRenderer(container, worksheet, { debug: false });
    let retainedPluginValue: unknown;
    renderer.addPlugin({
      id: 'observe-function-valued-input',
      getCellBackground: ({ value }) => {
        if (typeof value === 'function') retainedPluginValue = value;
        return undefined;
      },
    });

    renderer.redraw();
    expect(retainedPluginValue).toBe(callerFunction);
    const retainedBeforeAdoption = retainedPluginValue as () => string;
    adoptWorksheetByWorkbook(worksheet, 'function-plugin-owner');
    renderer.redraw();

    expect(retainedPluginValue).toBe(callerFunction);
    expect(retainedBeforeAdoption).toBe(callerFunction);
    expect(retainedBeforeAdoption).toThrow(/unavailable|owned/i);
    expect(worksheet.getCellValue({ row: 1, col: 2 })).toBeNull();
    renderer.dispose();
  });

  it('discards formula-worker results that resolve after worksheet adoption', async () => {
    const container = document.createElement('div');
    const worksheet = new Worksheet('LateWorkerResult', 4, 4);
    worksheet.setCellFormula({ row: 1, col: 1 }, '=1+1');
    Object.defineProperty(worksheet, 'isWorkbookOwned', { value: () => false, configurable: true });
    let resolveBatch!: (result: { values: Float64Array; evaluated: number; hasCycles: boolean }) => void;
    const worker: FormulaWorkerBridge & { evaluateBatch: jest.Mock } = {
      setCellValue: jest.fn().mockResolvedValue(undefined),
      setCellFormula: jest.fn().mockResolvedValue(undefined),
      evaluateBatch: jest.fn(() => new Promise<{ values: Float64Array; evaluated: number; hasCycles: boolean }>((resolve) => { resolveBatch = resolve; })),
      terminate: jest.fn(),
    };
    const renderer = new CanvasRenderer(container, worksheet, {
      debug: false,
      formulaWorkerThreshold: 1,
      formulaWorkerFactory: () => worker,
    });
    const internals = renderer as any;
    jest.spyOn(internals, 'getVisibleCellAddresses').mockReturnValue([{ row: 1, col: 1 }]);

    internals.evaluateVisibleFormulaCells();
    expect(worker.evaluateBatch).toHaveBeenCalledWith([{ row: 1, col: 1 }]);
    const valueBeforeAdoption = worksheet.getCellValue({ row: 1, col: 1 });
    adoptWorksheetByWorkbook(worksheet, 'late-worker-owner');
    resolveBatch({ values: new Float64Array([2]), evaluated: 1, hasCycles: false });
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(worksheet.getCellValue({ row: 1, col: 1 })).toBe(valueBeforeAdoption);
    renderer.dispose();
    expect(worker.terminate).toHaveBeenCalled();
  });

  it('does not run the formula fallback when a worker rejects after worksheet adoption', async () => {
    const container = document.createElement('div');
    const worksheet = new Worksheet('LateWorkerFailure', 4, 4);
    worksheet.setCellFormula({ row: 1, col: 1 }, '=1+1');
    Object.defineProperty(worksheet, 'isWorkbookOwned', { value: () => false, configurable: true });
    let rejectBatch!: (error: Error) => void;
    const worker: FormulaWorkerBridge & { evaluateBatch: jest.Mock } = {
      setCellValue: jest.fn().mockResolvedValue(undefined),
      setCellFormula: jest.fn().mockResolvedValue(undefined),
      evaluateBatch: jest.fn(() => new Promise<{ values: Float64Array; evaluated: number; hasCycles: boolean }>((_resolve, reject) => { rejectBatch = reject; })),
      terminate: jest.fn(),
    };
    const synchronousFallback = jest.fn();
    Object.defineProperty(worksheet, 'evaluateBatch', { value: synchronousFallback, configurable: true });
    const renderer = new CanvasRenderer(container, worksheet, {
      debug: false,
      formulaWorkerThreshold: 1,
      formulaWorkerFactory: () => worker,
    });
    const internals = renderer as any;
    jest.spyOn(internals, 'getVisibleCellAddresses').mockReturnValue([{ row: 1, col: 1 }]);
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    internals.evaluateVisibleFormulaCells();
    adoptWorksheetByWorkbook(worksheet, 'late-worker-failure-owner');
    rejectBatch(new Error('worker failed'));
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(synchronousFallback).not.toHaveBeenCalled();
    expect(worksheet.getCellValue({ row: 1, col: 1 })).toBeNull();
    renderer.dispose();
    expect(worker.terminate).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('does not start worker-backed or synchronous formula evaluation from redraw after adoption', () => {
    const workerContainer = document.createElement('div');
    const workerWorksheet = new Worksheet('AdoptedWorkerEntryGuard', 4, 4);
    const worker: FormulaWorkerBridge & { evaluateBatch: jest.Mock; setCellFormula: jest.Mock } = {
      setCellValue: jest.fn().mockResolvedValue(undefined),
      setCellFormula: jest.fn().mockResolvedValue(undefined),
      evaluateBatch: jest.fn().mockResolvedValue({ values: new Float64Array([2]), evaluated: 1, hasCycles: false }),
      terminate: jest.fn(),
    };
    const workerRenderer = new CanvasRenderer(workerContainer, workerWorksheet, {
      debug: false,
      formulaWorkerThreshold: 1,
      formulaWorker: worker,
    });
    workerWorksheet.setCellFormula({ row: 1, col: 1 }, '=1+1');
    const submittedCellSyncs = worker.setCellFormula.mock.calls.length;
    const workerInternals = workerRenderer as any;
    const visibleAddressDiscovery = jest.spyOn(workerInternals, 'getVisibleCellAddresses');
    adoptWorksheetByWorkbook(workerWorksheet, 'adopted-worker-entry-owner');

    workerRenderer.redraw();

    expect(visibleAddressDiscovery).not.toHaveBeenCalled();
    expect(worker.evaluateBatch).not.toHaveBeenCalled();
    expect(worker.setCellFormula).toHaveBeenCalledTimes(submittedCellSyncs);
    expect(workerWorksheet.getCellValue({ row: 1, col: 1 })).toBeNull();
    expect(workerWorksheet.isDirty({ row: 1, col: 1 })).toBe(true);
    workerRenderer.dispose();

    const syncContainer = document.createElement('div');
    const syncWorksheet = new Worksheet('AdoptedSyncEntryGuard', 4, 4);
    const syncRenderer = new CanvasRenderer(syncContainer, syncWorksheet, { debug: false });
    syncWorksheet.setCellFormula({ row: 1, col: 1 }, '=1+1');
    const synchronousEvaluation = jest.fn();
    Object.defineProperty(syncWorksheet, 'evaluateBatch', { value: synchronousEvaluation, configurable: true });
    const syncInternals = syncRenderer as any;
    const syncAddressDiscovery = jest.spyOn(syncInternals, 'getVisibleCellAddresses');
    adoptWorksheetByWorkbook(syncWorksheet, 'adopted-sync-entry-owner');

    syncRenderer.redraw();

    expect(syncAddressDiscovery).not.toHaveBeenCalled();
    expect(synchronousEvaluation).not.toHaveBeenCalled();
    expect(syncWorksheet.getCellValue({ row: 1, col: 1 })).toBeNull();
    expect(syncWorksheet.isDirty({ row: 1, col: 1 })).toBe(true);
    syncRenderer.dispose();
  });

  it('does not synchronize a retained raw worksheet to its formula worker after adoption', () => {
    const container = document.createElement('div');
    const worksheet = new Worksheet('AdoptedWorkerCellSync', 4, 4);
    const worker: FormulaWorkerBridge = {
      setCellValue: jest.fn().mockResolvedValue(undefined),
      setCellFormula: jest.fn().mockResolvedValue(undefined),
      evaluateBatch: jest.fn().mockResolvedValue({ values: new Float64Array(), evaluated: 0, hasCycles: false }),
      terminate: jest.fn(),
    };
    const renderer = new CanvasRenderer(container, worksheet, { debug: false, formulaWorker: worker });
    adoptWorksheetByWorkbook(worksheet, 'adopted-worker-cell-sync-owner');

    (renderer as any).syncFormulaWorkerCell({ row: 1, col: 1 }, { formula: '=1+1', value: null });

    expect(worker.setCellFormula).not.toHaveBeenCalled();
    expect(worker.setCellValue).not.toHaveBeenCalled();
    renderer.dispose();
  });

  it('does not hydrate a replacement formula worker from a retained raw worksheet after adoption', () => {
    const container = document.createElement('div');
    const worksheet = new Worksheet('AdoptedWorkerHydration', 4, 4);
    worksheet.setCellValue({ row: 1, col: 1 }, 'retained value');
    const createWorker = (): FormulaWorkerBridge => ({
      setCellValue: jest.fn().mockResolvedValue(undefined),
      setCellFormula: jest.fn().mockResolvedValue(undefined),
      evaluateBatch: jest.fn().mockResolvedValue({ values: new Float64Array(), evaluated: 0, hasCycles: false }),
      terminate: jest.fn(),
    });
    const initialWorker = createWorker();
    const replacementWorker = createWorker();
    const renderer = new CanvasRenderer(container, worksheet, { debug: false, formulaWorker: initialWorker });
    adoptWorksheetByWorkbook(worksheet, 'adopted-worker-hydration-owner');

    (renderer as any).replaceFormulaWorker(replacementWorker);

    expect(replacementWorker.setCellValue).not.toHaveBeenCalled();
    expect(replacementWorker.setCellFormula).not.toHaveBeenCalled();
    renderer.dispose();
  });

  it('blocks worker hydration and synchronization when an ownership-method shadow survives adoption', () => {
    const container = document.createElement('div');
    const worksheet = new Worksheet('ShadowedWorkerOwnership', 4, 4);
    worksheet.setCellValue({ row: 1, col: 1 }, 'recognizable owner value');
    worksheet.setCellFormula({ row: 1, col: 2 }, '=1+1', 73);
    Object.defineProperty(worksheet, 'isWorkbookOwned', {
      value: () => false,
      configurable: true,
    });
    const worker: FormulaWorkerBridge & { setCellValue: jest.Mock; setCellFormula: jest.Mock } = {
      setCellValue: jest.fn().mockResolvedValue(undefined),
      setCellFormula: jest.fn().mockResolvedValue(undefined),
      evaluateBatch: jest.fn().mockResolvedValue({ values: new Float64Array(), evaluated: 0, hasCycles: false }),
      terminate: jest.fn(),
    };
    const renderer = new CanvasRenderer(container, worksheet, { debug: false, formulaWorker: worker });
    worker.setCellValue.mockClear();
    worker.setCellFormula.mockClear();
    adoptWorksheetByWorkbook(worksheet, 'shadowed-worker-owner');

    expect(worksheet.isWorkbookOwned()).toBe(false);
    expect((renderer.sheetReadonly as Worksheet).isWorkbookOwned()).toBe(true);
    (renderer as any).hydrateFormulaWorker(worker);
    (renderer as any).syncFormulaWorkerCell(
      { row: 1, col: 1 },
      { value: 'synchronized owner value' },
    );

    expect(worker.setCellValue).not.toHaveBeenCalled();
    expect(worker.setCellFormula).not.toHaveBeenCalled();
    expect((renderer.sheetReadonly as Worksheet).isWorkbookOwned()).toBe(true);
    expect(() => worksheet.setCellValue({ row: 1, col: 1 }, 'blocked write')).toThrow(/workbook-owned|unavailable|owned/i);
    expect(() => worksheet.applyFormulaResults([{ row: 1, col: 2 }], new Float64Array([99]))).toThrow(/workbook-owned|unavailable|owned/i);
    expect(() => worksheet.evaluateBatch([{ row: 1, col: 2 }])).toThrow(/workbook-owned|unavailable|owned/i);
    expect(worksheet.getCellValue({ row: 1, col: 1 })).toBe('recognizable owner value');
    expect(renderer.sheetReadonly.getCellValue({ row: 1, col: 2 })).toBeNull();
    expect(worksheet.getCellValue({ row: 1, col: 2 })).toBe(73);
    renderer.dispose();
  });

  it('isolates renderer-owned result addresses from worker mutation of its input array', async () => {
    const container = document.createElement('div');
    const worksheet = new Worksheet('MutableWorkerAddresses', 4, 4);
    worksheet.setCellFormula({ row: 1, col: 1 }, '=1+1');
    worksheet.setCellFormula({ row: 1, col: 2 }, '=2+2');
    let resolveBatch!: (result: { values: Float64Array; evaluated: number; hasCycles: boolean }) => void;
    const worker: FormulaWorkerBridge & { evaluateBatch: jest.Mock } = {
      setCellValue: jest.fn().mockResolvedValue(undefined),
      setCellFormula: jest.fn().mockResolvedValue(undefined),
      evaluateBatch: jest.fn((addresses: Array<{ row: number; col: number }>) => {
        addresses.splice(0, addresses.length, { row: 1, col: 2 });
        return new Promise<{ values: Float64Array; evaluated: number; hasCycles: boolean }>((resolve) => {
          resolveBatch = resolve;
        });
      }),
      terminate: jest.fn(),
    };
    const renderer = new CanvasRenderer(container, worksheet, {
      debug: false,
      formulaWorkerThreshold: 1,
      formulaWorker: worker,
    });
    const internals = renderer as any;
    jest.spyOn(internals, 'getVisibleCellAddresses').mockReturnValue([{ row: 1, col: 1 }]);

    internals.evaluateVisibleFormulaCells();
    const workerAddresses = worker.evaluateBatch.mock.calls[0][0] as Array<{ row: number; col: number }>;
    expect(workerAddresses).toEqual([{ row: 1, col: 2 }]);
    resolveBatch({ values: new Float64Array([44]), evaluated: 1, hasCycles: false });
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(worksheet.getCellValue({ row: 1, col: 1 })).toBe(44);
    expect(worksheet.getCellValue({ row: 1, col: 2 })).toBeNull();
    expect(internals.workerPendingCells.has('1:1')).toBe(false);
    expect(internals.workerPendingCells.has('1:2')).toBe(false);
    renderer.dispose();
  });

  it('ignores a replaced worker and keeps replacement pending-cell ownership intact', async () => {
    const container = document.createElement('div');
    const worksheet = new Worksheet('ReplacedFormulaWorker', 4, 4);
    worksheet.setCellFormula({ row: 1, col: 1 }, '=1+1');
    let resolveOld!: (result: { values: Float64Array; evaluated: number; hasCycles: boolean }) => void;
    let resolveNew!: (result: { values: Float64Array; evaluated: number; hasCycles: boolean }) => void;
    const createWorker = (setResolver: (resolve: (result: { values: Float64Array; evaluated: number; hasCycles: boolean }) => void) => void) => ({
      setCellValue: jest.fn().mockResolvedValue(undefined),
      setCellFormula: jest.fn().mockResolvedValue(undefined),
      evaluateBatch: jest.fn(() => new Promise<{ values: Float64Array; evaluated: number; hasCycles: boolean }>((resolve) => { setResolver(resolve); })),
      terminate: jest.fn(),
    });
    const oldWorker = createWorker((resolve) => { resolveOld = resolve; });
    const newWorker = createWorker((resolve) => { resolveNew = resolve; });
    const renderer = new CanvasRenderer(container, worksheet, {
      debug: false,
      formulaWorkerThreshold: 1,
      formulaWorkerFactory: () => oldWorker,
    });
    const internals = renderer as any;
    jest.spyOn(internals, 'getVisibleCellAddresses').mockReturnValue([{ row: 1, col: 1 }]);
    internals.evaluateVisibleFormulaCells();
    expect(oldWorker.evaluateBatch).toHaveBeenCalledTimes(1);
    internals.replaceFormulaWorker(newWorker);
    internals.evaluateVisibleFormulaCells();
    expect(newWorker.evaluateBatch).toHaveBeenCalledTimes(1);

    resolveOld({ values: new Float64Array([99]), evaluated: 1, hasCycles: false });
    await Promise.resolve();
    await Promise.resolve();
    expect(worksheet.getCellValue({ row: 1, col: 1 })).toBeNull();
    expect(internals.workerPendingCells.get('1:1')).toBe(internals.formulaWorkerGeneration);

    resolveNew({ values: new Float64Array([2]), evaluated: 1, hasCycles: false });
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(worksheet.getCellValue({ row: 1, col: 1 })).toBe(2);
    expect(internals.workerPendingCells.has('1:1')).toBe(false);
    renderer.dispose();
    expect(oldWorker.terminate).toHaveBeenCalled();
    expect(newWorker.terminate).toHaveBeenCalled();
  });

  it('ignores formula-worker success and failure completions after renderer disposal', async () => {
    const container = document.createElement('div');
    const worksheet = new Worksheet('DisposedFormulaWorker', 4, 4);
    worksheet.setCellFormula({ row: 1, col: 1 }, '=1+1');
    let resolveBatch!: (value: { values: Float64Array; evaluated: number; hasCycles: boolean }) => void;
    let rejectBatch!: (error: Error) => void;
    const worker: FormulaWorkerBridge & { evaluateBatch: jest.Mock } = {
      setCellValue: jest.fn().mockResolvedValue(undefined),
      setCellFormula: jest.fn().mockResolvedValue(undefined),
      evaluateBatch: jest.fn(() => new Promise<{ values: Float64Array; evaluated: number; hasCycles: boolean }>((resolve, reject) => { resolveBatch = resolve; rejectBatch = reject; })),
      terminate: jest.fn(),
    };
    const renderer = new CanvasRenderer(container, worksheet, {
      debug: false,
      formulaWorkerThreshold: 1,
      formulaWorkerFactory: () => worker,
    });
    const internals = renderer as any;
    jest.spyOn(internals, 'getVisibleCellAddresses').mockReturnValue([{ row: 1, col: 1 }]);
    const evaluateFallback = jest.fn();
    Object.defineProperty(worksheet, 'evaluateBatch', { value: evaluateFallback, configurable: true });
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    internals.evaluateVisibleFormulaCells();
    renderer.dispose();
    resolveBatch({ values: new Float64Array([2]), evaluated: 1, hasCycles: false });
    await Promise.resolve();
    await Promise.resolve();
    expect(evaluateFallback).not.toHaveBeenCalled();
    expect(worksheet.getCellValue({ row: 1, col: 1 })).toBeNull();

    // A separate renderer covers the rejection path and confirms failure remains observable.
    const secondContainer = document.createElement('div');
    const secondWorksheet = new Worksheet('DisposedFormulaWorkerFailure', 4, 4);
    secondWorksheet.setCellFormula({ row: 1, col: 1 }, '=1+1');
    let rejectSecondBatch!: (error: Error) => void;
    const failedWorker: FormulaWorkerBridge & { evaluateBatch: jest.Mock } = {
      setCellValue: jest.fn().mockResolvedValue(undefined),
      setCellFormula: jest.fn().mockResolvedValue(undefined),
      evaluateBatch: jest.fn(() => new Promise<{ values: Float64Array; evaluated: number; hasCycles: boolean }>((_resolve, reject) => { rejectSecondBatch = reject; })),
      terminate: jest.fn(),
    };
    const secondRenderer = new CanvasRenderer(secondContainer, secondWorksheet, {
      debug: false,
      formulaWorkerThreshold: 1,
      formulaWorkerFactory: () => failedWorker,
    });
    const secondInternals = secondRenderer as any;
    jest.spyOn(secondInternals, 'getVisibleCellAddresses').mockReturnValue([{ row: 1, col: 1 }]);
    const secondFallback = jest.fn();
    Object.defineProperty(secondWorksheet, 'evaluateBatch', { value: secondFallback, configurable: true });
    secondInternals.evaluateVisibleFormulaCells();
    secondRenderer.dispose();
    rejectSecondBatch(new Error('terminated worker'));
    await Promise.resolve();
    await Promise.resolve();

    expect(secondFallback).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith('Formula worker batch failed.', expect.any(Error));
    expect(secondWorksheet.getCellValue({ row: 1, col: 1 })).toBeNull();
    expect(worker.terminate).toHaveBeenCalled();
    expect(failedWorker.terminate).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('resizes all columns when full sheet is selected', () => {
    const container = document.createElement('div');
    const sheet = new Worksheet('Sheet1', 100, 26);
    const renderer = new CanvasRenderer(container, sheet, { debug: false });
    const anyRenderer = renderer as any;

    const canvas = anyRenderer.canvas as HTMLCanvasElement;
    canvas.getBoundingClientRect = () => ({
      left: 0, top: 0, right: 1000, bottom: 600, width: 1000, height: 600, x: 0, y: 0, toJSON: () => ({})
    } as DOMRect);

    renderer.setSelections([{
      start: { row: 1, col: 1 },
      end: { row: sheet.rowCount, col: sheet.colCount },
    }]);

    const startWidth = sheet.getColumnWidth(1);
    const resizeHandleX = 48 + startWidth;

    anyRenderer.handleMouseDown(new MouseEvent('mousedown', { clientX: resizeHandleX, clientY: 10 }));
    anyRenderer.pendingMouseX = resizeHandleX + 30;
    anyRenderer.pendingMouseY = 10;
    anyRenderer.processHover();
    anyRenderer.handleMouseUp(new MouseEvent('mouseup', { clientX: resizeHandleX + 30, clientY: 10 }));

    expect(sheet.getColumnWidth(1)).toBe(startWidth + 30);
    expect(sheet.getColumnWidth(2)).toBe(startWidth + 30);
    expect(sheet.getColumnWidth(sheet.colCount)).toBe(startWidth + 30);
  });

  it('resizes all rows when full sheet is selected', () => {
    const container = document.createElement('div');
    const sheet = new Worksheet('Sheet1', 100, 26);
    const renderer = new CanvasRenderer(container, sheet, { debug: false });
    const anyRenderer = renderer as any;

    const canvas = anyRenderer.canvas as HTMLCanvasElement;
    canvas.getBoundingClientRect = () => ({
      left: 0, top: 0, right: 1000, bottom: 600, width: 1000, height: 600, x: 0, y: 0, toJSON: () => ({})
    } as DOMRect);

    renderer.setSelections([{
      start: { row: 1, col: 1 },
      end: { row: sheet.rowCount, col: sheet.colCount },
    }]);

    const startHeight = sheet.getRowHeight(1);
    const resizeHandleY = 24 + startHeight;

    anyRenderer.handleMouseDown(new MouseEvent('mousedown', { clientX: 10, clientY: resizeHandleY }));
    anyRenderer.pendingMouseX = 10;
    anyRenderer.pendingMouseY = resizeHandleY + 20;
    anyRenderer.processHover();
    anyRenderer.handleMouseUp(new MouseEvent('mouseup', { clientX: 10, clientY: resizeHandleY + 20 }));

    expect(sheet.getRowHeight(1)).toBe(startHeight + 20);
    expect(sheet.getRowHeight(2)).toBe(startHeight + 20);
    expect(sheet.getRowHeight(sheet.rowCount)).toBe(startHeight + 20);
  });

  it('maps pixels to cells with cached cumulative row and column offsets', () => {
    const container = document.createElement('div');
    const sheet = new Worksheet('Sheet1', 100, 26);
    const renderer = new CanvasRenderer(container, sheet, { debug: false });
    const anyRenderer = renderer as any;

    const canvas = anyRenderer.canvas as HTMLCanvasElement;
    canvas.getBoundingClientRect = () => ({
      left: 0, top: 0, right: 1000, bottom: 600, width: 1000, height: 600, x: 0, y: 0, toJSON: () => ({})
    } as DOMRect);

    sheet.setColumnWidth(1, 50);
    sheet.setColumnWidth(2, 120);
    sheet.setRowHeight(1, 20);
    sheet.setRowHeight(2, 40);
    renderer.setScroll(50, 20);

    expect(renderer.cellAt(58, 34)).toEqual({ row: 2, col: 2 });

    sheet.setColumnWidth(1, 80);
    renderer.setScroll(80, 20);

    expect(renderer.cellAt(58, 34)).toEqual({ row: 2, col: 2 });
    renderer.dispose();
  });

  it('skips hidden rows and columns in hit testing and range geometry', () => {
    const container = document.createElement('div');
    setViewport(container);
    const sheet = new Worksheet('Sheet1', 10, 10);
    sheet.setColumnWidth(1, 50);
    sheet.setColumnWidth(2, 120);
    sheet.setColumnWidth(3, 70);
    sheet.setRowHeight(1, 20);
    sheet.setRowHeight(2, 40);
    sheet.setRowHeight(3, 30);
    sheet.hideCol(2);
    sheet.hideRow(2);

    const renderer = new CanvasRenderer(container, sheet, { debug: false });
    const anyRenderer = renderer as any;
    const canvas = anyRenderer.canvas as HTMLCanvasElement;
    canvas.getBoundingClientRect = () => ({
      left: 0, top: 0, right: 1000, bottom: 600, width: 1000, height: 600, x: 0, y: 0, toJSON: () => ({})
    } as DOMRect);

    expect(renderer.cellAt(48 + 50 + 1, 24 + 20 + 1)).toEqual({ row: 3, col: 3 });
    expect(anyRenderer.rectForRange(1, 1, 3, 3)).toEqual({
      x: 48,
      y: 24,
      w: 120,
      h: 50,
    });

    renderer.dispose();
  });

  it('uses visible tracks for merged-cell rectangles', () => {
    const container = document.createElement('div');
    setViewport(container);
    const sheet = new Worksheet('Sheet1', 10, 10);
    sheet.setColumnWidth(1, 50);
    sheet.setColumnWidth(2, 120);
    sheet.setColumnWidth(3, 70);
    sheet.setRowHeight(1, 20);
    sheet.setRowHeight(2, 40);
    sheet.setRowHeight(3, 30);
    sheet.mergeCells({ start: { row: 1, col: 1 }, end: { row: 3, col: 3 } });
    sheet.hideCol(2);
    sheet.hideRow(2);

    const renderer = new CanvasRenderer(container, sheet, { debug: false });
    const rect = (renderer as any).rectForRange(1, 1, 3, 3);

    expect(rect).toEqual({
      x: 48,
      y: 24,
      w: 120,
      h: 50,
    });

    renderer.dispose();
  });

  it('caches canvas image loads and redraws after the image resolves', () => {
    const container = document.createElement('div');
    setViewport(container);
    const sheet = new Worksheet('Sheet1', 10, 10);
    const originalImage = (globalThis as any).Image;
    const created: any[] = [];
    class FakeImage {
      crossOrigin = '';
      complete = false;
      naturalWidth = 0;
      naturalHeight = 0;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      private _src = '';
      set src(value: string) { this._src = value; }
      get src() { return this._src; }
    }
    (globalThis as any).Image = function Image() {
      const image = new FakeImage();
      created.push(image);
      return image;
    };

    const renderer = new CanvasRenderer(container, sheet, {
      debug: false,
      images: [{
        source: 'data:image/png;base64,abc',
        anchor: { row: 1, col: 1 },
      }],
    });

    renderer.redraw();
    expect(created).toHaveLength(1);
    expect((renderer as any).imageCache.get('data:image/png;base64,abc').status).toBe('loading');

    created[0].complete = true;
    created[0].naturalWidth = 16;
    created[0].naturalHeight = 16;
    created[0].onload();
    renderer.redraw();

    expect(created).toHaveLength(1);
    expect((renderer as any).imageCache.get('data:image/png;base64,abc').status).toBe('loaded');

    renderer.dispose();
    (globalThis as any).Image = originalImage;
  });

  it('uses formula worker batches for large visible dirty sets', async () => {
    const container = document.createElement('div');
    setViewport(container);
    const sheet = new Worksheet('Sheet1', 100, 26);
    sheet.setCellValue({ row: 1, col: 1 }, 5);
    sheet.setCellFormula({ row: 1, col: 2 }, '=A1*2');
    sheet.registerDependencies({ row: 1, col: 2 }, [{ row: 1, col: 1 }]);

    const worker = {
      setCellValue: jest.fn().mockResolvedValue(undefined),
      setCellFormula: jest.fn().mockResolvedValue(undefined),
      evaluateBatch: jest.fn().mockResolvedValue({
        values: new Float64Array([10]),
        evaluated: 1,
        hasCycles: false,
      }),
      terminate: jest.fn(),
    };

    const renderer = new CanvasRenderer(container, sheet, {
      debug: false,
      formulaWorkerThreshold: 1,
      formulaWorkerFactory: () => worker,
    });

    (renderer as any).evaluateVisibleFormulaCells();
    await Promise.resolve();
    await Promise.resolve();

    expect(worker.evaluateBatch).toHaveBeenCalledWith([{ row: 1, col: 2 }]);
    expect(worker.setCellValue).toHaveBeenCalledWith(1, 1, 5);
    expect(worker.setCellFormula).toHaveBeenCalledWith(1, 2, '=A1*2', null);
    expect(worker.setCellValue.mock.invocationCallOrder[0]).toBeLessThan(worker.evaluateBatch.mock.invocationCallOrder[0]);
    expect(worker.setCellFormula.mock.invocationCallOrder[0]).toBeLessThan(worker.evaluateBatch.mock.invocationCallOrder[0]);
    expect(sheet.getCellValue({ row: 1, col: 2 })).toBe(10);

    renderer.dispose();
    expect(worker.terminate).toHaveBeenCalled();
  });
});
