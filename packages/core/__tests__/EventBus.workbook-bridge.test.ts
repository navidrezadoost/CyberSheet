import { Workbook } from '../src/workbook';

describe('Workbook event bridge', () => {
  it('emits cell-value-change when a cell is updated', async () => {
    const workbook = Workbook.create({ sheets: [{ name: 'Sheet1' }] });
    const sheet = workbook.getSheet('Sheet1')!;
    const handler = jest.fn();
    workbook.eventBus.on('cell-value-change', handler);

    await workbook.transact((transaction) =>
      transaction.setCellValue(sheet, { row: 1, col: 1 }, 42),
    );

    expect(handler).toHaveBeenCalledWith({
      row: 1,
      col: 1,
      oldValue: null,
      newValue: 42,
      formula: undefined,
    });
  });

  it('does not bridge cell-value-change until subscribed', async () => {
    const workbook = Workbook.create({ sheets: [{ name: 'Sheet1' }] });
    const sheet = workbook.getSheet('Sheet1')!;
    const handler = jest.fn();

    await workbook.transact((transaction) =>
      transaction.setCellValue(sheet, { row: 1, col: 1 }, 42),
    );
    expect(handler).not.toHaveBeenCalled();

    const unsub = workbook.eventBus.on('cell-value-change', handler);
    await workbook.transact((transaction) =>
      transaction.setCellValue(sheet, { row: 2, col: 2 }, 99),
    );
    expect(handler).toHaveBeenCalledTimes(1);

    unsub();
    await workbook.transact((transaction) =>
      transaction.setCellValue(sheet, { row: 3, col: 3 }, 1),
    );
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
