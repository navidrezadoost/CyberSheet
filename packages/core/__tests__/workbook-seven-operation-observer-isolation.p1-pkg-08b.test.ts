import { isInternedStyle, Workbook, Worksheet } from '../src';
import { setWorkbookMutationTestHooks } from '../src/workbookMutationTestHooks';

function fixture(strategy: 'journal' | 'snapshot') {
  const workbook = Workbook.create({ sheets: [{ name: 'Base', rows: 5, cols: 4 }] });
  const alphaRaw = workbook.createDevImportWorksheet('Alpha', 5, 4) as Worksheet;
  const betaRaw = workbook.createDevImportWorksheet('Beta', 5, 4) as Worksheet;
  betaRaw.setCellValue({ row: 1, col: 1 }, 'clear this value');
  betaRaw.setCellFormula({ row: 1, col: 2 }, '=1+1', 2);
  workbook.attachDevImportSheet(alphaRaw);
  workbook.attachDevImportSheet(betaRaw);
  const alpha = workbook.getSheet('Alpha')!;
  const beta = workbook.getSheet('Beta')!;
  const hooks = setWorkbookMutationTestHooks(workbook, { strategy });
  return { workbook, alpha, beta, alphaRaw, hooks };
}

describe('PKG-08B seven-operation committed observer isolation', () => {
  afterEach(() => jest.restoreAllMocks());

  test.each(['journal', 'snapshot'] as const)(
    '%s preserves committed mixed state and continues each event surface after an observer throws',
    async (strategy) => {
      const { workbook, alpha, beta, alphaRaw, hooks } = fixture(strategy);
      const report = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      const valueObserverError = new Error(`${strategy} cell value observer`);
      const rowObserverError = new Error(`${strategy} row dimension observer`);
      const laterValueObserver = jest.fn();
      const laterRowObserver = jest.fn();
      const alphaSheetEvents: string[] = [];
      const betaSheetEvents: string[] = [];

      const offValueThrow = workbook.eventBus.on('cell-value-change', () => {
        throw valueObserverError;
      });
      const offValueLater = workbook.eventBus.on('cell-value-change', laterValueObserver);
      const offRowThrow = workbook.eventBus.on('row-height-change', () => {
        throw rowObserverError;
      });
      const offRowLater = workbook.eventBus.on('row-height-change', laterRowObserver);
      const alphaSubscription = alpha.on((event) => alphaSheetEvents.push(event.type));
      const betaSubscription = beta.on((event) => betaSheetEvents.push(event.type));

      await workbook.transact((tx) => {
        tx.setCellValue(alpha, { row: 2, col: 1 }, 'committed value');
        tx.setCellFormula(alpha, { row: 2, col: 2 }, '=A2+1', 8);
        tx.clearCellContent(beta, { row: 1, col: 1 });
        tx.clearCellFormula(beta, { row: 1, col: 2 });
        tx.setCellStyle(beta, { row: 2, col: 1 }, { bold: true, color: '#345678' });
        tx.setRowHeight(beta, 3, 37);
        tx.setColumnWidth(alpha, 4, 119.5);
      });

      // Each observer surface is checked independently. No cross-surface
      // callback completion order is part of this assertion.
      expect(laterValueObserver).toHaveBeenCalledTimes(4);
      expect(laterRowObserver).toHaveBeenCalledWith({
        worksheetId: beta.worksheetId,
        row: 3,
        heightPx: 37,
      });
      expect(report).toHaveBeenCalledWith(
        expect.stringContaining("EventBus listener failed for 'cell-value-change'"),
        valueObserverError,
      );
      expect(report).toHaveBeenCalledWith(
        "EventBus listener failed for 'row-height-change'",
        rowObserverError,
      );

      expect(alpha.getCellValue({ row: 2, col: 1 })).toBe('committed value');
      expect(alpha.getCell({ row: 2, col: 2 })).toMatchObject({ formula: '=A2+1', value: null });
      expect(alphaRaw.getPrecedents({ row: 2, col: 2 })).toEqual([{ row: 2, col: 1 }]);
      expect(alphaRaw.getDependents({ row: 2, col: 1 })).toContainEqual({ row: 2, col: 2 });
      expect(beta.getCellValue({ row: 1, col: 1 })).toBeNull();
      expect(beta.getCell({ row: 1, col: 2 })?.formula).toBeUndefined();
      expect(isInternedStyle(beta.getCellStyle({ row: 2, col: 1 }))).toBe(true);
      expect(beta.getRowHeight(3)).toBe(37);
      expect(alpha.getColumnWidth(4)).toBe(119.5);
      expect(alphaSheetEvents.length).toBeGreaterThan(0);
      expect(betaSheetEvents.length).toBeGreaterThan(0);
      expect(workbook.getMutationHealth()).toEqual({ status: 'healthy' });

      alphaSubscription.dispose();
      betaSubscription.dispose();
      offValueThrow();
      offValueLater();
      offRowThrow();
      offRowLater();
      hooks.dispose();
      workbook.dispose();
    },
  );
});
