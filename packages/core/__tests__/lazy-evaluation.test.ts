import { FormulaEngine } from '../src/FormulaEngine';
import { Worksheet } from '../src/worksheet';

describe('Phase 8.2 lazy DAG evaluation', () => {
  let worksheet: Worksheet;

  beforeEach(() => {
    worksheet = new Worksheet('Lazy', 100, 26, new FormulaEngine() as any);
  });

  it('evaluateIfNeeded recalculates only the requested dirty branch', () => {
    worksheet.setCellValue({ row: 1, col: 1 }, 2);
    worksheet.setCellFormula({ row: 1, col: 2 }, '=A1*10'); // B1
    worksheet.setCellFormula({ row: 1, col: 3 }, '=A1*20'); // C1
    worksheet.setCellFormula({ row: 1, col: 4 }, '=A1*30'); // D1
    worksheet.registerDependencies({ row: 1, col: 2 }, [{ row: 1, col: 1 }]);
    worksheet.registerDependencies({ row: 1, col: 3 }, [{ row: 1, col: 1 }]);
    worksheet.registerDependencies({ row: 1, col: 4 }, [{ row: 1, col: 1 }]);
    worksheet.autoRecalculate();

    worksheet.setCellValue({ row: 1, col: 1 }, 3);

    expect(worksheet.evaluateIfNeeded({ row: 1, col: 2 })).toBe(30);
    expect(worksheet.getCellValue({ row: 1, col: 3 })).toBe(40);
    expect(worksheet.getCellValue({ row: 1, col: 4 })).toBe(60);
    expect(worksheet.dirtyCount).toBe(2);
  });

  it('evaluateIfNeeded evaluates dirty dependencies required by a requested cell', () => {
    worksheet.setCellValue({ row: 1, col: 1 }, 2);
    worksheet.setCellFormula({ row: 1, col: 2 }, '=A1*10'); // B1
    worksheet.setCellFormula({ row: 1, col: 3 }, '=B1+5'); // C1
    worksheet.registerDependencies({ row: 1, col: 2 }, [{ row: 1, col: 1 }]);
    worksheet.registerDependencies({ row: 1, col: 3 }, [{ row: 1, col: 2 }]);
    worksheet.autoRecalculate();

    worksheet.setCellValue({ row: 1, col: 1 }, 4);

    expect(worksheet.evaluateIfNeeded({ row: 1, col: 3 })).toBe(45);
    expect(worksheet.getCellValue({ row: 1, col: 2 })).toBe(40);
    expect(worksheet.dirtyCount).toBe(0);
  });

  it('evaluateBatch recalculates visible requested cells and leaves off-screen dirty cells deferred', () => {
    worksheet.setCellValue({ row: 1, col: 1 }, 1);
    worksheet.setCellFormula({ row: 1, col: 2 }, '=A1+1'); // B1
    worksheet.setCellFormula({ row: 50, col: 2 }, '=A1+10'); // B50
    worksheet.registerDependencies({ row: 1, col: 2 }, [{ row: 1, col: 1 }]);
    worksheet.registerDependencies({ row: 50, col: 2 }, [{ row: 1, col: 1 }]);
    worksheet.autoRecalculate();

    worksheet.setCellValue({ row: 1, col: 1 }, 5);
    const result = worksheet.evaluateBatch([{ row: 1, col: 2 }]);

    expect(result.evaluated).toBeGreaterThanOrEqual(1);
    expect(worksheet.getCellValue({ row: 1, col: 2 })).toBe(6);
    expect(worksheet.getCellValue({ row: 50, col: 2 })).toBe(11);
    expect(worksheet.dirtyCount).toBe(1);
  });
});
