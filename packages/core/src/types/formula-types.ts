/**
 * formula-types.ts
 * 
 * Shared type definitions for the formula engine.
 * Centralized types for better maintainability and type safety.
 */

import type { Address, Cell, CellValue } from '../types';
import type { Worksheet } from '../worksheet';

/**
 * FormulaValue represents any value that can be computed or stored in a formula
 * Supports scalars, arrays (1D/2D for Excel 365 dynamic arrays), errors, and thunks (Phase 6: LAZY_EVALUATION)
 */
export type FormulaValue = 
  | number 
  | string 
  | boolean 
  | null 
  | Error 
  | FormulaValue[] 
  | FormulaValue[][]
  | (() => FormulaValue); // Thunk for lazy evaluation (Phase 6)

/**
 * Lambda function representation for LAMBDA() and higher-order functions
 * Captures parameter names, body expression, and optional closure context
 */
export interface LambdaFunction {
  parameters: string[];
  body: string;
  capturedContext?: Map<string, FormulaValue>;
}

/**
 * Context passed through formula evaluation
 * Contains worksheet reference, current cell, lambda bindings, and recursion tracking
 */
export interface FormulaContext {
  worksheet: Worksheet;
  currentCell: Address;
  lambdaContext?: Map<string, FormulaValue>;
  namedLambdas?: Map<string, LambdaFunction>;
  recursionDepth?: number;
}

/**
 * Function handler signature
 * All formula functions implement this interface for consistent handling
 */
export type FormulaFunction = (...args: FormulaValue[]) => FormulaValue;

/**
 * Context-aware function handler signature
 * Functions that need access to worksheet, current cell, etc. implement this interface
 * Used for functions like ISFORMULA, CELL("contents"), etc.
 */
export type ContextAwareFormulaFunction = (context: FormulaContext, ...args: FormulaValue[]) => FormulaValue;

/**
 * Operator handler signature
 * Binary operators (e.g., +, -, *, /) implement this interface
 */
export type OperatorHandler = (left: FormulaValue, right: FormulaValue) => FormulaValue;

/**
 * Function metadata for registration
 * Provides information about function requirements and behavior
 * 
 * WARNING: This is the base interface. Use StrictFunctionMetadata for registration.
 */
export interface FunctionMetadata {
  name: string;
  handler: FormulaFunction | ContextAwareFormulaFunction;
  category: FunctionCategory;
  minArgs?: number;
  maxArgs?: number;
  isSpecial?: boolean; // Special handling (e.g., LAMBDA, IF, LET)
  needsContext?: boolean; // If true, handler is ContextAwareFormulaFunction
  
  // SDK-grade enforcement fields
  volatile?: boolean;              // RAND, NOW → scheduler always re-evaluates
  complexityClass?: ComplexityClass; // Used for warnings + future async eligibility
  precisionClass?: PrecisionClass;   // Drives test tolerance automatically
  errorStrategy?: ErrorStrategy;     // Per-function error handling override
  iterationPolicy?: IterationPolicy | null; // For IRR, YIELD, XIRR, RATE (null if not iterative)
}

/**
 * STRICT METADATA: All enforcement fields required
 * SDK-grade: Registry ONLY accepts this type
 * 
 * TypeScript will fail to compile if any enforcement field is missing.
 * This is intentional — prevents metadata drift at 300-function scale.
 */
export type StrictFunctionMetadata = Required<Omit<FunctionMetadata, 'minArgs' | 'maxArgs' | 'isSpecial' | 'needsContext' | 'iterationPolicy'>> & {
  minArgs: number;          // Required: no implicit defaults
  maxArgs: number;          // Required: no implicit defaults
  isSpecial: boolean;       // Required: explicit false if not special
  needsContext: boolean;    // Required: explicit false if not context-aware
  iterationPolicy: IterationPolicy | null; // Required: null if not iterative
};

/**
 * Function categories for organization and lookup optimization
 */
export enum FunctionCategory {
  MATH = 'MATH',
  TEXT = 'TEXT',
  LOGICAL = 'LOGICAL',
  ARRAY = 'ARRAY',
  STATISTICAL = 'STATISTICAL',
  DATABASE = 'DATABASE',
  LOOKUP = 'LOOKUP',
  LAMBDA = 'LAMBDA',
  DATE_TIME = 'DATE_TIME',
  FINANCIAL = 'FINANCIAL',
  ENGINEERING = 'ENGINEERING',
  INFORMATION = 'INFORMATION',
  CUBE = 'CUBE',
}

/**
 * Complexity classification for performance budgeting
 * SDK-grade: Used for performance introspection API
 */
export enum ComplexityClass {
  O_1 = 'O(1)',           // PI, TRUE, NOW
  O_N = 'O(n)',           // SUM, AVERAGE
  O_N_LOG_N = 'O(n log n)', // SORT, MEDIAN
  O_N2 = 'O(n²)',         // MMULT
  ITERATIVE = 'iterative' // IRR, YIELD (Newton/bisection)
}

/**
 * Precision classification for test tolerance
 * SDK-grade: Drives test tolerance automatically
 */
export enum PrecisionClass {
  EXACT = 'exact',            // Integer math, text
  FINANCIAL = 'financial',    // ±$0.01
  STATISTICAL = 'statistical', // ±1e-10
  ERF_LIMITED = 'erf-limited', // ±1e-7 (NORM.DIST)
  ITERATIVE = 'iterative'    // Convergence-dependent
}

/**
 * Error handling strategy for per-function overrides
 * SDK-grade: Consumed by Error Engine Layer
 */
export enum ErrorStrategy {
  PROPAGATE_FIRST = 'propagate-first', // Standard: first error propagates
  SKIP_ERRORS = 'skip-errors',         // AVERAGE, COUNT skip errors
  LAZY_EVALUATION = 'lazy',            // IF evaluates branches lazily
  SHORT_CIRCUIT = 'short-circuit',     // AND, OR stop on first determinant
  LOOKUP_STRICT = 'lookup-strict',     // MATCH, VLOOKUP treat #N/A specially
  FINANCIAL_STRICT = 'financial-strict' // PRICE, YIELD strict coercion
}

/**
 * Iteration policy for iterative solvers
 * SDK-grade: Standardizes convergence management
 */
export interface IterationPolicy {
  maxIterations: number;  // e.g., 100 for IRR, 50 for YIELD
  tolerance: number;      // e.g., 1e-7
  algorithm: 'newton' | 'bisection' | 'secant';
}

/**
 * Operator type enumeration
 */
export enum OperatorType {
  ARITHMETIC = 'ARITHMETIC',
  COMPARISON = 'COMPARISON',
  LOGICAL = 'LOGICAL',
  CONCATENATION = 'CONCATENATION',
}

/**
 * Parser result for expression parsing
 */
export interface ParseResult {
  tokens: Token[];
  errors: Error[];
}

/**
 * Token types for parser
 */
export enum TokenType {
  NUMBER = 'NUMBER',
  STRING = 'STRING',
  BOOLEAN = 'BOOLEAN',
  CELL_REF = 'CELL_REF',
  RANGE_REF = 'RANGE_REF',
  FUNCTION = 'FUNCTION',
  OPERATOR = 'OPERATOR',
  PAREN = 'PAREN',
  COMMA = 'COMMA',
}

/**
 * Token representation
 */
export interface Token {
  type: TokenType;
  value: string;
  position: number;
}

/**
 * Performance monitoring interface
 */
export interface PerformanceMetrics {
  functionCalls: Map<string, number>;
  evaluationTime: number;
  cacheHits: number;
  cacheMisses: number;
}
