import { describe, it, expect, beforeEach } from '@jest/globals';
import { FormulaEngine } from '../../src/FormulaEngine';
import { Worksheet } from '../../src/worksheet';
import * as fs from 'fs';
import * as path from 'path';

// Load Excel reference data (from workspace root)
const referenceDataPath = path.join(__dirname, '../../../../test/compatibility/excel-reference-data.json');
const referenceData = JSON.parse(fs.readFileSync(referenceDataPath, 'utf-8'));

interface TestCase {
  id: string;
  formula: string;
  inputs: Record<string, any>;
  expected: any;
  description: string;
  tolerance?: number;
}

interface TestCategory {
  category: string;
  tests: TestCase[];
}

describe('Excel Parity - Compatibility Tests', () => {
  let engine: FormulaEngine;
  let worksheet: Worksheet;

  beforeEach(() => {
    worksheet = new Worksheet('TestSheet', 100, 26);
    engine = new FormulaEngine();
  });

  // Helper function to compare results with tolerance for floating point
  function compareResults(actual: any, expected: any, tolerance: number = 0): boolean {
    // Handle error values
    if (typeof expected === 'string' && expected.startsWith('#')) {
      // Expected is an error, actual should be an error
      if (actual instanceof Error || (typeof actual === 'string' && actual.startsWith('#'))) {
        const actualError = actual instanceof Error ? `#${actual.message}` : actual;
        return actualError === expected || actualError.includes(expected);
      }
      return false;
    }

    // Handle arrays
    if (Array.isArray(expected)) {
      if (!Array.isArray(actual)) return false;
      if (actual.length !== expected.length) return false;
      return actual.every((val, idx) => compareResults(val, expected[idx], tolerance));
    }

    // Handle numbers with tolerance
    if (typeof expected === 'number' && typeof actual === 'number') {
      if (tolerance > 0) {
        return Math.abs(actual - expected) <= tolerance;
      }
      return actual === expected;
    }

    // Handle booleans
    if (typeof expected === 'boolean') {
      return actual === expected;
    }

    // Handle strings
    if (typeof expected === 'string') {
      return String(actual) === expected;
    }

    // Default exact comparison
    return actual === expected;
  }

  // Skip tests for unimplemented functions
  const UNIMPLEMENTED_FUNCTIONS = ['TEXTSPLIT', 'ENCODEURL', 'WEBSERVICE', 'FILTERXML'];

  // Generate test suites for each category
  referenceData.testCases.forEach((category: TestCategory) => {
    describe(category.category, () => {
      category.tests.forEach((testCase: TestCase) => {
        // Skip tests for unimplemented functions
        const usesUnimplemented = UNIMPLEMENTED_FUNCTIONS.some(fn => 
          testCase.formula.toUpperCase().includes(fn)
        );
        
        const testFn = usesUnimplemented ? it.skip : it;
        testFn(`${testCase.id}: ${testCase.description}`, () => {
          // Setup inputs if provided
          if (testCase.inputs && Object.keys(testCase.inputs).length > 0) {
            Object.entries(testCase.inputs).forEach(([cellAddr, value]) => {
              // Parse cell address like "A1" to {row, col}
              const col = cellAddr.charCodeAt(0) - 65; // 'A' = 0
              const row = parseInt(cellAddr.slice(1)) - 1; // 1-based to 0-based
              worksheet.setCellValue({ row, col }, value);
            });
          }

          // Evaluate the formula
          let result: any;
          try {
            const context = {
              worksheet,
              currentCell: { row: 0, col: 0 },
              getCellValue: (addr: any) => worksheet.getCell(addr)?.value
            };
            result = engine.evaluate(testCase.formula, context);
          } catch (error: any) {
            result = error;
          }

          // Compare with expected result
          const tolerance = testCase.tolerance || 0;
          const matches = compareResults(result, testCase.expected, tolerance);

          if (!matches) {
            console.log(`\n❌ Test Failed: ${testCase.id}`);
            console.log(`Formula: ${testCase.formula}`);
            console.log(`Expected: ${JSON.stringify(testCase.expected)}`);
            console.log(`Actual: ${JSON.stringify(result)}`);
            console.log(`Tolerance: ${tolerance}\n`);
          }

          expect(matches).toBe(true);
        });
      });
    });
  });

  // Summary test - reports overall compatibility
  describe('Compatibility Summary', () => {
    it('should generate compatibility report', () => {
      const totalTests = referenceData.testCases.reduce(
        (sum: number, cat: TestCategory) => sum + cat.tests.length,
        0
      );

      console.log('\n📊 Excel Compatibility Test Summary');
      console.log('=====================================');
      console.log(`Total test cases: ${totalTests}`);
      console.log(`Excel version: ${referenceData.excelVersion}`);
      console.log(`Generated: ${referenceData.generatedDate}`);
      console.log('=====================================\n');

      expect(totalTests).toBeGreaterThan(0);
    });
  });
});
