/**
 * ExpressionParser.ts
 * 
 * Main expression parser and evaluator.
 * Handles parsing and evaluation of formula expressions.
 */

import type { FormulaValue, FormulaContext } from '../types/formula-types';
import {
  parseNumberLiteral,
  parseBooleanLiteral,
  parseStringLiteral,
  splitByOperator,
  parseFunctionCall,
  isValidIdentifier,
} from './TokenParser';
import { isCellReference, isRangeReference } from './ReferenceParser';

/**
 * Operator precedence and associativity
 */
const OPERATORS = [
  { ops: ['^'], precedence: 4, leftAssoc: false },
  { ops: ['*', '/'], precedence: 3, leftAssoc: true },
  { ops: ['+', '-'], precedence: 2, leftAssoc: true },
  { ops: ['&'], precedence: 2, leftAssoc: true },
  { ops: ['=', '<>', '<', '>', '<=', '>='], precedence: 1, leftAssoc: true },
];

/**
 * Get operator precedence
 */
export function getOperatorPrecedence(op: string): number {
  for (const group of OPERATORS) {
    if (group.ops.includes(op)) {
      return group.precedence;
    }
  }
  return 0;
}

/**
 * Check if operator is left-associative
 */
export function isLeftAssociative(op: string): boolean {
  for (const group of OPERATORS) {
    if (group.ops.includes(op)) {
      return group.leftAssoc;
    }
  }
  return true;
}

/**
 * Get all operators sorted by precedence (high to low)
 */
export function getOperatorsByPrecedence(): string[] {
  const sorted = [...OPERATORS].sort((a, b) => b.precedence - a.precedence);
  const result: string[] = [];
  
  for (const group of sorted) {
    // Add compound operators first (<=, >=, <>)
    const compound = group.ops.filter(op => op.length > 1);
    const single = group.ops.filter(op => op.length === 1);
    result.push(...compound, ...single);
  }
  
  return result;
}

/**
 * Parse literal value from expression
 * Returns parsed value or null if not a literal
 */
export function parseLiteral(expr: string): FormulaValue | null {
  const trimmed = expr.trim();

  // Empty expression
  if (trimmed === '') return null;

  // Null literal
  if (trimmed.toUpperCase() === 'NULL') return null;

  // Number literal
  const num = parseNumberLiteral(trimmed);
  if (num !== null) return num;

  // Boolean literal
  const bool = parseBooleanLiteral(trimmed);
  if (bool !== null) return bool;

  // String literal
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return parseStringLiteral(trimmed);
  }

  return null;
}

/**
 * Check if expression is a literal
 */
export function isLiteral(expr: string): boolean {
  return parseLiteral(expr) !== null || expr.trim() === '' || expr.trim().toUpperCase() === 'NULL';
}

/**
 * Find operator in expression at depth 0
 * Returns [index, operator] or null if not found
 */
export function findOperator(expr: string, operators: string[]): [number, string] | null {
  let depth = 0;
  let inString = false;

  for (let i = 0; i < expr.length; i++) {
    const char = expr[i];

    // Handle string literals
    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    // Track parenthesis depth
    if (char === '(') depth++;
    if (char === ')') depth--;

    // Check for operators at depth 0
    if (depth === 0) {
      for (const op of operators) {
        if (expr.slice(i, i + op.length) === op) {
          return [i, op];
        }
      }
    }
  }

  return null;
}

/**
 * Extract expression inside parentheses
 * Returns content if expr is "(content)", otherwise returns null
 */
export function extractParentheses(expr: string): string | null {
  const trimmed = expr.trim();
  
  if (!trimmed.startsWith('(') || !trimmed.endsWith(')')) {
    return null;
  }

  // Check if parens match
  let depth = 0;
  for (let i = 0; i < trimmed.length; i++) {
    if (trimmed[i] === '(') depth++;
    else if (trimmed[i] === ')') depth--;
    
    // If depth reaches 0 before the end, outer parens don't wrap entire expression
    if (depth === 0 && i < trimmed.length - 1) {
      return null;
    }
  }

  return trimmed.slice(1, -1);
}

/**
 * Validate expression syntax
 * Returns Error if invalid, null if valid
 */
export function validateExpression(expr: string): Error | null {
  // Check for balanced parentheses
  let depth = 0;
  let inString = false;

  for (let i = 0; i < expr.length; i++) {
    const char = expr[i];

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === '(') depth++;
    else if (char === ')') {
      depth--;
      if (depth < 0) {
        return new Error('#ERROR!'); // More closing parens than opening
      }
    }
  }

  if (depth !== 0) {
    return new Error('#ERROR!'); // Unbalanced parentheses
  }

  if (inString) {
    return new Error('#ERROR!'); // Unclosed string
  }

  return null;
}

/**
 * Normalize expression
 * Removes extra whitespace, normalizes operators
 */
export function normalizeExpression(expr: string): string {
  let result = '';
  let inString = false;

  for (let i = 0; i < expr.length; i++) {
    const char = expr[i];

    if (char === '"') {
      inString = !inString;
      result += char;
      continue;
    }

    if (inString) {
      result += char;
      continue;
    }

    // Skip extra whitespace
    if (/\s/.test(char)) {
      // Only add space if previous char is not a space
      if (result.length > 0 && !/\s/.test(result[result.length - 1])) {
        result += ' ';
      }
      continue;
    }

    result += char;
  }

  return result.trim();
}

/**
 * Check if expression is a reference (cell or range)
 */
export function isReference(expr: string): boolean {
  return isCellReference(expr) || isRangeReference(expr);
}

/**
 * Check if expression is an identifier (variable name)
 */
export function isIdentifier(expr: string): boolean {
  return isValidIdentifier(expr) && !isLiteral(expr) && !isReference(expr);
}

/**
 * Split expression by top-level operator
 * Finds the operator with lowest precedence at depth 0
 * Returns [left, operator, right] or null if no operator found
 */
export function splitByTopLevelOperator(expr: string): [string, string, string] | null {
  const operators = getOperatorsByPrecedence();

  // Process operators from lowest to highest precedence
  // This ensures we split at the operator that should be evaluated last
  for (let precedence = 1; precedence <= 4; precedence++) {
    const opsAtLevel = operators.filter(op => getOperatorPrecedence(op) === precedence);

    // For left-associative operators, find the rightmost occurrence
    // For right-associative operators, find the leftmost occurrence
    let bestIndex = -1;
    let bestOp = '';

    let depth = 0;
    let inString = false;

    for (let i = 0; i < expr.length; i++) {
      const char = expr[i];

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (inString) continue;

      if (char === '(') depth++;
      if (char === ')') depth--;

      if (depth === 0) {
        for (const op of opsAtLevel) {
          if (expr.slice(i, i + op.length) === op) {
            // For left-associative, keep updating (find rightmost)
            // For right-associative, only update if not found yet (find leftmost)
            if (isLeftAssociative(op)) {
              bestIndex = i;
              bestOp = op;
            } else if (bestIndex === -1) {
              bestIndex = i;
              bestOp = op;
            }
          }
        }
      }
    }

    if (bestIndex !== -1) {
      const left = expr.slice(0, bestIndex).trim();
      const right = expr.slice(bestIndex + bestOp.length).trim();
      return [left, bestOp, right];
    }
  }

  return null;
}

/**
 * Parse expression into an abstract syntax tree (AST)
 * This is a simplified version for optimization purposes
 */
export interface ExpressionNode {
  type: 'literal' | 'reference' | 'identifier' | 'function' | 'operator' | 'parentheses';
  value: any;
  left?: ExpressionNode;
  right?: ExpressionNode;
  args?: ExpressionNode[];
}

/**
 * Parse expression to AST
 * Returns AST node or Error
 */
export function parseToAST(expr: string): ExpressionNode | Error {
  const trimmed = expr.trim();

  // Validate syntax
  const error = validateExpression(trimmed);
  if (error) return error;

  // Empty expression
  if (trimmed === '') {
    return { type: 'literal', value: null };
  }

  // Literal
  const literal = parseLiteral(trimmed);
  if (literal !== null || isLiteral(trimmed)) {
    return { type: 'literal', value: literal };
  }

  // Parentheses
  const innerExpr = extractParentheses(trimmed);
  if (innerExpr !== null) {
    const inner = parseToAST(innerExpr);
    if (inner instanceof Error) return inner;
    return { type: 'parentheses', value: inner };
  }

  // Cell or range reference
  if (isReference(trimmed)) {
    return { type: 'reference', value: trimmed };
  }

  // Binary operator
  const split = splitByTopLevelOperator(trimmed);
  if (split) {
    const [left, op, right] = split;
    const leftNode = parseToAST(left);
    const rightNode = parseToAST(right);

    if (leftNode instanceof Error) return leftNode;
    if (rightNode instanceof Error) return rightNode;

    return {
      type: 'operator',
      value: op,
      left: leftNode,
      right: rightNode,
    };
  }

  // Function call
  const funcCall = parseFunctionCall(trimmed);
  if (funcCall) {
    const [name, argsStr] = funcCall;
    return {
      type: 'function',
      value: name,
      args: [], // Args would be parsed separately for lazy evaluation
    };
  }

  // Identifier (variable or lambda parameter)
  if (isIdentifier(trimmed)) {
    return { type: 'identifier', value: trimmed };
  }

  return new Error('#NAME?');
}
