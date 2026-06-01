import type { Worksheet } from '@cyber-sheet/core';

/** Default 1 inch at 96 DPI (Excel default single-click insert size). */
export const DEFAULT_INSERT_OBJECT_SIZE_PX = 96;

const MIN_DRAG_SIZE_PX = 5;

export function snapSheetAxis(
  value: number,
  axis: 'x' | 'y',
  sheet: Worksheet | undefined,
  snap: boolean,
): number {
  if (!snap || !sheet) return value;

  if (axis === 'x') {
    let offset = 0;
    for (let col = 1; col <= sheet.colCount; col++) {
      const width = sheet.getColumnWidth(col);
      const next = offset + width;
      if (value <= offset + width / 2) return offset;
      if (value <= next) return next;
      offset = next;
    }
    return offset;
  }

  let offset = 0;
  for (let row = 1; row <= sheet.rowCount; row++) {
    const height = sheet.getRowHeight(row);
    const next = offset + height;
    if (value <= offset + height / 2) return offset;
    if (value <= next) return next;
    offset = next;
  }
  return offset;
}

export function snapSheetPoint(
  x: number,
  y: number,
  sheet: Worksheet | undefined,
  snap: boolean,
): { x: number; y: number } {
  return {
    x: snapSheetAxis(x, 'x', sheet, snap),
    y: snapSheetAxis(y, 'y', sheet, snap),
  };
}

export function normalizeInsertRect(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): { x: number; y: number; width: number; height: number } {
  let width = Math.abs(x2 - x1);
  let height = Math.abs(y2 - y1);
  let x = Math.min(x1, x2);
  let y = Math.min(y1, y2);

  if (width < MIN_DRAG_SIZE_PX && height < MIN_DRAG_SIZE_PX) {
    width = DEFAULT_INSERT_OBJECT_SIZE_PX;
    height = DEFAULT_INSERT_OBJECT_SIZE_PX;
    x = x1 - width / 2;
    y = y1 - height / 2;
  }

  return {
    x: Math.max(0, x),
    y: Math.max(0, y),
    width: Math.max(MIN_DRAG_SIZE_PX, width),
    height: Math.max(MIN_DRAG_SIZE_PX, height),
  };
}

export function clientToSheetPoint(
  clientX: number,
  clientY: number,
  canvasRect: DOMRect,
  zoom: number,
  scrollLeft: number,
  scrollTop: number,
): { x: number; y: number } {
  const mx = clientX - canvasRect.left;
  const my = clientY - canvasRect.top;
  return {
    x: mx / zoom + scrollLeft,
    y: my / zoom + scrollTop,
  };
}
