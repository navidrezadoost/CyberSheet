/**
 * TokenParser.ts
 * 
 * Handles tokenization and parsing of formula expressions.
 * Splits expressions into tokens for evaluation.
 */

import type { FormulaValue } from '../types/formula-types';

/**
 * Token type enumeration
 */
export enum TokenType {
  NUMBER = 'NUMBER',
  STRING = 'STRING',
  BOOLEAN = 'BOOLEAN',
  NULL = 'NULL',
  CELL_REF = 'CELL_REF',
  RANGE_REF = 'RANGE_REF',
  FUNCTION = 'FUNCTION',
  OPERATOR = 'OPERATOR',
  PAREN_OPEN = 'PAREN_OPEN',
  PAREN_CLOSE = 'PAREN_CLOSE',
  COMMA = 'COMMA',
  IDENTIFIER = 'IDENTIFIER',
}

/**
 * Token interface
 */
export interface Token {
  type: TokenType;
  value: string;
  position: number;
}

/**
 * Split expression by operator, respecting parentheses and strings
 * Returns array of parts split by the operator
 */
export function splitByOperator(expr: string, operator: string): string[] {
  let depth = 0;
  let inString = false;
  let lastSplit = 0;
  const parts: string[] = [];

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

    // Check for operator at depth 0
    if (depth === 0 && expr.slice(i, i + operator.length) === operator) {
      parts.push(expr.slice(lastSplit, i).trim());
      lastSplit = i + operator.length;
    }
  }

  // Add remaining part
  if (parts.length > 0) {
    parts.push(expr.slice(lastSplit).trim());
  }

  return parts;
}

/**
 * Parse raw arguments without evaluation
 * Splits by comma at depth 0, preserving strings and nested calls
 */
export function parseRawArguments(argsStr: string): string[] {
  if (!argsStr.trim()) return [];

  const args: string[] = [];
  let current = '';
  let depth = 0;
  let inString = false;

  for (let i = 0; i < argsStr.length; i++) {
    const char = argsStr[i];

    if (char === '"') {
      inString = !inString;
      current += char;
    } else if (!inString) {
      if (char === '(') depth++;
      else if (char === ')') depth--;
      else if (char === ',' && depth === 0) {
        args.push(current.trim());
        current = '';
        continue;
      }
      current += char;
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    args.push(current.trim());
  }

  return args;
}

/**
 * Extract function name and arguments from expression
 * Returns [functionName, argsString] or null if not a function call
 */
export function parseFunctionCall(expr: string): [string, string] | null {
  const match = expr.match(/^([A-Z_][A-Z0-9_]*)\((.*)\)$/i);
  
  if (!match) return null;

  return [match[1], match[2]];
}

/**
 * Check if expression is a function call
 */
export function isFunctionCall(expr: string): boolean {
  return /^[A-Z_][A-Z0-9_]*\(/i.test(expr);
}

/**
 * Parse string literal (remove quotes and unescape)
 */
export function parseStringLiteral(str: string): string {
  // Check if wrapped in quotes
  if (str.startsWith('"') && str.endsWith('"')) {
    // Remove quotes and unescape double quotes
    return str.slice(1, -1).replace(/""/g, '"');
  }
  return str;
}

/**
 * Parse number literal
 */
export function parseNumberLiteral(str: string): number | null {
  // Handle scientific notation
  if (/^-?\d+\.?\d*([eE][+-]?\d+)?$/.test(str)) {
    const num = Number(str);
    return isNaN(num) ? null : num;
  }
  return null;
}

/**
 * Parse boolean literal
 */
export function parseBooleanLiteral(str: string): boolean | null {
  const upper = str.toUpperCase();
  if (upper === 'TRUE') return true;
  if (upper === 'FALSE') return false;
  return null;
}

/**
 * Check if identifier is valid
 * Valid: letters, digits, underscore, starts with letter or underscore
 */
export function isValidIdentifier(str: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(str);
}

/**
 * Find matching closing parenthesis
 * Returns index of matching ')' for '(' at startIndex
 */
export function findMatchingParen(expr: string, startIndex: number): number {
  let depth = 1;
  let inString = false;

  for (let i = startIndex + 1; i < expr.length; i++) {
    const char = expr[i];

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === '(') depth++;
    else if (char === ')') {
      depth--;
      if (depth === 0) return i;
    }
  }

  return -1; // No matching paren found
}

/**
 * Extract arguments from lambda invocation
 * Handles LAMBDA(...)(args) pattern
 */
export function parseLambdaInvocation(expr: string): { lambdaArgs: string; invocationArgs: string } | null {
  // Check for LAMBDA prefix
  if (!expr.toUpperCase().startsWith('LAMBDA(')) {
    return null;
  }

  // Find matching closing paren for LAMBDA arguments
  const lambdaStart = 'LAMBDA('.length - 1;
  const lambdaEnd = findMatchingParen(expr, lambdaStart);

  if (lambdaEnd === -1) return null;

  // Check if there's an invocation after the lambda
  const remaining = expr.slice(lambdaEnd + 1).trim();
  
  if (!remaining.startsWith('(')) return null;

  const invocationStart = lambdaEnd + 1;
  const invocationEnd = findMatchingParen(expr, invocationStart);

  if (invocationEnd === -1) return null;

  return {
    lambdaArgs: expr.slice(lambdaStart + 1, lambdaEnd),
    invocationArgs: expr.slice(invocationStart + 1, invocationEnd),
  };
}

/**
 * Tokenize expression into tokens
 * Used for advanced parsing scenarios
 */
export function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < expr.length) {
    const char = expr[i];

    // Skip whitespace
    if (/\s/.test(char)) {
      i++;
      continue;
    }

    // String literal
    if (char === '"') {
      let value = '"';
      i++;
      while (i < expr.length) {
        value += expr[i];
        if (expr[i] === '"') {
          // Check for escaped quote
          if (i + 1 < expr.length && expr[i + 1] === '"') {
            value += '"';
            i += 2;
          } else {
            i++;
            break;
          }
        } else {
          i++;
        }
      }
      tokens.push({ type: TokenType.STRING, value, position: i - value.length });
      continue;
    }

    // Number
    if (/\d/.test(char) || (char === '-' && i + 1 < expr.length && /\d/.test(expr[i + 1]))) {
      let value = '';
      while (i < expr.length && /[\d.eE+-]/.test(expr[i])) {
        value += expr[i];
        i++;
      }
      tokens.push({ type: TokenType.NUMBER, value, position: i - value.length });
      continue;
    }

    // Identifier or function
    if (/[a-zA-Z_]/.test(char)) {
      let value = '';
      const start = i;
      while (i < expr.length && /[a-zA-Z0-9_]/.test(expr[i])) {
        value += expr[i];
        i++;
      }

      // Check if it's a function call
      if (i < expr.length && expr[i] === '(') {
        tokens.push({ type: TokenType.FUNCTION, value, position: start });
      } else {
        tokens.push({ type: TokenType.IDENTIFIER, value, position: start });
      }
      continue;
    }

    // Operators
    if ('+-*/^=<>&'.includes(char)) {
      let value = char;
      i++;
      
      // Check for compound operators (<=, >=, <>)
      if (i < expr.length && ('=><'.includes(expr[i]))) {
        value += expr[i];
        i++;
      }
      
      tokens.push({ type: TokenType.OPERATOR, value, position: i - value.length });
      continue;
    }

    // Parentheses
    if (char === '(') {
      tokens.push({ type: TokenType.PAREN_OPEN, value: char, position: i });
      i++;
      continue;
    }

    if (char === ')') {
      tokens.push({ type: TokenType.PAREN_CLOSE, value: char, position: i });
      i++;
      continue;
    }

    // Comma
    if (char === ',') {
      tokens.push({ type: TokenType.COMMA, value: char, position: i });
      i++;
      continue;
    }

    // Unknown character - skip
    i++;
  }

  return tokens;
}

/**
 * Convert tokens back to expression string
 */
export function tokensToString(tokens: Token[]): string {
  return tokens.map(t => t.value).join(' ');
}
