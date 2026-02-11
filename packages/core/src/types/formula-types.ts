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
 * Supports scalars, arrays (1D/2D for Excel 365 dynamic arrays), and errors
 */
export type FormulaValue = 
  | number 
  | string 
  | boolean 
  | null 
  | Error 
  | FormulaValue[] 
  | FormulaValue[][];

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
 */
export interface FunctionMetadata {
  name: string;
  handler: FormulaFunction | ContextAwareFormulaFunction;
  category: FunctionCategory;
  minArgs?: number;
  maxArgs?: number;
  isSpecial?: boolean; // Special handling (e.g., LAMBDA, IF, LET)
  needsContext?: boolean; // If true, handler is ContextAwareFormulaFunction
}

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
