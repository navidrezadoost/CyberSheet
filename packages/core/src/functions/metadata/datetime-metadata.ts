/**
 * datetime-metadata.ts
 * 
 * Wave 0 Day 2: Strict Metadata Backfill - Date/Time Category
 * 
 * ⚠️ CRITICAL CATEGORY: Contains volatile functions (NOW, TODAY)
 * These functions are PRIMARY REASON for volatile flag
 * 
 * ⚠️ DEPENDENCY: Wave 0 Day 10 (DateSystemPolicy) will affect all functions here
 * 
 * Classification Rules:
 * - NOW/TODAY → VOLATILE (always recalculate)
 * - Date arithmetic → O(1) or O(n) (NETWORKDAYS, WORKDAY iterate over dates)
 * - All functions need DateSystemPolicy for 1900 vs 1904 serial number handling
 */

import { 
  FunctionCategory,
  ComplexityClass,
  PrecisionClass,
  ErrorStrategy,
  type StrictFunctionMetadata 
} from '../../types/formula-types';
import * as DateTimeFunctions from '../datetime';

/**
 * Date/Time Category: Strict Metadata
 * 
 * Total Functions: 20
 * 
 * Complexity Distribution:
 * - O(1): 18 (most date operations are constant time)
 * - O(n): 2 (NETWORKDAYS, WORKDAY - iterate over date ranges)
 * 
 * Precision: ALL EXACT (date serial numbers are integers or precise timestamps)
 * Volatile: 2 (NOW, TODAY) ⚠️ CRITICAL
 * 
 * DateSystemPolicy Dependency:
 * - ALL functions depend on 1900 vs 1904 base date
 * - DATEDIF, DAYS, NETWORKDAYS, WORKDAY sensitive to day-count conventions
 * - Wave 0 Day 10 will add dateSystem configuration
 */

export const DATETIME_METADATA: StrictFunctionMetadata[] = [
  // ============================================================================
  // VOLATILE FUNCTIONS (⚠️ CRITICAL)
  // ============================================================================
  
  {
    name: 'NOW',
    handler: DateTimeFunctions.NOW,
    category: FunctionCategory.DATE_TIME,
    minArgs: 0,
    maxArgs: 0,
    isSpecial: false,
    needsContext: false,
    volatile: true,                                 // ⚠️ VOLATILE: Always recalculate
    complexityClass: ComplexityClass.O_1,
    precisionClass: PrecisionClass.EXACT,           // Timestamp (precise to millisecond)
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  {
    name: 'TODAY',
    handler: DateTimeFunctions.TODAY,
    category: FunctionCategory.DATE_TIME,
    minArgs: 0,
    maxArgs: 0,
    isSpecial: false,
    needsContext: false,
    volatile: true,                                 // ⚠️ VOLATILE: Always recalculate
    complexityClass: ComplexityClass.O_1,
    precisionClass: PrecisionClass.EXACT,           // Date (integer serial number)
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  // ============================================================================
  // DATE CONSTRUCTION (O(1))
  // ============================================================================
  
  {
    name: 'DATE',
    handler: DateTimeFunctions.DATE,
    category: FunctionCategory.DATE_TIME,
    minArgs: 3,
    maxArgs: 3,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,
    precisionClass: PrecisionClass.EXACT,           // Date serial number (integer)
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  {
    name: 'TIME',
    handler: DateTimeFunctions.TIME,
    category: FunctionCategory.DATE_TIME,
    minArgs: 3,
    maxArgs: 3,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,
    precisionClass: PrecisionClass.EXACT,           // Time fraction (0 to 1)
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  {
    name: 'DATEVALUE',
    handler: DateTimeFunctions.DATEVALUE,
    category: FunctionCategory.DATE_TIME,
    minArgs: 1,
    maxArgs: 1,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,           // String parsing (O(1) for typical dates)
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  {
    name: 'TIMEVALUE',
    handler: DateTimeFunctions.TIMEVALUE,
    category: FunctionCategory.DATE_TIME,
    minArgs: 1,
    maxArgs: 1,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  // ============================================================================
  // DATE EXTRACTION (O(1))
  // ============================================================================
  
  {
    name: 'YEAR',
    handler: DateTimeFunctions.YEAR,
    category: FunctionCategory.DATE_TIME,
    minArgs: 1,
    maxArgs: 1,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,
    precisionClass: PrecisionClass.EXACT,           // Integer year
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  {
    name: 'MONTH',
    handler: DateTimeFunctions.MONTH,
    category: FunctionCategory.DATE_TIME,
    minArgs: 1,
    maxArgs: 1,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,
    precisionClass: PrecisionClass.EXACT,           // Integer month (1-12)
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  {
    name: 'DAY',
    handler: DateTimeFunctions.DAY,
    category: FunctionCategory.DATE_TIME,
    minArgs: 1,
    maxArgs: 1,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,
    precisionClass: PrecisionClass.EXACT,           // Integer day (1-31)
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  {
    name: 'HOUR',
    handler: DateTimeFunctions.HOUR,
    category: FunctionCategory.DATE_TIME,
    minArgs: 1,
    maxArgs: 1,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,
    precisionClass: PrecisionClass.EXACT,           // Integer hour (0-23)
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  {
    name: 'MINUTE',
    handler: DateTimeFunctions.MINUTE,
    category: FunctionCategory.DATE_TIME,
    minArgs: 1,
    maxArgs: 1,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,
    precisionClass: PrecisionClass.EXACT,           // Integer minute (0-59)
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  {
    name: 'SECOND',
    handler: DateTimeFunctions.SECOND,
    category: FunctionCategory.DATE_TIME,
    minArgs: 1,
    maxArgs: 1,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,
    precisionClass: PrecisionClass.EXACT,           // Integer second (0-59)
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  {
    name: 'WEEKDAY',
    handler: DateTimeFunctions.WEEKDAY,
    category: FunctionCategory.DATE_TIME,
    minArgs: 1,
    maxArgs: 2,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,
    precisionClass: PrecisionClass.EXACT,           // Integer weekday (1-7)
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  {
    name: 'WEEKNUM',
    handler: DateTimeFunctions.WEEKNUM,
    category: FunctionCategory.DATE_TIME,
    minArgs: 1,
    maxArgs: 2,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,
    precisionClass: PrecisionClass.EXACT,           // Integer week number
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  // ============================================================================
  // DATE ARITHMETIC (O(1))
  // ============================================================================
  
  {
    name: 'DAYS',
    handler: DateTimeFunctions.DAYS,
    category: FunctionCategory.DATE_TIME,
    minArgs: 2,
    maxArgs: 2,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,           // Simple subtraction
    precisionClass: PrecisionClass.EXACT,           // Integer day count
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  {
    name: 'DATEDIF',
    handler: DateTimeFunctions.DATEDIF,
    category: FunctionCategory.DATE_TIME,
    minArgs: 3,
    maxArgs: 3,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,           // Date difference calculation
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  {
    name: 'EDATE',
    handler: DateTimeFunctions.EDATE,
    category: FunctionCategory.DATE_TIME,
    minArgs: 2,
    maxArgs: 2,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,           // Add months to date
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  {
    name: 'EOMONTH',
    handler: DateTimeFunctions.EOMONTH,
    category: FunctionCategory.DATE_TIME,
    minArgs: 2,
    maxArgs: 2,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,           // End of month calculation
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  // ============================================================================
  // WORKDAY CALCULATIONS (O(n))
  // ============================================================================
  
  {
    name: 'NETWORKDAYS',
    handler: DateTimeFunctions.NETWORKDAYS,
    category: FunctionCategory.DATE_TIME,
    minArgs: 2,
    maxArgs: 3,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_N,           // ⚠️ Iterates over date range (n = days between dates)
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  {
    name: 'WORKDAY',
    handler: DateTimeFunctions.WORKDAY,
    category: FunctionCategory.DATE_TIME,
    minArgs: 2,
    maxArgs: 3,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_N,           // ⚠️ Iterates over date range (n = days parameter)
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
];

/**
 * Date/Time Category Summary:
 * 
 * Total: 20 functions classified
 * 
 * Complexity:
 * - O(1): 18 (most date operations are constant time)
 * - O(n): 2 (NETWORKDAYS, WORKDAY - iterate over date ranges)
 * 
 * Precision:
 * - EXACT: 20 (all - date serial numbers are integers or precise timestamps)
 * 
 * Error Strategy:
 * - PROPAGATE_FIRST: 20 (all - standard propagation)
 * 
 * Volatile: 2 (NOW, TODAY) ⚠️ CRITICAL for scheduler integration
 * 
 * Critical Dependencies:
 * - Wave 0 Day 10: DateSystemPolicy (1900 vs 1904, leap year bug)
 * - All functions depend on date serial number conventions
 * - NETWORKDAYS/WORKDAY depend on holiday calendar handling
 * 
 * Performance Notes:
 * - NETWORKDAYS: O(n) where n = days between start and end date
 * - WORKDAY: O(n) where n = days parameter (could be 100+ for 5-month workday calculation)
 * - Conservative classification: O(n) even though n is typically small (< 1000)
 */
