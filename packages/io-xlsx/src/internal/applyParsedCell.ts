import type { Worksheet } from '@cyber-sheet/core';
import type { ParsedCell } from '../LightweightParser';

/** @internal Applies one parsed record through the Worksheet mutation boundary. */
export function applyParsedCellToWorksheet(
  worksheet: Worksheet,
  address: { row: number; col: number },
  cell: ParsedCell,
): void {
  if (cell.value !== null && cell.value !== undefined) {
    worksheet.setCellValue(address, cell.value);
  }
  if (cell.formula) {
    worksheet.setCellFormula(address, cell.formula);
  }
  if (cell.style) {
    worksheet.setCellStyle(address, cell.style);
  }
}
