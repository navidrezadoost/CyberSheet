/**
 * FormulaEngine.ts
 * 
 * Zero-dependency formula engine with 100+ Excel-compatible functions.
 * Supports dependency tracking, auto-recalculation, and Web Worker execution.
 */

import type { Address, Cell, CellValue } from './types';
import type { Worksheet } from './worksheet';

// FormulaValue now includes arrays for dynamic array functions (Excel 365)
// Arrays can be 1D (FormulaValue[]) or 2D (FormulaValue[][]) for spill behavior
export type FormulaValue = number | string | boolean | null | Error | FormulaValue[] | FormulaValue[][];
export type FormulaFunction = (...args: FormulaValue[]) => FormulaValue;

export interface FormulaContext {
  worksheet: Worksheet;
  currentCell: Address;
}

/**
 * Dependency graph for tracking cell dependencies
 */
class DependencyGraph {
  // Maps cell address to cells it depends on
  private dependencies = new Map<string, Set<string>>();
  // Maps cell address to cells that depend on it (reverse lookup)
  private dependents = new Map<string, Set<string>>();

  private key(addr: Address): string {
    return `${addr.row}:${addr.col}`;
  }

  addDependency(dependent: Address, dependency: Address): void {
    const depKey = this.key(dependent);
    const depOnKey = this.key(dependency);

    if (!this.dependencies.has(depKey)) {
      this.dependencies.set(depKey, new Set());
    }
    this.dependencies.get(depKey)!.add(depOnKey);

    if (!this.dependents.has(depOnKey)) {
      this.dependents.set(depOnKey, new Set());
    }
    this.dependents.get(depOnKey)!.add(depKey);
  }

  clearDependencies(addr: Address): void {
    const key = this.key(addr);
    const deps = this.dependencies.get(key);
    
    if (deps) {
      for (const depKey of deps) {
        this.dependents.get(depKey)?.delete(key);
      }
      this.dependencies.delete(key);
    }
  }

  getDependents(addr: Address): Address[] {
    const key = this.key(addr);
    const deps = this.dependents.get(key);
    
    if (!deps) return [];
    
    return Array.from(deps).map(k => {
      const [row, col] = k.split(':').map(Number);
      return { row, col };
    });
  }

  getTopologicalOrder(cells: Address[]): Address[] {
    const visited = new Set<string>();
    const result: Address[] = [];

    const visit = (addr: Address) => {
      const key = this.key(addr);
      if (visited.has(key)) return;
      visited.add(key);

      const deps = this.dependencies.get(key);
      if (deps) {
        for (const depKey of deps) {
          const [row, col] = depKey.split(':').map(Number);
          visit({ row, col });
        }
      }

      result.push(addr);
    };

    for (const addr of cells) {
      visit(addr);
    }

    return result;
  }
}

/**
 * Formula parser and evaluator
 */
export class FormulaEngine {
  private functions = new Map<string, FormulaFunction>();
  private dependencyGraph = new DependencyGraph();
  private calculating = new Set<string>();

  constructor() {
    this.registerBuiltInFunctions();
  }

  /**
   * Parses and evaluates a formula
   */
  evaluate(formula: string, context: FormulaContext): FormulaValue {
    const cellKey = `${context.currentCell.row}:${context.currentCell.col}`;
    
    // Detect circular reference
    if (this.calculating.has(cellKey)) {
      return new Error('#CIRC!');
    }

    this.calculating.add(cellKey);
    
    try {
      // Remove leading '='
      const expr = formula.startsWith('=') ? formula.slice(1) : formula;
      const result = this.evaluateExpression(expr, context);
      return result;
    } catch (error) {
      return new Error('#ERROR!');
    } finally {
      this.calculating.delete(cellKey);
    }
  }

  /**
   * Evaluates an expression
   */
  private evaluateExpression(expr: string, context: FormulaContext): FormulaValue {
    expr = expr.trim();

    // String literal
    if (expr.startsWith('"') && expr.endsWith('"')) {
      return expr.slice(1, -1);
    }

    // Number literal
    if (/^-?\d+(\.\d+)?$/.test(expr)) {
      return parseFloat(expr);
    }

    // Boolean literal
    if (expr.toLowerCase() === 'true') return true;
    if (expr.toLowerCase() === 'false') return false;

    // Cell reference (e.g., A1, B2)
    if (/^[A-Z]+\d+$/i.test(expr)) {
      return this.evaluateCellReference(expr, context);
    }

    // Range references shouldn't be evaluated standalone; treated only inside functions.
    if (/^[A-Z]+\d+:[A-Z]+\d+$/i.test(expr)) {
      return new Error('#VALUE!');
    }

    // Binary operations (check BEFORE function calls to handle expressions like SUM(A1:A2)+SUM(B1:B2))
    const operators = ['+', '-', '*', '/', '^', '=', '<>', '<', '>', '<=', '>=', '&'];
    for (const op of operators) {
      const parts = this.splitByOperator(expr, op);
      if (parts.length === 2) {
        const left = this.evaluateExpression(parts[0], context);
        const right = this.evaluateExpression(parts[1], context);
        return this.applyOperator(op, left, right);
      }
    }

    // Function call (e.g., SUM(A1:A10))
    const functionMatch = expr.match(/^([A-Z_]+)\((.*)\)$/i);
    if (functionMatch) {
      const [, funcName, argsStr] = functionMatch;
      return this.evaluateFunction(funcName, argsStr, context);
    }

    return new Error('#NAME?');
  }

  /**
   * Splits expression by operator (respecting parentheses)
   */
  private splitByOperator(expr: string, op: string): string[] {
    let depth = 0;
    let lastSplit = 0;
    const parts: string[] = [];

    for (let i = 0; i < expr.length; i++) {
      if (expr[i] === '(') depth++;
      if (expr[i] === ')') depth--;
      
      if (depth === 0 && expr.slice(i, i + op.length) === op) {
        parts.push(expr.slice(lastSplit, i).trim());
        lastSplit = i + op.length;
      }
    }

    if (parts.length > 0) {
      parts.push(expr.slice(lastSplit).trim());
    }

    return parts;
  }

  /**
   * Applies a binary operator
   */
  private applyOperator(op: string, left: FormulaValue, right: FormulaValue): FormulaValue {
    if (left instanceof Error) return left;
    if (right instanceof Error) return right;

    switch (op) {
      case '+':
        return (left as number) + (right as number);
      case '-':
        return (left as number) - (right as number);
      case '*':
        return (left as number) * (right as number);
      case '/':
        return (right as number) === 0 ? new Error('#DIV/0!') : (left as number) / (right as number);
      case '^':
        return Math.pow(left as number, right as number);
      case '=':
        return left === right;
      case '<>':
        return left !== right;
      case '<':
        return (left as number) < (right as number);
      case '>':
        return (left as number) > (right as number);
      case '<=':
        return (left as number) <= (right as number);
      case '>=':
        return (left as number) >= (right as number);
      case '&':
        return String(left) + String(right);
      default:
        return new Error('#VALUE!');
    }
  }

  /**
   * Evaluates a cell reference
   */
  private evaluateCellReference(ref: string, context: FormulaContext): FormulaValue {
    const addr = this.parseCellReference(ref);
    
    // Track dependency
    this.dependencyGraph.addDependency(context.currentCell, addr);

    const cell = context.worksheet.getCell(addr);
    
    if (!cell) return null;
    
    if (cell.formula) {
      // Recursively evaluate formula
      return this.evaluate(cell.formula, { ...context, currentCell: addr });
    }
    
    return cell.value;
  }

  /**
   * Evaluates a range reference (returns array)
   */
  private evaluateRangeReference(ref: string, context: FormulaContext): FormulaValue[] {
    const [start, end] = ref.split(':');
    const startAddr = this.parseCellReference(start);
    const endAddr = this.parseCellReference(end);

    const values: FormulaValue[] = [];

    console.log(`Evaluating range ${ref}: from (${startAddr.row},${startAddr.col}) to (${endAddr.row},${endAddr.col})`);

    for (let row = startAddr.row; row <= endAddr.row; row++) {
      for (let col = startAddr.col; col <= endAddr.col; col++) {
        const addr = { row, col };
        this.dependencyGraph.addDependency(context.currentCell, addr);
        
        const cell = context.worksheet.getCell(addr);
        if (cell) {
          if (cell.formula) {
            values.push(this.evaluate(cell.formula, { ...context, currentCell: addr }));
          } else {
            console.log(`  Cell (${row},${col}): value =`, cell.value, typeof cell.value);
            values.push(cell.value);
          }
        } else {
          console.log(`  Cell (${row},${col}): NO CELL`);
          values.push(null);
        }
      }
    }

    console.log(`Range ${ref} values:`, values);
    return values;
  }

  /**
   * Parses cell reference (e.g., "A1" -> {row: 0, col: 0})
   */
  private parseCellReference(ref: string): Address {
    const match = ref.match(/^([A-Z]+)(\d+)$/i);
    if (!match) throw new Error('Invalid cell reference');

    const colStr = match[1].toUpperCase();
    const rowStr = match[2];

    let col = 0;
    for (let i = 0; i < colStr.length; i++) {
      col = col * 26 + (colStr.charCodeAt(i) - 65 + 1);
    }
    // Addresses in this project are 1-based; do not convert to 0-based
    const row = parseInt(rowStr, 10);

    return { row, col };
  }

  /**
   * Evaluates a function call
   */
  private evaluateFunction(name: string, argsStr: string, context: FormulaContext): FormulaValue {
    console.log(`Evaluating function: ${name}(${argsStr})`);
    const func = this.functions.get(name.toUpperCase());
    if (!func) {
      console.log(`Function ${name} not found!`);
      return new Error('#NAME?');
    }

    const args = this.parseArguments(argsStr, context);
    console.log(`Parsed args for ${name}:`, args);
    
    try {
      return func(...args);
    } catch (error) {
      console.log(`Error calling ${name}:`, error);
      return new Error('#VALUE!');
    }
  }

  /**
   * Parses function arguments
   */
  private parseArguments(argsStr: string, context: FormulaContext): FormulaValue[] {
    console.log(`Parsing arguments: "${argsStr}"`);
    if (!argsStr.trim()) return [];

    const args: FormulaValue[] = [];
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
          const token = current.trim();
          console.log(`  Token: "${token}", is range: ${/^[A-Z]+\d+:[A-Z]+\d+$/i.test(token)}`);
          if (/^[A-Z]+\d+:[A-Z]+\d+$/i.test(token)) {
            // Spread range values into args array
            const rangeValues = this.evaluateRangeReference(token, context);
            console.log(`  Range ${token} evaluated to:`, rangeValues);
            args.push(rangeValues as any);
          } else {
            args.push(this.evaluateExpression(token, context));
          }
          current = '';
          continue;
        }
        current += char;
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      const token = current.trim();
      console.log(`  Final token: "${token}", is range: ${/^[A-Z]+\d+:[A-Z]+\d+$/i.test(token)}`);
      if (/^[A-Z]+\d+:[A-Z]+\d+$/i.test(token)) {
        // Spread range values into args array
        const rangeValues = this.evaluateRangeReference(token, context);
        console.log(`  Range ${token} evaluated to:`, rangeValues);
        args.push(rangeValues as any);
      } else {
        const result = this.evaluateExpression(token, context);
        console.log(`  Expression "${token}" evaluated to:`, result);
        args.push(result);
      }
    }

    console.log(`  Final args:`, args);
    return args;
  }

  /**
   * Flattens nested arrays from range arguments
   */
  private flattenArgs(args: FormulaValue[]): FormulaValue[] {
    const result: FormulaValue[] = [];
    
    for (const arg of args) {
      if (Array.isArray(arg)) {
        result.push(...this.flattenArgs(arg));
      } else {
        result.push(arg);
      }
    }
    
    return result;
  }

  /**
   * Filters numeric values
   */
  private getNumbers(args: FormulaValue[]): number[] {
    return this.flattenArgs(args)
      .filter(v => typeof v === 'number' && !isNaN(v)) as number[];
  }

  /**
   * Registers built-in Excel functions
   */
  private registerBuiltInFunctions(): void {
    // Math functions
    this.functions.set('SUM', (...args) => {
      console.log('SUM called with args:', args);
      // Log any errors
      args.forEach((arg, i) => {
        if (arg instanceof Error) {
          console.log(`  Arg ${i} is Error:`, arg.message);
        }
      });
      const numbers = this.getNumbers(args);
      console.log('SUM numbers after filtering:', numbers);
      const result = numbers.reduce((sum, n) => sum + n, 0);
      console.log('SUM result:', result);
      return result;
    });

    this.functions.set('AVERAGE', (...args) => {
      const numbers = this.getNumbers(args);
      if (numbers.length === 0) return new Error('#DIV/0!');
      return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
    });

    this.functions.set('MIN', (...args) => {
      const numbers = this.getNumbers(args);
      if (numbers.length === 0) return new Error('#NUM!');
      return Math.min(...numbers);
    });

    this.functions.set('MAX', (...args) => {
      const numbers = this.getNumbers(args);
      if (numbers.length === 0) return new Error('#NUM!');
      return Math.max(...numbers);
    });

    this.functions.set('COUNT', (...args) => {
      return this.getNumbers(args).length;
    });

    this.functions.set('COUNTA', (...args) => {
      return this.flattenArgs(args).filter(v => v != null).length;
    });

    this.functions.set('ABS', (value) => {
      if (typeof value !== 'number') return new Error('#VALUE!');
      return Math.abs(value);
    });

    this.functions.set('ROUND', (value, digits) => {
      if (typeof value !== 'number' || typeof digits !== 'number') return new Error('#VALUE!');
      const factor = Math.pow(10, digits);
      return Math.round(value * factor) / factor;
    });

    this.functions.set('ROUNDUP', (value, digits) => {
      if (typeof value !== 'number' || typeof digits !== 'number') return new Error('#VALUE!');
      const factor = Math.pow(10, digits);
      return Math.ceil(value * factor) / factor;
    });

    this.functions.set('ROUNDDOWN', (value, digits) => {
      if (typeof value !== 'number' || typeof digits !== 'number') return new Error('#VALUE!');
      const factor = Math.pow(10, digits);
      return Math.floor(value * factor) / factor;
    });

    this.functions.set('SQRT', (value) => {
      if (typeof value !== 'number' || value < 0) return new Error('#NUM!');
      return Math.sqrt(value);
    });

    this.functions.set('POWER', (base, exponent) => {
      if (typeof base !== 'number' || typeof exponent !== 'number') return new Error('#VALUE!');
      return Math.pow(base, exponent);
    });

    // Logical functions
    this.functions.set('IF', (condition, trueValue, falseValue) => {
      return condition ? trueValue : falseValue;
    });

    this.functions.set('AND', (...args) => {
      const values = this.flattenArgs(args);
      return values.every(v => v === true);
    });

    this.functions.set('OR', (...args) => {
      const values = this.flattenArgs(args);
      return values.some(v => v === true);
    });

    this.functions.set('NOT', (value) => {
      return !value;
    });

    // Text functions
    this.functions.set('CONCATENATE', (...args) => {
      return this.flattenArgs(args).map(v => String(v ?? '')).join('');
    });

    this.functions.set('LEFT', (text, numChars = 1) => {
      if (typeof numChars !== 'number') return new Error('#VALUE!');
      return String(text).slice(0, numChars);
    });

    this.functions.set('RIGHT', (text, numChars = 1) => {
      if (typeof numChars !== 'number') return new Error('#VALUE!');
      return String(text).slice(-numChars);
    });

    this.functions.set('MID', (text, start, numChars) => {
      if (typeof start !== 'number' || typeof numChars !== 'number') return new Error('#VALUE!');
      return String(text).slice(start - 1, start - 1 + numChars);
    });

    this.functions.set('LEN', (text) => {
      return String(text).length;
    });

    this.functions.set('UPPER', (text) => {
      return String(text).toUpperCase();
    });

    this.functions.set('LOWER', (text) => {
      return String(text).toLowerCase();
    });

    this.functions.set('TRIM', (text) => {
      return String(text).trim();
    });

    // Date functions
    this.functions.set('TODAY', () => {
      return new Date().toLocaleDateString();
    });

    this.functions.set('NOW', () => {
      return new Date().toLocaleString();
    });

    this.functions.set('YEAR', (dateStr) => {
      const date = new Date(String(dateStr));
      return isNaN(date.getTime()) ? new Error('#VALUE!') : date.getFullYear();
    });

    this.functions.set('MONTH', (dateStr) => {
      const date = new Date(String(dateStr));
      return isNaN(date.getTime()) ? new Error('#VALUE!') : date.getMonth() + 1;
    });

    this.functions.set('DAY', (dateStr) => {
      const date = new Date(String(dateStr));
      return isNaN(date.getTime()) ? new Error('#VALUE!') : date.getDate();
    });

    // Lookup functions
    this.functions.set('VLOOKUP', (lookupValue, tableArray, colIndex, rangeLookup = true) => {
      if (!Array.isArray(tableArray)) return new Error('#REF!');
      if (typeof colIndex !== 'number') return new Error('#VALUE!');
      
      // Simplified VLOOKUP (exact match only for now)
      for (let i = 0; i < tableArray.length; i++) {
        if (tableArray[i] === lookupValue) {
          const rowStart = Math.floor(i / 10); // Assuming 10 columns
          const targetIndex = rowStart * 10 + (colIndex - 1);
          return tableArray[targetIndex] ?? new Error('#N/A');
        }
      }
      
      return new Error('#N/A');
    });

    /**
     * XLOOKUP - Modern replacement for VLOOKUP/HLOOKUP
     * Syntax: XLOOKUP(lookup_value, lookup_array, return_array, [if_not_found], [match_mode], [search_mode])
     * 
     * match_mode:
     *   0 = Exact match (default). If not found, returns #N/A or if_not_found
     *   -1 = Exact match or next smallest item
     *   1 = Exact match or next largest item
     *   2 = Wildcard match (* and ?)
     * 
     * search_mode:
     *   1 = Search first-to-last (default)
     *   -1 = Search last-to-first (reverse)
     *   2 = Binary search (ascending order)
     *   -2 = Binary search (descending order)
     */
    this.functions.set('XLOOKUP', (...args) => {
      const [lookupValue, lookupArray, returnArray, ifNotFound = new Error('#N/A'), matchMode = 0, searchMode = 1] = args;

      // Validate inputs
      if (!Array.isArray(lookupArray)) return new Error('#VALUE!');
      if (!Array.isArray(returnArray)) return new Error('#VALUE!');
      if (lookupArray.length !== returnArray.length) return new Error('#VALUE!');
      if (lookupArray.length === 0) return new Error('#N/A');

      const matchModeNum = typeof matchMode === 'number' ? matchMode : 0;
      const searchModeNum = typeof searchMode === 'number' ? searchMode : 1;

      // Helper: Compare values
      const compare = (a: FormulaValue, b: FormulaValue): number => {
        if (a === b) return 0;
        if (a == null) return -1;
        if (b == null) return 1;
        if (typeof a === 'number' && typeof b === 'number') return a - b;
        const aStr = String(a).toLowerCase();
        const bStr = String(b).toLowerCase();
        return aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
      };

      // Helper: Wildcard match
      const wildcardMatch = (text: string, pattern: string): boolean => {
        const regexPattern = pattern
          .replace(/[.+^${}()|[\]\\]/g, '\\$&')  // Escape regex special chars except * and ?
          .replace(/\*/g, '.*')                    // * matches any characters
          .replace(/\?/g, '.');                    // ? matches single character
        const regex = new RegExp(`^${regexPattern}$`, 'i');
        return regex.test(text);
      };

      // Binary search helper
      const binarySearch = (ascending: boolean): number => {
        let left = 0;
        let right = lookupArray.length - 1;
        let result = -1;

        while (left <= right) {
          const mid = Math.floor((left + right) / 2);
          const cmp = compare(lookupArray[mid], lookupValue);

          if (cmp === 0) {
            return mid;  // Exact match
          }

          if (ascending) {
            if (cmp < 0) {
              result = mid;  // Potential next smallest
              left = mid + 1;
            } else {
              right = mid - 1;
            }
          } else {
            if (cmp > 0) {
              result = mid;  // Potential next largest
              left = mid + 1;
            } else {
              right = mid - 1;
            }
          }
        }

        return result;
      };

      // Search logic based on search_mode
      let foundIndex = -1;

      if (searchModeNum === 2) {
        // Binary search (ascending)
        foundIndex = binarySearch(true);
      } else if (searchModeNum === -2) {
        // Binary search (descending)
        foundIndex = binarySearch(false);
      } else {
        // Linear search
        const startIdx = searchModeNum === -1 ? lookupArray.length - 1 : 0;
        const endIdx = searchModeNum === -1 ? -1 : lookupArray.length;
        const step = searchModeNum === -1 ? -1 : 1;

        if (matchModeNum === 2) {
          // Wildcard match
          const pattern = String(lookupValue);
          for (let i = startIdx; i !== endIdx; i += step) {
            if (wildcardMatch(String(lookupArray[i]), pattern)) {
              foundIndex = i;
              break;
            }
          }
        } else if (matchModeNum === 0) {
          // Exact match
          for (let i = startIdx; i !== endIdx; i += step) {
            if (compare(lookupArray[i], lookupValue) === 0) {
              foundIndex = i;
              break;
            }
          }
        } else if (matchModeNum === -1) {
          // Exact match or next smallest
          let bestIdx = -1;
          let bestValue: FormulaValue = null;

          for (let i = startIdx; i !== endIdx; i += step) {
            const cmp = compare(lookupArray[i], lookupValue);
            if (cmp === 0) {
              foundIndex = i;
              break;
            } else if (cmp < 0) {
              if (bestIdx === -1 || compare(lookupArray[i], bestValue) > 0) {
                bestIdx = i;
                bestValue = lookupArray[i];
              }
            }
          }

          if (foundIndex === -1) foundIndex = bestIdx;
        } else if (matchModeNum === 1) {
          // Exact match or next largest
          let bestIdx = -1;
          let bestValue: FormulaValue = null;

          for (let i = startIdx; i !== endIdx; i += step) {
            const cmp = compare(lookupArray[i], lookupValue);
            if (cmp === 0) {
              foundIndex = i;
              break;
            } else if (cmp > 0) {
              if (bestIdx === -1 || compare(lookupArray[i], bestValue) < 0) {
                bestIdx = i;
                bestValue = lookupArray[i];
              }
            }
          }

          if (foundIndex === -1) foundIndex = bestIdx;
        }
      }

      // Return result or not-found value
      if (foundIndex >= 0) {
        return returnArray[foundIndex];
      }

      return ifNotFound;
    });

    /**
     * INDEX - Return value from array by row/column index
     * Syntax: INDEX(array, row_num, [column_num])
     * 
     * For 1D arrays: INDEX(array, position)
     * For 2D arrays: INDEX(array, row_num, column_num)
     * 
     * Returns #REF! if indices are out of bounds
     */
    this.functions.set('INDEX', (...args) => {
      const [array, rowNum, colNum] = args;

      // Validate array
      if (!Array.isArray(array)) return new Error('#REF!');
      if (array.length === 0) return new Error('#REF!');

      // Check if it's a 2D array (array of arrays)
      const is2D = Array.isArray(array[0]);

      if (is2D) {
        // 2D array handling
        const row = typeof rowNum === 'number' ? rowNum : 0;
        const col = typeof colNum === 'number' ? colNum : 0;

        // Special case: row=0 means return entire column
        if (row === 0 && col > 0) {
          const result: FormulaValue[] = [];
          for (let r = 0; r < array.length; r++) {
            const rowArray = array[r] as FormulaValue[];
            if (Array.isArray(rowArray) && col - 1 < rowArray.length) {
              result.push(rowArray[col - 1]);
            }
          }
          return result.length > 0 ? result : new Error('#REF!');
        }

        // Special case: col=0 means return entire row
        if (col === 0 && row > 0) {
          if (row - 1 < array.length && Array.isArray(array[row - 1])) {
            return array[row - 1] as FormulaValue[];
          }
          return new Error('#REF!');
        }

        // Normal case: return specific cell
        if (row < 1 || col < 1) return new Error('#REF!');
        if (row - 1 >= array.length) return new Error('#REF!');
        
        const rowArray = array[row - 1];
        if (!Array.isArray(rowArray)) return new Error('#REF!');
        if (col - 1 >= rowArray.length) return new Error('#REF!');

        return rowArray[col - 1];
      } else {
        // 1D array handling
        const index = typeof rowNum === 'number' ? rowNum : 0;
        
        if (index < 1 || index > array.length) return new Error('#REF!');
        
        return array[index - 1];
      }
    });

    /**
     * MATCH - Find position of value in array
     * Syntax: MATCH(lookup_value, lookup_array, [match_type])
     * 
     * match_type:
     *   1 (default) = Find largest value less than or equal to lookup_value (array must be sorted ascending)
     *   0 = Find first value exactly equal to lookup_value (array can be unsorted)
     *   -1 = Find smallest value greater than or equal to lookup_value (array must be sorted descending)
     * 
     * Returns position (1-based index) or #N/A if not found
     */
    this.functions.set('MATCH', (...args) => {
      const [lookupValue, lookupArray, matchType = 1] = args;

      // Validate inputs
      if (!Array.isArray(lookupArray)) return new Error('#N/A');
      if (lookupArray.length === 0) return new Error('#N/A');

      const matchTypeNum = typeof matchType === 'number' ? matchType : 1;

      // Helper: Compare values
      const compare = (a: FormulaValue, b: FormulaValue): number => {
        if (a === b) return 0;
        if (a == null) return -1;
        if (b == null) return 1;
        
        // Numeric comparison
        if (typeof a === 'number' && typeof b === 'number') {
          return a - b;
        }
        
        // String comparison (case-insensitive)
        const aStr = String(a).toLowerCase();
        const bStr = String(b).toLowerCase();
        return aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
      };

      // Match type 0: Exact match (unsorted array)
      if (matchTypeNum === 0) {
        for (let i = 0; i < lookupArray.length; i++) {
          if (compare(lookupArray[i], lookupValue) === 0) {
            return i + 1;  // Return 1-based index
          }
        }
        return new Error('#N/A');
      }

      // Match type 1: Largest value <= lookup_value (ascending sorted)
      if (matchTypeNum === 1) {
        let bestIndex = -1;
        
        for (let i = 0; i < lookupArray.length; i++) {
          const cmp = compare(lookupArray[i], lookupValue);
          
          if (cmp === 0) {
            // Exact match - continue to find last occurrence
            bestIndex = i;
          } else if (cmp < 0) {
            // Value is less than lookup - potential candidate
            bestIndex = i;
          } else {
            // Value is greater than lookup - stop searching
            break;
          }
        }
        
        if (bestIndex >= 0) {
          return bestIndex + 1;  // Return 1-based index
        }
        return new Error('#N/A');
      }

      // Match type -1: Smallest value >= lookup_value (descending sorted)
      if (matchTypeNum === -1) {
        let bestIndex = -1;
        
        for (let i = 0; i < lookupArray.length; i++) {
          const cmp = compare(lookupArray[i], lookupValue);
          
          if (cmp === 0) {
            // Exact match - return immediately
            return i + 1;
          } else if (cmp >= 0) {
            // Value is greater than or equal to lookup - potential candidate
            // Keep searching for smallest value >= lookup
            bestIndex = i;
          } else {
            // Value is less than lookup - we've gone too far in descending array
            // Return the last good index
            break;
          }
        }
        
        if (bestIndex >= 0) {
          return bestIndex + 1;  // Return 1-based index
        }
        return new Error('#N/A');
      }

      return new Error('#N/A');
    });

    /**
     * XMATCH - Advanced position finder (Excel 365)
     * Syntax: XMATCH(lookup_value, lookup_array, [match_mode], [search_mode])
     * 
     * Modern replacement for MATCH with enhanced features:
     * - Reverse search capability
     * - Explicit binary search modes
     * - Multiple match modes
     * 
     * match_mode:
     *   0 = Exact match (default), returns #N/A if not found
     *  -1 = Exact match or next smallest item
     *   1 = Exact match or next largest item
     *   2 = Wildcard match (*, ?, ~)
     * 
     * search_mode:
     *   1 = Search first-to-last (default)
     *  -1 = Search last-to-first (reverse search)
     *   2 = Binary search, ascending sort
     *  -2 = Binary search, descending sort
     * 
     * Returns 1-based position in array
     */
    this.functions.set('XMATCH', (...args) => {
      const [lookupValue, lookupArray, matchMode = 0, searchMode = 1] = args;

      // Validate inputs
      if (lookupValue === undefined) return new Error('#VALUE!');
      if (!Array.isArray(lookupArray)) return new Error('#VALUE!');
      if (lookupArray.length === 0) return new Error('#N/A');

      const matchModeNum = typeof matchMode === 'number' ? matchMode : 0;
      const searchModeNum = typeof searchMode === 'number' ? searchMode : 1;

      // Validate modes
      if (![0, -1, 1, 2].includes(matchModeNum)) return new Error('#VALUE!');
      if (![1, -1, 2, -2].includes(searchModeNum)) return new Error('#VALUE!');

      // Helper: Compare values (numeric aware, case-insensitive for strings)
      const compare = (a: FormulaValue, b: FormulaValue): number => {
        if (a === b) return 0;
        if (a == null) return -1;
        if (b == null) return 1;
        
        if (typeof a === 'number' && typeof b === 'number') {
          return a - b;
        }
        
        const aStr = String(a).toLowerCase();
        const bStr = String(b).toLowerCase();
        return aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
      };

      // Helper: Wildcard match (for match_mode=2)
      const wildcardMatch = (text: string, pattern: string): boolean => {
        // Escape special regex chars except * and ?
        let regexPattern = pattern
          .replace(/[.+^${}()|[\]\\]/g, '\\$&')
          .replace(/\*/g, '.*')
          .replace(/\?/g, '.');
        
        const regex = new RegExp(`^${regexPattern}$`, 'i');
        return regex.test(text);
      };

      // BINARY SEARCH modes (2 or -2)
      if (Math.abs(searchModeNum) === 2) {
        const isAscending = searchModeNum === 2;
        let left = 0;
        let right = lookupArray.length - 1;
        let foundIndex = -1;

        while (left <= right) {
          const mid = Math.floor((left + right) / 2);
          const cmp = compare(lookupArray[mid], lookupValue);

          if (cmp === 0) {
            foundIndex = mid;
            break;
          }

          if (isAscending) {
            if (cmp < 0) left = mid + 1;
            else right = mid - 1;
          } else {
            if (cmp > 0) left = mid + 1;
            else right = mid - 1;
          }
        }

        // For binary search, only exact match supported
        if (foundIndex >= 0) {
          return foundIndex + 1;  // 1-based
        }

        // Handle approximate match modes with binary search
        if (matchModeNum === -1) {
          // Exact or next smallest
          if (isAscending) {
            // In ascending array, right pointer is at the largest value < lookupValue
            if (right >= 0) return right + 1;
          } else {
            // In descending array, left pointer is at the smallest value that's still >= lookupValue
            // We need to find the largest value < lookupValue
            if (left < lookupArray.length && compare(lookupArray[left], lookupValue) < 0) {
              return left + 1;
            }
            if (left > 0) return left;  // Previous position
          }
        } else if (matchModeNum === 1) {
          // Exact or next largest
          if (isAscending) {
            // In ascending array, left pointer is at the smallest value > lookupValue
            if (left < lookupArray.length) return left + 1;
          } else {
            // In descending array, right pointer is at the largest value that's still <= lookupValue
            // We need the next larger, which is right+1
            if (right >= 0 && compare(lookupArray[right], lookupValue) > 0) {
              return right + 1;
            }
          }
        }

        return new Error('#N/A');
      }

      // LINEAR SEARCH modes (1 or -1)
      const isReverse = searchModeNum === -1;
      const startIdx = isReverse ? lookupArray.length - 1 : 0;
      const endIdx = isReverse ? -1 : lookupArray.length;
      const step = isReverse ? -1 : 1;

      // Match mode 0: Exact match
      if (matchModeNum === 0) {
        for (let i = startIdx; i !== endIdx; i += step) {
          if (compare(lookupArray[i], lookupValue) === 0) {
            return i + 1;  // 1-based
          }
        }
        return new Error('#N/A');
      }

      // Match mode 2: Wildcard match
      if (matchModeNum === 2) {
        const lookupStr = String(lookupValue);
        for (let i = startIdx; i !== endIdx; i += step) {
          const itemStr = String(lookupArray[i]);
          if (wildcardMatch(itemStr, lookupStr)) {
            return i + 1;  // 1-based
          }
        }
        return new Error('#N/A');
      }

      // Match mode -1: Exact or next smallest
      if (matchModeNum === -1) {
        let bestIdx = -1;
        let bestValue: FormulaValue = null;

        for (let i = startIdx; i !== endIdx; i += step) {
          const cmp = compare(lookupArray[i], lookupValue);
          if (cmp === 0) {
            return i + 1;  // Exact match found
          } else if (cmp < 0) {
            // Value is less than lookup - potential candidate
            if (bestIdx === -1 || compare(lookupArray[i], bestValue) > 0) {
              bestIdx = i;
              bestValue = lookupArray[i];
            }
          }
        }

        if (bestIdx >= 0) return bestIdx + 1;
        return new Error('#N/A');
      }

      // Match mode 1: Exact or next largest
      if (matchModeNum === 1) {
        let bestIdx = -1;
        let bestValue: FormulaValue = null;

        for (let i = startIdx; i !== endIdx; i += step) {
          const cmp = compare(lookupArray[i], lookupValue);
          if (cmp === 0) {
            return i + 1;  // Exact match found
          } else if (cmp > 0) {
            // Value is greater than lookup - potential candidate
            if (bestIdx === -1 || compare(lookupArray[i], bestValue) < 0) {
              bestIdx = i;
              bestValue = lookupArray[i];
            }
          }
        }

        if (bestIdx >= 0) return bestIdx + 1;
        return new Error('#N/A');
      }

      return new Error('#N/A');
    });

    /**
     * SEQUENCE - Generate array of sequential numbers (Excel 365)
     * Syntax: SEQUENCE(rows, [columns], [start], [step])
     * 
     * Generates a sequential array of numbers. This is a dynamic array function
     * that spills results into multiple cells.
     * 
     * Parameters:
     * - rows: Number of rows to generate (required)
     * - columns: Number of columns (default = 1)
     * - start: Starting value (default = 1)
     * - step: Increment between values (default = 1)
     * 
     * Returns:
     * - 1D array if columns=1: [start, start+step, start+2*step, ...]
     * - 2D array if columns>1: [[val1, val2, ...], [val3, val4, ...], ...]
     * 
     * Examples:
     * SEQUENCE(5) → [1, 2, 3, 4, 5] (vertical)
     * SEQUENCE(3, 3) → [[1,2,3], [4,5,6], [7,8,9]]
     * SEQUENCE(5, 1, 10, 2) → [10, 12, 14, 16, 18]
     * SEQUENCE(4, 2, 0, 0.5) → [[0,0.5], [1,1.5], [2,2.5], [3,3.5]]
     */
    this.functions.set('SEQUENCE', (...args) => {
      const [rows, columns = 1, start = 1, step = 1] = args;

      // Validate required parameter
      if (rows === undefined) {
        return new Error('#VALUE!');
      }

      // Convert and validate parameters
      const rowsNum = typeof rows === 'number' ? rows : Number(rows);
      const colsNum = typeof columns === 'number' ? columns : Number(columns);
      const startNum = typeof start === 'number' ? start : Number(start);
      const stepNum = typeof step === 'number' ? step : Number(step);

      // Check for valid numbers
      if (isNaN(rowsNum) || isNaN(colsNum) || isNaN(startNum) || isNaN(stepNum)) {
        return new Error('#VALUE!');
      }

      // Rows and columns must be positive integers
      if (rowsNum < 1 || colsNum < 1) {
        return new Error('#VALUE!');
      }

      // Convert to integers (Excel rounds down)
      const numRows = Math.floor(rowsNum);
      const numCols = Math.floor(colsNum);

      // Check for reasonable limits (prevent memory issues)
      const totalCells = numRows * numCols;
      if (totalCells > 1000000) {  // 1 million cell limit
        return new Error('#NUM!');
      }

      // Generate sequence
      let currentValue = startNum;
      
      // Single column (1D array) - return as column array
      if (numCols === 1) {
        const result: FormulaValue[] = [];
        for (let r = 0; r < numRows; r++) {
          result.push(currentValue);
          currentValue += stepNum;
        }
        return result;
      }

      // Multiple columns (2D array)
      const result: FormulaValue[][] = [];
      for (let r = 0; r < numRows; r++) {
        const row: FormulaValue[] = [];
        for (let c = 0; c < numCols; c++) {
          row.push(currentValue);
          currentValue += stepNum;
        }
        result.push(row);
      }

      return result;
    });

    /**
     * UNIQUE - Extract unique values from array (Excel 365)
     * Syntax: UNIQUE(array, [by_col], [exactly_once])
     * 
     * Returns unique values from an array, removing duplicates.
     * This is a dynamic array function that spills results.
     * 
     * Parameters:
     * - array: The array to process (required)
     * - by_col: Logical value - FALSE/0 to compare rows (default), TRUE/1 to compare columns
     * - exactly_once: Logical value - FALSE/0 to return all unique values (default), 
     *                 TRUE/1 to return only values that appear exactly once
     * 
     * Returns:
     * - 1D array if input is 1D
     * - 2D array if input is 2D (preserves structure)
     * 
     * Examples:
     * UNIQUE([1,2,2,3,3,3]) → [1,2,3]
     * UNIQUE([1,2,2,3,3,3], FALSE, TRUE) → [1] (only value appearing once)
     * UNIQUE([[1,2],[1,2],[3,4]]) → [[1,2],[3,4]]
     * UNIQUE(SEQUENCE(5)) → [1,2,3,4,5] (all unique)
     */
    this.functions.set('UNIQUE', (...args) => {
      const [array, byCol = false, exactlyOnce = false] = args;

      // Validate required parameter
      if (array === undefined) {
        return new Error('#VALUE!');
      }

      // Validate array input
      if (!Array.isArray(array)) {
        return new Error('#VALUE!');
      }

      if (array.length === 0) {
        return new Error('#CALC!');
      }

      const byColumn = byCol === true || byCol === 1;
      const onlyOnce = exactlyOnce === true || exactlyOnce === 1;

      // Check if array is 2D
      const is2D = Array.isArray(array[0]);

      // Handle 1D arrays
      if (!is2D) {
        // Create a map to count occurrences
        const countMap = new Map<string, { value: FormulaValue; count: number }>();

        for (const item of array) {
          // Use JSON.stringify for consistent key generation
          const key = JSON.stringify(item);
          
          if (countMap.has(key)) {
            countMap.get(key)!.count++;
          } else {
            countMap.set(key, { value: item, count: 1 });
          }
        }

        // Filter based on exactly_once parameter
        const result: FormulaValue[] = [];
        
        for (const { value, count } of countMap.values()) {
          if (onlyOnce) {
            // Only include values that appear exactly once
            if (count === 1) {
              result.push(value);
            }
          } else {
            // Include all unique values (first occurrence)
            result.push(value);
          }
        }

        return result.length > 0 ? result : new Error('#CALC!');
      }

      // Handle 2D arrays
      if (byColumn) {
        // Compare columns for uniqueness
        // Transpose logic: compare each column as a unit
        const numRows = array.length;
        const firstRow = array[0];
        
        // Type guard for 2D array
        if (!Array.isArray(firstRow)) {
          return new Error('#VALUE!');
        }
        
        const numCols = firstRow.length;

        // Extract columns
        const columns: FormulaValue[][] = [];
        for (let c = 0; c < numCols; c++) {
          const column: FormulaValue[] = [];
          for (let r = 0; r < numRows; r++) {
            column.push((array[r] as FormulaValue[])[c]);
          }
          columns.push(column);
        }

        // Count occurrences of each column
        const countMap = new Map<string, { column: FormulaValue[]; count: number }>();

        for (const col of columns) {
          const key = JSON.stringify(col);
          
          if (countMap.has(key)) {
            countMap.get(key)!.count++;
          } else {
            countMap.set(key, { column: col, count: 1 });
          }
        }

        // Filter based on exactly_once
        const uniqueColumns: FormulaValue[][] = [];
        
        for (const { column, count } of countMap.values()) {
          if (onlyOnce) {
            if (count === 1) {
              uniqueColumns.push(column);
            }
          } else {
            uniqueColumns.push(column);
          }
        }

        if (uniqueColumns.length === 0) {
          return new Error('#CALC!');
        }

        // Reconstruct result as rows
        const result: FormulaValue[][] = [];
        for (let r = 0; r < numRows; r++) {
          const row: FormulaValue[] = [];
          for (let c = 0; c < uniqueColumns.length; c++) {
            row.push(uniqueColumns[c][r]);
          }
          result.push(row);
        }

        return result;
      } else {
        // Compare rows for uniqueness (default)
        const countMap = new Map<string, { row: FormulaValue[], count: number }>();

        for (const row of array) {
          // Use JSON.stringify for consistent key generation
          const key = JSON.stringify(row);
          
          if (countMap.has(key)) {
            countMap.get(key)!.count++;
          } else {
            countMap.set(key, { row: row as FormulaValue[], count: 1 });
          }
        }

        // Filter based on exactly_once parameter
        const result: FormulaValue[][] = [];
        
        for (const { row, count } of countMap.values()) {
          if (onlyOnce) {
            // Only include rows that appear exactly once
            if (count === 1) {
              result.push(row);
            }
          } else {
            // Include all unique rows (first occurrence)
            result.push(row);
          }
        }

        return result.length > 0 ? result : new Error('#CALC!');
      }
    });

    /**
     * SORT - Sort array in ascending or descending order (Excel 365)
     * Syntax: SORT(array, [sort_index], [sort_order], [by_col])
     * 
     * Sorts the contents of an array or range by specified column(s) or row(s).
     * This is a dynamic array function that spills results.
     * Uses stable sort algorithm to preserve relative order of equal items.
     * 
     * Parameters:
     * - array: The array or range to sort (required)
     * - sort_index: Number indicating which row or column to sort by (default: 1)
     * - sort_order: Sort order - 1 for ascending (default), -1 for descending
     * - by_col: Logical - FALSE/0 to sort by row (default), TRUE/1 to sort by column
     * 
     * Returns:
     * - Sorted array with same dimensions as input
     * - #VALUE! if parameters are invalid
     * - #CALC! if array is empty
     * 
     * Examples:
     * SORT([3,1,4,1,5,9,2,6]) → [1,1,2,3,4,5,6,9]
     * SORT([[3,"C"],[1,"A"],[2,"B"]], 1, 1) → [[1,"A"],[2,"B"],[3,"C"]]
     * SORT([[3,"C"],[1,"A"],[2,"B"]], 2, 1) → [[1,"A"],[2,"B"],[3,"C"]]
     * SORT([3,1,4,1,5,9,2,6], 1, -1) → [9,6,5,4,3,2,1,1]
     */
    this.functions.set('SORT', (...args) => {
      const [array, sortIndex = 1, sortOrder = 1, byCol = false] = args;

      // Validate required parameter
      if (array === undefined) {
        return new Error('#VALUE!');
      }

      // Validate array input
      if (!Array.isArray(array)) {
        return new Error('#VALUE!');
      }

      if (array.length === 0) {
        return new Error('#CALC!');
      }

      // Parse parameters
      const index = typeof sortIndex === 'number' ? sortIndex : 1;
      const order = sortOrder === -1 ? -1 : 1; // 1 = ascending, -1 = descending
      const byColumn = byCol === true || byCol === 1;

      // Check if array is 2D
      const is2D = Array.isArray(array[0]);

      // Handle 1D arrays
      if (!is2D) {
        // Validate sort index
        if (index !== 1) {
          return new Error('#VALUE!');
        }

        // Create array of [value, originalIndex] for stable sort
        const indexed = array.map((value, idx) => ({ value, idx }));

        // Sort with stable algorithm
        indexed.sort((a, b) => {
          const valA = a.value;
          const valB = b.value;

          // Compare values
          let comparison = 0;
          
          if (valA === null && valB === null) {
            comparison = 0;
          } else if (valA === null) {
            comparison = 1; // null sorts to end
          } else if (valB === null) {
            comparison = -1; // null sorts to end
          } else if (typeof valA === 'string' && typeof valB === 'string') {
            comparison = valA.localeCompare(valB);
          } else if (typeof valA === 'number' && typeof valB === 'number') {
            comparison = valA - valB;
          } else if (typeof valA === 'boolean' && typeof valB === 'boolean') {
            comparison = (valA ? 1 : 0) - (valB ? 1 : 0);
          } else {
            // Mixed types: convert to string for comparison
            comparison = String(valA).localeCompare(String(valB));
          }

          // Apply sort order
          comparison *= order;

          // If equal, use original index for stable sort
          if (comparison === 0) {
            comparison = a.idx - b.idx;
          }

          return comparison;
        });

        // Extract sorted values
        return indexed.map(item => item.value);
      }

      // Handle 2D arrays
      const firstRow = array[0];
      if (!Array.isArray(firstRow)) {
        return new Error('#VALUE!');
      }

      if (byColumn) {
        // Sort by row (transpose, sort, transpose back)
        const numRows = array.length;
        const numCols = firstRow.length;

        // Validate sort index
        if (index < 1 || index > numRows) {
          return new Error('#VALUE!');
        }

        // Extract columns
        const columns: Array<{ values: FormulaValue[]; idx: number }> = [];
        for (let c = 0; c < numCols; c++) {
          const column: FormulaValue[] = [];
          for (let r = 0; r < numRows; r++) {
            column.push((array[r] as FormulaValue[])[c]);
          }
          columns.push({ values: column, idx: c });
        }

        // Sort columns by specified row index (1-based)
        const sortRowIndex = index - 1;
        columns.sort((a, b) => {
          const valA = a.values[sortRowIndex];
          const valB = b.values[sortRowIndex];

          let comparison = 0;
          
          if (valA === null && valB === null) {
            comparison = 0;
          } else if (valA === null) {
            comparison = 1;
          } else if (valB === null) {
            comparison = -1;
          } else if (typeof valA === 'string' && typeof valB === 'string') {
            comparison = valA.localeCompare(valB);
          } else if (typeof valA === 'number' && typeof valB === 'number') {
            comparison = valA - valB;
          } else if (typeof valA === 'boolean' && typeof valB === 'boolean') {
            comparison = (valA ? 1 : 0) - (valB ? 1 : 0);
          } else {
            comparison = String(valA).localeCompare(String(valB));
          }

          comparison *= order;

          // Stable sort by original index
          if (comparison === 0) {
            comparison = a.idx - b.idx;
          }

          return comparison;
        });

        // Reconstruct result as rows
        const result: FormulaValue[][] = [];
        for (let r = 0; r < numRows; r++) {
          const row: FormulaValue[] = [];
          for (let c = 0; c < columns.length; c++) {
            row.push(columns[c].values[r]);
          }
          result.push(row);
        }

        return result;
      } else {
        // Sort by column (default)
        const numCols = firstRow.length;

        // Validate sort index
        if (index < 1 || index > numCols) {
          return new Error('#VALUE!');
        }

        // Create array of [row, originalIndex] for stable sort
        const indexed = array.map((row, idx) => ({ 
          row: row as FormulaValue[], 
          idx 
        }));

        // Sort rows by specified column index (1-based)
        const sortColIndex = index - 1;
        indexed.sort((a, b) => {
          const valA = a.row[sortColIndex];
          const valB = b.row[sortColIndex];

          let comparison = 0;
          
          if (valA === null && valB === null) {
            comparison = 0;
          } else if (valA === null) {
            comparison = 1; // null sorts to end
          } else if (valB === null) {
            comparison = -1; // null sorts to end
          } else if (typeof valA === 'string' && typeof valB === 'string') {
            comparison = valA.localeCompare(valB);
          } else if (typeof valA === 'number' && typeof valB === 'number') {
            comparison = valA - valB;
          } else if (typeof valA === 'boolean' && typeof valB === 'boolean') {
            comparison = (valA ? 1 : 0) - (valB ? 1 : 0);
          } else {
            // Mixed types: convert to string
            comparison = String(valA).localeCompare(String(valB));
          }

          // Apply sort order
          comparison *= order;

          // Stable sort: if equal, preserve original order
          if (comparison === 0) {
            comparison = a.idx - b.idx;
          }

          return comparison;
        });

        // Extract sorted rows
        return indexed.map(item => item.row);
      }
    });

    /**
     * SORTBY - Sort array based on values in another array (Excel 365)
     * Syntax: SORTBY(array, by_array1, [sort_order1], [by_array2], [sort_order2], ...)
     * 
     * Sorts the contents of an array based on the values in corresponding arrays.
     * Supports multi-key sorting with different sort orders for each key.
     * This is a dynamic array function that spills results.
     * Uses stable sort algorithm to preserve relative order of equal items.
     * 
     * Parameters:
     * - array: The array or range to sort (required)
     * - by_array1: The array to sort by (required)
     * - sort_order1: Sort order for by_array1 - 1 for ascending (default), -1 for descending
     * - by_array2, sort_order2, ...: Additional arrays and sort orders (optional)
     * 
     * Returns:
     * - Sorted array with same dimensions as input array
     * - #VALUE! if parameters are invalid or array sizes don't match
     * - #CALC! if array is empty
     * 
     * Examples:
     * SORTBY([A,B,C], [3,1,2]) → [B,C,A] (sort by second array)
     * SORTBY([[A,1],[B,3],[C,2]], [3,1,2]) → [[B,3],[C,2],[A,1]]
     * SORTBY([A,B,C], [2,1,2], 1, [Y,X,Z], -1) → Multi-key sort
     */
    this.functions.set('SORTBY', (...args) => {
      // Validate minimum arguments
      if (args.length < 2) {
        return new Error('#VALUE!');
      }

      const array = args[0];

      // Validate array parameter
      if (!Array.isArray(array) || array.length === 0) {
        return new Error('#VALUE!');
      }

      // Parse by_array and sort_order pairs
      const sortKeys: Array<{ byArray: FormulaValue[]; order: number }> = [];
      
      for (let i = 1; i < args.length; i += 2) {
        const byArray = args[i];
        const sortOrder = args[i + 1] !== undefined ? args[i + 1] : 1;

        // Validate by_array
        if (!Array.isArray(byArray)) {
          return new Error('#VALUE!');
        }

        // Check array length compatibility
        if (byArray.length !== array.length) {
          return new Error('#VALUE!');
        }

        const order = sortOrder === -1 ? -1 : 1;
        sortKeys.push({ byArray, order });
      }

      // If no sort keys, return error
      if (sortKeys.length === 0) {
        return new Error('#VALUE!');
      }

      // Check if array is 2D
      const is2D = Array.isArray(array[0]);

      // Create indexed array for stable sort
      const indexed = array.map((item, idx) => ({
        item,
        idx,
        // Store sort keys for this index
        keys: sortKeys.map(sk => sk.byArray[idx])
      }));

      // Multi-key stable sort
      indexed.sort((a, b) => {
        // Compare by each sort key in order
        for (let keyIdx = 0; keyIdx < sortKeys.length; keyIdx++) {
          const valA = a.keys[keyIdx];
          const valB = b.keys[keyIdx];
          const order = sortKeys[keyIdx].order;

          let comparison = 0;

          // Compare values
          if (valA === null && valB === null) {
            comparison = 0;
          } else if (valA === null) {
            comparison = 1; // null sorts to end
          } else if (valB === null) {
            comparison = -1; // null sorts to end
          } else if (typeof valA === 'string' && typeof valB === 'string') {
            comparison = valA.localeCompare(valB);
          } else if (typeof valA === 'number' && typeof valB === 'number') {
            comparison = valA - valB;
          } else if (typeof valA === 'boolean' && typeof valB === 'boolean') {
            comparison = (valA ? 1 : 0) - (valB ? 1 : 0);
          } else {
            // Mixed types: convert to string
            comparison = String(valA).localeCompare(String(valB));
          }

          // Apply sort order
          comparison *= order;

          // If not equal, return comparison
          if (comparison !== 0) {
            return comparison;
          }

          // If equal, continue to next key
        }

        // All keys equal: stable sort by original index
        return a.idx - b.idx;
      });

      // Extract sorted items
      return indexed.map(item => item.item);
    });

    /**
     * HLOOKUP - Horizontal Lookup
     * Syntax: HLOOKUP(lookup_value, table_array, row_index_num, [range_lookup])
     * 
     * Searches for a value in the top row of a table and returns a value 
     * in the same column from a row you specify.
     * 
     * lookup_value: The value to search for in the first row
     * table_array: 2D array to search in
     * row_index_num: The row number (1-based) from which to return a value
     * range_lookup: TRUE/1 for approximate match (default), FALSE/0 for exact match
     * 
     * Approximate match requires the first row to be sorted in ascending order
     */
    this.functions.set('HLOOKUP', (...args) => {
      const [lookupValue, tableArray, rowIndexNum, rangeLookup = true] = args;

      // Validate inputs
      if (!Array.isArray(tableArray) || tableArray.length === 0) {
        return new Error('#REF!');
      }
      
      // Ensure table is 2D array
      if (!Array.isArray(tableArray[0])) {
        return new Error('#REF!');
      }

      const rowIndex = typeof rowIndexNum === 'number' ? rowIndexNum : 0;
      if (rowIndex < 1 || rowIndex > tableArray.length) {
        return new Error('#REF!');
      }

      const firstRow = tableArray[0];
      const isApproximate = rangeLookup === true || rangeLookup === 1;

      // Helper: Compare values
      const compare = (a: FormulaValue, b: FormulaValue): number => {
        if (a === b) return 0;
        if (a == null) return -1;
        if (b == null) return 1;
        
        // Numeric comparison (both must be numbers)
        if (typeof a === 'number' && typeof b === 'number') {
          return a - b;
        }
        
        // If types differ, treat as string comparison
        const aStr = String(a).toLowerCase();
        const bStr = String(b).toLowerCase();
        return aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
      };

      // Helper: Wildcard matching
      const matchesWildcard = (value: FormulaValue, pattern: FormulaValue): boolean => {
        if (typeof pattern !== 'string') return false;
        
        const hasWildcard = pattern.includes('*') || pattern.includes('?');
        if (!hasWildcard) return false;

        const regexPattern = pattern
          .replace(/[.+^${}()|[\]\\]/g, '\\$&')  // Escape regex special chars
          .replace(/\*/g, '.*')  // * matches any sequence
          .replace(/\?/g, '.');  // ? matches single char
        
        const regex = new RegExp('^' + regexPattern + '$', 'i');
        return regex.test(String(value));
      };

      // Exact match mode (range_lookup = FALSE)
      if (!isApproximate) {
        for (let col = 0; col < firstRow.length; col++) {
          const cellValue = firstRow[col];
          
          // Check exact match (case-insensitive for text)
          if (compare(cellValue, lookupValue) === 0) {
            const targetRow = tableArray[rowIndex - 1];
            if (Array.isArray(targetRow) && col < targetRow.length) {
              return targetRow[col];
            }
            return new Error('#REF!');
          }
          
          // Check wildcard match if lookup value contains wildcards
          if (typeof lookupValue === 'string' && matchesWildcard(cellValue, lookupValue)) {
            const targetRow = tableArray[rowIndex - 1];
            if (Array.isArray(targetRow) && col < targetRow.length) {
              return targetRow[col];
            }
            return new Error('#REF!');
          }
        }
        
        return new Error('#N/A');
      }

      // Approximate match mode (range_lookup = TRUE)
      // First row must be sorted in ascending order
      let bestCol = -1;
      
      for (let col = 0; col < firstRow.length; col++) {
        const cellValue = firstRow[col];
        
        // Skip cells with incompatible types (e.g., string header when looking for number)
        const lookupIsNumber = typeof lookupValue === 'number';
        const cellIsNumber = typeof cellValue === 'number';
        
        if (lookupIsNumber !== cellIsNumber) {
          continue;  // Skip type mismatches in approximate mode
        }
        
        const cmp = compare(cellValue, lookupValue);
        
        if (cmp === 0) {
          // Exact match found
          bestCol = col;
          break;
        } else if (cmp < 0) {
          // Cell value is less than lookup value
          // This is a potential match (largest value <= lookup)
          bestCol = col;
        } else {
          // Cell value is greater than lookup value
          // Stop searching (assumes sorted order)
          break;
        }
      }
      
      if (bestCol >= 0) {
        const targetRow = tableArray[rowIndex - 1];
        if (Array.isArray(targetRow) && bestCol < targetRow.length) {
          return targetRow[bestCol];
        }
        return new Error('#REF!');
      }
      
      return new Error('#N/A');
    });

    /**
     * CHOOSE - Select value from list by index
     * Syntax: CHOOSE(index_num, value1, [value2], ...)
     * 
     * Returns the value from a list of values based on the index number.
     * Index is 1-based (first value is index 1).
     * 
     * index_num: Which value to return (1-based index)
     * value1, value2, ...: List of values to choose from (1 to 254 values)
     * 
     * Returns #VALUE! if index_num < 1 or > number of values
     * 
     * Examples:
     *   CHOOSE(2, "Red", "Green", "Blue") → "Green"
     *   CHOOSE(1, 100, 200, 300) → 100
     *   CHOOSE(0, "A", "B") → #VALUE!
     *   CHOOSE(5, "A", "B") → #VALUE!
     */
    this.functions.set('CHOOSE', (...args) => {
      if (args.length < 2) {
        return new Error('#VALUE!');
      }

      const [indexNum, ...values] = args;

      // Validate index is a number
      if (typeof indexNum !== 'number') {
        return new Error('#VALUE!');
      }

      // Index must be integer (Excel truncates decimals)
      const index = Math.floor(indexNum);

      // Index must be >= 1 and <= number of values
      if (index < 1 || index > values.length) {
        return new Error('#VALUE!');
      }

      // Return value at index (convert from 1-based to 0-based)
      return values[index - 1];
    });

    /**
     * OFFSET - Return a reference offset from a starting cell/range
     * Syntax: OFFSET(reference, rows, cols, [height], [width])
     * 
     * Returns a reference to a range that is offset from a starting reference.
     * 
     * reference: Starting array/range (can be single cell or multi-cell)
     * rows: Number of rows to offset (positive = down, negative = up)
     * cols: Number of columns to offset (positive = right, negative = left)
     * height: (Optional) Height of the returned range in rows (default: height of reference)
     * width: (Optional) Width of the returned range in columns (default: width of reference)
     * 
     * Returns #REF! if the offset range is invalid or out of bounds
     * Returns #VALUE! if rows/cols are not numeric
     * 
     * Note: In this implementation, reference should be a 2D array representing the data range.
     *       The function returns the offset portion of that array.
     * 
     * Examples:
     *   OFFSET([[1,2,3],[4,5,6]], 1, 0) → [[4,5,6]] (move down 1 row)
     *   OFFSET([[1,2,3],[4,5,6]], 0, 1, 2, 1) → [[2],[5]] (move right 1 col, 2 rows × 1 col)
     *   OFFSET([[1,2,3],[4,5,6]], 0, 0, 1, 2) → [[1,2]] (first row, 2 columns)
     */
    this.functions.set('OFFSET', (...args) => {
      if (args.length < 3) {
        return new Error('#VALUE!');
      }

      const [reference, rowsOffset, colsOffset, height, width] = args;

      // Validate reference is an array
      if (!Array.isArray(reference)) {
        return new Error('#REF!');
      }

      // Validate offsets are numeric
      if (typeof rowsOffset !== 'number' || typeof colsOffset !== 'number') {
        return new Error('#VALUE!');
      }

      // Convert offsets to integers
      const rows = Math.floor(rowsOffset);
      const cols = Math.floor(colsOffset);

      // Determine if reference is 1D or 2D
      const is2D = Array.isArray(reference[0]);
      
      let refHeight: number;
      let refWidth: number;
      let sourceArray: any[][];

      if (is2D) {
        // 2D array
        sourceArray = reference as any[][];
        refHeight = sourceArray.length;
        refWidth = refHeight > 0 ? sourceArray[0].length : 0;
      } else {
        // 1D array - treat as single row
        sourceArray = [reference];
        refHeight = 1;
        refWidth = reference.length;
      }

      // Determine result dimensions
      // If height/width not specified, use remaining portion after offset
      let resultHeight: number;
      let resultWidth: number;
      
      if (typeof height === 'number') {
        resultHeight = Math.floor(height);
        // Validate height is positive
        if (resultHeight <= 0) {
          return new Error('#REF!');
        }
      } else {
        // Use remaining rows after offset
        resultHeight = refHeight - rows;
      }
      
      if (typeof width === 'number') {
        resultWidth = Math.floor(width);
        // Validate width is positive
        if (resultWidth <= 0) {
          return new Error('#REF!');
        }
      } else {
        // Use remaining columns after offset
        resultWidth = refWidth - cols;
      }

      // Validate final dimensions are positive
      if (resultHeight <= 0 || resultWidth <= 0) {
        return new Error('#REF!');
      }

      // Calculate starting position
      const startRow = rows;
      const startCol = cols;

      // Validate bounds: start position must be within or allow negative offset
      if (startRow < 0 || startCol < 0) {
        return new Error('#REF!');
      }

      // Validate end position is within source array
      const endRow = startRow + resultHeight;
      const endCol = startCol + resultWidth;

      if (endRow > refHeight || endCol > refWidth) {
        return new Error('#REF!');
      }

      // Extract the offset range
      const result: any[][] = [];
      
      for (let r = 0; r < resultHeight; r++) {
        const sourceRow = sourceArray[startRow + r];
        if (!sourceRow) {
          return new Error('#REF!');
        }

        const resultRow: any[] = [];
        for (let c = 0; c < resultWidth; c++) {
          const sourceCol = startCol + c;
          if (sourceCol >= sourceRow.length) {
            return new Error('#REF!');
          }
          resultRow.push(sourceRow[sourceCol]);
        }
        result.push(resultRow);
      }

      // Return format based on result dimensions
      if (resultHeight === 1 && resultWidth === 1) {
        // Single cell - return the value directly
        return result[0][0];
      } else if (resultHeight === 1) {
        // Single row - return 1D array
        return result[0];
      } else if (resultWidth === 1) {
        // Single column - return 1D array of values
        return result.map(row => row[0]);
      } else {
        // Multi-row, multi-column - return 2D array
        return result;
      }
    });

    /**
     * INDIRECT - Return reference specified by text string
     * Syntax: INDIRECT(ref_text, [a1])
     * 
     * Returns the reference specified by a text string as a formatted address string.
     * 
     * ref_text: Text string representing a cell reference
     * a1: (Optional) Logical value - TRUE/1 for A1 style (default), FALSE/0 for R1C1 style
     * 
     * Returns #REF! if ref_text is not a valid cell reference
     * Returns #VALUE! if ref_text is not a string
     * 
     * Returns: Validated and normalized cell/range reference string
     * 
     * A1 Style Examples:
     *   INDIRECT("A1") → "A1"
     *   INDIRECT("B5") → "B5"
     *   INDIRECT("A1:C3") → "A1:C3"
     *   INDIRECT("Sheet1!A1") → "Sheet1!A1"
     *   INDIRECT("a1") → "A1" (normalized to uppercase)
     * 
     * R1C1 Style Examples:
     *   INDIRECT("R1C1", FALSE) → "R1C1"
     *   INDIRECT("R5C2", FALSE) → "R5C2"
     *   INDIRECT("R1C1:R3C3", FALSE) → "R1C1:R3C3"
     * 
     * Style Conversion:
     *   INDIRECT("R1C1", FALSE) → "R1C1" (R1C1 to R1C1)
     *   INDIRECT("A1", TRUE) → "A1" (A1 to A1)
     */
    this.functions.set('INDIRECT', (...args) => {
      if (args.length < 1) {
        return new Error('#VALUE!');
      }

      const [refText, a1Style = true] = args;

      // Validate ref_text is a string
      if (typeof refText !== 'string') {
        return new Error('#VALUE!');
      }

      const isA1 = a1Style === true || a1Style === 1;

      // Helper: Parse A1-style reference (e.g., "A1", "B5", "AA100")
      const parseA1Reference = (ref: string): { row: number; col: number } | null => {
        const match = ref.match(/^([A-Z]+)(\d+)$/i);
        if (!match) return null;

        const colStr = match[1].toUpperCase();
        const rowStr = match[2];

        // Convert column letters to number (A=1, B=2, ..., Z=26, AA=27, etc.)
        let col = 0;
        for (let i = 0; i < colStr.length; i++) {
          col = col * 26 + (colStr.charCodeAt(i) - 65 + 1);
        }

        const row = parseInt(rowStr, 10);

        if (row < 1 || col < 1 || row > 1048576 || col > 16384) {
          return null; // Excel limits: 1048576 rows, 16384 columns
        }

        return { row, col };
      };

      // Helper: Parse R1C1-style reference (e.g., "R1C1", "R5C10")
      const parseR1C1Reference = (ref: string): { row: number; col: number } | null => {
        const match = ref.match(/^R(\d+)C(\d+)$/i);
        if (!match) return null;

        const row = parseInt(match[1], 10);
        const col = parseInt(match[2], 10);

        if (row < 1 || col < 1 || row > 1048576 || col > 16384) {
          return null;
        }

        return { row, col };
      };

      // Helper: Convert column number to letters (1=A, 2=B, ..., 27=AA)
      const colToLetters = (col: number): string => {
        let letters = '';
        while (col > 0) {
          const remainder = (col - 1) % 26;
          letters = String.fromCharCode(65 + remainder) + letters;
          col = Math.floor((col - 1) / 26);
        }
        return letters;
      };

      // Remove any whitespace
      const cleanRef = refText.trim();

      // Check for sheet name (e.g., "Sheet1!A1")
      let sheetName: string | undefined;
      let cellRef = cleanRef;
      
      const sheetSeparator = cleanRef.indexOf('!');
      if (sheetSeparator > 0) {
        sheetName = cleanRef.substring(0, sheetSeparator);
        cellRef = cleanRef.substring(sheetSeparator + 1);
      }

      // Check for range reference (e.g., "A1:C3")
      const rangeSeparator = cellRef.indexOf(':');
      if (rangeSeparator > 0) {
        const startRef = cellRef.substring(0, rangeSeparator);
        const endRef = cellRef.substring(rangeSeparator + 1);

        let start: { row: number; col: number } | null;
        let end: { row: number; col: number } | null;

        if (isA1) {
          start = parseA1Reference(startRef);
          end = parseA1Reference(endRef);
        } else {
          start = parseR1C1Reference(startRef);
          end = parseR1C1Reference(endRef);
        }

        if (!start || !end) {
          return new Error('#REF!');
        }

        // Validate range is valid (start before end)
        if (start.row > end.row || start.col > end.col) {
          return new Error('#REF!');
        }

        // Return normalized range string
        const normalizedRange = isA1
          ? `${colToLetters(start.col)}${start.row}:${colToLetters(end.col)}${end.row}`
          : `R${start.row}C${start.col}:R${end.row}C${end.col}`;

        return sheetName ? `${sheetName}!${normalizedRange}` : normalizedRange;
      }

      // Parse single cell reference
      let parsed: { row: number; col: number } | null;

      if (isA1) {
        parsed = parseA1Reference(cellRef);
      } else {
        parsed = parseR1C1Reference(cellRef);
      }

      if (!parsed) {
        return new Error('#REF!');
      }

      // Return normalized cell reference string
      const normalizedCell = isA1
        ? `${colToLetters(parsed.col)}${parsed.row}`
        : `R${parsed.row}C${parsed.col}`;

      return sheetName ? `${sheetName}!${normalizedCell}` : normalizedCell;
    });
  }

  /**
   * Registers a custom function
   */
  registerFunction(name: string, func: FormulaFunction): void {
    this.functions.set(name.toUpperCase(), func);
  }

  /**
   * Recalculates all cells that depend on the given cell
   */
  recalculate(worksheet: Worksheet, changedCell: Address): Address[] {
    const dependents = this.dependencyGraph.getDependents(changedCell);
    const toRecalc = this.dependencyGraph.getTopologicalOrder(dependents);

    for (const addr of toRecalc) {
      const cell = worksheet.getCell(addr);
      if (cell?.formula) {
        const value = this.evaluate(cell.formula, { worksheet, currentCell: addr });
        // Only set value if it's not an error (CellValue doesn't support Error type)
        if (!(value instanceof Error)) {
          // Handle arrays: for now, store as string representation
          // TODO: Implement proper spill behavior in Phase 2
          if (Array.isArray(value)) {
            worksheet.setCellValue(addr, JSON.stringify(value));
          } else {
            worksheet.setCellValue(addr, value);
          }
        }
      }
    }

    return toRecalc;
  }

  /**
   * Clears dependency tracking for a cell
   */
  clearCellDependencies(addr: Address): void {
    this.dependencyGraph.clearDependencies(addr);
  }
}
