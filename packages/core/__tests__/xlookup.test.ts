/**
 * Unit tests for XLOOKUP function
 * Tests all match modes and search modes
 */

import { FormulaEngine } from '../src/FormulaEngine';
import { Worksheet } from '../src/worksheet';

describe('FormulaEngine - XLOOKUP Function', () => {
  let engine: FormulaEngine;
  let worksheet: Worksheet;

  beforeEach(() => {
    engine = new FormulaEngine();
    worksheet = new Worksheet('Test', 100, 26);
  });

  // Helper to directly test XLOOKUP function
  const testXLOOKUP = (...args: any[]) => {
    const xlookupFunc = (engine as any).functions.get('XLOOKUP');
    return xlookupFunc(...args);
  };

  describe('Basic exact match (match_mode=0, search_mode=1)', () => {
    test('should find exact match and return corresponding value', () => {
      const lookupArray = ['Apple', 'Banana', 'Cherry', 'Date'];
      const returnArray = [10, 20, 30, 40];
      
      const result = testXLOOKUP('Banana', lookupArray, returnArray);
      
      expect(result).toBe(20);
    });

    test('should return #N/A when no match found', () => {
      const lookupArray = ['Apple', 'Banana', 'Cherry'];
      const returnArray = [10, 20, 30];
      
      const result = testXLOOKUP('Orange', lookupArray, returnArray);
      
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#N/A');
    });

    test('should return custom if_not_found value', () => {
      const lookupArray = ['Apple', 'Banana', 'Cherry'];
      const returnArray = [10, 20, 30];
      
      const result = testXLOOKUP('Orange', lookupArray, returnArray, 'Not Found');
      
      expect(result).toBe('Not Found');
    });

    test('should handle numeric lookup values', () => {
      const lookupArray = [1, 2, 3, 4, 5];
      const returnArray = ['One', 'Two', 'Three', 'Four', 'Five'];
      
      const result = testXLOOKUP(3, lookupArray, returnArray);
      
      expect(result).toBe('Three');
    });

    test('should be case-insensitive for text', () => {
      const lookupArray = ['Apple', 'Banana', 'Cherry'];
      const returnArray = [10, 20, 30];
      
      const result = testXLOOKUP('BANANA', lookupArray, returnArray);
      
      expect(result).toBe(20);
    });
  });

  describe('Match mode -1 (exact match or next smallest)', () => {
    test('should return exact match when found', () => {
      const lookupArray = [10, 20, 30, 40, 50];
      const returnArray = ['A', 'B', 'C', 'D', 'E'];
      
      const result = testXLOOKUP(30, lookupArray, returnArray, 'N/A', -1);
      
      expect(result).toBe('C');
    });

    test('should return next smallest when exact match not found', () => {
      const lookupArray = [10, 20, 30, 40, 50];
      const returnArray = ['A', 'B', 'C', 'D', 'E'];
      
      const result = testXLOOKUP(35, lookupArray, returnArray, 'N/A', -1);
      
      expect(result).toBe('C');  // 30 is next smallest
    });

    test('should return if_not_found when all values are larger', () => {
      const lookupArray = [10, 20, 30, 40, 50];
      const returnArray = ['A', 'B', 'C', 'D', 'E'];
      
      const result = testXLOOKUP(5, lookupArray, returnArray, 'Too Small', -1);
      
      expect(result).toBe('Too Small');
    });
  });

  describe('Match mode 1 (exact match or next largest)', () => {
    test('should return exact match when found', () => {
      const lookupArray = [10, 20, 30, 40, 50];
      const returnArray = ['A', 'B', 'C', 'D', 'E'];
      
      const result = testXLOOKUP(30, lookupArray, returnArray, 'N/A', 1);
      
      expect(result).toBe('C');
    });

    test('should return next largest when exact match not found', () => {
      const lookupArray = [10, 20, 30, 40, 50];
      const returnArray = ['A', 'B', 'C', 'D', 'E'];
      
      const result = testXLOOKUP(25, lookupArray, returnArray, 'N/A', 1);
      
      expect(result).toBe('C');  // 30 is next largest
    });

    test('should return if_not_found when all values are smaller', () => {
      const lookupArray = [10, 20, 30, 40, 50];
      const returnArray = ['A', 'B', 'C', 'D', 'E'];
      
      const result = testXLOOKUP(60, lookupArray, returnArray, 'Too Large', 1);
      
      expect(result).toBe('Too Large');
    });
  });

  describe('Match mode 2 (wildcard match)', () => {
    test('should match with * wildcard', () => {
      const lookupArray = ['Apple Pie', 'Banana Bread', 'Cherry Tart', 'Date Cake'];
      const returnArray = [10, 20, 30, 40];
      
      const result = testXLOOKUP('*Bread', lookupArray, returnArray, 'N/A', 2);
      
      expect(result).toBe(20);
    });

    test('should match with ? wildcard', () => {
      const lookupArray = ['Cat', 'Bat', 'Hat', 'Rat'];
      const returnArray = [1, 2, 3, 4];
      
      const result = testXLOOKUP('?at', lookupArray, returnArray, 'N/A', 2);
      
      expect(result).toBe(1);  // Matches "Cat" (first match)
    });

    test('should match with combined wildcards', () => {
      const lookupArray = ['Product-A-123', 'Product-B-456', 'Product-C-789'];
      const returnArray = ['Item A', 'Item B', 'Item C'];
      
      const result = testXLOOKUP('Product-?-*', lookupArray, returnArray, 'N/A', 2);
      
      expect(result).toBe('Item A');
    });
  });

  describe('Search mode -1 (last-to-first)', () => {
    test('should find last matching item', () => {
      const lookupArray = ['Apple', 'Banana', 'Apple', 'Cherry', 'Apple'];
      const returnArray = [10, 20, 30, 40, 50];
      
      const result = testXLOOKUP('Apple', lookupArray, returnArray, 'N/A', 0, -1);
      
      expect(result).toBe(50);  // Last "Apple"
    });
  });

  describe('Search mode 2 (binary search ascending)', () => {
    test('should find value using binary search', () => {
      const lookupArray = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      const returnArray = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
      
      const result = testXLOOKUP(60, lookupArray, returnArray, 'N/A', 0, 2);
      
      expect(result).toBe('F');
    });

    test('should return next smallest with binary search when not found', () => {
      const lookupArray = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      const returnArray = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
      
      const result = testXLOOKUP(55, lookupArray, returnArray, 'N/A', -1, 2);
      
      expect(result).toBe('E');  // 50 is next smallest
    });
  });

  describe('Search mode -2 (binary search descending)', () => {
    test('should find value in descending array', () => {
      const lookupArray = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10];
      const returnArray = ['J', 'I', 'H', 'G', 'F', 'E', 'D', 'C', 'B', 'A'];
      
      const result = testXLOOKUP(60, lookupArray, returnArray, 'N/A', 0, -2);
      
      expect(result).toBe('F');
    });
  });

  describe('Error handling', () => {
    test('should return #VALUE! when lookup_array is not an array', () => {
      const result = testXLOOKUP('Apple', 'NotAnArray', [10, 20, 30]);
      
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('should return #VALUE! when return_array is not an array', () => {
      const result = testXLOOKUP('Apple', ['Apple', 'Banana'], 'NotAnArray');
      
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('should return #VALUE! when arrays have different lengths', () => {
      const lookupArray = ['Apple', 'Banana', 'Cherry'];
      const returnArray = [10, 20];  // Shorter array
      
      const result = testXLOOKUP('Apple', lookupArray, returnArray);
      
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('should return #N/A when lookup_array is empty', () => {
      const result = testXLOOKUP('Apple', [], []);
      
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#N/A');
    });
  });

  describe('Real-world scenarios', () => {
    test('should lookup employee salary by ID', () => {
      const employeeIds = [101, 102, 103, 104, 105];
      const salaries = [50000, 60000, 55000, 70000, 65000];
      
      const result = testXLOOKUP(103, employeeIds, salaries);
      
      expect(result).toBe(55000);
    });

    test('should lookup product price with default for unknown products', () => {
      const products = ['Laptop', 'Mouse', 'Keyboard', 'Monitor'];
      const prices = [999.99, 29.99, 79.99, 299.99];
      
      const result = testXLOOKUP('Webcam', products, prices, 0);
      
      expect(result).toBe(0);
    });

    test('should find tax bracket for income', () => {
      const incomeThresholds = [0, 10000, 40000, 90000, 180000];
      const taxRates = [0, 0.1, 0.2, 0.3, 0.4];
      
      const result = testXLOOKUP(75000, incomeThresholds, taxRates, 0, -1);
      
      expect(result).toBe(0.2);  // Falls in 40000-90000 bracket
    });
  });
});
