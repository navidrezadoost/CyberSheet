/**
 * Tests for ChartInteractionManager  
 * Week 12 Day 4: CanvasRenderer Integration & Interactivity
 */

import { ChartInteractionManager } from '../src/ChartInteractionManager';
import { Worksheet } from '@cyber-sheet/core';
import { adoptWorksheetByWorkbook } from '../../core/src/worksheet';

// Mock HTMLCanvasElement
class MockCanvas {
  width = 800;
  height = 600;
  getBoundingClientRect() {
    return { left: 0, top: 0, width: 800, height: 600 };
  }
}

describe('ChartInteractionManager', () => {
  let worksheet: Worksheet;
  let canvas: MockCanvas;
  let manager: ChartInteractionManager;
  let redrawCalled: boolean;

  beforeEach(() => {
    worksheet = new Worksheet('TestSheet');
    canvas = new MockCanvas();
    redrawCalled = false;

    manager = new ChartInteractionManager(
      worksheet,
      canvas as any,
      () => { redrawCalled = true; }
    );

    // Setup test data
    for (let i = 0; i < 10; i++) {
      worksheet.setCellValue({ row: i + 1, col: 1 }, `Label ${i}`);
      worksheet.setCellValue({ row: i + 1, col: 2 }, Math.random() * 100);
    }
  });

  test('should create chart manager and renderer', () => {
    expect(manager.getChartManager()).toBeDefined();
    expect(manager.getChartRenderer()).toBeDefined();
  });

  test('manager reflection cannot replace state or suppress command-driven cache invalidation', () => {
    const chartManager = manager.getChartManager();
    const chartRenderer = manager.getChartRenderer();
    expect(Reflect.get(chartManager, 'charts')).toBeUndefined();
    expect(Reflect.get(chartManager, 'listeners')).toBeUndefined();
    expect(Reflect.get(chartManager, 'nextZIndex')).toBeUndefined();
    expect(Reflect.get(manager, 'chartManager')).toBeUndefined();
    expect(Reflect.get(manager, 'chartRenderer')).toBeUndefined();
    expect(Reflect.get(manager, 'redrawCallback')).toBeUndefined();
    expect(Reflect.get(chartRenderer, 'chartCache')).toBeUndefined();

    Reflect.set(chartManager, 'charts', new Map());
    Reflect.set(chartManager, 'listeners', []);
    Reflect.set(chartManager, 'nextZIndex', 900);
    Reflect.set(manager, 'redrawCallback', () => {});
    Reflect.set(manager, 'chartRenderer', {});
    Reflect.set(chartRenderer, 'chartCache', new Map());
    expect(manager.getChartRenderer()).toBe(chartRenderer);
    const invalidateSpy = jest.spyOn(chartRenderer, 'invalidateChart');
    const chart = chartManager.create({
      type: 'bar',
      dataRange: { startRow: 1, startCol: 1, endRow: 10, endCol: 2 },
      position: { x: 100, y: 100 },
      size: { width: 400, height: 300 },
      options: {},
      seriesDirection: 'columns',
      hasHeaderRow: true,
      hasHeaderCol: false,
      zIndex: 0,
    });
    invalidateSpy.mockClear();
    redrawCalled = false;

    chartManager.update(chart.id, { title: 'Updated through command API' });

    expect(chart.zIndex).toBe(0);
    expect(chartManager.getChartsAtPosition(200, 150).map((item) => item.id)).toEqual([chart.id]);
    expect(JSON.parse(chartManager.exportToJSON())[0].title).toBe('Updated through command API');
    expect(invalidateSpy).toHaveBeenCalledWith(chart.id);
    expect(redrawCalled).toBe(true);
  });

  test('rejects workbook-owned sheets until chart metadata has an owner-backed API', () => {
    const adopted = new Worksheet('WorkbookOwnedInteractionSheet');
    adoptWorksheetByWorkbook(adopted, 'chart-interaction-owner');

    expect(() => new ChartInteractionManager(adopted, canvas as any, () => {})).toThrow(
      /Workbook-owned chart interactions require a WorkbookSheetView/,
    );
  });

  test('retained event snapshots cannot alter interaction or render-cache state after adoption', () => {
    const chartManager = manager.getChartManager();
    let retainedEventChart: ReturnType<typeof chartManager.create> | undefined;
    chartManager.on((event) => {
      if (event.type === 'create') retainedEventChart = event.chart;
    });
    const chart = chartManager.create({
      type: 'bar',
      dataRange: { startRow: 1, startCol: 1, endRow: 10, endCol: 2 },
      position: { x: 100, y: 100 },
      size: { width: 400, height: 300 },
      options: { colors: ['#123456'] },
      seriesDirection: 'columns',
      hasHeaderRow: true,
      hasHeaderCol: false,
      zIndex: 0,
    });
    expect(retainedEventChart).not.toBe(chart);
    chartManager.select(chart.id);
    const chartRenderer = manager.getChartRenderer();
    expect(Reflect.get(chartRenderer, 'chartCache')).toBeUndefined();
    Reflect.set(chartRenderer, 'chartCache', new Map());
    const invalidateSpy = jest.spyOn(chartRenderer, 'invalidateChart');
    invalidateSpy.mockClear();
    redrawCalled = false;

    adoptWorksheetByWorkbook(worksheet, 'retained-chart-interaction-owner');
    expect(Reflect.get(chartManager, 'worksheet')).toBeUndefined();
    Reflect.set(manager, 'redrawCallback', () => {});
    Reflect.set(manager, 'chartRenderer', {});
    Reflect.set(chartRenderer, 'chartCache', new Map());
    expect(manager.getChartRenderer()).toBe(chartRenderer);
    retainedEventChart!.position.x = 600;
    retainedEventChart!.position.y = 350;
    retainedEventChart!.size.width = 150;
    retainedEventChart!.size.height = 100;
    retainedEventChart!.options.colors?.push('#abcdef');
    retainedEventChart!.dataRange.startRow = 2;
    retainedEventChart!.seriesDirection = 'rows';
    retainedEventChart!.metadata = { nested: { series: ['retained'] } };

    expect(manager.handleMouseMove(700, 400)).toEqual({ handled: false });
    expect(manager.handleMouseMove(250, 250)).toEqual({ handled: true, cursor: 'move' });
    expect(() => chartManager.update(chart.id, { title: 'blocked after adoption' })).toThrow(/unavailable until R5/);
    expect(redrawCalled).toBe(false);
    expect(invalidateSpy).not.toHaveBeenCalled();
    expect(chartManager.get(chart.id)?.options.colors).toEqual(['#123456']);
  });

  test('should select chart on click', () => {
    const chartMgr = manager.getChartManager();
    chartMgr.create({
      type: 'bar',
      dataRange: { startRow: 1, startCol: 1, endRow: 10, endCol: 2 },
      position: { x: 100, y: 100 },
      size: { width: 400, height: 300 },
      options: {},
      seriesDirection: 'columns',
      hasHeaderRow: true,
      hasHeaderCol: false,
      zIndex: 0
    });

    const handled = manager.handleMouseDown(250, 250);
    expect(handled).toBe(true);
    expect(chartMgr.getSelected()).toBeDefined();
  });

  test('should deselect when clicking outside', () => {
    const chartMgr = manager.getChartManager();
    const chart = chartMgr.create({
      type: 'bar',
      dataRange: { startRow: 1, startCol: 1, endRow: 10, endCol: 2 },
      position: { x: 100, y: 100 },
      size: { width: 400, height: 300 },
      options: {},
      seriesDirection: 'columns',
      hasHeaderRow: true,
      hasHeaderCol: false,
      zIndex: 0
    });

    chartMgr.select(chart.id);
    manager.handleMouseDown(50, 50);
    expect(chartMgr.getSelected()).toBeUndefined();
  });

  test('should drag chart', () => {
    const chartMgr = manager.getChartManager();
    const chart = chartMgr.create({
      type: 'bar',
      dataRange: { startRow: 1, startCol: 1, endRow: 10, endCol: 2 },
      position: { x: 100, y: 100 },
      size: { width: 400, height: 300 },
      options: {},
      seriesDirection: 'columns',
      hasHeaderRow: true,
      hasHeaderCol: false,
      zIndex: 0
    });

    manager.handleMouseDown(250, 250);
    manager.handleMouseMove(300, 300);

    const updated = chartMgr.get(chart.id);
    expect(updated?.position.x).toBe(150);
    expect(updated?.position.y).toBe(150);
  });

  test('should return move cursor when dragging', () => {
    const chartMgr = manager.getChartManager();
    chartMgr.create({
      type: 'bar',
      dataRange: { startRow: 1, startCol: 1, endRow: 10, endCol: 2 },
      position: { x: 100, y: 100 },
      size: { width: 400, height: 300 },
      options: {},
      seriesDirection: 'columns',
      hasHeaderRow: true,
      hasHeaderCol: false,
      zIndex: 0
    });

    manager.handleMouseDown(250, 250);
    const result = manager.handleMouseMove(300, 300);
    expect(result.cursor).toBe('move');
  });

  test('should resize chart from handle', () => {
    const chartMgr = manager.getChartManager();
    const chart = chartMgr.create({
      type: 'bar',
      dataRange: { startRow: 1, startCol: 1, endRow: 10, endCol: 2 },
      position: { x: 100, y: 100 },
      size: { width: 400, height: 300 },
      options: {},
      seriesDirection: 'columns',
      hasHeaderRow: true,
      hasHeaderCol: false,
      zIndex: 0
    });

    chartMgr.select(chart.id);
    manager.handleMouseDown(500, 400); // SE handle
    manager.handleMouseMove(550, 450);

    const updated = chartMgr.get(chart.id);
    expect(updated?.size.width).toBe(450);
    expect(updated?.size.height).toBe(350);
  });

  test('should end interaction on mouse up', () => {
    const chartMgr = manager.getChartManager();
    chartMgr.create({
      type: 'bar',
      dataRange: { startRow: 1, startCol: 1, endRow: 10, endCol: 2 },
      position: { x: 100, y: 100 },
      size: { width: 400, height: 300 },
      options: {},
      seriesDirection: 'columns',
      hasHeaderRow: true,
      hasHeaderCol: false,
      zIndex: 0
    });

    manager.handleMouseDown(250, 250);
    expect(manager.isInteracting()).toBe(true);

    manager.handleMouseUp(300, 300);
    expect(manager.isInteracting()).toBe(false);
  });

  test('should delete chart with Delete key', () => {
    const chartMgr = manager.getChartManager();
    const chart = chartMgr.create({
      type: 'bar',
      dataRange: { startRow: 1, startCol: 1, endRow: 10, endCol: 2 },
      position: { x: 100, y: 100 },
      size: { width: 400, height: 300 },
      options: {},
      seriesDirection: 'columns',
      hasHeaderRow: true,
      hasHeaderCol: false,
      zIndex: 0
    });

    chartMgr.select(chart.id);
    const event = { key: 'Delete', preventDefault: jest.fn() } as any;
    manager.handleKeyDown(event);

    expect(chartMgr.get(chart.id)).toBeUndefined();
  });

  test('should move chart with arrow keys', () => {
    const chartMgr = manager.getChartManager();
    const chart = chartMgr.create({
      type: 'bar',
      dataRange: { startRow: 1, startCol: 1, endRow: 10, endCol: 2 },
      position: { x: 100, y: 100 },
      size: { width: 400, height: 300 },
      options: {},
      seriesDirection: 'columns',
      hasHeaderRow: true,
      hasHeaderCol: false,
      zIndex: 0
    });

    chartMgr.select(chart.id);
    const event = { key: 'ArrowLeft', shiftKey: false, preventDefault: jest.fn() } as any;
    manager.handleKeyDown(event);

    const updated = chartMgr.get(chart.id);
    expect(updated?.position.x).toBe(99);
  });

  test('should move faster with Shift + arrow', () => {
    const chartMgr = manager.getChartManager();
    const chart = chartMgr.create({
      type: 'bar',
      dataRange: { startRow: 1, startCol: 1, endRow: 10, endCol: 2 },
      position: { x: 100, y: 100 },
      size: { width: 400, height: 300 },
      options: {},
      seriesDirection: 'columns',
      hasHeaderRow: true,
      hasHeaderCol: false,
      zIndex: 0
    });

    chartMgr.select(chart.id);
    const event = { key: 'ArrowRight', shiftKey: true, preventDefault: jest.fn() } as any;
    manager.handleKeyDown(event);

    const updated = chartMgr.get(chart.id);
    expect(updated?.position.x).toBe(110);
  });

  test('should return pointer cursor over unselected chart', () => {
    const chartMgr = manager.getChartManager();
    chartMgr.create({
      type: 'bar',
      dataRange: { startRow: 1, startCol: 1, endRow: 10, endCol: 2 },
      position: { x: 100, y: 100 },
      size: { width: 400, height: 300 },
      options: {},
      seriesDirection: 'columns',
      hasHeaderRow: true,
      hasHeaderCol: false,
      zIndex: 0
    });

    const cursor = manager.getCursor(250, 250);
    expect(cursor).toBe('pointer');
  });

  test('should return null cursor outside charts', () => {
    const cursor = manager.getCursor(50, 50);
    expect(cursor).toBeNull();
  });

  test('should trigger redraw on chart events', () => {
    const chartMgr = manager.getChartManager();
    redrawCalled = false;

    chartMgr.create({
      type: 'bar',
      dataRange: { startRow: 1, startCol: 1, endRow: 10, endCol: 2 },
      position: { x: 100, y: 100 },
      size: { width: 400, height: 300 },
      options: {},
      seriesDirection: 'columns',
      hasHeaderRow: true,
      hasHeaderCol: false,
      zIndex: 0
    });

    expect(redrawCalled).toBe(true);
  });

  test('should render charts', () => {
    const chartMgr = manager.getChartManager();
    chartMgr.create({
      type: 'bar',
      dataRange: { startRow: 1, startCol: 1, endRow: 10, endCol: 2 },
      position: { x: 100, y: 100 },
      size: { width: 400, height: 300 },
      options: {},
      seriesDirection: 'columns',
      hasHeaderRow: true,
      hasHeaderCol: false,
      zIndex: 0
    });

    const mockCtx = {
      drawImage: jest.fn(),
      save: jest.fn(),
      restore: jest.fn()
    } as any;

    manager.renderCharts(mockCtx);
    expect(mockCtx.drawImage).toHaveBeenCalled();
  });

  test('should dispose resources', () => {
    expect(() => manager.dispose()).not.toThrow();
  });
});
