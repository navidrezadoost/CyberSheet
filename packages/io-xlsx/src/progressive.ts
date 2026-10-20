import { DEFAULT_WORKSHEET_COLS, DEFAULT_WORKSHEET_ROWS, Workbook, type CellStyle, type CellValue } from '@cyber-sheet/core';
import { streamXLSX, type ImportOptions } from './import';
import type { XLSXMetadata } from './LightweightParser';

export type ProgressiveXLSXCell = {
  ref: string;
  value: CellValue;
  formula?: string;
  style?: CellStyle;
};

export type ProgressiveXLSXChunk = {
  sheetName: string;
  startRow: number;
  endRow: number;
  totalRows: number;
  cells: ProgressiveXLSXCell[];
};

type WorkerMessage =
  | { type: 'metadata'; metadata: SerializedMetadata }
  | { type: 'chunk'; chunk: ProgressiveXLSXChunk }
  | { type: 'done' }
  | { type: 'error'; error: string };

type SerializedMetadata = {
  sheetNames: string[];
  sheetDimensions: Array<[string, { rows: number; cols: number }]>;
  styleCount: number;
  sharedStringCount: number;
  fileSize: number;
};

export type ProgressiveXLSXOptions = ImportOptions & {
  chunkRows?: number;
  workerFactory?: () => Worker;
  onChunk?: (chunk: ProgressiveXLSXChunk) => void;
  onProgress?: (progress: { sheetName: string; loadedRows: number; totalRows: number; done: boolean }) => void;
};

export type ProgressiveXLSXSession = {
  workbook: Workbook;
  metadata: XLSXMetadata;
  done: Promise<void>;
  cancel: () => void;
};

function sheetDisplayDimensions(rows: number, cols: number): { rows: number; cols: number } {
  return {
    rows: Math.max(DEFAULT_WORKSHEET_ROWS, rows),
    cols: Math.max(DEFAULT_WORKSHEET_COLS, cols),
  };
}

export async function loadXlsxProgressivelyFromArrayBuffer(
  _buffer: ArrayBuffer | Uint8Array,
  _options: ProgressiveXLSXOptions = {},
): Promise<ProgressiveXLSXSession> {
  throw new Error('Progressive XLSX restore is unavailable until R6 staged restore is authorized');
}

function mapStreamChunk(chunk: { sheetName: string; cells: Map<string, { value: CellValue; style?: CellStyle; formula?: string }>; progress: { row: number; total: number } }, chunkRows: number): ProgressiveXLSXChunk {
  const cells = Array.from(chunk.cells, ([ref, cell]) => ({ ref, ...cell }));
  const endRow = chunk.progress.row;
  const startRow = Math.max(1, endRow - chunkRows + 1);
  return { sheetName: chunk.sheetName, startRow, endRow, totalRows: chunk.progress.total, cells };
}

function deserializeMetadata(metadata: SerializedMetadata): XLSXMetadata {
  return {
    ...metadata,
    sheetDimensions: new Map(metadata.sheetDimensions),
  };
}

function emptyMetadata(fileSize: number): XLSXMetadata {
  return {
    sheetNames: [],
    sheetDimensions: new Map(),
    styleCount: 0,
    sharedStringCount: 0,
    fileSize,
  };
}

function a1ToAddress(ref: string): { row: number; col: number } | null {
  const match = ref.match(/^([A-Z]+)(\d+)$/);
  if (!match) return null;
  let col = 0;
  for (let i = 0; i < match[1].length; i++) {
    col = col * 26 + (match[1].charCodeAt(i) - 64);
  }
  return { row: Number(match[2]), col };
}

function maxChunkCol(cells: Map<string, unknown>): number {
  return maxCellCol(Array.from(cells.keys()).map(ref => ({ ref })));
}

function maxCellCol(cells: Array<{ ref: string }>): number {
  let max = 1;
  for (const cell of cells) {
    max = Math.max(max, a1ToAddress(cell.ref)?.col ?? 1);
  }
  return max;
}
