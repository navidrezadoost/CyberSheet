/**
 * formula-syntax-highlighter.ts
 * 
 * Syntax highlighting utilities for Excel formulas
 * Converts tokens to styled segments for rendering
 * 
 * Week 9 Day 2: Syntax Highlighting Implementation
 */

import { tokenizeFormula, Token, TokenType } from './formula-tokenizer';

export interface HighlightedSegment {
  text: string;
  type: TokenType;
  className: string;
  start: number;
  end: number;
  style?: {
    color?: string;
    fontWeight?: string;
    fontStyle?: string;
  };
}

export interface HighlightTheme {
  function: string;
  cell: string;
  range: string;
  number: string;
  string: string;
  operator: string;
  boolean: string;
  error: string;
  comma: string;
  parenthesis: string;
  namedRange: string;
  whitespace?: string;
}

/**
 * Default Excel-like color theme
 */
export const defaultTheme: HighlightTheme = {
  function: '#0066CC',      // Blue
  cell: '#006600',          // Dark Green
  range: '#006600',         // Dark Green
  number: '#9C27B0',        // Purple
  string: '#E65100',        // Orange
  operator: '#616161',      // Gray
  boolean: '#0066CC',       // Blue
  error: '#D32F2F',         // Red
  comma: '#424242',         // Dark Gray
  parenthesis: '#424242',   // Dark Gray
  namedRange: '#00838F',    // Teal
  whitespace: '#000000',    // Black
};

/**
 * VS Code Dark+ inspired theme
 */
export const darkTheme: HighlightTheme = {
  function: '#DCDCAA',      // Yellow
  cell: '#4EC9B0',          // Cyan
  range: '#4EC9B0',         // Cyan
  number: '#B5CEA8',        // Light Green
  string: '#CE9178',        // Orange
  operator: '#D4D4D4',      // White
  boolean: '#569CD6',       // Blue
  error: '#F44747',         // Red
  comma: '#D4D4D4',         // White
  parenthesis: '#FFD700',   // Gold
  namedRange: '#9CDCFE',    // Light Blue
  whitespace: '#D4D4D4',    // White
};

/**
 * Convert token type to CSS class name
 */
function tokenTypeToClassName(type: TokenType): string {
  const classMap: Record<TokenType, string> = {
    'function': 'formula-function',
    'cell': 'formula-cell',
    'range': 'formula-range',
    'number': 'formula-number',
    'string': 'formula-string',
    'operator': 'formula-operator',
    'comma': 'formula-comma',
    'parenthesis': 'formula-parenthesis',
    'error': 'formula-error',
    'whitespace': 'formula-whitespace',
    'boolean': 'formula-boolean',
    'named-range': 'formula-named-range',
  };
  
  return classMap[type] || 'formula-unknown';
}

/**
 * Convert token type to color using theme
 */
function tokenTypeToColor(type: TokenType, theme: HighlightTheme): string {
  const colorMap: Record<TokenType, string> = {
    'function': theme.function,
    'cell': theme.cell,
    'range': theme.range,
    'number': theme.number,
    'string': theme.string,
    'operator': theme.operator,
    'comma': theme.comma,
    'parenthesis': theme.parenthesis,
    'error': theme.error,
    'whitespace': theme.whitespace || '#000000',
    'boolean': theme.boolean,
    'named-range': theme.namedRange,
  };
  
  return colorMap[type] || '#000000';
}

/**
 * Highlight formula syntax
 * 
 * @param formula - The formula to highlight
 * @param theme - Color theme to use (default: Excel-like)
 * @returns Array of highlighted segments with styling information
 * 
 * @example
 * const segments = highlightFormula("=SUM(A1:A10)");
 * segments.forEach(segment => {
 *   console.log(`${segment.text} -> ${segment.style.color}`);
 * });
 */
export function highlightFormula(
  formula: string,
  theme: HighlightTheme = defaultTheme
): HighlightedSegment[] {
  const tokens = tokenizeFormula(formula, { preserveWhitespace: true });
  
  return tokens.map(token => ({
    text: token.value,
    type: token.type,
    className: tokenTypeToClassName(token.type),
    start: token.start,
    end: token.end,
    style: {
      color: tokenTypeToColor(token.type, theme),
      fontWeight: token.type === 'function' || token.type === 'error' ? 'bold' : 'normal',
      fontStyle: token.type === 'error' ? 'italic' : 'normal',
    },
  }));
}

/**
 * Generate inline CSS styles string from segment
 */
export function segmentToInlineStyle(segment: HighlightedSegment): string {
  const styles: string[] = [];
  
  if (segment.style?.color) {
    styles.push(`color: ${segment.style.color}`);
  }
  if (segment.style?.fontWeight && segment.style.fontWeight !== 'normal') {
    styles.push(`font-weight: ${segment.style.fontWeight}`);
  }
  if (segment.style?.fontStyle && segment.style.fontStyle !== 'normal') {
    styles.push(`font-style: ${segment.style.fontStyle}`);
  }
  
  return styles.join('; ');
}

/**
 * Generate CSS classes for syntax highlighting
 * Useful for adding to global stylesheet
 */
export function generateSyntaxHighlightCSS(theme: HighlightTheme = defaultTheme): string {
  return `
/* Formula Syntax Highlighting */
.formula-function {
  color: ${theme.function};
  font-weight: bold;
}

.formula-cell {
  color: ${theme.cell};
}

.formula-range {
  color: ${theme.range};
}

.formula-number {
  color: ${theme.number};
}

.formula-string {
  color: ${theme.string};
}

.formula-operator {
  color: ${theme.operator};
}

.formula-comma {
  color: ${theme.comma};
}

.formula-parenthesis {
  color: ${theme.parenthesis};
}

.formula-boolean {
  color: ${theme.boolean};
}

.formula-named-range {
  color: ${theme.namedRange};
}

.formula-error {
  color: ${theme.error};
  font-weight: bold;
  font-style: italic;
  text-decoration: underline wavy ${theme.error};
}

.formula-whitespace {
  color: ${theme.whitespace || '#000000'};
}
  `.trim();
}

/**
 * Convert highlighted segments to HTML string
 * Useful for rendering in web contexts
 */
export function segmentsToHTML(segments: HighlightedSegment[]): string {
  return segments
    .map(segment => {
      const style = segmentToInlineStyle(segment);
      const text = segment.text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/ /g, '&nbsp;');
      
      return `<span class="${segment.className}" style="${style}">${text}</span>`;
    })
    .join('');
}

/**
 * Convert highlighted segments to React elements structure
 * Returns plain objects that can be used with React.createElement
 */
export function segmentsToReactElements(segments: HighlightedSegment[]): Array<{
  type: 'span';
  props: {
    key: string;
    className: string;
    style: Record<string, string>;
    children: string;
  };
}> {
  return segments.map((segment, idx) => ({
    type: 'span',
    props: {
      key: `segment-${idx}`,
      className: segment.className,
      style: {
        color: segment.style?.color || '',
        fontWeight: segment.style?.fontWeight || '',
        fontStyle: segment.style?.fontStyle || '',
      },
      children: segment.text,
    },
  }));
}

/**
 * Get color for specific position in formula
 * Useful for cursor position highlighting
 */
export function getColorAtPosition(
  formula: string,
  position: number,
  theme: HighlightTheme = defaultTheme
): string | null {
  const segments = highlightFormula(formula, theme);
  
  for (const segment of segments) {
    if (position >= segment.start && position < segment.end) {
      return segment.style?.color || null;
    }
  }
  
  return null;
}

/**
 * Highlight matching parentheses
 * Returns indices of matching parenthesis pair at cursor position
 */
export function findMatchingParenthesis(
  formula: string,
  cursorPosition: number
): { open: number; close: number } | null {
  const tokens = tokenizeFormula(formula);
  
  // Find if cursor is on a parenthesis
  let cursorToken: Token | null = null;
  for (const token of tokens) {
    if (token.type === 'parenthesis' && 
        cursorPosition >= token.start && 
        cursorPosition < token.end) {
      cursorToken = token;
      break;
    }
  }
  
  if (!cursorToken) return null;
  
  const isOpening = cursorToken.value === '(';
  const parenTokens = tokens.filter(t => t.type === 'parenthesis');
  
  if (isOpening) {
    // Find matching closing parenthesis
    let depth = 0;
    for (const token of parenTokens) {
      if (token.start < cursorToken.start) continue;
      
      if (token.value === '(') {
        depth++;
      } else if (token.value === ')') {
        depth--;
        if (depth === 0) {
          return { open: cursorToken.start, close: token.start };
        }
      }
    }
  } else {
    // Find matching opening parenthesis
    let depth = 0;
    for (let i = parenTokens.length - 1; i >= 0; i--) {
      const token = parenTokens[i];
      if (token.start > cursorToken.start) continue;
      
      if (token.value === ')') {
        depth++;
      } else if (token.value === '(') {
        depth--;
        if (depth === 0) {
          return { open: token.start, close: cursorToken.start };
        }
      }
    }
  }
  
  return null;
}
