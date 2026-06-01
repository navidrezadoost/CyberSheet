import type { Address } from '@cyber-sheet/core';

/** Parse an A1-style reference (e.g. `$A$1`, `B5`) to a 1-based Address. */
export function parseA1Reference(ref: string): Address | null {
  const match = ref.replace(/\$/g, '').trim().match(/^([A-Za-z]+)(\d+)$/);
  if (!match) return null;

  const letters = match[1].toUpperCase();
  const row = parseInt(match[2], 10);
  if (!Number.isFinite(row) || row < 1) return null;

  let col = 0;
  for (let i = 0; i < letters.length; i++) {
    const code = letters.charCodeAt(i) - 64;
    if (code < 1 || code > 26) return null;
    col = col * 26 + code;
  }

  return { row, col };
}

/** Format a 1-based Address as an A1 reference (e.g. `{ row: 1, col: 1 }` → `A1`). */
export function formatAddressA1(address: Address): string {
  let letters = '';
  let value = address.col;
  while (value > 0) {
    const remainder = (value - 1) % 26;
    letters = String.fromCharCode(65 + remainder) + letters;
    value = Math.floor((value - 1) / 26);
  }
  return `${letters}${address.row}`;
}
