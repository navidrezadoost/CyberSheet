import { Workbook } from '../src/workbook';
import { Worksheet } from '../src/worksheet';
import {
  AutoSumCommand,
  ClearDataValidationCommand,
  ClearFilterCommand,
  GroupOutlineCommand,
  RemoveDuplicatesCommand,
  SetDataValidationCommand,
  SortCommand,
  TextToColumnsCommand,
  ToggleAutoFilterCommand,
  UngroupOutlineCommand,
} from '../src/commands/DataCommands';

type RunnableCommand = { execute(): void; undo(): void };
type CommandSpec = { name: string; build(sheet: Worksheet): RunnableCommand };

const range = { start: { row: 1, col: 1 }, end: { row: 2, col: 2 } };

const commandSpecs: CommandSpec[] = [
  {
    name: 'SortCommand',
    build: (sheet) => new SortCommand(sheet, range, [{ columnIndex: 1, ascending: true }]),
  },
  {
    name: 'ToggleAutoFilterCommand',
    build: (sheet) => new ToggleAutoFilterCommand(sheet, range, true),
  },
  { name: 'ClearFilterCommand', build: (sheet) => new ClearFilterCommand(sheet) },
  {
    name: 'SetDataValidationCommand',
    build: (sheet) => new SetDataValidationCommand(sheet, range, { type: 'wholeNumber', value1: '1' }),
  },
  { name: 'ClearDataValidationCommand', build: (sheet) => new ClearDataValidationCommand(sheet, range) },
  {
    name: 'RemoveDuplicatesCommand',
    build: (sheet) => new RemoveDuplicatesCommand(sheet, range, [1]),
  },
  {
    name: 'TextToColumnsCommand',
    build: (sheet) => new TextToColumnsCommand(sheet, range, ','),
  },
  { name: 'GroupOutlineCommand', build: (sheet) => new GroupOutlineCommand(sheet, range, 'rows') },
  { name: 'UngroupOutlineCommand', build: (sheet) => new UngroupOutlineCommand(sheet, range, 'rows') },
  {
    name: 'AutoSumCommand',
    build: (sheet) => new AutoSumCommand(sheet, [{ outputCell: { row: 3, col: 1 }, formula: '=SUM(A1:A2)' }]),
  },
];

type CallCounts = { getCell: number; getCellValue: number; getDirectCellStyle: number; getAllFilters: number; getAutoFilterRange: number };
const callCounts = new WeakMap<TrackedWorksheet, CallCounts>();

class TrackedWorksheet extends Worksheet {
  constructor(name: string) {
    super(name, 4, 3);
    callCounts.set(this, {
      getCell: 0,
      getCellValue: 0,
      getDirectCellStyle: 0,
      getAllFilters: 0,
      getAutoFilterRange: 0,
    });
  }

  resetReads(): void {
    callCounts.set(this, {
      getCell: 0,
      getCellValue: 0,
      getDirectCellStyle: 0,
      getAllFilters: 0,
      getAutoFilterRange: 0,
    });
  }

  reads(): CallCounts {
    return { ...callCounts.get(this)! };
  }

  override getCell(...args: Parameters<Worksheet['getCell']>): ReturnType<Worksheet['getCell']> {
    callCounts.get(this)!.getCell++;
    return super.getCell(...args);
  }

  override getCellValue(...args: Parameters<Worksheet['getCellValue']>): ReturnType<Worksheet['getCellValue']> {
    callCounts.get(this)!.getCellValue++;
    return super.getCellValue(...args);
  }

  override getDirectCellStyle(...args: Parameters<Worksheet['getDirectCellStyle']>): ReturnType<Worksheet['getDirectCellStyle']> {
    callCounts.get(this)!.getDirectCellStyle++;
    return super.getDirectCellStyle(...args);
  }

  override getAllFilters(...args: Parameters<Worksheet['getAllFilters']>): ReturnType<Worksheet['getAllFilters']> {
    callCounts.get(this)!.getAllFilters++;
    return super.getAllFilters(...args);
  }

  override getAutoFilterRange(...args: Parameters<Worksheet['getAutoFilterRange']>): ReturnType<Worksheet['getAutoFilterRange']> {
    callCounts.get(this)!.getAutoFilterRange++;
    return super.getAutoFilterRange(...args);
  }
}

describe('DataCommands direct ownership preflight (H.83)', () => {
  test.each(commandSpecs)('$name rejects a retained Worksheet after adoption before reads', ({ build }) => {
    const worksheet = new TrackedWorksheet('Retained command source');
    worksheet.setCellFormula({ row: 1, col: 1 }, '=40+2', 'data-command-cache-sentinel');
    worksheet.setCellValue({ row: 1, col: 2 }, 'ordinary-value');
    const command = build(worksheet);
    const workbook = new Workbook();
    workbook.attachDevImportSheet(worksheet);
    const events: unknown[] = [];
    const subscription = worksheet.on((event) => events.push(event));
    worksheet.resetReads();

    expect(() => command.execute()).toThrow(/Workbook-owned Worksheet/);
    expect(worksheet.reads()).toEqual({
      getCell: 0,
      getCellValue: 0,
      getDirectCellStyle: 0,
      getAllFilters: 0,
      getAutoFilterRange: 0,
    });
    expect(events).toEqual([]);
    expect(worksheet.getCell({ row: 1, col: 1 })).toMatchObject({ value: 'data-command-cache-sentinel', formula: '=40+2' });
    subscription.dispose();
  });

  test.each(commandSpecs)('$name rejects a genuine Workbook-issued view without property reads', ({ build }) => {
    const source = new Worksheet('Issued command view', 4, 3);
    source.setCellFormula({ row: 1, col: 1 }, '=40+2', 'view-command-cache-sentinel');
    const workbook = new Workbook();
    workbook.attachDevImportSheet(source);
    const view = workbook.activeSheet!;
    const observedProperties: PropertyKey[] = [];
    const observedView = new Proxy(view, {
      get(target, property, receiver) {
        observedProperties.push(property);
        return Reflect.get(target, property, receiver);
      },
    });

    expect(() => {
      const command = build(observedView as unknown as Worksheet);
      command.execute();
    }).toThrow(/standalone Worksheet|Workbook-owned Worksheet/);
    expect(observedProperties).toEqual([]);
    expect(view.getCellValue({ row: 1, col: 1 })).toBeNull();
    expect(source.getCellValue({ row: 1, col: 1 })).toBe('view-command-cache-sentinel');
  });

  test.each(commandSpecs)('$name rejects undo if ownership changes after command creation', ({ build }) => {
    const worksheet = new TrackedWorksheet('Command undo transition');
    worksheet.setCellValue({ row: 1, col: 1 }, 'unchanged');
    const command = build(worksheet);
    const workbook = new Workbook();
    workbook.attachDevImportSheet(worksheet);
    const events: unknown[] = [];
    const subscription = worksheet.on((event) => events.push(event));
    worksheet.resetReads();

    expect(() => command.undo()).toThrow(/Workbook-owned Worksheet/);
    expect(worksheet.reads()).toEqual({
      getCell: 0,
      getCellValue: 0,
      getDirectCellStyle: 0,
      getAllFilters: 0,
      getAutoFilterRange: 0,
    });
    expect(events).toEqual([]);
    expect(worksheet.getCellValue({ row: 1, col: 1 })).toBe('unchanged');
    subscription.dispose();
  });

  test('does not read AutoSum snapshots when constructed with an adopted Worksheet', () => {
    const worksheet = new TrackedWorksheet('AutoSum constructor boundary');
    worksheet.setCellFormula({ row: 3, col: 1 }, '=1+1', 'autosum-output-sentinel');
    const workbook = new Workbook();
    workbook.attachDevImportSheet(worksheet);
    worksheet.resetReads();

    expect(() => new AutoSumCommand(worksheet, [{ outputCell: { row: 3, col: 1 }, formula: '=SUM(A1:A2)' }]))
      .toThrow(/Workbook-owned Worksheet/);
    expect(worksheet.reads()).toEqual({
      getCell: 0,
      getCellValue: 0,
      getDirectCellStyle: 0,
      getAllFilters: 0,
      getAutoFilterRange: 0,
    });
  });
});
