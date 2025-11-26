# @cyber-sheet/io-xlsx

Minimal XLSX loader that fetches and parses .xlsx files into a `Workbook` without heavy dependencies.

API:
- `async loadXlsxFromUrl(url: string, fetchFn?: Fetch): Promise<Workbook>`
- `loadXlsxFromArrayBuffer(data: Uint8Array): Workbook`

Notes:
- Uses `fflate` to unzip XLSX archives
- Parses workbook/sheets, shared strings, limited styles (fonts, fills, number formats) and assigns styles to cells
- Number/date formats coverage is intentionally small and will expand over time
