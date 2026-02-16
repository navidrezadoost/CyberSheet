/**
 * Tests for Week 11 Day 3: Text Enhancement Functions
 * Functions: CONCAT, PROPER, CLEAN, UNICHAR, UNICODE, DOLLAR, FIXED, TEXTBEFORE, TEXTAFTER
 */

import { FormulaEngine, FormulaContext, Worksheet } from '../../src';

describe('Week 11 Day 3: Text Enhancement Functions', () => {
  let engine: FormulaEngine;
  let worksheet: Worksheet;
  let context: FormulaContext;

  beforeEach(() => {
    engine = new FormulaEngine();
    worksheet = new Worksheet('Test', 100, 26);
    context = {
      worksheet,
      currentCell: { row: 1, col: 1 },
      namedLambdas: new Map()
    } as FormulaContext;
  });

  const evaluate = (formula: string) => engine.evaluate(formula, context);

  // Helper to set cell value
  const setCellValue = (cell: string, value: any) => {
    const match = cell.match(/^([A-Z]+)(\d+)$/);
    if (!match) throw new Error(`Invalid cell reference: ${cell}`);
    const col = match[1].charCodeAt(0) - 64; // A=1, B=2, etc. (1-based)
    const row = parseInt(match[2]); // Keep row as-is (1-based)
    worksheet.setCellValue({ row, col }, value);
  };

  // ============================================================================
  // CONCAT - Modern text concatenation with array support
  // ============================================================================

  describe('CONCAT function', () => {
    test('should concatenate multiple strings', () => {
      expect(evaluate('=CONCAT("Hello", " ", "World")')).toBe('Hello World');
      expect(evaluate('=CONCAT("A", "B", "C")')).toBe('ABC');
    });

    test('should concatenate numbers and strings', () => {
      expect(evaluate('=CONCAT("Year: ", 2024)')).toBe('Year: 2024');
      expect(evaluate('=CONCAT(10, 20, 30)')).toBe('102030');
    });

    test('should handle cell ranges', () => {
      setCellValue('A1', 'Hello');
      setCellValue('A2', 'World');
      setCellValue('A3', '!');
      expect(evaluate('=CONCAT(A1:A3)')).toBe('HelloWorld!');
    });

    test('should handle mixed ranges and strings', () => {
      setCellValue('A1', 'First');
      setCellValue('A2', 'Second');
      expect(evaluate('=CONCAT(A1:A2, " and more")')).toBe('FirstSecond and more');
    });

    test('should ignore errors in arguments', () => {
      setCellValue('A1', 'Hello');
      setCellValue('A2', new Error('#DIV/0!')); // Error
      setCellValue('A3', 'World');
      expect(evaluate('=CONCAT(A1:A3)')).toBe('HelloWorld');
    });

    test('should treat empty cells as empty strings', () => {
      setCellValue('A1', 'A');
      setCellValue('A3', 'C');
      expect(evaluate('=CONCAT(A1:A3)')).toBe('AC');
    });

    test('should handle single argument', () => {
      expect(evaluate('=CONCAT("Solo")')).toBe('Solo');
    });

    test('should handle booleans', () => {
      expect(evaluate('=CONCAT(TRUE, FALSE)')).toBe('TRUEFALSE');
    });
  });

  // ============================================================================
  // PROPER - Capitalize first letter of each word
  // ============================================================================

  describe('PROPER function', () => {
    test('should capitalize first letter of each word', () => {
      expect(evaluate('=PROPER("hello world")')).toBe('Hello World');
      expect(evaluate('=PROPER("JOHN SMITH")')).toBe('John Smith');
      expect(evaluate('=PROPER("mary jane watson")')).toBe('Mary Jane Watson');
    });

    test('should handle mixed case', () => {
      expect(evaluate('=PROPER("HeLLo WoRLd")')).toBe('Hello World');
      expect(evaluate('=PROPER("tHe qUiCk bRoWn fOx")')).toBe('The Quick Brown Fox');
    });

    test('should capitalize after non-letter characters', () => {
      expect(evaluate('=PROPER("2-way street")')).toBe('2-Way Street');
      expect(evaluate('=PROPER("alice\'s book")')).toBe('Alice\'S Book');
      expect(evaluate('=PROPER("one|two|three")')).toBe('One|Two|Three');
    });

    test('should handle numbers and symbols', () => {
      expect(evaluate('=PROPER("123abc")')).toBe('123Abc');
      expect(evaluate('=PROPER("test@example.com")')).toBe('Test@Example.Com');
    });

    test('should handle empty string', () => {
      expect(evaluate('=PROPER("")')).toBe('');
    });

    test('should handle single word', () => {
      expect(evaluate('=PROPER("hello")')).toBe('Hello');
      expect(evaluate('=PROPER("WORLD")')).toBe('World');
    });

    test('should handle cell reference', () => {
      setCellValue('A1', 'hello world');
      expect(evaluate('=PROPER(A1)')).toBe('Hello World');
    });
  });

  // ============================================================================
  // CLEAN - Remove non-printable characters
  // ============================================================================

  describe('CLEAN function', () => {
    test('should remove control characters', () => {
      const result = evaluate('=CLEAN(CONCAT("Hello", CHAR(7), "World"))');
      expect(result).toBe('HelloWorld');
    });

    test('should remove line breaks and carriage returns', () => {
      const result = evaluate('=CLEAN(CONCAT("Line1", CHAR(10), "Line2"))');
      expect(result).toBe('Line1Line2');
    });

    test('should remove multiple control characters', () => {
      const result = evaluate('=CLEAN(CONCAT("Text", CHAR(13), CHAR(10), "More"))');
      expect(result).toBe('TextMore');
    });

    test('should preserve spaces and printable characters', () => {
      const result = evaluate('=CLEAN("Hello World!")');
      expect(result).toBe('Hello World!');
    });

    test('should handle empty string', () => {
      expect(evaluate('=CLEAN("")')).toBe('');
    });

    test('should preserve characters 32 and above', () => {
      const result = evaluate('=CLEAN("ABC 123 !@#")');
      expect(result).toBe('ABC 123 !@#');
    });

    test('should handle cell reference', () => {
      setCellValue('A1', 'Hello\x07World'); // Bell character
      expect(evaluate('=CLEAN(A1)')).toBe('HelloWorld');
    });
  });

  // ============================================================================
  // UNICHAR - Unicode character from code point
  // ============================================================================

  describe('UNICHAR function', () => {
    test('should return character for basic ASCII', () => {
      expect(evaluate('=UNICHAR(65)')).toBe('A');
      expect(evaluate('=UNICHAR(97)')).toBe('a');
      expect(evaluate('=UNICHAR(48)')).toBe('0');
    });

    test('should handle special symbols', () => {
      expect(evaluate('=UNICHAR(9733)')).toBe('★');
      expect(evaluate('=UNICHAR(8364)')).toBe('€');
      expect(evaluate('=UNICHAR(169)')).toBe('©');
    });

    test('should handle emoji (surrogate pairs)', () => {
      expect(evaluate('=UNICHAR(128515)')).toBe('😃');
      expect(evaluate('=UNICHAR(128525)')).toBe('😍');
      expect(evaluate('=UNICHAR(127881)')).toBe('🎉');
    });

    test('should return error for negative numbers', () => {
      const result = evaluate('=UNICHAR(-1)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('should return error for numbers above Unicode range', () => {
      const result = evaluate('=UNICHAR(1114112)'); // 0x10FFFF + 1
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('should return error for non-integer', () => {
      const result = evaluate('=UNICHAR(65.5)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('should handle cell reference', () => {
      setCellValue('A1', 9733);
      expect(evaluate('=UNICHAR(A1)')).toBe('★');
    });
  });

  // ============================================================================
  // UNICODE - Get code point of first character
  // ============================================================================

  describe('UNICODE function', () => {
    test('should return code point for basic ASCII', () => {
      expect(evaluate('=UNICODE("A")')).toBe(65);
      expect(evaluate('=UNICODE("a")')).toBe(97);
      expect(evaluate('=UNICODE("0")')).toBe(48);
    });

    test('should return code point for special symbols', () => {
      expect(evaluate('=UNICODE("★")')).toBe(9733);
      expect(evaluate('=UNICODE("€")')).toBe(8364);
      expect(evaluate('=UNICODE("©")')).toBe(169);
    });

    test('should handle emoji (surrogate pairs)', () => {
      expect(evaluate('=UNICODE("😃")')).toBe(128515);
      expect(evaluate('=UNICODE("😍")')).toBe(128525);
      expect(evaluate('=UNICODE("🎉")')).toBe(127881);
    });

    test('should return code for first character only', () => {
      expect(evaluate('=UNICODE("Apple")')).toBe(65);
      expect(evaluate('=UNICODE("€100")')).toBe(8364);
    });

    test('should return error for empty string', () => {
      const result = evaluate('=UNICODE("")');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('should handle cell reference', () => {
      setCellValue('A1', 'Hello');
      expect(evaluate('=UNICODE(A1)')).toBe(72); // 'H'
    });

    test('should be inverse of UNICHAR', () => {
      expect(evaluate('=UNICODE(UNICHAR(9733))')).toBe(9733);
      expect(evaluate('=UNICHAR(UNICODE("★"))')).toBe('★');
    });
  });

  // ============================================================================
  // DOLLAR - Format as currency
  // ============================================================================

  describe('DOLLAR function', () => {
    test('should format positive numbers with default decimals', () => {
      expect(evaluate('=DOLLAR(1234.567)')).toBe('$1,234.57');
      expect(evaluate('=DOLLAR(1000)')).toBe('$1,000.00');
    });

    test('should format with specified decimal places', () => {
      expect(evaluate('=DOLLAR(1234.567, 4)')).toBe('$1,234.5670');
      expect(evaluate('=DOLLAR(1234.567, 1)')).toBe('$1,234.6');
      expect(evaluate('=DOLLAR(1234.567, 0)')).toBe('$1,235');
    });

    test('should format negative numbers with parentheses', () => {
      expect(evaluate('=DOLLAR(-1234.567)')).toBe('($1,234.57)');
      expect(evaluate('=DOLLAR(-1000, 0)')).toBe('($1,000)');
    });

    test('should include thousands separators', () => {
      expect(evaluate('=DOLLAR(1234567.89)')).toBe('$1,234,567.89');
      expect(evaluate('=DOLLAR(1000000)')).toBe('$1,000,000.00');
    });

    test('should handle zero', () => {
      expect(evaluate('=DOLLAR(0)')).toBe('$0.00');
      expect(evaluate('=DOLLAR(0, 4)')).toBe('$0.0000');
    });

    test('should return error for negative decimals', () => {
      const result = evaluate('=DOLLAR(1234, -1)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('should return error for non-integer decimals', () => {
      const result = evaluate('=DOLLAR(1234, 2.5)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('should handle cell references', () => {
      setCellValue('A1', 1234.567);
      expect(evaluate('=DOLLAR(A1)')).toBe('$1,234.57');
    });
  });

  // ============================================================================
  // FIXED - Format number with fixed decimals
  // ============================================================================

  describe('FIXED function', () => {
    test('should format with default settings', () => {
      expect(evaluate('=FIXED(1234.567)')).toBe('1,234.57');
      expect(evaluate('=FIXED(1000)')).toBe('1,000.00');
    });

    test('should format with specified decimal places', () => {
      expect(evaluate('=FIXED(1234.567, 1)')).toBe('1,234.6');
      expect(evaluate('=FIXED(1234.567, 4)')).toBe('1,234.5670');
      expect(evaluate('=FIXED(1234.567, 0)')).toBe('1,235');
    });

    test('should handle negative decimals (round to left)', () => {
      expect(evaluate('=FIXED(1234.567, -1)')).toBe('1,230');
      expect(evaluate('=FIXED(1234.567, -2)')).toBe('1,200');
      expect(evaluate('=FIXED(5678, -3)')).toBe('6,000');
    });

    test('should omit commas when no_commas is TRUE', () => {
      expect(evaluate('=FIXED(1234.567, 1, TRUE)')).toBe('1234.6');
      expect(evaluate('=FIXED(1000, 2, TRUE)')).toBe('1000.00');
    });

    test('should include commas when no_commas is FALSE', () => {
      expect(evaluate('=FIXED(1234.567, 1, FALSE)')).toBe('1,234.6');
    });

    test('should handle negative numbers', () => {
      expect(evaluate('=FIXED(-1234.567)')).toBe('-1,234.57');
      expect(evaluate('=FIXED(-1234.567, 1, TRUE)')).toBe('-1234.6');
    });

    test('should handle zero', () => {
      expect(evaluate('=FIXED(0)')).toBe('0.00');
      expect(evaluate('=FIXED(0, 4)')).toBe('0.0000');
    });

    test('should return error for non-integer decimals', () => {
      const result = evaluate('=FIXED(1234, 2.5)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('should handle cell references', () => {
      setCellValue('A1', 1234.567);
      expect(evaluate('=FIXED(A1, 1)')).toBe('1,234.6');
    });
  });

  // ============================================================================
  // TEXTBEFORE - Extract text before delimiter
  // ============================================================================

  describe('TEXTBEFORE function', () => {
    test('should extract text before first occurrence', () => {
      expect(evaluate('=TEXTBEFORE("Hello-World", "-")')).toBe('Hello');
      expect(evaluate('=TEXTBEFORE("First:Second:Third", ":")')).toBe('First');
    });

    test('should extract text before specified occurrence', () => {
      expect(evaluate('=TEXTBEFORE("A:B:C:D", ":", 2)')).toBe('A:B');
      expect(evaluate('=TEXTBEFORE("A:B:C:D", ":", 3)')).toBe('A:B:C');
    });

    test('should handle negative instance (from end)', () => {
      expect(evaluate('=TEXTBEFORE("A:B:C:D", ":", -1)')).toBe('A:B:C');
      expect(evaluate('=TEXTBEFORE("A:B:C:D", ":", -2)')).toBe('A:B');
    });

    test('should handle email addresses', () => {
      expect(evaluate('=TEXTBEFORE("test@example.com", "@")')).toBe('test');
    });

    test('should handle file paths', () => {
      expect(evaluate('=TEXTBEFORE("folder/subfolder/file.txt", "/")')).toBe('folder');
    });

    test('should return error when delimiter not found', () => {
      const result = evaluate('=TEXTBEFORE("Hello", "-")');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#N/A');
    });

    test('should return full text when match_end is non-zero and delimiter not found', () => {
      expect(evaluate('=TEXTBEFORE("Hello", "-", 1, 0, 1)')).toBe('Hello');
    });

    test('should use if_not_found parameter', () => {
      expect(evaluate('=TEXTBEFORE("Hello", "-", 1, 0, 0, "NotFound")')).toBe('NotFound');
    });

    test('should handle case-insensitive matching', () => {
      expect(evaluate('=TEXTBEFORE("Hello-WORLD", "world", 1, 1)')).toBe('Hello-');
    });

    test('should return error for invalid instance number', () => {
      const result1 = evaluate('=TEXTBEFORE("A:B:C", ":", 0)');
      expect(result1).toBeInstanceOf(Error);
      expect((result1 as Error).message).toBe('#VALUE!');

      const result2 = evaluate('=TEXTBEFORE("A:B:C", ":", 1.5)');
      expect(result2).toBeInstanceOf(Error);
      expect((result2 as Error).message).toBe('#VALUE!');
    });

    test('should handle cell references', () => {
      setCellValue('A1', 'Hello-World');
      expect(evaluate('=TEXTBEFORE(A1, "-")')).toBe('Hello');
    });
  });

  // ============================================================================
  // TEXTAFTER - Extract text after delimiter
  // ============================================================================

  describe('TEXTAFTER function', () => {
    test('should extract text after first occurrence', () => {
      expect(evaluate('=TEXTAFTER("Hello-World", "-")')).toBe('World');
      expect(evaluate('=TEXTAFTER("First:Second:Third", ":")')).toBe('Second:Third');
    });

    test('should extract text after specified occurrence', () => {
      expect(evaluate('=TEXTAFTER("A:B:C:D", ":", 2)')).toBe('C:D');
      expect(evaluate('=TEXTAFTER("A:B:C:D", ":", 3)')).toBe('D');
    });

    test('should handle negative instance (from end)', () => {
      expect(evaluate('=TEXTAFTER("A:B:C:D", ":", -1)')).toBe('D');
      expect(evaluate('=TEXTAFTER("A:B:C:D", ":", -2)')).toBe('C:D');
    });

    test('should handle email addresses', () => {
      expect(evaluate('=TEXTAFTER("user@example.com", "@")')).toBe('example.com');
    });

    test('should handle file paths', () => {
      expect(evaluate('=TEXTAFTER("folder/subfolder/file.txt", "/", -1)')).toBe('file.txt');
    });

    test('should return error when delimiter not found', () => {
      const result = evaluate('=TEXTAFTER("Hello", "-")');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#N/A');
    });

    test('should return full text when match_end is non-zero and delimiter not found', () => {
      expect(evaluate('=TEXTAFTER("Hello", "-", 1, 0, 1)')).toBe('Hello');
    });

    test('should use if_not_found parameter', () => {
      expect(evaluate('=TEXTAFTER("Hello", "-", 1, 0, 0, "NotFound")')).toBe('NotFound');
    });

    test('should handle case-insensitive matching', () => {
      expect(evaluate('=TEXTAFTER("Hello-WORLD", "hello", 1, 1)')).toBe('-WORLD');
    });

    test('should return error for invalid instance number', () => {
      const result1 = evaluate('=TEXTAFTER("A:B:C", ":", 0)');
      expect(result1).toBeInstanceOf(Error);
      expect((result1 as Error).message).toBe('#VALUE!');

      const result2 = evaluate('=TEXTAFTER("A:B:C", ":", 1.5)');
      expect(result2).toBeInstanceOf(Error);
      expect((result2 as Error).message).toBe('#VALUE!');
    });

    test('should handle cell references', () => {
      setCellValue('A1', 'Hello-World');
      expect(evaluate('=TEXTAFTER(A1, "-")')).toBe('World');
    });

    test('should work with TEXTBEFORE for text extraction', () => {
      const email = 'john.doe@company.com';
      setCellValue('A1', email);
      
      // Extract username
      expect(evaluate('=TEXTBEFORE(A1, "@")')).toBe('john.doe');
      
      // Extract domain
      expect(evaluate('=TEXTAFTER(A1, "@")')).toBe('company.com');
    });
  });

  // ============================================================================
  // Integration tests
  // ============================================================================

  describe('Integration tests', () => {
    test('CONCAT with PROPER for name formatting', () => {
      setCellValue('A1', 'john');
      setCellValue('B1', 'doe');
      expect(evaluate('=CONCAT(PROPER(A1), " ", PROPER(B1))')).toBe('John Doe');
    });

    test('UNICHAR and UNICODE are inverses', () => {
      expect(evaluate('=UNICODE(UNICHAR(128515))')).toBe(128515);
      expect(evaluate('=UNICHAR(UNICODE("★"))')).toBe('★');
    });

    test('CLEAN with CONCAT for sanitizing data', () => {
      setCellValue('A1', 'Hello\x07');
      setCellValue('A2', 'World\x1B');
      expect(evaluate('=CONCAT(CLEAN(A1), " ", CLEAN(A2))')).toBe('Hello World');
    });

    test('TEXTBEFORE and TEXTAFTER for parsing', () => {
      setCellValue('A1', 'First-Middle-Last');
      expect(evaluate('=TEXTBEFORE(A1, "-")')).toBe('First');
      expect(evaluate('=TEXTAFTER(TEXTBEFORE(A1, "-", 2), "-")')).toBe('Middle');
      expect(evaluate('=TEXTAFTER(A1, "-", -1)')).toBe('Last');
    });

    test('DOLLAR and FIXED for different formatting needs', () => {
      setCellValue('A1', 1234.567);
      expect(evaluate('=DOLLAR(A1)')).toBe('$1,234.57');
      expect(evaluate('=FIXED(A1, 1)')).toBe('1,234.6');
      expect(evaluate('=FIXED(A1, 1, TRUE)')).toBe('1234.6');
    });
  });
});
