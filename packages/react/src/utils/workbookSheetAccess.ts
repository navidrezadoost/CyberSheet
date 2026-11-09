import { Worksheet, type WorkbookSheetView } from '@cyber-sheet/core';

export type SheetAccess = Worksheet | WorkbookSheetView;

const worksheetIsWorkbookOwned = Worksheet.prototype.isWorkbookOwned;

function isWorkbookSheetView(sheet: unknown): sheet is WorkbookSheetView {
  if (!sheet || typeof sheet !== 'object') return false;
  const candidate = sheet as Partial<WorkbookSheetView>;
  return typeof candidate.workbookId === 'string'
    && typeof candidate.worksheetId === 'string'
    && typeof candidate.getCell === 'function'
    && typeof candidate.getCellValue === 'function'
    && typeof candidate.getMergedRangeForCell === 'function';
}

function isOwnedWorksheet(sheet: Worksheet): boolean {
  try {
    // Use the captured Core prototype method, not a potentially shadowed
    // instance property.
    return worksheetIsWorkbookOwned.call(sheet);
  } catch {
    throw new Error('Unable to classify Worksheet ownership for this operation');
  }
}

export function requireClipboardCopySource(sheet: SheetAccess): SheetAccess {
  if (sheet instanceof Worksheet) {
    if (isOwnedWorksheet(sheet)) {
      throw new Error('Workbook-owned Worksheet clipboard access is unavailable until its journal slice is authorized');
    }
    return sheet;
  }
  if (isWorkbookSheetView(sheet)) return sheet;
  throw new Error('Unsupported clipboard source; expected a standalone Worksheet or WorkbookSheetView');
}

export function requireStandaloneWorksheet(sheet: SheetAccess): Worksheet {
  if (!(sheet instanceof Worksheet)) {
    throw new Error('This workbook-owned operation is unavailable until its journal slice is authorized');
  }
  if (isOwnedWorksheet(sheet)) {
    throw new Error('This workbook-owned operation is unavailable until its journal slice is authorized');
  }
  return sheet;
}

export function rejectWorkbookMutation(): never {
  throw new Error('Workbook-owned mutations are unavailable until their journal slice is authorized');
}
