export function formatNumber(value: number, fmt?: string): string {
  if (!fmt || fmt === 'General') return String(value);
  // Multi-section formats separated by ';' => positive;negative;zero;text
  const sections = fmt.split(';');
  let section = sections[0];
  if (value < 0 && sections[1]) section = sections[1];
  if (value === 0 && sections[2]) section = sections[2];
  // Currency symbol detection
  const currencyMatch = section.match(/[¥$€£]/);
  const currency = currencyMatch ? currencyMatch[0] : '';
  const isPercent = section.includes('%');
  let v = value;
  if (isPercent) v = v * 100;
  v = currency ? Math.abs(v) : v; // negative may be handled via section pattern like (..)
  // decimals count
  const decimalPart = (section.split('.')[1] || '').replace(/[^0#]/g, '').replace('%', '');
  const decimals = decimalPart.length;
  const rounded = v.toFixed(decimals || 0);
  const [intPartRaw, fracPart] = rounded.split('.');
  // grouping
  const intPartFmt = section.split('.')[0];
  const useGrouping = /#,##0|#,#|0,0/.test(intPartFmt);
  const intPart = useGrouping ? intPartRaw.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : intPartRaw;
  let out = (currency ? currency : '') + intPart + (fracPart ? '.' + fracPart : '') + (isPercent ? '%' : '');
  // negative in parentheses
  if (value < 0 && /\(.*\)/.test(section)) {
    out = '(' + out + ')';
  } else if (value < 0 && !currency && !section.includes('-')) {
    out = '-' + out;
  }
  // Color sections like [Red] are ignored for now
  return out;
}

export function formatValue(value: any, fmt?: string): string {
  if (value == null || value === '') return '';
  if (typeof value === 'number') {
    if (isDateFormat(fmt)) {
      const d = excelSerialToDate(value);
      return formatDate(d, fmt || 'm/d/yy');
    }
    return formatNumber(value, fmt);
  }
  // TODO: date formats in phase 2
  return String(value);
}

function isDateFormat(fmt?: string): boolean {
  if (!fmt) return false;
  const f = fmt.toLowerCase();
  return /[dyhms]/.test(f) && !f.includes('[h]'); // simple heuristic; expand later
}

function excelSerialToDate(serial: number): Date {
  // Excel 1900 date system; serial 1 = 1899-12-31; Excel wrongly treats 1900 as leap year
  const wholeDays = Math.floor(serial);
  const frac = serial - wholeDays;
  // Adjust for the 1900 leap year bug: serial >= 60 are shifted by 1 day
  const dayAdjust = wholeDays > 59 ? -1 : 0;
  const epoch = new Date(Date.UTC(1899, 11, 31)); // 1899-12-31
  const ms = (wholeDays + dayAdjust) * 86400000 + Math.round(frac * 86400000);
  return new Date(epoch.getTime() + ms);
}

function pad(n: number, len = 2): string { return String(n).padStart(len, '0'); }

function formatDate(d: Date, fmt: string): string {
  // Minimal token support: m, mm, d, dd, yy, yyyy, h, hh, mm, ss, AM/PM
  const parts: Record<string, string> = {
    yyyy: String(d.getUTCFullYear()),
    yy: pad(d.getUTCFullYear() % 100, 2),
    mm: pad(d.getUTCMonth() + 1, 2),
    m: String(d.getUTCMonth() + 1),
    dd: pad(d.getUTCDate(), 2),
    d: String(d.getUTCDate()),
    hh: pad(hour12(d.getUTCHours()), 2),
    h: String(hour12(d.getUTCHours())),
    MM: pad(d.getUTCMinutes(), 2), // use MM for minutes to avoid clash; remap below
    M: String(d.getUTCMinutes()),
    ss: pad(d.getUTCSeconds(), 2),
    s: String(d.getUTCSeconds()),
  };
  // Map Excel-like tokens to our keys; handle case-insensitively
  let out = fmt;
  // Replace AM/PM later if needed
  out = out.replace(/yyyy/gi, parts.yyyy)
           .replace(/yy/gi, parts.yy)
           .replace(/dd/gi, parts.dd)
           .replace(/d(?![a-zA-Z])/gi, parts.d);
  // Handle month (Excel uses m for month, but avoid replacing minutes first)
  out = out.replace(/mm/gi, parts.mm).replace(/\bm\b/gi, parts.m);
  // Minutes: replace ':m' with minutes; crude but avoids conflict
  out = out.replace(/:mm/gi, ':' + parts.MM).replace(/:m/gi, ':' + parts.M);
  // Hours and seconds
  out = out.replace(/hh/gi, parts.hh).replace(/\bh\b/gi, parts.h);
  out = out.replace(/ss/gi, parts.ss).replace(/\bs\b/gi, parts.s);
  // AM/PM
  if (/am\/pm/i.test(fmt)) {
    out = out.replace(/am\/pm/i, d.getUTCHours() >= 12 ? 'PM' : 'AM');
  }
  // Strip remaining brackets/escapes minimally
  out = out.replace(/\[.*?\]/g, '');
  return out;
}

function hour12(h: number): number { const v = h % 12; return v === 0 ? 12 : v; }
