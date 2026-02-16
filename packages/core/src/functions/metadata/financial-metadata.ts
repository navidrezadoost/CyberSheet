/**
 * financial-metadata.ts
 * 
 * Wave 0 Day 2: Strict Metadata Backfill - Financial Category
 * 
 * ⚠️ CRITICAL CATEGORY: Contains iterative functions (IRR, XIRR)
 * These functions are the PRIMARY REASON for Wave 0 iteration policy
 * 
 * Classification Rules:
 * - All iterative solvers → ITERATIVE complexity
 * - Financial precision → FINANCIAL (±$0.01 tolerance)
 * - Date-dependent functions need DateSystemPolicy (Wave 0 Day 10)
 */

import { 
  FunctionCategory,
  ComplexityClass,
  PrecisionClass,
  ErrorStrategy,
  type StrictFunctionMetadata,
  type IterationPolicy
} from '../../types/formula-types';
import * as FinancialFunctions from '../financial';

/**
 * Standard Iteration Policy for Financial Functions
 * 
 * Used by: IRR, XIRR, RATE, YIELD, PRICE (future)
 * Algorithm: Newton-Raphson (fastest convergence for smooth functions)
 * Max Iterations: 100 (Excel default)
 * Tolerance: 1e-7 (financial precision)
 */
const FINANCIAL_ITERATION_POLICY: IterationPolicy = {
  maxIterations: 100,
  tolerance: 1e-7,
  algorithm: 'newton'
};

/**
 * Financial Category: Strict Metadata
 * 
 * Total Functions: 10+ (NPV, PV, FV, PMT, IRR, XIRR, RATE, NPER, IPMT, PPMT, etc.)
 * 
 * Complexity Distribution:
 * - O(1): 7 (PV, FV, PMT, NPER, IPMT, PPMT, simple calculations)
 * - O(n): 2 (NPV, XNPV - linear scan of cashflows)
 * - ITERATIVE: 3 (IRR, XIRR, RATE - Newton-Raphson)
 * 
 * Precision: ALL functions use FINANCIAL precision (±$0.01)
 * Error Strategy: FINANCIAL_STRICT (strict coercion, no implicit text→number)
 */

export const FINANCIAL_METADATA: StrictFunctionMetadata[] = [
  // ============================================================================
  // TIME VALUE OF MONEY (O(1))
  // ============================================================================
  
  {
    name: 'PV',
    handler: FinancialFunctions.PV,
    category: FunctionCategory.FINANCIAL,
    minArgs: 3,
    maxArgs: 5,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,
    precisionClass: PrecisionClass.FINANCIAL,      // ±$0.01 tolerance
    errorStrategy: ErrorStrategy.FINANCIAL_STRICT, // Strict coercion for financial
    iterationPolicy: null,
  },
  
  {
    name: 'FV',
    handler: FinancialFunctions.FV,
    category: FunctionCategory.FINANCIAL,
    minArgs: 3,
    maxArgs: 5,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,
    precisionClass: PrecisionClass.FINANCIAL,
    errorStrategy: ErrorStrategy.FINANCIAL_STRICT,
    iterationPolicy: null,
  },
  
  {
    name: 'PMT',
    handler: FinancialFunctions.PMT,
    category: FunctionCategory.FINANCIAL,
    minArgs: 3,
    maxArgs: 5,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,
    precisionClass: PrecisionClass.FINANCIAL,
    errorStrategy: ErrorStrategy.FINANCIAL_STRICT,
    iterationPolicy: null,
  },
  
  {
    name: 'NPER',
    handler: FinancialFunctions.NPER,
    category: FunctionCategory.FINANCIAL,
    minArgs: 3,
    maxArgs: 5,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,          // Closed-form solution (no iteration)
    precisionClass: PrecisionClass.FINANCIAL,
    errorStrategy: ErrorStrategy.FINANCIAL_STRICT,
    iterationPolicy: null,
  },
  
  {
    name: 'IPMT',
    handler: FinancialFunctions.IPMT,
    category: FunctionCategory.FINANCIAL,
    minArgs: 4,
    maxArgs: 6,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,
    precisionClass: PrecisionClass.FINANCIAL,
    errorStrategy: ErrorStrategy.FINANCIAL_STRICT,
    iterationPolicy: null,
  },
  
  {
    name: 'PPMT',
    handler: FinancialFunctions.PPMT,
    category: FunctionCategory.FINANCIAL,
    minArgs: 4,
    maxArgs: 6,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,
    precisionClass: PrecisionClass.FINANCIAL,
    errorStrategy: ErrorStrategy.FINANCIAL_STRICT,
    iterationPolicy: null,
  },
  
  {
    name: 'CUMIPMT',
    handler: FinancialFunctions.CUMIPMT,
    category: FunctionCategory.FINANCIAL,
    minArgs: 6,
    maxArgs: 6,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_N,          // Loop from start_period to end_period
    precisionClass: PrecisionClass.FINANCIAL,
    errorStrategy: ErrorStrategy.FINANCIAL_STRICT,
    iterationPolicy: null,
  },
  
  {
    name: 'CUMPRINC',
    handler: FinancialFunctions.CUMPRINC,
    category: FunctionCategory.FINANCIAL,
    minArgs: 6,
    maxArgs: 6,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_N,          // Loop from start_period to end_period
    precisionClass: PrecisionClass.FINANCIAL,
    errorStrategy: ErrorStrategy.FINANCIAL_STRICT,
    iterationPolicy: null,
  },
  
  // ============================================================================
  // NET PRESENT VALUE (O(n))
  // ============================================================================
  
  {
    name: 'NPV',
    handler: FinancialFunctions.NPV,
    category: FunctionCategory.FINANCIAL,
    minArgs: 2,
    maxArgs: 255,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_N,          // Linear scan of cashflows
    precisionClass: PrecisionClass.FINANCIAL,
    errorStrategy: ErrorStrategy.FINANCIAL_STRICT,
    iterationPolicy: null,
  },
  
  {
    name: 'XNPV',
    handler: FinancialFunctions.XNPV,
    category: FunctionCategory.FINANCIAL,
    minArgs: 3,
    maxArgs: 3,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_N,          // Linear scan of irregular cashflows
    precisionClass: PrecisionClass.FINANCIAL,
    errorStrategy: ErrorStrategy.FINANCIAL_STRICT,
    iterationPolicy: null,
  },
  
  // ============================================================================
  // ITERATIVE SOLVERS (ITERATIVE) — ⚠️ CRITICAL FOR WAVE 0
  // ============================================================================
  
  {
    name: 'IRR',
    handler: FinancialFunctions.IRR,
    category: FunctionCategory.FINANCIAL,
    minArgs: 1,
    maxArgs: 2,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.ITERATIVE,    // ⚠️ Newton-Raphson iteration
    precisionClass: PrecisionClass.ITERATIVE,      // Convergence-dependent precision
    errorStrategy: ErrorStrategy.FINANCIAL_STRICT,
    iterationPolicy: FINANCIAL_ITERATION_POLICY,   // ⚠️ Uses shared iteration abstraction
  },
  
  {
    name: 'XIRR',
    handler: FinancialFunctions.XIRR,
    category: FunctionCategory.FINANCIAL,
    minArgs: 2,
    maxArgs: 3,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.ITERATIVE,    // ⚠️ Newton-Raphson iteration (irregular dates)
    precisionClass: PrecisionClass.ITERATIVE,
    errorStrategy: ErrorStrategy.FINANCIAL_STRICT,
    iterationPolicy: FINANCIAL_ITERATION_POLICY,   // ⚠️ Uses shared iteration abstraction
  },
  
  {
    name: 'RATE',
    handler: FinancialFunctions.RATE,
    category: FunctionCategory.FINANCIAL,
    minArgs: 3,
    maxArgs: 6,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.ITERATIVE,    // ⚠️ Newton-Raphson iteration
    precisionClass: PrecisionClass.ITERATIVE,
    errorStrategy: ErrorStrategy.FINANCIAL_STRICT,
    iterationPolicy: FINANCIAL_ITERATION_POLICY,   // ⚠️ Uses shared iteration abstraction
  },
  
  {
    name: 'MIRR',
    handler: FinancialFunctions.MIRR,
    category: FunctionCategory.FINANCIAL,
    minArgs: 3,
    maxArgs: 3,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_N,          // Modified IRR (no iteration, closed-form)
    precisionClass: PrecisionClass.FINANCIAL,
    errorStrategy: ErrorStrategy.FINANCIAL_STRICT,
    iterationPolicy: null,                          // MIRR doesn't iterate (uses NPV formula)
  },
  
  // ============================================================================
  // DEPRECIATION (O(1) or O(n))
  // ============================================================================
  
  {
    name: 'SLN',
    handler: FinancialFunctions.SLN,
    category: FunctionCategory.FINANCIAL,
    minArgs: 3,
    maxArgs: 3,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,          // Straight-line depreciation (simple division)
    precisionClass: PrecisionClass.FINANCIAL,
    errorStrategy: ErrorStrategy.FINANCIAL_STRICT,
    iterationPolicy: null,
  },
  
  {
    name: 'DB',
    handler: FinancialFunctions.DB,
    category: FunctionCategory.FINANCIAL,
    minArgs: 4,
    maxArgs: 5,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_N,          // Declining balance (loops to period)
    precisionClass: PrecisionClass.FINANCIAL,
    errorStrategy: ErrorStrategy.FINANCIAL_STRICT,
    iterationPolicy: null,
  },
  
  {
    name: 'DDB',
    handler: FinancialFunctions.DDB,
    category: FunctionCategory.FINANCIAL,
    minArgs: 4,
    maxArgs: 5,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_N,          // Double declining balance (loops to period)
    precisionClass: PrecisionClass.FINANCIAL,
    errorStrategy: ErrorStrategy.FINANCIAL_STRICT,
    iterationPolicy: null,
  },
  
  {
    name: 'SYD',
    handler: FinancialFunctions.SYD,
    category: FunctionCategory.FINANCIAL,
    minArgs: 4,
    maxArgs: 4,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,          // Sum-of-years-digits (closed-form)
    precisionClass: PrecisionClass.FINANCIAL,
    errorStrategy: ErrorStrategy.FINANCIAL_STRICT,
    iterationPolicy: null,
  },
  
  {
    name: 'VDB',
    handler: FinancialFunctions.VDB,
    category: FunctionCategory.FINANCIAL,
    minArgs: 5,
    maxArgs: 7,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_N,          // Variable declining balance (complex loop)
    precisionClass: PrecisionClass.FINANCIAL,
    errorStrategy: ErrorStrategy.FINANCIAL_STRICT,
    iterationPolicy: null,
  },
  
  // ============================================================================
  // VARIABLE RATE & DISCOUNT FUNCTIONS
  // ============================================================================
  
  {
    name: 'FVSCHEDULE',
    handler: FinancialFunctions.FVSCHEDULE,
    category: FunctionCategory.FINANCIAL,
    minArgs: 2,
    maxArgs: 2,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_N,
    precisionClass: PrecisionClass.FINANCIAL,
    errorStrategy: ErrorStrategy.FINANCIAL_STRICT,
    iterationPolicy: null,
  },
  
  {
    name: 'DISC',
    handler: FinancialFunctions.DISC,
    category: FunctionCategory.FINANCIAL,
    minArgs: 4,
    maxArgs: 5,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,
    precisionClass: PrecisionClass.FINANCIAL,
    errorStrategy: ErrorStrategy.FINANCIAL_STRICT,
    iterationPolicy: null,
  },
  
  {
    name: 'INTRATE',
    handler: FinancialFunctions.INTRATE,
    category: FunctionCategory.FINANCIAL,
    minArgs: 4,
    maxArgs: 5,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,
    precisionClass: PrecisionClass.FINANCIAL,
    errorStrategy: ErrorStrategy.FINANCIAL_STRICT,
    iterationPolicy: null,
  },
  
  // ============================================================================
  // INTEREST RATE CONVERSION FUNCTIONS
  // ============================================================================
  
  {
    name: 'EFFECT',
    handler: FinancialFunctions.EFFECT,
    category: FunctionCategory.FINANCIAL,
    minArgs: 2,
    maxArgs: 2,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,
    precisionClass: PrecisionClass.FINANCIAL,
    errorStrategy: ErrorStrategy.FINANCIAL_STRICT,
    iterationPolicy: null,
  },
  
  {
    name: 'NOMINAL',
    handler: FinancialFunctions.NOMINAL,
    category: FunctionCategory.FINANCIAL,
    minArgs: 2,
    maxArgs: 2,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,
    precisionClass: PrecisionClass.FINANCIAL,
    errorStrategy: ErrorStrategy.FINANCIAL_STRICT,
    iterationPolicy: null,
  },
  
  // ============================================================================
  // BOND/TREASURY FUNCTIONS (Future: PRICE, YIELD, ACCRINT)
  // ============================================================================
  
  // Note: PRICE, YIELD, ACCRINT require DateSystemPolicy (Wave 0 Day 10)
  // These will be added after date system infrastructure is in place
];

/**
 * Financial Category Summary:
 * 
 * Total: 18 functions classified
 * 
 * Complexity:
 * - O(1): 7 (PV, FV, PMT, NPER, IPMT, PPMT, SLN, SYD)
 * - O(n): 6 (NPV, XNPV, CUMIPMT, CUMPRINC, DB, DDB, VDB)
 * - ITERATIVE: 3 (IRR, XIRR, RATE) ⚠️ CRITICAL
 * 
 * Precision:
 * - FINANCIAL: 15 (all except iterative)
 * - ITERATIVE: 3 (IRR, XIRR, RATE - convergence-dependent)
 * 
 * Volatile: 0 (none)
 * 
 * Iteration Policy: 3 functions use FINANCIAL_ITERATION_POLICY
 * - IRR, XIRR, RATE
 * - Algorithm: Newton-Raphson
 * - Max Iterations: 100
 * - Tolerance: 1e-7
 * 
 * Critical Dependencies:
 * - Wave 0 Day 10: DateSystemPolicy (for PRICE, YIELD, ACCRINT)
 * - Wave 0 Day 4: Iteration Control System (shared Newton solver)
 */
