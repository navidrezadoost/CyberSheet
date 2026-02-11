/**
 * Tests for ChartInteractionManager  
 * Week 12 Day 4: CanvasRenderer Integration & Interactivity
 */

import { ChartInteractionManager } from '../src/ChartInteractionManager';
import { Worksheet } from '@cyber-sheet/core';

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
      worksheet.setCellValue({ row: i, col: 0 }, `Label ${i}`);
      worksheet.setCellValue({ row: i, col: 1 }, Math.random() * 100);
    }
  });

  test('should create chart manager and renderer', () => {
    expect(manager.getChartManager()).toBeDefined();
    expect(manager.getChartRenderer()).toBeDefined();
  });

  test('should select chart on click', () => {
    const chartMgr = manager.getChartManager();
    chartMgr.create({
      type: 'bar',
      dataRange: { startRow: 0, startCol: 0, endRow: 9, endCol: 1 },
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
      dataRange: { startRow: 0, startCol: 0, endRow: 9, endCol: 1 },
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
      dataRange: { startRow: 0, startCol: 0, endRow: 9, endCol: 1 },
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
      dataRange: { startRow: 0, startCol: 0, endRow: 9, endCol: 1 },
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
      dataRange: { startRow: 0, startCol: 0, endRow: 9, endCol: 1 },
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
      dataRange: { startRow: 0, startCol: 0, endRow: 9, endCol: 1 },
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
      dataRange: { startRow: 0, startCol: 0, endRow: 9, endCol: 1 },
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
      dataRange: { startRow: 0, startCol: 0, endRow: 9, endCol: 1 },
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
      dataRange: { startRow: 0, startCol: 0, endRow: 9, endCol: 1 },
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
      dataRange: { startRow: 0, startCol: 0, endRow: 9, endCol: 1 },
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
      dataRange: { startRow: 0, startCol: 0, endRow: 9, endCol: 1 },
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
      dataRange: { startRow: 0, startCol: 0, endRow: 9, endCol: 1 },
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
