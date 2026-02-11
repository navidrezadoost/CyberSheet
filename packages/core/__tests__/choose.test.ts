/**
 * Unit tests for CHOOSE function
 * Tests index-based value selection with various data types
 */

import { FormulaEngine } from '../src/FormulaEngine';
import { Worksheet } from '../src/worksheet';

describe('FormulaEngine - CHOOSE Function', () => {
  let engine: FormulaEngine;
  let worksheet: Worksheet;

  beforeEach(() => {
    engine = new FormulaEngine();
    worksheet = new Worksheet('Test', 100, 26);
  });

  // Helper to directly test CHOOSE function
  const testCHOOSE = (...args: any[]) => {
    const chooseFunc = (engine as any).functions.get('CHOOSE');
    return chooseFunc(...args);
  };

  describe('Basic functionality', () => {
    test('should return first value with index 1', () => {
      expect(testCHOOSE(1, 'Apple', 'Banana', 'Cherry')).toBe('Apple');
      expect(testCHOOSE(1, 10, 20, 30)).toBe(10);
    });

    test('should return middle values', () => {
      expect(testCHOOSE(2, 'Red', 'Green', 'Blue')).toBe('Green');
      expect(testCHOOSE(3, 100, 200, 300, 400)).toBe(300);
    });

    test('should return last value', () => {
      expect(testCHOOSE(3, 'A', 'B', 'C')).toBe('C');
      expect(testCHOOSE(5, 10, 20, 30, 40, 50)).toBe(50);
    });

    test('should work with single value', () => {
      expect(testCHOOSE(1, 'OnlyValue')).toBe('OnlyValue');
      expect(testCHOOSE(1, 42)).toBe(42);
    });

    test('should work with two values', () => {
      expect(testCHOOSE(1, 'First', 'Second')).toBe('First');
      expect(testCHOOSE(2, 'First', 'Second')).toBe('Second');
    });

    test('should work with many values', () => {
      const values = Array.from({ length: 20 }, (_, i) => `Value${i + 1}`);
      
      expect(testCHOOSE(1, ...values)).toBe('Value1');
      expect(testCHOOSE(10, ...values)).toBe('Value10');
      expect(testCHOOSE(20, ...values)).toBe('Value20');
    });
  });

  describe('Mixed data types', () => {
    test('should handle mixed numbers and strings', () => {
      expect(testCHOOSE(1, 'Text', 123, 'More Text')).toBe('Text');
      expect(testCHOOSE(2, 'Text', 123, 'More Text')).toBe(123);
      expect(testCHOOSE(3, 'Text', 123, 'More Text')).toBe('More Text');
    });

    test('should handle boolean values', () => {
      expect(testCHOOSE(1, true, false, true)).toBe(true);
      expect(testCHOOSE(2, true, false, true)).toBe(false);
    });

    test('should handle null/undefined values', () => {
      expect(testCHOOSE(1, null, 'Value', undefined)).toBe(null);
      expect(testCHOOSE(2, null, 'Value', undefined)).toBe('Value');
      expect(testCHOOSE(3, null, 'Value', undefined)).toBe(undefined);
    });

    test('should handle arrays as values', () => {
      const arr1 = [1, 2, 3];
      const arr2 = ['a', 'b', 'c'];
      
      expect(testCHOOSE(1, arr1, arr2)).toBe(arr1);
      expect(testCHOOSE(2, arr1, arr2)).toBe(arr2);
    });

    test('should handle objects as values', () => {
      const obj1 = { name: 'Object1' };
      const obj2 = { name: 'Object2' };
      
      expect(testCHOOSE(1, obj1, obj2)).toBe(obj1);
      expect(testCHOOSE(2, obj1, obj2)).toBe(obj2);
    });
  });

  describe('Decimal index handling', () => {
    test('should truncate decimal indices (floor)', () => {
      expect(testCHOOSE(1.1, 'A', 'B', 'C')).toBe('A');
      expect(testCHOOSE(1.9, 'A', 'B', 'C')).toBe('A');
      expect(testCHOOSE(2.5, 'A', 'B', 'C')).toBe('B');
      expect(testCHOOSE(2.99, 'A', 'B', 'C')).toBe('B');
    });

    test('should handle negative decimals correctly', () => {
      const result = testCHOOSE(-0.5, 'A', 'B', 'C');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });
  });

  describe('Error handling', () => {
    test('should return #VALUE! for index 0', () => {
      const result = testCHOOSE(0, 'A', 'B', 'C');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('should return #VALUE! for negative index', () => {
      const result = testCHOOSE(-1, 'A', 'B', 'C');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('should return #VALUE! for index beyond values', () => {
      const result1 = testCHOOSE(4, 'A', 'B', 'C');
      expect(result1).toBeInstanceOf(Error);
      expect((result1 as Error).message).toBe('#VALUE!');
      
      const result2 = testCHOOSE(100, 'A', 'B', 'C');
      expect(result2).toBeInstanceOf(Error);
      expect((result2 as Error).message).toBe('#VALUE!');
    });

    test('should return #VALUE! for non-numeric index', () => {
      const result1 = testCHOOSE('text', 'A', 'B', 'C');
      expect(result1).toBeInstanceOf(Error);
      expect((result1 as Error).message).toBe('#VALUE!');
      
      const result2 = testCHOOSE(null, 'A', 'B', 'C');
      expect(result2).toBeInstanceOf(Error);
      expect((result2 as Error).message).toBe('#VALUE!');
      
      const result3 = testCHOOSE(undefined, 'A', 'B', 'C');
      expect(result3).toBeInstanceOf(Error);
      expect((result3 as Error).message).toBe('#VALUE!');
    });

    test('should return #VALUE! when no values provided', () => {
      const result = testCHOOSE(1);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('should return #VALUE! when only index provided', () => {
      const result = testCHOOSE(2);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });
  });

  describe('Real-world scenarios', () => {
    test('should select day of week', () => {
      const dayNum = 3;  // Wednesday
      const result = testCHOOSE(
        dayNum,
        'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
      );
      expect(result).toBe('Wednesday');
    });

    test('should select month name', () => {
      const monthNum = 12;  // December
      const result = testCHOOSE(
        monthNum,
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      );
      expect(result).toBe('Dec');
    });

    test('should select pricing tier', () => {
      const tier = 2;  // Medium
      const price = testCHOOSE(tier, 9.99, 19.99, 29.99);
      expect(price).toBe(19.99);
    });

    test('should select status message', () => {
      const statusCode = 1;
      const message = testCHOOSE(
        statusCode,
        'Success',
        'Warning',
        'Error',
        'Critical'
      );
      expect(message).toBe('Success');
    });

    test('should select color by index', () => {
      const colorIndex = 3;
      const color = testCHOOSE(
        colorIndex,
        '#FF0000', // Red
        '#00FF00', // Green
        '#0000FF', // Blue
        '#FFFF00'  // Yellow
      );
      expect(color).toBe('#0000FF');
    });

    test('should select formula result', () => {
      // Simulate choosing between different calculation results
      const option = 2;
      const result = testCHOOSE(option, 100, 200, 300);
      expect(result).toBe(200);
    });
  });

  describe('Edge cases', () => {
    test('should handle very large index correctly', () => {
      const result = testCHOOSE(1000000, 'A', 'B', 'C');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('should handle empty string values', () => {
      expect(testCHOOSE(1, '', 'B', 'C')).toBe('');
      expect(testCHOOSE(2, 'A', '', 'C')).toBe('');
    });

    test('should handle zero as value', () => {
      expect(testCHOOSE(1, 0, 1, 2)).toBe(0);
      expect(testCHOOSE(2, -1, 0, 1)).toBe(0);
    });

    test('should handle negative numbers as values', () => {
      expect(testCHOOSE(1, -10, -20, -30)).toBe(-10);
      expect(testCHOOSE(3, -10, -20, -30)).toBe(-30);
    });
  });

  describe('Performance', () => {
    test('should handle large value lists efficiently', () => {
      const values = Array.from({ length: 254 }, (_, i) => i + 1);
      
      const start = Date.now();
      
      // Test first, middle, and last
      expect(testCHOOSE(1, ...values)).toBe(1);
      expect(testCHOOSE(127, ...values)).toBe(127);
      expect(testCHOOSE(254, ...values)).toBe(254);
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(10);  // Should be very fast
    });

    test('should handle multiple calls efficiently', () => {
      const values = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
      
      const start = Date.now();
      
      for (let i = 1; i <= 10; i++) {
        testCHOOSE(i, ...values);
      }
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(10);
    });
  });
});
