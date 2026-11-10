import type { Workbook } from '@cyber-sheet/core';
import { XlsxImportUnavailableError } from './XlsxImportUnavailableError';

export { XlsxImportUnavailableError } from './XlsxImportUnavailableError';

// Keep the package's existing public exports. The import implementations stay
// unavailable until every ZIP reader has a reviewed resource-budget contract.
export * from './import';
export * from './LightweightParser';
export * from './CommentParser';
export * from './export';
export * from './progressive';

type FetchLike = (input: RequestInfo, init?: RequestInit) => Promise<Response>;

export async function loadXlsxFromUrl(url: string, fetchFn?: FetchLike): Promise<Workbook> {
  void url;
  void fetchFn;
  throw new XlsxImportUnavailableError('XLSX import is unavailable until R6 staged restore is authorized');
}

export function loadXlsxFromArrayBuffer(data: Uint8Array): Workbook {
  void data;
  throw new XlsxImportUnavailableError('XLSX import is unavailable until R6 staged restore is authorized');
}
