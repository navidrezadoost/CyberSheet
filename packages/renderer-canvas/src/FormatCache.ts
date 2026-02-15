import { formatValue as formatValueSpec, hasFormatSpec } from '@cyber-sheet/core';

export type Align = 'left' | 'right' | 'center';

type NumKey = string; // serialized NumberFormat options
type DateKey = string; // serialized DateTimeFormat options

export type FormatResult = {
  text: string;
  color?: string; // CSS color if format specifies [Red] etc
};

export class FormatCache {
  private locale: string;
  private numCache = new Map<NumKey, Intl.NumberFormat>();
  private dateCache = new Map<DateKey, Intl.DateTimeFormat>();
  private alignCache = new Map<string, Align>();
  private scaleCache = new Map<string, number>();

  constructor(locale?: string) {
    this.locale = locale || (typeof navigator !== 'undefined' ? navigator.language : 'en-US');
  }

  // Public API
  formatValue(value: any, fmt?: string): FormatResult {
    if (value == null || value === '') return { text: '' };
    if (typeof value === 'number') {
      // Try spec-based formatter first (16 registered formats)
      if (fmt && hasFormatSpec(fmt)) {
        return { text: formatValueSpec(value, fmt), color: this.extractColor(fmt, value) };
      }
      
      // Fall back to runtime interpreter for unregistered formats
      // Check for duration format [h]:mm:ss or [m]:ss etc
      if (fmt && this.isDurationFormat(fmt)) {
        return { text: this.formatDuration(value, fmt), color: this.extractColor(fmt) };
      }
      if (fmt && this.isDateFormat(fmt)) {
        const d = excelSerialToDate(value);
        return { text: this.formatDate(d, fmt), color: this.extractColor(fmt) };
      }
      return { text: this.formatNumber(value, fmt), color: this.extractColor(fmt, value) };
    }
    return { text: String(value) };
  }

  clearCache() {
    this.numCache.clear();
    this.dateCache.clear();
    this.alignCache.clear();
    this.scaleCache.clear();
  }

  setLocale(locale: string) {
    this.locale = locale;
    this.clearCache();
  }

  preferredAlign(value: any, fmt?: string): Align {
    const key = typeof value + '|' + (fmt || '');
    const cached = this.alignCache.get(key);
    if (cached) return cached;
    let align: Align = 'left';
    if (typeof value === 'number') {
      align = 'right';
      if (fmt && this.isDateFormat(fmt)) align = 'right';
    }
    this.alignCache.set(key, align);
    return align;
  }

  getTextScale(font: string, text: string, maxWidth: number, measuredWidth: number): number {
    if (maxWidth <= 0 || measuredWidth <= 0) return 1;
    const key = `${font}|${text}|${Math.round(maxWidth)}`;
    const cached = this.scaleCache.get(key);
    if (cached !== undefined) return cached;
    const scale = measuredWidth > maxWidth ? Math.max(0.5, maxWidth / measuredWidth) : 1; // cap scaling to 50%
    this.scaleCache.set(key, scale);
    return scale;
  }

  // Internals
  private extractColor(fmt?: string, value?: number): string | undefined {
    if (!fmt) return undefined;
    // Multi-section formats: positive;negative;zero;text
    const sections = fmt.split(';');
    let section = sections[0];
    if (value !== undefined) {
      if (value < 0 && sections[1]) section = sections[1];
      if (value === 0 && sections[2]) section = sections[2];
    }
    // Extract [Color] from section
    const colorMatch = section.match(/\[(Red|Green|Blue|Yellow|Cyan|Magenta|White|Black)\]/i);
    if (!colorMatch) return undefined;
    const colorName = colorMatch[1].toLowerCase();
    const colorMap: Record<string, string> = {
      red: '#FF0000',
      green: '#00FF00',
      blue: '#0000FF',
      yellow: '#FFFF00',
      cyan: '#00FFFF',
      magenta: '#FF00FF',
      white: '#FFFFFF',
      black: '#000000',
    };
    return colorMap[colorName];
  }

  private isDurationFormat(fmt: string): boolean {
    // Excel duration formats use [h] [m] [s] to indicate elapsed time
    return /\[h\]|\[m\]|\[s\]/i.test(fmt);
  }

  private formatDuration(serial: number, fmt: string): string {
    // Excel stores durations as fractional days; convert to total hours/minutes/seconds
    const totalSeconds = Math.round(serial * 86400);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    // Simple token replacement for [h]:mm:ss or [m]:ss or [s]
    let out = fmt.toLowerCase();
    if (/\[h\]/.test(out)) {
      out = out.replace(/\[h\]/i, String(hours));
      out = out.replace(/mm/gi, pad(minutes, 2));
      out = out.replace(/ss/gi, pad(seconds, 2));
    } else if (/\[m\]/.test(out)) {
      const totalMinutes = Math.floor(totalSeconds / 60);
      out = out.replace(/\[m\]/i, String(totalMinutes));
      out = out.replace(/ss/gi, pad(seconds, 2));
    } else if (/\[s\]/.test(out)) {
      out = out.replace(/\[s\]/i, String(totalSeconds));
    }
    // Strip color sections
    out = out.replace(/\[[a-z]+\]/gi, '');
    return out;
  }

  private formatNumber(value: number, fmt?: string): string {
    // Parse currency, percent, grouping, fraction digits from fmt
    let f = (fmt || '').toLowerCase();
    // Strip color sections like [red] [green]
    f = f.replace(/\[[a-z]+\]/gi, '');
    // Handle fractions like # ?/? or # ??/?? -> fallback to Intl maximumFractionDigits
    const isFraction = /\?\/?\?|\?\?\/?\?\?/.test(f);
    // Engineering/scientific: use Intl with notation 'scientific'
    const isScientific = /e\+?0+/i.test(fmt || '');
    const percent = /%/.test(f);
    const grouping = /,/.test(fmt || '');
    const decMatch = (fmt || '').split('.')[1] || '';
    const decimals = decMatch.replace(/[^0#]/g, '').length;
    const currencySymbol = (fmt || '').match(/[¥$€£]/)?.[0];
    const currency = currencySymbol ? mapCurrencySymbolToCode(currencySymbol) : undefined;

    const options: Intl.NumberFormatOptions = {};
    if (currency) { options.style = 'currency'; options.currency = currency; }
    else if (percent) { options.style = 'percent'; }
    else { options.style = 'decimal'; }
    if (isScientific) options.notation = 'scientific';
    if (grouping) options.useGrouping = true; else options.useGrouping = false;
    if (!percent) {
      if (isFraction) {
        options.minimumFractionDigits = 0; options.maximumFractionDigits = Math.max(0, decimals || 2);
      } else {
        options.minimumFractionDigits = decimals;
        options.maximumFractionDigits = decimals;
      }
    } else {
      // let Intl handle percent scaling (expects ratio). No fixed fraction by default.
    }
    const key = JSON.stringify(options);
    let nf = this.numCache.get(key);
    if (!nf) { nf = new Intl.NumberFormat(this.locale, options); this.numCache.set(key, nf); }
    return nf.format(value);
  }

  private formatDate(date: Date, fmt: string): string {
    const opts = this.mapExcelDateFmtToIntl(fmt);
    const key = JSON.stringify(opts);
    let df = this.dateCache.get(key);
    if (!df) { df = new Intl.DateTimeFormat(this.locale, opts); this.dateCache.set(key, df); }
    return df.format(date);
  }

  private isDateFormat(fmt?: string): boolean {
    if (!fmt) return false;
    const f = fmt.toLowerCase();
    return /[dyhms]/.test(f) || /\[h\]/.test(f);
  }

  private mapExcelDateFmtToIntl(fmt: string): Intl.DateTimeFormatOptions {
    const f = fmt;
    const has = (re: RegExp) => re.test(f);
    const mLen = (f.match(/m+/gi)?.[0]?.length) || 0; // month token length mm, mmm, mmmm
    const yLen = (f.match(/y+/gi)?.[0]?.length) || 0;
    const dLen = (f.match(/d+/gi)?.[0]?.length) || 0;
    const hLen = (f.match(/h+/gi)?.[0]?.length) || 0;
    const sLen = (f.match(/s+/gi)?.[0]?.length) || 0;
    const minuteLen = (f.match(/(mm)(?![^:]*\bmonth\b)/gi)?.[0]?.length) || 0; // crude
    const ampm = /am\/pm/i.test(f);
    const opts: Intl.DateTimeFormatOptions = {};
    // Duration formats like [h]:mm:ss are not directly supported by Intl; we approximate by showing time components
    const duration = /\[h\]/i.test(f);
    if (yLen) opts.year = yLen === 2 ? '2-digit' : 'numeric';
    if (mLen) {
      if (mLen >= 4) opts.month = 'long';
      else if (mLen === 3) opts.month = 'short';
      else if (mLen <= 2) opts.month = '2-digit';
    }
    if (dLen) opts.day = dLen >= 2 ? '2-digit' : 'numeric';
    if (hLen) opts.hour = hLen >= 2 ? '2-digit' : 'numeric';
    if (minuteLen) opts.minute = minuteLen >= 2 ? '2-digit' : 'numeric';
    if (sLen) opts.second = sLen >= 2 ? '2-digit' : 'numeric';
    if (hLen) opts.hour12 = ampm || false;
    return opts;
  }
}

function mapCurrencySymbolToCode(sym?: string): string | undefined {
  switch (sym) {
    case '$': return 'USD';
    case '€': return 'EUR';
    case '£': return 'GBP';
    case '¥': return 'JPY';
    default: return undefined;
  }
}

function excelSerialToDate(serial: number): Date {
  const wholeDays = Math.floor(serial);
  const frac = serial - wholeDays;
  const dayAdjust = wholeDays > 59 ? -1 : 0;
  const epoch = new Date(Date.UTC(1899, 11, 31));
  const ms = (wholeDays + dayAdjust) * 86400000 + Math.round(frac * 86400000);
  return new Date(epoch.getTime() + ms);
}

function pad(n: number, len = 2): string {
  return String(n).padStart(len, '0');
}
