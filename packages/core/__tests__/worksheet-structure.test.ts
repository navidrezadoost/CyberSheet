import {
  CommandManager,
  InsertColumnsCommand,
  InsertImageCommand,
  InsertRowsCommand,
  ReorderRowsCommand,
  Worksheet,
} from '../src';

describe('Worksheet structural row/column management', () => {
  test('insertRows shifts sparse cells, formulas, and row defaults', () => {
    const ws = new Worksheet('Sheet1', 8, 8);
    ws.setCellValue({ row: (0) + 1, col: (0) + 1 }, 10);
    ws.setCellValue({ row: (2) + 1, col: (0) + 1 }, 30);
    ws.setCellFormula({ row: (0) + 1, col: (1) + 1 }, '=A1+A3');
    ws.setRowStyle(3, { fill: '#eef6ff', bold: true });

    ws.insertRows(1, 2);

    expect(ws.rowCount).toBe(10);
    expect(ws.getCellValue({ row: (0) + 1, col: (0) + 1 })).toBe(10);
    expect(ws.getCellValue({ row: (4) + 1, col: (0) + 1 })).toBe(30);
    expect(ws.getCell({ row: (0) + 1, col: (1) + 1 })?.formula).toBe('=A1+A5');
    expect(ws.getRowStyle(5)).toEqual({ fill: '#eef6ff', bold: true });
    expect(ws.getCellStyle({ row: (4) + 1, col: (5) + 1 })?.fill).toBe('#eef6ff');
    expect(ws.getRowStyle(2)).toBeUndefined();
  });

  test('insertColumns shifts sparse cells, formulas, and column defaults', () => {
    const ws = new Worksheet('Sheet1', 8, 8);
    ws.setCellValue({ row: (0) + 1, col: (0) + 1 }, 10);
    ws.setCellValue({ row: (0) + 1, col: (2) + 1 }, 30);
    ws.setCellFormula({ row: (0) + 1, col: (4) + 1 }, '=A1+C1');
    ws.setColumnStyle(2, { fill: '#fff4cc' });

    ws.insertColumns(1, 1);

    expect(ws.colCount).toBe(9);
    expect(ws.getCellValue({ row: (0) + 1, col: (0) + 1 })).toBe(10);
    expect(ws.getCellValue({ row: (0) + 1, col: (3) + 1 })).toBe(30);
    expect(ws.getCell({ row: (0) + 1, col: (5) + 1 })?.formula).toBe('=A1+D1');
    expect(ws.getColumnStyle(3)).toEqual({ fill: '#fff4cc' });
    expect(ws.getColumnStyle(2)).toBeUndefined();
  });

  test('reorderRows moves a dragged row block and remaps formulas', () => {
    const ws = new Worksheet('Sheet1', 6, 4);
    ws.setCellValue({ row: (0) + 1, col: (0) + 1 }, 'A');
    ws.setCellValue({ row: (1) + 1, col: (0) + 1 }, 'B');
    ws.setCellValue({ row: (2) + 1, col: (0) + 1 }, 'C');
    ws.setCellValue({ row: (3) + 1, col: (0) + 1 }, 'D');
    ws.setCellFormula({ row: (0) + 1, col: (1) + 1 }, '=A2+A4');

    ws.reorderRows(1, 3, 1);

    expect(ws.getCellValue({ row: (1) + 1, col: (0) + 1 })).toBe('C');
    expect(ws.getCellValue({ row: (2) + 1, col: (0) + 1 })).toBe('D');
    expect(ws.getCellValue({ row: (3) + 1, col: (0) + 1 })).toBe('B');
    expect(ws.getCell({ row: (0) + 1, col: (1) + 1 })?.formula).toBe('=A4+A3');
  });
});

describe('Worksheet dynamic row/column styling', () => {
  test('effective styles merge column, row, and cell overrides for existing and future cells', () => {
    const ws = new Worksheet('Sheet1', 6, 6);

    ws.setColumnStyle(3, { fill: '#f4f7fb', color: '#334155' });
    ws.setRowStyle(4, { bold: true });
    ws.setCellStyle({ row: (3) + 1, col: (2) + 1 }, { color: '#b91c1c' });

    expect(ws.getCellStyle({ row: (3) + 1, col: (2) + 1 })).toEqual({
      fill: '#f4f7fb',
      color: '#b91c1c',
      bold: true,
    });
    expect(ws.getDirectCellStyle({ row: 4, col: 3 })).toEqual({ color: '#b91c1c' });
    expect(ws.getCellStyle({ row: (3) + 1, col: (5) + 1 })).toEqual({ bold: true });
    expect(ws.getCellStyle({ row: (5) + 1, col: (2) + 1 })).toEqual({ fill: '#f4f7fb', color: '#334155' });
  });
});

describe('Worksheet image insertion', () => {
  test('insertImage stores cell-bound picture metadata and structural inserts move anchors', () => {
    const ws = new Worksheet('Sheet1', 8, 8);

    const image = ws.insertImage({
      source: 'data:image/png;base64,AAAA',
      sourceType: 'dataUri',
      naturalWidth: 120,
      naturalHeight: 80,
      size: { width: 60, height: 40 },
      placement: 'cell',
      cellAnchor: { row: 2, col: 2, endRow: 2, endCol: 2 },
      altText: 'Demo image',
    });

    expect(ws.getDrawingLayer().getObject(image.id)).toBeDefined();
    expect(image.placement).toBe('cell');
    expect(image.clipToCell).toBe(true);

    ws.insertRows(1, 1);
    ws.insertColumns(1, 2);

    const shifted = ws.getImages()[0];
    expect(shifted.cellAnchor).toEqual({ row: 3, col: 4, endRow: 3, endCol: 4 });
  });
});

describe('Worksheet snapshot commands', () => {
  test('CommandManager can undo and redo row insertion', () => {
    const ws = new Worksheet('Sheet1', 6, 6);
    const manager = new CommandManager(10, ws);
    ws.setCellValue({ row: (1) + 1, col: (0) + 1 }, 'moved');

    manager.execute(new InsertRowsCommand(ws, 1, 1));
    expect(ws.getCellValue({ row: (2) + 1, col: (0) + 1 })).toBe('moved');

    expect(manager.undo()).toBe(true);
    expect(ws.getCellValue({ row: (1) + 1, col: (0) + 1 })).toBe('moved');
    expect(ws.rowCount).toBe(6);

    expect(manager.redo()).toBe(true);
    expect(ws.getCellValue({ row: (2) + 1, col: (0) + 1 })).toBe('moved');
    expect(ws.rowCount).toBe(7);
  });

  test('CommandManager can undo and redo column insertion, row reorder, and image insertion', () => {
    const ws = new Worksheet('Sheet1', 6, 6);
    const manager = new CommandManager(10, ws);
    ws.setCellValue({ row: (0) + 1, col: (1) + 1 }, 'column');
    ws.setCellValue({ row: (2) + 1, col: (0) + 1 }, 'row');

    manager.execute(new InsertColumnsCommand(ws, 1, 1));
    expect(ws.getCellValue({ row: (0) + 1, col: (2) + 1 })).toBe('column');

    manager.execute(new ReorderRowsCommand(ws, 2, 4, 1));
    expect(ws.getCellValue({ row: (4) + 1, col: (0) + 1 })).toBe('row');

    const imageCommand = new InsertImageCommand(ws, {
      source: 'https://example.com/image.png',
      size: { width: 100, height: 50 },
      placement: 'floating',
    });
    manager.execute(imageCommand);
    expect(ws.getImages()).toHaveLength(1);

    expect(manager.undo()).toBe(true);
    expect(ws.getImages()).toHaveLength(0);

    expect(manager.redo()).toBe(true);
    expect(ws.getImages()).toHaveLength(1);
    expect(imageCommand.imageId).toBeDefined();
  });
});
