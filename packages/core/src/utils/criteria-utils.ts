/**
 * criteria-utils.ts
 * 
 * Utilities for parsing and matching criteria in conditional functions
 * (COUNTIF, SUMIF, AVERAGEIF, COUNTIFS, SUMIFS, AVERAGEIFS)
 */

import type { FormulaValue } from '../types/formula-types';

/**
 * Parsed criteria structure
 */
export interface ParsedCriteria {
  op: string;
  val: any;
  wildcard?: boolean;
}

/**
 * Parse criteria string or number into structured format
 * Supports operators: =, <>, >, >=, <, <=
 * Supports wildcards: * (any chars), ? (single char)
 */
export function parseCriteria(criteria: FormulaValue): ParsedCriteria | Error {
  // Number criteria - exact match
  if (typeof criteria === 'number') {
    return { op: '=', val: criteria };
  }

  // Boolean criteria
  if (typeof criteria === 'boolean') {
    return { op: '=', val: criteria };
  }

  // Must be string
  if (typeof criteria !== 'string') {
    return new Error('#VALUE!');
  }

  const criteriaStr = criteria.trim();

  // Empty string - match empty
  if (criteriaStr === '') {
    return { op: '=', val: '' };
  }

  // Wildcard-only "*" - match all non-empty
  if (criteriaStr === '*') {
    return { op: 'wildcard', val: /.+/, wildcard: true };
  }

  // Parse operator and value: <operator><value>
  const opMatch = criteriaStr.match(/^(<=|>=|<>|<|>|=)?\s*(.*)$/);
  if (!opMatch) {
    return new Error('#VALUE!');
  }

  let op = opMatch[1] || '=';
  let val = opMatch[2];

  // Wildcard detection (contains * or ?)
  const hasWildcard = val.includes('*') || val.includes('?');
  if (hasWildcard) {
    // Convert Excel wildcards to regex
    // * = zero or more chars, ? = exactly one char
    let regexStr = val
      .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
      .replace(/\*/g, '.*')                  // * → .*
      .replace(/\?/g, '.');                  // ? → .
    
    return { 
      op: 'wildcard', 
      val: new RegExp(`^${regexStr}$`, 'i'), 
      wildcard: true 
    };
  }

  // Try to parse as number
  const numVal = Number(val);
  if (!isNaN(numVal) && val !== '') {
    return { op, val: numVal };
  }

  // String value
  return { op, val };
}

/**
 * Check if a value matches the parsed criteria
 */
export function matchesCriteria(value: FormulaValue, parsed: ParsedCriteria): boolean {
  // Handle errors in value
  if (value instanceof Error) {
    return false;
  }

  // Wildcard matching (case-insensitive string match)
  if (parsed.wildcard) {
    if (typeof value !== 'string') {
      return false;
    }
    return parsed.val.test(value);
  }

  // For comparison operators, convert to numbers
  const numVal = typeof value === 'number' ? value : Number(value);
  const isNum = typeof value === 'number' || (!isNaN(numVal) && typeof value === 'string' && value.trim() !== '');

  switch (parsed.op) {
    case '=':
      if (isNum && typeof parsed.val === 'number') {
        return numVal === parsed.val;
      }
      // String comparison (case-insensitive for Excel compatibility)
      return String(value).toLowerCase() === String(parsed.val).toLowerCase();

    case '<>':
      if (isNum && typeof parsed.val === 'number') {
        return numVal !== parsed.val;
      }
      return String(value).toLowerCase() !== String(parsed.val).toLowerCase();

    case '>':
      return isNum && typeof parsed.val === 'number' && numVal > parsed.val;

    case '>=':
      return isNum && typeof parsed.val === 'number' && numVal >= parsed.val;

    case '<':
      return isNum && typeof parsed.val === 'number' && numVal < parsed.val;

    case '<=':
      return isNum && typeof parsed.val === 'number' && numVal <= parsed.val;

    default:
      return false;
  }
}
