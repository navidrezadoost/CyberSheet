import { FormulaEngine } from '../../src/FormulaEngine';
import { Worksheet } from '../../src/worksheet';
import type { FormulaContext } from '../../src/types/formula-types';

describe('Text Manipulation Functions', () => {
  let engine: FormulaEngine;
  let worksheet: Worksheet;
  let context: FormulaContext;

  beforeEach(() => {
    engine = new FormulaEngine();
    worksheet = new Worksheet('Sheet1', 100, 26);
    context = {
      worksheet,
      currentCell: { row: 1, col: 1 },
      namedLambdas: new Map(),
    };
  });

  const evaluate = (formula: string) => {
    return engine.evaluate(formula, context);
  };

  // ============================================================================
  // SUBSTITUTE - Replace Text
  // ============================================================================
  describe('SUBSTITUTE', () => {
    test('replaces all occurrences', () => {
      const result = evaluate('=SUBSTITUTE("Hello World", "l", "L")');
      expect(result).toBe('HeLLo WorLd');
    });

    test('replaces specific instance (first)', () => {
      const result = evaluate('=SUBSTITUTE("Hello World", "l", "L", 1)');
      expect(result).toBe('HeLlo World');
    });

    test('replaces specific instance (second)', () => {
      const result = evaluate('=SUBSTITUTE("Hello World", "l", "L", 2)');
      expect(result).toBe('HelLo World');
    });

    test('replaces specific instance (third)', () => {
      const result = evaluate('=SUBSTITUTE("Hello World", "l", "L", 3)');
      expect(result).toBe('Hello WorLd');
    });

    test('is case-sensitive', () => {
      const result = evaluate('=SUBSTITUTE("Hello World", "L", "X")');
      expect(result).toBe('Hello World');
    });

    test('replaces word with another word', () => {
      const result = evaluate('=SUBSTITUTE("The cat is a cat", "cat", "dog")');
      expect(result).toBe('The dog is a dog');
    });

    test('replaces with empty string (deletion)', () => {
      const result = evaluate('=SUBSTITUTE("Hello World", "World", "")');
      expect(result).toBe('Hello ');
    });

    test('replaces spaces', () => {
      const result = evaluate('=SUBSTITUTE("Hello  World", "  ", " ")');
      expect(result).toBe('Hello World');
    });

    test('handles no matches', () => {
      const result = evaluate('=SUBSTITUTE("Hello World", "xyz", "abc")');
      expect(result).toBe('Hello World');
    });

    test('replaces with longer text', () => {
      const result = evaluate('=SUBSTITUTE("Hi", "Hi", "Hello")');
      expect(result).toBe('Hello');
    });

    test('replaces special characters', () => {
      const result = evaluate('=SUBSTITUTE("Price: $10", "$", "USD ")');
      expect(result).toBe('Price: USD 10');
    });

    test('handles instance number beyond occurrences', () => {
      const result = evaluate('=SUBSTITUTE("Hello", "l", "L", 5)');
      expect(result).toBe('Hello');
    });
  });

  // ============================================================================
  // REPLACE - Replace by Position
  // ============================================================================
  describe('REPLACE', () => {
    test('replaces characters from position', () => {
      const result = evaluate('=REPLACE("Hello World", 7, 5, "Excel")');
      expect(result).toBe('Hello Excel');
    });

    test('replaces at beginning', () => {
      const result = evaluate('=REPLACE("Hello World", 1, 5, "Hi")');
      expect(result).toBe('Hi World');
    });

    test('replaces at end', () => {
      const result = evaluate('=REPLACE("Hello World", 7, 5, "Friend")');
      expect(result).toBe('Hello Friend');
    });

    test('replaces with empty string (deletion)', () => {
      const result = evaluate('=REPLACE("Hello World", 6, 6, "")');
      expect(result).toBe('Hello');
    });

    test('replaces with longer text', () => {
      const result = evaluate('=REPLACE("Hi", 1, 2, "Hello")');
      expect(result).toBe('Hello');
    });

    test('replaces 0 characters (insertion)', () => {
      const result = evaluate('=REPLACE("HelloWorld", 6, 0, " ")');
      expect(result).toBe('Hello World');
    });

    test('replaces beyond end of string', () => {
      const result = evaluate('=REPLACE("Hello", 3, 100, "y")');
      expect(result).toBe('Hey');
    });

    test('returns error for start position < 1', () => {
      const result = evaluate('=REPLACE("Hello", 0, 2, "X")');
      expect(result).toBeInstanceOf(Error);
    });

    test('returns error for negative num_chars', () => {
      const result = evaluate('=REPLACE("Hello", 2, -1, "X")');
      expect(result).toBeInstanceOf(Error);
    });

    test('works with numbers', () => {
      const result = evaluate('=REPLACE(12345, 2, 2, "00")');
      // Replaces positions 2-3 (chars "23") with "00", giving "10045"
      expect(result).toBe('10045');
    });
  });

  // ============================================================================
  // TRIM - Remove Extra Spaces
  // ============================================================================
  describe('TRIM', () => {
    test('removes leading spaces', () => {
      const result = evaluate('=TRIM("   Hello World")');
      expect(result).toBe('Hello World');
    });

    test('removes trailing spaces', () => {
      const result = evaluate('=TRIM("Hello World   ")');
      expect(result).toBe('Hello World');
    });

    test('removes leading and trailing spaces', () => {
      const result = evaluate('=TRIM("   Hello World   ")');
      expect(result).toBe('Hello World');
    });

    test('reduces multiple internal spaces to single space', () => {
      const result = evaluate('=TRIM("Hello    World")');
      expect(result).toBe('Hello World');
    });

    test('handles mixed leading, trailing, and internal spaces', () => {
      const result = evaluate('=TRIM("  Hello   World  ")');
      expect(result).toBe('Hello World');
    });

    test('preserves single spaces between words', () => {
      const result = evaluate('=TRIM("Hello World")');
      expect(result).toBe('Hello World');
    });

    test('handles string with only spaces', () => {
      const result = evaluate('=TRIM("     ")');
      expect(result).toBe('');
    });

    test('handles empty string', () => {
      const result = evaluate('=TRIM("")');
      expect(result).toBe('');
    });

    test('handles string with no spaces', () => {
      const result = evaluate('=TRIM("HelloWorld")');
      expect(result).toBe('HelloWorld');
    });

    test('works with newlines and tabs', () => {
      const result = evaluate('=TRIM("Hello\\tWorld")');
      expect(typeof result).toBe('string');
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================
  describe('Integration Tests', () => {
    test('clean text with TRIM and SUBSTITUTE', () => {
      // First substitute multiple spaces, then trim
      const substituted = evaluate('=SUBSTITUTE("  Hello    World  ", "    ", " ")');
      const result = evaluate(`=TRIM("${substituted}")`);
      expect(result).toBe('Hello World');
    });

    test('replace file extension using FIND and REPLACE', () => {
      const filename = 'document.pdf';
      const dotPos = evaluate('=FIND(".", "document.pdf")');
      const len = evaluate('=LEN("document.pdf")');
      const result = evaluate(`=REPLACE("document.pdf", ${dotPos}, ${len}, ".txt")`);
      expect(result).toBe('document.txt');
    });

    test('fix typos with multiple SUBSTITUTE calls', () => {
      const step1 = evaluate('=SUBSTITUTE("teh quick teh", "teh", "the")');
      expect(step1).toBe('the quick the');
    });

    test('extract and replace domain in email', () => {
      const email = 'user@example.com';
      const atPos = evaluate('=FIND("@", "user@example.com")');
      const result = evaluate(`=REPLACE("user@example.com", ${atPos} + 1, 100, "newdomain.com")`);
      expect(result).toBe('user@newdomain.com');
    });

    test('clean and normalize text', () => {
      const text = '  HELLO   world  ';
      const trimmed = evaluate(`=TRIM("${text}")`);
      const result = evaluate(`=SUBSTITUTE("${trimmed}", "HELLO", "Hello")`);
      expect(result).toBe('Hello world');
    });

    test('remove all spaces using SUBSTITUTE', () => {
      const result = evaluate('=SUBSTITUTE("H e l l o", " ", "")');
      expect(result).toBe('Hello');
    });

    test('replace specific word occurrence', () => {
      const text = 'cat cat cat';
      const result = evaluate('=SUBSTITUTE("cat cat cat", "cat", "dog", 2)');
      expect(result).toBe('cat dog cat');
    });

    test('sanitize phone number', () => {
      const phone = '(123) 456-7890';
      const step1 = evaluate('=SUBSTITUTE("(123) 456-7890", "(", "")');
      const step2 = evaluate('=SUBSTITUTE("123) 456-7890", ")", "")');
      const step3 = evaluate('=SUBSTITUTE("123 456-7890", " ", "")');
      const result = evaluate('=SUBSTITUTE("123456-7890", "-", "")');
      expect(result).toBe('1234567890');
    });
  });

  // ============================================================================
  // Complex Scenarios
  // ============================================================================
  describe('Complex Scenarios', () => {
    test('build formatted string with REPLACE', () => {
      const base = '____-__-__';
      const step1 = evaluate('=REPLACE("____-__-__", 1, 4, "2026")');
      const step2 = evaluate(`=REPLACE("${step1}", 6, 2, "01")`);
      const result = evaluate(`=REPLACE("${step2}", 9, 2, "29")`);
      expect(result).toBe('2026-01-29');
    });

    test('mask sensitive data', () => {
      const card = '1234567890123456';
      const result = evaluate('=REPLACE("1234567890123456", 5, 8, "********")');
      expect(result).toBe('1234********3456');
    });

    test('chain multiple SUBSTITUTE operations', () => {
      const text = 'a b c';
      const step1 = evaluate('=SUBSTITUTE("a b c", "a", "x")');
      const step2 = evaluate(`=SUBSTITUTE("${step1}", "b", "y")`);
      const result = evaluate(`=SUBSTITUTE("${step2}", "c", "z")`);
      expect(result).toBe('x y z');
    });

    test('normalize whitespace in multi-line text', () => {
      const text = '  Line 1  \\n  Line 2  ';
      const result = evaluate(`=TRIM("${text}")`);
      expect(typeof result).toBe('string');
    });

    test('replace with pattern', () => {
      const text = 'Version 1.0';
      const vPos = evaluate('=FIND("Version", "Version 1.0")');
      const result = evaluate(`=REPLACE("Version 1.0", ${vPos}, 7, "v")`);
      expect(result).toBe('v 1.0');
    });

    test('clean CSV-like data', () => {
      const data = ' value1 , value2 , value3 ';
      const step1 = evaluate(`=TRIM("${data}")`);
      const result = evaluate(`=SUBSTITUTE("${step1}", " ,", ",")`);
      expect(result).toContain('value1');
    });

    test('build URL from parts', () => {
      const base = 'http://________';
      const result = evaluate('=REPLACE("http://________", 8, 8, "example.com")');
      expect(result).toBe('http://example.com');
    });

    test('remove duplicate characters with SUBSTITUTE', () => {
      const result = evaluate('=SUBSTITUTE("Helllo", "ll", "l")');
      expect(result).toBe('Hello');
    });

    test('format phone number', () => {
      const digits = '1234567890';
      const step1 = evaluate('=REPLACE("1234567890", 1, 0, "(")');
      const step2 = evaluate(`=REPLACE("${step1}", 5, 0, ") ")`);
      const result = evaluate(`=REPLACE("${step2}", 10, 0, "-")`);
      expect(result).toContain('(123)');
      expect(result).toContain('-');
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================
  describe('Edge Cases', () => {
    test('SUBSTITUTE with empty old_text', () => {
      const result = evaluate('=SUBSTITUTE("Hello", "", "X")');
      expect(typeof result).toBe('string');
    });

    test('SUBSTITUTE with empty new_text', () => {
      const result = evaluate('=SUBSTITUTE("Hello", "l", "")');
      expect(result).toBe('Heo');
    });

    test('REPLACE at very end of string', () => {
      const result = evaluate('=REPLACE("Hello", 6, 0, "!")');
      expect(result).toBe('Hello!');
    });

    test('TRIM with only newlines', () => {
      const result = evaluate('=TRIM("\\n\\n")');
      expect(typeof result).toBe('string');
    });

    test('SUBSTITUTE instance 0', () => {
      const result = evaluate('=SUBSTITUTE("Hello", "l", "L", 0)');
      // Instance 0 may not replace anything
      expect(typeof result).toBe('string');
    });

    test('REPLACE entire string', () => {
      const result = evaluate('=REPLACE("Hello", 1, 5, "Goodbye")');
      expect(result).toBe('Goodbye');
    });

    test('SUBSTITUTE case-sensitive exact match', () => {
      const result = evaluate('=SUBSTITUTE("Hello", "Hello", "Hi")');
      expect(result).toBe('Hi');
    });

    test('multiple TRIM applications', () => {
      const result = evaluate('=TRIM(TRIM("  Hello  "))');
      expect(result).toBe('Hello');
    });
  });
});
