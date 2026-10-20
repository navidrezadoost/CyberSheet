import { Worksheet, WORKSHEET_OWNED_MUTATOR_METHODS, adoptWorksheetByWorkbook } from '../src/worksheet';
import { Workbook } from '../src/workbook';
import { InsertImageCommand } from '../src/commands/WorksheetCommands';
import type { ChartObject, ShapeObject } from '../src/DrawingLayer';

describe('R1 workbook-owned worksheet escapes', () => {
  test('standalone Worksheet keeps direct cell mutation behavior', () => {
    const worksheet = new Worksheet('Standalone', 4, 4);
    worksheet.setCellValue({ row: 1, col: 1 }, 'standalone');
    expect(worksheet.getCellValue({ row: 1, col: 1 })).toBe('standalone');
  });

  test('worksheet adoption rejects caller-supplied owner identities', () => {
    const worksheet = new Worksheet('Standalone', 4, 4);
    expect(() => worksheet.adoptByWorkbook('forged-owner', {})).toThrow(/owner-private/);
    worksheet.setCellValue({ row: 1, col: 1 }, 'still standalone');
    expect(worksheet.getCellValue({ row: 1, col: 1 })).toBe('still standalone');
  });

  test('adopted raw worksheet mutators reject before the first cell write', () => {
    const workbook = Workbook.create({ sheets: [{ name: 'Owned' }] });
    const raw = new Worksheet('Retained', 4, 4);
    adoptWorksheetByWorkbook(raw, workbook.workbookId);
    expect(() => raw.setCellValue({ row: 1, col: 1 }, 'blocked')).toThrow(/unavailable/);
    expect(raw.getCell({ row: 1, col: 1 })).toBeUndefined();
    expect(() => raw.clearCellContent({ row: 1, col: 1 })).toThrow(/unavailable/);
    expect(() => raw.setCellStyle({ row: 1, col: 1 }, { bold: true })).toThrow(/unavailable/);
    expect(() => Worksheet.prototype.setCellValue.call(raw, { row: 1, col: 1 }, 'prototype bypass')).toThrow(/unavailable/);
    expect(() => raw.getDrawingLayer()).toThrow(/unavailable/);
  });

  test('retained image command cannot expose the drawing layer after worksheet adoption', () => {
    const raw = new Worksheet('Standalone', 4, 4);
    const command = new InsertImageCommand(raw, {
      source: 'https://example.com/image.png',
      size: { width: 100, height: 50 },
      placement: 'floating',
    });
    command.execute();
    const imageId = command.imageId;
    expect(imageId).toBeDefined();
    expect(raw.getImages()).toHaveLength(1);

    adoptWorksheetByWorkbook(raw, 'test-owner');

    expect(() => command.getImage()).toThrow(/unavailable/);
    expect(raw.getImages().map((image) => image.id)).toEqual([imageId]);
  });

  test('drawing layer and nested object aliases retained before adoption are detached', () => {
    const raw = new Worksheet('Standalone', 4, 4);
    const retainedLayer = raw.getDrawingLayer();
    const retainedPicture = retainedLayer.addPicture({
      id: 'retained-picture',
      source: 'data:image/png;base64,AAAA',
      sourceType: 'dataUri',
      position: { x: 1, y: 2 },
      size: { width: 10, height: 10 },
    });
    const retainedPosition = retainedPicture.position;

    adoptWorksheetByWorkbook(raw, 'test-owner');

    // The old layer and object remain mutable for their original caller, but
    // they must no longer alias the drawing state held by the adopted sheet.
    retainedPosition.x = 99;
    retainedPicture.size.width = 500;
    retainedLayer.removeObject('retained-picture');
    retainedLayer.addPicture({
      id: 'late-picture',
      source: 'data:image/png;base64,BBBB',
      sourceType: 'dataUri',
      position: { x: 20, y: 20 },
      size: { width: 3, height: 3 },
    });

    expect(raw.getImages()).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'retained-picture',
        position: { x: 1, y: 2 },
        size: { width: 10, height: 10 },
      }),
    ]));
    expect(raw.getImages().map((image) => image.id)).toEqual(['retained-picture']);
    expect(raw.extractSnapshot().drawings?.objects.map((object) => object.id)).toEqual(['retained-picture']);
  });

  test('adoption preserves drawing object types, metadata, and z-order while detaching aliases', () => {
    const raw = new Worksheet('Standalone', 4, 4);
    const retainedLayer = raw.getDrawingLayer();
    retainedLayer.addPicture({
      id: 'picture',
      source: 'data:image/png;base64,AAAA',
      sourceType: 'dataUri',
      position: { x: 1, y: 2 },
      size: { width: 10, height: 11 },
    });
    const shape: ShapeObject = {
      id: 'shape', type: 'shape', name: 'Shape', shapeType: 'rectangle',
      position: { x: 3, y: 4 }, size: { width: 20, height: 21 }, rotation: 15,
      zIndex: 2, locked: false, visible: true, altText: 'shape metadata',
      fill: { type: 'solid', color: '#123456', transparency: 10 },
      line: { color: '#654321', width: 2, style: 'dashed' },
      shadow: { type: 'outer', color: '#111111', blur: 4, angle: 45, distance: 3, transparency: 20 },
    };
    retainedLayer.addObject(shape);
    const chart: ChartObject = {
      id: 'chart', type: 'chart', name: 'Chart', chartType: 'column', dataRange: 'A1:B4',
      position: { x: 5, y: 6 }, size: { width: 30, height: 31 }, rotation: 0,
      zIndex: 3, locked: false, visible: true, altText: '',
      chartData: { series: [{ name: 'Sales', values: [2, 4, 6] }] },
    };
    retainedLayer.addObject(chart);
    retainedLayer.bringToFront('picture');
    adoptWorksheetByWorkbook(raw, 'test-owner');

    shape.fill.color = '#ff0000';
    retainedLayer.sendToBack('picture');
    retainedLayer.removeObject('chart');
    const drawings = raw.extractSnapshot().drawings!;
    expect(drawings.zOrder).toEqual(['shape', 'chart', 'picture']);
    expect(drawings.objects.map((object) => object.type)).toEqual(['shape', 'chart', 'picture']);
    expect(drawings.objects[0]).toMatchObject({
      id: 'shape',
      rotation: 15,
      altText: 'shape metadata',
      fill: { type: 'solid', color: '#123456', transparency: 10 },
      shadow: { type: 'outer', blur: 4, distance: 3 },
    });
    expect(drawings.objects[1]).toMatchObject({
      id: 'chart',
      chartData: { series: [{ name: 'Sales', values: [2, 4, 6] }] },
    });
    expect(drawings.objects[2]).toMatchObject({ id: 'picture', sourceType: 'dataUri' });
    expect(() => JSON.stringify(drawings)).not.toThrow();
  });

  test('uncloneable drawing payload rejects adoption without changing standalone ownership', () => {
    const raw = new Worksheet('Standalone', 4, 4);
    const retainedLayer = raw.getDrawingLayer();
    const unsupportedChart: ChartObject = {
      id: 'bad-chart', type: 'chart', name: 'Bad chart', chartType: 'other', dataRange: 'A1:A1',
      position: { x: 0, y: 0 }, size: { width: 10, height: 10 }, rotation: 0,
      zIndex: 1, locked: false, visible: true, altText: '',
      chartData: { formatter: () => 'not serializable' },
    };
    retainedLayer.addObject(unsupportedChart);

    expect(() => adoptWorksheetByWorkbook(raw, 'test-owner')).toThrow(/serializable data/);
    expect(raw.isWorkbookOwned()).toBe(false);
    expect(raw.getDrawingLayer()).toBe(retainedLayer);
    raw.setCellValue({ row: 1, col: 1 }, 'still standalone');
    expect(raw.getCellValue({ row: 1, col: 1 })).toBe('still standalone');
    expect(retainedLayer.getObject('bad-chart')).toBeDefined();
  });

  test('symbols, accessors, Maps, Sets, and cycles reject atomically without invoking getters', () => {
    let getterCalls = 0;
    const accessorPayload = Object.defineProperty({}, 'value', {
      enumerable: true,
      get() { getterCalls += 1; return 'side effect'; },
    });
    const symbolPayload = {};
    Object.defineProperty(symbolPayload, Symbol('hidden drawing data'), {
      enumerable: true,
      value: { mutable: true },
    });
    const cyclicPayload: { self?: unknown } = {};
    cyclicPayload.self = cyclicPayload;
    const unsupportedPayloads: Array<[string, unknown]> = [
      ['accessor', accessorPayload],
      ['symbol-keyed property', symbolPayload],
      ['Map', new Map([['key', { mutable: true }]])],
      ['Set', new Set([{ mutable: true }])],
      ['cycle', cyclicPayload],
    ];

    for (const [label, chartData] of unsupportedPayloads) {
      const raw = new Worksheet(`Standalone ${label}`, 4, 4);
      const retainedLayer = raw.getDrawingLayer();
      const chart: ChartObject = {
        id: `chart-${label}`, type: 'chart', name: 'Chart', chartType: 'other', dataRange: 'A1:A1',
        position: { x: 0, y: 0 }, size: { width: 10, height: 10 }, rotation: 0,
        zIndex: 1, locked: false, visible: true, altText: '', chartData,
      };
      retainedLayer.addObject(chart);

      expect(() => adoptWorksheetByWorkbook(raw, 'test-owner')).toThrow();
      expect(raw.isWorkbookOwned()).toBe(false);
      expect(raw.getDrawingLayer()).toBe(retainedLayer);
      expect(retainedLayer.getObject(`chart-${label}`)).toBe(chart);
      raw.setCellValue({ row: 1, col: 1 }, 'still standalone');
      expect(raw.getCellValue({ row: 1, col: 1 })).toBe('still standalone');
    }
    expect(getterCalls).toBe(0);
  });

  test('top-level drawing accessors are rejected without evaluating them', () => {
    const raw = new Worksheet('Standalone', 4, 4);
    const retainedLayer = raw.getDrawingLayer();
    const picture = retainedLayer.addPicture({
      id: 'accessor-picture',
      source: 'data:image/png;base64,AAAA',
      sourceType: 'dataUri',
      position: { x: 0, y: 0 },
      size: { width: 10, height: 10 },
    });
    let getterCalls = 0;
    Object.defineProperty(picture, 'altText', {
      configurable: true,
      enumerable: true,
      get() { getterCalls += 1; return 'side effect'; },
    });

    expect(() => adoptWorksheetByWorkbook(raw, 'test-owner')).toThrow(/accessors/);
    expect(getterCalls).toBe(0);
    expect(raw.isWorkbookOwned()).toBe(false);
    expect(raw.getDrawingLayer()).toBe(retainedLayer);
  });

  test('every registered owned mutation entry rejects before entering its implementation', () => {
    const raw = new Worksheet('Retained', 4, 4);
    adoptWorksheetByWorkbook(raw, 'test-owner');

    for (const methodName of WORKSHEET_OWNED_MUTATOR_METHODS) {
      const descriptor = Object.getOwnPropertyDescriptor(Worksheet.prototype, methodName);
      expect(descriptor?.value || descriptor?.set).toBeDefined();
      if (typeof descriptor?.value === 'function') {
        expect(() => Reflect.apply(descriptor.value, raw, []))
          .toThrow(/unavailable/);
      } else {
        expect(() => Reflect.set(raw, methodName, 999))
          .toThrow(/unavailable/);
      }
    }
  });

  test('adopted raw reads detach nested cell and filter state', () => {
    const raw = new Worksheet('Retained', 4, 4);
    raw.setCellValue({ row: 1, col: 1 }, 'before adoption');
    raw.addComment({ row: 1, col: 1 }, { text: 'original', author: 'test' });
    raw.setColumnFilter(1, { type: 'in', value: ['keep', 'also keep'] });
    raw.setCellStyle({ row: 1, col: 1 }, {
      fill: { type: 'gradient', gradientType: 'linear', stops: [
        { position: 0, color: '#000000' }, { position: 1, color: '#ffffff' },
      ] },
    });
    raw.setConditionalFormattingRules([{
      type: 'value', operator: '>', value: 0,
      ranges: [{ start: { row: 1, col: 1 }, end: { row: 2, col: 2 } }],
    }]);
    raw.setCellComponent({ row: 1, col: 1 }, {
      type: 'icon', id: 'badge', props: { nested: { label: 'original' } },
    });
    raw.insertImage({
      id: 'image', source: 'data:image/png;base64,AAAA', sourceType: 'dataUri',
      naturalWidth: 10, naturalHeight: 10, position: { x: 1, y: 2 },
      size: { width: 5, height: 5 },
    });
    adoptWorksheetByWorkbook(raw, 'test-owner');

    const cell = raw.getCell({ row: 1, col: 1 })!;
    expect(Object.isFrozen(cell.comments)).toBe(true);
    expect(() => { (cell.comments![0] as { text: string }).text = 'changed'; }).toThrow();
    expect(raw.getComments({ row: 1, col: 1 })[0].text).toBe('original');

    let retainedCallbackCell: Readonly<import('../src/types').Cell> | undefined;
    raw.forEachNonEmptyCell((_row, _col, escapedCell) => {
      retainedCallbackCell = escapedCell;
      expect(() => { escapedCell.comments[0].text = 'changed through callback'; }).toThrow();
    });
    expect(() => { retainedCallbackCell!.comments![0].text = 'changed after callback'; }).toThrow();
    expect(raw.getComments({ row: 1, col: 1 })[0].text).toBe('original');

    const filter = raw.getColumnFilter(1)!;
    expect(() => (filter.value as string[]).push('mutated')).toThrow();
    const allFilters = raw.getAllFilters();
    expect(() => (allFilters.get(1)!.value as string[]).push('also mutated')).toThrow();
    expect(raw.getColumnFilter(1)?.value).toEqual(['keep', 'also keep']);

    const style = raw.getDirectCellStyle({ row: 1, col: 1 })!;
    expect(() => { (style.fill as { stops: Array<{ color: string }> }).stops[0].color = '#ff0000'; }).toThrow();
    expect((raw.getDirectCellStyle({ row: 1, col: 1 })!.fill as { stops: Array<{ color: string }> }).stops[0].color).toBe('#000000');

    const rules = raw.getConditionalFormattingRules();
    expect(() => { rules[0].ranges![0].start.row = 9; }).toThrow();
    expect(raw.getConditionalFormattingRules()[0].ranges![0].start.row).toBe(1);

    const components = raw.getAllCellComponents();
    expect(() => { (components[0].component.props!.nested as { label: string }).label = 'changed'; }).toThrow();
    expect((raw.getCellComponent({ row: 1, col: 1 })!.props!.nested as { label: string }).label).toBe('original');

    const images = raw.getImages();
    expect(() => { images[0].position.x = 99; }).toThrow();
    expect(raw.getImages()[0].position.x).toBe(1);

    const createdAt = raw.getAllComments()[0].comments[0].createdAt;
    createdAt.setTime(0);
    expect(raw.getComments({ row: 1, col: 1 })[0].createdAt.getTime()).not.toBe(0);

    const snapshot = raw.extractSnapshot();
    expect(() => { snapshot.cells[0].cell.comments![0].text = 'changed snapshot'; }).toThrow();
    expect(raw.getComments({ row: 1, col: 1 })[0].text).toBe('original');
    expect(() => { snapshot.drawings!.objects[0].position.x = 77; }).toThrow();
    expect(raw.getImages()[0].position.x).toBe(1);
  });

  test('adopted raw collection reads return detached Map, Set, and graph containers', () => {
    const raw = new Worksheet('Retained', 8, 8);
    raw.setColumnFilter(1, { type: 'equals', value: 'keep' });
    raw.hideRow(2);
    raw.hideCol(3);
    raw.registerDependencies({ row: 3, col: 1 }, [{ row: 2, col: 1 }]);
    raw.registerDependencies({ row: 4, col: 1 }, [{ row: 3, col: 1 }]);
    adoptWorksheetByWorkbook(raw, 'test-owner');

    const filters = raw.getAllFilters();
    filters.set(7, { type: 'equals', value: 'foreign' });
    filters.delete(1);
    expect(raw.getAllFilters().has(7)).toBe(false);
    expect(raw.getColumnFilter(1)?.value).toBe('keep');

    const hiddenRows = raw.getHiddenRows();
    Reflect.get(hiddenRows, 'add').call(hiddenRows, 6);
    expect(raw.isRowHidden(6)).toBe(false);
    expect(raw.isRowHidden(2)).toBe(true);

    const hiddenCols = raw.getHiddenCols();
    Reflect.get(hiddenCols, 'add').call(hiddenCols, 7);
    expect(raw.isColHidden(7)).toBe(false);
    expect(raw.isColHidden(3)).toBe(true);

    const precedents = raw.getPrecedents({ row: 3, col: 1 });
    precedents[0].row = 99;
    precedents.push({ row: 7, col: 7 });
    expect(raw.getPrecedents({ row: 3, col: 1 })).toEqual([{ row: 2, col: 1 }]);

    const dependents = raw.getDependents({ row: 3, col: 1 });
    dependents[0].row = 99;
    dependents.pop();
    expect(raw.getDependents({ row: 3, col: 1 })).toEqual([{ row: 4, col: 1 }]);
  });

  test('workbook-owned mutation entrypoints reject before state and events change', () => {
    const workbook = Workbook.create({ sheets: [{ name: 'Owned' }] });
    const raw = new Worksheet('Retained', 4, 4);
    adoptWorksheetByWorkbook(raw, workbook.workbookId);
    const events: unknown[] = [];
    raw.on((event) => events.push(event));

    const rejected: Array<() => unknown> = [
      () => raw.runTransaction(() => raw.setCellValue({ row: 1, col: 1 }, 'nested')),
      () => raw.setCellFormula({ row: 1, col: 1 }, '=1+1'),
      () => raw.applyCalculatedValue({ row: 1, col: 1 }, 2),
      () => raw.setConditionalFormattingRules([]),
      () => raw.mergeCells({ start: { row: 1, col: 1 }, end: { row: 2, col: 2 } }),
      () => raw.deleteCell({ row: 1, col: 1 }),
      () => raw.setHyperlink({ row: 1, col: 1 }, { target: 'https://example.invalid' }),
      () => raw.setFreezePanes(1, 1),
      () => raw.beginProgressiveLoad(),
      () => raw.applySnapshot(raw.extractSnapshot()),
    ];

    for (const attempt of rejected) expect(attempt).toThrow(/unavailable/);
    expect(raw.getCell({ row: 1, col: 1 })).toBeUndefined();
    expect(raw.getCellValue({ row: 1, col: 1 })).toBeNull();
    expect(raw.getFreezePanes()).toBeNull();
    expect(raw.getUsedRange()).toBeNull();
    expect(events).toEqual([]);
  });

  test('workbook lookup returns a view without mutation or drawing authority', () => {
    const workbook = Workbook.create({ sheets: [{ name: 'Owned' }] });
    const view = workbook.getSheet('Owned')!;
    expect('setCellValue' in view).toBe(false);
    expect('getDrawingLayer' in view).toBe(false);
    expect(Object.isFrozen(workbook.eventBus)).toBe(true);
    expect(Object.keys(workbook.eventBus).sort()).toEqual(['off', 'on', 'once']);
    expect('emit' in workbook.eventBus).toBe(false);
    expect('registerBridge' in workbook.eventBus).toBe(false);
  });

  test('R1 mutation port has stable typed calls that reject before any write', () => {
    const workbook = Workbook.create({ sheets: [{ name: 'Owned' }] });
    const view = workbook.getSheet('Owned')!;
    expect(Object.isFrozen(workbook.mutationPort)).toBe(true);
    expect(() => workbook.mutationPort.setCellValue(view, { row: 1, col: 1 }, 'blocked')).toThrow(/unavailable/);
    expect(() => workbook.mutationPort.setCellFormula(view, { row: 1, col: 1 }, '=1+1')).toThrow(/unavailable/);
    expect(() => workbook.mutationPort.clearCellContent(view, { row: 1, col: 1 })).toThrow(/unavailable/);
    expect(() => workbook.mutationPort.clearCellFormula(view, { row: 1, col: 1 })).toThrow(/unavailable/);
    expect(() => workbook.mutationPort.setCellStyle(view, { row: 1, col: 1 }, { bold: true })).toThrow(/unavailable/);
    expect(view.getCell({ row: 1, col: 1 })).toBeUndefined();
    expect(view.getUsedRange()).toBeNull();
  });

  test('owner and mutable services are not exposed as runtime workbook properties', () => {
    const workbook = Workbook.create({ sheets: [{ name: 'Owned' }] });
    for (const key of [
      'sheets', 'sheetsById', 'styleCache', 'pivotRegistry', 'pivotSnapshotStore',
      'pivotDependencyIndex', 'pivotInvalidationEngine', 'pivotRecomputeEngine',
      'pivotAnchorIndex', 'internalEventBus', 'eventBridgeManager', 'formulaEngine',
      'getStyleCache', 'getPivotRegistry', 'getPivotSnapshotStore', 'getPivotDependencyIndex',
      'getPivotInvalidationEngine', 'getPivotRecomputeEngine', 'getWorksheetInternal',
    ]) {
      expect(key in workbook).toBe(false);
    }
    expect(() => workbook.createPivot('blocked', 'ws-1', {
      rows: [], columns: [], values: [],
      sourceRange: { start: { row: 1, col: 1 }, end: { row: 1, col: 1 } },
    })).toThrow(/unavailable/);
  });
});
