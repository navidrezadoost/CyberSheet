/**
 * Unit tests for HLOOKUP function
 * Tests exact match, approximate match, wildcards, and error handling
 */

import { FormulaEngine } from '../src/FormulaEngine';
import { Worksheet } from '../src/worksheet';

describe('FormulaEngine - HLOOKUP Function', () => {
  let engine: FormulaEngine;
  let worksheet: Worksheet;

  beforeEach(() => {
    engine = new FormulaEngine();
    worksheet = new Worksheet('Test', 100, 26);
  });

  // Helper to directly test HLOOKUP function
  const testHLOOKUP = (...args: any[]) => {
    const hlookupFunc = (engine as any).functions.get('HLOOKUP');
    return hlookupFunc(...args);
  };

  describe('Exact match (range_lookup = FALSE)', () => {
    test('should find exact match in first row', () => {
      const table = [
        ['Product', 'Apple', 'Banana', 'Cherry', 'Date'],
        ['Price', 1.50, 0.75, 2.00, 1.25],
        ['Stock', 100, 150, 80, 60]
      ];
      
      expect(testHLOOKUP('Apple', table, 2, false)).toBe(1.50);
      expect(testHLOOKUP('Banana', table, 2, false)).toBe(0.75);
      expect(testHLOOKUP('Cherry', table, 3, false)).toBe(80);
      expect(testHLOOKUP('Date', table, 3, false)).toBe(60);
    });

    test('should be case-insensitive for text', () => {
      const table = [
        ['Name', 'apple', 'Banana', 'CHERRY'],
        ['Value', 10, 20, 30]
      ];
      
      expect(testHLOOKUP('APPLE', table, 2, false)).toBe(10);
      expect(testHLOOKUP('banana', table, 2, false)).toBe(20);
      expect(testHLOOKUP('Cherry', table, 2, false)).toBe(30);
    });

    test('should work with numeric lookup values', () => {
      const table = [
        ['Year', 2020, 2021, 2022, 2023],
        ['Sales', 1000, 1200, 1500, 1800],
        ['Growth', 0, 20, 25, 20]
      ];
      
      expect(testHLOOKUP(2021, table, 2, false)).toBe(1200);
      expect(testHLOOKUP(2022, table, 3, false)).toBe(25);
      expect(testHLOOKUP(2023, table, 2, false)).toBe(1800);
    });

    test('should return #N/A when no match found', () => {
      const table = [
        ['A', 'B', 'C'],
        [1, 2, 3]
      ];
      
      const result = testHLOOKUP('D', table, 2, false);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#N/A');
    });

    test('should support wildcard matching with *', () => {
      const table = [
        ['Item', 'Apple Pie', 'Banana Bread', 'Cherry Cake', 'Date Cookie'],
        ['Category', 'Dessert', 'Bread', 'Cake', 'Cookie']
      ];
      
      expect(testHLOOKUP('Apple*', table, 2, false)).toBe('Dessert');
      expect(testHLOOKUP('*Bread', table, 2, false)).toBe('Bread');
      expect(testHLOOKUP('Cherry*', table, 2, false)).toBe('Cake');
    });

    test('should support wildcard matching with ?', () => {
      const table = [
        ['Code', 'A1', 'A2', 'B1', 'B2'],
        ['Value', 10, 20, 30, 40]
      ];
      
      expect(testHLOOKUP('A?', table, 2, false)).toBe(10);  // Matches A1 (first occurrence)
      expect(testHLOOKUP('B?', table, 2, false)).toBe(30);  // Matches B1 (first occurrence)
    });

    test('should handle first row (row_index = 1)', () => {
      const table = [
        ['Header1', 'Header2', 'Header3'],
        ['Row2A', 'Row2B', 'Row2C']
      ];
      
      expect(testHLOOKUP('Header2', table, 1, false)).toBe('Header2');
    });
  });

  describe('Approximate match (range_lookup = TRUE)', () => {
    test('should find exact match', () => {
      const table = [
        ['Score', 0, 60, 70, 80, 90],
        ['Grade', 'F', 'D', 'C', 'B', 'A']
      ];
      
      expect(testHLOOKUP(60, table, 2, true)).toBe('D');
      expect(testHLOOKUP(80, table, 2, true)).toBe('B');
      expect(testHLOOKUP(90, table, 2, true)).toBe('A');
    });

    test('should find largest value less than or equal to lookup', () => {
      const table = [
        ['Score', 0, 60, 70, 80, 90],
        ['Grade', 'F', 'D', 'C', 'B', 'A']
      ];
      
      // 65 is between 60 and 70, should return grade for 60
      expect(testHLOOKUP(65, table, 2, true)).toBe('D');
      
      // 75 is between 70 and 80, should return grade for 70
      expect(testHLOOKUP(75, table, 2, true)).toBe('C');
      
      // 85 is between 80 and 90, should return grade for 80
      expect(testHLOOKUP(85, table, 2, true)).toBe('B');
      
      // 95 is greater than 90, should return grade for 90
      expect(testHLOOKUP(95, table, 2, true)).toBe('A');
    });

    test('should work with text values in sorted order', () => {
      const table = [
        ['Alice', 'Bob', 'Charlie', 'David'],
        ['HR', 'IT', 'Sales', 'Marketing']
      ];
      
      expect(testHLOOKUP('Alice', table, 2, true)).toBe('HR');
      expect(testHLOOKUP('Bob', table, 2, true)).toBe('IT');
      expect(testHLOOKUP('Ben', table, 2, true)).toBe('HR');  // Between Alice and Bob (Ben < Bob)
    });

    test('should return #N/A when lookup is smaller than all values', () => {
      const table = [
        [10, 20, 30, 40],
        ['A', 'B', 'C', 'D']
      ];
      
      const result = testHLOOKUP(5, table, 2, true);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#N/A');
    });

    test('should use TRUE as default for range_lookup', () => {
      const table = [
        [0, 60, 70, 80, 90],
        ['F', 'D', 'C', 'B', 'A']
      ];
      
      // Omit range_lookup parameter - should default to TRUE
      expect(testHLOOKUP(75, table, 2)).toBe('C');
      expect(testHLOOKUP(65, table, 2)).toBe('D');
    });
  });

  describe('Error handling', () => {
    test('should return #REF! for non-array table', () => {
      const result = testHLOOKUP('value', 'not an array', 2, false);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#REF!');
    });

    test('should return #REF! for empty table', () => {
      const result = testHLOOKUP('value', [], 2, false);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#REF!');
    });

    test('should return #REF! for 1D array (not a table)', () => {
      const result = testHLOOKUP('value', ['A', 'B', 'C'], 2, false);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#REF!');
    });

    test('should return #REF! for row_index out of bounds', () => {
      const table = [
        ['A', 'B', 'C'],
        [1, 2, 3]
      ];
      
      const result1 = testHLOOKUP('A', table, 0, false);
      expect(result1).toBeInstanceOf(Error);
      expect((result1 as Error).message).toBe('#REF!');
      
      const result2 = testHLOOKUP('A', table, 3, false);
      expect(result2).toBeInstanceOf(Error);
      expect((result2 as Error).message).toBe('#REF!');
      
      const result3 = testHLOOKUP('A', table, -1, false);
      expect(result3).toBeInstanceOf(Error);
      expect((result3 as Error).message).toBe('#REF!');
    });

    test('should return #REF! when target row is shorter than match column', () => {
      const table = [
        ['A', 'B', 'C', 'D'],
        [1, 2]  // Jagged array - row 2 is shorter
      ];
      
      const result = testHLOOKUP('C', table, 2, false);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#REF!');
    });

    test('should handle null values in first row', () => {
      const table = [
        [null, 'A', 'B', 'C'],
        [1, 2, 3, 4]
      ];
      
      expect(testHLOOKUP(null, table, 2, false)).toBe(1);
      expect(testHLOOKUP('B', table, 2, false)).toBe(3);
    });
  });

  describe('Real-world scenarios', () => {
    test('should lookup quarterly sales data', () => {
      const salesTable = [
        ['Quarter', 'Q1', 'Q2', 'Q3', 'Q4'],
        ['Revenue', 100000, 120000, 150000, 180000],
        ['Expenses', 60000, 70000, 80000, 90000],
        ['Profit', 40000, 50000, 70000, 90000]
      ];
      
      // Get Q2 revenue
      expect(testHLOOKUP('Q2', salesTable, 2, false)).toBe(120000);
      
      // Get Q3 profit
      expect(testHLOOKUP('Q3', salesTable, 4, false)).toBe(70000);
      
      // Get Q4 expenses
      expect(testHLOOKUP('Q4', salesTable, 3, false)).toBe(90000);
    });

    test('should lookup product specifications', () => {
      const productTable = [
        ['SKU', 'SKU-001', 'SKU-002', 'SKU-003', 'SKU-004'],
        ['Name', 'Laptop', 'Mouse', 'Keyboard', 'Monitor'],
        ['Price', 999.99, 25.99, 79.99, 299.99],
        ['Weight', 2.5, 0.1, 0.8, 5.0]
      ];
      
      expect(testHLOOKUP('SKU-002', productTable, 2, false)).toBe('Mouse');
      expect(testHLOOKUP('SKU-002', productTable, 3, false)).toBe(25.99);
      expect(testHLOOKUP('SKU-003', productTable, 4, false)).toBe(0.8);
    });

    test('should lookup tax brackets with approximate match', () => {
      const taxTable = [
        ['Income', 0, 10000, 40000, 85000, 160000],
        ['Rate', 0.10, 0.12, 0.22, 0.24, 0.32],
        ['Bracket', '10%', '12%', '22%', '24%', '32%']
      ];
      
      // Income $35,000 - falls in $10,000-$40,000 bracket
      expect(testHLOOKUP(35000, taxTable, 2, true)).toBe(0.12);
      expect(testHLOOKUP(35000, taxTable, 3, true)).toBe('12%');
      
      // Income $95,000 - falls in $85,000-$160,000 bracket
      expect(testHLOOKUP(95000, taxTable, 2, true)).toBe(0.24);
      
      // Income $200,000 - above highest bracket
      expect(testHLOOKUP(200000, taxTable, 2, true)).toBe(0.32);
    });

    test('should lookup employee data with wildcard', () => {
      const employeeTable = [
        ['Email', 'alice@company.com', 'bob@company.com', 'charlie@company.com'],
        ['ID', 'EMP001', 'EMP002', 'EMP003'],
        ['Role', 'Manager', 'Developer', 'Designer']
      ];
      
      // Find by partial email
      expect(testHLOOKUP('alice*', employeeTable, 2, false)).toBe('EMP001');
      expect(testHLOOKUP('*charlie*', employeeTable, 3, false)).toBe('Designer');
    });
  });

  describe('Performance', () => {
    test('should handle large tables efficiently', () => {
      // Create a table with 1000 columns
      const columns = 1000;
      const firstRow = Array.from({ length: columns }, (_, i) => i);
      const secondRow = Array.from({ length: columns }, (_, i) => i * 10);
      const table = [firstRow, secondRow];
      
      const start = Date.now();
      
      // Exact match
      expect(testHLOOKUP(500, table, 2, false)).toBe(5000);
      
      // Approximate match
      expect(testHLOOKUP(755, table, 2, true)).toBe(7550);
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(50);  // Should complete in under 50ms
    });

    test('should handle multiple lookups efficiently', () => {
      const table = [
        ['Month', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        ['Days', 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
      ];
      
      const months = ['Jan', 'Mar', 'May', 'Jul', 'Sep', 'Nov'];
      const results = months.map(month => testHLOOKUP(month, table, 2, false));
      
      expect(results).toEqual([31, 31, 31, 31, 30, 30]);
    });
  });
});
