const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../packages/core/src/FormulaEngine.ts');
let content = fs.readFileSync(filePath, 'utf8');

console.log('Original file size:', content.split('\n').length, 'lines');

// Step 1: Replace type definitions with imports
const oldTypes = `// FormulaValue now includes arrays for dynamic array functions (Excel 365)
// Arrays can be 1D (FormulaValue[]) or 2D (FormulaValue[][]) for spill behavior
export type FormulaValue = number | string | boolean | null | Error | FormulaValue[] | FormulaValue[][];
export type FormulaFunction = (...args: FormulaValue[]) => FormulaValue;

/**
 * Lambda function type for LAMBDA() function
 * Stores parameter names and the calculation formula
 */
export type LambdaFunction = {
  parameters: string[];
  body: string;
  capturedContext?: Map<string, FormulaValue>; // For closures
};

export interface FormulaContext {
  worksheet: Worksheet;
  currentCell: Address;
  lambdaContext?: Map<string, FormulaValue>; // Parameter bindings for lambda execution
  namedLambdas?: Map<string, LambdaFunction>; // Named lambdas stored in worksheet
}`;

const newTypes = `import type { FormulaValue, FormulaFunction, LambdaFunction, FormulaContext } from './types/formula-types';

// Import modular components
import { FunctionRegistry } from './registry/FunctionRegistry';
import { registerBuiltInFunctions } from './functions/function-initializer';
import { OperatorRegistry } from './operators/operators';

// Re-export types for backward compatibility
export type { FormulaValue, FormulaFunction, LambdaFunction, FormulaContext };`;

content = content.replace(oldTypes, newTypes);

// Step 2: Replace Map with FunctionRegistry in class declaration
content = content.replace(
  'private functions = new Map<string, FormulaFunction>();',
  'private functionRegistry = new FunctionRegistry();\n  private operatorRegistry = new OperatorRegistry();'
);

// Step 3: Replace constructor
content = content.replace(
  'constructor() {\n    this.registerBuiltInFunctions();\n  }',
  'constructor() {\n    registerBuiltInFunctions(this.functionRegistry);\n  }'
);

// Step 4: Replace function lookup
content = content.replace(
  'const func = this.functions.get(name.toUpperCase());',
  'const func = this.functionRegistry.get(name.toUpperCase());'
);

// Step 5: Find and remove registerBuiltInFunctions method
const registerStart = content.indexOf('  private registerBuiltInFunctions(): void {');
const registerEnd = content.indexOf('  registerFunction(name: string, func: FormulaFunction): void {', registerStart);

if (registerStart !== -1 && registerEnd !== -1) {
  // Remove the entire registerBuiltInFunctions method
  content = content.substring(0, registerStart) + content.substring(registerEnd);
  console.log('Removed registerBuiltInFunctions method');
}

// Step 6: Update registerFunction to use registry
content = content.replace(
  'registerFunction(name: string, func: FormulaFunction): void {\n    this.functions.set(name.toUpperCase(), func);\n  }',
  'registerFunction(name: string, func: FormulaFunction): void {\n    this.functionRegistry.register(name.toUpperCase(), func);\n  }'
);

console.log('Refactored file size:', content.split('\n').length, 'lines');

// Write the refactored content
fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Refactoring complete!');
