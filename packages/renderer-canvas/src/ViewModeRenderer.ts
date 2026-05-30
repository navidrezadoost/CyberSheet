export type ViewMode = 'normal' | 'pageBreak' | 'pageLayout';

export interface PageMetrics {
  paperWidthPx: number;
  paperHeightPx: number;
  contentWidthPx: number;
  contentHeightPx: number;
  marginLeftPx: number;
  marginRightPx: number;
  marginTopPx: number;
  marginBottomPx: number;
  headerPx: number;
  footerPx: number;
}

const DEFAULT_MARGINS = { top: 0.75, right: 0.7, bottom: 0.75, left: 0.7, header: 0.3, footer: 0.3 };

export function getDefaultPageMetrics(zoom: number): PageMetrics {
  const px = (inches: number) => inches * 96 * zoom;
  const marginLeftPx = px(DEFAULT_MARGINS.left);
  const marginRightPx = px(DEFAULT_MARGINS.right);
  const marginTopPx = px(DEFAULT_MARGINS.top);
  const marginBottomPx = px(DEFAULT_MARGINS.bottom);
  const headerPx = px(DEFAULT_MARGINS.header);
  const footerPx = px(DEFAULT_MARGINS.footer);
  const paperWidthPx = px(8.5);
  const paperHeightPx = px(11);

  return {
    paperWidthPx,
    paperHeightPx,
    marginLeftPx,
    marginRightPx,
    marginTopPx,
    marginBottomPx,
    headerPx,
    footerPx,
    contentWidthPx: paperWidthPx - marginLeftPx - marginRightPx,
    contentHeightPx: paperHeightPx - marginTopPx - marginBottomPx - headerPx - footerPx,
  };
}

export function computeRowPageBreaks(
  rows: number[],
  getRowHeight: (row: number) => number,
  contentHeightPx: number,
): number[] {
  if (contentHeightPx <= 0 || rows.length === 0) return [];

  const breaks: number[] = [];
  let accumulated = 0;

  for (const row of rows) {
    const height = getRowHeight(row);
    if (accumulated > 0 && accumulated + height > contentHeightPx) {
      breaks.push(row - 1);
      accumulated = height;
    } else {
      accumulated += height;
    }
  }

  return breaks.filter((row) => row >= rows[0]);
}

export function computeColPageBreaks(
  colCount: number,
  getColWidth: (col: number) => number,
  contentWidthPx: number,
): number[] {
  if (contentWidthPx <= 0 || colCount <= 0) return [];

  const breaks: number[] = [];
  let accumulated = 0;

  for (let col = 1; col <= colCount; col++) {
    const width = getColWidth(col);
    if (accumulated > 0 && accumulated + width > contentWidthPx) {
      breaks.push(col - 1);
      accumulated = width;
    } else {
      accumulated += width;
    }
  }

  return breaks;
}
