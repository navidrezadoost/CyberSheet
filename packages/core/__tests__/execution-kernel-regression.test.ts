import { SpreadsheetEngine } from '../src/SpreadsheetEngine';
import { PatchUndoStack } from '../src/patch/PatchUndoStack';
import { applyPatch, invertPatch, type WorksheetPatch } from '../src/patch/WorksheetPatch';
import { TransactionContext } from '../src/transaction/TransactionContext';
import { PatchSerializer } from '../src/sdk/PatchSerializer';
import { Worksheet } from '../src/worksheet';

describe('CS-001 execution-kernel regressions', () => {
  test('keeps ordinary values when recalculation schedules the edited cell', async () => {
    const engine = new SpreadsheetEngine();

    await engine.run((ws) => ws.setCellValue({ row: 1, col: 1 }, 27));

    expect(engine.getCellValue({ row: 1, col: 1 })).toBe(27);
  });

  test('recalculates formulas without overwriting their precedent values', async () => {
    const engine = new SpreadsheetEngine();

    await engine.run((ws) => {
      ws.setCellValue({ row: 1, col: 1 }, 2);
      ws.setCellFormula({ row: 1, col: 2 }, '=A1+3');
    });

    expect(engine.getCellValue({ row: 1, col: 1 })).toBe(2);
    expect(engine.getCellValue({ row: 1, col: 2 })).toBe(5);
  });

  test('propagates through chains and diamonds once, while skipping unrelated formulas', async () => {
    const engine = new SpreadsheetEngine();
    await engine.run((ws) => {
      ws.setCellValue({ row: 1, col: 1 }, 2);
      ws.setCellFormula({ row: 1, col: 2 }, '=A1*2');
      ws.setCellFormula({ row: 1, col: 3 }, '=A1+1');
      ws.setCellFormula({ row: 1, col: 4 }, '=B1+C1');
      ws.setCellFormula({ row: 1, col: 6 }, '=100+1');
    });
    expect(engine.getCellValue({ row: 1, col: 4 })).toBe(7);
    engine.resetMetrics();

    await engine.run((ws) => ws.setCellValue({ row: 1, col: 1 }, 5));

    expect(engine.getCellValue({ row: 1, col: 2 })).toBe(10);
    expect(engine.getCellValue({ row: 1, col: 3 })).toBe(6);
    expect(engine.getCellValue({ row: 1, col: 4 })).toBe(16);
    expect(engine.getCellValue({ row: 1, col: 6 })).toBe(101);
    expect(engine.metrics.completed).toBe(3);
  });

  test('replacing or clearing formulas removes old edges and updates downstream formulas', async () => {
    const engine = new SpreadsheetEngine();
    await engine.run((ws) => {
      ws.setCellValue({ row: 1, col: 1 }, 2);
      ws.setCellValue({ row: 1, col: 3 }, 4);
      ws.setCellFormula({ row: 1, col: 2 }, '=A1*2');
      ws.setCellFormula({ row: 1, col: 4 }, '=B1+1');
    });

    await engine.run((ws) => ws.setCellFormula({ row: 1, col: 2 }, '=C1*3'));
    expect(engine.getCellValue({ row: 1, col: 4 })).toBe(13);
    await engine.run((ws) => ws.setCellValue({ row: 1, col: 1 }, 99));
    expect(engine.getCellValue({ row: 1, col: 4 })).toBe(13);
    await engine.run((ws) => ws.clearCellFormula({ row: 1, col: 2 }));
    expect(engine.getCellValue({ row: 1, col: 4 })).toBe(13);
  });

  test('rollback restores the previous formula dependency edges', async () => {
    const engine = new SpreadsheetEngine();
    await engine.run((ws) => {
      ws.setCellValue({ row: 1, col: 1 }, 2);
      ws.setCellValue({ row: 1, col: 3 }, 4);
      ws.setCellFormula({ row: 1, col: 2 }, '=A1*2');
    });

    await expect(engine.run((ws) => {
      ws.setCellFormula({ row: 1, col: 2 }, '=C1*3');
      throw new Error('rollback graph');
    })).rejects.toThrow('rollback graph');
    await engine.run((ws) => ws.setCellValue({ row: 1, col: 1 }, 5));
    expect(engine.getCellValue({ row: 1, col: 2 })).toBe(10);
    await engine.run((ws) => ws.setCellValue({ row: 1, col: 3 }, 8));
    expect(engine.getCellValue({ row: 1, col: 2 })).toBe(10);
  });

  test('propagates at high rows without packed-key truncation', async () => {
    const engine = new SpreadsheetEngine();
    const row = 300_000;
    await engine.run((ws) => {
      ws.setCellValue({ row, col: 1 }, 2);
      ws.setCellFormula({ row, col: 2 }, `=A${row}*2`);
    });
    await engine.run((ws) => ws.setCellValue({ row, col: 1 }, 9));
    expect(engine.getCellValue({ row, col: 2 })).toBe(18);
  });

  test('propagates edits from the interior of a range larger than 10,000 cells', async () => {
    const engine = new SpreadsheetEngine();
    await engine.run((ws) => {
      ws.setCellValue({ row: 10_001, col: 1 }, 2);
      ws.setCellFormula({ row: 1, col: 2 }, '=SUM(A1:A10001)');
    });
    await engine.run((ws) => ws.setCellValue({ row: 10_001, col: 1 }, 7));
    expect(engine.getCellValue({ row: 1, col: 2 })).toBe(7);
  });

  test('reports cycles consistently and does not schedule cyclic formulas', async () => {
    const engine = new SpreadsheetEngine();
    const events: Array<{ hasCycles: boolean; cycles: unknown[] }> = [];
    engine.on('formulasEvaluated', (event) => {
      if (event.type === 'formulasEvaluated') {
        events.push({ hasCycles: event.hasCycles, cycles: event.cycles });
      }
    });
    await engine.run((ws) => {
      ws.setCellFormula({ row: 1, col: 1 }, '=B1+1');
      ws.setCellFormula({ row: 1, col: 2 }, '=A1+1');
    });
    expect(events).toHaveLength(1);
    expect(events[0].hasCycles).toBe(true);
    expect(events[0].cycles).toHaveLength(1);
    expect(events[0].cycles[0]).toMatchObject({
      cells: [{ row: 1, col: 1 }, { row: 1, col: 2 }],
    });
    expect(engine.metrics.completed).toBe(0);
  });

  test('converts a formula cell to a literal, including when display value matches', () => {
    const worksheet = new Worksheet('FormulaToLiteral');
    const address = { row: 2, col: 2 };
    worksheet.setCellFormula(address, '=A1+4', 7);

    worksheet.setCellValue(address, 7);
    expect(worksheet.getCellValue(address)).toBe(7);
    expect(worksheet.getCell(address)?.formula).toBeUndefined();
  });

  test('rolls back direct worksheet mutations when the callback throws', async () => {
    const engine = new SpreadsheetEngine();
    await engine.run((ws) => ws.setCellValue({ row: 1, col: 1 }, 2));

    await expect(engine.run((ws) => {
      ws.setCellValue({ row: 1, col: 1 }, 22);
      throw new Error('abort transaction');
    })).rejects.toThrow('abort transaction');

    expect(engine.getCellValue({ row: 1, col: 1 })).toBe(2);
    expect(engine.executionState).toBe('IDLE');
  });

  test('restores the prior formula when a transaction replaces it and throws', async () => {
    const engine = new SpreadsheetEngine();
    let worksheet: Worksheet | undefined;
    await engine.run((ws) => {
      worksheet = ws;
      ws.setCellValue({ row: 1, col: 1 }, 2);
      ws.setCellFormula({ row: 1, col: 2 }, '=A1+1');
    });

    await expect(engine.run((ws) => {
      ws.setCellFormula({ row: 1, col: 2 }, '=A1+10');
      throw new Error('abort formula replacement');
    })).rejects.toThrow('abort formula replacement');

    expect(worksheet?.getCell({ row: 1, col: 2 })?.formula).toBe('=A1+1');
    expect(engine.getCellValue({ row: 1, col: 2 })).toBe(3);
  });

  test('restores all writes when one cell is changed repeatedly before a throw', async () => {
    const engine = new SpreadsheetEngine();
    await engine.run((ws) => ws.setCellValue({ row: 1, col: 1 }, 1));

    await expect(engine.run((ws) => {
      ws.setCellValue({ row: 1, col: 1 }, 2);
      ws.setCellValue({ row: 1, col: 1 }, 3);
      ws.setCellValue({ row: 1, col: 1 }, 4);
      throw new Error('abort repeated writes');
    })).rejects.toThrow('abort repeated writes');

    expect(engine.getCellValue({ row: 1, col: 1 })).toBe(1);
  });

  test('rolls back style changes and rejects style mutation outside run()', async () => {
    const engine = new SpreadsheetEngine();
    const address = { row: 1, col: 1 };
    const originalStyle = { bold: true };
    const changedStyle = { italic: true };

    await engine.run((ws) => ws.setCellStyle(address, originalStyle));
    await expect(engine.run((ws) => {
      ws.setCellStyle(address, changedStyle);
      throw new Error('abort style change');
    })).rejects.toThrow('abort style change');

    let worksheet: Worksheet | undefined;
    await engine.run((ws) => { worksheet = ws; });
    expect(worksheet?.getDirectCellStyle(address)).toMatchObject(originalStyle);
    expect(() => worksheet?.setCellStyle(address, changedStyle)).toThrow(/outside engine\.run/);
  });

  test('rejects a concurrent run without applying its mutation', async () => {
    const engine = new SpreadsheetEngine();
    let concurrentError: unknown;
    let concurrentAttempt: Promise<void> | undefined;

    engine.on('cellsChanged', () => {
      concurrentAttempt = engine
        .run((ws) => ws.setCellValue({ row: 2, col: 1 }, 'must not apply'))
        .catch((error: unknown) => { concurrentError = error; });
    });
    await engine.run((ws) => ws.setCellValue({ row: 1, col: 1 }, 'committed'));

    await concurrentAttempt;
    expect(concurrentError).toMatchObject({ code: 'CONCURRENT_RUN' });
    expect(engine.getCellValue({ row: 1, col: 1 })).toBe('committed');
    expect(engine.getCellValue({ row: 2, col: 1 })).toBeNull();
  });

  test('overlapping calls reject the second callback and the first still completes', async () => {
    const engine = new SpreadsheetEngine();
    let secondCallbackRan = false;

    const first = engine.run((ws) => ws.setCellValue({ row: 1, col: 1 }, 'first'));
    const second = engine.run((ws) => {
      secondCallbackRan = true;
      ws.setCellValue({ row: 2, col: 1 }, 'second');
    });

    await expect(second).rejects.toMatchObject({ code: 'CONCURRENT_RUN' });
    await first;
    expect(secondCallbackRan).toBe(false);
    expect(engine.getCellValue({ row: 1, col: 1 })).toBe('first');
    expect(engine.getCellValue({ row: 2, col: 1 })).toBeNull();
    expect(engine.executionState).toBe('IDLE');
  });

  test('sequential calls both complete and leave the engine idle', async () => {
    const engine = new SpreadsheetEngine();
    await engine.run((ws) => ws.setCellValue({ row: 1, col: 1 }, 1));
    await engine.run((ws) => ws.setCellValue({ row: 1, col: 2 }, 2));

    expect(engine.getCellValue({ row: 1, col: 1 })).toBe(1);
    expect(engine.getCellValue({ row: 1, col: 2 })).toBe(2);
    expect(engine.executionState).toBe('IDLE');
  });

  test('rejects an async callback after it settles and rolls back every write', async () => {
    const engine = new SpreadsheetEngine();
    const asyncCallback = (async (ws: Worksheet) => {
      ws.setCellValue({ row: 1, col: 1 }, 'before await');
      await Promise.resolve();
      ws.setCellValue({ row: 1, col: 2 }, 'after await');
    }) as unknown as (ws: Worksheet) => void;

    await expect(engine.run(asyncCallback)).rejects.toMatchObject({ code: 'ILLEGAL_STATE' });
    expect(engine.getCellValue({ row: 1, col: 1 })).toBeNull();
    expect(engine.getCellValue({ row: 1, col: 2 })).toBeNull();
    expect(engine.executionState).toBe('IDLE');
  });

  test('independent engine instances can run concurrently without interference', async () => {
    const first = new SpreadsheetEngine('First');
    const second = new SpreadsheetEngine('Second');

    await Promise.all([
      first.run((ws) => ws.setCellValue({ row: 1, col: 1 }, 'first')),
      second.run((ws) => ws.setCellValue({ row: 1, col: 1 }, 'second')),
    ]);

    expect(first.getCellValue({ row: 1, col: 1 })).toBe('first');
    expect(second.getCellValue({ row: 1, col: 1 })).toBe('second');
    expect(first.executionState).toBe('IDLE');
    expect(second.executionState).toBe('IDLE');
  });

  test('records every mutation made inside a worksheet batch', async () => {
    const engine = new SpreadsheetEngine();
    let recordedCount = 0;
    engine.on('cellsChanged', (event) => {
      if (event.type === 'cellsChanged') recordedCount = event.patch.ops.length;
    });

    await engine.run((ws) => ws.runTransaction(() => {
      ws.setCellValue({ row: 1, col: 1 }, 1);
      ws.setCellValue({ row: 1, col: 2 }, 2);
      ws.setCellValue({ row: 1, col: 3 }, 3);
    }));

    expect(recordedCount).toBe(3);
  });

  test('undoes and redoes formula creation, replacement, deletion, and literal replacement', async () => {
    const worksheet = new Worksheet('History');
    const proxy = {
      async applyPatch(patch: WorksheetPatch): Promise<WorksheetPatch> {
        applyPatch(worksheet, patch);
        return invertPatch(patch);
      },
    };
    const history = new PatchUndoStack(proxy);
    const address = { row: 1, col: 2 };
    const record = async (mutate: () => void) => {
      const transaction = new TransactionContext(worksheet);
      mutate();
      const { patch } = transaction.commit();
      expect(PatchSerializer.deserialize(PatchSerializer.serialize(patch))).toEqual(patch);
      await history.applyAndRecord(patch);
    };

    await record(() => worksheet.setCellFormula(address, '=A1+1', 6));
    await record(() => worksheet.setCellFormula(address, '=A1+2', 7));
    await record(() => worksheet.setCellValue(address, 9));
    await record(() => worksheet.setCellFormula(address, '=A1+4', 10));
    await record(() => worksheet.clearCellFormula(address));

    expect(worksheet.getCell(address)?.formula).toBeUndefined();
    expect(worksheet.getCellValue(address)).toBe(10);
    await history.undo();
    expect(worksheet.getCell(address)?.formula).toBe('=A1+4');
    await history.undo();
    expect(worksheet.getCell(address)?.formula).toBeUndefined();
    expect(worksheet.getCellValue(address)).toBe(9);
    await history.undo();
    expect(worksheet.getCell(address)?.formula).toBe('=A1+2');
    await history.undo();
    expect(worksheet.getCell(address)?.formula).toBe('=A1+1');
    await history.undo();
    expect(worksheet.getCell(address)?.formula).toBeUndefined();
    expect(worksheet.getCellValue(address)).toBeNull();

    await history.redo();
    await history.redo();
    await history.redo();
    await history.redo();
    await history.redo();
    expect(worksheet.getCell(address)?.formula).toBeUndefined();
    expect(worksheet.getCellValue(address)).toBe(10);

    // Exercise a second complete undo/redo cycle to catch stack drift.
    for (let i = 0; i < 5; i++) await history.undo();
    for (let i = 0; i < 5; i++) await history.redo();
    expect(worksheet.getCellValue(address)).toBe(10);
  });
});
