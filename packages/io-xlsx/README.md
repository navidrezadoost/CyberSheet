# @cyber-sheet/io-xlsx

XLSX import and export helpers for Cyber Sheet.

API:
- `async loadXlsxFromUrl(url: string, fetchFn?: Fetch): Promise<Workbook>`
- `loadXlsxFromArrayBuffer(data: Uint8Array): Workbook`
- `previewXLSX(buffer: ArrayBuffer)`
- `streamXLSX(buffer: ArrayBuffer, options?: ImportOptions)`
- `exportXLSX(workbook)`

Notes:
- **Import is currently disabled:** all untrusted ZIP/XLSX parsing entry points fail with `XlsxImportUnavailableError` (`code: XLSX_IMPORT_UNAVAILABLE`) until bounded decompression is implemented and reviewed. This includes preview, streaming, direct parser, progressive, URL, and Workbook restore APIs.
- XLSX export remains available and uses a deterministic, store-only ZIP32 writer for generated OOXML. XLSX import, preview, streaming, and progressive restore remain fail-closed until a separately qualified bounded reader is authorized.
- Parses workbook/sheets, shared strings, limited styles (fonts, fills, number formats) and assigns styles to cells
- Number/date formats coverage is intentionally small and will expand over time
