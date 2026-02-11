/**
 * function-initializer.ts
 * 
 * Initializes all built-in functions into the registry.
 * Uses batch registration for better performance.
 */

import type { FunctionRegistry } from '../registry/FunctionRegistry';
import { FunctionCategory } from '../types/formula-types';

// Import all function modules
import * as MathFunctions from './math';
import * as TextFunctions from './text';
import * as LogicalFunctions from './logical';
import * as ArrayFunctions from './array';
import * as DateTimeFunctions from './datetime';
import * as LookupFunctions from './lookup';
import * as StatisticalFunctions from './statistical';
import * as FunctionalFunctions from './functional';
import * as FinancialFunctions from './financial';
import * as InformationFunctions from './information';
import * as EngineeringFunctions from './engineering';
import * as DatabaseFunctions from './database';

/**
 * Register all built-in functions
 * Uses batch registration for optimal performance
 */
export function registerBuiltInFunctions(registry: FunctionRegistry): void {
  // Math functions
  const mathFunctions = [
    ['SUM', MathFunctions.SUM, { category: FunctionCategory.MATH }],
    ['AVERAGE', MathFunctions.AVERAGE, { category: FunctionCategory.MATH }],
    ['AVERAGEA', MathFunctions.AVERAGEA, { category: FunctionCategory.MATH }],
    ['MIN', MathFunctions.MIN, { category: FunctionCategory.MATH }],
    ['MAX', MathFunctions.MAX, { category: FunctionCategory.MATH }],
    ['COUNT', MathFunctions.COUNT, { category: FunctionCategory.STATISTICAL }],
    ['COUNTA', MathFunctions.COUNTA, { category: FunctionCategory.STATISTICAL }],
    ['ABS', MathFunctions.ABS, { category: FunctionCategory.MATH }],
    ['ROUND', MathFunctions.ROUND, { category: FunctionCategory.MATH, minArgs: 2, maxArgs: 2 }],
    ['ROUNDUP', MathFunctions.ROUNDUP, { category: FunctionCategory.MATH, minArgs: 2, maxArgs: 2 }],
    ['ROUNDDOWN', MathFunctions.ROUNDDOWN, { category: FunctionCategory.MATH, minArgs: 2, maxArgs: 2 }],
    ['SQRT', MathFunctions.SQRT, { category: FunctionCategory.MATH, minArgs: 1, maxArgs: 1 }],
    ['POWER', MathFunctions.POWER, { category: FunctionCategory.MATH, minArgs: 2, maxArgs: 2 }],
    ['EXP', MathFunctions.EXP, { category: FunctionCategory.MATH, minArgs: 1, maxArgs: 1 }],
    ['LN', MathFunctions.LN, { category: FunctionCategory.MATH, minArgs: 1, maxArgs: 1 }],
    ['LOG', MathFunctions.LOG, { category: FunctionCategory.MATH, minArgs: 1, maxArgs: 2 }],
    ['LOG10', MathFunctions.LOG10, { category: FunctionCategory.MATH, minArgs: 1, maxArgs: 1 }],
    ['MOD', MathFunctions.MOD, { category: FunctionCategory.MATH, minArgs: 2, maxArgs: 2 }],
    ['PI', MathFunctions.PI, { category: FunctionCategory.MATH, minArgs: 0, maxArgs: 0 }],
    ['RAND', MathFunctions.RAND, { category: FunctionCategory.MATH, minArgs: 0, maxArgs: 0 }],
    ['RANDBETWEEN', MathFunctions.RANDBETWEEN, { category: FunctionCategory.MATH, minArgs: 2, maxArgs: 2 }],
    ['SIN', MathFunctions.SIN, { category: FunctionCategory.MATH, minArgs: 1, maxArgs: 1 }],
    ['COS', MathFunctions.COS, { category: FunctionCategory.MATH, minArgs: 1, maxArgs: 1 }],
    ['TAN', MathFunctions.TAN, { category: FunctionCategory.MATH, minArgs: 1, maxArgs: 1 }],
    ['ASIN', MathFunctions.ASIN, { category: FunctionCategory.MATH, minArgs: 1, maxArgs: 1 }],
    ['ACOS', MathFunctions.ACOS, { category: FunctionCategory.MATH, minArgs: 1, maxArgs: 1 }],
    ['ATAN', MathFunctions.ATAN, { category: FunctionCategory.MATH, minArgs: 1, maxArgs: 1 }],
    ['ATAN2', MathFunctions.ATAN2, { category: FunctionCategory.MATH, minArgs: 2, maxArgs: 2 }],
    ['DEGREES', MathFunctions.DEGREES, { category: FunctionCategory.MATH, minArgs: 1, maxArgs: 1 }],
    ['RADIANS', MathFunctions.RADIANS, { category: FunctionCategory.MATH, minArgs: 1, maxArgs: 1 }],
    ['SIGN', MathFunctions.SIGN, { category: FunctionCategory.MATH, minArgs: 1, maxArgs: 1 }],
    ['TRUNC', MathFunctions.TRUNC, { category: FunctionCategory.MATH, minArgs: 1, maxArgs: 2 }],
    ['INT', MathFunctions.INT, { category: FunctionCategory.MATH, minArgs: 1, maxArgs: 1 }],
    ['CEILING', MathFunctions.CEILING, { category: FunctionCategory.MATH, minArgs: 1, maxArgs: 2 }],
    ['FLOOR', MathFunctions.FLOOR, { category: FunctionCategory.MATH, minArgs: 1, maxArgs: 2 }],
    ['GCD', MathFunctions.GCD, { category: FunctionCategory.MATH }],
    ['LCM', MathFunctions.LCM, { category: FunctionCategory.MATH }],
    ['FACT', MathFunctions.FACT, { category: FunctionCategory.MATH, minArgs: 1, maxArgs: 1 }],
    ['COMBIN', MathFunctions.COMBIN, { category: FunctionCategory.MATH, minArgs: 2, maxArgs: 2 }],
    ['SUMPRODUCT', MathFunctions.SUMPRODUCT, { category: FunctionCategory.MATH }],
    // Week 11 Day 2: Advanced Math Functions
    ['MROUND', MathFunctions.MROUND, { category: FunctionCategory.MATH, minArgs: 2, maxArgs: 2 }],
    ['QUOTIENT', MathFunctions.QUOTIENT, { category: FunctionCategory.MATH, minArgs: 2, maxArgs: 2 }],
    ['PRODUCT', MathFunctions.PRODUCT, { category: FunctionCategory.MATH }],
    ['SQRTPI', MathFunctions.SQRTPI, { category: FunctionCategory.MATH, minArgs: 1, maxArgs: 1 }],
    ['MULTINOMIAL', MathFunctions.MULTINOMIAL, { category: FunctionCategory.MATH }],
    ['SUMX2MY2', MathFunctions.SUMX2MY2, { category: FunctionCategory.MATH }],
    ['SUMX2PY2', MathFunctions.SUMX2PY2, { category: FunctionCategory.MATH }],
    ['SUMXMY2', MathFunctions.SUMXMY2, { category: FunctionCategory.MATH }],
  ] as const;

  // Text functions
  const textFunctions = [
    ['CONCATENATE', TextFunctions.CONCATENATE, { category: FunctionCategory.TEXT }],
    ['LEFT', TextFunctions.LEFT, { category: FunctionCategory.TEXT, minArgs: 1, maxArgs: 2 }],
    ['RIGHT', TextFunctions.RIGHT, { category: FunctionCategory.TEXT, minArgs: 1, maxArgs: 2 }],
    ['MID', TextFunctions.MID, { category: FunctionCategory.TEXT, minArgs: 3, maxArgs: 3 }],
    ['LEN', TextFunctions.LEN, { category: FunctionCategory.TEXT, minArgs: 1, maxArgs: 1 }],
    ['UPPER', TextFunctions.UPPER, { category: FunctionCategory.TEXT, minArgs: 1, maxArgs: 1 }],
    ['LOWER', TextFunctions.LOWER, { category: FunctionCategory.TEXT, minArgs: 1, maxArgs: 1 }],
    ['TRIM', TextFunctions.TRIM, { category: FunctionCategory.TEXT, minArgs: 1, maxArgs: 1 }],
    ['SUBSTITUTE', TextFunctions.SUBSTITUTE, { category: FunctionCategory.TEXT, minArgs: 3, maxArgs: 4 }],
    ['REPLACE', TextFunctions.REPLACE, { category: FunctionCategory.TEXT, minArgs: 4, maxArgs: 4 }],
    ['FIND', TextFunctions.FIND, { category: FunctionCategory.TEXT, minArgs: 2, maxArgs: 3 }],
    ['SEARCH', TextFunctions.SEARCH, { category: FunctionCategory.TEXT, minArgs: 2, maxArgs: 3 }],
    ['TEXT', TextFunctions.TEXT, { category: FunctionCategory.TEXT, minArgs: 2, maxArgs: 2 }],
    ['VALUE', TextFunctions.VALUE, { category: FunctionCategory.TEXT, minArgs: 1, maxArgs: 1 }],
    ['NUMBERVALUE', TextFunctions.NUMBERVALUE, { category: FunctionCategory.TEXT, minArgs: 1, maxArgs: 3 }],
    ['CHAR', TextFunctions.CHAR, { category: FunctionCategory.TEXT, minArgs: 1, maxArgs: 1 }],
    ['CODE', TextFunctions.CODE, { category: FunctionCategory.TEXT, minArgs: 1, maxArgs: 1 }],
    ['EXACT', TextFunctions.EXACT, { category: FunctionCategory.TEXT, minArgs: 2, maxArgs: 2 }],
    ['REPT', TextFunctions.REPT, { category: FunctionCategory.TEXT, minArgs: 2, maxArgs: 2 }],
    ['TEXTJOIN', TextFunctions.TEXTJOIN, { category: FunctionCategory.TEXT, minArgs: 2 }],
    ['TEXTSPLIT', TextFunctions.TEXTSPLIT, { category: FunctionCategory.TEXT, minArgs: 2, maxArgs: 6 }],
    // Week 11 Day 3: Text Enhancement Functions
    ['CONCAT', TextFunctions.CONCAT, { category: FunctionCategory.TEXT }],
    ['PROPER', TextFunctions.PROPER, { category: FunctionCategory.TEXT, minArgs: 1, maxArgs: 1 }],
    ['CLEAN', TextFunctions.CLEAN, { category: FunctionCategory.TEXT, minArgs: 1, maxArgs: 1 }],
    ['UNICHAR', TextFunctions.UNICHAR, { category: FunctionCategory.TEXT, minArgs: 1, maxArgs: 1 }],
    ['UNICODE', TextFunctions.UNICODE, { category: FunctionCategory.TEXT, minArgs: 1, maxArgs: 1 }],
    ['DOLLAR', TextFunctions.DOLLAR, { category: FunctionCategory.TEXT, minArgs: 1, maxArgs: 2 }],
    ['FIXED', TextFunctions.FIXED, { category: FunctionCategory.TEXT, minArgs: 1, maxArgs: 3 }],
    ['TEXTBEFORE', TextFunctions.TEXTBEFORE, { category: FunctionCategory.TEXT, minArgs: 2, maxArgs: 6 }],
    ['TEXTAFTER', TextFunctions.TEXTAFTER, { category: FunctionCategory.TEXT, minArgs: 2, maxArgs: 6 }],
  ] as const;

  // Logical functions
  const logicalFunctions = [
    ['IF', LogicalFunctions.IF, { category: FunctionCategory.LOGICAL, minArgs: 2, maxArgs: 3, isSpecial: true }],
    ['AND', LogicalFunctions.AND, { category: FunctionCategory.LOGICAL }],
    ['OR', LogicalFunctions.OR, { category: FunctionCategory.LOGICAL }],
    ['NOT', LogicalFunctions.NOT, { category: FunctionCategory.LOGICAL, minArgs: 1, maxArgs: 1 }],
    ['XOR', LogicalFunctions.XOR, { category: FunctionCategory.LOGICAL }],
    ['TRUE', LogicalFunctions.TRUE, { category: FunctionCategory.LOGICAL, minArgs: 0, maxArgs: 0 }],
    ['FALSE', LogicalFunctions.FALSE, { category: FunctionCategory.LOGICAL, minArgs: 0, maxArgs: 0 }],
    ['NA', LogicalFunctions.NA, { category: FunctionCategory.LOGICAL, minArgs: 0, maxArgs: 0 }],
    ['IFERROR', LogicalFunctions.IFERROR, { category: FunctionCategory.LOGICAL, minArgs: 2, maxArgs: 2 }],
    ['IFNA', LogicalFunctions.IFNA, { category: FunctionCategory.LOGICAL, minArgs: 2, maxArgs: 2 }],
    ['IFS', LogicalFunctions.IFS, { category: FunctionCategory.LOGICAL, minArgs: 2 }],
    ['SWITCH', LogicalFunctions.SWITCH, { category: FunctionCategory.LOGICAL, minArgs: 3 }],
    ['ISERROR', LogicalFunctions.ISERROR, { category: FunctionCategory.LOGICAL, minArgs: 1, maxArgs: 1 }],
    ['ISERR', LogicalFunctions.ISERR, { category: FunctionCategory.LOGICAL, minArgs: 1, maxArgs: 1 }],
    ['ISNA', LogicalFunctions.ISNA, { category: FunctionCategory.LOGICAL, minArgs: 1, maxArgs: 1 }],
    ['ISEVEN', LogicalFunctions.ISEVEN, { category: FunctionCategory.LOGICAL, minArgs: 1, maxArgs: 1 }],
    ['ISODD', LogicalFunctions.ISODD, { category: FunctionCategory.LOGICAL, minArgs: 1, maxArgs: 1 }],
  ] as const;

  // Array functions (Excel 365 dynamic arrays)
  const arrayFunctions = [
    ['TRANSPOSE', ArrayFunctions.TRANSPOSE, { category: FunctionCategory.ARRAY, minArgs: 1, maxArgs: 1 }],
    ['UNIQUE', ArrayFunctions.UNIQUE, { category: FunctionCategory.ARRAY, minArgs: 1, maxArgs: 3 }],
    ['SORT', ArrayFunctions.SORT, { category: FunctionCategory.ARRAY, minArgs: 1, maxArgs: 4 }],
    ['SORTBY', ArrayFunctions.SORTBY, { category: FunctionCategory.ARRAY, minArgs: 2 }],
    ['FILTER', ArrayFunctions.FILTER, { category: FunctionCategory.ARRAY, minArgs: 2, maxArgs: 3 }],
    ['SEQUENCE', ArrayFunctions.SEQUENCE, { category: FunctionCategory.ARRAY, minArgs: 1, maxArgs: 4 }],
    ['RANDARRAY', ArrayFunctions.RANDARRAY, { category: FunctionCategory.ARRAY, minArgs: 0, maxArgs: 5 }],
    ['VSTACK', ArrayFunctions.VSTACK, { category: FunctionCategory.ARRAY, minArgs: 1 }],
    ['HSTACK', ArrayFunctions.HSTACK, { category: FunctionCategory.ARRAY, minArgs: 1 }],
    ['WRAPCOLS', ArrayFunctions.WRAPCOLS, { category: FunctionCategory.ARRAY, minArgs: 2, maxArgs: 3 }],
    ['WRAPROWS', ArrayFunctions.WRAPROWS, { category: FunctionCategory.ARRAY, minArgs: 2, maxArgs: 3 }],
    ['TAKE', ArrayFunctions.TAKE, { category: FunctionCategory.ARRAY, minArgs: 2, maxArgs: 3 }],
    ['DROP', ArrayFunctions.DROP, { category: FunctionCategory.ARRAY, minArgs: 2, maxArgs: 3 }],
    ['CHOOSEROWS', ArrayFunctions.CHOOSEROWS, { category: FunctionCategory.ARRAY, minArgs: 2 }],
    ['CHOOSECOLS', ArrayFunctions.CHOOSECOLS, { category: FunctionCategory.ARRAY, minArgs: 2 }],
    ['TOCOL', ArrayFunctions.TOCOL, { category: FunctionCategory.ARRAY, minArgs: 1, maxArgs: 3 }],
    ['TOROW', ArrayFunctions.TOROW, { category: FunctionCategory.ARRAY, minArgs: 1, maxArgs: 3 }],
    ['FLATTEN', ArrayFunctions.FLATTEN, { category: FunctionCategory.ARRAY, minArgs: 1, maxArgs: 1 }],
    ['ROWS', ArrayFunctions.ROWS, { category: FunctionCategory.ARRAY, minArgs: 1, maxArgs: 1 }],
    ['COLUMNS', ArrayFunctions.COLUMNS, { category: FunctionCategory.ARRAY, minArgs: 1, maxArgs: 1 }],
  ] as const;

  // DateTime functions
  const dateTimeFunctions = [
    ['DATE', DateTimeFunctions.DATE, { category: FunctionCategory.DATE_TIME, minArgs: 3, maxArgs: 3 }],
    ['TIME', DateTimeFunctions.TIME, { category: FunctionCategory.DATE_TIME, minArgs: 3, maxArgs: 3 }],
    ['NOW', DateTimeFunctions.NOW, { category: FunctionCategory.DATE_TIME, minArgs: 0, maxArgs: 0 }],
    ['TODAY', DateTimeFunctions.TODAY, { category: FunctionCategory.DATE_TIME, minArgs: 0, maxArgs: 0 }],
    ['YEAR', DateTimeFunctions.YEAR, { category: FunctionCategory.DATE_TIME, minArgs: 1, maxArgs: 1 }],
    ['MONTH', DateTimeFunctions.MONTH, { category: FunctionCategory.DATE_TIME, minArgs: 1, maxArgs: 1 }],
    ['DAY', DateTimeFunctions.DAY, { category: FunctionCategory.DATE_TIME, minArgs: 1, maxArgs: 1 }],
    ['HOUR', DateTimeFunctions.HOUR, { category: FunctionCategory.DATE_TIME, minArgs: 1, maxArgs: 1 }],
    ['MINUTE', DateTimeFunctions.MINUTE, { category: FunctionCategory.DATE_TIME, minArgs: 1, maxArgs: 1 }],
    ['SECOND', DateTimeFunctions.SECOND, { category: FunctionCategory.DATE_TIME, minArgs: 1, maxArgs: 1 }],
    ['WEEKDAY', DateTimeFunctions.WEEKDAY, { category: FunctionCategory.DATE_TIME, minArgs: 1, maxArgs: 2 }],
    ['DATEDIF', DateTimeFunctions.DATEDIF, { category: FunctionCategory.DATE_TIME, minArgs: 3, maxArgs: 3 }],
    ['DAYS', DateTimeFunctions.DAYS, { category: FunctionCategory.DATE_TIME, minArgs: 2, maxArgs: 2 }],
    ['NETWORKDAYS', DateTimeFunctions.NETWORKDAYS, { category: FunctionCategory.DATE_TIME, minArgs: 2, maxArgs: 3 }],
    ['WORKDAY', DateTimeFunctions.WORKDAY, { category: FunctionCategory.DATE_TIME, minArgs: 2, maxArgs: 3 }],
    ['EDATE', DateTimeFunctions.EDATE, { category: FunctionCategory.DATE_TIME, minArgs: 2, maxArgs: 2 }],
    ['EOMONTH', DateTimeFunctions.EOMONTH, { category: FunctionCategory.DATE_TIME, minArgs: 2, maxArgs: 2 }],
    ['DATEVALUE', DateTimeFunctions.DATEVALUE, { category: FunctionCategory.DATE_TIME, minArgs: 1, maxArgs: 1 }],
    ['TIMEVALUE', DateTimeFunctions.TIMEVALUE, { category: FunctionCategory.DATE_TIME, minArgs: 1, maxArgs: 1 }],
    ['WEEKNUM', DateTimeFunctions.WEEKNUM, { category: FunctionCategory.DATE_TIME, minArgs: 1, maxArgs: 2 }],
  ] as const;

  // Lookup functions
  const lookupFunctions = [
    ['VLOOKUP', LookupFunctions.VLOOKUP, { category: FunctionCategory.LOOKUP, minArgs: 3, maxArgs: 4 }],
    ['HLOOKUP', LookupFunctions.HLOOKUP, { category: FunctionCategory.LOOKUP, minArgs: 3, maxArgs: 4 }],
    ['XLOOKUP', LookupFunctions.XLOOKUP, { category: FunctionCategory.LOOKUP, minArgs: 3, maxArgs: 6 }],
    ['LOOKUP', LookupFunctions.LOOKUP, { category: FunctionCategory.LOOKUP, minArgs: 2, maxArgs: 3 }],
    ['INDEX', LookupFunctions.INDEX, { category: FunctionCategory.LOOKUP, minArgs: 2, maxArgs: 4 }],
    ['MATCH', LookupFunctions.MATCH, { category: FunctionCategory.LOOKUP, minArgs: 2, maxArgs: 3 }],
    ['XMATCH', LookupFunctions.XMATCH, { category: FunctionCategory.LOOKUP, minArgs: 2, maxArgs: 4 }],
    ['CHOOSE', LookupFunctions.CHOOSE, { category: FunctionCategory.LOOKUP, minArgs: 2 }],
    ['OFFSET', LookupFunctions.OFFSET, { category: FunctionCategory.LOOKUP, minArgs: 3, maxArgs: 5 }],
    ['INDIRECT', LookupFunctions.INDIRECT, { category: FunctionCategory.LOOKUP, minArgs: 1, maxArgs: 2 }],
    ['ROW', LookupFunctions.ROW, { category: FunctionCategory.LOOKUP, minArgs: 0, maxArgs: 1 }],
    ['COLUMN', LookupFunctions.COLUMN, { category: FunctionCategory.LOOKUP, minArgs: 0, maxArgs: 1 }],
  ] as const;

  // Statistical functions
  const statisticalFunctions = [
    ['STDEV', StatisticalFunctions.STDEV, { category: FunctionCategory.STATISTICAL }],
    ['STDEV.S', StatisticalFunctions.STDEV_S, { category: FunctionCategory.STATISTICAL }],
    ['STDEV.P', StatisticalFunctions.STDEV_P, { category: FunctionCategory.STATISTICAL }],
    ['VAR', StatisticalFunctions.VAR, { category: FunctionCategory.STATISTICAL }],
    ['VAR.S', StatisticalFunctions.VAR_S, { category: FunctionCategory.STATISTICAL }],
    ['VAR.P', StatisticalFunctions.VAR_P, { category: FunctionCategory.STATISTICAL }],
    ['MEDIAN', StatisticalFunctions.MEDIAN, { category: FunctionCategory.STATISTICAL }],
    ['MODE', StatisticalFunctions.MODE, { category: FunctionCategory.STATISTICAL }],
    ['MODE.SNGL', StatisticalFunctions.MODE_SNGL, { category: FunctionCategory.STATISTICAL }],
    ['MODE.MULT', StatisticalFunctions.MODE_MULT, { category: FunctionCategory.STATISTICAL }],
    ['PERCENTILE', StatisticalFunctions.PERCENTILE, { category: FunctionCategory.STATISTICAL, minArgs: 2, maxArgs: 2 }],
    ['PERCENTILE.INC', StatisticalFunctions.PERCENTILE_INC, { category: FunctionCategory.STATISTICAL, minArgs: 2, maxArgs: 2 }],
    ['PERCENTILE.EXC', StatisticalFunctions.PERCENTILE_EXC, { category: FunctionCategory.STATISTICAL, minArgs: 2, maxArgs: 2 }],
    ['QUARTILE', StatisticalFunctions.QUARTILE, { category: FunctionCategory.STATISTICAL, minArgs: 2, maxArgs: 2 }],
    ['QUARTILE.INC', StatisticalFunctions.QUARTILE_INC, { category: FunctionCategory.STATISTICAL, minArgs: 2, maxArgs: 2 }],
    ['QUARTILE.EXC', StatisticalFunctions.QUARTILE_EXC, { category: FunctionCategory.STATISTICAL, minArgs: 2, maxArgs: 2 }],
    ['RANK', StatisticalFunctions.RANK, { category: FunctionCategory.STATISTICAL, minArgs: 2, maxArgs: 3 }],
    ['RANK.EQ', StatisticalFunctions.RANK_EQ, { category: FunctionCategory.STATISTICAL, minArgs: 2, maxArgs: 3 }],
    ['RANK.AVG', StatisticalFunctions.RANK_AVG, { category: FunctionCategory.STATISTICAL, minArgs: 2, maxArgs: 3 }],
    ['PERCENTRANK', StatisticalFunctions.PERCENTRANK, { category: FunctionCategory.STATISTICAL, minArgs: 2, maxArgs: 3 }],
    ['PERCENTRANK.INC', StatisticalFunctions.PERCENTRANK_INC, { category: FunctionCategory.STATISTICAL, minArgs: 2, maxArgs: 3 }],
    ['PERCENTRANK.EXC', StatisticalFunctions.PERCENTRANK_EXC, { category: FunctionCategory.STATISTICAL, minArgs: 2, maxArgs: 3 }],
    ['LARGE', StatisticalFunctions.LARGE, { category: FunctionCategory.STATISTICAL, minArgs: 2, maxArgs: 2 }],
    ['SMALL', StatisticalFunctions.SMALL, { category: FunctionCategory.STATISTICAL, minArgs: 2, maxArgs: 2 }],
    ['CORREL', StatisticalFunctions.CORREL, { category: FunctionCategory.STATISTICAL, minArgs: 2, maxArgs: 2 }],
    ['PEARSON', StatisticalFunctions.PEARSON, { category: FunctionCategory.STATISTICAL, minArgs: 2, maxArgs: 2 }],
    ['COVARIANCE.P', StatisticalFunctions.COVARIANCE_P, { category: FunctionCategory.STATISTICAL, minArgs: 2, maxArgs: 2 }],
    ['COVARIANCE.S', StatisticalFunctions.COVARIANCE_S, { category: FunctionCategory.STATISTICAL, minArgs: 2, maxArgs: 2 }],
    ['RSQ', StatisticalFunctions.RSQ, { category: FunctionCategory.STATISTICAL, minArgs: 2, maxArgs: 2 }],
    ['SLOPE', StatisticalFunctions.SLOPE, { category: FunctionCategory.STATISTICAL, minArgs: 2, maxArgs: 2 }],
    ['INTERCEPT', StatisticalFunctions.INTERCEPT, { category: FunctionCategory.STATISTICAL, minArgs: 2, maxArgs: 2 }],
    ['FORECAST', StatisticalFunctions.FORECAST, { category: FunctionCategory.STATISTICAL, minArgs: 3, maxArgs: 3 }],
    ['FORECAST.LINEAR', StatisticalFunctions.FORECAST_LINEAR, { category: FunctionCategory.STATISTICAL, minArgs: 3, maxArgs: 3 }],
    ['STEYX', StatisticalFunctions.STEYX, { category: FunctionCategory.STATISTICAL, minArgs: 2, maxArgs: 2 }],
    ['TREND', StatisticalFunctions.TREND, { category: FunctionCategory.STATISTICAL, minArgs: 2, maxArgs: 4 }],
    ['FREQUENCY', StatisticalFunctions.FREQUENCY, { category: FunctionCategory.STATISTICAL, minArgs: 2, maxArgs: 2 }],
    // Week 11 Day 5: Statistical Distribution Functions
    ['NORM.DIST', StatisticalFunctions.NORM_DIST, { category: FunctionCategory.STATISTICAL, minArgs: 4, maxArgs: 4 }],
    ['NORM.INV', StatisticalFunctions.NORM_INV, { category: FunctionCategory.STATISTICAL, minArgs: 3, maxArgs: 3 }],
    ['NORM.S.DIST', StatisticalFunctions.NORM_S_DIST, { category: FunctionCategory.STATISTICAL, minArgs: 2, maxArgs: 2 }],
    ['NORM.S.INV', StatisticalFunctions.NORM_S_INV, { category: FunctionCategory.STATISTICAL, minArgs: 1, maxArgs: 1 }],
    ['BINOM.DIST', StatisticalFunctions.BINOM_DIST, { category: FunctionCategory.STATISTICAL, minArgs: 4, maxArgs: 4 }],
    ['BINOM.INV', StatisticalFunctions.BINOM_INV, { category: FunctionCategory.STATISTICAL, minArgs: 3, maxArgs: 3 }],
    ['POISSON.DIST', StatisticalFunctions.POISSON_DIST, { category: FunctionCategory.STATISTICAL, minArgs: 3, maxArgs: 3 }],
    ['POISSON', StatisticalFunctions.POISSON, { category: FunctionCategory.STATISTICAL, minArgs: 3, maxArgs: 3 }],
    ['EXPON.DIST', StatisticalFunctions.EXPON_DIST, { category: FunctionCategory.STATISTICAL, minArgs: 3, maxArgs: 3 }],
    ['EXPONDIST', StatisticalFunctions.EXPONDIST, { category: FunctionCategory.STATISTICAL, minArgs: 3, maxArgs: 3 }],

    // Database functions (Week 11 Day 6)
    ['DSUM', DatabaseFunctions.DSUM, { category: FunctionCategory.DATABASE, minArgs: 3, maxArgs: 3 }],
    ['DAVERAGE', DatabaseFunctions.DAVERAGE, { category: FunctionCategory.DATABASE, minArgs: 3, maxArgs: 3 }],
    ['DCOUNT', DatabaseFunctions.DCOUNT, { category: FunctionCategory.DATABASE, minArgs: 3, maxArgs: 3 }],
    ['DCOUNTA', DatabaseFunctions.DCOUNTA, { category: FunctionCategory.DATABASE, minArgs: 3, maxArgs: 3 }],
    ['DMAX', DatabaseFunctions.DMAX, { category: FunctionCategory.DATABASE, minArgs: 3, maxArgs: 3 }],
    ['DMIN', DatabaseFunctions.DMIN, { category: FunctionCategory.DATABASE, minArgs: 3, maxArgs: 3 }],
    ['DGET', DatabaseFunctions.DGET, { category: FunctionCategory.DATABASE, minArgs: 3, maxArgs: 3 }],
    ['DSTDEV', DatabaseFunctions.DSTDEV, { category: FunctionCategory.DATABASE, minArgs: 3, maxArgs: 3 }],
    ['DSTDEVP', DatabaseFunctions.DSTDEVP, { category: FunctionCategory.DATABASE, minArgs: 3, maxArgs: 3 }],
    ['DVAR', DatabaseFunctions.DVAR, { category: FunctionCategory.DATABASE, minArgs: 3, maxArgs: 3 }],

    // Week 11 Day 7: Regression Functions
    ['LINEST', StatisticalFunctions.LINEST, { category: FunctionCategory.STATISTICAL, minArgs: 1, maxArgs: 4 }],
    ['LOGEST', StatisticalFunctions.LOGEST, { category: FunctionCategory.STATISTICAL, minArgs: 1, maxArgs: 4 }],
    ['GROWTH', StatisticalFunctions.GROWTH, { category: FunctionCategory.STATISTICAL, minArgs: 1, maxArgs: 4 }],
    
    // Week 11 Day 7: A-Variant Statistical Functions
    ['MAXA', StatisticalFunctions.MAXA, { category: FunctionCategory.STATISTICAL, minArgs: 1 }],
    ['MINA', StatisticalFunctions.MINA, { category: FunctionCategory.STATISTICAL, minArgs: 1 }],
    ['STDEVA', StatisticalFunctions.STDEVA, { category: FunctionCategory.STATISTICAL, minArgs: 1 }],
    ['STDEVPA', StatisticalFunctions.STDEVPA, { category: FunctionCategory.STATISTICAL, minArgs: 1 }],
    ['VARA', StatisticalFunctions.VARA, { category: FunctionCategory.STATISTICAL, minArgs: 1 }],
    ['VARPA', StatisticalFunctions.VARPA, { category: FunctionCategory.STATISTICAL, minArgs: 1 }],
    
    // Week 11 Day 7: Additional Statistical Functions
    ['DEVSQ', StatisticalFunctions.DEVSQ, { category: FunctionCategory.STATISTICAL, minArgs: 1 }],
    ['AVEDEV', StatisticalFunctions.AVEDEV, { category: FunctionCategory.STATISTICAL, minArgs: 1 }],
    ['GEOMEAN', StatisticalFunctions.GEOMEAN, { category: FunctionCategory.STATISTICAL, minArgs: 1 }],
    ['HARMEAN', StatisticalFunctions.HARMEAN, { category: FunctionCategory.STATISTICAL, minArgs: 1 }],
    ['FISHER', StatisticalFunctions.FISHER, { category: FunctionCategory.STATISTICAL, minArgs: 1, maxArgs: 1 }],
    ['FISHERINV', StatisticalFunctions.FISHERINV, { category: FunctionCategory.STATISTICAL, minArgs: 1, maxArgs: 1 }],

    ['COUNTBLANK', StatisticalFunctions.COUNTBLANK, { category: FunctionCategory.STATISTICAL, minArgs: 1, maxArgs: 1 }],
    ['COUNTIF', StatisticalFunctions.COUNTIF, { category: FunctionCategory.STATISTICAL, minArgs: 2, maxArgs: 2 }],
    ['SUMIF', StatisticalFunctions.SUMIF, { category: FunctionCategory.STATISTICAL, minArgs: 2, maxArgs: 3 }],
    ['AVERAGEIF', StatisticalFunctions.AVERAGEIF, { category: FunctionCategory.STATISTICAL, minArgs: 2, maxArgs: 3 }],
    ['COUNTIFS', StatisticalFunctions.COUNTIFS, { category: FunctionCategory.STATISTICAL, minArgs: 2 }],
    ['SUMIFS', StatisticalFunctions.SUMIFS, { category: FunctionCategory.STATISTICAL, minArgs: 3 }],
    ['AVERAGEIFS', StatisticalFunctions.AVERAGEIFS, { category: FunctionCategory.STATISTICAL, minArgs: 3 }],
    ['MAXIFS', StatisticalFunctions.MAXIFS, { category: FunctionCategory.STATISTICAL, minArgs: 3 }],
    ['MINIFS', StatisticalFunctions.MINIFS, { category: FunctionCategory.STATISTICAL, minArgs: 3 }],
  ] as const;

  // Functional programming functions (Excel 365 advanced)
  const functionalFunctions = [
    ['MAP', FunctionalFunctions.MAP, { category: FunctionCategory.LAMBDA, minArgs: 2, maxArgs: 2, isSpecial: true }],
    ['REDUCE', FunctionalFunctions.REDUCE, { category: FunctionCategory.LAMBDA, minArgs: 3, maxArgs: 3, isSpecial: true }],
    ['BYROW', FunctionalFunctions.BYROW, { category: FunctionCategory.LAMBDA, minArgs: 2, maxArgs: 2, isSpecial: true }],
    ['BYCOL', FunctionalFunctions.BYCOL, { category: FunctionCategory.LAMBDA, minArgs: 2, maxArgs: 2, isSpecial: true }],
    ['SCAN', FunctionalFunctions.SCAN, { category: FunctionCategory.LAMBDA, minArgs: 2, maxArgs: 3, isSpecial: true }],
    ['LAMBDA', FunctionalFunctions.LAMBDA, { category: FunctionCategory.LAMBDA, minArgs: 2, isSpecial: true }],
    ['LET', FunctionalFunctions.LET, { category: FunctionCategory.LAMBDA, minArgs: 3, isSpecial: true }],
    ['MAKEARRAY', FunctionalFunctions.MAKEARRAY, { category: FunctionCategory.LAMBDA, minArgs: 3, maxArgs: 3, isSpecial: true }],
  ] as const;

  // Financial functions (Week 8 Days 4-5)
  const financialFunctions = [
    ['NPV', FinancialFunctions.NPV, { category: FunctionCategory.FINANCIAL, minArgs: 2 }],
    ['XNPV', FinancialFunctions.XNPV, { category: FunctionCategory.FINANCIAL, minArgs: 3, maxArgs: 3 }],
    ['PV', FinancialFunctions.PV, { category: FunctionCategory.FINANCIAL, minArgs: 3, maxArgs: 5 }],
    ['FV', FinancialFunctions.FV, { category: FunctionCategory.FINANCIAL, minArgs: 3, maxArgs: 5 }],
    ['PMT', FinancialFunctions.PMT, { category: FunctionCategory.FINANCIAL, minArgs: 3, maxArgs: 5 }],
    ['IPMT', FinancialFunctions.IPMT, { category: FunctionCategory.FINANCIAL, minArgs: 4, maxArgs: 6 }],
    ['PPMT', FinancialFunctions.PPMT, { category: FunctionCategory.FINANCIAL, minArgs: 4, maxArgs: 6 }],
    ['IRR', FinancialFunctions.IRR, { category: FunctionCategory.FINANCIAL, minArgs: 1, maxArgs: 2 }],
    ['XIRR', FinancialFunctions.XIRR, { category: FunctionCategory.FINANCIAL, minArgs: 2, maxArgs: 3 }],
    ['NPER', FinancialFunctions.NPER, { category: FunctionCategory.FINANCIAL, minArgs: 3, maxArgs: 5 }],
    ['RATE', FinancialFunctions.RATE, { category: FunctionCategory.FINANCIAL, minArgs: 3, maxArgs: 6 }],
    ['EFFECT', FinancialFunctions.EFFECT, { category: FunctionCategory.FINANCIAL, minArgs: 2, maxArgs: 2 }],
    ['NOMINAL', FinancialFunctions.NOMINAL, { category: FunctionCategory.FINANCIAL, minArgs: 2, maxArgs: 2 }],
  ] as const;

  // Information functions (Week 10 Day 2, Week 11 Day 1)
  const informationFunctions = [
    ['ISFORMULA', InformationFunctions.ISFORMULA, { category: FunctionCategory.INFORMATION, minArgs: 1, maxArgs: 1, needsContext: true }],
    ['ISREF', InformationFunctions.ISREF, { category: FunctionCategory.INFORMATION, minArgs: 1, maxArgs: 1 }],
    ['CELL', InformationFunctions.CELL, { category: FunctionCategory.INFORMATION, minArgs: 1, maxArgs: 2, needsContext: true }],
    ['INFO', InformationFunctions.INFO, { category: FunctionCategory.INFORMATION, minArgs: 1, maxArgs: 1 }],
    // Week 11 Day 1: Type checking functions
    ['ISNUMBER', InformationFunctions.ISNUMBER, { category: FunctionCategory.INFORMATION, minArgs: 1, maxArgs: 1 }],
    ['ISTEXT', InformationFunctions.ISTEXT, { category: FunctionCategory.INFORMATION, minArgs: 1, maxArgs: 1 }],
    ['ISBLANK', InformationFunctions.ISBLANK, { category: FunctionCategory.INFORMATION, minArgs: 1, maxArgs: 1 }],
    ['ISLOGICAL', InformationFunctions.ISLOGICAL, { category: FunctionCategory.INFORMATION, minArgs: 1, maxArgs: 1 }],
    ['ISNONTEXT', InformationFunctions.ISNONTEXT, { category: FunctionCategory.INFORMATION, minArgs: 1, maxArgs: 1 }],
    ['TYPE', InformationFunctions.TYPE, { category: FunctionCategory.INFORMATION, minArgs: 1, maxArgs: 1 }],
    ['N', InformationFunctions.N, { category: FunctionCategory.INFORMATION, minArgs: 1, maxArgs: 1 }],
    ['T', InformationFunctions.T, { category: FunctionCategory.INFORMATION, minArgs: 1, maxArgs: 1 }],
  ] as const;

  // Engineering functions (Week 10 Days 3-5)
  const engineeringFunctions = [
    // Binary conversions (Day 3)
    ['BIN2DEC', EngineeringFunctions.BIN2DEC, { category: FunctionCategory.ENGINEERING, minArgs: 1, maxArgs: 1 }],
    ['BIN2HEX', EngineeringFunctions.BIN2HEX, { category: FunctionCategory.ENGINEERING, minArgs: 1, maxArgs: 2 }],
    ['BIN2OCT', EngineeringFunctions.BIN2OCT, { category: FunctionCategory.ENGINEERING, minArgs: 1, maxArgs: 2 }],
    // Decimal conversions (Day 3)
    ['DEC2BIN', EngineeringFunctions.DEC2BIN, { category: FunctionCategory.ENGINEERING, minArgs: 1, maxArgs: 2 }],
    ['DEC2HEX', EngineeringFunctions.DEC2HEX, { category: FunctionCategory.ENGINEERING, minArgs: 1, maxArgs: 2 }],
    ['DEC2OCT', EngineeringFunctions.DEC2OCT, { category: FunctionCategory.ENGINEERING, minArgs: 1, maxArgs: 2 }],
    // Hexadecimal conversions (Day 3)
    ['HEX2BIN', EngineeringFunctions.HEX2BIN, { category: FunctionCategory.ENGINEERING, minArgs: 1, maxArgs: 2 }],
    ['HEX2DEC', EngineeringFunctions.HEX2DEC, { category: FunctionCategory.ENGINEERING, minArgs: 1, maxArgs: 1 }],
    ['HEX2OCT', EngineeringFunctions.HEX2OCT, { category: FunctionCategory.ENGINEERING, minArgs: 1, maxArgs: 2 }],
    // Octal conversions (Day 3)
    ['OCT2BIN', EngineeringFunctions.OCT2BIN, { category: FunctionCategory.ENGINEERING, minArgs: 1, maxArgs: 2 }],
    ['OCT2DEC', EngineeringFunctions.OCT2DEC, { category: FunctionCategory.ENGINEERING, minArgs: 1, maxArgs: 1 }],
    ['OCT2HEX', EngineeringFunctions.OCT2HEX, { category: FunctionCategory.ENGINEERING, minArgs: 1, maxArgs: 2 }],
    // Bitwise operations (Day 4)
    ['BITAND', EngineeringFunctions.BITAND, { category: FunctionCategory.ENGINEERING, minArgs: 2, maxArgs: 2 }],
    ['BITOR', EngineeringFunctions.BITOR, { category: FunctionCategory.ENGINEERING, minArgs: 2, maxArgs: 2 }],
    ['BITXOR', EngineeringFunctions.BITXOR, { category: FunctionCategory.ENGINEERING, minArgs: 2, maxArgs: 2 }],
    ['BITLSHIFT', EngineeringFunctions.BITLSHIFT, { category: FunctionCategory.ENGINEERING, minArgs: 2, maxArgs: 2 }],
    ['BITRSHIFT', EngineeringFunctions.BITRSHIFT, { category: FunctionCategory.ENGINEERING, minArgs: 2, maxArgs: 2 }],
    // Complex numbers (Day 5)
    ['COMPLEX', EngineeringFunctions.COMPLEX, { category: FunctionCategory.ENGINEERING, minArgs: 2, maxArgs: 3 }],
    ['IMREAL', EngineeringFunctions.IMREAL, { category: FunctionCategory.ENGINEERING, minArgs: 1, maxArgs: 1 }],
    ['IMAGINARY', EngineeringFunctions.IMAGINARY, { category: FunctionCategory.ENGINEERING, minArgs: 1, maxArgs: 1 }],
    ['IMABS', EngineeringFunctions.IMABS, { category: FunctionCategory.ENGINEERING, minArgs: 1, maxArgs: 1 }],
    ['IMARGUMENT', EngineeringFunctions.IMARGUMENT, { category: FunctionCategory.ENGINEERING, minArgs: 1, maxArgs: 1 }],
    ['IMCONJUGATE', EngineeringFunctions.IMCONJUGATE, { category: FunctionCategory.ENGINEERING, minArgs: 1, maxArgs: 1 }],
    // Week 11 Day 4: Complex Number Arithmetic
    ['IMADD', EngineeringFunctions.IMADD, { category: FunctionCategory.ENGINEERING, minArgs: 2, maxArgs: 2 }],
    ['IMSUB', EngineeringFunctions.IMSUB, { category: FunctionCategory.ENGINEERING, minArgs: 2, maxArgs: 2 }],
    ['IMMULT', EngineeringFunctions.IMMULT, { category: FunctionCategory.ENGINEERING, minArgs: 2, maxArgs: 2 }],
    ['IMDIV', EngineeringFunctions.IMDIV, { category: FunctionCategory.ENGINEERING, minArgs: 2, maxArgs: 2 }],
    ['IMPOWER', EngineeringFunctions.IMPOWER, { category: FunctionCategory.ENGINEERING, minArgs: 2, maxArgs: 2 }],
    ['IMSQRT', EngineeringFunctions.IMSQRT, { category: FunctionCategory.ENGINEERING, minArgs: 1, maxArgs: 1 }],
    ['IMEXP', EngineeringFunctions.IMEXP, { category: FunctionCategory.ENGINEERING, minArgs: 1, maxArgs: 1 }],
    ['IMLN', EngineeringFunctions.IMLN, { category: FunctionCategory.ENGINEERING, minArgs: 1, maxArgs: 1 }],
    ['IMLOG10', EngineeringFunctions.IMLOG10, { category: FunctionCategory.ENGINEERING, minArgs: 1, maxArgs: 1 }],
    ['IMLOG2', EngineeringFunctions.IMLOG2, { category: FunctionCategory.ENGINEERING, minArgs: 1, maxArgs: 1 }],
    ['IMSIN', EngineeringFunctions.IMSIN, { category: FunctionCategory.ENGINEERING, minArgs: 1, maxArgs: 1 }],
    ['IMCOS', EngineeringFunctions.IMCOS, { category: FunctionCategory.ENGINEERING, minArgs: 1, maxArgs: 1 }],
    ['IMTAN', EngineeringFunctions.IMTAN, { category: FunctionCategory.ENGINEERING, minArgs: 1, maxArgs: 1 }],
    ['IMSEC', EngineeringFunctions.IMSEC, { category: FunctionCategory.ENGINEERING, minArgs: 1, maxArgs: 1 }],
    ['IMCSC', EngineeringFunctions.IMCSC, { category: FunctionCategory.ENGINEERING, minArgs: 1, maxArgs: 1 }],
    ['IMCOT', EngineeringFunctions.IMCOT, { category: FunctionCategory.ENGINEERING, minArgs: 1, maxArgs: 1 }],
    ['IMSINH', EngineeringFunctions.IMSINH, { category: FunctionCategory.ENGINEERING, minArgs: 1, maxArgs: 1 }],
    ['IMCOSH', EngineeringFunctions.IMCOSH, { category: FunctionCategory.ENGINEERING, minArgs: 1, maxArgs: 1 }],
    ['IMSECH', EngineeringFunctions.IMSECH, { category: FunctionCategory.ENGINEERING, minArgs: 1, maxArgs: 1 }],
    ['IMCSCH', EngineeringFunctions.IMCSCH, { category: FunctionCategory.ENGINEERING, minArgs: 1, maxArgs: 1 }],
  ] as const;

  // Batch register all functions
  registry.registerBatch(mathFunctions as any);
  registry.registerBatch(textFunctions as any);
  registry.registerBatch(logicalFunctions as any);
  registry.registerBatch(arrayFunctions as any);
  registry.registerBatch(dateTimeFunctions as any);
  registry.registerBatch(lookupFunctions as any);
  registry.registerBatch(statisticalFunctions as any);
  registry.registerBatch(functionalFunctions as any);
  registry.registerBatch(financialFunctions as any);
  registry.registerBatch(informationFunctions as any);
  registry.registerBatch(engineeringFunctions as any);
}
