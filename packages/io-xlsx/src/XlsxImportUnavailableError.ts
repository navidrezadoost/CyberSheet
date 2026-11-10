/** Stable failure for XLSX import paths disabled pending bounded ZIP extraction. */
export class XlsxImportUnavailableError extends Error {
  readonly code = 'XLSX_IMPORT_UNAVAILABLE';

  constructor(message = 'XLSX import is unavailable until bounded ZIP decompression is authorized') {
    super(message);
    this.name = 'XlsxImportUnavailableError';
  }
}
