/**
 * formula-syntax-highlighter.test.ts
 * 
 * Tests for formula syntax highlighting utilities
 * Week 9 Day 2: Syntax Highlighting Implementation
 */

import {
  highlightFormula,
  defaultTheme,
  darkTheme,
  generateSyntaxHighlightCSS,
  segmentsToHTML,
  segmentsToReactElements,
  getColorAtPosition,
  findMatchingParenthesis,
  segmentToInlineStyle,
  HighlightedSegment,
} from '../../src/utils/formula-syntax-highlighter';

describe('FormulaSyntaxHighlighter', () => {
  
  describe('highlightFormula', () => {
    
    test('highlights simple function', () => {
      const segments = highlightFormula('=SUM(A1:A10)');
      
      expect(segments).toHaveLength(4);
      expect(segments[0]).toMatchObject({
        text: 'SUM',
        type: 'function',
        className: 'formula-function',
      });
      expect(segments[0].style?.color).toBe(defaultTheme.function);
      expect(segments[0].style?.fontWeight).toBe('bold');
    });
    
    test('highlights cell references', () => {
      const segments = highlightFormula('=A1+B2');
      
      const cellSegments = segments.filter(s => s.type === 'cell');
      expect(cellSegments).toHaveLength(2);
      expect(cellSegments[0].style?.color).toBe(defaultTheme.cell);
    });
    
    test('highlights numbers', () => {
      const segments = highlightFormula('=123+45.67');
      
      const numberSegments = segments.filter(s => s.type === 'number');
      expect(numberSegments).toHaveLength(2);
      expect(numberSegments[0].style?.color).toBe(defaultTheme.number);
    });
    
    test('highlights strings', () => {
      const segments = highlightFormula('="Hello"');
      
      const stringSegment = segments.find(s => s.type === 'string');
      expect(stringSegment).toBeDefined();
      expect(stringSegment?.style?.color).toBe(defaultTheme.string);
    });
    
    test('highlights operators', () => {
      const segments = highlightFormula('=A1+B2*C3');
      
      const operatorSegments = segments.filter(s => s.type === 'operator');
      expect(operatorSegments).toHaveLength(2);
      expect(operatorSegments[0].style?.color).toBe(defaultTheme.operator);
    });
    
    test('highlights errors', () => {
      const segments = highlightFormula('=SUM(@#$)');
      
      const errorSegments = segments.filter(s => s.type === 'error');
      expect(errorSegments.length).toBeGreaterThan(0);
      expect(errorSegments[0].style?.color).toBe(defaultTheme.error);
      expect(errorSegments[0].style?.fontWeight).toBe('bold');
      expect(errorSegments[0].style?.fontStyle).toBe('italic');
    });
    
    test('highlights booleans', () => {
      const segments = highlightFormula('=IF(TRUE, 1, 0)');
      
      const boolSegment = segments.find(s => s.type === 'boolean');
      expect(boolSegment).toBeDefined();
      expect(boolSegment?.style?.color).toBe(defaultTheme.boolean);
    });
    
    test('highlights ranges', () => {
      const segments = highlightFormula('=SUM(A1:B10)');
      
      const rangeSegment = segments.find(s => s.type === 'range');
      expect(rangeSegment).toBeDefined();
      expect(rangeSegment?.style?.color).toBe(defaultTheme.range);
    });
    
  });
  
  describe('Theme Support', () => {
    
    test('applies default theme', () => {
      const segments = highlightFormula('=SUM(A1)', defaultTheme);
      
      const funcSegment = segments.find(s => s.type === 'function');
      expect(funcSegment?.style?.color).toBe(defaultTheme.function);
    });
    
    test('applies dark theme', () => {
      const segments = highlightFormula('=SUM(A1)', darkTheme);
      
      const funcSegment = segments.find(s => s.type === 'function');
      expect(funcSegment?.style?.color).toBe(darkTheme.function);
    });
    
    test('custom theme colors apply correctly', () => {
      const customTheme = {
        ...defaultTheme,
        function: '#FF0000',
        cell: '#00FF00',
      };
      
      const segments = highlightFormula('=SUM(A1)', customTheme);
      
      expect(segments[0].style?.color).toBe('#FF0000');
      expect(segments[2].style?.color).toBe('#00FF00');
    });
    
  });
  
  describe('segmentToInlineStyle', () => {
    
    test('generates inline style string', () => {
      const segment: HighlightedSegment = {
        text: 'SUM',
        type: 'function',
        className: 'formula-function',
        start: 0,
        end: 3,
        style: {
          color: '#0066CC',
          fontWeight: 'bold',
        },
      };
      
      const style = segmentToInlineStyle(segment);
      
      expect(style).toContain('color: #0066CC');
      expect(style).toContain('font-weight: bold');
    });
    
    test('handles empty styles', () => {
      const segment: HighlightedSegment = {
        text: 'test',
        type: 'operator',
        className: 'formula-operator',
        start: 0,
        end: 1,
      };
      
      const style = segmentToInlineStyle(segment);
      
      expect(style).toBe('');
    });
    
    test('skips normal font weight and style', () => {
      const segment: HighlightedSegment = {
        text: '+',
        type: 'operator',
        className: 'formula-operator',
        start: 0,
        end: 1,
        style: {
          fontWeight: 'normal',
          fontStyle: 'normal',
        },
      };
      
      const style = segmentToInlineStyle(segment);
      
      expect(style).not.toContain('font-weight');
      expect(style).not.toContain('font-style');
    });
    
  });
  
  describe('generateSyntaxHighlightCSS', () => {
    
    test('generates complete CSS', () => {
      const css = generateSyntaxHighlightCSS();
      
      expect(css).toContain('.formula-function');
      expect(css).toContain('.formula-cell');
      expect(css).toContain('.formula-number');
      expect(css).toContain('.formula-string');
      expect(css).toContain('.formula-error');
    });
    
    test('uses theme colors in CSS', () => {
      const css = generateSyntaxHighlightCSS(defaultTheme);
      
      expect(css).toContain(defaultTheme.function);
      expect(css).toContain(defaultTheme.cell);
      expect(css).toContain(defaultTheme.number);
    });
    
    test('generates CSS for dark theme', () => {
      const css = generateSyntaxHighlightCSS(darkTheme);
      
      expect(css).toContain(darkTheme.function);
      expect(css).toContain(darkTheme.cell);
    });
    
  });
  
  describe('segmentsToHTML', () => {
    
    test('converts segments to HTML', () => {
      const segments = highlightFormula('=SUM(A1)');
      const html = segmentsToHTML(segments);
      
      expect(html).toContain('<span');
      expect(html).toContain('formula-function');
      expect(html).toContain('SUM');
    });
    
    test('escapes HTML characters', () => {
      const segments = highlightFormula('=A1<B2');
      const html = segmentsToHTML(segments);
      
      expect(html).toContain('&lt;');
      expect(html).not.toContain('<B2>');
    });
    
    test('converts spaces to nbsp', () => {
      const segments = highlightFormula('= SUM(A1)');
      const html = segmentsToHTML(segments);
      
      expect(html).toContain('&nbsp;');
    });
    
  });
  
  describe('segmentsToReactElements', () => {
    
    test('converts segments to React element structure', () => {
      const segments = highlightFormula('=SUM(A1)');
      const elements = segmentsToReactElements(segments);
      
      expect(elements).toHaveLength(segments.length);
      expect(elements[0].type).toBe('span');
      expect(elements[0].props.className).toBe('formula-function');
      expect(elements[0].props.children).toBe('SUM');
    });
    
    test('includes style properties', () => {
      const segments = highlightFormula('=SUM(A1)');
      const elements = segmentsToReactElements(segments);
      
      expect(elements[0].props.style.color).toBe(defaultTheme.function);
      expect(elements[0].props.style.fontWeight).toBe('bold');
    });
    
    test('generates unique keys', () => {
      const segments = highlightFormula('=A1+A1');
      const elements = segmentsToReactElements(segments);
      
      const keys = elements.map(el => el.props.key);
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(elements.length);
    });
    
  });
  
  describe('getColorAtPosition', () => {
    
    test('returns color at function position', () => {
      const formula = '=SUM(A1)';
      const color = getColorAtPosition(formula, 2); // Position at 'U'
      
      expect(color).toBe(defaultTheme.function);
    });
    
    test('returns color at cell position', () => {
      const formula = '=SUM(A1)';
      const color = getColorAtPosition(formula, 5); // Position at 'A'
      
      expect(color).toBe(defaultTheme.cell);
    });
    
    test('returns null for position outside formula', () => {
      const formula = '=SUM(A1)';
      const color = getColorAtPosition(formula, 100);
      
      expect(color).toBeNull();
    });
    
    test('respects custom theme', () => {
      const customTheme = {
        ...defaultTheme,
        function: '#FF0000',
      };
      
      const formula = '=SUM(A1)';
      const color = getColorAtPosition(formula, 2, customTheme);
      
      expect(color).toBe('#FF0000');
    });
    
  });
  
  describe('findMatchingParenthesis', () => {
    
    test('finds matching closing parenthesis', () => {
      const formula = '=SUM(A1:A10)';
      const match = findMatchingParenthesis(formula, 4); // Position at '('
      
      expect(match).toEqual({ open: 4, close: 11 });
    });
    
    test('finds matching opening parenthesis', () => {
      const formula = '=SUM(A1:A10)';
      const match = findMatchingParenthesis(formula, 11); // Position at ')'
      
      expect(match).toEqual({ open: 4, close: 11 });
    });
    
    test('handles nested parentheses', () => {
      const formula = '=SUM(IF(A1>0, A1, 0))';
      const match = findMatchingParenthesis(formula, 4); // Outer '('
      
      expect(match).toEqual({ open: 4, close: 20 });
    });
    
    test('finds inner nested parentheses', () => {
      const formula = '=SUM(IF(A1>0, A1, 0))';
      const match = findMatchingParenthesis(formula, 7); // Inner '('
      
      expect(match).toEqual({ open: 7, close: 19 });
    });
    
    test('returns null when cursor not on parenthesis', () => {
      const formula = '=SUM(A1)';
      const match = findMatchingParenthesis(formula, 2); // Position at 'U'
      
      expect(match).toBeNull();
    });
    
    test('returns null for unmatched parenthesis', () => {
      const formula = '=SUM(A1';
      const match = findMatchingParenthesis(formula, 4);
      
      expect(match).toBeNull();
    });
    
  });
  
  describe('Complex Formulas', () => {
    
    test('highlights complex nested formula', () => {
      const formula = '=IF(AND(A1>0, B1<10), SUM(C1:C10), AVERAGE(D1:D10))';
      const segments = highlightFormula(formula);
      
      const functions = segments.filter(s => s.type === 'function');
      expect(functions.map(f => f.text)).toEqual(['IF', 'AND', 'SUM', 'AVERAGE']);
    });
    
    test('highlights formula with strings and numbers', () => {
      const formula = '=CONCATENATE("Total: ", SUM(A1:A10), " items")';
      const segments = highlightFormula(formula);
      
      const strings = segments.filter(s => s.type === 'string');
      expect(strings).toHaveLength(2);
      
      const functions = segments.filter(s => s.type === 'function');
      expect(functions).toHaveLength(2);
    });
    
    test('highlights formula with multiple operators', () => {
      const formula = '=(A1+B1)*C1/D1^2';
      const segments = highlightFormula(formula);
      
      const operators = segments.filter(s => s.type === 'operator');
      expect(operators.map(o => o.text)).toEqual(['+', '*', '/', '^']);
    });
    
  });
  
  describe('Whitespace Preservation', () => {
    
    test('preserves whitespace in highlighted output', () => {
      const formula = '= SUM ( A1 : A10 )';
      const segments = highlightFormula(formula);
      
      const whitespaceSegments = segments.filter(s => s.type === 'whitespace');
      expect(whitespaceSegments.length).toBeGreaterThan(0);
    });
    
    test('whitespace has correct styling', () => {
      const formula = '= SUM(A1)';
      const segments = highlightFormula(formula);
      
      const whitespaceSegment = segments.find(s => s.type === 'whitespace');
      expect(whitespaceSegment?.style?.color).toBe(defaultTheme.whitespace);
    });
    
  });
  
  describe('Edge Cases', () => {
    
    test('handles empty formula', () => {
      const segments = highlightFormula('');
      
      expect(segments).toHaveLength(0);
    });
    
    test('handles formula with only =', () => {
      const segments = highlightFormula('=');
      
      expect(segments).toHaveLength(0);
    });
    
    test('handles unclosed string', () => {
      const segments = highlightFormula('="unclosed');
      
      const errorSegment = segments.find(s => s.type === 'error');
      expect(errorSegment).toBeDefined();
    });
    
  });
  
});
