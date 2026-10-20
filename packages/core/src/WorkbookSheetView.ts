import type { Address, Cell } from './types';
import type { Worksheet } from './worksheet';
import type { WorkbookCellRead, WorkbookId, WorkbookSheetView, WorksheetId } from './workbook-access-types';

function detached<T>(value: T): T {
  if (typeof value === 'function') return undefined as T;
  if (value === null || typeof value !== 'object') return value;
  if (value instanceof Date) return new Date(value.getTime()) as T;
  if (Array.isArray(value)) return Object.freeze(value.map(detached)) as T;
  if (value instanceof Map) {
    const entries = Array.from(value, ([key, entry]) => [detached(key), detached(entry)] as const);
    const map = new Map(entries);
    return Object.freeze({
      get size() { return map.size; },
      get: (key: unknown) => map.get(key),
      has: (key: unknown) => map.has(key),
      entries: () => map.entries(),
      keys: () => map.keys(),
      values: () => map.values(),
      forEach: (callback: (entry: unknown, key: unknown, owner: unknown) => void, thisArg?: unknown) =>
        map.forEach((entry, key) => callback.call(thisArg, entry, key, map)),
      [Symbol.iterator]: () => map[Symbol.iterator](),
    }) as T;
  }
  if (value instanceof Set) {
    const set = new Set(Array.from(value, detached));
    return Object.freeze({
      get size() { return set.size; },
      has: (entry: unknown) => set.has(entry),
      entries: () => set.entries(),
      keys: () => set.keys(),
      values: () => set.values(),
      forEach: (callback: (entry: unknown, key: unknown, owner: unknown) => void, thisArg?: unknown) =>
        set.forEach((entry) => callback.call(thisArg, entry, entry, set)),
      [Symbol.iterator]: () => set[Symbol.iterator](),
    }) as T;
  }
  const copy: Record<PropertyKey, unknown> = {};
  for (const key of Reflect.ownKeys(value)) copy[key] = detached((value as Record<PropertyKey, unknown>)[key]);
  return Object.freeze(copy) as T;
}

/** @internal Constructed only by Workbook; every operation resolves the current owner entry. */
export class OwnerBackedWorkbookSheetView implements WorkbookSheetView {
  #resolve: (workbookId: WorkbookId, worksheetId: WorksheetId) => Worksheet | undefined;

  constructor(
    readonly workbookId: WorkbookId,
    readonly worksheetId: WorksheetId,
    resolve: (workbookId: WorkbookId, worksheetId: WorksheetId) => Worksheet | undefined,
  ) { this.#resolve = resolve; Object.freeze(this); }

  private sheet(): Worksheet {
    const sheet = this.#resolve(this.workbookId, this.worksheetId);
    if (!sheet) throw new Error('Workbook sheet view is no longer available');
    return sheet;
  }

  private assertNoFormulaValuesInFilters(excludeColumn?: number, range?: import('./types').Range): void {
    const sheet = this.sheet();
    const filters = sheet.getAllFilters();
    if (filters.size === 0) return;
    const formulaColumns = new Set(
      sheet.getFormulaAddresses()
        .filter((address) =>
          (excludeColumn === undefined || address.col !== excludeColumn) &&
          (!range || (address.row >= range.start.row && address.row <= range.end.row)),
        )
        .map((address) => address.col),
    );
    if ([...filters.keys()].some((column) => formulaColumns.has(column) && column !== excludeColumn)) {
      throw new Error('Workbook-owned filtered-row query is unavailable when a filter depends on formula cached values');
    }
  }

  get name(): string { return this.sheet().name; }
  get rowCount(): number { return this.sheet().rowCount; }
  get colCount(): number { return this.sheet().colCount; }
  getCell(address: Address) {
    const cell = detached(this.sheet().getCell(address));
    return cell?.formula ? Object.freeze({ ...cell, value: null }) : cell;
  }
  getCellComponent(address: Address) { return detached(this.sheet().getCellComponent(address)); }
  getAllCellComponents() { return detached(this.sheet().getAllCellComponents()); }
  getCellValue(address: Address): Cell['value'] {
    const cell = this.sheet().getCell(address);
    return cell?.formula ? null : detached(cell?.value ?? null);
  }
  getCellRead(address: Address): WorkbookCellRead {
    const cell = this.getCell(address);
    return Object.freeze({
      address: detached(address),
      cell,
      value: detached(cell?.value ?? null),
      formula: cell?.formula,
      formulaResultStatus: 'unavailable' as const,
    });
  }
  getUsedRange() { return detached(this.sheet().getUsedRange()); }
  getContiguousRange(address: Address) { return detached(this.sheet().getContiguousRange(address)); }
  getCellStyle(address: Address) { return detached(this.sheet().getCellStyle(address)); }
  getColumnWidth(column: number) { return this.sheet().getColumnWidth(column); }
  getRowHeight(row: number) { return this.sheet().getRowHeight(row); }
  getConditionalFormattingRules() { return detached(this.sheet().getConditionalFormattingRules()); }
  on(listener: (event: import('./types').SheetEvents) => void): ReturnType<Worksheet['on']> {
    return this.sheet().on((event) => listener(detached(event)));
  }
  getRowStyle(row: number) { return detached(this.sheet().getRowStyle(row)); }
  getColumnStyle(column: number) { return detached(this.sheet().getColumnStyle(column)); }
  getComments(address: Address) { return detached(this.sheet().getComments(address)); }
  getMergedRanges() { return detached(this.sheet().getMergedRanges()); }
  getMergedRangeForCell(address: Address) { return detached(this.sheet().getMergedRangeForCell(address)); }
  getFreezePanes() { return detached(this.sheet().getFreezePanes()); }
  getSheetProtection() { return detached(this.sheet().getSheetProtection()); }
  getHyperlink(address: Address) { return detached(this.sheet().getHyperlink(address)); }
  getNextCommentCell(from: Address, direction: 'next' | 'prev' = 'next') { return detached(this.sheet().getNextCommentCell(from, direction)); }
  getAllComments() { return detached(this.sheet().getAllComments()); }
  getAutoFilterRange() { return detached(this.sheet().getAutoFilterRange()); }
  getColumnFilter(column: number) { return detached(this.sheet().getColumnFilter(column)); }
  getHeaderFooter() { return detached(this.sheet().getHeaderFooter()); }
  getImages() { return detached(this.sheet().getImages()); }
  getFormulaAddresses() { return detached(this.sheet().getFormulaAddresses()); }
  findAll(options: import('./types/search-types').SearchOptions, range?: import('./types/search-types').SearchRange) {
    const lookIn = options.lookIn ?? 'values';
    if (options.what !== '' && lookIn === 'values') {
      const formulas = this.getFormulaAddresses();
      if (formulas.some((address) => !range || (
        address.row >= range.start.row && address.row <= range.end.row &&
        address.col >= range.start.col && address.col <= range.end.col
      ))) {
        throw new Error('Workbook-owned value search is unavailable when formula cached values could affect matches');
      }
    }
    return detached(this.sheet().findAll(options, range));
  }
  getVisibleRowIndices(range?: import('./types').Range) {
    this.assertNoFormulaValuesInFilters(undefined, range);
    return detached(this.sheet().getVisibleRowIndices(range));
  }
  getVisibleRowIndicesExcluding(columnToExclude: number) {
    this.assertNoFormulaValuesInFilters(columnToExclude);
    return detached(this.sheet().getVisibleRowIndicesExcluding(columnToExclude));
  }
  getVisibleColumnIndices(range?: import('./types').Range) { return detached(this.sheet().getVisibleColumnIndices(range)); }
  isRowHidden(row: number) { return this.sheet().isRowHidden(row); }
  isRowLoaded(row: number) { return this.sheet().isRowLoaded(row); }
  isColHidden(col: number) { return this.sheet().isColHidden(col); }
  isCellHidden(address: Address) { return this.sheet().isCellHidden(address); }
  forEachNonEmptyCell(callback: (row: number, col: number, cell: Readonly<Cell>) => void): void {
    this.sheet().forEachNonEmptyCell((row, col, cell) => callback(row, col, this.getCell({ row, col }) ?? detached(cell)));
  }
  getWorksheetId(): string { return this.worksheetId; }
}
