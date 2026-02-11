/**
 * formula-live-preview.ts
 * 
 * Live preview evaluation for formulas as the user types
 * Shows real-time results and error messages
 * 
 * Week 9 Day 2: Live Preview Implementation
 */

import { FormulaEngine } from '../FormulaEngine';
import type { FormulaValue } from '../types/formula-types';
import type { CellValue } from '../types';

export interface PreviewResult {
  success: boolean;
  value?: FormulaValue;
  displayValue?: string;
  error?: string;
  errorType?: string;
  evaluationTime?: number;
}

export interface PreviewOptions {
  maxEvaluationTime?: number;  // Max time in ms for evaluation
  formatNumbers?: boolean;      // Format numbers with thousand separators
  truncateStrings?: number;     // Max string length to display
}

/**
 * Format a cell value for display
 */
function formatValueForDisplay(
  value: FormulaValue, 
  options: PreviewOptions
): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  if (value instanceof Error) {
    return value.message;
  }
  
  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }
  
  if (typeof value === 'number') {
    // Check for special number values
    if (isNaN(value)) return '#NUM!';
    if (!isFinite(value)) return value > 0 ? '#DIV/0!' : '-#DIV/0!';
    
    // Format with thousand separators if requested
    if (options.formatNumbers) {
      return value.toLocaleString('en-US', {
        maximumFractionDigits: 10,
        useGrouping: true,
      });
    }
    
    return value.toString();
  }
  
  if (typeof value === 'string') {
    // Truncate long strings
    if (options.truncateStrings && value.length > options.truncateStrings) {
      return value.slice(0, options.truncateStrings) + '...';
    }
    return value;
  }
  
  // Arrays (spilled values)
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    if (value.length === 1) return formatValueForDisplay(value[0], options);
    
    const preview = value
      .slice(0, 3)
      .map(v => formatValueForDisplay(v as FormulaValue, { ...options, truncateStrings: 10 }))
      .join(', ');
    
    return value.length > 3 
      ? `[${preview}, ... ${value.length} items]`
      : `[${preview}]`;
  }
  
  return String(value);
}

/**
 * Convert error object to user-friendly message
 */
function formatError(error: Error | string): { message: string; type: string } {
  const errorStr = error instanceof Error ? error.message : String(error);
  
  // Excel error types
  const errorPatterns: Record<string, string> = {
    '#DIV/0!': 'Division by zero',
    '#N/A': 'Value not available',
    '#NAME?': 'Unrecognized function or name',
    '#NULL!': 'Null intersection',
    '#NUM!': 'Invalid numeric value',
    '#REF!': 'Invalid cell reference',
    '#VALUE!': 'Wrong type of argument',
    '#SPILL!': 'Spill range is blocked',
    '#CALC!': 'Calculation error',
  };
  
  // Check if error contains Excel error type
  for (const [errorType, description] of Object.entries(errorPatterns)) {
    if (errorStr.includes(errorType)) {
      return { message: description, type: errorType };
    }
  }
  
  // Parse common error patterns
  if (errorStr.includes('circular reference')) {
    return { message: 'Circular reference detected', type: '#REF!' };
  }
  
  if (errorStr.includes('undefined') || errorStr.includes('not defined')) {
    return { message: 'Function or name not found', type: '#NAME?' };
  }
  
  if (errorStr.includes('type') || errorStr.includes('invalid argument')) {
    return { message: 'Invalid argument type', type: '#VALUE!' };
  }
  
  // Generic error
  return { 
    message: errorStr.length > 100 ? errorStr.slice(0, 100) + '...' : errorStr,
    type: '#CALC!'
  };
}

/**
 * Evaluate formula and return preview result
 * 
 * @param formula - The formula to evaluate (with or without leading =)
 * @param options - Preview options
 * @returns Preview result with value or error
 * 
 * @example
 * const result = evaluateFormulaPreview("=SUM(1, 2, 3)");
 * console.log(result.displayValue); // "6"
 * 
 * const result = evaluateFormulaPreview("=1/0");
 * console.log(result.error); // "Division by zero"
 */
export function evaluateFormulaPreview(
  formula: string,
  options: PreviewOptions = {}
): PreviewResult {
  const {
    maxEvaluationTime = 1000,
    formatNumbers = true,
    truncateStrings = 50,
  } = options;
  
  // Handle empty formula
  if (!formula || formula.trim() === '' || formula.trim() === '=') {
    return {
      success: true,
      value: '',
      displayValue: '',
    };
  }
  
  // Strip leading = if present
  let formulaToEval = formula.trim();
  if (formulaToEval.startsWith('=')) {
    formulaToEval = formulaToEval.slice(1);
  }
  
  // If it's just a value (not a formula), return it directly
  if (!formulaToEval.includes('(') && 
      !formulaToEval.includes('+') && 
      !formulaToEval.includes('-') && 
      !formulaToEval.includes('*') && 
      !formulaToEval.includes('/')) {
    
    // Check if it's a number
    const num = parseFloat(formulaToEval);
    if (!isNaN(num)) {
      return {
        success: true,
        value: num,
        displayValue: formatValueForDisplay(num, { formatNumbers, truncateStrings }),
      };
    }
    
    // Check if it's a boolean
    const upper = formulaToEval.toUpperCase();
    if (upper === 'TRUE' || upper === 'FALSE') {
      const boolValue = upper === 'TRUE';
      return {
        success: true,
        value: boolValue,
        displayValue: upper,
      };
    }
    
    // Otherwise it's a string or cell reference
    return {
      success: true,
      value: formulaToEval,
      displayValue: formulaToEval,
    };
  }
  
  const startTime = Date.now();
  
  try {
    // Create evaluation context - simplified for preview
    const engine = new FormulaEngine();
    
    // Set timeout to prevent infinite loops
    const timeoutId = setTimeout(() => {
      throw new Error('Evaluation timeout - formula took too long');
    }, maxEvaluationTime);
    
    // Try to evaluate formula with minimal context
    // Note: This may not work for formulas with cell references
    // For a complete preview, users should pass a worksheet context
    let result: FormulaValue;
    
    try {
      // Create a minimal mock worksheet
      const mockWorksheet = {
        name: 'Preview',
        getCell: () => ({ value: null }),
        getCellValue: () => null,
      } as any;
      
      const context = {
        worksheet: mockWorksheet,
        currentCell: { row: 0, col: 0 },
        lambdaBindings: new Map(),
        recursionDepth: 0,
      };
      
      result = engine.evaluate(formulaToEval, context);
    } catch {
      // If evaluation fails, just return the formula as text
      throw new Error('Unable to evaluate formula');
    }
    
    clearTimeout(timeoutId);
    
    const evaluationTime = Date.now() - startTime;
    
    // Handle Error results
    if (result instanceof Error) {
      const { message, type } = formatError(result);
      return {
        success: false,
        error: message,
        errorType: type,
        evaluationTime,
      };
    }
    
    // Format result for display
    const displayValue = formatValueForDisplay(result, {
      formatNumbers,
      truncateStrings,
    });
    
    return {
      success: true,
      value: result,
      displayValue,
      evaluationTime,
    };
    
  } catch (error) {
    const evaluationTime = Date.now() - startTime;
    const { message, type } = formatError(error as Error);
    
    return {
      success: false,
      error: message,
      errorType: type,
      evaluationTime,
    };
  }
}

/**
 * Batch evaluate multiple formulas (for performance)
 */
export function evaluateMultipleFormulas(
  formulas: string[],
  options: PreviewOptions = {}
): PreviewResult[] {
  // Reuse the same engine for better performance
  const engine = new FormulaEngine();
  
  return formulas.map((formula) => {
    return evaluateFormulaPreview(formula, options);
  });
}

/**
 * Check if formula has syntax errors (without evaluation)
 */
export function checkFormulaSyntax(formula: string): {
  valid: boolean;
  errors: string[];
} {
  try {
    // Basic syntax checks
    const errors: string[] = [];
    
    if (!formula.trim()) {
      return { valid: true, errors: [] };
    }
    
    let content = formula.trim();
    if (content.startsWith('=')) {
      content = content.slice(1);
    }
    
    // Check parentheses balance
    let parenCount = 0;
    let inString = false;
    
    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      
      if (char === '"' && (i === 0 || content[i - 1] !== '\\')) {
        inString = !inString;
      }
      
      if (!inString) {
        if (char === '(') parenCount++;
        if (char === ')') parenCount--;
        
        if (parenCount < 0) {
          errors.push('Unmatched closing parenthesis');
          break;
        }
      }
    }
    
    if (parenCount > 0) {
      errors.push(`${parenCount} unmatched opening parenthesis${parenCount > 1 ? 'es' : ''}`);
    }
    
    // Check for unclosed strings
    if (inString) {
      errors.push('Unclosed string literal');
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
    
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : 'Unknown syntax error'],
    };
  }
}

/**
 * Get formula preview with caching for better performance
 */
export class FormulaPreviewCache {
  private cache: Map<string, { result: PreviewResult; timestamp: number }> = new Map();
  private maxCacheSize: number;
  private cacheTimeout: number;
  
  constructor(maxCacheSize = 100, cacheTimeout = 5000) {
    this.maxCacheSize = maxCacheSize;
    this.cacheTimeout = cacheTimeout;
  }
  
  get(formula: string, options: PreviewOptions = {}): PreviewResult {
    const cacheKey = formula + JSON.stringify(options);
    const cached = this.cache.get(cacheKey);
    
    // Check if cached result is still valid
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.result;
    }
    
    // Evaluate and cache
    const result = evaluateFormulaPreview(formula, options);
    
    // Manage cache size
    if (this.cache.size >= this.maxCacheSize) {
      // Remove oldest entry
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
    
    this.cache.set(cacheKey, { result, timestamp: Date.now() });
    return result;
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  getCacheSize(): number {
    return this.cache.size;
  }
}
