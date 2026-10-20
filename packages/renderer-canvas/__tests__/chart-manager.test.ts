/**
 * chart-manager.test.ts
 * 
 * Tests for ChartManager
 * Week 12 Day 2: Data Integration
 */

import { Worksheet } from '@cyber-sheet/core';
import type { ChartCreateParams, ChartObject } from '@cyber-sheet/core';
import { adoptWorksheetByWorkbook } from '../../core/src/worksheet';
import { ChartManager } from '../src/ChartManager';

describe('ChartManager', () => {
  let worksheet: Worksheet;
  let manager: ChartManager;

  beforeEach(() => {
    worksheet = new Worksheet('TestSheet');
    manager = new ChartManager(worksheet);
  });

  test('rejects workbook-owned chart metadata writes before changing local chart state', () => {
    const ownedWorksheet = new Worksheet('OwnedSheet');
    adoptWorksheetByWorkbook(ownedWorksheet, 'test-workbook');
    const ownedManager = new ChartManager(ownedWorksheet);
    const events: unknown[] = [];
    ownedManager.on((event) => events.push(event));

    expect(() => ownedManager.create(createSampleChart())).toThrow(/unavailable until R5/);
    expect(() => ownedManager.update('missing', { title: 'blocked' })).toThrow(/unavailable until R5/);
    expect(() => ownedManager.delete('missing')).toThrow(/unavailable until R5/);
    expect(() => ownedManager.deleteAll()).toThrow(/unavailable until R5/);
    expect(() => ownedManager.importFromJSON('[]')).toThrow(/unavailable until R5/);
    expect(ownedManager.count()).toBe(0);
    expect(events).toEqual([]);
    expect(Reflect.get(ownedWorksheet, 'metadata')).toBeUndefined();
  });

  test('keeps the source worksheet private and uses the core ownership brand for metadata guards', () => {
    const ownedWorksheet = new Worksheet('ShadowedOwnershipCheck');
    ownedWorksheet.setCellFormula({ row: 1, col: 1 }, '=40+2', 42);
    Object.defineProperty(ownedWorksheet, 'isWorkbookOwned', { value: () => false, configurable: true });
    adoptWorksheetByWorkbook(ownedWorksheet, 'shadowed-chart-manager-owner');

    const ownedManager = new ChartManager(ownedWorksheet);
    const events: unknown[] = [];
    ownedManager.on((event) => events.push(event));

    expect(Reflect.get(ownedManager, 'worksheet')).toBeUndefined();
    expect(() => ownedManager.create(createSampleChart())).toThrow(/unavailable until R5/);
    expect(ownedManager.count()).toBe(0);
    expect(events).toEqual([]);
    expect(Reflect.get(ownedWorksheet, 'metadata')).toBeUndefined();
  });

  test('reflection cannot retrieve or replace chart storage, listeners, or z-index state', () => {
    const forgedChart = { ...createSampleChart(), id: 'forged-chart' } as ChartObject;
    const forgedCharts = new Map([[forgedChart.id, forgedChart]]);
    const forgedListeners: Array<(event: unknown) => void> = [];
    const receivedEvents: string[] = [];

    expect(Reflect.get(manager, 'charts')).toBeUndefined();
    expect(Reflect.get(manager, 'listeners')).toBeUndefined();
    expect(Reflect.get(manager, 'nextZIndex')).toBeUndefined();
    Reflect.set(manager, 'charts', forgedCharts);
    Reflect.set(manager, 'listeners', forgedListeners);
    Reflect.set(manager, 'nextZIndex', 900);
    manager.on((event) => receivedEvents.push(event.type));

    expect(manager.count()).toBe(0);
    expect(manager.has(forgedChart.id)).toBe(false);
    expect(manager.getChartsAtPosition(200, 150)).toEqual([]);
    const params: ChartCreateParams = { ...createSampleChart() };
    Reflect.deleteProperty(params, 'zIndex');
    const created = manager.create(params);

    expect(created.zIndex).toBe(0);
    expect(manager.count()).toBe(1);
    expect(manager.has(forgedChart.id)).toBe(false);
    expect(receivedEvents).toEqual(['create']);
    expect(forgedListeners).toEqual([]);
  });

  test('rejects non-JSON chart inputs before cache, metadata, or event mutation', () => {
    const getter = jest.fn(() => ({ labels: ['getter'] }));
    const accessorMetadata = {};
    Object.defineProperty(accessorMetadata, 'nested', {
      enumerable: true,
      configurable: true,
      get: getter,
    });
    const customPrototypeMetadata = Object.assign(Object.create({ inherited: true }), { value: 'custom' });
    const cyclicMetadata: Record<string, unknown> = {};
    cyclicMetadata.self = cyclicMetadata;
    const nonEnumerableMetadata = {};
    Object.defineProperty(nonEnumerableMetadata, 'hidden', {
      enumerable: false,
      configurable: true,
      writable: true,
      value: 'not serialized',
    });
    const invalidMetadata: Array<[Record<string, unknown>, RegExp]> = [
      [accessorMetadata, /standard data property/],
      [customPrototypeMetadata, /custom prototypes/],
      [cyclicMetadata, /cyclic reference/],
      [nonEnumerableMetadata, /standard data property/],
      [{ date: new Date() }, /custom prototypes/],
      [{ omittedByJson: undefined }, /undefined is not JSON-compatible/],
      [{ nonFinite: Number.POSITIVE_INFINITY }, /number must be finite/],
      [{ callback: () => 'not data' }, /function is not JSON-compatible/],
      [{ sparse: new Array(1) }, /arrays must be dense/],
    ];
    const events: unknown[] = [];
    manager.on((event) => events.push(event));

    invalidMetadata.forEach(([metadata, reason]) => {
      expect(() => manager.create({ ...createSampleChart(), metadata })).toThrow(reason);
    });

    expect(getter).not.toHaveBeenCalled();
    expect(manager.count()).toBe(0);
    expect(manager.exportToJSON()).toBe('[]');
    expect(events).toEqual([]);
    expect(Reflect.get(worksheet, 'metadata')).toBeUndefined();
  });

  test('rejects invalid update graphs before replacing chart state or emitting', () => {
    const chart = manager.create(createSampleChart());
    const events: unknown[] = [];
    manager.on((event) => events.push(event));
    const beforeExport = manager.exportToJSON();
    const beforeMetadata = JSON.stringify(Reflect.get(worksheet, 'metadata'));
    const getter = jest.fn(() => 'not-read');
    const accessorMetadata = {};
    Object.defineProperty(accessorMetadata, 'value', {
      enumerable: true,
      configurable: true,
      get: getter,
    });
    const cyclicUpdateMetadata: Record<string, unknown> = {};
    cyclicUpdateMetadata.self = cyclicUpdateMetadata;
    const customPrototypeUpdateMetadata = Object.assign(Object.create({ inherited: true }), { value: 'custom' });

    expect(() => manager.update(chart.id, { metadata: accessorMetadata })).toThrow(/standard data property/);
    expect(() => manager.update(chart.id, { metadata: { loop: [accessorMetadata] } })).toThrow(/standard data property/);
    expect(() => manager.update(chart.id, { metadata: cyclicUpdateMetadata })).toThrow(/cyclic reference/);
    expect(() => manager.update(chart.id, { metadata: customPrototypeUpdateMetadata })).toThrow(/custom prototypes/);
    expect(getter).not.toHaveBeenCalled();
    expect(manager.exportToJSON()).toBe(beforeExport);
    expect(JSON.stringify(Reflect.get(worksheet, 'metadata'))).toBe(beforeMetadata);
    expect(events).toEqual([]);
  });

  test('preserves an own __proto__ metadata key safely across clone, serialization, export, and reload', () => {
    const standaloneWorksheet = new Worksheet('ProtoKeyCharts');
    const standaloneManager = new ChartManager(standaloneWorksheet);
    const metadata = JSON.parse('{"__proto__":{"marker":"input"}}') as Record<string, any>;
    const inputPrototype = Object.getPrototypeOf(metadata);
    const shared = { labels: ['shared'] };
    metadata.sharedA = shared;
    metadata.sharedB = shared;

    const created = standaloneManager.create({ ...createSampleChart(), metadata });
    const createdMetadata = created.metadata as Record<string, any>;

    expect(Object.getPrototypeOf(metadata)).toBe(inputPrototype);
    expect(Object.prototype.hasOwnProperty.call(metadata, '__proto__')).toBe(true);
    expect(Object.getPrototypeOf(createdMetadata)).toBe(Object.prototype);
    expect(Object.prototype.hasOwnProperty.call(createdMetadata, '__proto__')).toBe(true);
    expect(createdMetadata.__proto__).toEqual({ marker: 'input' });
    expect(createdMetadata.__proto__).not.toBe(metadata.__proto__);
    expect(createdMetadata.sharedA).toBe(createdMetadata.sharedB);
    expect(createdMetadata.sharedA).not.toBe(shared);

    const worksheetCharts = (Reflect.get(standaloneWorksheet, 'metadata') as { __charts__: ChartObject[] }).__charts__;
    const savedMetadata = worksheetCharts[0].metadata as Record<string, any>;
    const exportedChart = JSON.parse(standaloneManager.exportToJSON())[0] as ChartObject;
    const exportedMetadata = exportedChart.metadata as Record<string, any>;
    [savedMetadata, exportedMetadata].forEach((snapshot) => {
      expect(Object.getPrototypeOf(snapshot)).toBe(Object.prototype);
      expect(Object.prototype.hasOwnProperty.call(snapshot, '__proto__')).toBe(true);
      expect(snapshot.__proto__).toEqual({ marker: 'input' });
    });

    // JSON serialization intentionally duplicates shared acyclic nodes, while
    // cycles remain rejected by the strict input clone contract.
    expect(savedMetadata.sharedA).toEqual(savedMetadata.sharedB);
    expect(savedMetadata.sharedA).not.toBe(savedMetadata.sharedB);

    const loadedManager = new ChartManager(standaloneWorksheet);
    const loadedChart = loadedManager.get(created.id)!;
    const loadedSnapshot = loadedChart.metadata as Record<string, any>;
    expect(Object.getPrototypeOf(loadedSnapshot)).toBe(Object.prototype);
    expect(Object.prototype.hasOwnProperty.call(loadedSnapshot, '__proto__')).toBe(true);
    expect(loadedSnapshot.__proto__).toEqual({ marker: 'input' });

    adoptWorksheetByWorkbook(standaloneWorksheet, 'proto-key-chart-owner');
    metadata.__proto__.marker = 'input alias';
    createdMetadata.__proto__.marker = 'create result alias';
    savedMetadata.__proto__.marker = 'worksheet metadata alias';
    exportedMetadata.__proto__.marker = 'export alias';
    loadedSnapshot.__proto__.marker = 'query snapshot alias';

    expect(loadedManager.get(created.id)!.metadata!['__proto__']).toEqual({ marker: 'input' });
    expect(savedMetadata.__proto__).toEqual({ marker: 'worksheet metadata alias' });
    expect(exportedMetadata.__proto__).toEqual({ marker: 'export alias' });
    expect(JSON.parse(standaloneManager.exportToJSON())[0].metadata.__proto__).toEqual({ marker: 'input' });
    expect(Object.getPrototypeOf(metadata)).toBe(inputPrototype);
    expect(Object.getPrototypeOf(createdMetadata)).toBe(Object.prototype);
    expect(Object.getPrototypeOf(savedMetadata)).toBe(Object.prototype);
    expect(Object.getPrototypeOf(exportedMetadata)).toBe(Object.prototype);
    expect(Object.getPrototypeOf(loadedSnapshot)).toBe(Object.prototype);
  });

  test('query and event snapshots cannot mutate manager state after adoption', () => {
    const standaloneWorksheet = new Worksheet('StandaloneCharts');
    const standaloneManager = new ChartManager(standaloneWorksheet);
    let emittedChart: ChartObject | undefined;
    standaloneManager.on((event) => { if (event.type === 'create') emittedChart = event.chart; });
    const chart = standaloneManager.create({
      ...createSampleChart(),
      options: { showLegend: true, colors: ['#123456'] },
      metadata: { nested: { labels: ['before'] } },
    });
    const byId = standaloneManager.get(chart.id)!;
    const fromAll = standaloneManager.getAll()[0];
    const worksheetMetadata = Reflect.get(standaloneWorksheet, 'metadata') as {
      __charts__: ChartObject[];
    };
    const savedChart = worksheetMetadata.__charts__[0];

    expect(byId).not.toBe(chart);
    expect(fromAll).not.toBe(chart);
    expect(emittedChart).not.toBe(chart);
    expect(byId.position).not.toBe(chart.position);
    expect(fromAll.metadata).not.toBe(chart.metadata);
    expect(savedChart).not.toBe(chart);
    expect(savedChart.metadata).not.toBe(chart.metadata);

    adoptWorksheetByWorkbook(standaloneWorksheet, 'test-workbook');
    byId.position.x = 999;
    byId.size.width = 600;
    byId.options.colors?.push('#abcdef');
    (fromAll.metadata!.nested as { labels: string[] }).labels[0] = 'after';
    emittedChart!.dataRange.startRow = 2;
    emittedChart!.seriesDirection = 'rows';
    emittedChart!.title = 'mutated through retained event';

    // Retained query and event values are observations. Their nested edits do
    // not affect the manager-local chart cache or downstream consumers.
    expect(standaloneManager.get(chart.id)?.position.x).toBe(100);
    expect(standaloneManager.getChartsAtPosition(200, 150).map((item) => item.id)).toEqual([chart.id]);
    expect(standaloneManager.getChartsAtPosition(1000, 200).map((item) => item.id)).toEqual([]);
    const exportedChart = JSON.parse(standaloneManager.exportToJSON())[0] as ChartObject;
    expect(exportedChart.position.x).toBe(100);
    expect(exportedChart.size.width).toBe(400);
    expect(exportedChart.dataRange.startRow).toBe(1);
    expect(exportedChart.seriesDirection).toBe('columns');
    expect(exportedChart.options.colors).toEqual(['#123456']);
    expect((exportedChart.metadata!.nested as { labels: string[] }).labels).toEqual(['before']);
    expect(savedChart.position.x).toBe(100);
    expect(savedChart.size.width).toBe(400);
    expect(savedChart.dataRange.startRow).toBe(1);
    expect(savedChart.seriesDirection).toBe('columns');
    expect(savedChart.options.colors).toEqual(['#123456']);
    expect((savedChart.metadata!.nested as { labels: string[] }).labels).toEqual(['before']);
    expect(JSON.parse(standaloneManager.exportToJSON())[0].title).toBeUndefined();
    expect(() => standaloneManager.update(chart.id, { title: 'blocked' })).toThrow(/unavailable until R5/);
    expect(savedChart.title).toBeUndefined();
  });

  test('isolates listener payloads, command results, and nested create/update inputs', () => {
    const input = {
      ...createSampleChart(),
      options: { colors: ['#123456'] },
      metadata: { nested: { labels: ['created'] } },
    };
    let firstCreateEvent: any;
    let secondCreateEvent: any;
    manager.on((event) => {
      if (event.type === 'create') {
        firstCreateEvent = event;
        event.type = 'delete';
        event.chart.options.colors?.push('#first-listener');
        (event.chart.metadata!.nested as { labels: string[] }).labels.push('first-listener');
      }
    });
    manager.on((event) => { if (event.type === 'create') secondCreateEvent = event; });

    const createResult = manager.create(input);
    expect(firstCreateEvent).not.toBe(secondCreateEvent);
    expect(firstCreateEvent.type).toBe('delete');
    expect(secondCreateEvent.type).toBe('create');
    expect(firstCreateEvent.chart).not.toBe(secondCreateEvent.chart);
    expect(secondCreateEvent.chart.options.colors).toEqual(['#123456']);
    expect((secondCreateEvent.chart.metadata!.nested as { labels: string[] }).labels).toEqual(['created']);

    const updateInput = {
      position: { x: 250, y: 260 },
      size: { width: 500, height: 350 },
      options: { colors: ['#654321'] },
      metadata: { nested: { labels: ['updated'] } },
      dataRange: { startRow: 2, startCol: 1, endRow: 6, endCol: 3 },
      seriesDirection: 'rows' as const,
    };
    const updateResult = manager.update(createResult.id, updateInput);

    adoptWorksheetByWorkbook(worksheet, 'retained-chart-input-output-owner');
    input.position.x = 999;
    input.options.colors.push('#input-mutation');
    input.metadata.nested.labels.push('input-mutation');
    updateInput.position.x = 888;
    updateInput.options.colors.push('#update-input-mutation');
    updateInput.metadata.nested.labels.push('update-input-mutation');
    createResult.position.x = 777;
    createResult.options.colors?.push('#create-result-mutation');
    updateResult.position.y = 999;
    (updateResult.metadata!.nested as { labels: string[] }).labels.push('result-mutation');

    const stored = manager.get(createResult.id)!;
    expect(stored.position).toEqual({ x: 250, y: 260 });
    expect(stored.size).toEqual({ width: 500, height: 350 });
    expect(stored.options.colors).toEqual(['#654321']);
    expect((stored.metadata!.nested as { labels: string[] }).labels).toEqual(['updated']);
    expect(stored.dataRange.startRow).toBe(2);
    expect(stored.seriesDirection).toBe('rows');
  });

  test('detaches chart objects loaded from worksheet metadata', () => {
    const savedWorksheet = new Worksheet('LoadedChartAliases');
    const savingManager = new ChartManager(savedWorksheet);
    savingManager.create({
      ...createSampleChart(),
      metadata: { nested: { labels: ['saved'] } },
    });
    const metadata = Reflect.get(savedWorksheet, 'metadata') as { __charts__: ChartObject[] };
    const loadedManager = new ChartManager(savedWorksheet);
    const loadedId = metadata.__charts__[0].id;
    adoptWorksheetByWorkbook(savedWorksheet, 'loaded-chart-alias-owner');

    metadata.__charts__[0].position.x = 999;
    (metadata.__charts__[0].metadata!.nested as { labels: string[] }).labels[0] = 'external';

    expect(loadedManager.get(loadedId)?.position.x).toBe(100);
    expect((loadedManager.get(loadedId)?.metadata!.nested as { labels: string[] }).labels).toEqual(['saved']);
  });

  test('skips unsupported metadata-loaded chart graphs without invoking accessors', () => {
    const getter = jest.fn(() => ({ value: 'external' }));
    const accessorMetadata = {};
    Object.defineProperty(accessorMetadata, 'nested', {
      enumerable: true,
      configurable: true,
      get: getter,
    });
    const invalidChart = { ...createSampleChart(), id: 'invalid-chart', metadata: accessorMetadata };
    const loadedWorksheet = new Worksheet('InvalidLoadedChart');
    Object.defineProperty(loadedWorksheet, 'metadata', {
      value: { __charts__: [invalidChart] },
      configurable: true,
      writable: true,
    });
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const loadedManager = new ChartManager(loadedWorksheet);

    expect(getter).not.toHaveBeenCalled();
    expect(loadedManager.count()).toBe(0);
    expect(loadedManager.get('invalid-chart')).toBeUndefined();
    expect(warn).toHaveBeenCalledWith('Failed to load chart:', expect.any(TypeError));
    warn.mockRestore();
  });

  test('detaches every public chart query derivative, including selected results', () => {
    const chart = manager.create({
      ...createSampleChart(),
      options: { colors: ['#123456'] },
      metadata: { nested: { labels: ['stored'] } },
    });
    const selectedResult = manager.select(chart.id);
    const observations = [
      manager.get(chart.id)!,
      manager.getAll()[0],
      manager.getByType('bar')[0],
      manager.getSelected()!,
      manager.getChartsAtPosition(200, 150)[0],
      manager.getTopmostChartAtPosition(200, 150)!,
      manager.getOverlappingCharts(150, 150, 20, 20)[0],
      selectedResult,
    ];

    observations.forEach((observation, index) => {
      observation.position.x = 1000 + index;
      observation.size.width = 1;
      observation.options.colors?.push(`mutated-${index}`);
      (observation.metadata!.nested as { labels: string[] }).labels.push(`mutated-${index}`);
    });

    const stored = manager.get(chart.id)!;
    expect(stored.position.x).toBe(100);
    expect(stored.size.width).toBe(400);
    expect(stored.options.colors).toEqual(['#123456']);
    expect((stored.metadata!.nested as { labels: string[] }).labels).toEqual(['stored']);
    expect(manager.getSelected()?.id).toBe(chart.id);
    expect(manager.getTopmostChartAtPosition(200, 150)?.id).toBe(chart.id);
  });

  const createSampleChart = (): ChartCreateParams => ({
    type: 'bar',
    dataRange: { startRow: 1, startCol: 1, endRow: 5, endCol: 3 },
    position: { x: 100, y: 100 },
    size: { width: 400, height: 300 },
    options: { showLegend: true },
    seriesDirection: 'columns',
    hasHeaderRow: true,
    hasHeaderCol: true,
    zIndex: 0
  });

  // ============================================================================
  // CRUD Operations (4 tests)
  // ============================================================================

  describe('CRUD Operations', () => {
    test('should create chart', () => {
      const params = createSampleChart();
      const chart = manager.create(params);

      expect(chart.id).toBeDefined();
      expect(chart.type).toBe('bar');
      expect(chart.position).toEqual({ x: 100, y: 100 });
      expect(chart.createdAt).toBeDefined();
      expect(chart.updatedAt).toBeDefined();
    });

    test('should get chart by ID', () => {
      const chart = manager.create(createSampleChart());
      const retrieved = manager.get(chart.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(chart.id);
    });

    test('should update chart', async () => {
      const chart = manager.create(createSampleChart());
      
      // Wait 1ms to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 2));
      
      const updated = manager.update(chart.id, {
        position: { x: 200, y: 200 },
        title: 'Updated Title'
      });

      expect(updated.position).toEqual({ x: 200, y: 200 });
      expect(updated.title).toBe('Updated Title');
      expect(updated.updatedAt).toBeGreaterThanOrEqual(chart.updatedAt);
    });

    test('should delete chart', () => {
      const chart = manager.create(createSampleChart());
      const deleted = manager.delete(chart.id);

      expect(deleted).toBe(true);
      expect(manager.get(chart.id)).toBeUndefined();
    });
  });

  // ============================================================================
  // Query Operations (2 tests)
  // ============================================================================

  describe('Query Operations', () => {
    test('should get all charts sorted by z-index', () => {
      const chart1 = manager.create({ ...createSampleChart(), zIndex: 2 });
      const chart2 = manager.create({ ...createSampleChart(), zIndex: 1 });
      const chart3 = manager.create({ ...createSampleChart(), zIndex: 3 });

      const all = manager.getAll();

      expect(all).toHaveLength(3);
      expect(all[0].id).toBe(chart2.id); // z-index 1
      expect(all[1].id).toBe(chart1.id); // z-index 2
      expect(all[2].id).toBe(chart3.id); // z-index 3
    });

    test('should get charts by type', () => {
      manager.create({ ...createSampleChart(), type: 'bar' });
      manager.create({ ...createSampleChart(), type: 'line' });
      manager.create({ ...createSampleChart(), type: 'bar' });

      const barCharts = manager.getByType('bar');
      const lineCharts = manager.getByType('line');

      expect(barCharts).toHaveLength(2);
      expect(lineCharts).toHaveLength(1);
    });
  });

  // ============================================================================
  // Selection (2 tests)
  // ============================================================================

  describe('Selection', () => {
    test('should select and deselect chart', () => {
      const chart = manager.create(createSampleChart());
      
      manager.select(chart.id);
      expect(manager.getSelected()?.id).toBe(chart.id);

      manager.deselect(chart.id);
      expect(manager.getSelected()).toBeUndefined();
    });

    test('should deselect others when selecting one', () => {
      const chart1 = manager.create(createSampleChart());
      const chart2 = manager.create(createSampleChart());

      manager.select(chart1.id);
      manager.select(chart2.id);

      const selected = manager.getSelected();
      expect(selected?.id).toBe(chart2.id);
      
      const chart1Updated = manager.get(chart1.id);
      expect(chart1Updated?.selected).toBe(false);
    });
  });

  // ============================================================================
  // Positioning (2 tests)
  // ============================================================================

  describe('Positioning', () => {
    test('should get charts at position', () => {
      manager.create({
        ...createSampleChart(),
        position: { x: 0, y: 0 },
        size: { width: 100, height: 100 }
      });

      const charts = manager.getChartsAtPosition(50, 50);
      expect(charts).toHaveLength(1);

      const noCharts = manager.getChartsAtPosition(200, 200);
      expect(noCharts).toHaveLength(0);
    });

    test('should get topmost chart at position', () => {
      const chart1 = manager.create({
        ...createSampleChart(),
        position: { x: 0, y: 0 },
        size: { width: 100, height: 100 },
        zIndex: 1
      });

      const chart2 = manager.create({
        ...createSampleChart(),
        position: { x: 0, y: 0 },
        size: { width: 100, height: 100 },
        zIndex: 2
      });

      const topmost = manager.getTopmostChartAtPosition(50, 50);
      expect(topmost?.id).toBe(chart2.id);
    });
  });

  // ============================================================================
  // Z-Index Management (2 tests)
  // ============================================================================

  describe('Z-Index Management', () => {
    test('should bring chart to front', () => {
      const chart1 = manager.create({ ...createSampleChart(), zIndex: 1 });
      const chart2 = manager.create({ ...createSampleChart(), zIndex: 2 });

      const updated = manager.bringToFront(chart1.id);

      expect(updated.zIndex).toBeGreaterThan(chart2.zIndex);
    });

    test('should send chart to back', () => {
      const chart1 = manager.create({ ...createSampleChart(), zIndex: 2 });
      const chart2 = manager.create({ ...createSampleChart(), zIndex: 3 });

      const updated = manager.sendToBack(chart2.id);

      expect(updated.zIndex).toBeLessThan(chart1.zIndex);
      expect(updated.zIndex).toBeGreaterThanOrEqual(0); // zIndex must be non-negative
    });
  });

  // ============================================================================
  // Event System (1 test)
  // ============================================================================

  describe('Event System', () => {
    test('should emit events for CRUD operations', () => {
      const events: any[] = [];
      const listener = (event: any) => events.push(event);

      manager.on(listener);

      const chart = manager.create(createSampleChart());
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('create');

      manager.update(chart.id, { title: 'Test' });
      expect(events).toHaveLength(2);
      expect(events[1].type).toBe('update');

      manager.delete(chart.id);
      expect(events).toHaveLength(3);
      expect(events[2].type).toBe('delete');

      manager.off(listener);
    });
  });

  // ============================================================================
  // Import/Export (1 test)
  // ============================================================================

  describe('Import/Export', () => {
    test('should export and import charts as JSON', () => {
      manager.create(createSampleChart());
      manager.create({ ...createSampleChart(), type: 'line' });

      const json = manager.exportToJSON();
      expect(json).toBeDefined();

      const newManager = new ChartManager(new Worksheet('NewSheet'));
      const imported = newManager.importFromJSON(json);

      expect(imported).toBe(2);
      expect(newManager.count()).toBe(2);
    });
  });
});
