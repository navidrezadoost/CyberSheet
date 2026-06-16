/**
 * ColumnarCellStore.ts - Phase 8.1 typed-array storage.
 *
 * Hot fields live in per-column buffers:
 *   - value tags: Uint8Array
 *   - numeric/boolean values: Float64Array
 *   - string refs: Uint32Array offset/length pairs into a shared StringPool
 *   - style refs: Uint16Array ids into a StyleTable
 *
 * Cold fields remain sparse. This keeps Worksheet behind ICellStore while
 * removing the per-cell object allocation from number/string-heavy sheets.
 */

import type {
  Address,
  Cell,
  CellComment,
  CellHyperlink,
  CellIcon,
  CellStyle,
  CustomCellComponent,
  ExtendedCellValue,
} from '../types';
import type { ICellStore } from './ICellStore';

const INITIAL_ROWS = 128;
const MAX_STYLE_ID = 0xffff;

const enum ValueTag {
  Empty = 0,
  Number = 1,
  String = 2,
  Boolean = 3,
  Null = 4,
  Cold = 5,
}

type ColdCellFields = {
  value?: ExtendedCellValue;
  comments?: CellComment[];
  icon?: CellIcon;
  customComponent?: CustomCellComponent;
  hyperlink?: CellHyperlink;
  spillSource?: Cell['spillSource'];
  spilledFrom?: Address;
};

class StringPool {
  private chunks: string[] = [''];
  private offsets: number[] = [0];
  private totalLength = 0;

  append(value: string): { offset: number; length: number } {
    if (value.length === 0) return { offset: 0, length: 0 };
    const offset = this.totalLength;
    this.chunks.push(value);
    this.offsets.push(offset);
    this.totalLength += value.length;
    return { offset, length: value.length };
  }

  read(offset: number, length: number): string {
    if (length === 0) return '';
    let lo = 1;
    let hi = this.offsets.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >>> 1;
      const chunkStart = this.offsets[mid]!;
      const chunkEnd = chunkStart + this.chunks[mid]!.length;
      if (offset < chunkStart) hi = mid - 1;
      else if (offset >= chunkEnd) lo = mid + 1;
      else return this.chunks[mid]!.slice(offset - chunkStart, offset - chunkStart + length);
    }
    return '';
  }
}

class StyleTable {
  private styles: Array<CellStyle | undefined> = [undefined];
  private ids = new Map<string, number>();

  idFor(style: CellStyle | undefined): number {
    if (!style) return 0;
    const key = stableStringify(style);
    const existing = this.ids.get(key);
    if (existing !== undefined) return existing;
    if (this.styles.length > MAX_STYLE_ID) {
      throw new RangeError(`ColumnarCellStore style table exceeded ${MAX_STYLE_ID} entries`);
    }
    const id = this.styles.length;
    this.styles.push(style);
    this.ids.set(key, id);
    return id;
  }

  get(id: number): CellStyle | undefined {
    return this.styles[id];
  }
}

class ColumnStore {
  private tags = new Uint8Array(INITIAL_ROWS);
  private numbers = new Float64Array(INITIAL_ROWS);
  private stringRefs = new Uint32Array(INITIAL_ROWS * 2);
  private styleIds = new Uint16Array(INITIAL_ROWS);
  private presentRows = new Set<number>();
  private handles = new Map<number, Cell>();
  readonly formulas = new Map<number, string>();
  readonly cold = new Map<number, ColdCellFields>();

  constructor(
    private readonly pool: StringPool,
    private readonly styles: StyleTable,
    private readonly onPresenceChanged: (delta: 1 | -1) => void,
  ) {}

  get size(): number {
    return this.presentRows.size;
  }

  has(row: number): boolean {
    return this.presentRows.has(row);
  }

  ensure(row: number): Cell {
    this.ensurePresent(row);
    return this.handle(row);
  }

  get(row: number): Cell | undefined {
    return this.has(row) ? this.handle(row) : undefined;
  }

  set(row: number, cell: Cell): void {
    this.ensurePresent(row);
    this.writeWholeCell(row, cell);
  }

  delete(row: number): void {
    if (!this.presentRows.delete(row)) return;
    if (row < this.tags.length) {
      this.tags[row] = ValueTag.Empty;
      this.numbers[row] = 0;
      this.stringRefs[row * 2] = 0;
      this.stringRefs[row * 2 + 1] = 0;
      this.styleIds[row] = 0;
    }
    this.formulas.delete(row);
    this.cold.delete(row);
    this.handles.delete(row);
    this.onPresenceChanged(-1);
  }

  forEach(callback: (row: number, cell: Cell) => void): void {
    for (const row of this.presentRows) callback(row, this.handle(row));
  }

  getValue(row: number): ExtendedCellValue {
    switch (this.tags[row] ?? ValueTag.Empty) {
      case ValueTag.Number:
        return this.numbers[row]!;
      case ValueTag.String:
        return this.pool.read(this.stringRefs[row * 2]!, this.stringRefs[row * 2 + 1]!);
      case ValueTag.Boolean:
        return this.numbers[row] === 1;
      case ValueTag.Null:
      case ValueTag.Empty:
        return null;
      case ValueTag.Cold:
        return this.cold.get(row)?.value ?? null;
    }
    return null;
  }

  setValue(row: number, value: ExtendedCellValue): void {
    this.ensurePresent(row);
    this.ensureCapacity(row);
    if (typeof value === 'number') {
      this.tags[row] = ValueTag.Number;
      this.numbers[row] = value;
      this.clearColdValue(row);
      return;
    }
    if (typeof value === 'string') {
      const ref = this.pool.append(value);
      this.tags[row] = ValueTag.String;
      this.stringRefs[row * 2] = ref.offset;
      this.stringRefs[row * 2 + 1] = ref.length;
      this.clearColdValue(row);
      return;
    }
    if (typeof value === 'boolean') {
      this.tags[row] = ValueTag.Boolean;
      this.numbers[row] = value ? 1 : 0;
      this.clearColdValue(row);
      return;
    }
    if (value === null) {
      this.tags[row] = ValueTag.Null;
      this.clearColdValue(row);
      return;
    }
    this.tags[row] = ValueTag.Cold;
    this.coldFor(row).value = value;
  }

  getStyle(row: number): CellStyle | undefined {
    return this.styles.get(this.styleIds[row] ?? 0);
  }

  setStyle(row: number, style: CellStyle | undefined): void {
    this.ensurePresent(row);
    this.ensureCapacity(row);
    this.styleIds[row] = this.styles.idFor(style);
  }

  private ensurePresent(row: number): void {
    this.ensureCapacity(row);
    if (this.presentRows.has(row)) return;
    this.presentRows.add(row);
    this.tags[row] = ValueTag.Null;
    this.onPresenceChanged(1);
  }

  private ensureCapacity(row: number): void {
    if (row < this.tags.length) return;
    let next = this.tags.length;
    while (next <= row) next *= 2;

    const tags = new Uint8Array(next);
    tags.set(this.tags);
    this.tags = tags;

    const numbers = new Float64Array(next);
    numbers.set(this.numbers);
    this.numbers = numbers;

    const refs = new Uint32Array(next * 2);
    refs.set(this.stringRefs);
    this.stringRefs = refs;

    const styleIds = new Uint16Array(next);
    styleIds.set(this.styleIds);
    this.styleIds = styleIds;
  }

  private coldFor(row: number): ColdCellFields {
    let fields = this.cold.get(row);
    if (!fields) {
      fields = {};
      this.cold.set(row, fields);
    }
    return fields;
  }

  private clearColdValue(row: number): void {
    const fields = this.cold.get(row);
    if (fields) delete fields.value;
  }

  private writeWholeCell(row: number, cell: Cell): void {
    this.setValue(row, cell.value ?? null);
    this.setStyle(row, cell.style);
    this.setFormula(row, cell.formula);
    this.setCold(row, 'comments', cell.comments);
    this.setCold(row, 'icon', cell.icon);
    this.setCold(row, 'customComponent', cell.customComponent);
    this.setCold(row, 'hyperlink', cell.hyperlink);
    this.setCold(row, 'spillSource', cell.spillSource);
    this.setCold(row, 'spilledFrom', cell.spilledFrom);
  }

  private setFormula(row: number, formula: string | undefined): void {
    if (formula === undefined) this.formulas.delete(row);
    else this.formulas.set(row, formula);
  }

  private setCold<K extends keyof ColdCellFields>(row: number, key: K, value: ColdCellFields[K]): void {
    if (value === undefined) {
      const fields = this.cold.get(row);
      if (fields) delete fields[key];
      return;
    }
    this.coldFor(row)[key] = value;
  }

  private handle(row: number): Cell {
    let cached = this.handles.get(row);
    if (cached) return cached;

    const column = this;
    const proxy = new Proxy({}, {
      get(_target, property) {
        switch (property) {
          case 'value': return column.getValue(row);
          case 'formula': return column.formulas.get(row);
          case 'style': return column.getStyle(row);
          case 'comments':
          case 'icon':
          case 'customComponent':
          case 'hyperlink':
          case 'spillSource':
          case 'spilledFrom':
            return column.cold.get(row)?.[property as keyof ColdCellFields];
          default:
            return undefined;
        }
      },
      set(_target, property, value) {
        switch (property) {
          case 'value':
            column.setValue(row, value as ExtendedCellValue);
            return true;
          case 'formula':
            column.ensurePresent(row);
            column.setFormula(row, value as string | undefined);
            return true;
          case 'style':
            column.setStyle(row, value as CellStyle | undefined);
            return true;
          case 'comments':
          case 'icon':
          case 'customComponent':
          case 'hyperlink':
          case 'spillSource':
          case 'spilledFrom':
            column.ensurePresent(row);
            column.setCold(row, property as keyof ColdCellFields, value as never);
            return true;
          default:
            return true;
        }
      },
      deleteProperty(_target, property) {
        if (property === 'formula') {
          column.formulas.delete(row);
          return true;
        }
        if (property === 'style') {
          column.setStyle(row, undefined);
          return true;
        }
        if (
          property === 'comments' ||
          property === 'icon' ||
          property === 'customComponent' ||
          property === 'hyperlink' ||
          property === 'spillSource' ||
          property === 'spilledFrom'
        ) {
          const fields = column.cold.get(row);
          if (fields) delete fields[property as keyof ColdCellFields];
          return true;
        }
        return true;
      },
      ownKeys() {
        return [
          'value',
          'formula',
          'style',
          'comments',
          'icon',
          'customComponent',
          'hyperlink',
          'spillSource',
          'spilledFrom',
        ];
      },
      getOwnPropertyDescriptor(_target, property) {
        if (typeof property !== 'string') return undefined;
        return {
          enumerable: true,
          configurable: true,
          value: (proxy as Record<string, unknown>)[property],
        };
      },
    }) as Cell;

    this.handles.set(row, proxy);
    return proxy;
  }
}

export class ColumnarCellStore implements ICellStore {
  private readonly columns = new Map<number, ColumnStore>();
  private readonly pool = new StringPool();
  private readonly styles = new StyleTable();
  private _size = 0;

  get(row: number, col: number): Cell | undefined {
    return this.columns.get(col)?.get(row);
  }

  set(row: number, col: number, cell: Cell): void {
    this.column(col).set(row, cell);
  }

  getOrCreate(row: number, col: number): Cell {
    return this.column(col).ensure(row);
  }

  has(row: number, col: number): boolean {
    return this.columns.get(col)?.has(row) ?? false;
  }

  delete(row: number, col: number): void {
    const column = this.columns.get(col);
    if (!column) return;
    column.delete(row);
    if (column.size === 0) this.columns.delete(col);
  }

  get size(): number {
    return this._size;
  }

  forEach(callback: (row: number, col: number, cell: Cell) => void): void {
    for (const [col, column] of this.columns) {
      column.forEach((row, cell) => callback(row, col, cell));
    }
  }

  private column(col: number): ColumnStore {
    let column = this.columns.get(col);
    if (!column) {
      column = new ColumnStore(this.pool, this.styles, delta => {
        this._size += delta;
      });
      this.columns.set(col, column);
    }
    return column;
  }
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj).sort().map(key => `${JSON.stringify(key)}:${stableStringify(obj[key])}`).join(',')}}`;
}
