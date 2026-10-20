import { DataManager } from '../src/DataManager';
import { Worksheet } from '../../core/src/worksheet';
import type { CellValue } from '@cyber-sheet/core';

describe('DataManager Worksheet address characterization', () => {
  function createWorksheet(): Worksheet {
    const worksheet = new Worksheet('DataManager address test', 3, 2);
    worksheet.setCellValue({ row: 1, col: 1 }, 'first');
    worksheet.setCellValue({ row: 2, col: 1 }, 'second');
    worksheet.setCellValue({ row: 3, col: 1 }, 'third');
    return worksheet;
  }

  test('sort reaches row zero before invoking its comparator', () => {
    const worksheet = createWorksheet();
    const addresses: Array<{ row: number; col: number }> = [];
    const getCell = worksheet.getCell.bind(worksheet);
    jest.spyOn(worksheet, 'getCell').mockImplementation((address) => {
      addresses.push({ ...address });
      return getCell(address);
    });
    const comparator = jest.fn((a: CellValue, b: CellValue) => String(a).localeCompare(String(b)));
    const manager = new DataManager(worksheet);

    expect(() => manager.sort([{ column: 1, order: 'asc', comparator }])).toThrow(
      'Worksheet address out of bounds: row=0, col=1',
    );
    expect(addresses).toEqual([{ row: 1, col: 1 }, { row: 0, col: 1 }]);
    expect(comparator).not.toHaveBeenCalled();
  });

  test('filter reaches row zero before invoking its predicate', () => {
    const worksheet = createWorksheet();
    const addresses: Array<{ row: number; col: number }> = [];
    const getCell = worksheet.getCell.bind(worksheet);
    jest.spyOn(worksheet, 'getCell').mockImplementation((address) => {
      addresses.push({ ...address });
      return getCell(address);
    });
    const predicate = jest.fn((_value: CellValue) => true);
    const manager = new DataManager(worksheet);

    expect(() => manager.filter([{ column: 2, operator: 'equals', predicate }])).toThrow(
      'Worksheet address out of bounds: row=0, col=2',
    );
    expect(addresses).toEqual([{ row: 0, col: 2 }]);
    expect(predicate).not.toHaveBeenCalled();
  });

  test('group reaches row zero before completing its first group key', () => {
    const worksheet = createWorksheet();
    const addresses: Array<{ row: number; col: number }> = [];
    const getCell = worksheet.getCell.bind(worksheet);
    jest.spyOn(worksheet, 'getCell').mockImplementation((address) => {
      addresses.push({ ...address });
      return getCell(address);
    });
    const manager = new DataManager(worksheet);

    expect(() => manager.group({ columns: [2] })).toThrow(
      'Worksheet address out of bounds: row=0, col=2',
    );
    expect(addresses).toEqual([{ row: 0, col: 2 }]);
  });
});
