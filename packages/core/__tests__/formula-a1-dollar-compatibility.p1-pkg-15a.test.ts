import { FormulaEngine } from '../src/FormulaEngine';
import { Worksheet } from '../src/worksheet';
import type { Address } from '../src/types';

const mergeAnchor: Address = { row: 1, col: 1 };
const mergeMember: Address = { row: 2, col: 2 };
const ordinaryCell: Address = { row: 1, col: 7 }; // G1
const e5: Address = { row: 5, col: 5 };
const f5: Address = { row: 5, col: 6 };

const formulaSpellings = ['=E5+1', '=E$5+1', '=$E5+1', '=$E$5+1'] as const;
const placements = [
  { label: 'ordinary cell', requested: ordinaryCell, stored: ordinaryCell },
  { label: 'merge anchor', requested: mergeAnchor, stored: mergeAnchor },
  { label: 'non-anchor merge member', requested: mergeMember, stored: mergeAnchor },
] as const;

function fixture(): Worksheet {
  const worksheet = new Worksheet('Formula compatibility', 10, 10, new FormulaEngine() as any);
  worksheet.mergeCells({ start: mergeAnchor, end: mergeMember });
  worksheet.setCellValue(e5, 10);
  worksheet.setCellValue(f5, 20);
  return worksheet;
}

describe('PKG-15A A1 formula extractor/evaluator compatibility', () => {
  test.each(placements.flatMap((placement) => formulaSpellings.map((formula) => ({ placement, formula }))))(
    '$placement.label retains literal formula and dependency coordinates for $formula',
    ({ placement, formula }) => {
      const worksheet = fixture();

      worksheet.setCellFormula(placement.requested, formula);
      worksheet.autoRecalculate();

      expect(worksheet.getCell(placement.stored)).toMatchObject({ formula });
      expect(worksheet.getPrecedents(placement.stored)).toEqual([e5]);
      expect(worksheet.getDependents(e5)).toContainEqual(placement.stored);
      if (placement.requested !== placement.stored) {
        expect(worksheet.getPrecedents(placement.requested)).toEqual([]);
      }

      // This is an observation of current evaluator behavior, not an assertion
      // that dollar-marked syntax is unsupported by the product contract.
      expect(worksheet.getCell(placement.stored)?.value).toBe(
        formula === '=E5+1' ? 11 : '#NAME?',
      );

      worksheet.setCellValue(e5, 31);
      expect(worksheet.isDirty(placement.stored)).toBe(true);
      worksheet.autoRecalculate();
      expect(worksheet.getCell(placement.stored)?.value).toBe(
        formula === '=E5+1' ? 32 : '#NAME?',
      );
    },
  );

  test.each(placements)('$label replacement and clear update the effective formula graph', ({ requested, stored }) => {
    const worksheet = fixture();

    worksheet.setCellFormula(requested, '=E5+1');
    worksheet.autoRecalculate();
    expect(worksheet.getCell(stored)).toMatchObject({ formula: '=E5+1', value: 11 });
    expect(worksheet.getPrecedents(stored)).toEqual([e5]);

    worksheet.setCellFormula(requested, '=F5+1');
    worksheet.autoRecalculate();
    expect(worksheet.getCell(stored)).toMatchObject({ formula: '=F5+1', value: 21 });
    expect(worksheet.getPrecedents(stored)).toEqual([f5]);
    expect(worksheet.getDependents(e5)).not.toContainEqual(stored);
    expect(worksheet.getDependents(f5)).toContainEqual(stored);

    worksheet.clearCellFormula(requested);
    expect(worksheet.getCell(stored)?.formula).toBeUndefined();
    expect(worksheet.getPrecedents(stored)).toEqual([]);
    expect(worksheet.getDependents(f5)).not.toContainEqual(stored);
  });
});
