import { Workbook, Worksheet } from '../src';
import { setWorkbookMutationTestHooks } from '../src/workbookMutationTestHooks';

const strategies = ['journal', 'snapshot'] as const;
const operations = [
  'setCellValue',
  'setCellFormula',
  'clearCellContent',
  'clearCellFormula',
  'setCellStyle',
  'setRowHeight',
  'setColumnWidth',
] as const;
const operationCases = strategies.flatMap((strategy) =>
  operations.map((operation) => [strategy, operation] as const),
);

describe('PKG-14B seven-operation fault cuts and committed observer disposal', () => {
  test.each(operationCases)(
    '%s restores exact state when %s is the only applied operation before a later apply cut',
    async (strategy, kind) => {
      const workbook = Workbook.create({ sheets: [{ name: 'Base', rows: 3, cols: 3 }] });
      const raw = workbook.createDevImportWorksheet('Target', 3, 3) as Worksheet;
      raw.setCellValue({ row: 1, col: 1 }, 5);
      raw.setCellFormula({ row: 1, col: 2 }, '=A1+1', 6);
      workbook.attachDevImportSheet(raw);
      const sheet = workbook.getSheet('Target')!;
      const before = raw.extractSnapshot();
      const events: unknown[] = [];
      sheet.on((event) => events.push(event));
      const injected = new Error(`${strategy} after first ${kind}`);
      const registration = setWorkbookMutationTestHooks(workbook, {
        strategy,
        beforeApplyOperation: (index) => {
          if (index === 1) throw injected;
        },
      });

      try {
        await expect(workbook.transact((tx) => {
          switch (kind) {
            case 'setCellValue': tx.setCellValue(sheet, { row: 1, col: 1 }, 9); break;
            case 'setCellFormula': tx.setCellFormula(sheet, { row: 1, col: 1 }, '=2+3', 5); break;
            case 'clearCellContent': tx.clearCellContent(sheet, { row: 1, col: 1 }); break;
            case 'clearCellFormula': tx.clearCellFormula(sheet, { row: 1, col: 2 }); break;
            case 'setCellStyle': tx.setCellStyle(sheet, { row: 1, col: 1 }, { bold: true }); break;
            case 'setRowHeight': tx.setRowHeight(sheet, 1, 33); break;
            case 'setColumnWidth': tx.setColumnWidth(sheet, 1, 90); break;
          }
          tx.setCellValue(sheet, { row: 3, col: 3 }, 'must not apply');
        })).rejects.toBe(injected);

        expect(raw.extractSnapshot()).toEqual(before);
        expect(events).toEqual([]);
        expect(workbook.getMutationHealth()).toEqual({ status: 'healthy' });
      } finally {
        registration.dispose();
        workbook.dispose();
      }
    },
  );

  test.each(operationCases)(
    '%s leaves state untouched when %s is the first operation and apply is interrupted before it',
    async (strategy, kind) => {
      const workbook = Workbook.create({ sheets: [{ name: 'Base', rows: 3, cols: 3 }] });
      const raw = workbook.createDevImportWorksheet('Target', 3, 3) as Worksheet;
      raw.setCellValue({ row: 1, col: 1 }, 5);
      raw.setCellFormula({ row: 1, col: 2 }, '=A1+1', 6);
      workbook.attachDevImportSheet(raw);
      const sheet = workbook.getSheet('Target')!;
      const before = raw.extractSnapshot();
      const events: unknown[] = [];
      sheet.on((event) => events.push(event));
      const injected = new Error(`${strategy} before first ${kind}`);
      const registration = setWorkbookMutationTestHooks(workbook, {
        strategy,
        beforeApplyOperation: (index) => {
          if (index === 0) throw injected;
        },
      });

      try {
        await expect(workbook.transact((tx) => {
          switch (kind) {
            case 'setCellValue': tx.setCellValue(sheet, { row: 1, col: 1 }, 9); break;
            case 'setCellFormula': tx.setCellFormula(sheet, { row: 1, col: 1 }, '=2+3', 5); break;
            case 'clearCellContent': tx.clearCellContent(sheet, { row: 1, col: 1 }); break;
            case 'clearCellFormula': tx.clearCellFormula(sheet, { row: 1, col: 2 }); break;
            case 'setCellStyle': tx.setCellStyle(sheet, { row: 1, col: 1 }, { bold: true }); break;
            case 'setRowHeight': tx.setRowHeight(sheet, 1, 33); break;
            case 'setColumnWidth': tx.setColumnWidth(sheet, 1, 90); break;
          }
        })).rejects.toBe(injected);

        expect(raw.extractSnapshot()).toEqual(before);
        expect(events).toEqual([]);
        expect(workbook.getMutationHealth()).toEqual({ status: 'healthy' });
      } finally {
        registration.dispose();
        workbook.dispose();
      }
    },
  );

  test.each(strategies)(
    '%s keeps committed state and suppresses notifications after disposal during publication',
    async (strategy) => {
      const workbook = Workbook.create({ sheets: [{ name: 'Base', rows: 3, cols: 3 }] });
      const sheet = workbook.getSheet('Base')!;
      const registration = setWorkbookMutationTestHooks(workbook, { strategy });
      const valueNotifications: unknown[] = [];
      const laterValueNotifications: unknown[] = [];
      const dimensionNotifications: unknown[] = [];

      workbook.eventBus.on('cell-value-change', (payload) => {
        valueNotifications.push(payload);
        workbook.dispose();
      });
      workbook.eventBus.on('cell-value-change', (payload) => {
        laterValueNotifications.push(payload);
      });
      workbook.eventBus.on('row-height-change', (payload) => {
        dimensionNotifications.push(payload);
      });

      try {
        await workbook.transact((tx) => {
          tx.setCellValue(sheet, { row: 1, col: 1 }, 'committed before observer disposal');
          tx.setRowHeight(sheet, 2, 31);
        });

        // The event callback runs after the commit point. Disposal suppresses
        // later callbacks/publications but cannot roll the committed writes back.
        expect(sheet.getCellValue({ row: 1, col: 1 })).toBe('committed before observer disposal');
        expect(sheet.getRowHeight(2)).toBe(31);
        expect(valueNotifications).toHaveLength(1);
        expect(laterValueNotifications).toEqual([]);
        expect(dimensionNotifications).toEqual([]);
      } finally {
        registration.dispose();
        workbook.dispose();
      }
    },
  );
});
