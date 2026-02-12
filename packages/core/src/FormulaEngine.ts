/**
 * FormulaEngine.ts
 * 
 * Zero-dependency formula engine with 100+ Excel-compatible functions.
 * Supports dependency tracking, auto-recalculation, and Web Worker execution.
 */

import type { Address, Cell, CellValue } from './types';
import type { Worksheet } from './worksheet';

import type { FormulaValue, FormulaFunction, LambdaFunction, FormulaContext } from './types/formula-types';
import { ErrorStrategy } from './types/formula-types';

// Import modular components
import { FunctionRegistry } from './registry/FunctionRegistry';
import { OperatorRegistry } from './operators/operators';
import { ErrorStrategyDispatcher } from './ErrorStrategyDispatcher';

// Wave 0 Day 4 - Phase 2.6: Registration Unification
// Import unified metadata (single source of truth)
import { ALL_FUNCTION_METADATA } from './functions/metadata';

// Re-export types for backward compatibility
export type { FormulaValue, FormulaFunction, LambdaFunction, FormulaContext };

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
  private functionRegistry = new FunctionRegistry();
  private operatorRegistry = new OperatorRegistry();
  private dependencyGraph = new DependencyGraph();
  private calculating = new Set<string>();
  private errorDispatcher = new ErrorStrategyDispatcher();

  constructor() {
    // Wave 0 Day 4 - Phase 2.6: Registration Unification
    // Register all functions from unified metadata (single source of truth)
    // No tuples, no legacy formats, no partial metadata
    this.functionRegistry.registerBatch(ALL_FUNCTION_METADATA);
  }

  /**
   * Getter for backward compatibility with tests that access engine.functions
   */
  get functions() {
    return this.functionRegistry;
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

    // Parenthesized expression - remove outer parens and evaluate inner
    if (expr.startsWith('(') && expr.endsWith(')')) {
      // Check if these are matching outer parens
      let depth = 0;
      let isOuterParens = true;
      
      for (let i = 0; i < expr.length - 1; i++) {
        if (expr[i] === '(') depth++;
        else if (expr[i] === ')') depth--;
        
        // If depth hits 0 before the end, the outer parens don't match
        if (depth === 0 && i < expr.length - 1) {
          isOuterParens = false;
          break;
        }
      }
      
      if (isOuterParens) {
        // Remove outer parens and evaluate inner expression
        return this.evaluateExpression(expr.slice(1, -1), context);
      }
    }

    // String literal
    if (expr.startsWith('"') && expr.endsWith('"')) {
      return expr.slice(1, -1);
    }

    // Error literal (#DIV/0!, #VALUE!, #REF!, #NAME?, #NUM!, #N/A, #NULL!, #GETTING_DATA)
    if (expr.startsWith('#') && expr.endsWith('!')) {
      // Return as Error object
      return new Error(expr);
    }

    // Number literal
    if (/^-?\d+(\.\d+)?$/.test(expr)) {
      return parseFloat(expr);
    }

    // Boolean literal
    if (expr.toLowerCase() === 'true') return true;
    if (expr.toLowerCase() === 'false') return false;

    // Lambda parameter - check if this is a parameter name in lambda context
    if (context.lambdaContext) {
      // Simple identifier pattern (parameter names)
      if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(expr)) {
        const paramValue = context.lambdaContext.get(expr);
        if (paramValue !== undefined) {
          return paramValue;
        }
      }
    }
    
    // Named lambda - check if this is a named lambda identifier
    if (context.namedLambdas && /^[a-zA-Z_][a-zA-Z0-9_]*$/i.test(expr)) {
      // Try exact case match first
      let namedLambda = context.namedLambdas.get(expr);
      // If not found, try uppercase (Excel is case-insensitive)
      if (!namedLambda) {
        namedLambda = context.namedLambdas.get(expr.toUpperCase());
      }
      if (namedLambda) {
        return namedLambda as any;
      }
    }

    // Cell reference (e.g., A1, B2)
    if (/^[A-Z]+\d+$/i.test(expr)) {
      return this.evaluateCellReference(expr, context);
    }

    // Range references shouldn't be evaluated standalone; treated only inside functions.
    if (/^[A-Z]+\d+:[A-Z]+\d+$/i.test(expr)) {
      return new Error('#VALUE!');
    }

    // Unary minus (e.g., -5, -val, -A1)
    if (expr.startsWith('-') && expr.length > 1) {
      const operand = this.evaluateExpression(expr.substring(1), context);
      if (operand instanceof Error) return operand;
      if (typeof operand === 'number') {
        return -operand;
      }
      // Handle array negation
      if (Array.isArray(operand)) {
        return operand.map(item => {
          if (Array.isArray(item)) {
            return item.map(val => typeof val === 'number' ? -val : new Error('#VALUE!'));
          }
          return typeof item === 'number' ? -item : new Error('#VALUE!');
        });
      }
      return new Error('#VALUE!');
    }

    // Unary plus (e.g., +5, +val) - just return the value
    if (expr.startsWith('+') && expr.length > 1) {
      return this.evaluateExpression(expr.substring(1), context);
    }

    // Binary operations (check AFTER unary to handle expressions correctly)
    // NOTE: Check compound operators (<=, >=, <>) BEFORE single operators to avoid incorrect splits
    const operators = ['<>', '<=', '>=', '+', '-', '*', '/', '^', '=', '<', '>', '&'];
    for (const op of operators) {
      const parts = this.splitByOperator(expr, op);
      if (parts.length > 1) {
        // For operators like -, we need to be careful about unary minus
        // Only treat as binary if we have valid left side
        if (parts[0].trim().length > 0) {
          const left = this.evaluateExpression(parts[0], context);
          const right = this.evaluateExpression(parts.slice(1).join(op), context);
          return this.applyOperator(op, left, right);
        }
      }
    }

    // Function call (e.g., SUM(A1:A10), STDEV.S(A1:A10))
    // Special handling for lambda invocation: LAMBDA(...)(args)
    // Updated regex to support dotted function names like STDEV.S, VAR.P, MODE.SNGL
    const functionMatch = expr.match(/^([A-Z_][A-Z0-9_.]*)\((.*)\)$/i);
    if (functionMatch) {
      const [, funcName, argsStr] = functionMatch;
      
      // Check if this is a named lambda invocation
      if (context.namedLambdas) {
        // Try exact case match first
        let namedLambda = context.namedLambdas.get(funcName);
        // If not found, try uppercase (Excel is case-insensitive)
        if (!namedLambda) {
          namedLambda = context.namedLambdas.get(funcName.toUpperCase());
        }
        if (namedLambda) {
          return this.invokeLambda(namedLambda, argsStr, context);
        }
      }
      
      // Check if this is a lambda invocation pattern: LAMBDA(...)(...)
      if (funcName.toUpperCase() === 'LAMBDA') {
        // Find the matching closing paren for LAMBDA arguments
        let depth = 0;
        let lambdaArgsEnd = -1;
        
        for (let i = funcName.length + 1; i < expr.length; i++) {
          if (expr[i] === '(') depth++;
          else if (expr[i] === ')') {
            if (depth === 0) {
              lambdaArgsEnd = i;
              break;
            }
            depth--;
          }
        }
        
        // Check if there's an invocation after the lambda definition
        if (lambdaArgsEnd > 0 && lambdaArgsEnd < expr.length - 1) {
          // Extract lambda definition and invocation args
          const lambdaArgsStr = expr.slice(funcName.length + 1, lambdaArgsEnd);
          const remaining = expr.slice(lambdaArgsEnd + 1);
          
          // Check if remaining starts with (...)
          const invocationMatch = remaining.match(/^\((.+)\)$/);
          if (invocationMatch) {
            // This is LAMBDA(...)(invocation_args)
            const invocationArgsStr = invocationMatch[1];
            
            // First, create the lambda
            const lambda = this.evaluateFunction(funcName, lambdaArgsStr, context);
            
            // If lambda creation failed, return the error
            if (lambda instanceof Error) {
              return lambda;
            }
            
            // Now invoke the lambda with the provided arguments
            return this.invokeLambda(lambda as any, invocationArgsStr, context);
          }
        }
      }
      
      return this.evaluateFunction(funcName, argsStr, context);
    }

    return new Error('#NAME?');
  }

  /**
   * Invokes a lambda function with arguments
   */
  private invokeLambda(lambda: LambdaFunction, argsStr: string, context: FormulaContext): FormulaValue {
    // Check recursion depth to prevent stack overflow
    const currentDepth = (context as any).recursionDepth || 0;
    const MAX_RECURSION_DEPTH = 100;
    
    if (currentDepth >= MAX_RECURSION_DEPTH) {
      return new Error('#N/A'); // Excel's error for recursion limit
    }
    
    // Parse invocation arguments (these ARE evaluated)
    const invocationArgs = this.parseArguments(argsStr, context);
    
    // Check parameter count matches
    if (invocationArgs.length !== lambda.parameters.length) {
      return new Error('#VALUE!');
    }
    
    // Create lambda context starting with captured context (for closures)
    const lambdaContext = new Map<string, FormulaValue>(lambda.capturedContext);
    
    // Add parameter bindings (these override any captured values with same name)
    for (let i = 0; i < lambda.parameters.length; i++) {
      lambdaContext.set(lambda.parameters[i], invocationArgs[i]);
    }
    
    // Create new context with lambda bindings and incremented recursion depth
    // Explicitly preserve namedLambdas for recursion support
    const newContext: FormulaContext = {
      worksheet: context.worksheet,
      currentCell: context.currentCell,
      namedLambdas: context.namedLambdas, // Explicit preservation for recursion
      lambdaContext,
      recursionDepth: currentDepth + 1
    } as any;
    
    // Evaluate the lambda body with the bound parameters
    return this.evaluateExpression(lambda.body, newContext);
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

    // Array broadcasting: if either operand is an array, apply operator element-wise
    // Handle nested arrays (2D arrays)
    const isLeftArray = Array.isArray(left);
    const isRightArray = Array.isArray(right);
    
    if (isLeftArray && !isRightArray) {
      // Broadcast right to all elements of left
      return (left as any[]).map(item => {
        // If item is itself an array (row in 2D array), recursively apply
        if (Array.isArray(item)) {
          return this.applyOperator(op, item, right);
        }
        return this.applyOperator(op, item, right);
      });
    }
    
    if (!isLeftArray && isRightArray) {
      // Broadcast left to all elements of right
      return (right as any[]).map(item => {
        // If item is itself an array (row in 2D array), recursively apply
        if (Array.isArray(item)) {
          return this.applyOperator(op, left, item);
        }
        return this.applyOperator(op, left, item);
      });
    }
    
    if (isLeftArray && isRightArray) {
      // Both are arrays - apply element-wise
      const leftArr = left as any[];
      const rightArr = right as any[];
      
      if (leftArr.length !== rightArr.length) {
        return new Error('#VALUE!');
      }
      
      return leftArr.map((item, i) => {
        // Handle 2D arrays
        if (Array.isArray(item) || Array.isArray(rightArr[i])) {
          return this.applyOperator(op, item, rightArr[i]);
        }
        return this.applyOperator(op, item, rightArr[i]);
      });
    }

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

    for (let row = startAddr.row; row <= endAddr.row; row++) {
      for (let col = startAddr.col; col <= endAddr.col; col++) {
        const addr = { row, col };
        this.dependencyGraph.addDependency(context.currentCell, addr);
        
        const cell = context.worksheet.getCell(addr);
        
        if (cell) {
          if (cell.formula) {
            values.push(this.evaluate(cell.formula, { ...context, currentCell: addr }));
          } else {
            values.push(cell.value);
          }
        } else {
          values.push(null);
        }
      }
    }

    return values;
  }

  /**
   * Parses cell reference (e.g., "A1" -> {row: 0, col: 0})
   * Converts Excel-style 1-based references (A1, B2) to 0-based internal addresses
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
    // Convert from 1-based Excel notation to 0-based internal storage
    col = col - 1;
    const row = parseInt(rowStr, 10) - 1;

    return { row, col };
  }

  /**
   * Evaluates a function call
   */
  private evaluateFunction(name: string, argsStr: string, context: FormulaContext): FormulaValue {
    // Special handling for functions that need lazy evaluation or special lambda handling
    // These are checked BEFORE looking up in the functions registry
    
    // Special handling for LAMBDA - don't evaluate parameter names
    if (name.toUpperCase() === 'LAMBDA') {
      const rawArgs = this.parseRawArguments(argsStr);
      
      // Need at least 2 arguments: 1 parameter + calculation
      if (rawArgs.length < 2) {
        return new Error('#VALUE!');
      }

      // All args except last are parameters (must be strings)
      const parameters: string[] = [];
      
      for (let i = 0; i < rawArgs.length - 1; i++) {
        const param = rawArgs[i].trim();
        
        // Parameter must be a simple identifier
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(param)) {
          return new Error('#VALUE!');
        }
        
        // Check for duplicate parameters
        if (parameters.includes(param)) {
          return new Error('#VALUE!');
        }
        
        parameters.push(param);
      }

      // Last argument is the calculation body
      const body = rawArgs[rawArgs.length - 1];
      
      // Body must be a string (formula expression)
      if (typeof body !== 'string') {
        return new Error('#VALUE!');
      }

      // Create the lambda function object with captured context
      // This allows the lambda to access variables from outer scope (closures)
      const lambdaFn: LambdaFunction = {
        parameters,
        body,
        capturedContext: context.lambdaContext
      };

      return lambdaFn as any;
    }

    // Special handling for LET - define local variables
    // Syntax: LET(name1, value1, name2, value2, ..., calculation)
    if (name.toUpperCase() === 'LET') {
      const rawArgs = this.parseRawArguments(argsStr);
      
      // Must have at least 3 arguments (name, value, calculation)
      // Must have odd number of arguments
      if (rawArgs.length < 3 || rawArgs.length % 2 === 0) {
        return new Error('#VALUE!');
      }
      
      // Create a new context with variable bindings
      const letContext = new Map<string, FormulaValue>(context.lambdaContext);
      
      // Process pairs of (name, value)
      for (let i = 0; i < rawArgs.length - 1; i += 2) {
        const varName = rawArgs[i].trim();
        const varValueExpr = rawArgs[i + 1];
        
        // Variable name must be a simple identifier
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(varName)) {
          return new Error('#VALUE!');
        }
        
        // Evaluate the value expression with current context
        // This allows later variables to reference earlier ones
        const tempContext: FormulaContext = {
          worksheet: context.worksheet,
          currentCell: context.currentCell,
          namedLambdas: context.namedLambdas,
          lambdaContext: letContext,
          recursionDepth: context.recursionDepth
        };
        
        // Special handling: if value is a range reference, store it as a string
        // so it can be used in function calls later
        let varValue: FormulaValue;
        
        if (/^[A-Z]+\d+:[A-Z]+\d+$/i.test(varValueExpr.trim())) {
          // This is a range reference - store as string to be parsed by functions
          varValue = varValueExpr.trim();
        } else {
          // Regular value - evaluate normally
          varValue = this.evaluateExpression(varValueExpr, tempContext);
          
          // Allow errors to propagate
          if (varValue instanceof Error) {
            return varValue;
          }
        }
        
        // Bind the variable
        letContext.set(varName, varValue);
      }
      
      // Evaluate the final calculation with all variables bound
      const finalContext: FormulaContext = {
        worksheet: context.worksheet,
        currentCell: context.currentCell,
        namedLambdas: context.namedLambdas,
        lambdaContext: letContext,
        recursionDepth: context.recursionDepth
      };
      
      return this.evaluateExpression(rawArgs[rawArgs.length - 1], finalContext);
    }

    // Special handling for IF - lazy evaluation of branches
    if (name.toUpperCase() === 'IF') {
      // Parse arguments as raw strings, then evaluate only what's needed
      const rawArgs = this.parseRawArguments(argsStr);
      if (rawArgs.length < 2 || rawArgs.length > 3) {
        return new Error('#VALUE!');
      }
      
      // Evaluate the condition
      const condition = this.evaluateExpression(rawArgs[0], context);
      if (condition instanceof Error) return condition;
      
      // Evaluate only the appropriate branch
      if (condition) {
        return this.evaluateExpression(rawArgs[1], context);
      } else {
        return rawArgs.length === 3 ? this.evaluateExpression(rawArgs[2], context) : false;
      }
    }

    // Special handling for MAP - applies lambda to each array element
    if (name.toUpperCase() === 'MAP') {
      const rawArgs = this.parseRawArguments(argsStr);
      if (rawArgs.length !== 2) {
        return new Error('#VALUE!');
      }
      
      // Evaluate the array (could be a range)
      let array: FormulaValue[];
      if (/^[A-Z]+\d+:[A-Z]+\d+$/i.test(rawArgs[0].trim())) {
        // It's a range reference
        array = this.evaluateRangeReference(rawArgs[0].trim(), context);
      } else {
        // Evaluate as expression
        const arrayResult = this.evaluateExpression(rawArgs[0], context);
        if (arrayResult instanceof Error) return arrayResult;
        array = Array.isArray(arrayResult) ? arrayResult : [arrayResult];
      }
      
      // Evaluate the lambda
      const lambdaResult = this.evaluateExpression(rawArgs[1], context);
      if (lambdaResult instanceof Error) return lambdaResult;
      
      // Check if it's a valid lambda
      const lambda = lambdaResult as any;
      if (!lambda.parameters || !lambda.body || lambda.parameters.length !== 1) {
        return new Error('#VALUE!');
      }
      
      // Apply lambda to each element
      const results: FormulaValue[] = [];
      for (const item of array) {
        const itemResult = this.invokeLambda(lambda, String(item), context);
        results.push(itemResult);
      }
      
      return results;
    }

    // Special handling for REDUCE - reduces array to single value using lambda
    if (name.toUpperCase() === 'REDUCE') {
      const rawArgs = this.parseRawArguments(argsStr);
      if (rawArgs.length !== 3) {
        return new Error('#VALUE!');
      }
      
      // Evaluate initial value
      const initialValue = this.evaluateExpression(rawArgs[0], context);
      if (initialValue instanceof Error) return initialValue;
      
      // Evaluate the array (could be a range)
      let array: FormulaValue[];
      if (/^[A-Z]+\d+:[A-Z]+\d+$/i.test(rawArgs[1].trim())) {
        // It's a range reference
        array = this.evaluateRangeReference(rawArgs[1].trim(), context);
      } else {
        // Evaluate as expression
        const arrayResult = this.evaluateExpression(rawArgs[1], context);
        if (arrayResult instanceof Error) return arrayResult;
        array = Array.isArray(arrayResult) ? arrayResult : [arrayResult];
      }
      
      // Evaluate the lambda
      const lambdaResult = this.evaluateExpression(rawArgs[2], context);
      if (lambdaResult instanceof Error) return lambdaResult;
      
      // Check if it's a valid lambda
      const lambda = lambdaResult as any;
      if (!lambda.parameters || !lambda.body || lambda.parameters.length !== 2) {
        return new Error('#VALUE!');
      }
      
      // Reduce the array
      let accumulator: FormulaValue = initialValue;
      for (const item of array) {
        const lambdaArgs = `${accumulator},${item}`;
        accumulator = this.invokeLambda(lambda, lambdaArgs, context);
        if (accumulator instanceof Error) return accumulator;
      }
      
      return accumulator;
    }

    // Special handling for SCAN - cumulative reduce (returns all intermediate values)
    if (name.toUpperCase() === 'SCAN') {
      const rawArgs = this.parseRawArguments(argsStr);
      
      // SCAN can have 2 or 3 arguments
      // SCAN(array, lambda) - no initial value, uses first array element
      // SCAN(initial, array, lambda) - with initial value
      if (rawArgs.length < 2 || rawArgs.length > 3) {
        return new Error('#VALUE!');
      }
      
      let initialValue: FormulaValue | undefined;
      let arrayArg: string;
      let lambdaArg: string;
      
      if (rawArgs.length === 2) {
        // SCAN(array, lambda)
        arrayArg = rawArgs[0];
        lambdaArg = rawArgs[1];
      } else {
        // SCAN(initial, array, lambda)
        const initResult = this.evaluateExpression(rawArgs[0], context);
        if (initResult instanceof Error) return initResult;
        initialValue = initResult;
        arrayArg = rawArgs[1];
        lambdaArg = rawArgs[2];
      }
      
      // Evaluate the array (could be a range)
      let array: FormulaValue[];
      if (/^[A-Z]+\d+:[A-Z]+\d+$/i.test(arrayArg.trim())) {
        // It's a range reference
        array = this.evaluateRangeReference(arrayArg.trim(), context);
      } else {
        // Evaluate as expression
        const arrayResult = this.evaluateExpression(arrayArg, context);
        if (arrayResult instanceof Error) return arrayResult;
        
        if (!Array.isArray(arrayResult)) {
          // Single value becomes a 1-element array
          array = [arrayResult];
        } else {
          array = arrayResult;
        }
      }
      
      // Evaluate the lambda
      const lambdaResult = this.evaluateExpression(lambdaArg, context);
      if (lambdaResult instanceof Error) return lambdaResult;
      
      // Check if it's a valid lambda
      const lambda = lambdaResult as any;
      if (!lambda.parameters || !lambda.body || lambda.parameters.length !== 2) {
        return new Error('#VALUE!');
      }
      
      // Scan the array - accumulate and collect all intermediate results
      const results: FormulaValue[] = [];
      let accumulator: FormulaValue;
      
      if (initialValue !== undefined) {
        accumulator = initialValue;
        for (const item of array) {
          const lambdaArgs = `${accumulator},${item}`;
          accumulator = this.invokeLambda(lambda, lambdaArgs, context);
          if (accumulator instanceof Error) return accumulator;
          results.push(accumulator);
        }
      } else {
        // Use first element as initial value
        if (array.length === 0) {
          return new Error('#VALUE!');
        }
        accumulator = array[0];
        results.push(accumulator);
        
        for (let i = 1; i < array.length; i++) {
          const lambdaArgs = `${accumulator},${array[i]}`;
          accumulator = this.invokeLambda(lambda, lambdaArgs, context);
          if (accumulator instanceof Error) return accumulator;
          results.push(accumulator);
        }
      }
      
      return results;
    }

    // Special handling for BYROW - applies lambda to each row
    if (name.toUpperCase() === 'BYROW') {
      const rawArgs = this.parseRawArguments(argsStr);
      if (rawArgs.length !== 2) {
        return new Error('#VALUE!');
      }
      
      // Evaluate the array (should be 2D, but we'll treat 1D as single row)
      let array: FormulaValue[];
      if (/^[A-Z]+\d+:[A-Z]+\d+$/i.test(rawArgs[0].trim())) {
        // It's a range reference
        array = this.evaluateRangeReference(rawArgs[0].trim(), context);
      } else {
        // Evaluate as normal expression
        const arrayResult = this.evaluateExpression(rawArgs[0], context);
        if (arrayResult instanceof Error) return arrayResult;
        
        // If result is a string that looks like a range (e.g., from LET variable),
        // evaluate it as a range
        if (typeof arrayResult === 'string' && /^[A-Z]+\d+:[A-Z]+\d+$/i.test(arrayResult)) {
          array = this.evaluateRangeReference(arrayResult, context);
        } else {
          array = Array.isArray(arrayResult) ? arrayResult : [arrayResult];
        }
      }
      
      // Evaluate the lambda
      const lambdaResult = this.evaluateExpression(rawArgs[1], context);
      if (lambdaResult instanceof Error) return lambdaResult;
      
      // Check if it's a valid lambda
      const lambda = lambdaResult as any;
      if (!lambda.parameters || !lambda.body || lambda.parameters.length !== 1) {
        return new Error('#VALUE!');
      }
      
      // For simplicity, treat the entire array as one row
      // Create lambda context directly with the array bound to the parameter
      const lambdaContext = new Map<string, FormulaValue>(lambda.capturedContext || []);
      lambdaContext.set(lambda.parameters[0], array);
      
      const newContext: FormulaContext = {
        worksheet: context.worksheet,
        currentCell: context.currentCell,
        namedLambdas: context.namedLambdas,
        lambdaContext,
        recursionDepth: ((context as any).recursionDepth || 0) + 1
      } as any;
      
      // Evaluate the lambda body with the array bound
      const result = this.evaluateExpression(lambda.body, newContext);
      if (result instanceof Error) return result;
      
      return [result];
    }

    // Special handling for MAKEARRAY - creates calculated array
    if (name.toUpperCase() === 'MAKEARRAY') {
      const rawArgs = this.parseRawArguments(argsStr);
      if (rawArgs.length !== 3) {
        return new Error('#VALUE!');
      }
      
      // Evaluate rows parameter
      const rowsResult = this.evaluateExpression(rawArgs[0], context);
      if (rowsResult instanceof Error) return rowsResult;
      if (typeof rowsResult !== 'number' || rowsResult <= 0 || !Number.isInteger(rowsResult)) {
        return new Error('#VALUE!');
      }
      const rows = rowsResult;
      
      // Evaluate columns parameter
      const columnsResult = this.evaluateExpression(rawArgs[1], context);
      if (columnsResult instanceof Error) return columnsResult;
      if (typeof columnsResult !== 'number' || columnsResult <= 0 || !Number.isInteger(columnsResult)) {
        return new Error('#VALUE!');
      }
      const columns = columnsResult;
      
      // Validate reasonable array size (prevent memory issues)
      const maxSize = 1000000; // 1 million cells max
      if (rows * columns > maxSize) {
        return new Error('#VALUE!');
      }
      
      // Evaluate the lambda
      const lambdaResult = this.evaluateExpression(rawArgs[2], context);
      if (lambdaResult instanceof Error) return lambdaResult;
      
      // Check if it's a valid lambda with 2 parameters (row, col)
      const lambda = lambdaResult as any;
      if (!lambda.parameters || !lambda.body || lambda.parameters.length !== 2) {
        return new Error('#VALUE!');
      }
      
      // Build the 2D array by calling lambda for each position
      const result: FormulaValue[][] = [];
      
      for (let r = 1; r <= rows; r++) {
        const row: FormulaValue[] = [];
        
        for (let c = 1; c <= columns; c++) {
          // Invoke lambda with (row, col) - both are 1-based
          const lambdaArgs = `${r},${c}`;
          const cellValue = this.invokeLambda(lambda, lambdaArgs, context);
          
          // If lambda returns an error, return the error immediately
          if (cellValue instanceof Error) return cellValue;
          
          row.push(cellValue);
        }
        
        result.push(row);
      }
      
      // For 1x1 array, return as scalar
      if (rows === 1 && columns === 1) {
        return result[0][0];
      }
      
      // For single row, return as 1D array
      if (rows === 1) {
        return result[0];
      }
      
      // For single column, return as 1D array
      if (columns === 1) {
        return result.map(row => row[0]);
      }
      
      return result;
    }

    // Special handling for BYCOL - applies lambda to each column
    if (name.toUpperCase() === 'BYCOL') {
      const rawArgs = this.parseRawArguments(argsStr);
      if (rawArgs.length !== 2) {
        return new Error('#VALUE!');
      }
      
      // Evaluate the array (should be 2D, but we'll treat 1D as single column)
      let array: FormulaValue[];
      if (/^[A-Z]+\d+:[A-Z]+\d+$/i.test(rawArgs[0].trim())) {
        // It's a range reference
        array = this.evaluateRangeReference(rawArgs[0].trim(), context);
      } else {
        // Evaluate as normal expression
        const arrayResult = this.evaluateExpression(rawArgs[0], context);
        if (arrayResult instanceof Error) return arrayResult;
        
        // If result is a string that looks like a range (e.g., from LET variable),
        // evaluate it as a range
        if (typeof arrayResult === 'string' && /^[A-Z]+\d+:[A-Z]+\d+$/i.test(arrayResult)) {
          array = this.evaluateRangeReference(arrayResult, context);
        } else {
          array = Array.isArray(arrayResult) ? arrayResult : [arrayResult];
        }
      }
      
      // Evaluate the lambda
      const lambdaResult = this.evaluateExpression(rawArgs[1], context);
      if (lambdaResult instanceof Error) return lambdaResult;
      
      // Check if it's a valid lambda
      const lambda = lambdaResult as any;
      if (!lambda.parameters || !lambda.body || lambda.parameters.length !== 1) {
        return new Error('#VALUE!');
      }
      
      // For simplicity, treat the entire array as one column
      // Also propagate captured context from closures (e.g. LET variables)
      // Create lambda context, merging captured context with the new parameter
      const lambdaContext = new Map<string, FormulaValue>(lambda.capturedContext || []);
      lambdaContext.set(lambda.parameters[0], array);
      
      const newContext: FormulaContext = {
        worksheet: context.worksheet,
        currentCell: context.currentCell,
        namedLambdas: context.namedLambdas,
        lambdaContext,
        recursionDepth: ((context as any).recursionDepth || 0) + 1
      } as any;
      
      // Evaluate the lambda body with the array bound
      const result = this.evaluateExpression(lambda.body, newContext);
      if (result instanceof Error) return result;
      
      return [result];
    }

    // Now check if it's a registered function
    const funcMetadata = this.functionRegistry.getMetadata(name.toUpperCase());
    
    // If not a built-in function, check for named lambda or LET-bound lambda
    if (!funcMetadata) {
      // Check if it's a named lambda
      if (context.namedLambdas) {
        const namedLambda = context.namedLambdas.get(name.toUpperCase());
        if (namedLambda) {
          // It's a named lambda, invoke it
          return this.invokeLambda(namedLambda, argsStr, context);
        }
      }
      
      // Check if it's a LET-bound lambda
      if (context.lambdaContext && context.lambdaContext.has(name)) {
        const letBoundValue = context.lambdaContext.get(name);
        const lambda = letBoundValue as any;
        if (lambda && lambda.parameters && lambda.body) {
          return this.invokeLambda(lambda, argsStr, context);
        }
      }
      
      return new Error('#NAME?');
    }

    const args = this.parseArguments(argsStr, context);
    
    // Extract the function handler
    const func = funcMetadata.handler;
    
    // Check if any arguments are arrays and handle array broadcasting
    // For most functions, if an argument is an array, apply function element-wise
    const hasArrayArg = args.some(arg => Array.isArray(arg) && !this.isArrayFunction(name));
    
    if (hasArrayArg) {
      return this.applyFunctionWithArrayBroadcasting(func, args, funcMetadata.needsContext ? context : undefined);
    }
    
    try {
      // Phase 1: Wire metadata → dispatcher
      // Route execution through ErrorStrategyDispatcher based on metadata.errorStrategy
      
      // Prepare handler wrapper based on needsContext
      const wrappedHandler = funcMetadata.needsContext
        ? (...handlerArgs: unknown[]) => (func as any)(context, ...handlerArgs)
        : (...handlerArgs: unknown[]) => (func as any)(...handlerArgs);
      
      // Dispatch through strategy-specific wrapper
      // Cast to StrictFunctionMetadata (all registered functions must have complete metadata)
      return this.errorDispatcher.dispatch(
        funcMetadata.errorStrategy || ErrorStrategy.PROPAGATE_FIRST, // Fallback for safety
        args,
        wrappedHandler,
        context,
        funcMetadata as any // Type assertion: registry guarantees complete metadata
      );
    } catch (error) {
      return new Error('#VALUE!');
    }
  }

  /**
   * Check if a function expects array arguments (doesn't need broadcasting)
   */
  private isArrayFunction(name: string): boolean {
    const arrayFuncs = ['FILTER', 'SORT', 'UNIQUE', 'SORTBY', 'TRANSPOSE', 'XLOOKUP', 
                        'VLOOKUP', 'HLOOKUP', 'INDEX', 'MATCH', 'XMATCH', 'MAP', 
                        'REDUCE', 'SCAN', 'BYROW', 'BYCOL', 'SUM', 'AVERAGE', 'COUNT',
                        'MAX', 'MIN', 'SUMIF', 'AVERAGEIF', 'COUNTIF',
                        'SUMIFS', 'AVERAGEIFS', 'COUNTIFS', 'MAXIFS', 'MINIFS',
                        'TAKE', 'DROP', 'CHOOSECOLS', 'CHOOSEROWS', 'TEXTSPLIT', 'TEXTJOIN',
                        // Statistical functions that aggregate arrays
                        'AVERAGEA', 'MEDIAN', 'MODE', 'MODE.SNGL', 'MODE.MULT',
                        'STDEV', 'STDEV.S', 'STDEV.P', 'STDEVPA', 'STDEVA',
                        'VAR', 'VAR.S', 'VAR.P', 'VARPA', 'VARA',
                        'QUARTILE', 'QUARTILE.INC', 'QUARTILE.EXC',
                        'PERCENTILE', 'PERCENTILE.INC', 'PERCENTILE.EXC',
                        'CORREL', 'COVARIANCE.P', 'COVARIANCE.S', 'RSQ',
                        'FORECAST', 'FORECAST.LINEAR', 'SLOPE', 'INTERCEPT',
                        'STEYX', 'TREND', 'PEARSON', 'T.TEST', 'F.TEST', 'CHISQ.TEST',
                        // Financial functions (Week 8 Days 4-5)
                        'NPV', 'XNPV', 'PV', 'FV', 'PMT', 'IPMT', 'PPMT',
                        'IRR', 'XIRR', 'MIRR', 'NPER', 'RATE', 'EFFECT', 'NOMINAL',
                        'FVSCHEDULE',
                        // Math array functions (Week 11 Day 2)
                        'PRODUCT', 'SUMPRODUCT', 'SUMX2MY2', 'SUMX2PY2', 'SUMXMY2',
                        // Math aggregation functions (Week 2 Day 6)
                        // Adding back temporarily to debug
                        'AGGREGATE', 'SUBTOTAL',
                        // Text array functions (Week 11 Day 3)
                        'CONCAT', 'CONCATENATE'];
    return arrayFuncs.includes(name.toUpperCase());
  }

  /**
   * Apply a function with array broadcasting
   */
  private applyFunctionWithArrayBroadcasting(func: Function, args: FormulaValue[], context?: FormulaContext): FormulaValue {
    // Find the first array argument to determine the output shape
    const arrayArg = args.find(arg => Array.isArray(arg));
    if (!arrayArg) return new Error('#VALUE!');
    
    const arrayLength = (arrayArg as any[]).length;
    const results: FormulaValue[] = [];
    
    // Apply function to each element
    for (let i = 0; i < arrayLength; i++) {
      const elementArgs = args.map(arg => {
        if (Array.isArray(arg)) {
          // Handle 2D arrays
          if (Array.isArray(arg[i])) {
            return arg[i];
          }
          // For mismatched array sizes, use the argument as-is
          if (i >= arg.length) return arg;
          return arg[i];
        }
        // Scalar arguments are broadcast to all elements
        return arg;
      });
      
      try {
        // If context is provided, pass it as first argument (context-aware function)
        const result = context ? func(context, ...elementArgs) : func(...elementArgs);
        results.push(result);
      } catch (error) {
        results.push(new Error('#VALUE!'));
      }
    }
    
    return results;
  }

  /**
   * Parses raw arguments without evaluation (for special functions like LAMBDA)
   */
  private parseRawArguments(argsStr: string): string[] {
    if (!argsStr.trim()) return [];

    const args: string[] = [];
    let current = '';
    let depth = 0;
    let inString = false;
    let lastWasComma = false;

    for (let i = 0; i < argsStr.length; i++) {
      const char = argsStr[i];

      if (char === '"') {
        inString = !inString;
        current += char;
        lastWasComma = false;
      } else if (!inString) {
        if (char === '(') {
          depth++;
          current += char;
          lastWasComma = false;
        } else if (char === ')') {
          depth--;
          current += char;
          lastWasComma = false;
        } else if (char === ',' && depth === 0) {
          // Push argument (empty or not)
          args.push(current.trim());
          current = '';
          lastWasComma = true;
          continue;
        } else {
          current += char;
          lastWasComma = false;
        }
      } else {
        current += char;
        lastWasComma = false;
      }
    }

    // Handle last argument
    // If we had a trailing comma or there's actual content, add the argument
    if (lastWasComma || current.trim() !== '' || current !== '') {
      args.push(current.trim());
    }

    return args;
  }

  /**
   * Parses function arguments
   */
  private parseArguments(argsStr: string, context: FormulaContext): FormulaValue[] {
    if (!argsStr.trim()) return [];

    const args: FormulaValue[] = [];
    let current = '';
    let depth = 0;
    let inString = false;
    let lastWasComma = false;

    for (let i = 0; i < argsStr.length; i++) {
      const char = argsStr[i];

      if (char === '"') {
        inString = !inString;
        current += char;
        lastWasComma = false;
      } else if (!inString) {
        if (char === '(') {
          depth++;
          current += char;
          lastWasComma = false;
        } else if (char === ')') {
          depth--;
          current += char;
          lastWasComma = false;
        } else if (char === ',' && depth === 0) {
          const token = current.trim();
          // Handle empty argument (e.g., "a,,b" or "a, ,b")
          if (token === '') {
            args.push(undefined as any);
          } else if (/^[A-Z]+\d+:[A-Z]+\d+$/i.test(token)) {
            // Spread range values into args array
            const rangeValues = this.evaluateRangeReference(token, context);
            args.push(rangeValues as any);
          } else {
            const result = this.evaluateExpression(token, context);
            // If result is a string that looks like a range (e.g., from LET variable),
            // evaluate it as a range
            if (typeof result === 'string' && /^[A-Z]+\d+:[A-Z]+\d+$/i.test(result)) {
              const rangeValues = this.evaluateRangeReference(result, context);
              args.push(rangeValues as any);
            } else {
              args.push(result);
            }
          }
          current = '';
          lastWasComma = true;
          continue;
        } else {
          current += char;
          lastWasComma = false;
        }
      } else {
        current += char;
        lastWasComma = false;
      }
    }

    // Handle last argument
    const token = current.trim();
    // If we had a trailing comma or there's actual content, add the argument
    if (lastWasComma || token !== '' || current !== '') {
      if (token === '') {
        // Empty last argument (e.g., "a,b," or "a,,")
        args.push(undefined as any);
      } else if (/^[A-Z]+\d+:[A-Z]+\d+$/i.test(token)) {
        // Spread range values into args array
        const rangeValues = this.evaluateRangeReference(token, context);
        args.push(rangeValues as any);
      } else {
        const result = this.evaluateExpression(token, context);
        // If result is a string that looks like a range (e.g., from LET variable),
        // evaluate it as a range
        if (typeof result === 'string' && /^[A-Z]+\d+:[A-Z]+\d+$/i.test(result)) {
          const rangeValues = this.evaluateRangeReference(result, context);
          args.push(rangeValues as any);
        } else {
          args.push(result);
        }
      }
    }


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
   * @deprecated [WAVE_0_DAY_1] Use registerFunctionStrict() instead
   * 
   * Legacy method that bypasses strict metadata enforcement.
   * This method will be removed in Wave 1.
   * 
   * SDK-Grade Migration Path:
   * - For 300-function implementations, use registerFunctionStrict()
   * - This method exists only for backward compatibility during Wave 0
   */
  registerFunction(name: string, func: FormulaFunction): void {
    throw new Error(
      `[WAVE_0_DAY_1] registerFunction() is deprecated. ` +
      `Use registerFunctionStrict() with complete StrictFunctionMetadata. ` +
      `Partial metadata is no longer supported.`
    );
  }

  /**
   * SDK-Grade: Register function with strict metadata enforcement
   * 
   * Wave 0 Day 1: TypeScript enforces completeness at compile-time
   * All 98 functions must be backfilled with complete metadata (Day 2)
   * 
   * @param metadata - Complete StrictFunctionMetadata (all fields required)
   * 
   * @example
   * engine.registerFunctionStrict({
   *   name: 'SUM',
   *   handler: (args) => args.reduce((a, b) => a + b, 0),
   *   category: FunctionCategory.MATH,
   *   minArgs: 1,
   *   maxArgs: 255,
   *   isSpecial: false,
   *   needsContext: false,
   *   volatile: false,
   *   complexityClass: ComplexityClass.O_N,
   *   precisionClass: PrecisionClass.EXACT,
   *   errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
   *   iterationPolicy: null
   * });
   */
  registerFunctionStrict(metadata: import('./types/formula-types').StrictFunctionMetadata): void {
    this.functionRegistry.register(metadata);
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
        
        // Thunks should NEVER be returned from functions - they're only for internal lazy evaluation
        if (typeof value === 'function') {
          throw new Error('[FormulaEngine] CRITICAL: Function returned a thunk instead of a value. This is a handler bug.');
        }
        
        // Only set value if it's not an error (CellValue doesn't support Error type)
        if (!(value instanceof Error)) {
          // Handle arrays: for now, store as string representation
          // TODO: Implement proper spill behavior in Phase 2
          if (Array.isArray(value)) {
            worksheet.setCellValue(addr, JSON.stringify(value));
          } else {
            worksheet.setCellValue(addr, value as CellValue); // Type assertion safe after thunk check
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
