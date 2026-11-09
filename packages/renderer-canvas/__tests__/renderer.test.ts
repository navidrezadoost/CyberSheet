/// <reference types="jest" />
import { mockCanvas } from '@cyber-sheet/test-utils';
import { Workbook, Worksheet } from '@cyber-sheet/core';
import { adoptWorksheetByWorkbook as adoptWorksheetByWorkbookFromSource } from '../../core/src/worksheet';
import type { Worksheet as SourceWorksheet } from '../../core/src/worksheet';
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

  // TypeScript resolves the package-root Worksheet from Core dist declarations,
  // while this internal adoption helper is imported from Core source. Jest maps
  // both to the same runtime implementation; bridge only that nominal type seam.
  function adoptWorksheetForTest(worksheet: Worksheet, workbookId: string) {
    adoptWorksheetByWorkbookFromSource(
      worksheet as unknown as Parameters<typeof adoptWorksheetByWorkbookFromSource>[0],
      workbookId,
    );
  }

  function sourceWorksheetForTest(worksheet: Worksheet): SourceWorksheet {
    return worksheet as unknown as SourceWorksheet;
  }

  function beginPointerResize(
    renderer: CanvasRenderer,
    worksheet: Worksheet,
    axis: 'col' | 'row',
    applyToAll: boolean,
  ) {
    const internals = renderer as any;
    const canvas = internals.canvas as HTMLCanvasElement;
    canvas.getBoundingClientRect = () => ({
      left: 0, top: 0, right: 1000, bottom: 600, width: 1000, height: 600,
      x: 0, y: 0, toJSON: () => ({}),
    } as DOMRect);
    renderer.setSelections([applyToAll
      ? {
          start: { row: 1, col: 1 },
          end: { row: worksheet.rowCount, col: worksheet.colCount },
        }
      : { start: { row: 1, col: 1 }, end: { row: 1, col: 1 } },
    ]);

    const startSize = axis === 'col'
      ? worksheet.getColumnWidth(1)
      : worksheet.getRowHeight(1);
    const startPos = axis === 'col' ? 48 + startSize : 24 + startSize;
    const startX = axis === 'col' ? startPos : 10;
    const startY = axis === 'row' ? startPos : 10;

    // Drive the actual hover and mouse-down handlers at the resize boundary.
    internals.pendingMouseX = startX;
    internals.pendingMouseY = startY;
    internals.processHover();
    internals.handleMouseDown(new MouseEvent('mousedown', {
      clientX: startX,
      clientY: startY,
    }));

    return { internals, canvas, startSize, startPos, startX, startY };
  }

  function movePointerResize(
    fixture: ReturnType<typeof beginPointerResize>,
    axis: 'col' | 'row',
    delta: number,
  ) {
    fixture.internals.pendingMouseX = axis === 'col' ? fixture.startX + delta : fixture.startX;
    fixture.internals.pendingMouseY = axis === 'row' ? fixture.startY + delta : fixture.startY;
    fixture.internals.processHover();
  }

  function runDirtyPreflightAdoptionProbe(mode: 'worker' | 'sync' | 'getCell' | 'standalone') {
    let observed: Record<string, unknown> | undefined;

    // Load CanvasRenderer after installing the prototype probes. Its observation
    // handle captures Worksheet.prototype.getCell at module initialization, so
    // this proves the instrumentation sees the actual frozen source call.
    jest.isolateModules(() => {
      const { Worksheet: ProbeWorksheet } = jest.requireActual<typeof import('@cyber-sheet/core')>('@cyber-sheet/core');
      const { adoptWorksheetByWorkbook } = jest.requireActual<typeof import('../../core/src/worksheet')>('../../core/src/worksheet');
      const trace: Array<Record<string, unknown>> = [];
      const originalIsDirty = ProbeWorksheet.prototype.isDirty;
      const originalGetCell = ProbeWorksheet.prototype.getCell;
      let worksheet: any;
      let armed = false;
      let adopted = false;
      let actualDirtyResults: boolean[] = [];

      (jest.spyOn(ProbeWorksheet.prototype as any, 'isDirty') as jest.Mock).mockImplementation(function (
        this: any,
        address: { row: number; col: number },
      ) {
        if (armed) {
          trace.push({ stage: 'isDirty', address: { ...address }, ownerAtEntry: adopted });
          if (!adopted && (mode === 'worker' || mode === 'sync')) {
            adoptWorksheetByWorkbook(
              worksheet as unknown as Parameters<typeof adoptWorksheetByWorkbook>[0],
              `h48-dirty-preflight-${mode}`,
            );
            adopted = true;
            trace.push({ stage: 'adopted-during-isDirty' });
          }
        }
        const dirty = originalIsDirty.call(this as never, address);
        if (armed) actualDirtyResults.push(dirty);
        return dirty;
      } as any);

      (jest.spyOn(ProbeWorksheet.prototype as any, 'getCell') as jest.Mock).mockImplementation(function (
        this: any,
        address: { row: number; col: number },
      ) {
        if (armed) trace.push({ stage: 'getCell', address: { ...address }, ownerAtEntry: adopted });
        const cell = originalGetCell.call(this, address);
        if (armed && mode === 'getCell' && !adopted) {
          adoptWorksheetByWorkbook(
            worksheet as unknown as Parameters<typeof adoptWorksheetByWorkbook>[0],
            'h48-adoption-during-formula-discovery',
          );
          adopted = true;
          trace.push({ stage: 'adopted-during-getCell' });
        }
        return cell;
      } as any);

      worksheet = new ProbeWorksheet('DirtyPreflightReentrancy', 4, 4);
      const container = document.createElement('div');
      const worker = {
        setCellValue: jest.fn(async (row: number, col: number, value: unknown) => {
          trace.push({ stage: 'worker-set-value', row, col, value });
        }),
        setCellFormula: jest.fn(async (row: number, col: number, formula: string, value: unknown) => {
          trace.push({ stage: 'worker-set-formula', row, col, formula, value });
        }),
        evaluateBatch: jest.fn(async (addresses: Array<{ row: number; col: number }>) => {
          trace.push({ stage: 'worker-evaluate', addresses });
          return { values: new Float64Array(addresses.length), evaluated: addresses.length, hasCycles: false };
        }),
        terminate: jest.fn(() => trace.push({ stage: 'worker-terminate' })),
      };
      const factory = jest.fn(() => {
        trace.push({ stage: 'worker-factory' });
        return worker;
      });
      const { CanvasRenderer: ProbeCanvasRenderer } = jest.requireActual<typeof import('../src/CanvasRenderer')>('../src/CanvasRenderer');
      const renderer = new ProbeCanvasRenderer(container, worksheet, {
        debug: false,
        formulaWorkerThreshold: mode === 'worker' ? 1 : 3,
        ...(mode === 'worker' ? { formulaWorkerFactory: factory } : {}),
      });
      const internals = renderer as any;
      const addresses = [{ row: 1, col: 1 }, { row: 1, col: 2 }];
      jest.spyOn(internals, 'getVisibleCellAddresses').mockReturnValue(addresses);
      const syncSpy = jest.spyOn(internals, 'syncFormulaWorkerCell').mockImplementation(() => {});
      worksheet.setCellFormula(addresses[0], '=1+1');
      worksheet.setCellFormula(addresses[1], '=2+2');
      worksheet.registerDependencies(addresses[0], []);
      worksheet.registerDependencies(addresses[1], []);
      syncSpy.mockRestore();

      const originalEvaluateBatch = worksheet.evaluateBatch.bind(worksheet);
      const synchronousEvaluation = jest.fn((formulaAddresses: Array<{ row: number; col: number }>) => {
        trace.push({ stage: 'sync-evaluate', addresses: formulaAddresses });
        return originalEvaluateBatch(formulaAddresses);
      });
      Object.defineProperty(worksheet, 'evaluateBatch', {
        value: synchronousEvaluation,
        configurable: true,
      });

      trace.length = 0;
      actualDirtyResults = [];
      armed = true;
      try {
        internals.evaluateVisibleFormulaCells();
        observed = {
          mode,
          trace: [...trace],
          actualDirtyResults: [...actualDirtyResults],
          adopted,
          factoryCalls: factory.mock.calls.length,
          hydrationValueCalls: worker.setCellValue.mock.calls.length,
          hydrationFormulaCalls: worker.setCellFormula.mock.calls.length,
          workerEvaluationCalls: worker.evaluateBatch.mock.calls.length,
          synchronousEvaluationCalls: synchronousEvaluation.mock.calls.length,
          ownerViewFormulaValues: adopted
            ? addresses.map((address: { row: number; col: number }) =>
                renderer.sheetReadonly.getCellValue(address),
              )
            : undefined,
        };
      } finally {
        renderer.dispose();
      }
    });

    if (!observed) throw new Error('Dirty-preflight probe did not execute');
    return observed;
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
    adoptWorksheetForTest(worksheet, 'renderer-owner');

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

    adoptWorksheetForTest(worksheet, 'renderer-layer-owner');
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
    adoptWorksheetForTest(worksheet, 'renderer-formula-read-owner');
    const ownerView = new OwnerBackedWorkbookSheetView(
      'renderer-formula-read-owner' as any,
      'renderer-formula-read-sheet' as any,
      () => sourceWorksheetForTest(worksheet),
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
    adoptWorksheetForTest(worksheet, 'canonical-style-authority-owner');
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
    adoptWorksheetForTest(worksheet, 'pivot-query-forwarding-owner');

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
      { worksheet: sourceWorksheetForTest(worksheet), currentCell: { row: 10, col: 1 } },
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

    adoptWorksheetForTest(worksheet, 'mutation-subscription-owner');
    const ownerView = new OwnerBackedWorkbookSheetView(
      'mutation-subscription-owner' as any,
      'mutation-subscription-sheet' as any,
      () => sourceWorksheetForTest(worksheet),
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
    adoptWorksheetForTest(worksheet, 'already-adopted-renderer-owner');

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
    adoptWorksheetForTest(worksheet, 'forwarded-formula-query-owner');
    const ownerView = new OwnerBackedWorkbookSheetView(
      'forwarded-formula-query-owner' as any,
      'forwarded-formula-query-sheet' as any,
      () => sourceWorksheetForTest(worksheet),
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

  it('keeps forwarded column visibility reads safe across Worksheet adoption', () => {
    const container = document.createElement('div');
    const worksheet = new Worksheet('ForwardedColumnVisibility', 4, 4);
    worksheet.setCellFormula({ row: 1, col: 1 }, '=40+2', 42);
    worksheet.hideCol(3);
    const renderer = new CanvasRenderer(container, worksheet, { debug: false });
    const retainedSheet = renderer.sheetReadonly;
    const standaloneContentSize = renderer.getContentSize();
    const events: unknown[] = [];
    const subscription = worksheet.on((event) => events.push(event));

    try {
      expect(retainedSheet.getVisibleColumnIndices()).toEqual([1, 2, 4]);
      expect(retainedSheet.isColHidden(3)).toBe(true);
      expect(retainedSheet.getCellValue({ row: 1, col: 1 })).toBe(42);

      adoptWorksheetForTest(worksheet, 'renderer-column-visibility-owner');

      expect(retainedSheet.getVisibleColumnIndices()).toEqual([1, 2, 4]);
      expect(retainedSheet.isColHidden(3)).toBe(true);
      expect(retainedSheet.getCellValue({ row: 1, col: 1 })).toBeNull();
      expect(renderer.getContentSize()).toEqual(standaloneContentSize);
      expect(() => (retainedSheet as Worksheet).setColumnWidth(1, 333)).toThrow(/unavailable/);
      expect(worksheet.getColumnWidth(1)).not.toBe(333);
      expect(events).toEqual([]);
    } finally {
      subscription.dispose();
      renderer.dispose();
    }
  });

  it('rebuilds visible-column layout after Worksheet adoption without exposing formula cache', () => {
    const container = document.createElement('div');
    setViewport(container, 320, 120);
    const worksheet = new Worksheet('VisibleColumnLayoutOwnership', 2, 3);
    const formulaAddress = { row: 1, col: 1 };
    const ordinaryAddress = { row: 1, col: 3 };
    const formulaSentinel = 'visible-column-layout-formula-cache-56381';
    const ordinaryValue = 'visible-column-layout-ordinary-value';
    worksheet.setCellFormula(formulaAddress, '=700+77', formulaSentinel);
    worksheet.setCellValue(ordinaryAddress, ordinaryValue);
    worksheet.setColumnWidth(1, 40);
    worksheet.setColumnWidth(2, 200);
    worksheet.setColumnWidth(3, 60);
    worksheet.hideCol(2);
    worksheet.completeScheduledRecalculation();

    const originalIsWorkbookOwned = Worksheet.prototype.isWorkbookOwned;
    const originalGetVisibleColumnIndices = worksheet.getVisibleColumnIndices.bind(worksheet);
    const queryOwnership: boolean[] = [];
    const getVisibleColumnIndices = jest.fn(function (this: Worksheet) {
      queryOwnership.push(originalIsWorkbookOwned.call(this));
      return originalGetVisibleColumnIndices();
    });
    Object.defineProperty(worksheet, 'getVisibleColumnIndices', {
      configurable: true,
      value: getVisibleColumnIndices,
    });

    const events: unknown[] = [];
    const subscription = worksheet.on((event) => events.push(event));
    const renderer = new CanvasRenderer(container, worksheet, { debug: false });
    const context = (renderer as any).ctx as CanvasRenderingContext2D;
    const fillText = jest.spyOn(context, 'fillText');

    try {
      const standaloneSize = renderer.getContentSize();
      expect(queryOwnership).toContain(false);
      expect(renderer.sheetReadonly.getVisibleColumnIndices()).toEqual([1, 3]);
      expect(standaloneSize.width).toBe(worksheet.getColumnWidth(1) + worksheet.getColumnWidth(3));
      expect(worksheet.getCellValue(formulaAddress)).toBe(formulaSentinel);

      queryOwnership.length = 0;
      adoptWorksheetForTest(worksheet, 'visible-column-layout-owner');
      events.length = 0;

      const adoptedSize = renderer.getContentSize();
      expect(queryOwnership).toContain(true);
      expect(renderer.sheetReadonly.getVisibleColumnIndices()).toEqual([1, 3]);
      expect(adoptedSize).toEqual(standaloneSize);
      expect(adoptedSize.width).toBe(worksheet.getColumnWidth(1) + worksheet.getColumnWidth(3));
      expect(renderer.sheetReadonly.getCellValue(formulaAddress)).toBeNull();
      expect(renderer.sheetReadonly.getCellValue(ordinaryAddress)).toBe(ordinaryValue);

      fillText.mockClear();
      renderer.redraw();
      const renderedText = fillText.mock.calls.map(([text]) => String(text));
      expect(renderedText).not.toContain(formulaSentinel);
      expect(renderedText).toContain(ordinaryValue);
      expect(events).toEqual([]);
    } finally {
      subscription.dispose();
      renderer.dispose();
      fillText.mockRestore();
      delete (worksheet as any).getVisibleColumnIndices;
    }
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
    adoptWorksheetForTest(worksheet, 'formula-filter-query-owner');
    const ownerView = new OwnerBackedWorkbookSheetView(
      'formula-filter-query-owner' as any,
      'formula-filter-query-sheet' as any,
      () => sourceWorksheetForTest(worksheet),
    );

    expect(() => retainedSheet.getVisibleRowIndices()).toThrow(/formula cached values/);
    expect(() => ownerView.getVisibleRowIndices()).toThrow(/formula cached values/);
    expect(() => retainedSheet.getDistinctValues(2, true)).toThrow(/formula cached values/);
    expect(retainedSheet.getVisibleRowIndicesExcluding(1)).toEqual([1, 2, 3, 4]);
    expect(ownerView.getVisibleRowIndicesExcluding(1)).toEqual([1, 2, 3, 4]);
    renderer.dispose();
  });

  it('does not reuse formula-dependent visible-row layout cached before Worksheet adoption', () => {
    const container = document.createElement('div');
    const worksheet = new Worksheet('CachedRowsBeforeAdoption', 4, 4);
    worksheet.setCellFormula({ row: 1, col: 1 }, '=1+1', 7);
    worksheet.setCellValue({ row: 2, col: 1 }, 7);
    worksheet.setColumnFilter(1, { type: 'equals', value: 7 });

    // Standalone filtering is supported and includes the cached formula result.
    expect(worksheet.getVisibleRowIndices()).toEqual([1, 2]);
    const renderer = new CanvasRenderer(container, worksheet, { debug: false });
    try {
      const standaloneContentSize = renderer.getContentSize();
      expect((renderer as any).visibleRowsCache).toEqual([1, 2]);

      adoptWorksheetForTest(worksheet, 'cached-rows-adoption-owner');
      expect(() => renderer.sheetReadonly.getVisibleRowIndices()).toThrow(/formula cached values/);

      // Layout geometry is observable through the public API. It must not keep
      // publishing dimensions derived from the pre-adoption filtered row set.
      expect(() => renderer.getContentSize()).toThrow(/formula cached values/);
      expect(standaloneContentSize.height).toBeGreaterThan(0);
    } finally {
      renderer.dispose();
    }
  });

  it('characterizes column auto-size after Worksheet adoption without partial Worksheet writes', () => {
    const standalone = new Worksheet('StandaloneColumnAutoSize', 2, 1);
    standalone.setCellFormula({ row: 1, col: 1 }, '=40+2', 'column-formula-cache-sentinel');
    standalone.setCellValue({ row: 2, col: 1 }, 'standalone-column-content-long-enough-to-expand');
    const standaloneRenderer = new CanvasRenderer(document.createElement('div'), standalone, { debug: false });
    const initialStandaloneWidth = standalone.getColumnWidth(1);
    const standaloneCtx = (standaloneRenderer as any).ctx as CanvasRenderingContext2D;
    const standaloneSave = jest.spyOn(standaloneCtx, 'save');
    const standaloneRestore = jest.spyOn(standaloneCtx, 'restore');
    try {
      expect(() => (standaloneRenderer as any).autoSizeColumn(1)).not.toThrow();
      expect(standalone.getColumnWidth(1)).toBeGreaterThan(initialStandaloneWidth);
      expect(standaloneSave).toHaveBeenCalledTimes(1);
      expect(standaloneRestore).toHaveBeenCalledTimes(1);
      expect(standaloneRestore.mock.invocationCallOrder[0]).toBeGreaterThan(standaloneSave.mock.invocationCallOrder[0]);
    } finally {
      standaloneRenderer.dispose();
    }

    const worksheet = new Worksheet('OwnedColumnAutoSize', 2, 1);
    worksheet.setCellFormula({ row: 1, col: 1 }, '=40+2', 'column-formula-cache-sentinel');
    worksheet.setCellValue({ row: 2, col: 1 }, 'owner-column-content-long-enough-to-measure');
    const renderer = new CanvasRenderer(document.createElement('div'), worksheet, { debug: false });
    const ctx = (renderer as any).ctx as CanvasRenderingContext2D;
    const save = jest.spyOn(ctx, 'save');
    const restore = jest.spyOn(ctx, 'restore');
    const measureText = jest.spyOn(ctx, 'measureText');
    const sourceEvents: unknown[] = [];
    const subscription = worksheet.on((event) => sourceEvents.push(event));
    const initialWidth = worksheet.getColumnWidth(1);
    adoptWorksheetForTest(worksheet, 'owned-column-auto-size');

    try {
      expect(() => (renderer as any).autoSizeColumn(1)).toThrow(/unavailable/);
      expect(measureText.mock.calls.map(([text]) => text)).toContain('owner-column-content-long-enough-to-measure');
      expect(measureText.mock.calls.map(([text]) => text)).not.toContain('column-formula-cache-sentinel');
      expect(worksheet.getColumnWidth(1)).toBe(initialWidth);
      expect(sourceEvents).toEqual([]);
      expect(save).toHaveBeenCalledTimes(1);
      expect(restore).toHaveBeenCalledTimes(1);
      expect(restore.mock.invocationCallOrder[0]).toBeGreaterThan(save.mock.invocationCallOrder[0]);
    } finally {
      subscription.dispose();
      renderer.dispose();
    }
  });

  it('characterizes row auto-size after Worksheet adoption without partial Worksheet writes', () => {
    const standalone = new Worksheet('StandaloneRowAutoSize', 1, 2);
    standalone.setCellFormula({ row: 1, col: 1 }, '=40+2', 'row-formula-cache-sentinel');
    standalone.setCellValue({ row: 1, col: 2 }, 'standalone-row-content-long-enough-to-wrap');
    const standaloneRenderer = new CanvasRenderer(document.createElement('div'), standalone, { debug: false });
    const initialStandaloneHeight = standalone.getRowHeight(1);
    const standaloneCtx = (standaloneRenderer as any).ctx as CanvasRenderingContext2D;
    const standaloneSave = jest.spyOn(standaloneCtx, 'save');
    const standaloneRestore = jest.spyOn(standaloneCtx, 'restore');
    try {
      expect(() => (standaloneRenderer as any).autoSizeRow(1)).not.toThrow();
      expect(standalone.getRowHeight(1)).toBeGreaterThan(initialStandaloneHeight);
      expect(standaloneSave).toHaveBeenCalledTimes(1);
      expect(standaloneRestore).toHaveBeenCalledTimes(1);
      expect(standaloneRestore.mock.invocationCallOrder[0]).toBeGreaterThan(standaloneSave.mock.invocationCallOrder[0]);
    } finally {
      standaloneRenderer.dispose();
    }

    const worksheet = new Worksheet('OwnedRowAutoSize', 1, 2);
    worksheet.setCellFormula({ row: 1, col: 1 }, '=40+2', 'row-formula-cache-sentinel');
    worksheet.setCellValue({ row: 1, col: 2 }, 'owner-row-content-long-enough-to-wrap');
    const renderer = new CanvasRenderer(document.createElement('div'), worksheet, { debug: false });
    const ctx = (renderer as any).ctx as CanvasRenderingContext2D;
    const save = jest.spyOn(ctx, 'save');
    const restore = jest.spyOn(ctx, 'restore');
    const measureText = jest.spyOn(ctx, 'measureText');
    const sourceEvents: unknown[] = [];
    const subscription = worksheet.on((event) => sourceEvents.push(event));
    const initialHeight = worksheet.getRowHeight(1);
    adoptWorksheetForTest(worksheet, 'owned-row-auto-size');

    try {
      expect(() => (renderer as any).autoSizeRow(1)).toThrow(/unavailable/);
      expect(measureText.mock.calls.map(([text]) => text)).toContain('owner-row-content-long-enough-to-wrap');
      expect(measureText.mock.calls.map(([text]) => text)).not.toContain('row-formula-cache-sentinel');
      expect(worksheet.getRowHeight(1)).toBe(initialHeight);
      expect(sourceEvents).toEqual([]);
      expect(save).toHaveBeenCalledTimes(1);
      expect(restore).toHaveBeenCalledTimes(1);
      expect(restore.mock.invocationCallOrder[0]).toBeGreaterThan(save.mock.invocationCallOrder[0]);
    } finally {
      subscription.dispose();
      renderer.dispose();
    }
  });

  it('detaches style passed to render plugins for an adopted Worksheet', () => {
    const runtimeProcess = (globalThis as typeof globalThis & {
      process?: { env: Record<string, string | undefined> };
    }).process;
    if (!runtimeProcess) throw new Error('Expected the Jest Node process to be available');
    const previousNodeEnv = runtimeProcess.env.NODE_ENV;
    runtimeProcess.env.NODE_ENV = 'production';
    const container = document.createElement('div');
    setViewport(container, 220, 100);
    const worksheet = new Worksheet('AdoptedRenderedStyle', 2, 2);
    const address = { row: 1, col: 1 };
    worksheet.setCellValue(address, 'styled-value');
    worksheet.setCellStyle(address, {
      bold: true,
      border: { top: { color: '#123456' } },
    });
    adoptWorksheetForTest(worksheet, 'adopted-render-style-plugin');
    const renderer = new CanvasRenderer(container, worksheet, { debug: false });
    const receivedStyles: Array<{ border?: { top?: { color?: string } } }> = [];
    try {
      renderer.addPlugin({
        id: 'adopted-style-retention',
        afterCellRender: (_ctx, _rect, context) => {
          if (context.addr.row === address.row && context.addr.col === address.col && context.style) {
            receivedStyles.push(context.style as typeof receivedStyles[number]);
          }
        },
      });
      renderer.redraw();

      expect(receivedStyles.length).toBeGreaterThan(0);
      const pluginStyle = receivedStyles[0];
      expect(pluginStyle.border?.top?.color).toBe('#123456');
      pluginStyle.border!.top!.color = '#ff0000';
      const sourceStyleAfter = worksheet.getCellStyle(address) as unknown as {
        border?: { top?: { color?: string } };
      };
      expect(sourceStyleAfter.border?.top?.color).toBe('#123456');
    } finally {
      renderer.dispose();
      runtimeProcess.env.NODE_ENV = previousNodeEnv;
    }
  });

  it('masks formula cached values from rendered cell text and plugin callbacks after adoption', () => {
    const container = document.createElement('div');
    setViewport(container, 220, 100);
    const worksheet = new Worksheet('RenderedFormulaValueOwnership', 2, 2);
    const formulaAddress = { row: 1, col: 1 };
    const ordinaryAddress = { row: 1, col: 2 };
    const formulaSentinel = 'rendered-formula-cache-secret-48317';
    const ordinaryValue = 'ordinary-rendered-value-92604';
    worksheet.setCellFormula(formulaAddress, '=40+2', formulaSentinel);
    worksheet.setCellValue(ordinaryAddress, ordinaryValue);
    // Keep the supplied cache stable so this test exercises rendering rather
    // than formula calculation replacing the pre-seeded display value.
    worksheet.completeScheduledRecalculation();
    expect(worksheet.isDirty(formulaAddress)).toBe(false);
    expect(worksheet.getCellValue(formulaAddress)).toBe(formulaSentinel);

    const sourceEvents: unknown[] = [];
    const subscription = worksheet.on((event) => sourceEvents.push(event));
    const renderer = new CanvasRenderer(container, worksheet, { debug: false });
    const context = (renderer as any).ctx as CanvasRenderingContext2D;
    const fillText = jest.spyOn(context, 'fillText');
    const pluginValues: Array<{
      phase: 'background' | 'after-cell-render';
      row: number;
      col: number;
      value: unknown;
    }> = [];
    renderer.addPlugin({
      id: 'observe-rendered-values-across-adoption',
      getCellBackground: ({ addr, value }) => {
        pluginValues.push({ phase: 'background', row: addr.row, col: addr.col, value });
        return undefined;
      },
      afterCellRender: (_ctx, _rect, { addr, value }) => {
        pluginValues.push({ phase: 'after-cell-render', row: addr.row, col: addr.col, value });
      },
    });

    const drawnTexts = () => fillText.mock.calls.map(([text]) => String(text));
    const valueObservations = (row: number, col: number) =>
      pluginValues.filter((entry) => entry.row === row && entry.col === col);

    // Standalone rendering uses the cached formula result in both the canvas
    // text command and the plugin render callbacks.
    expect(drawnTexts()).toContain(formulaSentinel);
    expect(drawnTexts()).toContain(ordinaryValue);
    expect(valueObservations(1, 1)).toEqual([
      { phase: 'background', row: 1, col: 1, value: formulaSentinel },
      { phase: 'after-cell-render', row: 1, col: 1, value: formulaSentinel },
    ]);
    expect(valueObservations(1, 2)).toEqual([
      { phase: 'background', row: 1, col: 2, value: ordinaryValue },
      { phase: 'after-cell-render', row: 1, col: 2, value: ordinaryValue },
    ]);
    expect(sourceEvents).toEqual([]);
    expect(worksheet.getCell(formulaAddress)).toMatchObject({ formula: '=40+2', value: formulaSentinel });
    expect(worksheet.getCell(ordinaryAddress)).toMatchObject({ value: ordinaryValue });

    adoptWorksheetForTest(worksheet, 'rendered-formula-value-owner');
    pluginValues.length = 0;
    fillText.mockClear();
    sourceEvents.length = 0;
    renderer.redraw();

    // The retained renderer still draws ordinary data, while the formula's
    // cached result reaches neither canvas text nor plugin value callbacks.
    expect(drawnTexts()).not.toContain(formulaSentinel);
    expect(drawnTexts()).toContain(ordinaryValue);
    expect(valueObservations(1, 1)).toEqual([
      { phase: 'background', row: 1, col: 1, value: null },
    ]);
    expect(valueObservations(1, 2)).toEqual([
      { phase: 'background', row: 1, col: 2, value: ordinaryValue },
      { phase: 'after-cell-render', row: 1, col: 2, value: ordinaryValue },
    ]);
    expect(sourceEvents).toEqual([]);
    expect(worksheet.getCell(formulaAddress)).toMatchObject({ formula: '=40+2', value: formulaSentinel });
    expect(worksheet.getCell(ordinaryAddress)).toMatchObject({ value: ordinaryValue });
    expect(renderer.sheetReadonly.getCellValue(formulaAddress)).toBeNull();
    expect(renderer.sheetReadonly.getCellValue(ordinaryAddress)).toBe(ordinaryValue);

    subscription.dispose();
    renderer.dispose();
    fillText.mockRestore();
  });

  it('excludes formula cached values from heatmap range computation after adoption', () => {
    const container = document.createElement('div');
    setViewport(container, 1000, 600);
    const worksheet = new Worksheet('HeatmapFormulaOwnership', 1, 4);
    const formulaAddress = { row: 1, col: 1 };
    const ordinaryAddress = { row: 1, col: 2 };
    const nonNumericAddress = { row: 1, col: 3 };
    const laterNumericAddress = { row: 1, col: 4 };
    const formulaCache = 777;
    const ordinaryValue = 12;
    worksheet.setCellFormula(formulaAddress, '=700+77', formulaCache);
    worksheet.setCellValue(ordinaryAddress, ordinaryValue);
    worksheet.setCellValue(nonNumericAddress, 'not-a-number');
    worksheet.setCellValue(laterNumericAddress, 30);
    worksheet.completeScheduledRecalculation();

    const events: unknown[] = [];
    const subscription = worksheet.on((event) => events.push(event));
    const renderer = new CanvasRenderer(container, worksheet, { debug: false });
    const observations: Array<{
      row: number;
      col: number;
      value: unknown;
      min?: number;
      max?: number;
    }> = [];

    try {
      renderer.addPlugin({
        id: 'observe-heatmap-range-owner-boundary',
        getCellBackground: ({ addr, value, min, max }) => {
          observations.push({ row: addr.row, col: addr.col, value, min, max });
          return undefined;
        },
      });

      observations.length = 0;
      renderer.computeHeatmapRange();
      expect((renderer as any).heatmapRange).toEqual({ min: ordinaryValue, max: formulaCache });
      expect(observations).toContainEqual({
        row: 1, col: 1, value: formulaCache, min: ordinaryValue, max: formulaCache,
      });
      expect(observations).toContainEqual({
        row: 1, col: 2, value: ordinaryValue, min: ordinaryValue, max: formulaCache,
      });
      expect(observations).toContainEqual({
        row: 1, col: 3, value: 'not-a-number', min: ordinaryValue, max: formulaCache,
      });
      expect(observations).toContainEqual({
        row: 1, col: 4, value: 30, min: ordinaryValue, max: formulaCache,
      });

      adoptWorksheetForTest(worksheet, 'heatmap-formula-cache-owner');
      observations.length = 0;
      renderer.computeHeatmapRange();
      expect((renderer as any).heatmapRange).toEqual({ min: ordinaryValue, max: 30 });
      expect(observations).toContainEqual({
        row: 1, col: 1, value: null, min: ordinaryValue, max: 30,
      });
      expect(observations).toContainEqual({
        row: 1, col: 2, value: ordinaryValue, min: ordinaryValue, max: 30,
      });
      expect(observations).toContainEqual({
        row: 1, col: 3, value: 'not-a-number', min: ordinaryValue, max: 30,
      });
      expect(observations).toContainEqual({
        row: 1, col: 4, value: 30, min: ordinaryValue, max: 30,
      });
      expect(worksheet.getCell(formulaAddress)).toMatchObject({
        formula: '=700+77', value: formulaCache,
      });
      expect(worksheet.getCell(ordinaryAddress)).toMatchObject({ value: ordinaryValue });
      expect(worksheet.getCell(nonNumericAddress)).toMatchObject({ value: 'not-a-number' });
      expect(worksheet.getCellValue(laterNumericAddress)).toBe(30);
      expect(events).toEqual([]);
    } finally {
      subscription.dispose();
      renderer.dispose();
    }
  });

  it('recomputes heatmap aggregation when Worksheet ownership changes during scanning', () => {
    const container = document.createElement('div');
    setViewport(container, 1000, 600);
    const worksheet = new Worksheet('HeatmapReentrantOwnership', 1, 4);
    const formulaAddress = { row: 1, col: 1 };
    worksheet.setCellFormula(formulaAddress, '=700+77', 777);
    worksheet.setCellValue({ row: 1, col: 2 }, 12);
    worksheet.setCellValue({ row: 1, col: 3 }, 'not-a-number');
    worksheet.setCellValue({ row: 1, col: 4 }, 30);
    worksheet.completeScheduledRecalculation();

    const events: unknown[] = [];
    const subscription = worksheet.on((event) => events.push(event));
    const renderer = new CanvasRenderer(container, worksheet, { debug: false });
    const observations: Array<{
      row: number;
      col: number;
      value: unknown;
      min?: number;
      max?: number;
    }> = [];

    try {
      renderer.addPlugin({
        id: 'observe-heatmap-reentrant-owner-transition',
        getCellBackground: ({ addr, value, min, max }) => {
          observations.push({ row: addr.row, col: addr.col, value, min, max });
          return undefined;
        },
      });
      observations.length = 0;

      const originalColCount = worksheet.colCount;
      let colCountReads = 0;
      Object.defineProperty(worksheet, 'colCount', {
        configurable: true,
        get() {
          colCountReads += 1;
          if (colCountReads === 2) {
            adoptWorksheetForTest(worksheet, 'heatmap-reentrant-owner-transition');
          }
          return originalColCount;
        },
      });

      renderer.computeHeatmapRange();

      expect(colCountReads).toBeGreaterThanOrEqual(2);
      expect(Worksheet.prototype.isWorkbookOwned.call(worksheet)).toBe(true);
      // The first pass reads the formula while standalone, then detects
      // adoption at the next column-count read and discards that partial range.
      // The retry observes the entire sheet through the owner boundary.
      expect((renderer as any).heatmapRange).toEqual({ min: 12, max: 30 });
      expect(observations).toContainEqual({
        row: 1, col: 1, value: null, min: 12, max: 30,
      });
      expect(observations).toContainEqual({
        row: 1, col: 2, value: 12, min: 12, max: 30,
      });
      expect(observations).toContainEqual({
        row: 1, col: 3, value: 'not-a-number', min: 12, max: 30,
      });
      expect(observations).toContainEqual({
        row: 1, col: 4, value: 30, min: 12, max: 30,
      });
      expect(worksheet.getCell(formulaAddress)).toMatchObject({ formula: '=700+77', value: 777 });
      expect(worksheet.getCellValue({ row: 1, col: 2 })).toBe(12);
      expect(worksheet.getCellValue({ row: 1, col: 3 })).toBe('not-a-number');
      expect(worksheet.getCellValue({ row: 1, col: 4 })).toBe(30);
      expect(events).toEqual([]);
    } finally {
      subscription.dispose();
      renderer.dispose();
    }
  });

  it('characterizes repaint and recovery after the owner-aware heatmap retry fails', () => {
    const container = document.createElement('div');
    setViewport(container, 1000, 600);
    const worksheet = new Worksheet('HeatmapFailedOwnerRetry', 1, 4);
    worksheet.setCellFormula({ row: 1, col: 1 }, '=700+77', 777);
    worksheet.setCellValue({ row: 1, col: 2 }, 12);
    worksheet.setCellValue({ row: 1, col: 3 }, 'not-a-number');
    worksheet.setCellValue({ row: 1, col: 4 }, 30);
    worksheet.setCellStyle({ row: 1, col: 2 }, new StyleCache().intern({ bold: true, color: '#123456' }));
    worksheet.completeScheduledRecalculation();
    const ordinaryCellStyle = JSON.stringify(worksheet.getCellStyle({ row: 1, col: 2 }));

    const events: unknown[] = [];
    const subscription = worksheet.on((event) => events.push(event));
    const renderer = new CanvasRenderer(container, worksheet, { debug: false });
    const failure = new Error('controlled heatmap retry failure');
    const observations: Array<{ value: unknown; min?: number; max?: number }> = [];
    const context = (renderer as any).ctx as CanvasRenderingContext2D;
    const paintedFillStyles: string[] = [];
    const clearRect = jest.spyOn(context, 'clearRect');
    const fillRect = jest.spyOn(context, 'fillRect').mockImplementation(() => {
      paintedFillStyles.push(String(context.fillStyle));
    });
    const redraw = jest.spyOn(renderer, 'redraw');
    const scheduleRedraw = jest.spyOn(renderer as any, 'scheduleRedraw');
    const evaluateVisibleFormulaCells = jest.spyOn(renderer as any, 'evaluateVisibleFormulaCells');

    try {
      renderer.addPlugin({
        id: 'observe-failed-heatmap-retry-repaint',
        getCellBackground: ({ value, min, max }) => {
          observations.push({ value, min, max });
          return typeof value === 'number' && max === 777 ? '#ff0000' : undefined;
        },
      });
      // Ignore the addPlugin redraw so the first compute below is the known
      // successful render whose output must be recovered after the failure.
      observations.length = 0;
      paintedFillStyles.length = 0;
      clearRect.mockClear();
      fillRect.mockClear();
      redraw.mockClear();
      scheduleRedraw.mockClear();
      evaluateVisibleFormulaCells.mockClear();

      renderer.computeHeatmapRange();
      expect((renderer as any).heatmapRange).toEqual({ min: 12, max: 777 });
      expect(redraw).toHaveBeenCalledTimes(1);
      expect(observations).toContainEqual({ value: 777, min: 12, max: 777 });
      expect(paintedFillStyles).toContain('#ff0000');
      expect(clearRect).toHaveBeenCalled();

      const successfulRenderObservationCount = observations.length;
      const successfulRenderFillCount = fillRect.mock.calls.length;
      const successfulRenderClearCount = clearRect.mock.calls.length;
      redraw.mockClear();
      evaluateVisibleFormulaCells.mockClear();

      const originalColCount = worksheet.colCount;
      let colCountReads = 0;
      Object.defineProperty(worksheet, 'colCount', {
        configurable: true,
        get() {
          colCountReads += 1;
          if (colCountReads === 2) {
            adoptWorksheetForTest(worksheet, 'heatmap-failed-owner-retry');
          }
          if (colCountReads === 3) throw failure;
          return originalColCount;
        },
      });

      expect(() => renderer.computeHeatmapRange()).toThrow(failure);
      expect(colCountReads).toBe(3);
      expect((renderer as any).heatmapRange).toBeNull();
      // The failure propagates after a paint-only frame replaces the stale
      // standalone aggregate. The paint path must not re-enter formula work.
      expect(redraw).toHaveBeenCalledTimes(0);
      expect(scheduleRedraw).toHaveBeenCalledTimes(0);
      expect(evaluateVisibleFormulaCells).not.toHaveBeenCalled();
      expect(observations.length).toBeGreaterThan(successfulRenderObservationCount);
      expect(observations).toContainEqual({ value: null, min: undefined, max: undefined });
      expect(observations).toContainEqual({ value: 12, min: undefined, max: undefined });
      expect(fillRect.mock.calls.length).toBeGreaterThan(successfulRenderFillCount);
      expect(clearRect.mock.calls.length).toBeGreaterThan(successfulRenderClearCount);

      // A later successful owner-aware computation repaints with the formula
      // cache masked and the ordinary numeric range restored.
      Object.defineProperty(worksheet, 'colCount', {
        configurable: true,
        value: originalColCount,
      });
      observations.length = 0;
      paintedFillStyles.length = 0;
      renderer.computeHeatmapRange();
      expect((renderer as any).heatmapRange).toEqual({ min: 12, max: 30 });
      expect(redraw).toHaveBeenCalledTimes(1);
      expect(evaluateVisibleFormulaCells).toHaveBeenCalledTimes(1);
      expect(scheduleRedraw).toHaveBeenCalledTimes(0);
      expect(observations).toContainEqual({ value: null, min: 12, max: 30 });
      expect(observations).toContainEqual({ value: 12, min: 12, max: 30 });
      expect(observations).toContainEqual({ value: 30, min: 12, max: 30 });
      expect(clearRect.mock.calls.length).toBeGreaterThan(successfulRenderClearCount);
      expect(worksheet.getCell({ row: 1, col: 1 })).toMatchObject({
        formula: '=700+77', value: 777,
      });
      expect(worksheet.getCellValue({ row: 1, col: 2 })).toBe(12);
      expect(JSON.stringify(worksheet.getCellStyle({ row: 1, col: 2 }))).toBe(ordinaryCellStyle);
      expect(events).toEqual([]);
    } finally {
      subscription.dispose();
      renderer.dispose();
      redraw.mockRestore();
      scheduleRedraw.mockRestore();
      evaluateVisibleFormulaCells.mockRestore();
      clearRect.mockRestore();
      fillRect.mockRestore();
    }
  });

  it('preserves the heatmap retry error when its paint-only recovery also throws', () => {
    const container = document.createElement('div');
    setViewport(container, 1000, 600);
    const worksheet = new Worksheet('HeatmapRetryPaintFailure', 1, 4);
    worksheet.setCellFormula({ row: 1, col: 1 }, '=700+77', 777);
    worksheet.setCellValue({ row: 1, col: 2 }, 12);
    worksheet.setCellValue({ row: 1, col: 3 }, 20);
    worksheet.setCellValue({ row: 1, col: 4 }, 30);
    worksheet.completeScheduledRecalculation();
    const events: unknown[] = [];
    const subscription = worksheet.on((event) => events.push(event));
    const renderer = new CanvasRenderer(container, worksheet, { debug: false });
    const originalColCount = worksheet.colCount;
    const retryFailure = new Error('original owner-aware retry failure');
    const paintFailure = new Error('paint-only recovery failure');

    try {
      renderer.computeHeatmapRange();
      expect((renderer as any).heatmapRange).toEqual({ min: 12, max: 777 });
      let colCountReads = 0;
      Object.defineProperty(worksheet, 'colCount', {
        configurable: true,
        get() {
          colCountReads += 1;
          if (colCountReads === 2) {
            adoptWorksheetForTest(worksheet, 'heatmap-retry-paint-failure');
          }
          if (colCountReads === 3) throw retryFailure;
          return originalColCount;
        },
      });
      const paintFrame = jest.spyOn(renderer as any, 'paintFrame').mockImplementation(() => {
        throw paintFailure;
      });
      const evaluateVisibleFormulaCells = jest.spyOn(renderer as any, 'evaluateVisibleFormulaCells');

      expect(() => renderer.computeHeatmapRange()).toThrow(retryFailure);
      expect(colCountReads).toBe(3);
      expect((renderer as any).heatmapRange).toBeNull();
      expect(paintFrame).toHaveBeenCalledTimes(1);
      expect(evaluateVisibleFormulaCells).not.toHaveBeenCalled();
      expect(worksheet.getCell({ row: 1, col: 1 })).toMatchObject({ formula: '=700+77', value: 777 });
      expect(worksheet.getCellValue({ row: 1, col: 2 })).toBe(12);
      expect(events).toEqual([]);
      paintFrame.mockRestore();
      evaluateVisibleFormulaCells.mockRestore();
    } finally {
      Object.defineProperty(worksheet, 'colCount', {
        configurable: true,
        value: originalColCount,
      });
      subscription.dispose();
      renderer.dispose();
    }
  });

  it('rechecks later render-cell reads when a plugin adopts the worksheet during redraw', () => {
    const container = document.createElement('div');
    setViewport(container, 220, 100);
    const worksheet = new Worksheet('RenderCallbackAdoptsWorksheet', 1, 2);
    const ordinaryAddress = { row: 1, col: 1 };
    const formulaAddress = { row: 1, col: 2 };
    const ordinaryValue = 'standalone-before-callback-adoption';
    const formulaSentinel = 'formula-cache-after-callback-adoption-48163';
    worksheet.setCellValue(ordinaryAddress, ordinaryValue);
    worksheet.setCellFormula(formulaAddress, '=40+2', formulaSentinel);
    worksheet.completeScheduledRecalculation();

    const events: unknown[] = [];
    const subscription = worksheet.on((event) => events.push(event));
    const renderer = new CanvasRenderer(container, worksheet, { debug: false });
    const context = (renderer as any).ctx as CanvasRenderingContext2D;
    const fillText = jest.spyOn(context, 'fillText');
    const observations: Array<{
      phase: 'background' | 'after-cell-render';
      row: number;
      col: number;
      value: unknown;
    }> = [];
    let adoptedDuringCallback = false;

    try {
      renderer.addPlugin({
        id: 'adopt-during-render-cell-callback',
        getCellBackground: ({ addr, value }) => {
          observations.push({ phase: 'background', row: addr.row, col: addr.col, value });
          if (addr.row === 1 && addr.col === 1 && !adoptedDuringCallback) {
            adoptWorksheetForTest(worksheet, 'render-cell-callback-reentrant-owner');
            adoptedDuringCallback = true;
          }
          return undefined;
        },
        afterCellRender: (_ctx, _rect, { addr, value }) => {
          observations.push({ phase: 'after-cell-render', row: addr.row, col: addr.col, value });
        },
      });
      if (!adoptedDuringCallback) renderer.redraw();

      expect(adoptedDuringCallback).toBe(true);
      expect(observations).toContainEqual({
        phase: 'background', row: 1, col: 1, value: ordinaryValue,
      });
      // The first callback adopted the source. The next cell read in this same
      // redraw must use the new owner rule, including the background callback.
      expect(observations).toContainEqual({
        phase: 'background', row: 1, col: 2, value: null,
      });
      // H.55 behavior is intentional: a masked formula cell can skip this callback.
      expect(observations).not.toContainEqual({
        phase: 'after-cell-render', row: 1, col: 2, value: null,
      });
      expect(fillText.mock.calls.map(([text]) => String(text))).not.toContain(formulaSentinel);
      expect(fillText.mock.calls.map(([text]) => String(text))).toContain(ordinaryValue);
      expect(worksheet.getCell(formulaAddress)).toMatchObject({
        formula: '=40+2', value: formulaSentinel,
      });
      expect(worksheet.getCell(ordinaryAddress)).toMatchObject({ value: ordinaryValue });
      expect(events).toEqual([]);
    } finally {
      subscription.dispose();
      renderer.dispose();
      fillText.mockRestore();
    }
  });

  it('uses the owner-aware row-loaded observation during actual redraws', () => {
    const container = document.createElement('div');
    setViewport(container, 220, 100);
    const worksheet = new Worksheet('RenderRowLoadedOwnership', 2, 1);
    worksheet.setCellValue({ row: 1, col: 1 }, 'loaded-row-value');
    worksheet.setCellValue({ row: 2, col: 1 }, 'unloaded-row-value');
    worksheet.beginProgressiveLoad(2);
    worksheet.markRowsLoaded(1, 1);

    const originalIsRowLoaded = Worksheet.prototype.isRowLoaded;
    const originalIsWorkbookOwned = Worksheet.prototype.isWorkbookOwned;
    const observed: Array<{ row: number; loaded: boolean; owned: boolean }> = [];
    const isRowLoaded = jest.spyOn(Worksheet.prototype, 'isRowLoaded').mockImplementation(function (
      this: Worksheet,
      row: number,
    ) {
      const loaded = originalIsRowLoaded.call(this, row);
      observed.push({
        row,
        loaded,
        owned: originalIsWorkbookOwned.call(this),
      });
      return loaded;
    });
    const renderer = new CanvasRenderer(container, worksheet, { debug: false });
    const context = (renderer as any).ctx as CanvasRenderingContext2D;
    const fillStyles: string[] = [];
    const fillRect = jest.spyOn(context, 'fillRect').mockImplementation(() => {
      fillStyles.push(String(context.fillStyle));
    });

    try {
      observed.length = 0;
      fillStyles.length = 0;
      renderer.redraw();
      expect(observed).toContainEqual({ row: 1, loaded: true, owned: false });
      expect(observed).toContainEqual({ row: 2, loaded: false, owned: false });
      expect(fillStyles).toContain('#F3F4F6');

      adoptWorksheetForTest(worksheet, 'render-row-loaded-owner');
      observed.length = 0;
      fillStyles.length = 0;
      renderer.redraw();
      expect(observed).toContainEqual({ row: 1, loaded: true, owned: true });
      expect(observed).toContainEqual({ row: 2, loaded: false, owned: true });
      expect(fillStyles).toContain('#F3F4F6');
      expect(worksheet.getCellValue({ row: 1, col: 1 })).toBe('loaded-row-value');
      expect(worksheet.getCellValue({ row: 2, col: 1 })).toBe('unloaded-row-value');
    } finally {
      renderer.dispose();
      fillRect.mockRestore();
      isRowLoaded.mockRestore();
    }
  });

  it('characterizes public autoSizeColumns style reads across Worksheet adoption', () => {
    const container = document.createElement('div');
    setViewport(container, 220, 100);
    const worksheet = new Worksheet('PublicAutoSizeOwnership', 2, 1);
    const formulaAddress = { row: 1, col: 1 };
    const styledAddress = { row: 2, col: 1 };
    const formulaSentinel = 'public-auto-size-formula-cache-71933';
    const ordinaryValue = 'styled-public-auto-size-value';
    worksheet.setCellFormula(formulaAddress, '=700+77', formulaSentinel);
    worksheet.setCellValue(styledAddress, ordinaryValue);
    worksheet.setCellStyle(styledAddress, {
      bold: true,
      italic: true,
      fontSize: 24,
      border: { top: { color: '#123456' } },
    });
    worksheet.completeScheduledRecalculation();

    const events: unknown[] = [];
    const subscription = worksheet.on((event) => events.push(event));
    const runtimeProcess = (globalThis as typeof globalThis & {
      process?: { env: Record<string, string | undefined> };
    }).process;
    if (!runtimeProcess) throw new Error('Expected the Jest Node process to be available');
    const previousNodeEnv = runtimeProcess.env.NODE_ENV;
    runtimeProcess.env.NODE_ENV = 'production';
    const renderer = new CanvasRenderer(container, worksheet, {
      debug: false,
      theme: { fontFamily: 'Arial', fontSize: 11 },
    });
    const redraw = jest.spyOn(renderer, 'redraw');
    const context = (renderer as any).ctx as CanvasRenderingContext2D;
    const measurements: Array<{ text: string; font: string }> = [];
    const canvasStateCalls: string[] = [];
    const originalSave = context.save;
    const originalRestore = context.restore;
    const save = jest.spyOn(context, 'save').mockImplementation(() => {
      canvasStateCalls.push('save');
      originalSave.call(context);
    });
    const restore = jest.spyOn(context, 'restore').mockImplementation(() => {
      canvasStateCalls.push('restore');
      originalRestore.call(context);
    });
    const measureText = jest.spyOn(context, 'measureText').mockImplementation(((text: string) => {
      canvasStateCalls.push('measure');
      measurements.push({ text: String(text), font: context.font });
      return { width: context.font.includes('italic bold 24px Arial') ? 160 : 8 } as TextMetrics;
    }) as typeof context.measureText);
    const originalGetCellStyle = Worksheet.prototype.getCellStyle;
    const originalIsWorkbookOwned = Worksheet.prototype.isWorkbookOwned;
    const styleReads: Array<{
      address: { row: number; col: number };
      owned: boolean;
      style: ReturnType<Worksheet['getCellStyle']>;
    }> = [];
    const getCellStyle = jest.spyOn(Worksheet.prototype, 'getCellStyle').mockImplementation(function (
      this: Worksheet,
      address: { row: number; col: number },
    ) {
      const style = originalGetCellStyle.call(this, address);
      styleReads.push({
        address: { ...address },
        owned: originalIsWorkbookOwned.call(this),
        style,
      });
      return style;
    });

    try {
      // Renderer construction can prewarm text measurements while drawing.
      // Clear only this instance's cache so the deterministic canvas stub sees
      // the public auto-size measurement itself.
      (renderer as any).textCache.cache.clear();
      canvasStateCalls.length = 0;
      renderer.autoSizeColumns({
        mode: 'visible',
        includeHeader: false,
        padding: 0,
        minWidth: 1,
        maxWidth: 500,
      });
      expect(measurements).toContainEqual({
        text: ordinaryValue,
        font: 'italic bold 24px Arial',
      });
      expect(measurements.map(({ text }) => text)).toContain(formulaSentinel);
      expect(styleReads).toContainEqual(expect.objectContaining({
        address: styledAddress,
        owned: false,
      }));
      expect(save).toHaveBeenCalledTimes(restore.mock.calls.length);
      const measuredCallIndices = canvasStateCalls
        .map((call, index) => call === 'measure' ? index : -1)
        .filter((index) => index >= 0);
      expect(measuredCallIndices.length).toBeGreaterThanOrEqual(2);
      for (const index of measuredCallIndices.slice(0, 2)) {
        expect(canvasStateCalls[index - 1]).toBe('save');
        expect(canvasStateCalls[index + 1]).toBe('restore');
      }
      expect(worksheet.getColumnWidth(1)).toBe(160);
      expect(redraw).toHaveBeenCalledTimes(1);

      const widthBeforeAdoption = worksheet.getColumnWidth(1);
      events.length = 0;
      measurements.length = 0;
      styleReads.length = 0;
      canvasStateCalls.length = 0;
      save.mockClear();
      restore.mockClear();
      redraw.mockClear();
      adoptWorksheetForTest(worksheet, 'public-auto-size-owner');
      (renderer as any).textCache.cache.clear();

      expect(() => renderer.autoSizeColumns({
        mode: 'visible',
        includeHeader: false,
        padding: 0,
        minWidth: 1,
        maxWidth: 500,
      })).toThrow(/workbook-owned|adopted|unavailable/i);

      expect(measurements).toEqual([]);
      expect(canvasStateCalls).toEqual([]);
      expect(save).not.toHaveBeenCalled();
      expect(restore).not.toHaveBeenCalled();
      expect(styleReads).toEqual([]);

      // The auto-size operation rejects before scanning. The separate retained
      // observation handle still provides detached owner style data.
      styleReads.length = 0;
      const ownedStyle = renderer.sheetReadonly.getCellStyle(styledAddress);
      expect(ownedStyle).toMatchObject({
        bold: true,
        italic: true,
        fontSize: 24,
        border: { top: { color: '#123456' } },
      });
      expect(styleReads).toContainEqual(expect.objectContaining({
        address: styledAddress,
        owned: true,
      }));
      const ownedTopBorder = ownedStyle!.border!.top as { color?: string };
      expect(Reflect.set(ownedTopBorder, 'color', '#ff0000')).toBe(false);
      const sourceTopBorder = worksheet.getCellStyle(styledAddress)?.border?.top as
        | { color?: string }
        | undefined;
      expect(sourceTopBorder?.color).toBe('#123456');

      expect(renderer.sheetReadonly.getCellValue(formulaAddress)).toBeNull();
      expect(worksheet.getCellValue(formulaAddress)).toBe(formulaSentinel);
      expect(worksheet.getCellValue(styledAddress)).toBe(ordinaryValue);
      expect(worksheet.getColumnWidth(1)).toBe(widthBeforeAdoption);
      expect(events).toEqual([]);
      expect(redraw).not.toHaveBeenCalled();
    } finally {
      subscription.dispose();
      getCellStyle.mockRestore();
      measureText.mockRestore();
      restore.mockRestore();
      save.mockRestore();
      redraw.mockRestore();
      renderer.dispose();
      runtimeProcess.env.NODE_ENV = previousNodeEnv;
    }
  });

  it('characterizes public autoSizeColumns canvas state when text measurement throws', () => {
    const container = document.createElement('div');
    setViewport(container, 220, 100);
    const worksheet = new Worksheet('PublicAutoSizeMeasurementFailure', 1, 1);
    worksheet.setCellValue({ row: 1, col: 1 }, 'measurement-failure-value');
    const renderer = new CanvasRenderer(container, worksheet, { debug: false });
    const context = (renderer as any).ctx as CanvasRenderingContext2D;
    const save = jest.spyOn(context, 'save');
    const restore = jest.spyOn(context, 'restore');
    const canvasStateCalls: string[] = [];
    save.mockImplementation(() => canvasStateCalls.push('save'));
    restore.mockImplementation(() => canvasStateCalls.push('restore'));
    const failure = new Error('controlled measureText failure');
    const measureText = jest.spyOn(context, 'measureText').mockImplementation(() => {
      canvasStateCalls.push('measure');
      throw failure;
    });
    (renderer as any).textCache.cache.clear();
    const textCacheSet = jest.spyOn((renderer as any).textCache, 'set');
    const events: unknown[] = [];
    const subscription = worksheet.on((event) => events.push(event));
    const widthBefore = worksheet.getColumnWidth(1);

    try {
      let thrown: unknown;
      try {
        renderer.autoSizeColumns({
          mode: 'all',
          includeHeader: false,
          padding: 0,
          minWidth: 1,
          maxWidth: 500,
        });
      } catch (error) {
        thrown = error;
      }
      expect(thrown).toBe(failure);
      expect(save).toHaveBeenCalledTimes(1);
      expect(restore).toHaveBeenCalledTimes(1);
      expect(canvasStateCalls).toEqual(['save', 'measure', 'restore']);
      expect(textCacheSet).not.toHaveBeenCalled();
      expect(worksheet.getColumnWidth(1)).toBe(widthBefore);
      expect(events).toEqual([]);
    } finally {
      subscription.dispose();
      textCacheSet.mockRestore();
      measureText.mockRestore();
      restore.mockRestore();
      save.mockRestore();
      renderer.dispose();
    }
  });

  it('applies all measured public autoSizeColumns widths before its successful redraw', () => {
    const container = document.createElement('div');
    setViewport(container, 320, 100);
    const worksheet = new Worksheet('PublicAutoSizeThreeColumnSuccess', 1, 3);
    const values = ['short', 'medium-column', 'longest-column-content'];
    values.forEach((value, index) => worksheet.setCellValue({ row: 1, col: index + 1 }, value));
    const renderer = new CanvasRenderer(container, worksheet, { debug: false });
    const context = (renderer as any).ctx as CanvasRenderingContext2D;
    const originalSave = context.save;
    const originalRestore = context.restore;
    const save = jest.spyOn(context, 'save').mockImplementation(() => originalSave.call(context));
    const restore = jest.spyOn(context, 'restore').mockImplementation(() => originalRestore.call(context));
    const measureText = jest.spyOn(context, 'measureText').mockImplementation(((text: string) =>
      ({ width: String(text).length * 10 }) as TextMetrics) as typeof context.measureText);
    (renderer as any).textCache.cache.clear();
    const redraw = jest.spyOn(renderer, 'redraw').mockImplementation(() => {});
    const widthsBefore = [1, 2, 3].map((col) => worksheet.getColumnWidth(col));
    const events: unknown[] = [];
    const subscription = worksheet.on((event) => events.push(event));

    try {
      renderer.autoSizeColumns({
        mode: 'all', includeHeader: false, padding: 0, minWidth: 1, maxWidth: 500,
      });

      expect([1, 2, 3].map((col) => worksheet.getColumnWidth(col))).toEqual(
        values.map((value) => value.length * 10),
      );
      expect(events).toEqual([
        { type: 'sheet-mutated' },
        { type: 'sheet-mutated' },
        { type: 'sheet-mutated' },
      ]);
      expect(redraw).toHaveBeenCalledTimes(1);
      expect(save).toHaveBeenCalledTimes(3);
      expect(restore).toHaveBeenCalledTimes(3);
    } finally {
      subscription.dispose();
      redraw.mockRestore();
      measureText.mockRestore();
      restore.mockRestore();
      save.mockRestore();
      renderer.dispose();
    }
  });

  it('characterizes earlier column writes when later auto-size measurement throws', () => {
    const container = document.createElement('div');
    setViewport(container, 320, 100);
    const worksheet = new Worksheet('PublicAutoSizeLaterMeasurementFailure', 1, 3);
    const values = ['first-column-measurement', 'second-column-measurement', 'third-column-measurement'];
    values.forEach((value, index) => worksheet.setCellValue({ row: 1, col: index + 1 }, value));
    const renderer = new CanvasRenderer(container, worksheet, { debug: false });
    const context = (renderer as any).ctx as CanvasRenderingContext2D;
    const canvasCalls: string[] = [];
    const originalSave = context.save;
    const originalRestore = context.restore;
    const save = jest.spyOn(context, 'save').mockImplementation(() => {
      canvasCalls.push('save');
      originalSave.call(context);
    });
    const restore = jest.spyOn(context, 'restore').mockImplementation(() => {
      canvasCalls.push('restore');
      originalRestore.call(context);
    });
    const failure = new Error('controlled third-column measurement failure');
    const measurements: string[] = [];
    const measureText = jest.spyOn(context, 'measureText').mockImplementation(((text: string) => {
      const measured = String(text);
      canvasCalls.push(`measure:${measured}`);
      measurements.push(measured);
      if (measured === values[2]) throw failure;
      return { width: measured.length * 10 } as TextMetrics;
    }) as typeof context.measureText);
    (renderer as any).textCache.cache.clear();
    const calls: Array<[number, number]> = [];
    const originalSetColumnWidth = worksheet.setColumnWidth.bind(worksheet);
    Object.defineProperty(worksheet, 'setColumnWidth', {
      configurable: true,
      value: (col: number, width: number) => {
        calls.push([col, width]);
        originalSetColumnWidth(col, width);
      },
    });
    const events: unknown[] = [];
    const subscription = worksheet.on((event) => events.push(event));
    const widthsBefore = [1, 2, 3].map((col) => worksheet.getColumnWidth(col));
    const scheduleRedraw = jest.spyOn(renderer, 'scheduleRedraw');
    const redraw = jest.spyOn(renderer, 'redraw');

    try {
      expect(() => renderer.autoSizeColumns({
        mode: 'all', includeHeader: false, padding: 0, minWidth: 1, maxWidth: 500,
      })).toThrow(failure);

      const widthsAfter = [1, 2, 3].map((col) => worksheet.getColumnWidth(col));
      expect(widthsAfter).toEqual(widthsBefore);
      expect(calls).toEqual([]);
      expect(events).toEqual([]);
      expect(scheduleRedraw).not.toHaveBeenCalled();
      expect(redraw).not.toHaveBeenCalled();
      expect(measurements).toEqual(values);
      expect(canvasCalls).toEqual([
        'save', `measure:${values[0]}`, 'restore',
        'save', `measure:${values[1]}`, 'restore',
        'save', `measure:${values[2]}`, 'restore',
      ]);
      expect(save).toHaveBeenCalledTimes(3);
      expect(restore).toHaveBeenCalledTimes(3);
    } finally {
      subscription.dispose();
      delete (worksheet as unknown as { setColumnWidth?: (col: number, width: number) => void }).setColumnWidth;
      redraw.mockRestore();
      scheduleRedraw.mockRestore();
      measureText.mockRestore();
      restore.mockRestore();
      save.mockRestore();
      renderer.dispose();
    }
  });

  it('characterizes earlier auto-size writes when a later width application throws', () => {
    const container = document.createElement('div');
    setViewport(container, 320, 100);
    const worksheet = new Worksheet('PublicAutoSizeLaterWriteFailure', 1, 3);
    const values = ['first-column-write', 'second-column-write', 'third-column-write'];
    values.forEach((value, index) => worksheet.setCellValue({ row: 1, col: index + 1 }, value));
    const renderer = new CanvasRenderer(container, worksheet, { debug: false });
    const context = (renderer as any).ctx as CanvasRenderingContext2D;
    const canvasCalls: string[] = [];
    const originalSave = context.save;
    const originalRestore = context.restore;
    const save = jest.spyOn(context, 'save').mockImplementation(() => {
      canvasCalls.push('save');
      originalSave.call(context);
    });
    const restore = jest.spyOn(context, 'restore').mockImplementation(() => {
      canvasCalls.push('restore');
      originalRestore.call(context);
    });
    const measureText = jest.spyOn(context, 'measureText').mockImplementation(((text: string) => {
      canvasCalls.push(`measure:${String(text)}`);
      return { width: String(text).length * 10 } as TextMetrics;
    }) as typeof context.measureText);
    (renderer as any).textCache.cache.clear();
    const failure = new Error('controlled third-column width failure');
    const calls: Array<[number, number]> = [];
    const originalSetColumnWidth = worksheet.setColumnWidth.bind(worksheet);
    Object.defineProperty(worksheet, 'setColumnWidth', {
      configurable: true,
      value: (col: number, width: number) => {
        calls.push([col, width]);
        if (col === 3) throw failure;
        originalSetColumnWidth(col, width);
      },
    });
    const events: unknown[] = [];
    const subscription = worksheet.on((event) => events.push(event));
    const widthsBefore = [1, 2, 3].map((col) => worksheet.getColumnWidth(col));
    const scheduleRedraw = jest.spyOn(renderer, 'scheduleRedraw');
    const redraw = jest.spyOn(renderer, 'redraw');

    try {
      expect(() => renderer.autoSizeColumns({
        mode: 'all', includeHeader: false, padding: 0, minWidth: 1, maxWidth: 500,
      })).toThrow(failure);

      const widthsAfter = [1, 2, 3].map((col) => worksheet.getColumnWidth(col));
      expect(widthsAfter[0]).toBeGreaterThan(widthsBefore[0]);
      expect(widthsAfter[1]).toBeGreaterThan(widthsBefore[1]);
      expect(widthsAfter[2]).toBe(widthsBefore[2]);
      expect(calls.map(([col]) => col)).toEqual([1, 2, 3]);
      expect(events).toEqual([{ type: 'sheet-mutated' }, { type: 'sheet-mutated' }]);
      expect(scheduleRedraw).toHaveBeenCalledTimes(2);
      expect(redraw).not.toHaveBeenCalled();
      expect(canvasCalls).toEqual([
        'save', `measure:${values[0]}`, 'restore',
        'save', `measure:${values[1]}`, 'restore',
        'save', `measure:${values[2]}`, 'restore',
      ]);
      expect(save).toHaveBeenCalledTimes(3);
      expect(restore).toHaveBeenCalledTimes(3);
    } finally {
      subscription.dispose();
      delete (worksheet as unknown as { setColumnWidth?: (col: number, width: number) => void }).setColumnWidth;
      redraw.mockRestore();
      scheduleRedraw.mockRestore();
      measureText.mockRestore();
      restore.mockRestore();
      save.mockRestore();
      renderer.dispose();
    }
  });

  it('characterizes auto-size adoption during measurement before the next width write', () => {
    const container = document.createElement('div');
    setViewport(container, 320, 100);
    const worksheet = new Worksheet('PublicAutoSizeMidMeasurementAdoption', 1, 3);
    const firstValue = 'first-column-before-adoption';
    const transitionValue = 'second-column-adopts-owner';
    const formulaSentinel = 'third-column-formula-cache-sentinel';
    worksheet.setCellValue({ row: 1, col: 1 }, firstValue);
    worksheet.setCellValue({ row: 1, col: 2 }, transitionValue);
    worksheet.setCellFormula({ row: 1, col: 3 }, '=70+7', formulaSentinel);
    const renderer = new CanvasRenderer(container, worksheet, { debug: false });
    const context = (renderer as any).ctx as CanvasRenderingContext2D;
    const canvasCalls: string[] = [];
    const originalSave = context.save;
    const originalRestore = context.restore;
    const save = jest.spyOn(context, 'save').mockImplementation(() => {
      canvasCalls.push('save');
      originalSave.call(context);
    });
    const restore = jest.spyOn(context, 'restore').mockImplementation(() => {
      canvasCalls.push('restore');
      originalRestore.call(context);
    });
    const measurements: string[] = [];
    const measureText = jest.spyOn(context, 'measureText').mockImplementation(((text: string) => {
      const measured = String(text);
      measurements.push(measured);
      canvasCalls.push(`measure:${measured}`);
      if (measured === transitionValue) adoptWorksheetForTest(worksheet, 'public-auto-size-measurement-transition');
      return { width: measured.length * 10 } as TextMetrics;
    }) as typeof context.measureText);
    (renderer as any).textCache.cache.clear();
    const events: unknown[] = [];
    const subscription = worksheet.on((event) => events.push(event));
    const widthsBefore = [1, 2, 3].map((col) => worksheet.getColumnWidth(col));
    const calls: Array<[number, number]> = [];
    const originalSetColumnWidth = worksheet.setColumnWidth.bind(worksheet);
    Object.defineProperty(worksheet, 'setColumnWidth', {
      configurable: true,
      value: (col: number, width: number) => {
        calls.push([col, width]);
        originalSetColumnWidth(col, width);
      },
    });
    const scheduleRedraw = jest.spyOn(renderer, 'scheduleRedraw');
    const redraw = jest.spyOn(renderer, 'redraw');

    try {
      expect(() => renderer.autoSizeColumns({
        mode: 'all', includeHeader: false, padding: 0, minWidth: 1, maxWidth: 500,
      })).toThrow(/workbook-owned|adopted|unavailable/i);

      expect(calls.map(([col]) => col)).toEqual([]);
      expect([1, 2, 3].map((col) => worksheet.getColumnWidth(col))).toEqual(widthsBefore);
      expect(worksheet.getColumnWidth(2)).toBe(widthsBefore[1]);
      expect(worksheet.getColumnWidth(3)).toBe(widthsBefore[2]);
      expect(measurements).toEqual([firstValue, transitionValue]);
      expect(measurements).not.toContain(formulaSentinel);
      expect(renderer.sheetReadonly.getCellValue({ row: 1, col: 3 })).toBeNull();
      expect(events).toEqual([]);
      expect(scheduleRedraw).not.toHaveBeenCalled();
      expect(redraw).not.toHaveBeenCalled();
      expect(canvasCalls).toEqual([
        'save', `measure:${firstValue}`, 'restore',
        'save', `measure:${transitionValue}`, 'restore',
      ]);
      expect(save).toHaveBeenCalledTimes(2);
      expect(restore).toHaveBeenCalledTimes(2);
    } finally {
      subscription.dispose();
      delete (worksheet as unknown as { setColumnWidth?: (col: number, width: number) => void }).setColumnWidth;
      redraw.mockRestore();
      scheduleRedraw.mockRestore();
      measureText.mockRestore();
      restore.mockRestore();
      save.mockRestore();
      renderer.dispose();
    }
  });

  it('does not reuse cached formula-derived column values after Worksheet adoption', () => {
    const container = document.createElement('div');
    const worksheet = new Worksheet('CachedColumnValues', 4, 4);

    // The cached formula result is visible in standalone mode.
    worksheet.setCellFormula({ row: 1, col: 1 }, '=1+1', 777);

    const renderer = new CanvasRenderer(container, worksheet, {
      debug: false,
    });

    try {
      // Populate the renderer's distinct-value cache before adoption.
      const standaloneValues = renderer.getColumnDistinctValues(1, {
        domain: 'all',
      });

      expect(standaloneValues).toContainEqual({
        value: '777',
        count: 1,
      });

      // Transition the same Worksheet to workbook ownership.
      adoptWorksheetForTest(
        worksheet,
        'column-value-cache-adoption-owner',
      );

      // The observation handle already masks formula cached values.
      expect(
        renderer.sheetReadonly.getCellValue({ row: 1, col: 1 }),
      ).toBeNull();

      // Cached standalone observations must not be reused after adoption.
      const adoptedValues = renderer.getColumnDistinctValues(1, {
        domain: 'all',
      });

      expect(adoptedValues).not.toContainEqual({
        value: '777',
        count: 1,
      });

      // All four rows now read as empty through the guarded handle.
      expect(adoptedValues).toEqual([
        { value: '', count: 4 },
      ]);
    } finally {
      renderer.dispose();
    }
  });

  it('keeps visible and filtered distinct values guarded across Worksheet adoption', () => {
    const container = document.createElement('div');
    const worksheet = new Worksheet('VisibleFilteredColumnValues', 4, 4);
    worksheet.setCellFormula({ row: 1, col: 1 }, '=1+1', 777);
    worksheet.setCellValue({ row: 2, col: 1 }, 'ordinary');

    const renderer = new CanvasRenderer(container, worksheet, { debug: false });
    try {
      const allStandalone = renderer.getColumnDistinctValues(1, { domain: 'all' });
      expect(allStandalone).toContainEqual({ value: '777', count: 1 });

      expect(renderer.getColumnDistinctValues(1, { domain: 'visible' })).toContainEqual({
        value: '777',
        count: 1,
      });
      expect(renderer.getColumnDistinctValues(1, { domain: 'filtered' })).toContainEqual({
        value: '777',
        count: 1,
      });

      adoptWorksheetForTest(worksheet, 'visible-filtered-column-values-owner');

      // With row enumeration safe, both local-domain aggregations read formula
      // values through the owner-aware observation handle and mask the cache.
      const visible = renderer.getColumnDistinctValues(1, { domain: 'visible' });
      const filtered = renderer.getColumnDistinctValues(1, { domain: 'filtered' });
      expect(visible).toEqual([
        { value: '', count: 3 },
        { value: 'ordinary', count: 1 },
      ]);
      expect(filtered).toEqual(visible);
      expect(visible).not.toContainEqual({ value: '777', count: 1 });
      expect(filtered).not.toContainEqual({ value: '777', count: 1 });

      // The returned summary objects are detached from worksheet state.
      visible[0].value = 'mutated result';
      visible[0].count = 900;
      visible.push({ value: 'injected result', count: 1 });
      expect(worksheet.getCellValue({ row: 2, col: 1 })).toBe('ordinary');
      expect(renderer.getColumnDistinctValues(1, { domain: 'visible' })).toEqual([
        { value: '', count: 3 },
        { value: 'ordinary', count: 1 },
      ]);
    } finally {
      renderer.dispose();
    }
  });

  it('rejects visible distinct values when adopted formula caches determine row membership', () => {
    const container = document.createElement('div');
    const worksheet = new Worksheet('VisibleFormulaMembership', 4, 4);
    worksheet.setCellFormula({ row: 1, col: 1 }, '=1+1', 777);
    worksheet.setCellValue({ row: 2, col: 1 }, 777);
    worksheet.setCellValue({ row: 1, col: 2 }, 'visible-one');
    worksheet.setCellValue({ row: 2, col: 2 }, 'visible-two');
    worksheet.setColumnFilter(1, { type: 'equals', value: 777 });

    const renderer = new CanvasRenderer(container, worksheet, { debug: false });
    try {
      expect(renderer.getColumnDistinctValues(2, { domain: 'visible' })).toEqual([
        { value: 'visible-one', count: 1 },
        { value: 'visible-two', count: 1 },
      ]);

      adoptWorksheetForTest(worksheet, 'visible-formula-membership-owner');

      expect(() => renderer.getColumnDistinctValues(2, { domain: 'visible' })).toThrow(
        /formula cached values/,
      );
      // The raw source is unchanged; only the renderer's retained observation
      // handle masks the cached formula value after adoption.
      expect(worksheet.getCellValue({ row: 1, col: 1 })).toBe(777);
      expect(worksheet.getCell({ row: 1, col: 1 })?.formula).toBe('=1+1');
      expect(worksheet.getCellValue({ row: 1, col: 2 })).toBe('visible-one');
    } finally {
      renderer.dispose();
    }
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

    adoptWorksheetForTest(worksheet, 'renderer-drawing-owner');
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

    adoptWorksheetForTest(worksheet, 'plugin-value-owner');
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
    adoptWorksheetForTest(worksheet, 'function-plugin-owner');
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
    adoptWorksheetForTest(worksheet, 'late-worker-owner');
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
    adoptWorksheetForTest(worksheet, 'late-worker-failure-owner');
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
    adoptWorksheetForTest(workerWorksheet, 'adopted-worker-entry-owner');

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
    adoptWorksheetForTest(syncWorksheet, 'adopted-sync-entry-owner');

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
    adoptWorksheetForTest(worksheet, 'adopted-worker-cell-sync-owner');

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
    adoptWorksheetForTest(worksheet, 'adopted-worker-hydration-owner');

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
    adoptWorksheetForTest(worksheet, 'shadowed-worker-owner');

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

  it('does not continue worker hydration after a bridge callback adopts the worksheet', () => {
    const container = document.createElement('div');
    const worksheet = new Worksheet('ReentrantWorkerHydration', 4, 4);
    worksheet.setCellValue({ row: 1, col: 1 }, 'first standalone value');
    worksheet.setCellValue({ row: 1, col: 2 }, 'must not publish after adoption');
    worksheet.setCellFormula({ row: 1, col: 3 }, '=40+2', 42);
    const postAdoptionSubmissions: Array<{ kind: 'value' | 'formula'; row: number; col: number; payload: unknown }> = [];
    let adopted = false;
    const worker: FormulaWorkerBridge = {
      setCellValue: (row, col, value) => {
        if (!adopted) {
          adopted = true;
          adoptWorksheetForTest(worksheet, 'reentrant-worker-hydration-owner');
        } else {
          postAdoptionSubmissions.push({ kind: 'value', row, col, payload: value });
        }
        return Promise.resolve();
      },
      setCellFormula: (row, col, formula, value) => {
        postAdoptionSubmissions.push({ kind: 'formula', row, col, payload: { formula, value } });
        return Promise.resolve();
      },
      evaluateBatch: jest.fn().mockResolvedValue({ values: new Float64Array(), evaluated: 0, hasCycles: false }),
    };
    const renderer = new CanvasRenderer(container, worksheet, { debug: false });

    try {
      (renderer as any).replaceFormulaWorker(worker);

      expect(adopted).toBe(true);
      expect(postAdoptionSubmissions).toEqual([]);
      expect(renderer.sheetReadonly.getCellValue({ row: 1, col: 1 })).toBe('first standalone value');
      expect(renderer.sheetReadonly.getCellValue({ row: 1, col: 2 })).toBe('must not publish after adoption');
      expect(renderer.sheetReadonly.getCellValue({ row: 1, col: 3 })).toBeNull();
    } finally {
      renderer.dispose();
    }
  });

  it('blocks subsequent worker cell synchronization after adoption re-enters through the bridge', () => {
    const container = document.createElement('div');
    const worksheet = new Worksheet('ReentrantWorkerSync', 4, 4);
    let adopted = false;
    const postAdoptionSubmissions: Array<[number, number, unknown]> = [];
    const worker: FormulaWorkerBridge = {
      setCellValue: (row, col, value) => {
        if (!adopted) {
          adopted = true;
          adoptWorksheetForTest(worksheet, 'reentrant-worker-sync-owner');
        } else {
          postAdoptionSubmissions.push([row, col, value]);
        }
        return Promise.resolve();
      },
      setCellFormula: jest.fn().mockResolvedValue(undefined),
      evaluateBatch: jest.fn().mockResolvedValue({ values: new Float64Array(), evaluated: 0, hasCycles: false }),
    };
    const renderer = new CanvasRenderer(container, worksheet, {
      debug: false,
      formulaWorker: worker,
    });

    try {
      (renderer as any).syncFormulaWorkerCell({ row: 1, col: 1 }, { value: 'before transition' });
      expect(adopted).toBe(true);

      (renderer as any).syncFormulaWorkerCell({ row: 1, col: 2 }, { value: 'after transition' });

      expect(postAdoptionSubmissions).toEqual([]);
      expect((renderer.sheetReadonly as Worksheet).isWorkbookOwned()).toBe(true);
    } finally {
      renderer.dispose();
    }
  });

  it('does not synchronize a formula when worker creation adopts the worksheet', () => {
    const container = document.createElement('div');
    const worksheet = new Worksheet('SyncFactoryAdoptsWorksheet', 4, 4);
    const worker: FormulaWorkerBridge & { setCellValue: jest.Mock; setCellFormula: jest.Mock; evaluateBatch: jest.Mock; terminate: jest.Mock } = {
      setCellValue: jest.fn().mockResolvedValue(undefined),
      setCellFormula: jest.fn().mockResolvedValue(undefined),
      evaluateBatch: jest.fn().mockResolvedValue({ values: new Float64Array(), evaluated: 0, hasCycles: false }),
      terminate: jest.fn(),
    };
    const renderer = new CanvasRenderer(container, worksheet, {
      debug: false,
      formulaWorkerFactory: () => {
        adoptWorksheetForTest(worksheet, 'sync-factory-adopts-owner');
        return worker;
      },
    });

    try {
      (renderer as any).syncFormulaWorkerCell(
        { row: 1, col: 2 },
        { formula: '=A1*2', value: 10 },
      );

      expect((renderer.sheetReadonly as Worksheet).isWorkbookOwned()).toBe(true);
      expect(worker.setCellValue).not.toHaveBeenCalled();
      expect(worker.setCellFormula).not.toHaveBeenCalled();
      expect(worker.evaluateBatch).not.toHaveBeenCalled();
      expect(worker.terminate).toHaveBeenCalledTimes(1);
    } finally {
      renderer.dispose();
    }
  });

  it('does not submit a synchronization payload after existing-worker hydration adopts the worksheet', () => {
    const container = document.createElement('div');
    const worksheet = new Worksheet('SyncHydrationAdoptsWorksheet', 4, 4);
    worksheet.setCellValue({ row: 1, col: 1 }, 'hydration value');
    let adopted = false;
    const worker: FormulaWorkerBridge & { setCellValue: jest.Mock; setCellFormula: jest.Mock; evaluateBatch: jest.Mock; terminate: jest.Mock } = {
      setCellValue: jest.fn(() => {
        adopted = true;
        adoptWorksheetForTest(worksheet, 'sync-hydration-adopts-owner');
        return Promise.resolve();
      }),
      setCellFormula: jest.fn().mockResolvedValue(undefined),
      evaluateBatch: jest.fn().mockResolvedValue({ values: new Float64Array(), evaluated: 0, hasCycles: false }),
      terminate: jest.fn(),
    };
    const renderer = new CanvasRenderer(container, worksheet, {
      debug: false,
      formulaWorker: worker,
    });

    try {
      (renderer as any).syncFormulaWorkerCell(
        { row: 1, col: 3 },
        { formula: '=A1*2', value: 20 },
      );

      expect(adopted).toBe(true);
      expect(worker.setCellValue).toHaveBeenCalledTimes(1);
      expect(worker.setCellFormula).not.toHaveBeenCalled();
      expect(worker.evaluateBatch).not.toHaveBeenCalled();
      expect(worker.terminate).not.toHaveBeenCalled();
    } finally {
      renderer.dispose();
    }
  });

  it('stops synchronization when worker hydration disposes the renderer', () => {
    const container = document.createElement('div');
    const worksheet = new Worksheet('SyncHydrationDisposesRenderer', 4, 4);
    let renderer!: CanvasRenderer;
    let rendererDisposed = false;
    const worker: FormulaWorkerBridge & { setCellValue: jest.Mock; setCellFormula: jest.Mock; evaluateBatch: jest.Mock; terminate: jest.Mock } = {
      setCellValue: jest.fn(() => {
        rendererDisposed = true;
        renderer.dispose();
        return Promise.resolve();
      }),
      setCellFormula: jest.fn().mockResolvedValue(undefined),
      evaluateBatch: jest.fn().mockResolvedValue({ values: new Float64Array(), evaluated: 0, hasCycles: false }),
      terminate: jest.fn(),
    };
    renderer = new CanvasRenderer(container, worksheet, {
      debug: false,
      formulaWorker: worker,
    });
    const syncOnFormulaChange = jest.spyOn(renderer as any, 'syncFormulaWorkerCell').mockImplementation(() => {});
    worksheet.setCellValue({ row: 1, col: 1 }, 'first value');
    worksheet.setCellValue({ row: 1, col: 2 }, 'second value');
    worksheet.setCellFormula({ row: 1, col: 3 }, '=A1+B1');
    syncOnFormulaChange.mockRestore();

    try {
      (renderer as any).syncFormulaWorkerCell(
        { row: 1, col: 4 },
        { formula: '=A1+B1+C1', value: 42 },
      );

      expect(rendererDisposed).toBe(true);
      expect(worker.setCellValue).toHaveBeenCalledTimes(1);
      expect(worker.setCellFormula).not.toHaveBeenCalled();
      expect(worker.evaluateBatch).not.toHaveBeenCalled();
      expect(worker.terminate).not.toHaveBeenCalled();
    } finally {
      if (!rendererDisposed) renderer.dispose();
    }
  });

  it('terminates a worker returned after synchronization disposes the renderer', () => {
    const container = document.createElement('div');
    const worksheet = new Worksheet('SyncFactoryDisposesRenderer', 4, 4);
    let renderer!: CanvasRenderer;
    let rendererDisposed = false;
    const worker: FormulaWorkerBridge & { setCellValue: jest.Mock; setCellFormula: jest.Mock; evaluateBatch: jest.Mock; terminate: jest.Mock } = {
      setCellValue: jest.fn().mockResolvedValue(undefined),
      setCellFormula: jest.fn().mockResolvedValue(undefined),
      evaluateBatch: jest.fn().mockResolvedValue({ values: new Float64Array(), evaluated: 0, hasCycles: false }),
      terminate: jest.fn(),
    };
    renderer = new CanvasRenderer(container, worksheet, {
      debug: false,
      formulaWorkerFactory: () => {
        rendererDisposed = true;
        renderer.dispose();
        return worker;
      },
    });

    try {
      (renderer as any).syncFormulaWorkerCell(
        { row: 1, col: 2 },
        { formula: '=A1*2', value: 10 },
      );

      expect(rendererDisposed).toBe(true);
      expect(worker.setCellValue).not.toHaveBeenCalled();
      expect(worker.setCellFormula).not.toHaveBeenCalled();
      expect(worker.evaluateBatch).not.toHaveBeenCalled();
      expect(worker.terminate).toHaveBeenCalledTimes(1);
    } finally {
      if (!rendererDisposed) renderer.dispose();
    }
  });

  it('preserves standalone worker synchronization for ordinary values and formulas', () => {
    const container = document.createElement('div');
    const worksheet = new Worksheet('StandaloneWorkerCellSync', 4, 4);
    const worker: FormulaWorkerBridge & { setCellValue: jest.Mock; setCellFormula: jest.Mock } = {
      setCellValue: jest.fn().mockResolvedValue(undefined),
      setCellFormula: jest.fn().mockResolvedValue(undefined),
      evaluateBatch: jest.fn().mockResolvedValue({ values: new Float64Array(), evaluated: 0, hasCycles: false }),
      terminate: jest.fn(),
    };
    const renderer = new CanvasRenderer(container, worksheet, {
      debug: false,
      formulaWorker: worker,
    });

    try {
      (renderer as any).syncFormulaWorkerCell({ row: 1, col: 1 }, { value: 'standalone value' });
      (renderer as any).syncFormulaWorkerCell(
        { row: 1, col: 2 },
        { formula: '=A1*2', value: 20 },
      );

      expect(worker.setCellValue).toHaveBeenCalledWith(1, 1, 'standalone value');
      expect(worker.setCellFormula).toHaveBeenCalledWith(1, 2, '=A1*2', 20);
    } finally {
      renderer.dispose();
    }
  });

  it('does not submit a formula batch when hydration adopts the worksheet', () => {
    const container = document.createElement('div');
    setViewport(container);
    const worksheet = new Worksheet('WorkerEvaluationAfterHydrationAdoption', 4, 4);
    worksheet.setCellValue({ row: 1, col: 1 }, 'hydration trigger');
    const worker: FormulaWorkerBridge & { evaluateBatch: jest.Mock; setCellFormula: jest.Mock } = {
      setCellValue: jest.fn(() => {
        adoptWorksheetForTest(worksheet, 'worker-evaluation-after-hydration-owner');
        return Promise.resolve();
      }),
      setCellFormula: jest.fn().mockResolvedValue(undefined),
      evaluateBatch: jest.fn().mockResolvedValue({ values: new Float64Array([42]), evaluated: 1, hasCycles: false }),
    };
    const renderer = new CanvasRenderer(container, worksheet, {
      debug: false,
      formulaWorkerThreshold: 1,
      formulaWorker: worker,
    });
    const syncOnFormulaChange = jest.spyOn(renderer as any, 'syncFormulaWorkerCell').mockImplementation(() => {});
    worksheet.setCellFormula({ row: 1, col: 2 }, '=A1*2');
    worksheet.registerDependencies({ row: 1, col: 2 }, [{ row: 1, col: 1 }]);
    syncOnFormulaChange.mockRestore();
    worker.setCellFormula.mockClear();

    try {
      (renderer as any).evaluateVisibleFormulaCells();

      expect((renderer.sheetReadonly as Worksheet).isWorkbookOwned()).toBe(true);
      expect(worker.setCellValue).toHaveBeenCalledTimes(1);
      expect(worker.evaluateBatch).not.toHaveBeenCalled();
      expect(worker.setCellFormula).not.toHaveBeenCalled();
    } finally {
      renderer.dispose();
    }
  });

  it('does not enter synchronous evaluation when hydration adopts below the worker threshold', () => {
    const container = document.createElement('div');
    setViewport(container);
    const worksheet = new Worksheet('SyncFallbackAfterHydrationAdoption', 4, 4);
    worksheet.setCellValue({ row: 1, col: 1 }, 'hydration trigger');
    const worker: FormulaWorkerBridge & { evaluateBatch: jest.Mock; setCellFormula: jest.Mock } = {
      setCellValue: jest.fn(() => {
        adoptWorksheetForTest(worksheet, 'sync-fallback-after-hydration-owner');
        return Promise.resolve();
      }),
      setCellFormula: jest.fn().mockResolvedValue(undefined),
      evaluateBatch: jest.fn().mockResolvedValue({ values: new Float64Array(), evaluated: 0, hasCycles: false }),
    };
    const renderer = new CanvasRenderer(container, worksheet, {
      debug: false,
      formulaWorkerThreshold: 2,
      formulaWorker: worker,
    });
    const synchronousEvaluation = jest.fn();
    Object.defineProperty(worksheet, 'evaluateBatch', {
      value: synchronousEvaluation,
      configurable: true,
    });
    const syncOnFormulaChange = jest.spyOn(renderer as any, 'syncFormulaWorkerCell').mockImplementation(() => {});
    worksheet.setCellFormula({ row: 1, col: 2 }, '=A1*2');
    worksheet.registerDependencies({ row: 1, col: 2 }, [{ row: 1, col: 1 }]);
    syncOnFormulaChange.mockRestore();
    worker.setCellFormula.mockClear();

    try {
      expect(() => (renderer as any).evaluateVisibleFormulaCells()).not.toThrow();

      expect((renderer.sheetReadonly as Worksheet).isWorkbookOwned()).toBe(true);
      expect(worker.evaluateBatch).not.toHaveBeenCalled();
      expect(worker.setCellFormula).not.toHaveBeenCalled();
      expect(synchronousEvaluation).not.toHaveBeenCalled();
    } finally {
      renderer.dispose();
    }
  });

  it('does not evaluate formulas when worker creation adopts the worksheet', () => {
    const container = document.createElement('div');
    setViewport(container);
    const worksheet = new Worksheet('WorkerFactoryAdoptsWorksheet', 4, 4);
    worksheet.setCellValue({ row: 1, col: 1 }, 'retained ordinary value');
    const worker: FormulaWorkerBridge & { evaluateBatch: jest.Mock } = {
      setCellValue: jest.fn().mockResolvedValue(undefined),
      setCellFormula: jest.fn().mockResolvedValue(undefined),
      evaluateBatch: jest.fn().mockResolvedValue({ values: new Float64Array([42]), evaluated: 1, hasCycles: false }),
      terminate: jest.fn(),
    };
    const renderer = new CanvasRenderer(container, worksheet, {
      debug: false,
      formulaWorkerThreshold: 1,
      formulaWorkerFactory: () => {
        adoptWorksheetForTest(worksheet, 'worker-factory-adopts-owner');
        return worker;
      },
    });
    const internals = renderer as any;
    const syncOnFormulaChange = jest.spyOn(internals, 'syncFormulaWorkerCell').mockImplementation(() => {});
    worksheet.setCellFormula({ row: 1, col: 2 }, '=A1*2');
    worksheet.registerDependencies({ row: 1, col: 2 }, [{ row: 1, col: 1 }]);
    syncOnFormulaChange.mockRestore();

    try {
      internals.evaluateVisibleFormulaCells();

      expect((renderer.sheetReadonly as Worksheet).isWorkbookOwned()).toBe(true);
      expect(worker.setCellValue).not.toHaveBeenCalled();
      expect(worker.setCellFormula).not.toHaveBeenCalled();
      expect(worker.evaluateBatch).not.toHaveBeenCalled();
      expect(worker.terminate).toHaveBeenCalledTimes(1);
    } finally {
      renderer.dispose();
    }
  });

  it('preserves synchronous formula evaluation for a standalone worksheet without a worker', () => {
    const container = document.createElement('div');
    setViewport(container);
    const worksheet = new Worksheet('StandaloneSynchronousEvaluation', 4, 4);
    worksheet.setCellValue({ row: 1, col: 1 }, 5);
    worksheet.setCellFormula({ row: 1, col: 2 }, '=A1*2');
    worksheet.registerDependencies({ row: 1, col: 2 }, [{ row: 1, col: 1 }]);
    const renderer = new CanvasRenderer(container, worksheet, {
      debug: false,
      formulaWorkerThreshold: 2,
    });
    const originalEvaluateBatch = worksheet.evaluateBatch.bind(worksheet);
    const evaluateBatch = jest.fn((addresses: Array<{ row: number; col: number }>) =>
      originalEvaluateBatch(addresses),
    );
    Object.defineProperty(worksheet, 'evaluateBatch', {
      value: evaluateBatch,
      configurable: true,
    });

    try {
      (renderer as any).evaluateVisibleFormulaCells();

      expect(evaluateBatch).toHaveBeenCalledWith([{ row: 1, col: 2 }]);
    } finally {
      renderer.dispose();
    }
  });

  it('stops dirty-address preflight and worker processing after isDirty adopts the worksheet', () => {
    const observed = runDirtyPreflightAdoptionProbe('worker');

    expect(observed).toEqual({
      mode: 'worker',
      trace: [
        { stage: 'isDirty', address: { row: 1, col: 1 }, ownerAtEntry: false },
        { stage: 'adopted-during-isDirty' },
      ],
      actualDirtyResults: [true],
      adopted: true,
      factoryCalls: 0,
      hydrationValueCalls: 0,
      hydrationFormulaCalls: 0,
      workerEvaluationCalls: 0,
      synchronousEvaluationCalls: 0,
      ownerViewFormulaValues: [null, null],
    });
  });

  it('stops dirty-address preflight and synchronous fallback after isDirty adopts the worksheet', () => {
    const observed = runDirtyPreflightAdoptionProbe('sync');

    expect(observed).toEqual({
      mode: 'sync',
      trace: [
        { stage: 'isDirty', address: { row: 1, col: 1 }, ownerAtEntry: false },
        { stage: 'adopted-during-isDirty' },
      ],
      actualDirtyResults: [true],
      adopted: true,
      factoryCalls: 0,
      hydrationValueCalls: 0,
      hydrationFormulaCalls: 0,
      workerEvaluationCalls: 0,
      synchronousEvaluationCalls: 0,
      ownerViewFormulaValues: [null, null],
    });
  });

  it('stops formula discovery after getCell returns across a worksheet ownership transition', () => {
    const observed = runDirtyPreflightAdoptionProbe('getCell');

    expect(observed).toEqual({
      mode: 'getCell',
      trace: [
        { stage: 'isDirty', address: { row: 1, col: 1 }, ownerAtEntry: false },
        { stage: 'isDirty', address: { row: 1, col: 2 }, ownerAtEntry: false },
        { stage: 'getCell', address: { row: 1, col: 1 }, ownerAtEntry: false },
        { stage: 'adopted-during-getCell' },
      ],
      actualDirtyResults: [true, true],
      adopted: true,
      factoryCalls: 0,
      hydrationValueCalls: 0,
      hydrationFormulaCalls: 0,
      workerEvaluationCalls: 0,
      synchronousEvaluationCalls: 0,
      ownerViewFormulaValues: [null, null],
    });
  });

  it('preserves multi-address dirty preflight and synchronous evaluation for a standalone worksheet', () => {
    const observed = runDirtyPreflightAdoptionProbe('standalone');
    const trace = observed.trace as Array<Record<string, unknown>>;
    expect(observed.adopted).toBe(false);
    expect(observed.actualDirtyResults).toEqual([true, true]);
    expect(trace.filter((entry) => entry.stage === 'isDirty')).toHaveLength(2);
    expect(trace.filter((entry) => entry.stage === 'getCell')).toHaveLength(2);
    expect(observed.synchronousEvaluationCalls).toBe(1);
    expect(trace[trace.length - 1]).toMatchObject({
      stage: 'sync-evaluate',
      addresses: [{ row: 1, col: 1 }, { row: 1, col: 2 }],
    });
  });

  it('stops dirty-address preflight when isDirty disposes the renderer', () => {
    jest.isolateModules(() => {
      const { FormulaEngine: ProbeFormulaEngine, Worksheet: ProbeWorksheet } = jest.requireActual<typeof import('@cyber-sheet/core')>('@cyber-sheet/core');
      const { CanvasRenderer: ProbeCanvasRenderer } = jest.requireActual<typeof import('../src/CanvasRenderer')>('../src/CanvasRenderer');
      const trace: Array<Record<string, unknown>> = [];
      const originalIsDirty = ProbeWorksheet.prototype.isDirty;
      const originalGetCell = ProbeWorksheet.prototype.getCell;
      let worksheet: any;
      let renderer: any;
      let armed = false;
      let disposed = false;

      const isDirtySpy = jest.spyOn(ProbeWorksheet.prototype, 'isDirty').mockImplementation(function (
        this: any,
        address: { row: number; col: number },
      ) {
        if (armed) trace.push({ stage: 'isDirty-enter', address: { ...address } });
        const dirty = originalIsDirty.call(this, address);
        if (armed && !disposed) {
          trace.push({ stage: 'renderer-dispose' });
          renderer.dispose();
          disposed = true;
        }
        if (armed) trace.push({ stage: 'isDirty-return', dirty });
        return dirty;
      } as any);
      const getCellSpy = jest.spyOn(ProbeWorksheet.prototype, 'getCell').mockImplementation(function (
        this: any,
        address: { row: number; col: number },
      ) {
        if (armed) trace.push({ stage: 'getCell', address: { ...address } });
        return originalGetCell.call(this, address);
      } as any);

      try {
        const formulaEngine = new ProbeFormulaEngine() as unknown as ConstructorParameters<typeof ProbeWorksheet>[3];
        worksheet = new ProbeWorksheet('DisposeDuringDirtyPreflight', 4, 4, formulaEngine);
        const worker = {
          setCellValue: jest.fn(async () => undefined),
          setCellFormula: jest.fn(async () => undefined),
          evaluateBatch: jest.fn(async () => ({ values: new Float64Array(), evaluated: 0, hasCycles: false })),
          terminate: jest.fn(),
        };
        const factory = jest.fn(() => worker);
        renderer = new ProbeCanvasRenderer(document.createElement('div'), worksheet, {
          debug: false,
          formulaWorkerThreshold: 1,
          formulaWorkerFactory: factory,
        });
        const internals = renderer as any;
        const addresses = [{ row: 1, col: 1 }, { row: 1, col: 2 }];
        jest.spyOn(internals, 'getVisibleCellAddresses').mockReturnValue(addresses);
        const syncSpy = jest.spyOn(internals, 'syncFormulaWorkerCell').mockImplementation(() => {});
        worksheet.setCellFormula(addresses[0], '=1+1');
        worksheet.setCellFormula(addresses[1], '=2+2');
        worksheet.registerDependencies(addresses[0], []);
        worksheet.registerDependencies(addresses[1], []);
        syncSpy.mockRestore();
        const synchronousEvaluation = jest.fn();
        Object.defineProperty(worksheet, 'evaluateBatch', {
          value: synchronousEvaluation,
          configurable: true,
        });

        trace.length = 0;
        isDirtySpy.mockClear();
        getCellSpy.mockClear();
        armed = true;
        internals.evaluateVisibleFormulaCells();
        armed = false;

        expect(disposed).toBe(true);
        expect(trace).toEqual([
          { stage: 'isDirty-enter', address: { row: 1, col: 1 } },
          { stage: 'renderer-dispose' },
          { stage: 'isDirty-return', dirty: true },
        ]);
        expect(isDirtySpy).toHaveBeenCalledTimes(1);
        expect(getCellSpy).not.toHaveBeenCalled();
        expect(factory).not.toHaveBeenCalled();
        expect(worker.setCellValue).not.toHaveBeenCalled();
        expect(worker.setCellFormula).not.toHaveBeenCalled();
        expect(worker.evaluateBatch).not.toHaveBeenCalled();
        expect(synchronousEvaluation).not.toHaveBeenCalled();
        expect(worksheet.isWorkbookOwned()).toBe(false);
      } finally {
        armed = false;
        if (renderer && !disposed) renderer.dispose();
        isDirtySpy.mockRestore();
        getCellSpy.mockRestore();
      }
    });
  });

  it('does not continue renderer work after an entered evaluateBatch adopts the worksheet', () => {
    jest.isolateModules(() => {
      const { FormulaEngine: ProbeFormulaEngine, Worksheet: ProbeWorksheet } = jest.requireActual<typeof import('@cyber-sheet/core')>('@cyber-sheet/core');
      const { adoptWorksheetByWorkbook } = jest.requireActual<typeof import('../../core/src/worksheet')>('../../core/src/worksheet');
      const originalIsDirty = ProbeWorksheet.prototype.isDirty;
      const originalGetCell = ProbeWorksheet.prototype.getCell;
      const trace: Array<Record<string, unknown>> = [];
      let armed = false;
      let adopted = false;

      const isDirtySpy = jest.spyOn(ProbeWorksheet.prototype, 'isDirty').mockImplementation(function (
        this: any,
        address: { row: number; col: number },
      ) {
        if (armed) trace.push({ stage: 'isDirty', address: { ...address }, ownerAtEntry: adopted });
        return originalIsDirty.call(this, address);
      } as any);
      const getCellSpy = jest.spyOn(ProbeWorksheet.prototype, 'getCell').mockImplementation(function (
        this: any,
        address: { row: number; col: number },
      ) {
        if (armed) trace.push({ stage: 'getCell', address: { ...address }, ownerAtEntry: adopted });
        return originalGetCell.call(this, address);
      } as any);

      let renderer: any;
      let worksheet: any;
      let adoptionSubscription: { dispose(): void } | undefined;
      try {
        const formulaEngine = new ProbeFormulaEngine() as unknown as ConstructorParameters<typeof ProbeWorksheet>[3];
        worksheet = new ProbeWorksheet('AdoptionDuringEnteredEvaluation', 4, 4, formulaEngine);
        const container = document.createElement('div');
        const worker = {
          setCellValue: jest.fn((row: number, col: number, value: unknown) => {
            trace.push({ stage: 'worker-set-value', row, col, ownerAtCall: adopted });
            return Promise.resolve();
          }),
          setCellFormula: jest.fn((row: number, col: number, formula: string, value: unknown) => {
            trace.push({ stage: 'worker-set-formula', row, col, formula, value, ownerAtCall: adopted });
            return Promise.resolve();
          }),
          evaluateBatch: jest.fn((addresses: Array<{ row: number; col: number }>) => {
            trace.push({ stage: 'worker-evaluate', addresses, ownerAtCall: adopted });
            return Promise.resolve({ values: new Float64Array(addresses.length), evaluated: addresses.length, hasCycles: false });
          }),
          terminate: jest.fn(),
        };
        const { CanvasRenderer: ProbeCanvasRenderer } = jest.requireActual<typeof import('../src/CanvasRenderer')>('../src/CanvasRenderer');
        renderer = new ProbeCanvasRenderer(container, worksheet, {
          debug: false,
          formulaWorkerThreshold: 2,
          formulaWorker: worker,
        });
        const internals = renderer as any;
        const formulaAddress = { row: 1, col: 2 };
        jest.spyOn(internals, 'getVisibleCellAddresses').mockReturnValue([formulaAddress]);
        const syncSpy = jest.spyOn(internals, 'syncFormulaWorkerCell').mockImplementation(() => {});
        worksheet.setCellValue({ row: 1, col: 1 }, 40);
        worksheet.setCellFormula(formulaAddress, '=A1+2');
        worksheet.registerDependencies(formulaAddress, [{ row: 1, col: 1 }]);
        syncSpy.mockRestore();

        const originalEvaluateBatch = worksheet.evaluateBatch.bind(worksheet);
        const evaluateBatchSpy = jest.fn((addresses: Array<{ row: number; col: number }>) => {
          trace.push({ stage: 'evaluateBatch-enter', addresses: addresses.map((address) => ({ ...address })), ownerAtEntry: adopted });
          const result = originalEvaluateBatch(addresses);
          trace.push({ stage: 'evaluateBatch-core-return', evaluated: result.evaluated, ownerAtReturn: adopted });
        trace.push({ stage: 'evaluateBatch-wrapper-return' });
          return result;
        });
        Object.defineProperty(worksheet, 'evaluateBatch', {
          value: evaluateBatchSpy,
          configurable: true,
        });
        adoptionSubscription = worksheet.on((event: any) => {
          if (
            armed && !adopted && event.type === 'cell-changed' &&
            event.address?.row === formulaAddress.row && event.address?.col === formulaAddress.col
          ) {
            trace.push({ stage: 'adopt-during-evaluateBatch-result-event' });
            adoptWorksheetByWorkbook(worksheet, 'h54-entered-evaluate-batch-owner');
            adopted = true;
          }
        });

        trace.length = 0;
        isDirtySpy.mockClear();
        getCellSpy.mockClear();
        armed = true;
        trace.push({ stage: 'renderer-pass-enter' });
        internals.evaluateVisibleFormulaCells();
        trace.push({ stage: 'renderer-pass-return' });
        armed = false;

        const adoptedContinuation = trace.filter((entry) =>
          (entry.stage === 'isDirty' || entry.stage === 'getCell') && entry.ownerAtEntry === true,
        );
        const postAdoptionWorkerCalls = trace.filter((entry) =>
          String(entry.stage).startsWith('worker-') && entry.ownerAtCall === true,
        );
        const preAdoptionWorkerCalls = trace.filter((entry) =>
          String(entry.stage).startsWith('worker-') && entry.ownerAtCall === false,
        );
        expect(adopted).toBe(true);
        expect(evaluateBatchSpy).toHaveBeenCalledTimes(1);
        expect(evaluateBatchSpy.mock.results[0].value.evaluated).toBeGreaterThan(0);
        expect(worksheet.getCellValue(formulaAddress)).toBe(42);
        expect(worker.evaluateBatch).not.toHaveBeenCalled();
        expect(preAdoptionWorkerCalls.length).toBeGreaterThan(0);
        expect(adoptedContinuation).toEqual([]);
        expect(postAdoptionWorkerCalls).toEqual([]);
        const evaluationEntry = trace.findIndex((entry) => entry.stage === 'evaluateBatch-enter');
        const adoptionDuringEvaluation = trace.findIndex((entry) => entry.stage === 'adopt-during-evaluateBatch-result-event');
        const coreReturn = trace.findIndex((entry) => entry.stage === 'evaluateBatch-core-return');
        const wrapperReturn = trace.findIndex((entry) => entry.stage === 'evaluateBatch-wrapper-return');
        const rendererReturn = trace.findIndex((entry) => entry.stage === 'renderer-pass-return');
        expect(evaluationEntry).toBeLessThan(adoptionDuringEvaluation);
        expect(adoptionDuringEvaluation).toBeLessThan(coreReturn);
        expect(coreReturn).toBeLessThan(wrapperReturn);
        expect(wrapperReturn).toBeLessThan(rendererReturn);
        expect(trace.slice(adoptionDuringEvaluation + 1).map((entry) => entry.stage)).toEqual([
          'evaluateBatch-core-return',
          'evaluateBatch-wrapper-return',
          'renderer-pass-return',
        ]);
        expect(trace[trace.length - 1]).toEqual({ stage: 'renderer-pass-return' });
        expect(worksheet.isWorkbookOwned()).toBe(true);
      } finally {
        armed = false;
        adoptionSubscription?.dispose();
        renderer?.dispose();
        isDirtySpy.mockRestore();
        getCellSpy.mockRestore();
      }
    });
  });

  it('stops worker hydration when a bridge callback disposes the renderer', () => {
    const container = document.createElement('div');
    setViewport(container);
    const worksheet = new Worksheet('WorkerHydrationRendererDisposal', 4, 4);
    let renderer!: CanvasRenderer;
    let rendererDisposed = false;
    const worker: FormulaWorkerBridge & { evaluateBatch: jest.Mock; setCellValue: jest.Mock; setCellFormula: jest.Mock; terminate: jest.Mock } = {
      setCellValue: jest.fn(() => {
        rendererDisposed = true;
        renderer.dispose();
        return Promise.resolve();
      }),
      setCellFormula: jest.fn().mockResolvedValue(undefined),
      evaluateBatch: jest.fn().mockResolvedValue({ values: new Float64Array([42]), evaluated: 1, hasCycles: false }),
      terminate: jest.fn(),
    };
    renderer = new CanvasRenderer(container, worksheet, {
      debug: false,
      formulaWorkerThreshold: 1,
      formulaWorkerFactory: () => worker,
    });
    const syncOnFormulaChange = jest.spyOn(renderer as any, 'syncFormulaWorkerCell').mockImplementation(() => {});
    worksheet.setCellValue({ row: 1, col: 1 }, 'first value');
    worksheet.setCellValue({ row: 1, col: 2 }, 'second value');
    worksheet.setCellFormula({ row: 1, col: 3 }, '=A1+B1');
    worksheet.registerDependencies({ row: 1, col: 3 }, [
      { row: 1, col: 1 },
      { row: 1, col: 2 },
    ]);
    syncOnFormulaChange.mockRestore();
    const synchronousEvaluation = jest.fn();
    Object.defineProperty(worksheet, 'evaluateBatch', {
      value: synchronousEvaluation,
      configurable: true,
    });

    try {
      (renderer as any).evaluateVisibleFormulaCells();

      expect(rendererDisposed).toBe(true);
      expect(worker.setCellValue).toHaveBeenCalledTimes(1);
      expect(worker.setCellFormula).not.toHaveBeenCalled();
      expect(worker.evaluateBatch).not.toHaveBeenCalled();
      expect(synchronousEvaluation).not.toHaveBeenCalled();
      expect(worker.terminate).toHaveBeenCalledTimes(1);
    } finally {
      if (!rendererDisposed) renderer.dispose();
    }
  });

  it('terminates a formula worker when its factory disposes the renderer', () => {
    const container = document.createElement('div');
    setViewport(container);
    const worksheet = new Worksheet('WorkerFactoryRendererDisposal', 4, 4);
    let renderer!: CanvasRenderer;
    let rendererDisposed = false;
    const worker: FormulaWorkerBridge & { evaluateBatch: jest.Mock; setCellValue: jest.Mock; setCellFormula: jest.Mock; terminate: jest.Mock } = {
      setCellValue: jest.fn().mockResolvedValue(undefined),
      setCellFormula: jest.fn().mockResolvedValue(undefined),
      evaluateBatch: jest.fn().mockResolvedValue({ values: new Float64Array([42]), evaluated: 1, hasCycles: false }),
      terminate: jest.fn(),
    };
    renderer = new CanvasRenderer(container, worksheet, {
      debug: false,
      formulaWorkerThreshold: 1,
      formulaWorkerFactory: () => {
        rendererDisposed = true;
        renderer.dispose();
        return worker;
      },
    });
    const syncOnFormulaChange = jest.spyOn(renderer as any, 'syncFormulaWorkerCell').mockImplementation(() => {});
    worksheet.setCellValue({ row: 1, col: 1 }, 'retained value');
    worksheet.setCellFormula({ row: 1, col: 2 }, '=A1*2');
    worksheet.registerDependencies({ row: 1, col: 2 }, [{ row: 1, col: 1 }]);
    syncOnFormulaChange.mockRestore();
    const synchronousEvaluation = jest.fn();
    Object.defineProperty(worksheet, 'evaluateBatch', {
      value: synchronousEvaluation,
      configurable: true,
    });

    try {
      (renderer as any).evaluateVisibleFormulaCells();

      expect(rendererDisposed).toBe(true);
      expect(worker.setCellValue).not.toHaveBeenCalled();
      expect(worker.setCellFormula).not.toHaveBeenCalled();
      expect(worker.evaluateBatch).not.toHaveBeenCalled();
      expect(synchronousEvaluation).not.toHaveBeenCalled();
      expect(worker.terminate).toHaveBeenCalledTimes(1);
    } finally {
      if (!rendererDisposed) renderer.dispose();
    }
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

  it.each([
    { label: 'selected column', axis: 'col' as const, applyToAll: false, delta: 30 },
    { label: 'selected row', axis: 'row' as const, applyToAll: false, delta: 20 },
  ])('preserves standalone pointer resizing for a $label', ({ axis, applyToAll, delta }) => {
    const container = document.createElement('div');
    setViewport(container);
    const worksheet = new Worksheet('StandaloneSelectedResize', 3, 3);
    const renderer = new CanvasRenderer(container, worksheet, { debug: false });

    try {
      const fixture = beginPointerResize(renderer, worksheet, axis, applyToAll);
      expect(fixture.internals.resizeState).toMatchObject({ type: axis, index: 1, applyToAll: false });
      movePointerResize(fixture, axis, delta);
      fixture.internals.handleMouseUp(new MouseEvent('mouseup', {
        clientX: fixture.startX + (axis === 'col' ? delta : 0),
        clientY: fixture.startY + (axis === 'row' ? delta : 0),
      }));

      if (axis === 'col') {
        expect(worksheet.getColumnWidth(1)).toBe(fixture.startSize + delta);
        expect(worksheet.getColumnWidth(2)).not.toBe(fixture.startSize + delta);
      } else {
        expect(worksheet.getRowHeight(1)).toBe(fixture.startSize + delta);
        expect(worksheet.getRowHeight(2)).not.toBe(fixture.startSize + delta);
      }
      expect(fixture.internals.resizeState).toBeNull();
    } finally {
      renderer.dispose();
    }
  });

  it.each([
    { label: 'all columns', axis: 'col' as const, applyToAll: true, delta: 30 },
    { label: 'selected column', axis: 'col' as const, applyToAll: false, delta: 30 },
    { label: 'all rows', axis: 'row' as const, applyToAll: true, delta: 20 },
    { label: 'selected row', axis: 'row' as const, applyToAll: false, delta: 20 },
  ])('characterizes adopted pointer resize rejection and cleanup for $label', ({ axis, applyToAll, delta }) => {
    const container = document.createElement('div');
    setViewport(container);
    const worksheet = new Worksheet('AdoptedPointerResize', 3, 3);
    const renderer = new CanvasRenderer(container, worksheet, { debug: false });
    const events: unknown[] = [];
    const subscription = worksheet.on((event) => events.push(event));
    const dimensionValuesBefore = axis === 'col'
      ? Array.from({ length: worksheet.colCount }, (_, i) => worksheet.getColumnWidth(i + 1))
      : Array.from({ length: worksheet.rowCount }, (_, i) => worksheet.getRowHeight(i + 1));
    const mutationMethod = axis === 'col' ? 'setColumnWidth' : 'setRowHeight';
    const originalMutation = worksheet[mutationMethod].bind(worksheet);
    const mutation = jest.fn(originalMutation);
    Object.defineProperty(worksheet, mutationMethod, {
      configurable: true,
      value: mutation,
    });

    try {
      // Ownership changes on the retained renderer before pointer resize begins.
      adoptWorksheetForTest(worksheet, `adopted-pointer-resize-${axis}-${applyToAll}`);
      const fixture = beginPointerResize(renderer, worksheet, axis, applyToAll);
      const expectedCursor = axis === 'col' ? 'col-resize' : 'row-resize';
      expect(fixture.canvas.style.cursor).toBe(expectedCursor);
      expect(fixture.internals.resizeState).toMatchObject({
        type: axis,
        index: 1,
        applyToAll,
      });
      const dirtyCellsBefore = Array.from(fixture.internals.dirtyCells as Set<unknown>);
      const gridLinesNeedRedrawBefore = fixture.internals.gridLinesNeedRedraw;
      const scheduleRedraw = jest.spyOn(fixture.internals, 'scheduleRedraw');

      expect(() => movePointerResize(fixture, axis, delta)).toThrow(/unavailable|owned|adopted/i);
      expect(mutation).toHaveBeenCalledTimes(1);
      if (axis === 'col') {
        expect(mutation).toHaveBeenCalledWith(1, fixture.startSize + delta);
        expect(Array.from({ length: worksheet.colCount }, (_, i) => worksheet.getColumnWidth(i + 1)))
          .toEqual(dimensionValuesBefore);
      } else {
        expect(mutation).toHaveBeenCalledWith(1, fixture.startSize + delta);
        expect(Array.from({ length: worksheet.rowCount }, (_, i) => worksheet.getRowHeight(i + 1)))
          .toEqual(dimensionValuesBefore);
      }
      expect(events).toEqual([]);
      expect(Array.from(fixture.internals.dirtyCells as Set<unknown>)).toEqual(dirtyCellsBefore);
      expect(fixture.internals.gridLinesNeedRedraw).toBe(gridLinesNeedRedrawBefore);
      expect(scheduleRedraw).not.toHaveBeenCalled();

      // A rejected move leaves the resize active until the ordinary mouse-up
      // handler runs. Mouse-up clears the operation and immediately resets cursor.
      expect(fixture.internals.resizeState).not.toBeNull();
      fixture.internals.handleMouseUp(new MouseEvent('mouseup', {
        clientX: fixture.startX + (axis === 'col' ? delta : 0),
        clientY: fixture.startY + (axis === 'row' ? delta : 0),
      }));
      expect(fixture.internals.resizeState).toBeNull();
      expect(fixture.internals.isDragging).toBe(false);
      expect(fixture.canvas.style.cursor).toBe('default');

      // Ordinary hover after release does not resume a dimension write.
      fixture.internals.pendingMouseX = fixture.startX + (axis === 'col' ? 10 : 0);
      fixture.internals.pendingMouseY = fixture.startY + (axis === 'row' ? 10 : 0);
      expect(() => fixture.internals.processHover()).not.toThrow();
      expect(fixture.canvas.style.cursor).toBe('default');
      expect(mutation).toHaveBeenCalledTimes(1);
      expect(events).toEqual([]);
      expect(fixture.internals.resizeState).toBeNull();
      expect(scheduleRedraw).not.toHaveBeenCalled();
    } finally {
      delete (worksheet as any)[mutationMethod];
      subscription.dispose();
      renderer.dispose();
    }
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
