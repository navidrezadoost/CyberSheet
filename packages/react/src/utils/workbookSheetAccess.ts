import type { WorkbookSheetView, Worksheet } from '@cyber-sheet/core';

export type SheetAccess = Worksheet | WorkbookSheetView;

export function requireStandaloneWorksheet(sheet: SheetAccess): Worksheet {
  if ('workbookId' in sheet) {
    throw new Error('This workbook-owned operation is unavailable until its journal slice is authorized');
  }
  return sheet;
}

export function rejectWorkbookMutation(): never {
  throw new Error('Workbook-owned mutations are unavailable until their journal slice is authorized');
}
