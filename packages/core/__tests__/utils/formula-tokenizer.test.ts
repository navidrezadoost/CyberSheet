/**
 * formula-tokenizer.test.ts
 * 
 * Comprehensive tests for formula tokenization
 * Week 9 Day 2: Syntax Highlighting Implementation
 */

import { 
  tokenizeFormula, 
  getTokenAtPosition, 
  getTokensByType, 
  validateFormulaSyntax,
  Token,
  TokenType
} from '../../src/utils/formula-tokenizer';

describe('FormulaTokenizer', () => {
  
  describe('Basic Tokenization', () => {
    
    test('tokenizes simple function call', () => {
      const tokens = tokenizeFormula('=SUM(A1:A10)');
      
      expect(tokens).toHaveLength(4);
      expect(tokens[0]).toMatchObject({ type: 'function', value: 'SUM' });
      expect(tokens[1]).toMatchObject({ type: 'parenthesis', value: '(' });
      expect(tokens[2]).toMatchObject({ type: 'range', value: 'A1:A10' });
      expect(tokens[3]).toMatchObject({ type: 'parenthesis', value: ')' });
    });
    
    test('tokenizes arithmetic expression', () => {
      const tokens = tokenizeFormula('=A1+B2*C3');
      
      expect(tokens).toHaveLength(5);
      expect(tokens[0]).toMatchObject({ type: 'cell', value: 'A1' });
      expect(tokens[1]).toMatchObject({ type: 'operator', value: '+' });
      expect(tokens[2]).toMatchObject({ type: 'cell', value: 'B2' });
      expect(tokens[3]).toMatchObject({ type: 'operator', value: '*' });
      expect(tokens[4]).toMatchObject({ type: 'cell', value: 'C3' });
    });
    
    test('tokenizes numbers', () => {
      const tokens = tokenizeFormula('=123+45.67');
      
      expect(tokens).toHaveLength(3);
      expect(tokens[0]).toMatchObject({ type: 'number', value: '123' });
      expect(tokens[1]).toMatchObject({ type: 'operator', value: '+' });
      expect(tokens[2]).toMatchObject({ type: 'number', value: '45.67' });
    });
    
    test('tokenizes string literals', () => {
      const tokens = tokenizeFormula('=CONCATENATE("Hello", "World")');
      
      const stringTokens = tokens.filter(t => t.type === 'string');
      expect(stringTokens).toHaveLength(2);
      expect(stringTokens[0].value).toBe('Hello');
      expect(stringTokens[1].value).toBe('World');
    });
    
    test('handles formula without leading =', () => {
      const tokens = tokenizeFormula('SUM(A1:A10)');
      
      expect(tokens[0]).toMatchObject({ type: 'function', value: 'SUM' });
    });
    
  });
  
  describe('Cell References and Ranges', () => {
    
    test('tokenizes single cell reference', () => {
      const tokens = tokenizeFormula('=A1');
      
      expect(tokens).toHaveLength(1);
      expect(tokens[0]).toMatchObject({ type: 'cell', value: 'A1' });
    });
    
    test('tokenizes range reference', () => {
      const tokens = tokenizeFormula('=A1:B10');
      
      expect(tokens).toHaveLength(1);
      expect(tokens[0]).toMatchObject({ type: 'range', value: 'A1:B10' });
    });
    
    test('tokenizes multi-column range', () => {
      const tokens = tokenizeFormula('=AA1:ZZ100');
      
      expect(tokens).toHaveLength(1);
      expect(tokens[0]).toMatchObject({ type: 'range', value: 'AA1:ZZ100' });
    });
    
    test('distinguishes cell from function name', () => {
      const tokens = tokenizeFormula('=A1+SUM(B1:B10)');
      
      expect(tokens[0]).toMatchObject({ type: 'cell', value: 'A1' });
      expect(tokens[2]).toMatchObject({ type: 'function', value: 'SUM' });
    });
    
  });
  
  describe('Functions', () => {
    
    test('tokenizes nested functions', () => {
      const tokens = tokenizeFormula('=SUM(IF(A1>0, A1, 0))');
      
      const functionTokens = tokens.filter(t => t.type === 'function');
      expect(functionTokens).toHaveLength(2);
      expect(functionTokens[0].value).toBe('SUM');
      expect(functionTokens[1].value).toBe('IF');
    });
    
    test('tokenizes function with multiple arguments', () => {
      const tokens = tokenizeFormula('=VLOOKUP(A1, B1:C10, 2, FALSE)');
      
      expect(tokens[0]).toMatchObject({ type: 'function', value: 'VLOOKUP' });
      expect(tokens.filter(t => t.type === 'comma')).toHaveLength(3);
    });
    
    test('handles function names with dots (namespaced)', () => {
      const tokens = tokenizeFormula('=MATH.FLOOR(5.7)');
      
      expect(tokens[0]).toMatchObject({ type: 'function', value: 'MATH.FLOOR' });
    });
    
  });
  
  describe('Operators', () => {
    
    test('tokenizes arithmetic operators', () => {
      const tokens = tokenizeFormula('=1+2-3*4/5^6');
      
      const operators = tokens.filter(t => t.type === 'operator');
      expect(operators.map(t => t.value)).toEqual(['+', '-', '*', '/', '^']);
    });
    
    test('tokenizes comparison operators', () => {
      const tokens = tokenizeFormula('=A1>B1');
      
      expect(tokens[1]).toMatchObject({ type: 'operator', value: '>' });
    });
    
    test('tokenizes multi-character operators', () => {
      const tokens = tokenizeFormula('=A1<=B1');
      
      expect(tokens[1]).toMatchObject({ type: 'operator', value: '<=' });
    });
    
    test('tokenizes not-equal operators', () => {
      const tokens1 = tokenizeFormula('=A1<>B1');
      const tokens2 = tokenizeFormula('=A1!=B1');
      
      expect(tokens1[1]).toMatchObject({ type: 'operator', value: '<>' });
      expect(tokens2[1]).toMatchObject({ type: 'operator', value: '!=' });
    });
    
  });
  
  describe('String Handling', () => {
    
    test('handles empty string', () => {
      const tokens = tokenizeFormula('=""');
      
      expect(tokens).toHaveLength(1);
      expect(tokens[0]).toMatchObject({ type: 'string', value: '' });
    });
    
    test('handles escaped quotes in strings', () => {
      const tokens = tokenizeFormula('="He said ""Hello"""');
      
      expect(tokens).toHaveLength(1);
      expect(tokens[0]).toMatchObject({ type: 'string', value: 'He said "Hello"' });
    });
    
    test('handles unclosed string as error', () => {
      const tokens = tokenizeFormula('="unclosed', { captureErrors: true });
      
      expect(tokens[0]).toMatchObject({ type: 'error' });
    });
    
    test('preserves raw string including quotes', () => {
      const tokens = tokenizeFormula('="test"');
      
      expect(tokens[0].raw).toBe('"test"');
    });
    
  });
  
  describe('Whitespace Handling', () => {
    
    test('ignores whitespace by default', () => {
      const tokens = tokenizeFormula('= SUM ( A1 : A10 )');
      
      expect(tokens.every(t => t.type !== 'whitespace')).toBe(true);
    });
    
    test('preserves whitespace when requested', () => {
      const tokens = tokenizeFormula('= SUM(A1)', { preserveWhitespace: true });
      
      const whitespaceTokens = tokens.filter(t => t.type === 'whitespace');
      expect(whitespaceTokens.length).toBeGreaterThan(0);
    });
    
  });
  
  describe('Boolean Literals', () => {
    
    test('tokenizes TRUE', () => {
      const tokens = tokenizeFormula('=TRUE');
      
      expect(tokens).toHaveLength(1);
      expect(tokens[0]).toMatchObject({ type: 'boolean', value: 'TRUE' });
    });
    
    test('tokenizes FALSE', () => {
      const tokens = tokenizeFormula('=FALSE');
      
      expect(tokens).toHaveLength(1);
      expect(tokens[0]).toMatchObject({ type: 'boolean', value: 'FALSE' });
    });
    
    test('case insensitive boolean detection', () => {
      const tokens = tokenizeFormula('=true');
      
      expect(tokens[0]).toMatchObject({ type: 'boolean', value: 'TRUE' });
    });
    
  });
  
  describe('Named Ranges', () => {
    
    test('identifies potential named range', () => {
      const tokens = tokenizeFormula('=MyRange+5');
      
      expect(tokens[0]).toMatchObject({ type: 'named-range', value: 'MYRANGE' });
    });
    
    test('distinguishes named range from function', () => {
      const tokens = tokenizeFormula('=MyRange');
      
      expect(tokens[0].type).toBe('named-range');
    });
    
  });
  
  describe('Scientific Notation', () => {
    
    test('tokenizes scientific notation', () => {
      const tokens = tokenizeFormula('=1.5e10');
      
      expect(tokens).toHaveLength(1);
      expect(tokens[0]).toMatchObject({ type: 'number', value: '1.5e10' });
    });
    
    test('tokenizes scientific notation with negative exponent', () => {
      const tokens = tokenizeFormula('=3.14e-5');
      
      expect(tokens).toHaveLength(1);
      expect(tokens[0]).toMatchObject({ type: 'number', value: '3.14e-5' });
    });
    
  });
  
  describe('Token Positions', () => {
    
    test('tracks correct start and end positions', () => {
      const formula = '=SUM(A1)';
      const tokens = tokenizeFormula(formula);
      
      expect(tokens[0]).toMatchObject({ start: 1, end: 4 }); // SUM
      expect(tokens[1]).toMatchObject({ start: 4, end: 5 }); // (
      expect(tokens[2]).toMatchObject({ start: 5, end: 7 }); // A1
      expect(tokens[3]).toMatchObject({ start: 7, end: 8 }); // )
    });
    
    test('positions account for leading =', () => {
      const formula = '=A1';
      const tokens = tokenizeFormula(formula);
      
      expect(tokens[0]).toMatchObject({ start: 1, end: 3 });
    });
    
  });
  
  describe('Complex Formulas', () => {
    
    test('tokenizes complex nested formula', () => {
      const formula = '=IF(AND(A1>0, B1<10), SUM(C1:C10), AVERAGE(D1:D10))';
      const tokens = tokenizeFormula(formula);
      
      const functionTokens = tokens.filter(t => t.type === 'function');
      expect(functionTokens.map(t => t.value)).toEqual(['IF', 'AND', 'SUM', 'AVERAGE']);
    });
    
    test('tokenizes array formula', () => {
      const formula = '=SUM(IF(A1:A10>5, A1:A10, 0))';
      const tokens = tokenizeFormula(formula);
      
      expect(tokens.filter(t => t.type === 'function')).toHaveLength(2);
      expect(tokens.filter(t => t.type === 'range')).toHaveLength(2);
    });
    
    test('tokenizes VLOOKUP with complex arguments', () => {
      const formula = '=VLOOKUP(A2, Sheet2!B1:D10, 3, FALSE)';
      const tokens = tokenizeFormula(formula);
      
      expect(tokens[0]).toMatchObject({ type: 'function', value: 'VLOOKUP' });
      // Note: Sheet2!B1:D10 handling may need enhancement
    });
    
  });
  
  describe('getTokenAtPosition', () => {
    
    test('finds token at specific position', () => {
      const formula = '=SUM(A1:A10)';
      const token = getTokenAtPosition(formula, 2); // Position at 'U' in SUM
      
      expect(token).toMatchObject({ type: 'function', value: 'SUM' });
    });
    
    test('returns null for position outside tokens', () => {
      const formula = '=SUM(A1)';
      const token = getTokenAtPosition(formula, 100);
      
      expect(token).toBeNull();
    });
    
  });
  
  describe('getTokensByType', () => {
    
    test('filters tokens by single type', () => {
      const formula = '=SUM(A1:A10) + AVERAGE(B1:B10)';
      const functions = getTokensByType(formula, 'function');
      
      expect(functions).toHaveLength(2);
      expect(functions.map(t => t.value)).toEqual(['SUM', 'AVERAGE']);
    });
    
    test('filters tokens by multiple types', () => {
      const formula = '=A1+B2';
      const refs = getTokensByType(formula, ['cell', 'range']);
      
      expect(refs).toHaveLength(2);
      expect(refs.map(t => t.value)).toEqual(['A1', 'B2']);
    });
    
  });
  
  describe('validateFormulaSyntax', () => {
    
    test('validates correct formula', () => {
      const result = validateFormulaSyntax('=SUM(A1:A10)');
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    test('detects unmatched opening parenthesis', () => {
      const result = validateFormulaSyntax('=SUM(A1:A10');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Unmatched opening parenthesis');
    });
    
    test('detects unmatched closing parenthesis', () => {
      const result = validateFormulaSyntax('=SUM(A1:A10))');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Unmatched closing parenthesis');
    });
    
    test('detects invalid characters', () => {
      const result = validateFormulaSyntax('=SUM(@#$)');
      
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Invalid characters');
    });
    
  });
  
  describe('Edge Cases', () => {
    
    test('handles empty formula', () => {
      const tokens = tokenizeFormula('');
      
      expect(tokens).toHaveLength(0);
    });
    
    test('handles formula with only =', () => {
      const tokens = tokenizeFormula('=');
      
      expect(tokens).toHaveLength(0);
    });
    
    test('handles very long cell reference', () => {
      const tokens = tokenizeFormula('=AAA999');
      
      expect(tokens[0]).toMatchObject({ type: 'cell', value: 'AAA999' });
    });
    
    test('handles multiple dots in number', () => {
      const tokens = tokenizeFormula('=1.2.3');
      
      // Should tokenize as two separate numbers
      expect(tokens).toHaveLength(2);
      expect(tokens[0]).toMatchObject({ type: 'number', value: '1.2' });
    });
    
  });
  
});
