/**
 * Header & footer text model and placeholder expansion (&[Page], &[Date], etc.)
 */

export interface HeaderFooterSection {
  left: string;
  center: string;
  right: string;
}

export interface HeaderFooterSettings {
  header: HeaderFooterSection;
  footer: HeaderFooterSection;
}

export const DEFAULT_HEADER_FOOTER: HeaderFooterSettings = {
  header: { left: '', center: '', right: '' },
  footer: { left: '', center: '', right: '' },
};

export interface HeaderFooterExpandContext {
  page?: number;
  pages?: number;
  sheetName?: string;
  fileName?: string;
  date?: Date;
}

export function cloneHeaderFooterSettings(settings: HeaderFooterSettings): HeaderFooterSettings {
  return {
    header: { ...settings.header },
    footer: { ...settings.footer },
  };
}

export function sectionHasContent(section: HeaderFooterSection): boolean {
  return Boolean(section.left.trim() || section.center.trim() || section.right.trim());
}

export function expandHeaderFooterText(
  text: string,
  ctx: HeaderFooterExpandContext = {},
): string {
  if (!text) return '';
  const now = ctx.date ?? new Date();
  return text
    .replace(/&\[Page\]/gi, String(ctx.page ?? 1))
    .replace(/&\[Pages\]/gi, String(ctx.pages ?? 1))
    .replace(/&\[Date\]/gi, now.toLocaleDateString())
    .replace(/&\[Time\]/gi, now.toLocaleTimeString())
    .replace(/&\[File\]/gi, ctx.fileName ?? 'Workbook')
    .replace(/&\[Tab\]/gi, ctx.sheetName ?? 'Sheet1');
}

export const HEADER_FOOTER_INSERT_CODES = [
  { label: 'Page Number', code: '&[Page]' },
  { label: 'Total Pages', code: '&[Pages]' },
  { label: 'Date', code: '&[Date]' },
  { label: 'Time', code: '&[Time]' },
  { label: 'File Name', code: '&[File]' },
  { label: 'Sheet Name', code: '&[Tab]' },
] as const;
