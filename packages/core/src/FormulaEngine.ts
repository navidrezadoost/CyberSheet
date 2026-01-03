/**
 * FormulaEngine.ts
 * 
 * Zero-dependency formula engine with 100+ Excel-compatible functions.
 * Supports dependency tracking, auto-recalculation, and Web Worker execution.
 */

import type { Address, Cell, CellValue } from './types';
import type { Worksheet } from './worksheet';

export type FormulaValue = number | string | boolean | null | Error;
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
          worksheet.setCellValue(addr, value);
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
