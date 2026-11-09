import { DataManager } from '../src/DataManager';
import { adoptWorksheetByWorkbook, Worksheet } from '../../core/src/worksheet';
import type { WorkbookId } from '../../core/src/workbook-access-types';

class ReadTrackingWorksheet extends Worksheet {
  readonly reads: Array<{ row: number; col: number }> = [];

  override getCell(...args: Parameters<Worksheet['getCell']>): ReturnType<Worksheet['getCell']> {
    this.reads.push({ ...args[0] });
    return super.getCell(...args);
  }
}

function createDataManager(worksheet: Worksheet): DataManager {
  // The internal adoption seam uses the source Worksheet type while the
  // manager's public signature resolves through the generated Core package.
  return new DataManager(worksheet as unknown as ConstructorParameters<typeof DataManager>[0]);
}

function makeWorksheet(): ReadTrackingWorksheet {
  const worksheet = new ReadTrackingWorksheet('DataManager owner boundary', 3, 2);
  worksheet.setCellValue({ row: 1, col: 1 }, 'c');
  worksheet.setCellValue({ row: 2, col: 1 }, 'a');
  worksheet.setCellValue({ row: 3, col: 1 }, 'b');
  worksheet.setCellValue({ row: 1, col: 2 }, 'x');
  worksheet.setCellValue({ row: 2, col: 2 }, 'y');
  worksheet.setCellValue({ row: 3, col: 2 }, 'x');
  worksheet.reads.length = 0;
  return worksheet;
}

function adopt(worksheet: Worksheet, id: string): void {
  adoptWorksheetByWorkbook(worksheet, id as WorkbookId);
}

describe('DataManager standalone ownership boundary', () => {
  test('rejects adopted and structural inputs during construction', () => {
    const adopted = makeWorksheet();
    adopt(adopted, 'data-manager-constructor-owner');
    expect(() => createDataManager(adopted)).toThrow(
      /DataManager cannot operate on a Workbook-owned Worksheet/,
    );
    expect(adopted.reads).toEqual([]);

    const facade = {
      rowCount: 3,
      getCell: jest.fn(() => null),
      isWorkbookOwned: () => false,
    } as unknown as Worksheet;
    expect(() => createDataManager(facade)).toThrow(
      /DataManager requires an authentic standalone Worksheet/,
    );
    expect(facade.getCell).not.toHaveBeenCalled();
  });

  test('uses the captured ownership intrinsic despite a shadowed instance method', () => {
    const worksheet = makeWorksheet();
    Object.defineProperty(worksheet, 'isWorkbookOwned', { configurable: true, value: () => true });
    const manager = createDataManager(worksheet);

    manager.sort([{ column: 1, order: 'asc' }]);
    expect([0, 1, 2].map((index) => manager.getPhysicalRow(index))).toEqual([1, 2, 0]);

    worksheet.reads.length = 0;
    adopt(worksheet, 'data-manager-shadowed-owner');
    Object.defineProperty(worksheet, 'isWorkbookOwned', { configurable: true, value: () => false });
    const predicate = jest.fn(() => true);

    expect(() => manager.filter([{ column: 1, operator: 'equals', predicate }])).toThrow(
      /DataManager cannot operate on a Workbook-owned Worksheet/,
    );
    expect(worksheet.reads).toEqual([]);
    expect(predicate).not.toHaveBeenCalled();
  });

  test('rejects every public Worksheet or manager-state operation after adoption before effects', () => {
    const worksheet = makeWorksheet();
    const manager = createDataManager(worksheet);
    manager.sort([{ column: 1, order: 'asc' }]);
    manager.filter([{ column: 1, operator: 'equals', value: 'a' }]);
    manager.group({ columns: [2] });

    const read = jest.spyOn(worksheet, 'getCell');
    const worksheetEvents: unknown[] = [];
    const subscription = worksheet.onMutation((event) => worksheetEvents.push(event));
    const managerEvents: Event[] = [];
    const eventTypes = [
      'sort', 'filter', 'group', 'groupToggle', 'groupCollapseAll', 'groupExpandAll',
      'sortClear', 'filterClear', 'groupClear',
    ].map((type) => `cyber-sheet-data-${type}`);
    const captureManagerEvent = (event: Event) => managerEvents.push(event);
    eventTypes.forEach((type) => document.addEventListener(type, captureManagerEvent));

    worksheet.reads.length = 0;
    read.mockClear();
    Object.defineProperty(worksheet, 'isWorkbookOwned', { configurable: true, value: () => false });
    adopt(worksheet, 'data-manager-late-adoption');

    const comparator = jest.fn(() => 0);
    const predicate = jest.fn(() => true);
    const operations: Array<() => unknown> = [
      () => manager.sort([{ column: 1, order: 'asc', comparator }]),
      () => manager.filter([{ column: 1, operator: 'equals', predicate }]),
      () => manager.group({ columns: [1] }),
      () => manager.toggleGroup('x'),
      () => manager.collapseAllGroups(),
      () => manager.expandAllGroups(),
      () => manager.isRowVisible(0),
      () => manager.getVisualRow(0),
      () => manager.getPhysicalRow(0),
      () => manager.getVisibleRows(),
      () => manager.clearSort(),
      () => manager.clearFilter(),
      () => manager.clearGroup(),
      () => manager.getGroups(),
      () => manager.getCollapsedGroups(),
      () => manager.getStats(),
    ];
    for (const operation of operations) {
      expect(operation).toThrow(/DataManager cannot operate on a Workbook-owned Worksheet/);
    }

    expect(read).not.toHaveBeenCalled();
    expect(worksheet.reads).toEqual([]);
    expect(worksheetEvents).toEqual([]);
    expect(managerEvents).toEqual([]);
    expect(comparator).not.toHaveBeenCalled();
    expect(predicate).not.toHaveBeenCalled();

    eventTypes.forEach((type) => document.removeEventListener(type, captureManagerEvent));
    subscription.dispose();
    read.mockRestore();
  });

  test('uses private retained state and returns detached group data', () => {
    const worksheet = makeWorksheet();
    const manager = createDataManager(worksheet);
    manager.group({ columns: [2], collapsed: new Set(['x']) });
    const before = manager.getGroups();
    const replacement = makeWorksheet();

    expect(Object.getOwnPropertyNames(manager)).not.toContain('worksheet');
    expect(Object.getOwnPropertyNames(manager)).not.toContain('groupedRows');
    Object.defineProperty(manager, 'worksheet', { configurable: true, value: replacement });
    Object.defineProperty(manager, 'groupedRows', { configurable: true, value: new Map() });

    manager.sort([{ column: 1, order: 'asc' }]);
    expect([0, 1, 2].map((index) => manager.getPhysicalRow(index))).toEqual([1, 2, 0]);

    const detached = manager.getGroups();
    detached.get('x')?.push(99);
    detached.delete('y');
    const collapsed = manager.getCollapsedGroups();
    collapsed.clear();

    expect(Array.from(manager.getGroups())).toEqual(Array.from(before));
    expect(manager.getCollapsedGroups()).toEqual(new Set(['x']));
    expect(manager.getStats().groupCount).toBe(2);
    expect(worksheet.reads.some(({ row, col }) => row === 1 && col === 2)).toBe(true);
    expect(replacement.reads).toEqual([]);
  });

  test('rechecks ownership after user callbacks and does not publish partial manager state', () => {
    const worksheet = makeWorksheet();
    const manager = createDataManager(worksheet);
    const events: Event[] = [];
    const onSort = (event: Event) => events.push(event);
    document.addEventListener('cyber-sheet-data-sort', onSort);
    const comparator = jest.fn((a: unknown, b: unknown) => {
      Object.defineProperty(worksheet, 'isWorkbookOwned', { configurable: true, value: () => false });
      adopt(worksheet, 'data-manager-adopted-in-comparator');
      return String(a).localeCompare(String(b));
    });

    expect(() => manager.sort([{ column: 1, order: 'asc', comparator }])).toThrow(
      /DataManager cannot operate on a Workbook-owned Worksheet/,
    );
    expect(comparator).toHaveBeenCalledTimes(1);
    expect(events).toEqual([]);
    expect(worksheet.reads.every(({ row }) => row >= 1)).toBe(true);
    expect(() => manager.getPhysicalRow(0)).toThrow(
      /DataManager cannot operate on a Workbook-owned Worksheet/,
    );
    document.removeEventListener('cyber-sheet-data-sort', onSort);
  });
});
