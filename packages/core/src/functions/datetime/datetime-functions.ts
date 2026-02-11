/**
 * datetime-functions.ts
 * 
 * Date and time formula functions.
 * Excel-compatible date/time operations.
 */

import type { FormulaFunction, FormulaValue } from '../../types/formula-types';
import { toNumber, toString } from '../../utils/type-utils';

/**
 * Excel serial date epoch (January 1, 1900)
 * Note: Excel incorrectly treats 1900 as a leap year for serials <= 60
 * 
 * CRITICAL: Use UTC to avoid timezone-based off-by-one errors!
 * Date.UTC(1900, 0, 1) creates midnight UTC on January 1, 1900
 */
const EXCEL_EPOCH = Date.UTC(1900, 0, 1);
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Convert Excel serial number to JavaScript Date (UTC)
 * 
 * Excel serial numbering:
 * - Serial 1 = January 1, 1900
 * - Serial 2 = January 2, 1900
 * - Serial 60 = February 29, 1900 (doesn't exist - Excel bug)
 * - Serial 61 = March 1, 1900
 * 
 * For serials > 60, we need to add +1 to compensate for Excel's 1900 leap year bug
 */
function serialToDate(serial: number): Date {
  // Excel serial 1 = January 1, 1900
  // Subtract 1 because Excel serial 1 = day 1, not day 0
  const adjusted = serial > 60 ? serial - 2 : serial - 1;
  return new Date(EXCEL_EPOCH + adjusted * MS_PER_DAY);
}

/**
 * Convert JavaScript Date to Excel serial number
 * 
 * Uses UTC to avoid timezone issues that cause off-by-one errors
 */
function dateToSerial(date: Date): number {
  // Use UTC components to avoid timezone offset issues
  const utcDate = Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds()
  );
  
  const diff = utcDate - EXCEL_EPOCH;
  const days = Math.floor(diff / MS_PER_DAY);
  
  // Add 1 because Excel serial 1 = January 1, 1900 (not 0)
  // Add another 1 if after Feb 28, 1900 to account for Excel's leap year bug
  return days + 1 + (days >= 59 ? 1 : 0);
}

/**
 * TODAY - Current date
 */
export const TODAY: FormulaFunction = () => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return dateToSerial(now);
};

/**
 * NOW - Current date and time
 */
export const NOW: FormulaFunction = () => {
  return dateToSerial(new Date());
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

  // JavaScript Date uses 0-based months
  const date = new Date(y, m - 1, d);
  
  if (isNaN(date.getTime())) {
    return new Error('#VALUE!');
  }

  return dateToSerial(date);
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
    return parsed.getFullYear();
  }

  const num = toNumber(date);
  if (num instanceof Error) return num;

  const d = serialToDate(num);
  return d.getFullYear();
};

/**
 * MONTH - Extract month from date (1-12)
 */
export const MONTH: FormulaFunction = (date) => {
  if (typeof date === 'string') {
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) return new Error('#VALUE!');
    return parsed.getMonth() + 1;
  }

  const num = toNumber(date);
  if (num instanceof Error) return num;

  const d = serialToDate(num);
  return d.getMonth() + 1;
};

/**
 * DAY - Extract day from date (1-31)
 */
export const DAY: FormulaFunction = (date) => {
  if (typeof date === 'string') {
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) return new Error('#VALUE!');
    return parsed.getDate();
  }

  const num = toNumber(date);
  if (num instanceof Error) return num;

  const d = serialToDate(num);
  return d.getDate();
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
  const startOfYear = new Date(d.getFullYear(), 0, 1);
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
  
  // Move to desired month
  const targetDate = new Date(d.getFullYear(), d.getMonth() + m + 1, 0);
  
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
  
  // Move to desired month
  const targetDate = new Date(d.getFullYear(), d.getMonth() + m, d.getDate());
  
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
    return d2.getFullYear() - d1.getFullYear();
  }

  // Months
  if (unitUpper === 'M') {
    return (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
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
    const day = current.getDay();
    // Skip weekends (0=Sunday, 6=Saturday)
    if (day !== 0 && day !== 6) {
      workDays++;
    }
    current.setDate(current.getDate() + 1);
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
    current.setDate(current.getDate() + direction);
    const day = current.getDay();
    
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

  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();

  return (hours * 3600 + minutes * 60 + seconds) / 86400;
};
