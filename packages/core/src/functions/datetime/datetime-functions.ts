/**
 * datetime-functions.ts
 * 
 * Date and time formula functions.
 * Excel-compatible date/time operations.
 */

import type { FormulaFunction, FormulaValue } from '../../types/formula-types';
import { toNumber, toString } from '../../utils/type-utils';

/**
 * Excel serial date epoch
 * Excel serial 0 = December 30, 1899 (NOT December 31!)
 * Excel serial 1 = December 31, 1899
 * Excel serial 2 = January 1, 1900
 * 
 * Note: Excel incorrectly treats 1900 as a leap year (serial 60 = Feb 29, 1900)
 * 
 * CRITICAL: Use UTC to avoid timezone-based off-by-one errors!
 * 
 * Excel serial 1 = January 1, 1900, so epoch is December 31, 1899 (day before serial 1)
 */
const EXCEL_EPOCH = Date.UTC(1899, 11, 31); // December 31, 1899
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Convert Excel serial number to JavaScript Date (UTC)
 * 
 * Excel serial numbering:
 * - Serial 0 = December 30, 1899 (our epoch)
 * - Serial 1 = January 1, 1900
 * - Serial 2 = January 2, 1900
 * - Serial 60 = February 29, 1900 (doesn't exist - Excel bug)
 * - Serial 61 = March 1, 1900
 * 
 * For serials 1-60: days_from_epoch = serial
 * For serials > 60: days_from_epoch = serial - 1 (skip the fake Feb 29)
 */
function serialToDate(serial: number): Date {
  // For serials > 60, subtract 1 to skip the fake Feb 29, 1900
  const daysFromEpoch = serial > 60 ? serial - 1 : serial;
  return new Date(EXCEL_EPOCH + daysFromEpoch * MS_PER_DAY);
}

/**
 * Convert JavaScript Date to Excel serial number
 * 
 * Uses UTC to avoid timezone issues that cause off-by-one errors
 */
function dateToSerial(date: Date): number {
  // Use UTC components to avoid timezone offset issues
  const utcDate = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
    date.getUTCMilliseconds()
  );
  
  const diff = utcDate - EXCEL_EPOCH;
  let serial = Math.floor(diff / MS_PER_DAY);
  
  // Excel's leap year bug: it treats 1900 as a leap year (it wasn't)
  // For dates after Feb 28, 1900 (serial > 59), add 1 to account for fake leap day
  if (serial > 59) {
    serial += 1;
  }
  
  return serial;
}

/**
 * TODAY - Current date
 */
export const TODAY: FormulaFunction = () => {
  const now = new Date();
  // Create UTC date from current UTC date components to match DATE() behavior
  // This ensures TODAY() works the same as DATE(YEAR(now), MONTH(now), DAY(now))
  const utcTimestamp = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const diff = utcTimestamp - EXCEL_EPOCH;
  let serial = Math.floor(diff / MS_PER_DAY);
  if (serial > 59) serial += 1; // Excel leap year bug
  return serial;
};

/**
 * NOW - Current date and time
 */
export const NOW: FormulaFunction = () => {
  const now = new Date();
  // Create UTC timestamp from current UTC components to match DATE() + TIME() behavior
  const utcTimestamp = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    now.getUTCHours(),
    now.getUTCMinutes(),
    now.getUTCSeconds(),
    now.getUTCMilliseconds()
  );
  const diff = utcTimestamp - EXCEL_EPOCH;
  let serial = diff / MS_PER_DAY;
  if (Math.floor(serial) > 59) serial += 1; // Excel leap year bug
  return serial;
};

/**
 * DATE - Create date from year, month, day
 */
export const DATE: FormulaFunction = (year, month, day) => {
  const y = toNumber(year);
  const m = toNumber(month);
  const d = toNumber(day);

  if (y instanceof Error) return y;
  if (m instanceof Error) return m;
  if (d instanceof Error) return d;

  // Use Date.UTC to create a UTC date, avoiding timezone issues
  // JavaScript months are 0-based, so subtract 1 from month
  const utcDate = Date.UTC(y, m - 1, d);
  
  if (isNaN(utcDate)) {
    return new Error('#VALUE!');
  }

  // Calculate days since Excel epoch (Dec 30, 1899)
  const diff = utcDate - EXCEL_EPOCH;
  let serial = Math.floor(diff / MS_PER_DAY);
  
  // Excel's leap year bug: it treats 1900 as a leap year (it wasn't)
  // Serial 60 = Feb 29, 1900 (fake date), serial 61 = March 1, 1900
  // For dates after Feb 28, 1900 (serial > 59), add 1 to account for fake leap day
  if (serial > 59) {
    serial += 1;
  }
  
  return serial;
};

/**
 * TIME - Create time from hour, minute, second
 * 
 * Excel behavior:
 * - Hours >= 24 wrap around (25 hours = 1 AM)
 * - Negative times are allowed
 * - Result is always a fraction [0, 1) for valid times
 * - Overflow/underflow from minutes and seconds is handled automatically
 * 
 * @param hour - Hour (0-23, but can overflow)
 * @param minute - Minute (0-59, but can overflow)
 * @param second - Second (0-59, but can overflow)
 * @returns Time as fraction of day, wrapped to [0, 1) for hours >= 24
 */
export const TIME: FormulaFunction = (hour, minute, second) => {
  const h = toNumber(hour);
  const m = toNumber(minute);
  const s = toNumber(second);

  if (h instanceof Error) return h;
  if (m instanceof Error) return m;
  if (s instanceof Error) return s;

  // Time as fraction of day
  const totalSeconds = h * 3600 + m * 60 + s;
  
  // Excel wraps times >= 24 hours: TIME(25,0,0) = TIME(1,0,0)
  // Modulo ensures result is in [0, 86400) range
  const wrappedSeconds = totalSeconds >= 0 
    ? totalSeconds % 86400 
    : (totalSeconds % 86400 + 86400) % 86400;
  
  return wrappedSeconds / 86400; // 86400 seconds in a day
};

/**
 * YEAR - Extract year from date
 */
export const YEAR: FormulaFunction = (date) => {
  if (typeof date === 'string') {
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) return new Error('#VALUE!');
    return parsed.getUTCFullYear();
  }

  const num = toNumber(date);
  if (num instanceof Error) return num;

  const d = serialToDate(num);
  return d.getUTCFullYear();
};

/**
 * MONTH - Extract month from date (1-12)
 */
export const MONTH: FormulaFunction = (date) => {
  if (typeof date === 'string') {
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) return new Error('#VALUE!');
    return parsed.getUTCMonth() + 1;
  }

  const num = toNumber(date);
  if (num instanceof Error) return num;

  const d = serialToDate(num);
  return d.getUTCMonth() + 1;
};

/**
 * DAY - Extract day from date (1-31)
 */
export const DAY: FormulaFunction = (date) => {
  if (typeof date === 'string') {
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) return new Error('#VALUE!');
    return parsed.getUTCDate();
  }

  const num = toNumber(date);
  if (num instanceof Error) return num;

  const d = serialToDate(num);
  return d.getUTCDate();
};

/**
 * HOUR - Extract hour from time (0-23)
 */
export const HOUR: FormulaFunction = (time) => {
  const num = toNumber(time);
  if (num instanceof Error) return num;

  // Time is stored as fraction of day
  const hours = (num * 24) % 24;
  return Math.floor(hours);
};

/**
 * MINUTE - Extract minute from time (0-59)
 */
export const MINUTE: FormulaFunction = (time) => {
  const num = toNumber(time);
  if (num instanceof Error) return num;

  // Time is stored as fraction of day
  const minutes = (num * 24 * 60) % 60;
  return Math.floor(minutes);
};

/**
 * SECOND - Extract second from time (0-59)
 */
export const SECOND: FormulaFunction = (time) => {
  const num = toNumber(time);
  if (num instanceof Error) return num;

  // Time is stored as fraction of day
  const seconds = (num * 24 * 60 * 60) % 60;
  return Math.floor(seconds);
};

/**
 * WEEKDAY - Day of week (1=Sunday, 2=Monday, ..., 7=Saturday)
 */
export const WEEKDAY: FormulaFunction = (date, returnType = 1) => {
  const num = toNumber(date);
  const type = toNumber(returnType);

  if (num instanceof Error) return num;
  if (type instanceof Error) return type;

  const d = serialToDate(num);
  const day = d.getDay(); // 0=Sunday, 6=Saturday

  // Return type 1: 1=Sunday, 2=Monday, ..., 7=Saturday
  if (type === 1) return day + 1;

  // Return type 2: 1=Monday, 2=Tuesday, ..., 7=Sunday
  if (type === 2) return day === 0 ? 7 : day;

  // Return type 3: 0=Monday, 1=Tuesday, ..., 6=Sunday
  if (type === 3) return day === 0 ? 6 : day - 1;

  return new Error('#NUM!');
};

/**
 * WEEKNUM - Week number of year
 */
export const WEEKNUM: FormulaFunction = (date, returnType = 1) => {
  const num = toNumber(date);
  if (num instanceof Error) return num;

  const d = serialToDate(num);
  const startOfYear = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const diff = d.getTime() - startOfYear.getTime();
  const dayOfYear = Math.floor(diff / MS_PER_DAY) + 1;

  // Simple calculation (weeks start on Sunday)
  return Math.ceil(dayOfYear / 7);
};

/**
 * EOMONTH - End of month
 */
export const EOMONTH: FormulaFunction = (startDate, months) => {
  const num = toNumber(startDate);
  const m = toNumber(months);

  if (num instanceof Error) return num;
  if (m instanceof Error) return m;

  const d = serialToDate(num);
  
  // Use UTC methods to get last day of target month
  const targetDate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + m + 1, 0));
  
  return dateToSerial(targetDate);
};

/**
 * EDATE - Date n months from start date
 */
export const EDATE: FormulaFunction = (startDate, months) => {
  const num = toNumber(startDate);
  const m = toNumber(months);

  if (num instanceof Error) return num;
  if (m instanceof Error) return m;

  const d = serialToDate(num);
  
  // Use UTC methods to match DATE() behavior
  const targetDate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + m, d.getUTCDate()));
  
  return dateToSerial(targetDate);
};

/**
 * DATEDIF - Difference between two dates
 */
export const DATEDIF: FormulaFunction = (startDate, endDate, unit) => {
  const start = toNumber(startDate);
  const end = toNumber(endDate);
  const u = toString(unit);

  if (start instanceof Error) return start;
  if (end instanceof Error) return end;
  if (u instanceof Error) return u;

  const d1 = serialToDate(start);
  const d2 = serialToDate(end);

  if (d1 > d2) return new Error('#NUM!');

  const unitUpper = u.toUpperCase();

  // Years
  if (unitUpper === 'Y') {
    return d2.getUTCFullYear() - d1.getUTCFullYear();
  }

  // Months
  if (unitUpper === 'M') {
    return (d2.getUTCFullYear() - d1.getUTCFullYear()) * 12 + (d2.getUTCMonth() - d1.getUTCMonth());
  }

  // Days
  if (unitUpper === 'D') {
    return Math.floor((d2.getTime() - d1.getTime()) / MS_PER_DAY);
  }

  return new Error('#VALUE!');
};

/**
 * DAYS - Days between two dates
 */
export const DAYS: FormulaFunction = (endDate, startDate) => {
  const end = toNumber(endDate);
  const start = toNumber(startDate);

  if (end instanceof Error) return end;
  if (start instanceof Error) return start;

  return Math.floor(end - start);
};

/**
 * NETWORKDAYS - Working days between dates (excludes weekends)
 */
export const NETWORKDAYS: FormulaFunction = (startDate, endDate, holidays?) => {
  const start = toNumber(startDate);
  const end = toNumber(endDate);

  if (start instanceof Error) return start;
  if (end instanceof Error) return end;

  const d1 = serialToDate(start);
  const d2 = serialToDate(end);

  let workDays = 0;
  const current = new Date(d1);

  while (current <= d2) {
    const day = current.getUTCDay();
    // Skip weekends (0=Sunday, 6=Saturday)
    if (day !== 0 && day !== 6) {
      workDays++;
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return workDays;
};

/**
 * WORKDAY - Date n working days from start
 */
export const WORKDAY: FormulaFunction = (startDate, days, holidays?) => {
  const start = toNumber(startDate);
  const d = toNumber(days);

  if (start instanceof Error) return start;
  if (d instanceof Error) return d;

  const current = serialToDate(start);
  let workDaysLeft = Math.abs(d);
  const direction = d >= 0 ? 1 : -1;

  while (workDaysLeft > 0) {
    current.setUTCDate(current.getUTCDate() + direction);
    const day = current.getUTCDay();
    
    // Count working days (skip weekends)
    if (day !== 0 && day !== 6) {
      workDaysLeft--;
    }
  }

  return dateToSerial(current);
};

/**
 * DATEVALUE - Convert date string to serial number
 */
export const DATEVALUE: FormulaFunction = (dateText) => {
  const str = toString(dateText);
  if (str instanceof Error) return str;

  const date = new Date(str);
  if (isNaN(date.getTime())) {
    return new Error('#VALUE!');
  }

  return dateToSerial(date);
};

/**
 * TIMEVALUE - Convert time string to decimal
 */
export const TIMEVALUE: FormulaFunction = (timeText) => {
  const str = toString(timeText);
  if (str instanceof Error) return str;

  const date = new Date(`1900-01-01 ${str}`);
  if (isNaN(date.getTime())) {
    return new Error('#VALUE!');
  }

  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const seconds = date.getUTCSeconds();

  return (hours * 3600 + minutes * 60 + seconds) / 86400;
};
