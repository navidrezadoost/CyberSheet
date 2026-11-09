import { Workbook } from '../src/workbook';
import { Worksheet } from '../src/worksheet';
import {
  AutoSumCommand,
  ClearFilterCommand,
  GroupOutlineCommand,
  SetDataValidationCommand,
  SortCommand,
  TextToColumnsCommand,
  ToggleAutoFilterCommand,
} from '../src/commands/DataCommands';

describe('DataCommands Worksheet ownership boundary characterization (H.81)', () => {
  function adopt(worksheet: Worksheet): Workbook {
    const workbook = new Workbook();
    workbook.attachDevImportSheet(worksheet);
    return workbook;
  }

  test('SortCommand keeps standalone sorting and stops before writes on a retained adopted Worksheet', () => {
    const standalone = new Worksheet('Standalone sort', 3, 2);
    standalone.setCellValue({ row: 1, col: 1 }, 2);
    standalone.setCellValue({ row: 2, col: 1 }, 1);
    new SortCommand(
      standalone,
      { start: { row: 1, col: 1 }, end: { row: 2, col: 1 } },
      [{ columnIndex: 1, ascending: true }],
    ).execute();
    expect(standalone.getCellValue({ row: 1, col: 1 })).toBe(1);
    expect(standalone.getCellValue({ row: 2, col: 1 })).toBe(2);

    const adopted = new Worksheet('Adopted sort', 3, 2);
    adopted.setCellValue({ row: 1, col: 1 }, 2);
    adopted.setCellValue({ row: 2, col: 1 }, 1);
    adopt(adopted);
    const events: unknown[] = [];
    const subscription = adopted.on((event) => events.push(event));
    const command = new SortCommand(
      adopted,
      { start: { row: 1, col: 1 }, end: { row: 2, col: 1 } },
      [{ columnIndex: 1, ascending: true }],
    );
    expect(() => command.execute()).toThrow(/Workbook-owned Worksheet/);
    expect(adopted.getCellValue({ row: 1, col: 1 })).toBe(2);
    expect(adopted.getCellValue({ row: 2, col: 1 })).toBe(1);
    expect(events).toEqual([]);
    subscription.dispose();
  });

  test('ToggleAutoFilterCommand keeps standalone behavior and rejects an adopted Worksheet write', () => {
    const standalone = new Worksheet('Standalone filter range', 4, 3);
    new ToggleAutoFilterCommand(
      standalone,
      { start: { row: 1, col: 1 }, end: { row: 4, col: 3 } },
      true,
    ).execute();
    expect(standalone.getAutoFilterRange()).toEqual({ headerRow: 1, startCol: 1, endCol: 3 });

    const adopted = new Worksheet('Adopted filter range', 4, 3);
    adopt(adopted);
    const events: unknown[] = [];
    const subscription = adopted.on((event) => events.push(event));
    const command = new ToggleAutoFilterCommand(
      adopted,
      { start: { row: 1, col: 1 }, end: { row: 4, col: 3 } },
      true,
    );
    expect(() => command.execute()).toThrow(/Workbook-owned Worksheet/);
    expect(adopted.getAutoFilterRange()).toBeNull();
    expect(events).toEqual([]);
    subscription.dispose();
  });

  test('ClearFilterCommand clears standalone filters and rejects adopted filter mutation atomically', () => {
    const standalone = new Worksheet('Standalone clear filter', 4, 3);
    standalone.setColumnFilter(2, { type: 'in', value: ['keep'] });
    new ClearFilterCommand(standalone).execute();
    expect(standalone.getAllFilters().size).toBe(0);

    const adopted = new Worksheet('Adopted clear filter', 4, 3);
    adopted.setColumnFilter(2, { type: 'in', value: ['keep'] });
    adopt(adopted);
    const events: unknown[] = [];
    const subscription = adopted.on((event) => events.push(event));
    expect(() => new ClearFilterCommand(adopted).execute()).toThrow(/Workbook-owned Worksheet/);
    expect(adopted.getColumnFilter(2)).toEqual({ type: 'in', value: ['keep'] });
    expect(events).toEqual([]);
    subscription.dispose();
  });

  test('AutoSumCommand preserves standalone formula entry and rejects adopted construction before reads', () => {
    const plan = { outputCell: { row: 3, col: 1 }, formula: '=SUM(A1:A2)' };
    const standalone = new Worksheet('Standalone autosum', 4, 2);
    new AutoSumCommand(standalone, [plan]).execute();
    expect(standalone.getCell(plan.outputCell)?.formula).toBe(plan.formula);

    const adopted = new Worksheet('Adopted autosum', 4, 2);
    adopt(adopted);
    const events: unknown[] = [];
    const subscription = adopted.on((event) => events.push(event));
    expect(() => new AutoSumCommand(adopted, [plan])).toThrow(/Workbook-owned Worksheet/);
    expect(adopted.getCell(plan.outputCell)).toBeUndefined();
    expect(events).toEqual([]);
    subscription.dispose();
  });

  test('TextToColumnsCommand keeps standalone splitting and rejects adopted writes without partial output', () => {
    const standalone = new Worksheet('Standalone text split', 2, 3);
    standalone.setCellValue({ row: 1, col: 1 }, 'red,blue');
    new TextToColumnsCommand(
      standalone,
      { start: { row: 1, col: 1 }, end: { row: 1, col: 2 } },
      ',',
    ).execute();
    expect(standalone.getCellValue({ row: 1, col: 1 })).toBe('red');
    expect(standalone.getCellValue({ row: 1, col: 2 })).toBe('blue');

    const adopted = new Worksheet('Adopted text split', 2, 3);
    adopted.setCellValue({ row: 1, col: 1 }, 'red,blue');
    adopt(adopted);
    const events: unknown[] = [];
    const subscription = adopted.on((event) => events.push(event));
    const command = new TextToColumnsCommand(
      adopted,
      { start: { row: 1, col: 1 }, end: { row: 1, col: 2 } },
      ',',
    );
    expect(() => command.execute()).toThrow(/Workbook-owned Worksheet/);
    expect(adopted.getCellValue({ row: 1, col: 1 })).toBe('red,blue');
    expect(adopted.getCellValue({ row: 1, col: 2 })).toBeNull();
    expect(events).toEqual([]);
    subscription.dispose();
  });

  test('SetDataValidationCommand fails closed on a Workbook-issued view before changing owner state', () => {
    const source = new Worksheet('Owned validation', 2, 2);
    const workbook = adopt(source);
    const view = workbook.activeSheet!;
    const command = new SetDataValidationCommand(
      view as unknown as Worksheet,
      { start: { row: 1, col: 1 }, end: { row: 1, col: 1 } },
      { type: 'wholeNumber', operator: 'greaterThan', value1: '0' },
    );

    expect(() => command.execute()).toThrow(/Workbook-owned Worksheet/);
    expect(source.getDataValidation({ row: 1, col: 1 })).toBeUndefined();
  });

  test('GroupOutlineCommand fails closed on a Workbook-issued view before adding facade state', () => {
    const source = new Worksheet('Owned outline', 4, 2);
    const workbook = adopt(source);
    const view = workbook.activeSheet!;
    const command = new GroupOutlineCommand(
      view as unknown as Worksheet,
      { start: { row: 1, col: 1 }, end: { row: 3, col: 1 } },
      'rows',
    );

    expect(() => command.execute()).toThrow(/Workbook-owned Worksheet/);
    expect(Object.prototype.hasOwnProperty.call(view, 'outlineGroups')).toBe(false);
  });
});
