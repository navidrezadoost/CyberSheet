import type { Address, Cell } from './types';
import type { SheetEvents } from './types';

declare const workbookIdBrand: unique symbol;
declare const worksheetIdBrand: unique symbol;

export type WorkbookId = string & { readonly [workbookIdBrand]: true };
export type WorksheetId = string & { readonly [worksheetIdBrand]: true };

/** Detached, deeply readonly cell data returned by an owner-backed sheet view. */
export type ReadonlyCellSnapshot = Readonly<Cell>;

export interface WorkbookCellRead {
  readonly address: Address;
  readonly cell: ReadonlyCellSnapshot | undefined;
  readonly value: Cell['value'];
  readonly formula: string | undefined;
  readonly formulaResultStatus: 'pending' | 'unavailable';
}

/**
 * Typed workbook mutation boundary for caller migration. R1 exposes the shape
 * but every operation rejects before writing; journal-backed availability is
 * introduced only by the separately authorized R2 slice.
 */
export interface WorkbookMutationPort {
  setCellValue(sheet: WorksheetId | WorkbookSheetView, address: Address, value: Cell['value']): never;
  setCellFormula(sheet: WorksheetId | WorkbookSheetView, address: Address, formula: string): never;
  clearCellContent(sheet: WorksheetId | WorkbookSheetView, address: Address): never;
  clearCellFormula(sheet: WorksheetId | WorkbookSheetView, address: Address): never;
  setCellStyle(sheet: WorksheetId | WorkbookSheetView, address: Address, style: import('./types').CellStyle | undefined): never;
}

export interface WorkbookSheetView {
  readonly workbookId: WorkbookId;
  readonly worksheetId: WorksheetId;
  readonly name: string;
  readonly rowCount: number;
  readonly colCount: number;
  getCell(address: Address): ReadonlyCellSnapshot | undefined;
  getCellComponent(address: Address): ReturnType<import('./worksheet').Worksheet['getCellComponent']>;
  getAllCellComponents(): ReturnType<import('./worksheet').Worksheet['getAllCellComponents']>;
  getCellRead(address: Address): WorkbookCellRead;
  getCellValue(address: Address): Cell['value'];
  getUsedRange(): ReturnType<import('./worksheet').Worksheet['getUsedRange']>;
  getContiguousRange(address: Address): ReturnType<import('./worksheet').Worksheet['getContiguousRange']>;
  getCellStyle(address: Address): ReturnType<import('./worksheet').Worksheet['getCellStyle']>;
  getColumnWidth(column: number): number;
  getRowHeight(row: number): number;
  getConditionalFormattingRules(): ReturnType<import('./worksheet').Worksheet['getConditionalFormattingRules']>;
  on(listener: (event: SheetEvents) => void): ReturnType<import('./worksheet').Worksheet['on']>;
  getRowStyle(row: number): ReturnType<import('./worksheet').Worksheet['getRowStyle']>;
  getColumnStyle(column: number): ReturnType<import('./worksheet').Worksheet['getColumnStyle']>;
  getComments(address: Address): ReturnType<import('./worksheet').Worksheet['getComments']>;
  getMergedRanges(): ReturnType<import('./worksheet').Worksheet['getMergedRanges']>;
  getMergedRangeForCell(address: Address): ReturnType<import('./worksheet').Worksheet['getMergedRangeForCell']>;
  getFreezePanes(): ReturnType<import('./worksheet').Worksheet['getFreezePanes']>;
  getSheetProtection(): ReturnType<import('./worksheet').Worksheet['getSheetProtection']>;
  getHyperlink(address: Address): ReturnType<import('./worksheet').Worksheet['getHyperlink']>;
  getNextCommentCell(from: Address, direction?: 'next' | 'prev'): Address | null;
  getAllComments(): ReturnType<import('./worksheet').Worksheet['getAllComments']>;
  getAutoFilterRange(): ReturnType<import('./worksheet').Worksheet['getAutoFilterRange']>;
  getColumnFilter(column: number): ReturnType<import('./worksheet').Worksheet['getColumnFilter']>;
  getHeaderFooter(): ReturnType<import('./worksheet').Worksheet['getHeaderFooter']>;
  getImages(): ReturnType<import('./worksheet').Worksheet['getImages']>;
  getFormulaAddresses(): Address[];
  findAll(options: import('./types/search-types').SearchOptions, range?: import('./types/search-types').SearchRange): Address[];
  getVisibleRowIndices(range?: import('./types').Range): number[];
  getVisibleRowIndicesExcluding(columnToExclude: number): number[];
  getVisibleColumnIndices(range?: import('./types').Range): number[];
  isRowHidden(row: number): boolean;
  isRowLoaded(row: number): boolean;
  isColHidden(col: number): boolean;
  isCellHidden(address: Address): boolean;
  forEachNonEmptyCell(callback: (row: number, col: number, cell: ReadonlyCellSnapshot) => void): void;
  getWorksheetId(): string;
}
