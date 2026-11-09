import { FormulaEngine } from '../src/FormulaEngine';
import { Workbook, type WorkbookSheetView, Worksheet } from '../src';
import {
  setWorkbookMutationTestHooks,
  type WorkbookMutationFailurePhase,
} from '../src/workbookMutationTestHooks';

type Strategy = 'journal' | 'snapshot';

const anchor = { row: 1, col: 1 };
const member = { row: 2, col: 2 };
const e5 = { row: 5, col: 5 };
const f5 = { row: 5, col: 6 };

function standaloneFixture() {
  const worksheet = new Worksheet('Merged formula', 10, 10, new FormulaEngine() as any);
  worksheet.mergeCells({ start: anchor, end: member });
  worksheet.setCellValue(e5, 10);
  worksheet.setCellValue(f5, 20);
  return worksheet;
}

function workbookFixture(
  strategy: Strategy,
  failure?: (phase: WorkbookMutationFailurePhase) => void,
) {
  const workbook = Workbook.create({ sheets: [{ name: 'Base', rows: 10, cols: 10 }] });
  const raw = workbook.createDevImportWorksheet('Merged', 10, 10) as Worksheet;
  raw.mergeCells({ start: anchor, end: member });
  raw.setCellValue(e5, 10);
  raw.setCellValue(f5, 20);
  raw.setCellFormula(anchor, '=E5+1', 11);
  workbook.attachDevImportSheet(raw);
  const view = workbook.getSheet('Merged') as WorkbookSheetView;
  const registration = setWorkbookMutationTestHooks(workbook, {
    strategy,
    worksheetFailure: failure,
  });
  return { workbook, raw, view, registration };
}

describe('PKG-14A merged-member formula coordinate characterization', () => {
  test('A1 dependency extraction is literal while evaluator support for dollar-marked references remains limited', () => {
    const worksheet = standaloneFixture();

    for (const formula of ['=E5+1', '=E$5+1', '=$E5+1', '=$E$5+1']) {
      worksheet.setCellFormula(member, formula);
      worksheet.autoRecalculate();

      expect(worksheet.getCell(anchor)?.formula).toBe(formula);
      if (formula === '=E5+1') {
        expect(worksheet.getCell(anchor)?.value).toBe(11);
      } else {
        // Current FormulaEngine token evaluation does not accept `$` in A1
        // references. Dependency extraction independently recognizes the
        // same literal E5 coordinate. This records current behavior only.
        expect(worksheet.getCell(anchor)?.value).toBe('#NAME?');
      }
      expect(worksheet.getPrecedents(anchor)).toEqual([e5]);
      expect(worksheet.getPrecedents(member)).toEqual([]);
      expect(worksheet.getDependents(e5)).toContainEqual(anchor);
    }

    worksheet.setCellFormula(member, '=E5+1');
    worksheet.autoRecalculate();
    worksheet.setCellValue(e5, 31);
    expect(worksheet.isDirty(anchor)).toBe(true);
    worksheet.autoRecalculate();
    expect(worksheet.getCell(anchor)).toMatchObject({ formula: '=E5+1', value: 32 });

    worksheet.setCellFormula(member, '=F5+1');
    worksheet.autoRecalculate();
    expect(worksheet.getCell(anchor)).toMatchObject({ formula: '=F5+1', value: 21 });
    expect(worksheet.getPrecedents(anchor)).toEqual([f5]);
    expect(worksheet.getDependents(e5)).not.toContainEqual(anchor);
    expect(worksheet.getDependents(f5)).toContainEqual(anchor);

    worksheet.setCellValue(f5, 40);
    expect(worksheet.isDirty(anchor)).toBe(true);
    worksheet.autoRecalculate();
    expect(worksheet.getCell(anchor)).toMatchObject({ formula: '=F5+1', value: 41 });

    worksheet.clearCellFormula(member);
    expect(worksheet.getCell(anchor)).toMatchObject({ value: 41 });
    expect(worksheet.getCell(anchor)?.formula).toBeUndefined();
    expect(worksheet.getPrecedents(anchor)).toEqual([]);
    expect(worksheet.getDependents(f5)).not.toContainEqual(anchor);
  });

  test.each(['journal', 'snapshot'] as const)(
    '%s commits formula replacement and clear through a member with requested-address events',
    async (strategy) => {
      const { workbook, raw, view, registration } = workbookFixture(strategy);
      const events: Array<{ address: { row: number; col: number }; formula?: string }> = [];
      view.on((event) => {
        if (event.type === 'cell-changed' && event.origin !== 'formula-result') {
          events.push({ address: event.address, formula: event.cell.formula });
        }
      });

      try {
        await workbook.transact((tx) => tx.setCellFormula(view, member, '=$F$5+1', 21));
        expect(raw.getCell(anchor)).toMatchObject({ formula: '=$F$5+1', value: 21 });
        expect(raw.getPrecedents(anchor)).toEqual([f5]);
        expect(raw.getDependents(e5)).not.toContainEqual(anchor);
        expect(events).toEqual([{ address: member, formula: '=$F$5+1' }]);

        events.length = 0;
        await workbook.transact((tx) => tx.clearCellFormula(view, member));
        expect(raw.getCell(anchor)).toMatchObject({ value: 21 });
        expect(raw.getCell(anchor)?.formula).toBeUndefined();
        expect(raw.getPrecedents(anchor)).toEqual([]);
        expect(raw.getDependents(f5)).not.toContainEqual(anchor);
        expect(events).toEqual([{ address: member, formula: undefined }]);
        expect(workbook.getMutationHealth()).toEqual({ status: 'healthy' });
      } finally {
        registration.dispose();
      }
    },
  );

  test.each(['journal', 'snapshot'] as const)(
    '%s restores the prior formula, graph, and event silence after a member replacement fails during dependency update',
    async (strategy) => {
      const injected = new Error(`PKG-14A ${strategy} formula graph failure`);
      let injectFailure = true;
      const { workbook, raw, view, registration } = workbookFixture(strategy, (phase) => {
        if (phase === 'after-dependency-registration' && injectFailure) {
          injectFailure = false;
          throw injected;
        }
      });
      const before = raw.extractSnapshot();
      const events: unknown[] = [];
      view.on((event) => events.push(event));

      try {
        await expect(workbook.transact((tx) => {
          tx.setCellFormula(view, member, '=$F$5+2', 22);
        })).rejects.toBe(injected);

        expect(raw.extractSnapshot()).toEqual(before);
        expect(raw.getCell(anchor)).toMatchObject({ formula: '=E5+1', value: 11 });
        expect(raw.getPrecedents(anchor)).toEqual([e5]);
        expect(raw.getDependents(e5)).toContainEqual(anchor);
        expect(raw.getDependents(f5)).not.toContainEqual(anchor);
        expect(events).toEqual([]);
        expect(workbook.getMutationHealth()).toEqual({ status: 'healthy' });
      } finally {
        registration.dispose();
      }
    },
  );
});
