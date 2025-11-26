/**
 * I18nManager.ts
 * 
 * Provides internationalization (i18n) and right-to-left (RTL) support for spreadsheets.
 * Handles locale-aware number formatting, date formatting, and bidirectional text rendering.
 */

export type TextDirection = 'ltr' | 'rtl';

export interface LocaleConfig {
  code: string;
  name: string;
  direction: TextDirection;
  numberFormat: Intl.NumberFormatOptions;
  dateFormat: Intl.DateTimeFormatOptions;
  currency?: {
    code: string;
    symbol: string;
    position: 'before' | 'after';
  };
  decimalSeparator: string;
  thousandsSeparator: string;
  listSeparator: string;
}

/**
 * Predefined locale configurations for common languages.
 */
export const LOCALES: Record<string, LocaleConfig> = {
  'en-US': {
    code: 'en-US',
    name: 'English (United States)',
    direction: 'ltr',
    numberFormat: {
      useGrouping: true,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    },
    dateFormat: {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    },
    currency: {
      code: 'USD',
      symbol: '$',
      position: 'before',
    },
    decimalSeparator: '.',
    thousandsSeparator: ',',
    listSeparator: ',',
  },
  'en-GB': {
    code: 'en-GB',
    name: 'English (United Kingdom)',
    direction: 'ltr',
    numberFormat: {
      useGrouping: true,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    },
    dateFormat: {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    },
    currency: {
      code: 'GBP',
      symbol: '£',
      position: 'before',
    },
    decimalSeparator: '.',
    thousandsSeparator: ',',
    listSeparator: ',',
  },
  'de-DE': {
    code: 'de-DE',
    name: 'German (Germany)',
    direction: 'ltr',
    numberFormat: {
      useGrouping: true,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    },
    dateFormat: {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    },
    currency: {
      code: 'EUR',
      symbol: '€',
      position: 'after',
    },
    decimalSeparator: ',',
    thousandsSeparator: '.',
    listSeparator: ';',
  },
  'fr-FR': {
    code: 'fr-FR',
    name: 'French (France)',
    direction: 'ltr',
    numberFormat: {
      useGrouping: true,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    },
    dateFormat: {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    },
    currency: {
      code: 'EUR',
      symbol: '€',
      position: 'after',
    },
    decimalSeparator: ',',
    thousandsSeparator: ' ',
    listSeparator: ';',
  },
  'ar-SA': {
    code: 'ar-SA',
    name: 'Arabic (Saudi Arabia)',
    direction: 'rtl',
    numberFormat: {
      useGrouping: true,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
      numberingSystem: 'arab',
    },
    dateFormat: {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      calendar: 'gregory',
    },
    currency: {
      code: 'SAR',
      symbol: 'ر.س',
      position: 'before',
    },
    decimalSeparator: '٫',
    thousandsSeparator: '٬',
    listSeparator: '،',
  },
  'he-IL': {
    code: 'he-IL',
    name: 'Hebrew (Israel)',
    direction: 'rtl',
    numberFormat: {
      useGrouping: true,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    },
    dateFormat: {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    },
    currency: {
      code: 'ILS',
      symbol: '₪',
      position: 'before',
    },
    decimalSeparator: '.',
    thousandsSeparator: ',',
    listSeparator: ',',
  },
  'ja-JP': {
    code: 'ja-JP',
    name: 'Japanese (Japan)',
    direction: 'ltr',
    numberFormat: {
      useGrouping: true,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    },
    dateFormat: {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      era: 'short',
    },
    currency: {
      code: 'JPY',
      symbol: '¥',
      position: 'before',
    },
    decimalSeparator: '.',
    thousandsSeparator: ',',
    listSeparator: '、',
  },
  'zh-CN': {
    code: 'zh-CN',
    name: 'Chinese (Simplified, China)',
    direction: 'ltr',
    numberFormat: {
      useGrouping: true,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    },
    dateFormat: {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    },
    currency: {
      code: 'CNY',
      symbol: '¥',
      position: 'before',
    },
    decimalSeparator: '.',
    thousandsSeparator: ',',
    listSeparator: '、',
  },
  'ru-RU': {
    code: 'ru-RU',
    name: 'Russian (Russia)',
    direction: 'ltr',
    numberFormat: {
      useGrouping: true,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    },
    dateFormat: {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    },
    currency: {
      code: 'RUB',
      symbol: '₽',
      position: 'after',
    },
    decimalSeparator: ',',
    thousandsSeparator: ' ',
    listSeparator: ';',
  },
  'es-ES': {
    code: 'es-ES',
    name: 'Spanish (Spain)',
    direction: 'ltr',
    numberFormat: {
      useGrouping: true,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    },
    dateFormat: {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    },
    currency: {
      code: 'EUR',
      symbol: '€',
      position: 'after',
    },
    decimalSeparator: ',',
    thousandsSeparator: '.',
    listSeparator: ';',
  },
};

/**
 * I18nManager provides locale-aware formatting and RTL support.
 */
export class I18nManager {
  private locale: LocaleConfig;
  private numberFormatter: Intl.NumberFormat;
  private dateFormatter: Intl.DateTimeFormat;
  private currencyFormatter?: Intl.NumberFormat;

  constructor(localeCode: string = 'en-US') {
    this.locale = LOCALES[localeCode] || LOCALES['en-US'];
    this.numberFormatter = new Intl.NumberFormat(this.locale.code, this.locale.numberFormat);
    this.dateFormatter = new Intl.DateTimeFormat(this.locale.code, this.locale.dateFormat);
    
    if (this.locale.currency) {
      this.currencyFormatter = new Intl.NumberFormat(this.locale.code, {
        style: 'currency',
        currency: this.locale.currency.code,
        ...this.locale.numberFormat,
      });
    }
  }

  /**
   * Gets the current locale configuration.
   */
  public getLocale(): Readonly<LocaleConfig> {
    return { ...this.locale };
  }

  /**
   * Gets the text direction for the current locale.
   */
  public getDirection(): TextDirection {
    return this.locale.direction;
  }

  /**
   * Checks if the current locale is RTL.
   */
  public isRTL(): boolean {
    return this.locale.direction === 'rtl';
  }

  /**
   * Formats a number according to the current locale.
   */
  public formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
    if (options) {
      const formatter = new Intl.NumberFormat(this.locale.code, options);
      return formatter.format(value);
    }
    return this.numberFormatter.format(value);
  }

  /**
   * Formats a date according to the current locale.
   */
  public formatDate(date: Date, options?: Intl.DateTimeFormatOptions): string {
    if (options) {
      const formatter = new Intl.DateTimeFormat(this.locale.code, options);
      return formatter.format(date);
    }
    return this.dateFormatter.format(date);
  }

  /**
   * Formats a currency value according to the current locale.
   */
  public formatCurrency(value: number): string {
    if (!this.currencyFormatter) {
      throw new Error('Currency formatting is not available for this locale');
    }
    return this.currencyFormatter.format(value);
  }

  /**
   * Parses a number string according to the current locale's format.
   */
  public parseNumber(value: string): number | null {
    // Remove thousands separators and replace decimal separator with period
    const normalized = value
      .replace(new RegExp(`\\${this.locale.thousandsSeparator}`, 'g'), '')
      .replace(this.locale.decimalSeparator, '.');
    
    const num = parseFloat(normalized);
    return isNaN(num) ? null : num;
  }

  /**
   * Detects the text direction of a given string using Unicode bidi algorithm.
   */
  public detectTextDirection(text: string): TextDirection {
    // Check for strong RTL characters (Arabic, Hebrew, etc.)
    const rtlRegex = /[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/;
    return rtlRegex.test(text) ? 'rtl' : 'ltr';
  }

  /**
   * Applies bidirectional text algorithm for mixed LTR/RTL content.
   */
  public applyBidi(text: string, baseDirection?: TextDirection): string {
    const direction = baseDirection || this.locale.direction;
    
    // For RTL base direction, wrap in RLM (Right-to-Left Mark) if needed
    if (direction === 'rtl' && !text.startsWith('\u200F')) {
      return '\u200F' + text;
    }
    
    // For LTR base direction, wrap in LRM (Left-to-Right Mark) if needed
    if (direction === 'ltr' && !text.startsWith('\u200E')) {
      return '\u200E' + text;
    }
    
    return text;
  }

  /**
   * Gets the alignment for the current locale (RTL locales default to 'right').
   */
  public getDefaultAlignment(): 'left' | 'center' | 'right' {
    return this.isRTL() ? 'right' : 'left';
  }

  /**
   * Reverses column order for RTL rendering.
   */
  public reverseColumnOrder<T>(columns: T[]): T[] {
    return this.isRTL() ? [...columns].reverse() : columns;
  }

  /**
   * Adjusts X coordinate for RTL rendering.
   */
  public adjustXForRTL(x: number, width: number, containerWidth: number): number {
    return this.isRTL() ? containerWidth - x - width : x;
  }

  /**
   * Changes the locale and reinitializes formatters.
   */
  public setLocale(localeCode: string): void {
    const newLocale = LOCALES[localeCode];
    if (!newLocale) {
      console.warn(`Locale ${localeCode} not found. Using default en-US.`);
      return;
    }
    
    this.locale = newLocale;
    this.numberFormatter = new Intl.NumberFormat(this.locale.code, this.locale.numberFormat);
    this.dateFormatter = new Intl.DateTimeFormat(this.locale.code, this.locale.dateFormat);
    
    if (this.locale.currency) {
      this.currencyFormatter = new Intl.NumberFormat(this.locale.code, {
        style: 'currency',
        currency: this.locale.currency.code,
        ...this.locale.numberFormat,
      });
    } else {
      this.currencyFormatter = undefined;
    }
  }

  /**
   * Gets a list of all available locales.
   */
  public static getAvailableLocales(): LocaleConfig[] {
    return Object.values(LOCALES);
  }

  /**
   * Registers a custom locale configuration.
   */
  public static registerLocale(localeConfig: LocaleConfig): void {
    LOCALES[localeConfig.code] = localeConfig;
  }
}
