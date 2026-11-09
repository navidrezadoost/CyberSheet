import { afterEach, describe, expect, jest, test } from '@jest/globals';
import { Worksheet } from '../src/worksheet';
import { FormulaEngine } from '../src/FormulaEngine';
import {
  AutoSumCommand,
  ClearFilterCommand,
  ClearDataValidationCommand,
  GroupOutlineCommand,
  RemoveDuplicatesCommand,
  SortCommand,
  SetDataValidationCommand,
  TextToColumnsCommand,
  ToggleAutoFilterCommand,
  UngroupOutlineCommand,
} from '../src/commands/DataCommands';

describe('Sort and Text to Columns integrity characterization (H.88)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('Sort preserves formulas, cached values, styles, headers, blanks, and replayed undo snapshots', () => {
    const worksheet = new Worksheet('Sort integrity H88', 6, 5);
    worksheet.setCellValue({ row: 1, col: 1 }, 'Primary');
    worksheet.setCellValue({ row: 1, col: 2 }, 'Secondary');
    worksheet.setCellValue({ row: 2, col: 1 }, 2);
    worksheet.setCellValue({ row: 2, col: 2 }, 'b');
    worksheet.setCellValue({ row: 2, col: 3 }, 'ordinary');
    worksheet.setCellStyle({ row: 2, col: 4 }, { bold: true });
    worksheet.setCellValue({ row: 3, col: 1 }, 1);
    worksheet.setCellValue({ row: 3, col: 2 }, 'z');
    worksheet.setCellFormula({ row: 3, col: 3 }, '=A3*10', 10);
    worksheet.setCellStyle({ row: 3, col: 4 }, { italic: true });
    worksheet.setCellValue({ row: 4, col: 1 }, 1);
    worksheet.setCellValue({ row: 4, col: 2 }, 'a');
    worksheet.setCellFormula({ row: 4, col: 3 }, '=A4*100', 100);
    worksheet.setCellValue({ row: 5, col: 2 }, '');
    worksheet.setCellValue({ row: 3, col: 5 }, 'outside-column');
    worksheet.setCellValue({ row: 6, col: 1 }, 'outside-row');

    const snapshot = () => [1, 2, 3, 4, 5].map((row) => [1, 2, 3, 4].map((col) => ({
      cell: worksheet.getCell({ row, col }) ?? { value: null, formula: undefined },
      style: worksheet.getDirectCellStyle({ row, col }),
    })));
    const before = snapshot();
    const command = new SortCommand(
      worksheet,
      { start: { row: 1, col: 1 }, end: { row: 5, col: 4 } },
      [
        { columnIndex: 1, ascending: true },
        { columnIndex: 2, ascending: true },
      ],
      true,
    );
    jest.spyOn(console, 'log').mockImplementation(() => {});

    command.execute();
    expect(worksheet.getCellValue({ row: 1, col: 1 })).toBe('Primary');
    expect(worksheet.getCellValue({ row: 2, col: 2 })).toBe('a');
    expect(worksheet.getCell({ row: 2, col: 3 })).toMatchObject({ formula: '=A4*100', value: 100 });
    expect(worksheet.getDirectCellStyle({ row: 2, col: 4 })).toBeUndefined();
    expect(worksheet.getCell({ row: 3, col: 3 })).toMatchObject({ formula: '=A3*10', value: 10 });
    expect(worksheet.getDirectCellStyle({ row: 3, col: 4 })).toEqual({ italic: true });
    expect(worksheet.getCellValue({ row: 4, col: 2 })).toBe('b');
    expect(worksheet.getCellValue({ row: 5, col: 1 })).toBeNull();
    expect(worksheet.getCellValue({ row: 3, col: 5 })).toBe('outside-column');
    expect(worksheet.getCellValue({ row: 6, col: 1 })).toBe('outside-row');

    command.undo();
    expect(snapshot()).toEqual(before);
    expect(worksheet.getCellValue({ row: 3, col: 5 })).toBe('outside-column');
    expect(worksheet.getCellValue({ row: 6, col: 1 })).toBe('outside-row');
    command.execute();
    expect(worksheet.getCell({ row: 2, col: 3 })).toMatchObject({ formula: '=A4*100', value: 100 });
    command.undo();
    expect(snapshot()).toEqual(before);
  });

  test('Sort keeps whitespace text distinct from blank cells and preserves empty-string cells', () => {
    const worksheet = new Worksheet('Sort blank semantics H92', 4, 2);
    worksheet.setCellValue({ row: 1, col: 1 }, null);
    worksheet.setCellValue({ row: 2, col: 1 }, '   ');
    worksheet.setCellValue({ row: 3, col: 1 }, 'apple');
    worksheet.setCellValue({ row: 4, col: 1 }, '');
    const command = new SortCommand(worksheet, {
      start: { row: 1, col: 1 }, end: { row: 4, col: 1 },
    }, [{ columnIndex: 1, ascending: true }]);

    command.execute();
    expect([1, 2, 3, 4].map((row) => worksheet.getCellValue({ row, col: 1 }))).toEqual(['   ', 'apple', null, '']);
    command.undo();
    expect([1, 2, 3, 4].map((row) => worksheet.getCellValue({ row, col: 1 }))).toEqual([null, '   ', 'apple', '']);
  });

  test('Sort recovers a partially written range and does not retain an undo snapshot after failure', () => {
    const worksheet = new Worksheet('Sort partial failure H91', 4, 3);
    worksheet.setCellValue({ row: 1, col: 1 }, 2);
    worksheet.setCellValue({ row: 1, col: 2 }, 'second');
    worksheet.setCellStyle({ row: 1, col: 2 }, { italic: true });
    worksheet.setCellFormula({ row: 2, col: 1 }, '=1+0', 1);
    worksheet.setCellValue({ row: 2, col: 2 }, 'first');
    worksheet.setCellStyle({ row: 2, col: 2 }, { bold: true });
    const snapshot = () => [1, 2].map((row) => [1, 2].map((col) => ({
      cell: worksheet.getCell({ row, col }) ?? { value: null, formula: undefined },
      style: worksheet.getDirectCellStyle({ row, col }),
    })));
    const before = snapshot();
    const events: unknown[] = [];
    worksheet.on((event) => events.push(event));
    const originalRestore = worksheet.restoreCellContent.bind(worksheet);
    let failOnce = true;
    Object.defineProperty(worksheet, 'restoreCellContent', {
      configurable: true,
      value: (address: { row: number; col: number }, content: Parameters<Worksheet['restoreCellContent']>[1]) => {
        const result = originalRestore(address, content);
        if (failOnce && address.row === 1 && address.col === 2) {
          failOnce = false;
          throw new Error('controlled Sort content write failure');
        }
        return result;
      },
    });
    const command = new SortCommand(
      worksheet,
      { start: { row: 1, col: 1 }, end: { row: 2, col: 2 } },
      [{ columnIndex: 1, ascending: true }],
    );

    expect(() => command.execute()).toThrow('controlled Sort content write failure');
    expect(snapshot()).toEqual(before);
    expect(events.length).toBeGreaterThan(0);
    const afterFailure = snapshot();
    command.undo();
    expect(snapshot()).toEqual(afterFailure);
  });

  test('Sort recovers style-write and undo failures, preserving retry state', () => {
    const worksheet = new Worksheet('Sort style failure H91', 3, 3);
    worksheet.setCellValue({ row: 1, col: 1 }, 2);
    worksheet.setCellValue({ row: 2, col: 1 }, 1);
    worksheet.setCellStyle({ row: 1, col: 2 }, { italic: true });
    worksheet.setCellStyle({ row: 2, col: 2 }, { bold: true });
    const snapshot = () => [1, 2].map((row) => [1, 2].map((col) => ({
      value: worksheet.getCellValue({ row, col }),
      style: worksheet.getDirectCellStyle({ row, col }),
    })));
    const before = snapshot();
    const command = new SortCommand(worksheet, {
      start: { row: 1, col: 1 }, end: { row: 2, col: 2 },
    }, [{ columnIndex: 1, ascending: true }]);
    const originalSetStyle = worksheet.setCellStyle.bind(worksheet);
    let failApply = true;
    Object.defineProperty(worksheet, 'setCellStyle', {
      configurable: true,
      value: (address: { row: number; col: number }, style: Parameters<Worksheet['setCellStyle']>[1]) => {
        const result = originalSetStyle(address, style);
        if (failApply && address.row === 1 && address.col === 2) {
          failApply = false;
          throw new Error('controlled Sort style write failure');
        }
        return result;
      },
    });
    expect(() => command.execute()).toThrow('controlled Sort style write failure');
    expect(snapshot()).toEqual(before);
    command.undo();
    expect(snapshot()).toEqual(before);

    command.execute();
    const sorted = snapshot();
    let failUndo = true;
    Object.defineProperty(worksheet, 'setCellStyle', {
      configurable: true,
      value: (address: { row: number; col: number }, style: Parameters<Worksheet['setCellStyle']>[1]) => {
        const result = originalSetStyle(address, style);
        if (failUndo) {
          failUndo = false;
          throw new Error('controlled Sort undo style failure');
        }
        return result;
      },
    });
    expect(() => command.undo()).toThrow('controlled Sort undo style failure');
    expect(snapshot()).toEqual(sorted);
    command.undo();
    expect(snapshot()).toEqual(before);
  });

  test('Sort reports incomplete recovery while preserving the original write failure', () => {
    const worksheet = new Worksheet('Sort incomplete recovery H91', 3, 2);
    worksheet.setCellValue({ row: 1, col: 1 }, 2);
    worksheet.setCellValue({ row: 2, col: 1 }, 1);
    const originalRestore = worksheet.restoreCellContent.bind(worksheet);
    let failWrite = true;
    let failRecovery = true;
    Object.defineProperty(worksheet, 'restoreCellContent', {
      configurable: true,
      value: (address: { row: number; col: number }, content: Parameters<Worksheet['restoreCellContent']>[1]) => {
        if (failWrite && address.row === 1 && address.col === 2) {
          originalRestore(address, content);
          failWrite = false;
          throw new Error('primary Sort write failure');
        }
        if (!failWrite && failRecovery && address.row === 1 && address.col === 1) {
          failRecovery = false;
          throw new Error('controlled Sort restoration failure');
        }
        return originalRestore(address, content);
      },
    });
    const command = new SortCommand(worksheet, {
      start: { row: 1, col: 1 }, end: { row: 2, col: 2 },
    }, [{ columnIndex: 1, ascending: true }]);

    let failure: unknown;
    try { command.execute(); } catch (error) { failure = error; }
    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).message).toContain('best-effort recovery was incomplete');
    expect((failure as Error & { cause?: unknown }).cause).toEqual(new Error('primary Sort write failure'));
    expect((failure as Error & { recoveryErrors?: unknown[] }).recoveryErrors).toHaveLength(1);
  });

  test('Text to Columns undo restores source and overwritten target formulas and resets snapshots for replay', () => {
    const worksheet = new Worksheet('Text to Columns formula integrity H88', 3, 4);
    worksheet.setCellFormula({ row: 1, col: 2 }, '=A1&","&A2', 'red,blue');
    worksheet.setCellFormula({ row: 1, col: 3 }, '=B1', 'target-formula-cache');
    worksheet.setCellStyle({ row: 1, col: 2 }, { bold: true });
    worksheet.setCellStyle({ row: 1, col: 3 }, { italic: true });
    const command = new TextToColumnsCommand(
      worksheet,
      { start: { row: 1, col: 2 }, end: { row: 1, col: 3 } },
      ',',
    );
    jest.spyOn(console, 'log').mockImplementation(() => {});

    command.execute();
    expect(worksheet.getCellValue({ row: 1, col: 2 })).toBe('red');
    expect(worksheet.getCellValue({ row: 1, col: 3 })).toBe('blue');
    command.undo();
    expect(worksheet.getCell({ row: 1, col: 2 })).toMatchObject({ formula: '=A1&","&A2', value: 'red,blue' });
    expect(worksheet.getCell({ row: 1, col: 3 })).toMatchObject({ formula: '=B1', value: 'target-formula-cache' });
    expect(worksheet.getDirectCellStyle({ row: 1, col: 2 })).toEqual({ bold: true });
    expect(worksheet.getDirectCellStyle({ row: 1, col: 3 })).toEqual({ italic: true });

    worksheet.setCellValue({ row: 1, col: 2 }, 'green,yellow');
    worksheet.setCellValue({ row: 1, col: 3 }, 'new-target');
    command.execute();
    expect(worksheet.getCellValue({ row: 1, col: 2 })).toBe('green');
    expect(worksheet.getCellValue({ row: 1, col: 3 })).toBe('yellow');
    command.undo();
    expect(worksheet.getCellValue({ row: 1, col: 2 })).toBe('green,yellow');
    expect(worksheet.getCellValue({ row: 1, col: 3 })).toBe('new-target');
  });

  test.each(['content', 'style'] as const)('Text to Columns undo recovers a one-shot %s failure and remains retryable', (failureKind) => {
    const worksheet = new Worksheet(`Text to Columns undo failure ${failureKind} H92`, 2, 3);
    worksheet.setCellValue({ row: 1, col: 1 }, 'left,right');
    worksheet.setCellStyle({ row: 1, col: 1 }, { bold: true });
    worksheet.setCellValue({ row: 1, col: 2 }, 'prior-target');
    worksheet.setCellStyle({ row: 1, col: 2 }, { italic: true });
    const before = [1, 2].map((col) => ({
      cell: worksheet.getCell({ row: 1, col }) ?? { value: null, formula: undefined },
      style: worksheet.getDirectCellStyle({ row: 1, col }),
    }));
    const command = new TextToColumnsCommand(worksheet, {
      start: { row: 1, col: 1 }, end: { row: 1, col: 1 },
    }, ',');
    command.execute();
    const split = [1, 2].map((col) => ({
      cell: worksheet.getCell({ row: 1, col }) ?? { value: null, formula: undefined },
      style: worksheet.getDirectCellStyle({ row: 1, col }),
    }));

    if (failureKind === 'content') {
      const restore = worksheet.restoreCellContent.bind(worksheet);
      let failOnce = true;
      Object.defineProperty(worksheet, 'restoreCellContent', {
        configurable: true,
        value: (address: { row: number; col: number }, content: Parameters<Worksheet['restoreCellContent']>[1]) => {
          const result = restore(address, content);
          if (failOnce && address.col === 1) {
            failOnce = false;
            throw new Error('controlled Text to Columns undo content failure');
          }
          return result;
        },
      });
    } else {
      const setStyle = worksheet.setCellStyle.bind(worksheet);
      let failOnce = true;
      Object.defineProperty(worksheet, 'setCellStyle', {
        configurable: true,
        value: (address: { row: number; col: number }, style: Parameters<Worksheet['setCellStyle']>[1]) => {
          const result = setStyle(address, style);
          if (failOnce && address.col === 1) {
            failOnce = false;
            throw new Error('controlled Text to Columns undo style failure');
          }
          return result;
        },
      });
    }

    expect(() => command.undo()).toThrow(`controlled Text to Columns undo ${failureKind} failure`);
    expect([1, 2].map((col) => ({
      cell: worksheet.getCell({ row: 1, col }) ?? { value: null, formula: undefined },
      style: worksheet.getDirectCellStyle({ row: 1, col }),
    }))).toEqual(split);
    command.undo();
    expect([1, 2].map((col) => ({
      cell: worksheet.getCell({ row: 1, col }) ?? { value: null, formula: undefined },
      style: worksheet.getDirectCellStyle({ row: 1, col }),
    }))).toEqual(before);
  });

  test('Text to Columns characterizes output beyond declared column count', () => {
    const worksheet = new Worksheet('Text to Columns overflow H88', 2, 2);
    worksheet.setCellValue({ row: 1, col: 2 }, 'left,right');
    const command = new TextToColumnsCommand(
      worksheet,
      { start: { row: 1, col: 2 }, end: { row: 1, col: 2 } },
      ',',
    );
    jest.spyOn(console, 'log').mockImplementation(() => {});

    command.execute();
    expect(worksheet.getCellValue({ row: 1, col: 2 })).toBe('left');
    expect(worksheet.getCellValue({ row: 1, col: 3 })).toBe('right');
    expect(worksheet.colCount).toBe(2);
    command.undo();
    expect(worksheet.getCellValue({ row: 1, col: 2 })).toBe('left,right');
    expect(worksheet.getCellValue({ row: 1, col: 3 })).toBeNull();
  });

  test('Text to Columns permits output through XFD even when it exceeds declared colCount', () => {
    const worksheet = new Worksheet('Text to Columns XFD H89', 2, 2);
    worksheet.setCellValue({ row: 1, col: 16_383 }, 'left,right');
    const command = new TextToColumnsCommand(
      worksheet,
      { start: { row: 1, col: 16_383 }, end: { row: 1, col: 16_383 } },
      ',',
    );
    jest.spyOn(console, 'log').mockImplementation(() => {});

    command.execute();
    expect(worksheet.getCellValue({ row: 1, col: 16_383 })).toBe('left');
    expect(worksheet.getCellValue({ row: 1, col: 16_384 })).toBe('right');
    expect(worksheet.colCount).toBe(2);
    command.undo();
    expect(worksheet.getCellValue({ row: 1, col: 16_383 })).toBe('left,right');
    expect(worksheet.getCellValue({ row: 1, col: 16_384 })).toBeNull();
  });

  test('Text to Columns fixedWidth flag has no width-boundary payload and currently splits by delimiter', () => {
    const worksheet = new Worksheet('Text to Columns fixed width contract', 2, 3);
    worksheet.setCellValue({ row: 1, col: 1 }, 'ABCD,EF');
    const command = new TextToColumnsCommand(
      worksheet,
      { start: { row: 1, col: 1 }, end: { row: 1, col: 1 } },
      ',',
      'fixedWidth',
    );
    jest.spyOn(console, 'log').mockImplementation(() => {});

    command.execute();
    expect(worksheet.getCellValue({ row: 1, col: 1 })).toBe('ABCD');
    expect(worksheet.getCellValue({ row: 1, col: 2 })).toBe('EF');
    command.undo();
    expect(worksheet.getCellValue({ row: 1, col: 1 })).toBe('ABCD,EF');
    expect(worksheet.getCellValue({ row: 1, col: 2 })).toBeNull();
  });

  test('Text to Columns rejects XFE output before mutating any row in the selection', () => {
    const worksheet = new Worksheet('Text to Columns XFE preflight H89', 3, 2);
    worksheet.setCellValue({ row: 1, col: 16_383 }, 'one,two');
    worksheet.setCellFormula({ row: 2, col: 16_383 }, '=A1&", "&B1', 'three, four, five');
    worksheet.setCellFormula({ row: 2, col: 16_384 }, '=1+1', 2);
    worksheet.setCellStyle({ row: 2, col: 16_384 }, { italic: true });
    const before = [1, 2].map((row) => [16_383, 16_384].map((col) => ({
      cell: worksheet.getCell({ row, col }) ?? { value: null, formula: undefined },
      style: worksheet.getDirectCellStyle({ row, col }),
    })));
    const events: unknown[] = [];
    const subscription = worksheet.on((event) => events.push(event));
    const command = new TextToColumnsCommand(
      worksheet,
      { start: { row: 1, col: 16_383 }, end: { row: 2, col: 16_383 } },
      ',',
    );
    jest.spyOn(console, 'log').mockImplementation(() => {});

    expect(() => command.execute()).toThrow(/columns 1–16384/);
    expect([1, 2].map((row) => [16_383, 16_384].map((col) => ({
      cell: worksheet.getCell({ row, col }) ?? { value: null, formula: undefined },
      style: worksheet.getDirectCellStyle({ row, col }),
    })))).toEqual(before);
    expect(events).toEqual([]);
    subscription.dispose();
  });

  test('Text to Columns reports incomplete recovery when a target remains unavailable', () => {
    const worksheet = new Worksheet('Text to Columns partial failure H88', 2, 4);
    worksheet.setCellValue({ row: 1, col: 1 }, 'first,second,third');
    const setCellValue = worksheet.setCellValue.bind(worksheet);
    Object.defineProperty(worksheet, 'setCellValue', {
      configurable: true,
      value: (address: { row: number; col: number }, value: Parameters<Worksheet['setCellValue']>[1]) => {
        if (address.row === 1 && address.col === 3) throw new Error('controlled Text to Columns write failure');
        return setCellValue(address, value);
      },
    });
    const events: unknown[] = [];
    const subscription = worksheet.on((event) => events.push(event));
    const command = new TextToColumnsCommand(
      worksheet,
      { start: { row: 1, col: 1 }, end: { row: 1, col: 1 } },
      ',',
    );

    let thrown: unknown;
    try {
      command.execute();
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).toContain('controlled Text to Columns write failure');
    expect((thrown as Error).message).toContain('recovery was incomplete');
    expect(worksheet.getCellValue({ row: 1, col: 1 })).toBe('first,second,third');
    expect(worksheet.getCellValue({ row: 1, col: 2 })).toBeNull();
    expect(worksheet.getCellValue({ row: 1, col: 3 })).toBeNull();
    expect(events.length).toBeGreaterThan(0);
    subscription.dispose();
  });

  test.each([1, 2, 3])('Text to Columns restores formulas, values, and styles after a one-shot failure at output %i', (failingColumn) => {
    const worksheet = new Worksheet(`Text to Columns recovery ${failingColumn}`, 2, 4);
    worksheet.setCellFormula({ row: 1, col: 1 }, '=A2&", "&A3&", "&A4', 'first, second, third');
    worksheet.setCellFormula({ row: 1, col: 2 }, '=1+1', 22);
    worksheet.setCellValue({ row: 1, col: 3 }, 'prior-third');
    worksheet.setCellStyle({ row: 1, col: 1 }, { bold: true });
    worksheet.setCellStyle({ row: 1, col: 2 }, { italic: true });
    worksheet.setCellStyle({ row: 1, col: 3 }, { underline: true });
    const snapshot = () => [1, 2, 3].map((col) => ({
      cell: worksheet.getCell({ row: 1, col }) ?? { value: null, formula: undefined },
      style: worksheet.getDirectCellStyle({ row: 1, col }),
    }));
    const before = snapshot();
    const events: unknown[] = [];
    const subscription = worksheet.on((event) => events.push(event));
    const originalSetCellValue = worksheet.setCellValue.bind(worksheet);
    let shouldFail = true;
    let eventCountAtFailure = -1;
    const failure = new Error(`controlled Text to Columns failure at ${failingColumn}`);
    Object.defineProperty(worksheet, 'setCellValue', {
      configurable: true,
      value: (address: { row: number; col: number }, value: Parameters<Worksheet['setCellValue']>[1]) => {
        if (shouldFail && address.row === 1 && address.col === failingColumn) {
          shouldFail = false;
          eventCountAtFailure = events.length;
          throw failure;
        }
        return originalSetCellValue(address, value);
      },
    });
    const command = new TextToColumnsCommand(
      worksheet,
      { start: { row: 1, col: 1 }, end: { row: 1, col: 1 } },
      ',',
    );

    expect(() => command.execute()).toThrow(failure);
    expect(snapshot()).toEqual(before);
    expect(eventCountAtFailure).toBeGreaterThanOrEqual(0);
    expect(events.length).toBeGreaterThan(eventCountAtFailure);
    subscription.dispose();
  });

  test('Text to Columns reports incomplete best-effort recovery while retaining the original failure as cause', () => {
    const worksheet = new Worksheet('Text to Columns incomplete recovery', 2, 3);
    worksheet.setCellValue({ row: 1, col: 1 }, 'one,two');
    const originalSetCellValue = worksheet.setCellValue.bind(worksheet);
    const writeFailure = new Error('primary split failure');
    Object.defineProperty(worksheet, 'setCellValue', {
      configurable: true,
      value: (address: { row: number; col: number }, value: Parameters<Worksheet['setCellValue']>[1]) => {
        if (address.row === 1 && address.col === 2 && value === 'two') throw writeFailure;
        if (address.row === 1 && address.col === 1 && value === 'one,two') {
          throw new Error('controlled recovery failure');
        }
        return originalSetCellValue(address, value);
      },
    });
    const command = new TextToColumnsCommand(
      worksheet,
      { start: { row: 1, col: 1 }, end: { row: 1, col: 1 } },
      ',',
    );

    let thrown: unknown;
    try {
      command.execute();
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).toContain('primary split failure');
    expect((thrown as Error).message).toContain('recovery was incomplete');
    expect((thrown as Error & { cause?: unknown }).cause).toBe(writeFailure);
  });

  test('Text to Columns clears failed-execution snapshots before a later replay', () => {
    const worksheet = new Worksheet('Text to Columns stale failure snapshots', 2, 3);
    worksheet.setCellValue({ row: 1, col: 1 }, 'old,output');
    const originalSetCellValue = worksheet.setCellValue.bind(worksheet);
    let shouldFail = true;
    Object.defineProperty(worksheet, 'setCellValue', {
      configurable: true,
      value: (address: { row: number; col: number }, value: Parameters<Worksheet['setCellValue']>[1]) => {
        if (shouldFail && address.row === 1 && address.col === 2) {
          shouldFail = false;
          throw new Error('one-shot replay setup failure');
        }
        return originalSetCellValue(address, value);
      },
    });
    const command = new TextToColumnsCommand(
      worksheet,
      { start: { row: 1, col: 1 }, end: { row: 1, col: 1 } },
      ',',
    );
    expect(() => command.execute()).toThrow('one-shot replay setup failure');

    worksheet.setCellValue({ row: 1, col: 1 }, 'new,latest');
    command.execute();
    command.undo();
    expect(worksheet.getCellValue({ row: 1, col: 1 })).toBe('new,latest');
    expect(worksheet.getCellValue({ row: 1, col: 2 })).toBeNull();
  });

  test('Text to Columns recovers a one-shot failure while retaining emitted event history', () => {
    const worksheet = new Worksheet('Text to Columns failure undo H89', 2, 4);
    worksheet.setCellFormula({ row: 1, col: 1 }, '=A2&", "&A3', 'first,second,third');
    worksheet.setCellFormula({ row: 1, col: 2 }, '=1+1', 2);
    worksheet.setCellStyle({ row: 1, col: 2 }, { bold: true });
    const before = [1, 2, 3].map((col) => ({
      cell: worksheet.getCell({ row: 1, col }) ?? { value: null, formula: undefined },
      style: worksheet.getDirectCellStyle({ row: 1, col }),
    }));
    const originalSetCellValue = worksheet.setCellValue.bind(worksheet);
    let shouldFail = true;
    Object.defineProperty(worksheet, 'setCellValue', {
      configurable: true,
      value: (address: { row: number; col: number }, value: Parameters<Worksheet['setCellValue']>[1]) => {
        if (shouldFail && address.row === 1 && address.col === 3) {
          shouldFail = false;
          throw new Error('controlled one-shot Text to Columns write failure');
        }
        return originalSetCellValue(address, value);
      },
    });
    const events: unknown[] = [];
    const subscription = worksheet.on((event) => events.push(event));
    const command = new TextToColumnsCommand(
      worksheet,
      { start: { row: 1, col: 1 }, end: { row: 1, col: 1 } },
      ',',
    );
    jest.spyOn(console, 'log').mockImplementation(() => {});
    const eventsBeforeFailure = events.length;

    expect(() => command.execute()).toThrow('controlled one-shot Text to Columns write failure');
    expect([1, 2, 3].map((col) => ({
      cell: worksheet.getCell({ row: 1, col }) ?? { value: null, formula: undefined },
      style: worksheet.getDirectCellStyle({ row: 1, col }),
    }))).toEqual(before);
    expect(events.length).toBeGreaterThan(0);
    expect(events.length).toBeGreaterThan(eventsBeforeFailure);

    command.undo();
    expect([1, 2, 3].map((col) => ({
      cell: worksheet.getCell({ row: 1, col }) ?? { value: null, formula: undefined },
      style: worksheet.getDirectCellStyle({ row: 1, col }),
    }))).toEqual(before);
    expect(events.length).toBeGreaterThan(eventsBeforeFailure);
    subscription.dispose();
  });

  test('Text to Columns failed recovery leaves no stale undo snapshot from the failed write', () => {
    const worksheet = new Worksheet('Text to Columns one-shot failure H89', 2, 4);
    worksheet.setCellValue({ row: 1, col: 1 }, 'first,second,third');
    worksheet.setCellFormula({ row: 1, col: 2 }, '=A2+1', 42);
    worksheet.setCellStyle({ row: 1, col: 2 }, { italic: true });
    const snapshot = () => [1, 2, 3].map((col) => ({
      cell: worksheet.getCell({ row: 1, col }) ?? { value: null, formula: undefined },
      style: worksheet.getDirectCellStyle({ row: 1, col }),
    }));
    const before = snapshot();
    const originalSetCellValue = worksheet.setCellValue.bind(worksheet);
    let shouldFail = true;
    Object.defineProperty(worksheet, 'setCellValue', {
      configurable: true,
      value: (address: { row: number; col: number }, value: Parameters<Worksheet['setCellValue']>[1]) => {
        if (shouldFail && address.row === 1 && address.col === 3) {
          shouldFail = false;
          throw new Error('controlled one-shot Text to Columns command failure');
        }
        return originalSetCellValue(address, value);
      },
    });
    const command = new TextToColumnsCommand(
      worksheet,
      { start: { row: 1, col: 1 }, end: { row: 1, col: 1 } },
      ',',
    );
    jest.spyOn(console, 'log').mockImplementation(() => {});

    expect(() => command.execute()).toThrow('controlled one-shot Text to Columns command failure');
    command.undo();
    expect(snapshot()).toEqual(before);
  });

  test('Toggle AutoFilter preserves prior range through enable, disable, and undo', () => {
    const worksheet = new Worksheet('Toggle filter replay H89', 5, 4);
    worksheet.setAutoFilterRange(2, 2, 3);
    const command = new ToggleAutoFilterCommand(
      worksheet,
      { start: { row: 1, col: 1 }, end: { row: 5, col: 4 } },
      true,
    );
    jest.spyOn(console, 'log').mockImplementation(() => {});

    command.execute();
    expect(worksheet.getAutoFilterRange()).toEqual({ headerRow: 1, startCol: 1, endCol: 4 });
    command.undo();
    expect(worksheet.getAutoFilterRange()).toEqual({ headerRow: 2, startCol: 2, endCol: 3 });

    const disable = new ToggleAutoFilterCommand(
      worksheet,
      { start: { row: 1, col: 1 }, end: { row: 5, col: 4 } },
      false,
    );
    disable.execute();
    expect(worksheet.getAutoFilterRange()).toBeNull();
    disable.undo();
    expect(worksheet.getAutoFilterRange()).toEqual({ headerRow: 2, startCol: 2, endCol: 3 });

    worksheet.clearAutoFilterRange();
    const enableFromEmpty = new ToggleAutoFilterCommand(
      worksheet,
      { start: { row: 1, col: 1 }, end: { row: 5, col: 4 } },
      true,
    );
    enableFromEmpty.execute();
    expect(worksheet.getAutoFilterRange()).not.toBeNull();
    enableFromEmpty.undo();
    expect(worksheet.getAutoFilterRange()).toBeNull();
  });

  test('Toggle AutoFilter recovers a failed mutation and does not expose a stale undo snapshot', () => {
    const worksheet = new Worksheet('Toggle filter failure H91', 3, 3);
    const before = { headerRow: 2, startCol: 2, endCol: 3 };
    worksheet.setAutoFilterRange(before.headerRow, before.startCol, before.endCol);
    const originalSet = worksheet.setAutoFilterRange.bind(worksheet);
    let failOnce = true;
    Object.defineProperty(worksheet, 'setAutoFilterRange', {
      configurable: true,
      value: (headerRow: number, startCol: number, endCol: number) => {
        const result = originalSet(headerRow, startCol, endCol);
        if (failOnce) {
          failOnce = false;
          throw new Error('controlled AutoFilter write failure');
        }
        return result;
      },
    });
    const command = new ToggleAutoFilterCommand(worksheet, {
      start: { row: 1, col: 1 }, end: { row: 3, col: 3 },
    }, true);

    expect(() => command.execute()).toThrow('controlled AutoFilter write failure');
    expect(worksheet.getAutoFilterRange()).toEqual(before);
    command.undo();
    expect(worksheet.getAutoFilterRange()).toEqual(before);
  });

  test('ClearFilter snapshots and restores current filters on each execution', () => {
    const worksheet = new Worksheet('Clear filter replay H89', 4, 3);
    const first = { type: 'in' as const, value: ['keep-first'] };
    const second = { type: 'in' as const, value: ['keep-second'] };
    worksheet.setColumnFilter(1, first);
    const command = new ClearFilterCommand(worksheet);
    jest.spyOn(console, 'log').mockImplementation(() => {});

    command.execute();
    expect(worksheet.getAllFilters().size).toBe(0);
    command.undo();
    expect(worksheet.getColumnFilter(1)).toEqual(first);

    worksheet.setColumnFilter(2, second);
    command.execute();
    expect(worksheet.getAllFilters().size).toBe(0);
    command.undo();
    expect(worksheet.getAllFilters()).toEqual(new Map([[1, first], [2, second]]));
  });

  test('ClearFilter recovers a failed clear and invalidates the failed execution snapshot', () => {
    const worksheet = new Worksheet('Clear filter failure H91', 3, 3);
    const first = { type: 'in' as const, value: ['first'] };
    const second = { type: 'in' as const, value: ['second'] };
    worksheet.setColumnFilter(1, first);
    worksheet.setColumnFilter(2, second);
    const before = worksheet.getAllFilters();
    const events: unknown[] = [];
    worksheet.on((event) => events.push(event));
    const originalClear = worksheet.clearAllFilters.bind(worksheet);
    let failOnce = true;
    Object.defineProperty(worksheet, 'clearAllFilters', {
      configurable: true,
      value: () => {
        originalClear();
        if (failOnce) {
          failOnce = false;
          throw new Error('controlled ClearFilter failure');
        }
      },
    });
    const command = new ClearFilterCommand(worksheet);

    expect(() => command.execute()).toThrow('controlled ClearFilter failure');
    expect(worksheet.getAllFilters()).toEqual(before);
    expect(events.length).toBeGreaterThan(0);
    const recovered = worksheet.getAllFilters();
    command.undo();
    expect(worksheet.getAllFilters()).toEqual(recovered);
  });
});

describe('remaining DataCommands standalone characterization (H.84)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('Set Data Validation is visible through Worksheet APIs and undo restores prior rules', () => {
    const worksheet = new Worksheet('Set validation H84', 4, 3);
    const prior = { type: 'list' as const, formula1: 'Red,Green' };
    worksheet.setDataValidation({ row: 1, col: 1 }, prior);
    const events: unknown[] = [];
    const subscription = worksheet.on((event) => events.push(event));
    const command = new SetDataValidationCommand(
      worksheet,
      { start: { row: 1, col: 1 }, end: { row: 2, col: 2 } },
      { type: 'wholeNumber', value1: '1' },
    );
    jest.spyOn(console, 'log').mockImplementation(() => {});

    command.execute();
    expect(worksheet.getDataValidation({ row: 1, col: 1 })).toEqual({
      type: 'whole',
      formula1: '1',
    });
    expect(worksheet.getDataValidation({ row: 2, col: 2 })).toEqual({
      type: 'whole',
      formula1: '1',
    });
    expect(worksheet.getValidationCells()).toEqual([
      { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 2, col: 1 }, { row: 2, col: 2 },
    ]);
    expect(Object.prototype.hasOwnProperty.call(worksheet, 'validationRules')).toBe(false);
    expect(events.length).toBeGreaterThan(0);
    command.undo();
    expect(worksheet.getDataValidation({ row: 1, col: 1 })).toEqual(prior);
    expect(worksheet.getValidationCells()).toEqual([{ row: 1, col: 1 }]);
    expect(events.length).toBeGreaterThan(4);
    subscription.dispose();
  });

  test('Set Data Validation maps the actual dialog rule shape into Worksheet validation state', () => {
    const worksheet = new Worksheet('Dialog validation H87', 3, 2);
    const range = { start: { row: 1, col: 1 }, end: { row: 1, col: 2 } };
    const command = new SetDataValidationCommand(worksheet, range, {
      id: 'dialog-rule-h87',
      range,
      type: 'whole',
      operator: 'greaterOrEqual',
      formula1: '5',
      formula2: '10',
      allowBlank: false,
      showDropdown: false,
      showInputMessage: true,
      inputTitle: 'Input',
      inputMessage: 'Enter at least five',
      showErrorAlert: true,
      errorStyle: 'warning',
      errorTitle: 'Range',
      errorMessage: 'Use a value from 5 to 10',
    });
    jest.spyOn(console, 'log').mockImplementation(() => {});

    command.execute();
    expect(worksheet.getDataValidation({ row: 1, col: 1 })).toEqual({
      type: 'whole',
      operator: 'greaterThanOrEqualTo',
      formula1: '5',
      formula2: '10',
      allowBlank: false,
      showDropdown: false,
      showInputMessage: true,
      inputTitle: 'Input',
      inputMessage: 'Enter at least five',
      showErrorAlert: true,
      errorStyle: 'warning',
      errorTitle: 'Range',
      errorMessage: 'Use a value from 5 to 10',
    });
    command.undo();
    expect(worksheet.getDataValidation({ row: 1, col: 1 })).toBeUndefined();
    expect(worksheet.getValidationCells()).toEqual([]);
  });

  test('Clear Data Validation operates on Worksheet rules and undo restores them', () => {
    const worksheet = new Worksheet('Clear validation H84', 4, 3);
    const rule = {
      id: 'validation-rule-h84',
      range: { start: { row: 1, col: 1 }, end: { row: 1, col: 1 } },
      type: 'whole' as const,
      formula1: '1',
    };
    worksheet.setDataValidation({ row: 1, col: 1 }, rule);
    const events: unknown[] = [];
    const subscription = worksheet.on((event) => events.push(event));
    const command = new ClearDataValidationCommand(
      worksheet,
      { start: { row: 1, col: 1 }, end: { row: 2, col: 2 } },
    );
    jest.spyOn(console, 'log').mockImplementation(() => {});

    command.execute();
    expect(worksheet.getDataValidation({ row: 1, col: 1 })).toBeUndefined();
    expect(worksheet.getValidationCells()).toEqual([]);
    expect(events.length).toBeGreaterThan(0);
    command.undo();
    expect(worksheet.getDataValidation({ row: 1, col: 1 })).toEqual(rule);
    expect(worksheet.getValidationCells()).toEqual([{ row: 1, col: 1 }]);
    expect(events.length).toBeGreaterThan(1);
    subscription.dispose();
  });

  test('Set and Clear Data Validation replay undo to the state before each execution', () => {
    const worksheet = new Worksheet('Validation replay H89', 3, 2);
    const initial = { type: 'whole' as const, formula1: '1' };
    const changed = { type: 'decimal' as const, formula1: '2' };
    worksheet.setDataValidation({ row: 1, col: 1 }, initial);
    const set = new SetDataValidationCommand(
      worksheet,
      { start: { row: 1, col: 1 }, end: { row: 1, col: 1 } },
      { type: 'list', formula1: 'a,b' },
    );
    const clear = new ClearDataValidationCommand(
      worksheet,
      { start: { row: 1, col: 1 }, end: { row: 1, col: 1 } },
    );
    jest.spyOn(console, 'log').mockImplementation(() => {});

    set.execute();
    set.undo();
    expect(worksheet.getDataValidation({ row: 1, col: 1 })).toEqual(initial);
    worksheet.setDataValidation({ row: 1, col: 1 }, changed);
    set.execute();
    set.undo();
    expect(worksheet.getDataValidation({ row: 1, col: 1 })).toEqual(changed);

    clear.execute();
    clear.undo();
    expect(worksheet.getDataValidation({ row: 1, col: 1 })).toEqual(changed);
    worksheet.setDataValidation({ row: 1, col: 1 }, initial);
    clear.execute();
    clear.undo();
    expect(worksheet.getDataValidation({ row: 1, col: 1 })).toEqual(initial);
  });

  test('Set Data Validation recovers a partial failure and refreshes snapshots on replay', () => {
    const worksheet = new Worksheet('Set validation failure H91', 3, 2);
    const first = { type: 'whole' as const, formula1: '1' };
    const second = { type: 'decimal' as const, formula1: '2' };
    worksheet.setDataValidation({ row: 1, col: 1 }, first);
    worksheet.setDataValidation({ row: 1, col: 2 }, second);
    const before = [1, 2].map((col) => worksheet.getDataValidation({ row: 1, col }) );
    const events: unknown[] = [];
    worksheet.on((event) => events.push(event));
    const originalSet = worksheet.setDataValidation.bind(worksheet);
    let failOnce = true;
    Object.defineProperty(worksheet, 'setDataValidation', {
      configurable: true,
      value: (address: { row: number; col: number }, rule: Parameters<Worksheet['setDataValidation']>[1]) => {
        const result = originalSet(address, rule);
        if (failOnce && address.row === 1 && address.col === 2 && rule.type === 'list') {
          failOnce = false;
          throw new Error('controlled validation write failure');
        }
        return result;
      },
    });
    const command = new SetDataValidationCommand(
      worksheet,
      { start: { row: 1, col: 1 }, end: { row: 1, col: 2 } },
      { type: 'list', formula1: 'a,b' },
    );

    expect(() => command.execute()).toThrow('controlled validation write failure');
    expect([1, 2].map((col) => worksheet.getDataValidation({ row: 1, col }))).toEqual(before);
    expect(events.length).toBeGreaterThan(0);
    const afterFailure = [1, 2].map((col) => worksheet.getDataValidation({ row: 1, col }));
    command.undo();
    expect([1, 2].map((col) => worksheet.getDataValidation({ row: 1, col }))).toEqual(afterFailure);

    worksheet.setDataValidation({ row: 1, col: 1 }, { type: 'textLength', formula1: '3' });
    command.execute();
    command.undo();
    expect(worksheet.getDataValidation({ row: 1, col: 1 })).toEqual({ type: 'textLength', formula1: '3' });
    expect(worksheet.getDataValidation({ row: 1, col: 2 })).toEqual(second);
  });

  test('Clear Data Validation recovers a partial failure and leaves failed undo unavailable', () => {
    const worksheet = new Worksheet('Clear validation failure H91', 3, 2);
    const first = { type: 'whole' as const, formula1: '1' };
    const second = { type: 'decimal' as const, formula1: '2' };
    worksheet.setDataValidation({ row: 1, col: 1 }, first);
    worksheet.setDataValidation({ row: 1, col: 2 }, second);
    const original = [1, 2].map((col) => worksheet.getDataValidation({ row: 1, col }));
    const events: unknown[] = [];
    worksheet.on((event) => events.push(event));
    const remove = worksheet.removeDataValidation.bind(worksheet);
    let failOnce = true;
    Object.defineProperty(worksheet, 'removeDataValidation', {
      configurable: true,
      value: (address: { row: number; col: number }) => {
        const result = remove(address);
        if (failOnce && address.col === 2) {
          failOnce = false;
          throw new Error('controlled validation removal failure');
        }
        return result;
      },
    });
    const command = new ClearDataValidationCommand(worksheet, {
      start: { row: 1, col: 1 }, end: { row: 1, col: 2 },
    });

    expect(() => command.execute()).toThrow('controlled validation removal failure');
    expect([1, 2].map((col) => worksheet.getDataValidation({ row: 1, col }))).toEqual(original);
    expect(events.length).toBeGreaterThan(0);
    command.undo();
    expect([1, 2].map((col) => worksheet.getDataValidation({ row: 1, col }))).toEqual(original);
  });

  test('AutoSum reports unexpected recalculation failures and restores formula/cache snapshots', () => {
    const worksheet = new Worksheet('AutoSum recalc failure H91', 4, 2);
    worksheet.setCellFormula({ row: 3, col: 1 }, '=A1+0', 17);
    const before = worksheet.getCell({ row: 3, col: 1 });
    const events: unknown[] = [];
    worksheet.on((event) => events.push(event));
    Object.defineProperty(worksheet, 'autoRecalculate', {
      configurable: true,
      value: () => { throw new Error('controlled recalculation failure'); },
    });
    const command = new AutoSumCommand(worksheet, [
      { outputCell: { row: 3, col: 1 }, formula: '=SUM(A1:A2)' },
    ]);

    expect(() => command.execute()).toThrow('controlled recalculation failure');
    expect(worksheet.getCell({ row: 3, col: 1 })).toMatchObject({ formula: before?.formula, value: before?.value });
    expect(events.length).toBeGreaterThan(0);
    const afterFailure = worksheet.getCell({ row: 3, col: 1 });
    command.undo();
    expect(worksheet.getCell({ row: 3, col: 1 })).toMatchObject({ formula: afterFailure?.formula, value: afterFailure?.value });
  });

  test('AutoSum restores earlier formula writes when a later output write fails', () => {
    const worksheet = new Worksheet('AutoSum partial write H91', 4, 2);
    worksheet.setCellFormula({ row: 3, col: 1 }, '=A1+0', 17);
    worksheet.setCellValue({ row: 3, col: 2 }, 'keep');
    const before = [1, 2].map((col) => worksheet.getCell({ row: 3, col }));
    const setFormula = worksheet.setCellFormula.bind(worksheet);
    let failOnce = true;
    Object.defineProperty(worksheet, 'setCellFormula', {
      configurable: true,
      value: (address: { row: number; col: number }, formula: string, value?: Parameters<Worksheet['setCellFormula']>[2]) => {
        const result = setFormula(address, formula, value);
        if (failOnce && address.col === 2) {
          failOnce = false;
          throw new Error('controlled AutoSum write failure');
        }
        return result;
      },
    });
    const command = new AutoSumCommand(worksheet, [
      { outputCell: { row: 3, col: 1 }, formula: '=SUM(A1:A2)' },
      { outputCell: { row: 3, col: 2 }, formula: '=SUM(B1:B2)' },
    ]);

    expect(() => command.execute()).toThrow('controlled AutoSum write failure');
    expect([1, 2].map((col) => worksheet.getCell({ row: 3, col }))).toEqual(before);
    command.undo();
    expect([1, 2].map((col) => worksheet.getCell({ row: 3, col }))).toEqual(before);
  });

  test('Remove Duplicates execute and undo restore ordinary values, styles, and observable cell events', () => {
    const worksheet = new Worksheet('Remove duplicates H84', 5, 3);
    worksheet.setCellValue({ row: 1, col: 1 }, 'duplicate');
    worksheet.setCellValue({ row: 1, col: 2 }, 'first');
    worksheet.setCellStyle({ row: 1, col: 2 }, { bold: true });
    worksheet.setCellValue({ row: 2, col: 1 }, 'duplicate');
    worksheet.setCellValue({ row: 2, col: 2 }, 'removed');
    worksheet.setCellStyle({ row: 2, col: 2 }, { italic: true });
    worksheet.setCellValue({ row: 3, col: 1 }, 'unique');
    worksheet.setCellValue({ row: 3, col: 2 }, 'last');
    worksheet.setCellStyle({ row: 3, col: 2 }, { underline: true });
    const initial = [1, 2, 3].map((row) => [1, 2].map((col) => ({
      value: worksheet.getCellValue({ row, col }),
      style: worksheet.getDirectCellStyle({ row, col }),
    })));
    const styleReads: Array<{ row: number; col: number }> = [];
    const originalGetDirectCellStyle = worksheet.getDirectCellStyle.bind(worksheet);
    Object.defineProperty(worksheet, 'getDirectCellStyle', {
      configurable: true,
      value: (address: { row: number; col: number }) => {
        styleReads.push(address);
        return originalGetDirectCellStyle(address);
      },
    });
    const events: unknown[] = [];
    const subscription = worksheet.on((event) => events.push(event));
    const command = new RemoveDuplicatesCommand(
      worksheet,
      { start: { row: 1, col: 1 }, end: { row: 3, col: 2 } },
      [1],
    );
    jest.spyOn(console, 'log').mockImplementation(() => {});

    command.execute();
    expect(worksheet.getCellValue({ row: 1, col: 2 })).toBe('first');
    expect(worksheet.getCellValue({ row: 2, col: 1 })).toBe('unique');
    expect(worksheet.getCellValue({ row: 2, col: 2 })).toBe('last');
    expect(worksheet.getDirectCellStyle({ row: 2, col: 2 })).toEqual({ underline: true });
    expect(styleReads).toContainEqual({ row: 2, col: 2 }); // removed-row snapshot, frozen line 448
    expect(styleReads).toContainEqual({ row: 3, col: 2 }); // shift-up source, frozen line 488
    expect(worksheet.getCellValue({ row: 3, col: 1 })).toBeNull();
    expect(events.length).toBeGreaterThan(0);
    const executeEventCount = events.length;

    const styleReadsBeforeUndo = styleReads.length;
    command.undo();
    expect(styleReads.slice(styleReadsBeforeUndo)).toContainEqual({ row: 2, col: 2 }); // shift-down source, frozen line 502
    const restored = [1, 2, 3].map((row) => [1, 2].map((col) => ({
      value: worksheet.getCellValue({ row, col }),
      style: worksheet.getDirectCellStyle({ row, col }),
    })));
    expect(restored).toEqual(initial);
    expect(events.length).toBeGreaterThan(executeEventCount);
    subscription.dispose();
  });

  test('Remove Duplicates uses a standalone formula cached value for duplicate comparison', () => {
    const worksheet = new Worksheet('Remove duplicate formula H84', 4, 2);
    worksheet.setCellValue({ row: 1, col: 1 }, 777);
    worksheet.setCellFormula({ row: 2, col: 1 }, '=1+1', 777);
    worksheet.setCellValue({ row: 3, col: 1 }, 'unique');
    const comparisonReads: Array<{ row: number; col: number; value: unknown }> = [];
    const originalGetCellValue = worksheet.getCellValue.bind(worksheet);
    Object.defineProperty(worksheet, 'getCellValue', {
      configurable: true,
      value: (address: { row: number; col: number }) => {
        const value = originalGetCellValue(address);
        comparisonReads.push({ ...address, value });
        return value;
      },
    });
    const command = new RemoveDuplicatesCommand(
      worksheet,
      { start: { row: 1, col: 1 }, end: { row: 3, col: 1 } },
      [1],
    );
    jest.spyOn(console, 'log').mockImplementation(() => {});

    command.execute();
    expect(comparisonReads).toContainEqual({ row: 2, col: 1, value: 777 }); // frozen line 430
    expect(comparisonReads.filter((read) => read.row === 2 && read.col === 1)).toHaveLength(3); // comparison, recovery snapshot, removed-row snapshot
    expect(worksheet.getCellValue({ row: 2, col: 1 })).toBe('unique');
  });

  test('Remove Duplicates distinguishes typed primitive values and matches formula cached values by type', () => {
    const worksheet = new Worksheet('Duplicate typed comparison H92', 10, 3);
    const labels = ['zero', 'false', 'null', 'empty', 'formula-zero', 'formula-false', 'formula-null', 'formula-empty'];
    worksheet.setCellValue({ row: 1, col: 1 }, 0);
    worksheet.setCellValue({ row: 2, col: 1 }, false);
    worksheet.setCellValue({ row: 3, col: 1 }, null);
    worksheet.setCellValue({ row: 4, col: 1 }, '');
    worksheet.setCellFormula({ row: 5, col: 1 }, '=0', 0);
    worksheet.setCellFormula({ row: 6, col: 1 }, '=FALSE()', false);
    worksheet.setCellFormula({ row: 7, col: 1 }, '=1-1', null);
    worksheet.setCellFormula({ row: 8, col: 1 }, '=""', '');
    labels.forEach((label, index) => worksheet.setCellValue({ row: index + 1, col: 2 }, label));
    const command = new RemoveDuplicatesCommand(worksheet, {
      start: { row: 1, col: 1 }, end: { row: 8, col: 2 },
    }, [1]);

    command.execute();
    expect([1, 2, 3, 4].map((row) => worksheet.getCellValue({ row, col: 2 }))).toEqual(['zero', 'false', 'null', 'empty']);
    expect([1, 2, 3, 4].map((row) => worksheet.getCellValue({ row, col: 1 }))).toEqual([0, false, null, '']);
    command.undo();
    expect([5, 6, 7, 8].map((row) => worksheet.getCell({ row, col: 1 }))).toEqual([
      expect.objectContaining({ formula: '=0', value: 0 }),
      expect.objectContaining({ formula: '=FALSE()', value: false }),
      expect.objectContaining({ formula: '=1-1', value: null }),
      expect.objectContaining({ formula: '=""', value: '' }),
    ]);
  });

  test('Remove Duplicates encodes multi-column values without delimiter collisions', () => {
    const worksheet = new Worksheet('Duplicate composite comparison H92', 3, 3);
    worksheet.setCellValue({ row: 1, col: 1 }, 'a|b');
    worksheet.setCellValue({ row: 1, col: 2 }, 'c');
    worksheet.setCellValue({ row: 1, col: 3 }, 'first combination');
    worksheet.setCellValue({ row: 2, col: 1 }, 'a');
    worksheet.setCellValue({ row: 2, col: 2 }, 'b|c');
    worksheet.setCellValue({ row: 2, col: 3 }, 'second combination');
    const command = new RemoveDuplicatesCommand(worksheet, {
      start: { row: 1, col: 1 }, end: { row: 2, col: 3 },
    }, [1, 2]);

    command.execute();
    expect(worksheet.getCellValue({ row: 1, col: 3 })).toBe('first combination');
    expect(worksheet.getCellValue({ row: 2, col: 3 })).toBe('second combination');
  });

  test('Remove Duplicates compares supported rich and entity values structurally and preserves numeric edge identities', () => {
    const worksheet = new Worksheet('Extended duplicate values H93', 14, 2);
    const richOne = { runs: [{ text: 'styled', style: { bold: true, fontSize: 12 } }] };
    const richSameDifferentPropertyOrder = { runs: [{ style: { fontSize: 12, bold: true }, text: 'styled' }] };
    const richDifferent = { runs: [{ text: 'styled', style: { italic: true } }] };
    const entityOne = {
      kind: 'entity', type: 'stock', display: 'ACME',
      fields: { Price: 10, Change: 2 }, metadata: { id: 'stock-1', provider: 'fixture' },
    };
    const entitySameDifferentPropertyOrder = {
      metadata: { provider: 'fixture', id: 'stock-1' },
      fields: { Change: 2, Price: 10 }, display: 'ACME', type: 'stock', kind: 'entity',
    };
    const entityDifferent = {
      kind: 'entity', type: 'stock', display: 'ACME',
      fields: { Price: 11, Change: 2 }, metadata: { id: 'stock-1', provider: 'fixture' },
    };
    const values: unknown[] = [
      Number.NaN, Number.NaN,
      Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY, 1,
      richOne, richSameDifferentPropertyOrder, richDifferent,
      entityOne, entitySameDifferentPropertyOrder, entityDifferent,
    ];
    values.forEach((value, index) => {
      worksheet.setCellValue({ row: index + 1, col: 1 }, value as any);
      worksheet.setCellValue({ row: index + 1, col: 2 }, `row-${index + 1}`);
    });
    const command = new RemoveDuplicatesCommand(worksheet, {
      start: { row: 1, col: 1 }, end: { row: values.length, col: 2 },
    }, [1]);

    command.execute();

    expect(Array.from({ length: 8 }, (_, index) => worksheet.getCellValue({ row: index + 1, col: 2 }))).toEqual([
      'row-1', 'row-3', 'row-5', 'row-6', 'row-7', 'row-9', 'row-10', 'row-12',
    ]);
  });

  test('Remove Duplicates treats cyclic values as unsupported before mutation and documents Date objects as outside the value contract', () => {
    const worksheet = new Worksheet('Unsupported duplicate values H93', 5, 2);
    const dateA = new Date('2026-01-01T00:00:00.000Z');
    const dateB = new Date('2026-01-02T00:00:00.000Z');
    worksheet.setCellValue({ row: 1, col: 1 }, dateA as any);
    worksheet.setCellValue({ row: 2, col: 1 }, dateB as any);
    worksheet.setCellValue({ row: 3, col: 1 }, ['array', 1] as any);
    worksheet.setCellValue({ row: 4, col: 1 }, ['array', 2] as any);
    worksheet.setCellValue({ row: 5, col: 1 }, ['array', 1] as any);
    const dateCommand = new RemoveDuplicatesCommand(worksheet, {
      start: { row: 1, col: 1 }, end: { row: 2, col: 1 },
    }, [1]);
    // Worksheet's ExtendedCellValue type does not include Date. If callers
    // bypass that contract, Date instances currently have no enumerable
    // identity fields and collide; H.93 records this as unsupported input.
    dateCommand.execute();
    expect(worksheet.getCell({ row: 2, col: 1 })).toMatchObject({ value: null, formula: undefined });

    const arrayCommand = new RemoveDuplicatesCommand(worksheet, {
      start: { row: 3, col: 1 }, end: { row: 5, col: 1 },
    }, [1]);
    arrayCommand.execute();
    expect(worksheet.getCell({ row: 3, col: 1 })?.value).toEqual(['array', 1]);
    expect(worksheet.getCell({ row: 4, col: 1 })?.value).toEqual(['array', 2]);
    expect(worksheet.getCell({ row: 5, col: 1 })).toMatchObject({ value: null, formula: undefined });

    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    worksheet.setCellValue({ row: 3, col: 1 }, cyclic as any);
    const before = [worksheet.getCell({ row: 3, col: 1 }), worksheet.getCell({ row: 4, col: 1 })];
    const events: unknown[] = [];
    const subscription = worksheet.on((event) => events.push(event));
    const cyclicCommand = new RemoveDuplicatesCommand(worksheet, {
      start: { row: 3, col: 1 }, end: { row: 4, col: 1 },
    }, [1]);

    expect(() => cyclicCommand.execute()).toThrow('Cyclic cell value in duplicate comparison');
    expect([worksheet.getCell({ row: 3, col: 1 }), worksheet.getCell({ row: 4, col: 1 })]).toEqual(before);
    expect(events).toEqual([]);
    subscription.dispose();
  });

  test.each(['shift-down', 'selected-tail', 'formula-row', 'style-row'] as const)(
    'Remove Duplicates undo recovers a %s failure and remains retryable',
    (failurePoint) => {
      const worksheet = new Worksheet(`Duplicate undo recovery ${failurePoint} H92`, 5, 3);
      worksheet.setCellValue({ row: 1, col: 1 }, 'duplicate');
      worksheet.setCellValue({ row: 1, col: 2 }, 'kept');
      worksheet.setCellValue({ row: 2, col: 1 }, 'duplicate');
      worksheet.setCellFormula({ row: 2, col: 2 }, '=1+1', 2);
      worksheet.setCellStyle({ row: 2, col: 2 }, { italic: true });
      worksheet.setCellValue({ row: 3, col: 1 }, 'unique');
      worksheet.setCellFormula({ row: 3, col: 2 }, '=3+3', 6);
      worksheet.setCellStyle({ row: 3, col: 2 }, { underline: true });
      const command = new RemoveDuplicatesCommand(worksheet, {
        start: { row: 1, col: 1 }, end: { row: 3, col: 2 },
      }, [1]);
      command.execute();
      const compacted = [1, 2, 3].map((row) => [1, 2].map((col) => ({
        cell: worksheet.getCell({ row, col }) ?? { value: null, formula: undefined },
        style: worksheet.getDirectCellStyle({ row, col }),
      })));
      const restore = worksheet.restoreCellContent.bind(worksheet);
      const setStyle = worksheet.setCellStyle.bind(worksheet);
      let failOnce = true;
      if (failurePoint === 'style-row') {
        Object.defineProperty(worksheet, 'setCellStyle', {
          configurable: true,
          value: (address: { row: number; col: number }, style: Parameters<Worksheet['setCellStyle']>[1]) => {
            const result = setStyle(address, style);
            if (failOnce && address.row === 2 && address.col === 2) {
              failOnce = false;
              throw new Error('controlled Remove Duplicates undo style failure');
            }
            return result;
          },
        });
      } else {
        let rowThreeColumnTwoWrites = 0;
        Object.defineProperty(worksheet, 'restoreCellContent', {
          configurable: true,
          value: (address: { row: number; col: number }, content: Parameters<Worksheet['restoreCellContent']>[1]) => {
            const result = restore(address, content);
            if (failurePoint === 'shift-down' && failOnce && address.row === 3 && address.col === 1) {
              failOnce = false;
              throw new Error('controlled Remove Duplicates undo shift-down failure');
            }
            if (failurePoint === 'selected-tail' && address.row === 3 && address.col === 2) {
              rowThreeColumnTwoWrites += 1;
              if (failOnce && rowThreeColumnTwoWrites === 2) {
                failOnce = false;
                throw new Error('controlled Remove Duplicates undo tail failure');
              }
            }
            if (failurePoint === 'formula-row' && failOnce && address.row === 2 && address.col === 2) {
              failOnce = false;
              throw new Error('controlled Remove Duplicates undo formula failure');
            }
            return result;
          },
        });
      }
      const expectedError = failurePoint === 'shift-down'
        ? 'shift-down failure'
        : failurePoint === 'selected-tail'
          ? 'tail failure'
          : failurePoint === 'formula-row'
            ? 'formula failure'
            : 'style failure';

      expect(() => command.undo()).toThrow(expectedError);
      expect([1, 2, 3].map((row) => [1, 2].map((col) => ({
        cell: worksheet.getCell({ row, col }) ?? { value: null, formula: undefined },
        style: worksheet.getDirectCellStyle({ row, col }),
      })))).toEqual(compacted);
      command.undo();
      expect(worksheet.getCell({ row: 2, col: 2 })).toMatchObject({ formula: '=1+1', value: 2 });
      expect(worksheet.getCell({ row: 3, col: 2 })).toMatchObject({ formula: '=3+3', value: 6 });
    },
  );

  test('Remove Duplicates invalidates undo state when undo recovery also fails', () => {
    const worksheet = new Worksheet('Duplicate undo incomplete recovery H92', 4, 2);
    worksheet.setCellValue({ row: 1, col: 1 }, 'duplicate');
    worksheet.setCellValue({ row: 2, col: 1 }, 'duplicate');
    worksheet.setCellValue({ row: 2, col: 2 }, 'removed');
    worksheet.setCellValue({ row: 3, col: 1 }, 'unique');
    const command = new RemoveDuplicatesCommand(worksheet, {
      start: { row: 1, col: 1 }, end: { row: 3, col: 2 },
    }, [1]);
    command.execute();
    const restore = worksheet.restoreCellContent.bind(worksheet);
    let failUndo = true;
    let failRecovery = true;
    Object.defineProperty(worksheet, 'restoreCellContent', {
      configurable: true,
      value: (address: { row: number; col: number }, content: Parameters<Worksheet['restoreCellContent']>[1]) => {
        if (failUndo && address.row === 3 && address.col === 1) {
          restore(address, content);
          failUndo = false;
          throw new Error('primary Remove Duplicates undo failure');
        }
        if (!failUndo && failRecovery && address.row === 1 && address.col === 1) {
          failRecovery = false;
          throw new Error('controlled undo recovery failure');
        }
        return restore(address, content);
      },
    });

    expect(() => command.undo()).toThrow('best-effort recovery was incomplete');
    expect((command as unknown as { removedRows: unknown[] }).removedRows).toHaveLength(0);
    const afterFailure = [1, 2, 3].map((row) => [1, 2].map((col) => worksheet.getCellValue({ row, col })));
    command.undo();
    expect([1, 2, 3].map((row) => [1, 2].map((col) => worksheet.getCellValue({ row, col })))).toEqual(afterFailure);
  });

  test('Remove Duplicates undo preserves a formula expression in a removed duplicate row', () => {
    const worksheet = new Worksheet('Remove duplicate formula undo H84', 4, 2);
    worksheet.setCellValue({ row: 1, col: 1 }, 777);
    worksheet.setCellFormula({ row: 2, col: 1 }, '=1+1', 777);
    worksheet.setCellValue({ row: 3, col: 1 }, 'unique');
    const command = new RemoveDuplicatesCommand(
      worksheet,
      { start: { row: 1, col: 1 }, end: { row: 3, col: 1 } },
      [1],
    );
    jest.spyOn(console, 'log').mockImplementation(() => {});

    command.execute();
    expect(worksheet.getCellValue({ row: 2, col: 1 })).toBe('unique');
    command.undo();
    expect(worksheet.getCell({ row: 2, col: 1 })).toMatchObject({
      formula: '=1+1',
      value: 777,
    });
  });

  test('Remove Duplicates preserves formula/value/style alignment across duplicate groups and replay', () => {
    const worksheet = new Worksheet('Remove duplicate formula groups H86', 8, 3);
    worksheet.setCellValue({ row: 1, col: 1 }, 777);
    worksheet.setCellValue({ row: 1, col: 2 }, 'kept-a');
    worksheet.setCellStyle({ row: 1, col: 2 }, { bold: true });
    worksheet.setCellFormula({ row: 2, col: 1 }, '=1+1', 777);
    worksheet.setCellValue({ row: 2, col: 2 }, 'removed-a');
    worksheet.setCellStyle({ row: 2, col: 2 }, { italic: true });
    worksheet.setCellFormula({ row: 3, col: 1 }, '=10+1', 101);
    worksheet.setCellValue({ row: 3, col: 2 }, 'shifted-a');
    worksheet.setCellStyle({ row: 3, col: 2 }, { underline: true });
    worksheet.setCellValue({ row: 4, col: 1 }, 888);
    worksheet.setCellValue({ row: 4, col: 2 }, 'kept-b');
    worksheet.setCellFormula({ row: 5, col: 1 }, '=2+2', 888);
    worksheet.setCellValue({ row: 5, col: 2 }, 'removed-b');
    worksheet.setCellStyle({ row: 5, col: 2 }, { color: '#b00020' });
    worksheet.setCellFormula({ row: 6, col: 1 }, '=20+2', 202);
    worksheet.setCellValue({ row: 6, col: 2 }, 'shifted-b');
    worksheet.setCellStyle({ row: 6, col: 2 }, { color: '#0057b8' });

    const original = [1, 2, 3, 4, 5, 6].map((row) => [1, 2].map((col) => ({
      cell: worksheet.getCell({ row, col }),
      style: worksheet.getDirectCellStyle({ row, col }),
    })));
    const command = new RemoveDuplicatesCommand(
      worksheet,
      { start: { row: 1, col: 1 }, end: { row: 6, col: 2 } },
      [1],
    );
    jest.spyOn(console, 'log').mockImplementation(() => {});

    const expectCompactedRows = () => {
      expect(worksheet.getCell({ row: 1, col: 1 })).toMatchObject({ value: 777 });
      expect(worksheet.getCell({ row: 2, col: 1 })).toMatchObject({ formula: '=10+1', value: 101 });
      expect(worksheet.getCell({ row: 3, col: 1 })).toMatchObject({ value: 888, formula: undefined });
      expect(worksheet.getCell({ row: 4, col: 1 })).toMatchObject({ formula: '=20+2', value: 202 });
      expect(worksheet.getDirectCellStyle({ row: 2, col: 2 })).toEqual({ underline: true });
      expect(worksheet.getDirectCellStyle({ row: 4, col: 2 })).toEqual({ color: '#0057b8' });
      expect(worksheet.getCell({ row: 5, col: 1 })?.formula).toBeUndefined();
    };

    command.execute();
    expectCompactedRows();
    command.undo();
    expect([1, 2, 3, 4, 5, 6].map((row) => [1, 2].map((col) => ({
      cell: worksheet.getCell({ row, col }),
      style: worksheet.getDirectCellStyle({ row, col }),
    })))).toEqual(original);
    expect(worksheet.getCell({ row: 2, col: 1 })).toMatchObject({ formula: '=1+1', value: 777 });
    expect(worksheet.getCell({ row: 5, col: 1 })).toMatchObject({ formula: '=2+2', value: 888 });

    command.execute();
    expectCompactedRows();
  });

  test('Remove Duplicates stays within a small Worksheet selection and restores its tail', () => {
    const worksheet = new Worksheet('Small bounded duplicate range H87', 8, 3);
    worksheet.setCellValue({ row: 2, col: 1 }, 'keep');
    worksheet.setCellValue({ row: 2, col: 2 }, 'first');
    worksheet.setCellValue({ row: 3, col: 1 }, 'keep');
    worksheet.setCellValue({ row: 3, col: 2 }, 'removed');
    worksheet.setCellFormula({ row: 4, col: 1 }, '=A2', 'tail-formula');
    worksheet.setCellValue({ row: 4, col: 2 }, 'selected-tail');
    worksheet.setCellValue({ row: 3, col: 3 }, 'outside-column');
    worksheet.setCellValue({ row: 5, col: 1 }, 'outside-row');
    const beforeRange = [2, 3, 4].map((row) => [1, 2].map((col) => ({
      cell: worksheet.getCell({ row, col }),
      style: worksheet.getDirectCellStyle({ row, col }),
    })));
    const command = new RemoveDuplicatesCommand(
      worksheet,
      { start: { row: 2, col: 1 }, end: { row: 4, col: 2 } },
      [1],
    );
    jest.spyOn(console, 'log').mockImplementation(() => {});

    command.execute();
    expect(worksheet.getCell({ row: 3, col: 1 })).toMatchObject({ formula: '=A2', value: 'tail-formula' });
    expect(worksheet.getCell({ row: 4, col: 1 })).toMatchObject({ value: null, formula: undefined });
    expect(worksheet.getCellValue({ row: 3, col: 3 })).toBe('outside-column');
    expect(worksheet.getCellValue({ row: 5, col: 1 })).toBe('outside-row');

    command.undo();
    expect([2, 3, 4].map((row) => [1, 2].map((col) => ({
      cell: worksheet.getCell({ row, col }),
      style: worksheet.getDirectCellStyle({ row, col }),
    })))).toEqual(beforeRange);
    expect(worksheet.getCellValue({ row: 3, col: 3 })).toBe('outside-column');
    expect(worksheet.getCellValue({ row: 5, col: 1 })).toBe('outside-row');
  });

  test('Remove Duplicates handles ranges beyond row 1,000 without changing formula references or outside rows', () => {
    const worksheet = new Worksheet('Large bounded duplicate range H87', 1_005, 3);
    worksheet.setCellValue({ row: 999, col: 1 }, 'large-duplicate');
    worksheet.setCellValue({ row: 999, col: 2 }, 'kept');
    worksheet.setCellValue({ row: 1_000, col: 1 }, 'large-duplicate');
    worksheet.setCellValue({ row: 1_000, col: 2 }, 'removed');
    worksheet.setCellFormula({ row: 1_001, col: 1 }, '=A999', 77);
    worksheet.setCellValue({ row: 1_001, col: 2 }, 'selected-tail');
    worksheet.setCellValue({ row: 1_002, col: 1 }, 'outside-range');
    const command = new RemoveDuplicatesCommand(
      worksheet,
      { start: { row: 999, col: 1 }, end: { row: 1_001, col: 2 } },
      [1],
    );
    jest.spyOn(console, 'log').mockImplementation(() => {});

    command.execute();
    expect(worksheet.getCell({ row: 1_000, col: 1 })).toMatchObject({ formula: '=A999', value: 77 });
    expect(worksheet.getCell({ row: 1_001, col: 1 })).toMatchObject({ value: null, formula: undefined });
    expect(worksheet.getCellValue({ row: 1_002, col: 1 })).toBe('outside-range');

    command.undo();
    expect(worksheet.getCell({ row: 1_001, col: 1 })).toMatchObject({ formula: '=A999', value: 77 });
    expect(worksheet.getCellValue({ row: 1_002, col: 1 })).toBe('outside-range');
  });

  test('Remove Duplicates reports incomplete recovery when a target remains unavailable', () => {
    const worksheet = new Worksheet('Partial duplicate write H87', 6, 3);
    worksheet.setCellValue({ row: 1, col: 1 }, 'duplicate');
    worksheet.setCellValue({ row: 2, col: 1 }, 'duplicate');
    worksheet.setCellValue({ row: 2, col: 2 }, 'old-second-column');
    worksheet.setCellValue({ row: 3, col: 1 }, 'duplicate');
    worksheet.setCellValue({ row: 3, col: 2 }, 'middle-second-column');
    worksheet.setCellValue({ row: 4, col: 1 }, 'after');
    worksheet.setCellValue({ row: 4, col: 2 }, 'new-second-column');
    worksheet.setCellValue({ row: 5, col: 1 }, 'last');
    worksheet.setCellValue({ row: 5, col: 2 }, 'last-second-column');
    const originalSetCellValue = worksheet.setCellValue.bind(worksheet);
    Object.defineProperty(worksheet, 'setCellValue', {
      configurable: true,
      value: (address: { row: number; col: number }, value: Parameters<Worksheet['setCellValue']>[1]) => {
        if (address.row === 2 && address.col === 2) throw new Error('controlled standalone write failure');
        return originalSetCellValue(address, value);
      },
    });
    const events: unknown[] = [];
    const subscription = worksheet.on((event) => events.push(event));
    const command = new RemoveDuplicatesCommand(
      worksheet,
      { start: { row: 1, col: 1 }, end: { row: 5, col: 2 } },
      [1],
    );

    let thrown: unknown;
    try {
      command.execute();
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).toContain('controlled standalone write failure');
    expect((thrown as Error).message).toContain('recovery was incomplete');
    expect(events.length).toBeGreaterThan(0);
    expect((command as unknown as { removedRows: unknown[] }).removedRows).toHaveLength(0);
    subscription.dispose();
  });

  test('Remove Duplicates recovers a one-shot content failure and invalidates failed undo state', () => {
    const worksheet = new Worksheet('Remove duplicate failure undo H89', 5, 2);
    worksheet.setCellValue({ row: 1, col: 1 }, 'duplicate');
    worksheet.setCellValue({ row: 1, col: 2 }, 'first');
    worksheet.setCellValue({ row: 2, col: 1 }, 'duplicate');
    worksheet.setCellFormula({ row: 2, col: 2 }, '=1+1', 2);
    worksheet.setCellValue({ row: 3, col: 1 }, 'duplicate');
    worksheet.setCellValue({ row: 3, col: 2 }, 'removed');
    worksheet.setCellValue({ row: 4, col: 1 }, 'after');
    worksheet.setCellValue({ row: 4, col: 2 }, 'after-value');
    const snapshot = () => [1, 2, 3, 4].map((row) => [1, 2].map((col) => ({
      cell: worksheet.getCell({ row, col }) ?? { value: null, formula: undefined },
      style: worksheet.getDirectCellStyle({ row, col }),
    })));
    const before = snapshot();
    const originalSetCellValue = worksheet.setCellValue.bind(worksheet);
    let shouldFail = true;
    Object.defineProperty(worksheet, 'setCellValue', {
      configurable: true,
      value: (address: { row: number; col: number }, value: Parameters<Worksheet['setCellValue']>[1]) => {
        if (shouldFail && address.row === 2 && address.col === 2) {
          shouldFail = false;
          throw new Error('controlled one-shot Remove Duplicates write failure');
        }
        return originalSetCellValue(address, value);
      },
    });
    const events: unknown[] = [];
    const subscription = worksheet.on((event) => events.push(event));
    const command = new RemoveDuplicatesCommand(
      worksheet,
      { start: { row: 1, col: 1 }, end: { row: 4, col: 2 } },
      [1],
    );
    jest.spyOn(console, 'log').mockImplementation(() => {});

    expect(() => command.execute()).toThrow('controlled one-shot Remove Duplicates write failure');
    expect(snapshot()).toEqual(before);
    expect(events.length).toBeGreaterThan(0);
    const recoveryEventCount = events.length;

    command.undo();
    expect(snapshot()).toEqual(before);
    expect(events.length).toBe(recoveryEventCount);
    subscription.dispose();
  });

  test.each(['content', 'style'] as const)('Remove Duplicates restores the selected range after a one-shot %s write failure', (failureKind) => {
    const worksheet = new Worksheet(`Remove duplicate ${failureKind} recovery`, 8, 5);
    const rows = [
      ['a', 'kept-a', 'a-style'],
      ['a', 'removed-a', 'removed-style-a'],
      ['b', 'kept-b', 'b-style'],
      ['b', 'removed-b', 'removed-style-b'],
      ['c', 'kept-c', 'c-style'],
      ['c', 'removed-c', 'removed-style-c'],
    ];
    rows.forEach(([key, label, style], index) => {
      const row = index + 1;
      worksheet.setCellValue({ row, col: 1 }, key);
      worksheet.setCellValue({ row, col: 2 }, label);
      worksheet.setCellStyle({ row, col: 2 }, { numberFormat: style });
    });
    worksheet.setCellFormula({ row: 6, col: 3 }, '=A6&"-tail"', 'selected-tail');
    worksheet.setCellStyle({ row: 6, col: 3 }, { bold: true });
    worksheet.setCellValue({ row: 3, col: 4 }, 'outside-column');
    worksheet.setCellValue({ row: 7, col: 1 }, 'outside-row');
    const snapshot = () => [1, 2, 3, 4, 5, 6].map((row) => [1, 2, 3].map((col) => ({
      cell: worksheet.getCell({ row, col }) ?? { value: null, formula: undefined },
      style: worksheet.getDirectCellStyle({ row, col }),
    })));
    const before = snapshot();
    const failure = new Error(`controlled duplicate ${failureKind} write failure`);
    const events: unknown[] = [];
    const subscription = worksheet.on((event) => events.push(event));
    let shouldFail = true;
    let eventCountAtFailure = -1;
    if (failureKind === 'content') {
      const originalSetCellValue = worksheet.setCellValue.bind(worksheet);
      Object.defineProperty(worksheet, 'setCellValue', {
        configurable: true,
        value: (address: { row: number; col: number }, value: Parameters<Worksheet['setCellValue']>[1]) => {
          if (shouldFail && address.row === 4 && address.col === 2) {
            shouldFail = false;
            eventCountAtFailure = events.length;
            throw failure;
          }
          return originalSetCellValue(address, value);
        },
      });
    } else {
      const originalSetCellStyle = worksheet.setCellStyle.bind(worksheet);
      Object.defineProperty(worksheet, 'setCellStyle', {
        configurable: true,
        value: (address: { row: number; col: number }, style: Parameters<Worksheet['setCellStyle']>[1]) => {
          if (shouldFail && address.row === 4 && address.col === 2) {
            shouldFail = false;
            eventCountAtFailure = events.length;
            throw failure;
          }
          return originalSetCellStyle(address, style);
        },
      });
    }
    const command = new RemoveDuplicatesCommand(
      worksheet,
      { start: { row: 1, col: 1 }, end: { row: 6, col: 3 } },
      [1],
    );

    expect(() => command.execute()).toThrow(failure);
    expect(snapshot()).toEqual(before);
    expect(worksheet.getCellValue({ row: 3, col: 4 })).toBe('outside-column');
    expect(worksheet.getCellValue({ row: 7, col: 1 })).toBe('outside-row');
    expect((command as unknown as { removedRows: unknown[] }).removedRows).toHaveLength(0);
    expect(eventCountAtFailure).toBeGreaterThanOrEqual(0);
    expect(events.length).toBeGreaterThan(eventCountAtFailure);
    subscription.dispose();
  });

  test('Remove Duplicates reports incomplete best-effort recovery and invalidates its undo state', () => {
    const worksheet = new Worksheet('Remove duplicate incomplete recovery', 4, 2);
    worksheet.setCellValue({ row: 1, col: 1 }, 'duplicate');
    worksheet.setCellValue({ row: 2, col: 1 }, 'duplicate');
    worksheet.setCellValue({ row: 2, col: 2 }, 'payload');
    const originalSetCellValue = worksheet.setCellValue.bind(worksheet);
    const writeFailure = new Error('primary duplicate failure');
    Object.defineProperty(worksheet, 'setCellValue', {
      configurable: true,
      value: (address: { row: number; col: number }, value: Parameters<Worksheet['setCellValue']>[1]) => {
        if (address.row === 2 && address.col === 1 && value === null) throw writeFailure;
        if (address.row === 1 && address.col === 1 && value === 'duplicate') {
          throw new Error('controlled duplicate recovery failure');
        }
        return originalSetCellValue(address, value);
      },
    });
    const command = new RemoveDuplicatesCommand(
      worksheet,
      { start: { row: 1, col: 1 }, end: { row: 2, col: 2 } },
      [1],
    );

    let thrown: unknown;
    try {
      command.execute();
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).toContain('primary duplicate failure');
    expect((thrown as Error).message).toContain('recovery was incomplete');
    expect((thrown as Error & { cause?: unknown }).cause).toBe(writeFailure);
    expect((command as unknown as { removedRows: unknown[] }).removedRows).toHaveLength(0);
  });

  test('Group and Ungroup execute/undo their standalone command-local outline state', () => {
    const worksheet = new Worksheet('Outline H84', 4, 3);
    const group = new GroupOutlineCommand(
      worksheet,
      { start: { row: 1, col: 1 }, end: { row: 3, col: 2 } },
      'rows',
    );
    const ungroup = new UngroupOutlineCommand(
      worksheet,
      { start: { row: 1, col: 1 }, end: { row: 3, col: 2 } },
      'rows',
    );
    const events: unknown[] = [];
    const subscription = worksheet.on((event) => events.push(event));
    jest.spyOn(console, 'log').mockImplementation(() => {});

    group.execute();
    const outlines = (worksheet as unknown as { outlineGroups: { rows: unknown[]; columns: unknown[] } }).outlineGroups;
    expect(outlines.rows).toHaveLength(1);
    group.undo();
    expect((worksheet as unknown as { outlineGroups: { rows: unknown[] } }).outlineGroups.rows).toHaveLength(0);
    group.execute();
    ungroup.execute();
    expect((worksheet as unknown as { outlineGroups: { rows: unknown[] } }).outlineGroups.rows).toHaveLength(0);
    ungroup.undo();
    expect((worksheet as unknown as { outlineGroups: { rows: unknown[] } }).outlineGroups.rows).toHaveLength(1);
    expect(events).toEqual([]);
    subscription.dispose();
  });

  test('AutoSum captures the state immediately before each execution for replayed undo', () => {
    const worksheet = new Worksheet('AutoSum replay snapshots H89', 4, 2);
    worksheet.setCellFormula({ row: 3, col: 1 }, '=A1+0', 5);
    const command = new AutoSumCommand(worksheet, [
      { outputCell: { row: 3, col: 1 }, formula: '=SUM(A1:A2)' },
    ]);

    command.execute();
    expect(worksheet.getCell({ row: 3, col: 1 })).toMatchObject({ formula: '=SUM(A1:A2)' });
    command.undo();
    expect(worksheet.getCell({ row: 3, col: 1 })).toMatchObject({
      formula: '=A1+0',
      value: 5,
    });

    worksheet.setCellValue({ row: 3, col: 1 }, 'before replay');
    command.execute();
    command.undo();
    expect(worksheet.getCell({ row: 3, col: 1 })).toMatchObject({ value: 'before replay', formula: undefined });

    worksheet.setCellFormula({ row: 3, col: 1 }, '=A1+1', 99);
    command.execute();
    command.undo();
    expect(worksheet.getCell({ row: 3, col: 1 })).toMatchObject({ formula: '=A1+1', value: 99 });
  });

  test('AutoSum rejects duplicate output addresses before changing the Worksheet', () => {
    const worksheet = new Worksheet('Duplicate AutoSum output H92', 3, 3);
    worksheet.setCellValue({ row: 2, col: 2 }, 'preserve');
    const before = worksheet.getCell({ row: 2, col: 2 });
    const events: unknown[] = [];
    worksheet.on((event) => events.push(event));
    const command = new AutoSumCommand(worksheet, [
      { outputCell: { row: 2, col: 2 }, formula: '=SUM(A1:A2)' },
      { outputCell: { row: 2, col: 2 }, formula: '=SUM(B1:B2)' },
    ]);

    expect(() => command.execute()).toThrow('AutoSum plans contain duplicate output addresses');
    expect(worksheet.getCell({ row: 2, col: 2 })).toEqual(before);
    expect(events).toEqual([]);
  });

  test('AutoSum recalculation updates dependent cells outside planned outputs and undo recalculates them again', () => {
    const worksheet = new Worksheet('AutoSum dependent recalculation H92', 4, 4, new FormulaEngine() as any);
    worksheet.setCellValue({ row: 1, col: 1 }, 2);
    worksheet.setCellValue({ row: 2, col: 1 }, 3);
    worksheet.setCellFormula({ row: 1, col: 2 }, '=A2*10', 30);
    worksheet.registerDependencies({ row: 1, col: 2 }, [{ row: 2, col: 1 }]);
    const command = new AutoSumCommand(worksheet, [
      { outputCell: { row: 2, col: 1 }, formula: '=SUM(A1:A1)' },
    ]);

    command.execute();
    expect(worksheet.getCell({ row: 1, col: 2 })).toMatchObject({ formula: '=A2*10', value: 20 });
    command.undo();
    expect(worksheet.getCell({ row: 2, col: 1 })).toMatchObject({ value: 3, formula: undefined });
    expect(worksheet.getCell({ row: 1, col: 2 })).toMatchObject({ formula: '=A2*10', value: 30 });
  });

  test('restoring only an AutoSum output leaves dependent caches at their recalculated values', () => {
    const worksheet = new Worksheet('AutoSum output-only restore H93', 4, 4, new FormulaEngine() as any);
    worksheet.setCellValue({ row: 1, col: 1 }, 2);
    worksheet.setCellValue({ row: 3, col: 1 }, 3);
    worksheet.setCellFormula({ row: 1, col: 2 }, '=A3*10', 30);
    worksheet.registerDependencies({ row: 1, col: 2 }, [{ row: 3, col: 1 }]);
    worksheet.autoRecalculate();

    worksheet.setCellFormula({ row: 3, col: 1 }, '=SUM(A1:A1)');
    worksheet.autoRecalculate();
    expect(worksheet.getCell({ row: 1, col: 2 })).toMatchObject({ value: 20 });

    worksheet.restoreCellContent({ row: 3, col: 1 }, { value: 3 });
    expect(worksheet.getCell({ row: 1, col: 2 })).toMatchObject({ value: 20 });
    worksheet.autoRecalculate();
    expect(worksheet.getCell({ row: 1, col: 2 })).toMatchObject({ formula: '=A3*10', value: 30 });
  });

  test('AutoSum execution recovery recalculates dependent caches after an error following recalculation', () => {
    const worksheet = new Worksheet('AutoSum execution recovery H93', 4, 4, new FormulaEngine() as any);
    worksheet.setCellValue({ row: 1, col: 1 }, 2);
    worksheet.setCellValue({ row: 3, col: 1 }, 3);
    worksheet.setCellFormula({ row: 1, col: 2 }, '=A3*10', 30);
    worksheet.registerDependencies({ row: 1, col: 2 }, [{ row: 3, col: 1 }]);
    const originalRecalculate = worksheet.autoRecalculate.bind(worksheet);
    let failOnceAfterCalculation = true;
    Object.defineProperty(worksheet, 'autoRecalculate', {
      configurable: true,
      value: () => {
        const result = originalRecalculate();
        if (failOnceAfterCalculation) {
          failOnceAfterCalculation = false;
          throw new Error('controlled failure after recalculation');
        }
        return result;
      },
    });
    const command = new AutoSumCommand(worksheet, [
      { outputCell: { row: 3, col: 1 }, formula: '=SUM(A1:A1)' },
    ]);
    const events: unknown[] = [];
    const subscription = worksheet.on((event) => events.push(event));

    expect(() => command.execute()).toThrow('controlled failure after recalculation');
    expect(worksheet.getCell({ row: 3, col: 1 })).toMatchObject({ value: 3, formula: undefined });
    expect(worksheet.getCell({ row: 1, col: 2 })).toMatchObject({ formula: '=A3*10', value: 30 });
    expect(events.length).toBeGreaterThan(0);
    subscription.dispose();
  });

  test('AutoSum exposes Worksheet-swallowed formula evaluation failures as cached error values', () => {
    const engine = new FormulaEngine();
    const worksheet = new Worksheet('AutoSum mid-pass recovery H93', 4, 4, engine as any);
    worksheet.setCellValue({ row: 1, col: 1 }, 2);
    worksheet.setCellValue({ row: 3, col: 1 }, 3);
    worksheet.setCellFormula({ row: 1, col: 2 }, '=A3*10', 30);
    worksheet.registerDependencies({ row: 1, col: 2 }, [{ row: 3, col: 1 }]);
    worksheet.setCellFormula({ row: 1, col: 3 }, '=A3*100', 300);
    worksheet.registerDependencies({ row: 1, col: 3 }, [{ row: 3, col: 1 }]);
    worksheet.autoRecalculate();
    const evaluate = engine.evaluate.bind(engine);
    let failOnce = true;
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(engine, 'evaluate').mockImplementation((formula, context) => {
      if (failOnce && formula === '=A3*100') {
        failOnce = false;
        throw new Error('controlled FormulaEngine mid-pass failure');
      }
      return evaluate(formula, context);
    });
    const command = new AutoSumCommand(worksheet, [
      { outputCell: { row: 3, col: 1 }, formula: '=SUM(A1:A1)' },
    ]);

    // Worksheet catches evaluator exceptions, stores #ERROR!, and reports the
    // recalculation pass as completed; AutoSum therefore cannot detect it.
    command.execute();
    expect(worksheet.getCell({ row: 3, col: 1 })).toMatchObject({ formula: '=SUM(A1:A1)', value: 2 });
    expect(worksheet.getCell({ row: 1, col: 2 })).toMatchObject({ formula: '=A3*10', value: 20 });
    expect(worksheet.getCell({ row: 1, col: 3 })).toMatchObject({ formula: '=A3*100', value: '#ERROR!' });

    command.undo();
    expect(worksheet.getCell({ row: 3, col: 1 })).toMatchObject({ value: 3, formula: undefined });
    expect(worksheet.getCell({ row: 1, col: 2 })).toMatchObject({ formula: '=A3*10', value: 30 });
    expect(worksheet.getCell({ row: 1, col: 3 })).toMatchObject({ formula: '=A3*100', value: 300 });
  });

  test('AutoSum undo recovery recalculates dependent caches back to the applied output state and remains retryable', () => {
    const worksheet = new Worksheet('AutoSum undo recovery H93', 4, 4, new FormulaEngine() as any);
    worksheet.setCellValue({ row: 1, col: 1 }, 2);
    worksheet.setCellValue({ row: 3, col: 1 }, 3);
    worksheet.setCellFormula({ row: 1, col: 2 }, '=A3*10', 30);
    worksheet.registerDependencies({ row: 1, col: 2 }, [{ row: 3, col: 1 }]);
    const command = new AutoSumCommand(worksheet, [
      { outputCell: { row: 3, col: 1 }, formula: '=SUM(A1:A1)' },
    ]);
    command.execute();
    expect(worksheet.getCell({ row: 1, col: 2 })).toMatchObject({ value: 20 });

    const originalRecalculate = worksheet.autoRecalculate.bind(worksheet);
    let failOnceAfterCalculation = true;
    Object.defineProperty(worksheet, 'autoRecalculate', {
      configurable: true,
      value: () => {
        const result = originalRecalculate();
        if (failOnceAfterCalculation) {
          failOnceAfterCalculation = false;
          throw new Error('controlled undo failure after recalculation');
        }
        return result;
      },
    });
    const events: unknown[] = [];
    const subscription = worksheet.on((event) => events.push(event));

    expect(() => command.undo()).toThrow('controlled undo failure after recalculation');
    expect(worksheet.getCell({ row: 3, col: 1 })).toMatchObject({ formula: '=SUM(A1:A1)', value: 2 });
    expect(worksheet.getCell({ row: 1, col: 2 })).toMatchObject({ formula: '=A3*10', value: 20 });
    expect(events.length).toBeGreaterThan(0);

    command.undo();
    expect(worksheet.getCell({ row: 3, col: 1 })).toMatchObject({ value: 3, formula: undefined });
    expect(worksheet.getCell({ row: 1, col: 2 })).toMatchObject({ formula: '=A3*10', value: 30 });
    subscription.dispose();
  });
});
