/**
 * database-functions.test.ts
 * 
 * Week 11 Day 6: Database Functions
 * Tests for DSUM, DAVERAGE, DCOUNT, DCOUNTA, DMAX, DMIN, DGET, DSTDEV, DSTDEVP, DVAR
 * 
 * Coverage: 10 functions, 65+ tests
 */

import { describe, it, expect } from '@jest/globals';
import * as DatabaseFunctions from '../../src/functions/database/database-functions';

// Helper to check approximate equality with tolerance
function expectApprox(actual: number, expected: number, tolerance = 1e-6) {
  expect(Math.abs(actual - expected)).toBeLessThan(tolerance);
}

// Sample tree database for testing
const treeDatabase = [
  ['Tree', 'Height', 'Age', 'Yield', 'Profit'],
  ['Apple', 18, 20, 14, 105.00],
  ['Pear', 12, 12, 10, 96.00],
  ['Cherry', 13, 14, 9, 105.00],
  ['Apple', 14, 15, 10, 75.00],
  ['Pear', 9, 8, 8, 76.80],
  ['Apple', 8, 9, 6, 45.00],
];

// Sample employee database
const employeeDatabase = [
  ['Name', 'Department', 'Salary', 'Experience'],
  ['Alice', 'Sales', 60000, 5],
  ['Bob', 'Engineering', 80000, 8],
  ['Charlie', 'Sales', 55000, 3],
  ['Diana', 'Engineering', 90000, 10],
  ['Eve', 'Sales', 52000, 2],
  ['Frank', 'Engineering', 75000, 6],
];

describe('Week 11 Day 6: Database Functions', () => {
  
  // ============================================================================
  // DSUM Tests (7 tests)
  // ============================================================================
  describe('DSUM - Database Sum', () => {
    it('should sum values matching a single criterion', () => {
      const criteria = [['Tree'], ['Apple']];
      const result = DatabaseFunctions.DSUM(treeDatabase, 'Yield', criteria);
      expect(result).toBe(30); // 14 + 10 + 6
    });
    
    it('should sum with multiple criteria (AND logic within row)', () => {
      const criteria = [
        ['Tree', 'Height'],
        ['Apple', '>10']
      ];
      const result = DatabaseFunctions.DSUM(treeDatabase, 'Yield', criteria);
      expect(result).toBe(24); // 14 + 10 (height > 10)
    });
    
    it('should support OR logic between criteria rows', () => {
      const criteria = [
        ['Tree'],
        ['Apple'],
        ['Pear']
      ];
      const result = DatabaseFunctions.DSUM(treeDatabase, 'Profit', criteria);
      expectApprox(result as number, 397.80, 0.01); // All Apple and Pear
    });
    
    it('should support comparison operators', () => {
      const criteria = [['Height'], ['>12']];
      const result = DatabaseFunctions.DSUM(treeDatabase, 'Age', criteria);
      expect(result).toBe(49); // 20 + 15 + 14 (heights 18, 14, 13)
    });
    
    it('should support wildcards in criteria', () => {
      const criteria = [['Tree'], ['*e*']]; // Trees containing 'e'
      const result = DatabaseFunctions.DSUM(treeDatabase, 'Yield', criteria);
      expect(result).toBe(57); // All trees (Apple, Pear, Cherry all have 'e')
    });
    
    it('should work with field index instead of name', () => {
      const criteria = [['Tree'], ['Apple']];
      const result = DatabaseFunctions.DSUM(treeDatabase, 4, criteria); // 4 = Yield (1-based)
      expect(result).toBe(30);
    });
    
    it('should return #VALUE! for invalid database structure', () => {
      const invalidDb = [['Tree']]; // Only headers, no data
      const criteria = [['Tree'], ['Apple']];
      const result = DatabaseFunctions.DSUM(invalidDb, 'Tree', criteria);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });
  });

  // ============================================================================
  // DAVERAGE Tests (6 tests)
  // ============================================================================
  describe('DAVERAGE - Database Average', () => {
    it('should average values matching criterion', () => {
      const criteria = [['Tree'], ['Apple']];
      const result = DatabaseFunctions.DAVERAGE(treeDatabase, 'Yield', criteria);
      expectApprox(result as number, 10, 0.01); // (14 + 10 + 6) / 3
    });
    
    it('should average with multiple criteria', () => {
      const criteria = [
        ['Department', 'Salary'],
        ['Engineering', '>75000']
      ];
      const result = DatabaseFunctions.DAVERAGE(employeeDatabase, 'Experience', criteria);
      expect(result).toBe(9); // (8 + 10) / 2 = 9
    });
    
    it('should ignore non-numeric values', () => {
      const mixedDb = [
        ['Name', 'Value'],
        ['A', 10],
        ['B', 'text'],
        ['C', 20],
        ['D', 30]
      ];
      const criteria = [['Name'], ['*']];
      const result = DatabaseFunctions.DAVERAGE(mixedDb, 'Value', criteria);
      expect(result).toBe(20); // (10 + 20 + 30) / 3
    });
    
    it('should return #DIV/0! when no numeric values match', () => {
      const criteria = [['Tree'], ['Oak']]; // No Oak trees
      const result = DatabaseFunctions.DAVERAGE(treeDatabase, 'Yield', criteria);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#DIV/0!');
    });
    
    it('should support comparison operators', () => {
      const criteria = [['Age'], ['>=12']];
      const result = DatabaseFunctions.DAVERAGE(treeDatabase, 'Height', criteria);
      expectApprox(result as number, 14.25, 0.01); // (18 + 12 + 13 + 14) / 4
    });
    
    it('should work with field name or index', () => {
      const criteria = [['Tree'], ['Pear']];
      const byName = DatabaseFunctions.DAVERAGE(treeDatabase, 'Height', criteria);
      const byIndex = DatabaseFunctions.DAVERAGE(treeDatabase, 2, criteria); // 2 = Height
      expect(byName).toBe(byIndex);
    });
  });

  // ============================================================================
  // DCOUNT Tests (6 tests)
  // ============================================================================
  describe('DCOUNT - Database Count (Numeric Only)', () => {
    it('should count only numeric values', () => {
      const criteria = [['Tree'], ['Apple']];
      const result = DatabaseFunctions.DCOUNT(treeDatabase, 'Yield', criteria);
      expect(result).toBe(3); // 3 Apple trees
    });
    
    it('should exclude text values from count', () => {
      const mixedDb = [
        ['Type', 'Value'],
        ['A', 10],
        ['B', 'text'],
        ['C', 20],
        ['D', '']
      ];
      const criteria = [['Type'], ['*']];
      const result = DatabaseFunctions.DCOUNT(mixedDb, 'Value', criteria);
      expect(result).toBe(2); // Only numeric values
    });
    
    it('should count with multiple criteria (AND)', () => {
      const criteria = [
        ['Tree', 'Height'],
        ['Apple', '>10']
      ];
      const result = DatabaseFunctions.DCOUNT(treeDatabase, 'Yield', criteria);
      expect(result).toBe(2); // 2 Apples with height > 10
    });
    
    it('should support wildcards', () => {
      const criteria = [['Department'], ['*ng']]; // Ends with 'ng'
      const result = DatabaseFunctions.DCOUNT(employeeDatabase, 'Salary', criteria);
      expect(result).toBe(3); // 3 Engineering employees
    });
    
    it('should return 0 when no matches', () => {
      const criteria = [['Tree'], ['Oak']];
      const result = DatabaseFunctions.DCOUNT(treeDatabase, 'Yield', criteria);
      expect(result).toBe(0);
    });
    
    it('should return #VALUE! for invalid structure', () => {
      const invalidDb = [['Name']];
      const criteria = [['Name'], ['A']];
      const result = DatabaseFunctions.DCOUNT(invalidDb, 'Name', criteria);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });
  });

  // ============================================================================
  // DCOUNTA Tests (6 tests)
  // ============================================================================
  describe('DCOUNTA - Database Count All (Text + Numbers)', () => {
    it('should count all non-empty values (text and numbers)', () => {
      const criteria = [['Tree'], ['Apple']];
      const result = DatabaseFunctions.DCOUNTA(treeDatabase, 'Tree', criteria);
      expect(result).toBe(3); // 3 Apples
    });
    
    it('should include both text and numeric values', () => {
      const mixedDb = [
        ['Type', 'Value'],
        ['A', 10],
        ['B', 'text'],
        ['C', 20],
        ['D', '']
      ];
      const criteria = [['Type'], ['*']];
      const result = DatabaseFunctions.DCOUNTA(mixedDb, 'Value', criteria);
      expect(result).toBe(3); // 10, 'text', 20 (empty excluded)
    });
    
    it('should count with multiple criteria', () => {
      const criteria = [
        ['Department', 'Experience'],
        ['Sales', '<5']
      ];
      const result = DatabaseFunctions.DCOUNTA(employeeDatabase, 'Name', criteria);
      expect(result).toBe(2); // Charlie, Eve
    });
    
    it('should support wildcards in criteria', () => {
      const criteria = [['Name'], ['*a*']]; // Names containing 'a'
      const result = DatabaseFunctions.DCOUNTA(employeeDatabase, 'Name', criteria);
      expect(result).toBe(4); // Alice, Charlie, Diana, Frank
    });
    
    it('should differ from DCOUNT for text fields', () => {
      const criteria = [['Tree'], ['*']];
      const dcount = DatabaseFunctions.DCOUNT(treeDatabase, 'Tree', criteria);
      const dcounta = DatabaseFunctions.DCOUNTA(treeDatabase, 'Tree', criteria);
      expect(dcount).toBe(0); // DCOUNT counts only numbers
      expect(dcounta).toBe(6); // DCOUNTA counts text (6 data rows)
    });
    
    it('should return #VALUE! for invalid database', () => {
      const invalidDb = [['A']];
      const criteria = [['A'], ['1']];
      const result = DatabaseFunctions.DCOUNTA(invalidDb, 'A', criteria);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });
  });

  // ============================================================================
  // DMAX Tests (5 tests)
  // ============================================================================
  describe('DMAX - Database Maximum', () => {
    it('should find maximum matching single criterion', () => {
      const criteria = [['Tree'], ['Apple']];
      const result = DatabaseFunctions.DMAX(treeDatabase, 'Height', criteria);
      expect(result).toBe(18); // Max height of Apples
    });
    
    it('should find max with multiple criteria', () => {
      const criteria = [
        ['Department', 'Experience'],
        ['Engineering', '>5']
      ];
      const result = DatabaseFunctions.DMAX(employeeDatabase, 'Salary', criteria);
      expect(result).toBe(90000); // Diana
    });
    
    it('should support comparison operators', () => {
      const criteria = [['Age'], ['<15']];
      const result = DatabaseFunctions.DMAX(treeDatabase, 'Profit', criteria);
      expectApprox(result as number, 105.00, 0.01); // Cherry
    });
    
    it('should return 0 when no numeric values match', () => {
      const criteria = [['Tree'], ['Oak']];
      const result = DatabaseFunctions.DMAX(treeDatabase, 'Height', criteria);
      expect(result).toBe(0);
    });
    
    it('should return 0 for invalid criteria field (no matches)', () => {
      const invalidCriteria = [['InvalidField'], ['value']];
      const result = DatabaseFunctions.DMAX(treeDatabase, 'Height', invalidCriteria);
      expect(result).toBe(0); // No matches returns 0
    });
  });

  // ============================================================================
  // DMIN Tests (5 tests)
  // ============================================================================
  describe('DMIN - Database Minimum', () => {
    it('should find minimum matching single criterion', () => {
      const criteria = [['Tree'], ['Apple']];
      const result = DatabaseFunctions.DMIN(treeDatabase, 'Height', criteria);
      expect(result).toBe(8); // Min height of Apples
    });
    
    it('should find min with multiple criteria', () => {
      const criteria = [
        ['Tree', 'Age'],
        ['Apple', '>10']
      ];
      const result = DatabaseFunctions.DMIN(treeDatabase, 'Yield', criteria);
      expect(result).toBe(10); // Age > 10 Apples
    });
    
    it('should support comparison operators', () => {
      const criteria = [['Salary'], ['>70000']];
      const result = DatabaseFunctions.DMIN(employeeDatabase, 'Experience', criteria);
      expect(result).toBe(6); // Frank
    });
    
    it('should return 0 when no numeric values match', () => {
      const criteria = [['Department'], ['Marketing']];
      const result = DatabaseFunctions.DMIN(employeeDatabase, 'Salary', criteria);
      expect(result).toBe(0);
    });
    
    it('should return #VALUE! for invalid database', () => {
      const invalidDb = [['A']];
      const criteria = [['A'], ['1']];
      const result = DatabaseFunctions.DMIN(invalidDb, 'A', criteria);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });
  });

  // ============================================================================
  // DGET Tests (7 tests)
  // ============================================================================
  describe('DGET - Database Get Single Value', () => {
    it('should extract single matching value', () => {
      const criteria = [
        ['Name'],
        ['Diana']
      ];
      const result = DatabaseFunctions.DGET(employeeDatabase, 'Salary', criteria);
      expect(result).toBe(90000);
    });
    
    it('should return #NUM! when multiple values match', () => {
      const criteria = [['Tree'], ['Apple']]; // 3 Apples
      const result = DatabaseFunctions.DGET(treeDatabase, 'Height', criteria);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#NUM!');
    });
    
    it('should return #VALUE! when no values match', () => {
      const criteria = [['Tree'], ['Oak']];
      const result = DatabaseFunctions.DGET(treeDatabase, 'Height', criteria);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });
    
    it('should extract with exact match criteria', () => {
      const criteria = [
        ['Tree', 'Height'],
        ['Cherry', 13]
      ];
      const result = DatabaseFunctions.DGET(treeDatabase, 'Age', criteria);
      expect(result).toBe(14);
    });
    
    it('should work with multiple AND criteria', () => {
      const criteria = [
        ['Department', 'Experience'],
        ['Sales', 2]
      ];
      const result = DatabaseFunctions.DGET(employeeDatabase, 'Name', criteria);
      expect(result).toBe('Eve');
    });
    
    it('should work with field index', () => {
      const criteria = [['Name'], ['Bob']];
      const result = DatabaseFunctions.DGET(employeeDatabase, 3, criteria); // 3 = Salary
      expect(result).toBe(80000);
    });
    
    it('should return #VALUE! for invalid database structure', () => {
      const invalidDb = [['Name']];
      const criteria = [['Name'], ['A']];
      const result = DatabaseFunctions.DGET(invalidDb, 'Name', criteria);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });
  });

  // ============================================================================
  // DSTDEV Tests (5 tests)
  // ============================================================================
  describe('DSTDEV - Database Sample Standard Deviation', () => {
    it('should calculate sample standard deviation', () => {
      const criteria = [['Tree'], ['Apple']];
      const result = DatabaseFunctions.DSTDEV(treeDatabase, 'Height', criteria);
      // Heights: 18, 14, 8 → mean = 13.33, sample std dev ≈ 5.033
      expectApprox(result as number, 5.033, 0.01);
    });
    
    it('should work with multiple criteria', () => {
      const criteria = [
        ['Tree', 'Age'],
        ['Apple', '>10']
      ];
      const result = DatabaseFunctions.DSTDEV(treeDatabase, 'Yield', criteria);
      // Yields: 14, 10 → sample std dev ≈ 2.828
      expectApprox(result as number, 2.828, 0.01);
    });
    
    it('should match STDEV for full dataset', () => {
      const criteria = [['Tree'], ['*']];
      const dstdev = DatabaseFunctions.DSTDEV(treeDatabase, 'Age', criteria);
      // Ages: 20, 12, 14, 15, 8, 9 → sample std dev ≈ 4.38
      expectApprox(dstdev as number, 4.38, 0.1);
    });
    
    it('should return #DIV/0! for insufficient data (n < 2)', () => {
      const criteria = [['Name'], ['Alice']]; // Only 1 match
      const result = DatabaseFunctions.DSTDEV(employeeDatabase, 'Salary', criteria);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#DIV/0!');
    });
    
    it('should differ from DSTDEVP (population)', () => {
      const criteria = [['Department'], ['Sales']];
      const sample = DatabaseFunctions.DSTDEV(employeeDatabase, 'Salary', criteria);
      const population = DatabaseFunctions.DSTDEVP(employeeDatabase, 'Salary', criteria);
      // Sample std dev > population std dev (for same data)
      expect(sample as number).toBeGreaterThan(population as number);
    });
  });

  // ============================================================================
  // DSTDEVP Tests (4 tests)
  // ============================================================================
  describe('DSTDEVP - Database Population Standard Deviation', () => {
    it('should calculate population standard deviation', () => {
      const criteria = [['Tree'], ['Pear']];
      const result = DatabaseFunctions.DSTDEVP(treeDatabase, 'Height', criteria);
      // Heights: 12, 9 → population std dev = 1.5
      expectApprox(result as number, 1.5, 0.01);
    });
    
    it('should work with all data', () => {
      const criteria = [['Tree'], ['*']];
      const result = DatabaseFunctions.DSTDEVP(treeDatabase, 'Profit', criteria);
      // Should calculate population std dev for all profits
      expect(result as number).toBeGreaterThan(0);
    });
    
    it('should differ from DSTDEV (sample)', () => {
      const criteria = [['Department'], ['Engineering']];
      const sample = DatabaseFunctions.DSTDEV(employeeDatabase, 'Salary', criteria);
      const population = DatabaseFunctions.DSTDEVP(employeeDatabase, 'Salary', criteria);
      // Population std dev < sample std dev
      expect(population as number).toBeLessThan(sample as number);
    });
    
    it('should return #DIV/0! for no numeric values', () => {
      const criteria = [['Department'], ['Marketing']];
      const result = DatabaseFunctions.DSTDEVP(employeeDatabase, 'Salary', criteria);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#DIV/0!');
    });
  });

  // ============================================================================
  // DVAR Tests (4 tests)
  // ============================================================================
  describe('DVAR - Database Sample Variance', () => {
    it('should calculate sample variance', () => {
      const criteria = [['Tree'], ['Apple']];
      const result = DatabaseFunctions.DVAR(treeDatabase, 'Yield', criteria);
      // Yields: 14, 10, 6 → mean = 10, variance = 16
      expectApprox(result as number, 16, 0.01);
    });
    
    it('should work with multiple criteria', () => {
      const criteria = [
        ['Department'],
        ['Sales']
      ];
      const result = DatabaseFunctions.DVAR(employeeDatabase, 'Salary', criteria);
      // Sales salaries: 60000, 55000, 52000
      expect(result as number).toBeGreaterThan(0);
    });
    
    it('should match VAR for full dataset', () => {
      const criteria = [['Tree'], ['*']];
      const result = DatabaseFunctions.DVAR(treeDatabase, 'Age', criteria);
      // Ages: 20, 12, 14, 15, 8, 9
      expect(result as number).toBeGreaterThan(0);
    });
    
    it('should return #DIV/0! for insufficient data', () => {
      const criteria = [['Tree'], ['Cherry']]; // Only 1 Cherry
      const result = DatabaseFunctions.DVAR(treeDatabase, 'Age', criteria);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#DIV/0!');
    });
  });

  // ============================================================================
  // Integration Tests (5 tests)
  // ============================================================================
  describe('Integration Tests - Combined Operations', () => {
    it('should verify criteria matching consistency across functions', () => {
      const criteria = [['Tree'], ['Apple']];
      const sum = DatabaseFunctions.DSUM(treeDatabase, 'Yield', criteria);
      const count = DatabaseFunctions.DCOUNT(treeDatabase, 'Yield', criteria);
      const average = DatabaseFunctions.DAVERAGE(treeDatabase, 'Yield', criteria);
      
      // sum / count should equal average
      expectApprox((sum as number) / (count as number), average as number, 0.01);
    });
    
    it('should handle complex OR criteria with wildcards', () => {
      const criteria = [
        ['Tree', 'Height'],
        ['App*', '>12'], // Apples with height > 12
        ['P*', '>10']    // Pears with height > 10
      ];
      const result = DatabaseFunctions.DSUM(treeDatabase, 'Yield', criteria);
      expect(result).toBeGreaterThan(0);
    });
    
    it('should handle comparison operators correctly', () => {
      const operators = ['>', '<', '>=', '<=', '<>', '='];
      operators.forEach(op => {
        const criteria = [['Height'], [`${op}12`]];
        const result = DatabaseFunctions.DCOUNT(treeDatabase, 'Age', criteria);
        expect(typeof result).toBe('number');
      });
    });
    
    it('should handle edge case: empty criteria matches all', () => {
      // Empty criteria row should match all records
      const criteria = [['Tree'], ['*']];
      const allCount = DatabaseFunctions.DCOUNT(treeDatabase, 'Age', criteria);
      expect(allCount).toBe(6); // All 6 data rows
    });
    
    it('should validate field name case-insensitivity', () => {
      const criteria1 = [['TREE'], ['Apple']];
      const criteria2 = [['tree'], ['Apple']];
      const result1 = DatabaseFunctions.DSUM(treeDatabase, 'Yield', criteria1);
      const result2 = DatabaseFunctions.DSUM(treeDatabase, 'Yield', criteria2);
      expect(result1).toBe(result2);
    });
  });
});
