import { describe, expect, test } from '@jest/globals';
import { FormulaEngine } from '../src/FormulaEngine';
import * as StatisticalFunctions from '../src/functions/statistical/statistical-functions';
import { ConditionalFormattingFormulaCompiler } from '../src/ConditionalFormattingFormulaCompiler';
import { RecomputeScheduler, TaskPriority, type ScheduledTask } from '../src/RecomputeScheduler';
import { SpillEngine } from '../src/SpillEngine';
import { Worksheet } from '../src/worksheet';
import { createSpreadsheet, PivotSourceError, type PivotDefinition } from '../src/sdk';

describe('P1-08F.01 statistical right-tail and inverse diagnostics', () => {
  test('registered distribution helpers match independent reference points within numerical tolerances', () => {
    const cases = [
      [StatisticalFunctions.T_DIST_RT(1.96, 60), 0.027322464868264187, 7],
      [StatisticalFunctions.T_INV(0.975, 60), 2.0002978220142538, 6],
      [StatisticalFunctions.F_DIST_RT(1, 5, 10), 0.4651194265377996, 12],
      [StatisticalFunctions.F_INV_RT(0.05, 5, 10), 3.32583453041301, 6],
      [StatisticalFunctions.CHISQ_DIST_RT(5, 2), Math.exp(-2.5), 13],
      [StatisticalFunctions.CHISQ_INV_RT(0.05, 10), 18.30703805327515, 7],
    ] as const;

    for (const [actual, expected, precision] of cases) {
      expect(actual).toBeCloseTo(expected, precision);
    }

    const engine = new FormulaEngine();
    const worksheet = new Worksheet('F01 independent references', 4, 2);
    const context = { worksheet, currentCell: { row: 1, col: 1 } };
    const publicCases = [
      ['=T.DIST.RT(1.96,60)', 0.027322464868264187, 7],
      ['=T.INV(0.975,60)', 2.0002978220142538, 6],
      ['=F.DIST.RT(1,5,10)', 0.4651194265377996, 12],
      ['=F.INV.RT(0.05,5,10)', 3.32583453041301, 6],
      ['=CHISQ.DIST.RT(5,2)', Math.exp(-2.5), 13],
      ['=CHISQ.INV.RT(0.05,10)', 18.30703805327515, 7],
      ['=NORM.S.DIST(0,TRUE)', 0.5, 8],
      ['=NORM.S.DIST(1,TRUE)', 0.8413447460685429, 7],
      ['=NORM.S.DIST(0,FALSE)', 1 / Math.sqrt(2 * Math.PI), 14],
      ['=NORM.S.INV(0.975)', 1.959963984540054, 7],
    ] as const;
    for (const [formula, expected, precision] of publicCases) {
      expect(engine.evaluate(formula, context)).toBeCloseTo(expected, precision);
    }
  });

  test('registrations resolve and public formula outcomes are recorded independently by family', () => {
    const engine = new FormulaEngine();
    const worksheet = new Worksheet('F01', 8, 4);
    const context = { worksheet, currentCell: { row: 1, col: 1 } };
    const formulas = [
      '=T.DIST.RT(1.96,60)', '=T.INV(0.975,60)',
      '=F.DIST.RT(1,5,10)', '=F.INV.RT(0.05,5,10)',
      '=CHISQ.DIST.RT(5,2)', '=CHISQ.INV.RT(0.05,10)',
    ];
    const results = formulas.map((formula) => engine.evaluate(formula, context));
    const outcomes = formulas.map((formula, index) => ({
      formula,
      result: results[index] instanceof Error
        ? (results[index] as Error).message
        : results[index],
    }));

    for (const name of ['T.DIST.RT', 'T.INV', 'F.DIST.RT', 'F.INV.RT', 'CHISQ.DIST.RT', 'CHISQ.INV.RT']) {
      expect(engine.functions.getMetadata(name)).toBeDefined();
    }
    expect(outcomes).toHaveLength(6);
    const expected = [
      [0.027322464868264187, 7],
      [2.0002978220142538, 6],
      [0.4651194265377996, 12],
      [3.32583453041301, 6],
      [Math.exp(-2.5), 13],
      [18.30703805327515, 7],
    ] as const;
    outcomes.forEach(({ result }, index) => {
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(expected[index][0], expected[index][1]);
    });
    const direct = [
      StatisticalFunctions.T_DIST_RT(1.96, 60),
      StatisticalFunctions.F_DIST_RT(1, 5, 10),
      StatisticalFunctions.F_INV_RT(0.05, 5, 10),
      StatisticalFunctions.CHISQ_DIST_RT(5, 2),
      StatisticalFunctions.CHISQ_INV_RT(0.05, 10),
    ];
    expect(direct.every((value) => typeof value === 'number' && Number.isFinite(value))).toBe(true);
    expect(direct[3]).toBeCloseTo(0.0820849986238988, 12);
  });

  test('input conversion errors and distribution-domain errors remain distinguishable', () => {
    const engine = new FormulaEngine();
    const context = { worksheet: new Worksheet('F01 validation', 2, 2), currentCell: { row: 1, col: 1 } };
    const invalidText = engine.evaluate('=F.DIST("bad",5,10,TRUE)', context);
    const invalidDomain = engine.evaluate('=F.DIST(-1,5,10,TRUE)', context);
    expect(invalidText).toBeInstanceOf(Error);
    expect(invalidDomain).toBeInstanceOf(Error);
    expect((invalidText as Error).message).toBe('#VALUE!');
    expect((invalidDomain as Error).message).toBe('#NUM!');
  });
});

describe('P1-08F.02 standard normal public formula boundary', () => {
  test('known reference points distinguish registered numeric helpers from public parser results', () => {
    const engine = new FormulaEngine();
    const context = { worksheet: new Worksheet('F02', 2, 2), currentCell: { row: 1, col: 1 } };
    const cases = [
      ['=NORM.S.DIST(0,TRUE)', 0.5],
      ['=NORM.S.DIST(1,TRUE)', 0.8413447460685429],
      ['=NORM.S.DIST(0,FALSE)', 0.3989422804014327],
      ['=NORM.S.INV(0.975)', 1.959963984540054],
    ] as const;

    const observed = cases.map(([formula]) => {
      const result = engine.evaluate(formula, context);
      return {
        formula,
        result: result instanceof Error ? result.message : result,
        error: result instanceof Error,
      };
    });
    expect(engine.functions.getMetadata('NORM.S.DIST')).toBeDefined();
    expect(engine.functions.getMetadata('NORM.S.INV')).toBeDefined();
    const expected = [
      [0.5, 8],
      [0.8413447460685429, 7],
      [1 / Math.sqrt(2 * Math.PI), 14],
      [1.959963984540054, 7],
    ] as const;
    observed.forEach(({ result }, index) => {
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(expected[index][0], expected[index][1]);
    });
    expect(StatisticalFunctions.NORM_S_DIST(0, true)).toBeCloseTo(0.5, 8);
    expect(StatisticalFunctions.NORM_S_DIST(1, true)).toBeCloseTo(0.8413447460685429, 7);
    expect(StatisticalFunctions.NORM_S_DIST(0, false)).toBeCloseTo(0.3989422804014327, 14);
    expect(StatisticalFunctions.NORM_S_INV(0.975)).toBeCloseTo(1.959963984540054, 7);
  });
});

describe('P1-08F.03 spill cleanup characterization', () => {
  test('clearSpill preserves source data and clears current stored metadata and dependent values', () => {
    const worksheet = new Worksheet('F03 spill', 6, 4);
    const spill = new SpillEngine();
    spill.applySpill(worksheet, { row: 1, col: 1 }, [10, 20, 30]);
    const before = worksheet.getCell({ row: 1, col: 1 });
    expect(before?.spillSource?.dimensions).toEqual([3, 1]);

    spill.clearSpill(worksheet, { row: 1, col: 1 });

    expect(worksheet.getCellValue({ row: 1, col: 1 })).toBe(10);
    expect(worksheet.getCell({ row: 1, col: 1 })?.spillSource).toBeUndefined();
    expect(before?.spillSource?.dimensions).toEqual([3, 1]);
    for (const row of [2, 3]) {
      expect(worksheet.getCellValue({ row, col: 1 })).toBeNull();
      expect(worksheet.getCell({ row, col: 1 })?.spilledFrom).toBeUndefined();
    }
  });
});

describe('P1-08F.03 conditional-formatting formula characterization', () => {
  test('OR evaluates each comparison and records the combined parser result separately', () => {
    const resolve = (formula: string, reads: string[] = []) =>
      ConditionalFormattingFormulaCompiler.compile(formula, { row: 1, col: 1 })
        .evaluate({ row: 1, col: 1 }, (address) => {
          reads.push(`${address.row},${address.col}`);
          return address.col === 1 ? 50 : 100;
        });

    expect(resolve('=A1>60')).toBe(false);
    expect(resolve('=B1<110')).toBe(true);

    const reads: string[] = [];
    const combined = resolve('=OR(A1>60, B1<110)', reads);
    expect(reads).toEqual(['1,2', '1,1']);
    // Both operands are read during reference substitution and the combined
    // expression produces the logical result for the independently observed
    // left=false/right=true predicates.
    expect(combined).toBe(true);
  });

  test('OR boolean coercion is characterized independently from reference parsing', () => {
    const compiled = ConditionalFormattingFormulaCompiler.compile(
      '=OR(A1,B1)', { row: 1, col: 1 },
    );
    const result = compiled.evaluate({ row: 1, col: 1 }, (address) =>
      address.col === 1 ? true : false,
    );
    expect(result).toBe(true);
  });

  test('OR references resolve to A1 and B1 and the combined expression evaluates both predicates', () => {
    const compiled = ConditionalFormattingFormulaCompiler.compile(
      '=OR(A1>60, B1<110)', { row: 1, col: 1 },
    );
    const reads: string[] = [];
    const result = compiled.evaluate({ row: 1, col: 1 }, (address) => {
      reads.push(`${address.row},${address.col}`);
      return address.row === 1 && address.col === 1 ? 50 : 100;
    });

    expect(compiled.references.map((reference) => reference.original)).toEqual(['A1', 'B1']);
    expect(reads).toEqual(['1,2', '1,1']);
    expect(result).toBe(true);
  });
});

describe('P1-08F.04 scheduler generation trace and failing helper boundary', () => {
  test('invalidation skips queued old-generation tasks and publishes only current-generation work', async () => {
    const trace: string[] = [];
    let scheduler!: RecomputeScheduler;
    scheduler = new RecomputeScheduler({
      timeSliceMs: 0,
      evaluator: (task: ScheduledTask) => {
        trace.push(`evaluate:${task.generation}:${task.row}`);
        return task.generation * 100 + task.row;
      },
      onComplete: (task, value) => trace.push(`publish:${task.generation}:${task.row}:${value}`),
      onYield: ({ generation, remaining }) => {
        trace.push(`yield:${generation}:${remaining}`);
        if (generation === 0) {
          scheduler.invalidate();
          scheduler.schedule({ row: 9, col: 1 }, TaskPriority.High);
        }
      },
    });
    scheduler.schedule({ row: 1, col: 1 }, TaskPriority.High);
    scheduler.schedule({ row: 2, col: 1 }, TaskPriority.High);
    await scheduler.flush();

    expect(trace).toContain('evaluate:0:1');
    expect(trace).toContain('yield:0:1');
    expect(trace).toContain('evaluate:1:9');
    expect(trace).toContain('publish:1:9:109');
    expect(trace).not.toContain('evaluate:0:2');
    expect(trace).not.toContain('publish:0:2:2');
  });

  test('the existing composition helper result write deletes the formula needed for later scheduling', () => {
    const worksheet = new Worksheet('F04 helper write', 3, 2);
    const address = { row: 2, col: 1 };
    worksheet.setCellFormula(address, '=A1*10');
    expect(worksheet.getCell(address)?.formula).toBe('=A1*10');

    // scheduler-composition.test.ts uses this public setter in onComplete.
    worksheet.setCellValue(address, 1000);
    expect(worksheet.getCellValue(address)).toBe(1000);
    expect(worksheet.getCell(address)?.formula).toBeUndefined();
  });
});

describe('P1-08F.06 public SpreadsheetSDK operation flow characterization', () => {
  test('freeze, filter, sort, and pivot use the public standalone factory and observable state', () => {
    const sheet = createSpreadsheet('F06 SDK', { rows: 12, cols: 6 });
    try {
      sheet.setCell(1, 1, 'Region');
      sheet.setCell(1, 2, 'Revenue');
      sheet.setCell(2, 1, 'West');
      sheet.setCell(2, 2, 10);
      sheet.setCell(3, 1, 'East');
      sheet.setCell(3, 2, 20);

      sheet.setFreezePanes(1, 1);
      expect(sheet.getFreezePanes()).toEqual({ rows: 1, cols: 1 });
      sheet.clearFreezePanes();
      expect(sheet.getFreezePanes()).toBeNull();

      sheet.setFilter(1, { type: 'equals', value: 'East' });
      expect(sheet.getFilter(1)).toEqual({ type: 'equals', value: 'East' });
      expect(sheet.getVisibleRows()).toEqual([3]);
      sheet.clearFilter(1);
      expect(sheet.getFilter(1)).toBeUndefined();

      sheet.setAutoFilterRange(1, 1, 2);
      expect(sheet.getAutoFilterRange()).toEqual({ headerRow: 1, startCol: 1, endCol: 2 });
      sheet.clearAutoFilterRange();
      expect(sheet.getAutoFilterRange()).toBeNull();

      sheet.sortRange(
        { start: { row: 2, col: 1 }, end: { row: 3, col: 2 } },
        [{ col: 1, dir: 'asc' }],
      );
      expect(sheet.getCellValue(2, 1)).toBe('East');
      expect(sheet.getCellValue(3, 2)).toBe(10);

      const definition: PivotDefinition = {
        source: { start: { row: 1, col: 1 }, end: { row: 3, col: 2 } },
        rows: ['Region'],
        values: [{ field: 'Revenue', aggregator: 'sum' }],
      };
      const pivot = sheet.createPivot(definition, { row: 6, col: 1 });
      expect(pivot).toBeDefined();
      expect(sheet.getCellValue(6, 1)).toBe('Region');
      expect(() => sheet.createPivot({ ...definition, source: {
        start: { row: 0, col: 1 }, end: { row: 2, col: 2 },
      } }, { row: 10, col: 1 })).toThrow(PivotSourceError);
    } finally {
      sheet.dispose();
    }
  });
});
