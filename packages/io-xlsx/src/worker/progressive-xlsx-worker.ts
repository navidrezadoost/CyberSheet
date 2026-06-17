import { LightweightXLSXParser } from '../LightweightParser';
import type { ImportOptions } from '../import';
import type { ProgressiveXLSXCell, ProgressiveXLSXChunk } from '../progressive';
import type { XLSXMetadata } from '../LightweightParser';

type StartMessage = {
  type: 'start';
  buffer: ArrayBuffer;
  options?: ImportOptions;
};

const post = (message: unknown, transfer?: Transferable[]) => {
  globalThis.postMessage(message, transfer ?? []);
};

globalThis.addEventListener('message', async (ev: MessageEvent<StartMessage>) => {
  const msg = ev.data;
  if (msg.type !== 'start') return;

  try {
    const options = msg.options ?? {};
    const parser = new LightweightXLSXParser();
    const metadata = await parser.parseMetadata(msg.buffer);
    post({
      type: 'metadata',
      metadata: serializeMetadata(metadata),
    });

    for (let i = 0; i < metadata.sheetNames.length; i++) {
      const sheetName = metadata.sheetNames[i];
      if (!shouldProcessSheet(sheetName, i, options.sheets)) continue;

      const dims = metadata.sheetDimensions.get(sheetName) ?? { rows: 1000, cols: 26 };
      const chunkRows = options.chunkRows ?? 500;

      for (let startRow = 1; startRow <= dims.rows; startRow += chunkRows) {
        const endRow = Math.min(startRow + chunkRows - 1, dims.rows);
        const cells = await parser.parseSheet(i, {
          viewport: {
            startRow,
            endRow,
            startCol: 1,
            endCol: dims.cols,
          },
          includeStyles: options.includeStyles !== false,
          includeFormulas: options.includeFormulas !== false,
          includeComments: options.includeComments === true,
        });

        const chunk: ProgressiveXLSXChunk = {
          sheetName,
          startRow,
          endRow,
          totalRows: dims.rows,
          cells: Array.from(cells, ([ref, cell]) => ({
            ref,
            value: cell.value,
            formula: cell.formula,
            style: cell.style,
          } satisfies ProgressiveXLSXCell)),
        };

        post({ type: 'chunk', chunk });
      }
    }

    post({ type: 'done' });
  } catch (error) {
    post({
      type: 'error',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

function shouldProcessSheet(sheetName: string, sheetIndex: number, sheets: ImportOptions['sheets']): boolean {
  if (!sheets || sheets.length === 0) return true;
  if (typeof sheets[0] === 'string') return (sheets as string[]).includes(sheetName);
  return (sheets as number[]).includes(sheetIndex);
}

function serializeMetadata(metadata: XLSXMetadata) {
  return {
    ...metadata,
    sheetDimensions: Array.from(metadata.sheetDimensions.entries()),
  };
}
