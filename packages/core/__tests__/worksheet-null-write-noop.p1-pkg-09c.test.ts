import { Workbook, Worksheet } from '../src';
import { setWorkbookMutationTestHooks } from '../src/workbookMutationTestHooks';

const address = { row: 2, col: 2 };

function workbookFixture(strategy: 'journal' | 'snapshot', seedFormula = false) {
  const workbook = Workbook.create({ sheets: [{ name: 'Base', rows: 3, cols: 3 }] });
  const raw = workbook.createDevImportWorksheet('Data', 3, 3) as Worksheet;
  if (seedFormula) raw.setCellFormula(address, '=1');
  workbook.attachDevImportSheet(raw);
  const view = workbook.getSheet('Data')!;
  const hooks = setWorkbookMutationTestHooks(workbook, { strategy });
  return { workbook, raw, view, hooks };
}

describe('PKG-09C same-value null write to an absent cell', () => {
  test('standalone repeated writes preserve sparse state and emit no event', () => {
    const worksheet = new Worksheet('SparseNoop', 3, 3);
    const before = worksheet.extractSnapshot();
    const events: unknown[] = [];
    worksheet.on((event) => events.push(event));

    // getCellValue() exposes an absent cell as null; this is therefore a
    // same-value write under Worksheet.setCellValue()'s documented no-op guard.
    worksheet.setCellValue(address, null);
    worksheet.setCellValue(address, null);

    expect(worksheet.getCellValue(address)).toBeNull();
    expect(worksheet.getCell(address)).toBeUndefined();
    expect(worksheet.extractSnapshot()).toEqual(before);
    expect(events).toEqual([]);
  });

  test.each(['journal', 'snapshot'] as const)(
    '%s Workbook writes preserve sparse state for repeated null assignments',
    async (strategy) => {
      const { workbook, raw, view, hooks } = workbookFixture(strategy);
      const before = raw.extractSnapshot();
      const events: unknown[] = [];
      view.on((event) => events.push(event));

      await workbook.transact((tx) => {
        tx.setCellValue(view, address, null);
        tx.setCellValue(view, address, null);
      });
      await workbook.transact((tx) => tx.setCellValue(view, address, null));

      expect(view.getCellValue(address)).toBeNull();
      expect(view.getCell(address)).toBeUndefined();
      expect(raw.extractSnapshot()).toEqual(before);
      expect(events).toEqual([]);
      expect(workbook.getMutationHealth()).toEqual({ status: 'healthy' });
      hooks.dispose();
      workbook.dispose();
    },
  );

  test.each(['standalone', 'journal', 'snapshot'] as const)(
    '%s still clears a formula when writing its displayed null value',
    async (mode) => {
      if (mode === 'standalone') {
        const worksheet = new Worksheet('FormulaClear', 3, 3);
        worksheet.setCellFormula(address, '=1');
        const events: unknown[] = [];
        worksheet.on((event) => events.push(event));

        worksheet.setCellValue(address, null);

        expect(worksheet.getCell(address)?.formula).toBeUndefined();
        expect(events).toHaveLength(1);
        return;
      }

      const { workbook, view, hooks } = workbookFixture(mode, true);
      const events: unknown[] = [];
      view.on((event) => events.push(event));

      await workbook.transact((tx) => tx.setCellValue(view, address, null));

      expect(view.getCell(address)?.formula).toBeUndefined();
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({ type: 'cell-changed', previousFormula: '=1' });
      hooks.dispose();
      workbook.dispose();
    },
  );
});
