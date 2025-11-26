// @ts-nocheck
import { loadXlsxFromUrl } from '../packages/io-xlsx/src/index';

async function main() {
  const url = process.argv[2];
  if (!url) {
    console.error('Usage: ts-node scripts/verify-load.ts <url>');
    process.exit(1);
  }
  const wb = await loadXlsxFromUrl(url);
  const names = wb.getSheetNames();
  console.log('Sheets:', names);
  const sheet = wb.getSheet(names[0]!);
  if (!sheet) return;
  console.log('A1:', sheet.getCellValue({ row: 1, col: 1 }), sheet.getCellStyle({ row: 1, col: 1 }));
  console.log('B2:', sheet.getCellValue({ row: 2, col: 2 }), sheet.getCellStyle({ row: 2, col: 2 }));
}

main().catch((e) => { console.error(e); process.exit(1); });
