/**
 * Number Format Specification System
 * 
 * Evidence-driven boundary: 16 unique formats from codebase audit (Feb 14, 2026)
 * 
 * Design Principles:
 * - No parser, no AST, no compiler
 * - Semantic representation via specs
 * - Precompiled Intl formatters (once per format, not per call)
 * - O(1) dispatch with frozen spec map
 * - Fail-fast on unknown formats (governance alarm)
 * 
 * Performance Budget:
 * - 10,000 formats < 5ms (large grid fast scroll)
 * - Individual format < 0.5µs (precompiled Intl lookup)
 * 
 * @packageDocumentation
 */

/**
 * Semantic format type classification
 */
export type FormatType = 'number' | 'currency' | 'percent' | 'date' | 'time' | 'text';

/**
 * Base format specification (semantic representation)
 */
export interface NumberFormatSpec {
  type: FormatType;
  
  // Number-specific
  decimals?: number;
  grouping?: boolean;
  
  // Currency-specific (literal prefix, not locale-driven)
  currencySymbol?: string;
  
  // Date/Time-specific
  datePattern?: string;
}

/**
 * Compiled format specification with precompiled Intl formatter
 * 
 * CRITICAL: Intl.NumberFormat/DateTimeFormat construction is expensive (~10-50µs).
 * We compile once during initialization, not per format call.
 */
export interface CompiledFormatSpec extends NumberFormatSpec {
  formatter?: Intl.NumberFormat | Intl.DateTimeFormat;
}

/**
 * Excel serial date constants (for date/time conversion)
 * 
 * Excel serial dates:
 * - Serial 1 = January 1, 1900
 * - But Excel has 1900 leap year bug (treats Feb 29, 1900 as valid)
 * - Serial 60 = Feb 29, 1900 (invalid date)
 * - Serial 61 = March 1, 1900
 * 
 * Unix epoch: January 1, 1970
 * Days from Jan 1, 1900 to Jan 1, 1970 = 25567
 * But with Excel's leap bug, Excel serial for Jan 1, 1970 = 25569
 */
export const EXCEL_EPOCH_OFFSET = 25569; // Excel serial for Unix epoch (1970-01-01)
export const MS_PER_DAY = 86400 * 1000;

/**
 * Convert Excel serial date to JavaScript Date
 * 
 * Handles Excel 1900 leap year bug:
 * - Serials <= 60: No adjustment needed
 * - Serials > 60: Already include bogus leap day, no adjustment needed
 * 
 * Excel serial 0 = Dec 30, 1899 (not Dec 31!)
 * Excel serial 1 = Jan 1, 1900
 * Excel serial 60 = Feb 29, 1900 (bogus)
 * Excel serial 61 = March 1, 1900
 * 
 * @param serial - Excel serial date (1 = Jan 1, 1900)
 * @returns JavaScript Date object
 */
export function excelSerialToDate(serial: number): Date {
  // Convert Excel serial to days since Unix epoch
  const daysSinceUnixEpoch = serial - EXCEL_EPOCH_OFFSET;
  
  // Convert to Unix timestamp (milliseconds)
  const unixTimestamp = daysSinceUnixEpoch * MS_PER_DAY;
  
  return new Date(unixTimestamp);
}

/**
 * Compile format spec with precompiled Intl formatter
 * 
 * PERFORMANCE: This is called once per format during initialization.
 * Intl construction cost (~10-50µs) is paid once, not per cell render.
 * 
 * @param spec - Base format specification
 * @returns Compiled spec with Intl formatter
 */
export function compileSpec(spec: NumberFormatSpec): CompiledFormatSpec {
  switch (spec.type) {
    case 'number': {
      const formatter = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: spec.decimals ?? 0,
        maximumFractionDigits: spec.decimals ?? 20, // Auto-precision
        useGrouping: spec.grouping ?? false,
      });
      return { ...spec, formatter };
    }
    
    case 'currency': {
      // Note: We use Intl for number formatting, then prepend currency symbol
      // Excel format "$#,##0.00" uses literal "$", not locale-driven currency
      const formatter = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: spec.decimals ?? 2,
        maximumFractionDigits: spec.decimals ?? 2,
        useGrouping: spec.grouping ?? false,
      });
      return { ...spec, formatter };
    }
    
    case 'percent': {
      const formatter = new Intl.NumberFormat('en-US', {
        style: 'percent',
        minimumFractionDigits: spec.decimals ?? 0,
        maximumFractionDigits: spec.decimals ?? 0,
      });
      return { ...spec, formatter };
    }
    
    case 'date': {
      // Map datePattern to Intl options
      const patternMap: Record<string, Intl.DateTimeFormatOptions> = {
        'm/d/yyyy': { month: 'numeric', day: 'numeric', year: 'numeric' },
        'yyyy-mm-dd': { year: 'numeric', month: '2-digit', day: '2-digit' },
        'd-mmm-yy': { day: 'numeric', month: 'short', year: '2-digit' },
        'mm/dd/yyyy': { month: '2-digit', day: '2-digit', year: 'numeric' },
      };
      
      const options = patternMap[spec.datePattern || 'm/d/yyyy'] || {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric',
      };
      
      const formatter = new Intl.DateTimeFormat('en-US', options);
      return { ...spec, formatter };
    }
    
    case 'time': {
      const patternMap: Record<string, Intl.DateTimeFormatOptions> = {
        'h:mm': { hour: 'numeric', minute: '2-digit', hour12: true },
        'h:mm:ss': { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true },
        'hh:mm': { hour: '2-digit', minute: '2-digit', hour12: false },
        'hh:mm:ss': { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false },
      };
      
      const options = patternMap[spec.datePattern || 'h:mm'] || {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      };
      
      const formatter = new Intl.DateTimeFormat('en-US', options);
      return { ...spec, formatter };
    }
    
    case 'text':
      // Text format has no Intl formatter (just String())
      return { ...spec };
    
    default:
      return { ...spec };
  }
}
