import { DataManager } from '../src/DataManager';
import { Worksheet } from '../../core/src/worksheet';
import type { CellValue } from '@cyber-sheet/core';

describe('DataManager Worksheet address compatibility', () => {
  function createWorksheet(): Worksheet {
    const worksheet = new Worksheet('DataManager address test', 3, 2);
    worksheet.setCellValue({ row: 1, col: 1 }, 'third');
    worksheet.setCellValue({ row: 2, col: 1 }, 'first');
    worksheet.setCellValue({ row: 3, col: 1 }, 'second');
    worksheet.setCellValue({ row: 1, col: 2 }, 'group-a');
    worksheet.setCellValue({ row: 2, col: 2 }, 'group-b');
    worksheet.setCellValue({ row: 3, col: 2 }, 'group-a');
    return worksheet;
  }

  test('sort reads one-based Worksheet rows and executes comparator in row-index order', () => {
    const worksheet = createWorksheet();
    const mutations: unknown[] = [];
    const mutationSubscription = worksheet.onMutation((event) => mutations.push(event));
    const addresses: Array<{ row: number; col: number }> = [];
    const getCell = worksheet.getCell.bind(worksheet);
    jest.spyOn(worksheet, 'getCell').mockImplementation((address) => {
      addresses.push({ ...address });
      return getCell(address);
    });
    const comparator = jest.fn((a: CellValue, b: CellValue) => String(a).localeCompare(String(b)));
    const manager = new DataManager(worksheet);

    manager.sort([{ column: 1, order: 'asc', comparator }]);

    expect(addresses.length).toBeGreaterThan(0);
    expect(addresses.every(({ row, col }) => row >= 1 && col === 1)).toBe(true);
    expect(addresses.some(({ row }) => row === 1)).toBe(true);
    expect(comparator).toHaveBeenCalled();
    expect([0, 1, 2].map((index) => manager.getPhysicalRow(index))).toEqual([1, 2, 0]);
    expect(mutations).toEqual([]);
    mutationSubscription.dispose();
  });

  test('filter reads the first row and executes its predicate for every row', () => {
    const worksheet = createWorksheet();
    const mutations: unknown[] = [];
    const mutationSubscription = worksheet.onMutation((event) => mutations.push(event));
    const addresses: Array<{ row: number; col: number }> = [];
    const getCell = worksheet.getCell.bind(worksheet);
    jest.spyOn(worksheet, 'getCell').mockImplementation((address) => {
      addresses.push({ ...address });
      return getCell(address);
    });
    const predicate = jest.fn((value: CellValue) => value !== 'second');
    const manager = new DataManager(worksheet);

    manager.filter([{ column: 1, operator: 'equals', predicate }]);

    expect(addresses).toEqual([{ row: 1, col: 1 }, { row: 2, col: 1 }, { row: 3, col: 1 }]);
    expect(predicate.mock.calls.map(([value]) => value)).toEqual(['third', 'first', 'second']);
    expect(manager.getVisibleRows()).toEqual([0, 1]);
    expect(mutations).toEqual([]);
    mutationSubscription.dispose();
  });

  test('group uses one-based Worksheet rows and completes the expected grouping keys', () => {
    const worksheet = createWorksheet();
    const mutations: unknown[] = [];
    const mutationSubscription = worksheet.onMutation((event) => mutations.push(event));
    const addresses: Array<{ row: number; col: number }> = [];
    const getCell = worksheet.getCell.bind(worksheet);
    jest.spyOn(worksheet, 'getCell').mockImplementation((address) => {
      addresses.push({ ...address });
      return getCell(address);
    });
    const manager = new DataManager(worksheet);

    manager.group({ columns: [2] });

    expect(addresses).toEqual([{ row: 1, col: 2 }, { row: 2, col: 2 }, { row: 3, col: 2 }]);
    expect(Array.from(manager.getGroups())).toEqual([
      ['group-a', [0, 2]],
      ['group-b', [1]],
    ]);
    expect(mutations).toEqual([]);
    mutationSubscription.dispose();
  });
});
