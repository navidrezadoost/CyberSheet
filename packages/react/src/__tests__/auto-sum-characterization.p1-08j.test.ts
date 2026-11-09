import { Worksheet } from '@cyber-sheet/core';
import { detectAutoSumPlans } from '../utils/autoSum';

describe('P1-08J.05 AutoSum numeric-run characterization', () => {
  test('standalone callers detect above, left, vertical, horizontal, and multi-column operands', () => {
    const worksheet = new Worksheet('J05 AutoSum plans', 6, 6);
    worksheet.setCellValue({ row: 1, col: 1 }, 4);
    worksheet.setCellValue({ row: 2, col: 1 }, 6);
    worksheet.setCellValue({ row: 4, col: 1 }, 8);
    worksheet.setCellValue({ row: 4, col: 2 }, 9);
    worksheet.setCellValue({ row: 5, col: 1 }, 2);
    worksheet.setCellValue({ row: 5, col: 2 }, 3);
    worksheet.setCellValue({ row: 6, col: 1 }, 2);
    worksheet.setCellValue({ row: 6, col: 2 }, 3);
    worksheet.setCellValue({ row: 1, col: 3 }, 10);
    worksheet.setCellValue({ row: 1, col: 5 }, 12);
    worksheet.setCellValue({ row: 2, col: 3 }, 13);
    worksheet.setCellValue({ row: 3, col: 3 }, 14);

    expect(detectAutoSumPlans(
      worksheet,
      { start: { row: 3, col: 1 }, end: { row: 3, col: 1 } },
      { row: 3, col: 1 },
    )[0]).toMatchObject({ formula: '=SUM(A1:A2)', outputCell: { row: 3, col: 1 } });
    expect(detectAutoSumPlans(
      worksheet,
      { start: { row: 6, col: 3 }, end: { row: 6, col: 3 } },
      { row: 6, col: 3 },
    )[0]).toMatchObject({ formula: '=SUM(A6:B6)', outputCell: { row: 6, col: 3 } });
    expect(detectAutoSumPlans(
      worksheet,
      { start: { row: 1, col: 3 }, end: { row: 3, col: 3 } },
      { row: 4, col: 3 },
    )[0]).toMatchObject({ formula: '=SUM(C1:C3)', outputCell: { row: 4, col: 3 } });
    expect(detectAutoSumPlans(
      worksheet,
      { start: { row: 1, col: 1 }, end: { row: 1, col: 5 } },
      { row: 1, col: 6 },
    )[0]).toMatchObject({ formula: '=SUM(A1:E1)', outputCell: { row: 1, col: 6 } });
    expect(detectAutoSumPlans(
      worksheet,
      { start: { row: 1, col: 1 }, end: { row: 3, col: 5 } },
      { row: 3, col: 5 },
    )).toEqual([
      { outputCell: { row: 4, col: 1 }, operandRange: { start: { row: 1, col: 1 }, end: { row: 2, col: 1 } }, formula: '=SUM(A1:A2)' },
      { outputCell: { row: 4, col: 3 }, operandRange: { start: { row: 1, col: 3 }, end: { row: 3, col: 3 } }, formula: '=SUM(C1:C3)' },
      { outputCell: { row: 4, col: 5 }, operandRange: { start: { row: 1, col: 5 }, end: { row: 1, col: 5 } }, formula: '=SUM(E1)' },
    ]);
  });
});
