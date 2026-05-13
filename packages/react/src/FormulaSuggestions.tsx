/**
 * FormulaSuggestions.tsx
 * 
 * Autocomplete suggestions for formula editing - displays function names,
 * cell references, and named ranges as the user types.
 */

import React from 'react';
import type { Address } from '@cyber-sheet/core';

export interface Suggestion {
  type: 'function' | 'cell' | 'range';
  value: string;
  description?: string;
  category?: string;
}

export interface FormulaSuggestionsProps {
  /** Current input value in the formula bar */
  input: string;
  /** Cursor position in the input */
  cursorPosition: number;
  /** Callback when a suggestion is selected */
  onSelect: (suggestion: Suggestion) => void;
  /** Whether the suggestions are visible */
  isVisible: boolean;
  /** Currently highlighted suggestion index */
  highlightedIndex: number;
  /** Maximum number of suggestions to show */
  maxSuggestions?: number;
  /** Callback when filtered suggestions count changes */
  onSuggestionsCountChange?: (count: number) => void;
}

// Common Excel functions with descriptions
const EXCEL_FUNCTIONS: Suggestion[] = [
  { type: 'function', value: 'SUM', description: 'Adds all the numbers in a range', category: 'Math' },
  { type: 'function', value: 'AVERAGE', description: 'Returns the average of arguments', category: 'Statistical' },
  { type: 'function', value: 'COUNT', description: 'Counts numbers in a range', category: 'Statistical' },
  { type: 'function', value: 'COUNTA', description: 'Counts non-empty cells', category: 'Statistical' },
  { type: 'function', value: 'MAX', description: 'Returns the maximum value', category: 'Statistical' },
  { type: 'function', value: 'MIN', description: 'Returns the minimum value', category: 'Statistical' },
  { type: 'function', value: 'IF', description: 'Returns one value if true, another if false', category: 'Logical' },
  { type: 'function', value: 'IFERROR', description: 'Returns value if error, otherwise formula result', category: 'Logical' },
  { type: 'function', value: 'AND', description: 'Returns TRUE if all arguments are TRUE', category: 'Logical' },
  { type: 'function', value: 'OR', description: 'Returns TRUE if any argument is TRUE', category: 'Logical' },
  { type: 'function', value: 'NOT', description: 'Reverses the logic of its argument', category: 'Logical' },
  { type: 'function', value: 'VLOOKUP', description: 'Vertical lookup in a table', category: 'Lookup' },
  { type: 'function', value: 'HLOOKUP', description: 'Horizontal lookup in a table', category: 'Lookup' },
  { type: 'function', value: 'INDEX', description: 'Returns a value from a table', category: 'Lookup' },
  { type: 'function', value: 'MATCH', description: 'Finds position of a value in a range', category: 'Lookup' },
  { type: 'function', value: 'CONCATENATE', description: 'Joins text strings', category: 'Text' },
  { type: 'function', value: 'CONCAT', description: 'Joins text strings (newer)', category: 'Text' },
  { type: 'function', value: 'LEFT', description: 'Returns leftmost characters', category: 'Text' },
  { type: 'function', value: 'RIGHT', description: 'Returns rightmost characters', category: 'Text' },
  { type: 'function', value: 'MID', description: 'Returns middle characters', category: 'Text' },
  { type: 'function', value: 'LEN', description: 'Returns length of text', category: 'Text' },
  { type: 'function', value: 'UPPER', description: 'Converts text to uppercase', category: 'Text' },
  { type: 'function', value: 'LOWER', description: 'Converts text to lowercase', category: 'Text' },
  { type: 'function', value: 'TRIM', description: 'Removes extra spaces', category: 'Text' },
  { type: 'function', value: 'TEXT', description: 'Formats a number as text', category: 'Text' },
  { type: 'function', value: 'VALUE', description: 'Converts text to number', category: 'Text' },
  { type: 'function', value: 'DATE', description: 'Creates a date value', category: 'Date' },
  { type: 'function', value: 'TODAY', description: 'Returns current date', category: 'Date' },
  { type: 'function', value: 'NOW', description: 'Returns current date and time', category: 'Date' },
  { type: 'function', value: 'YEAR', description: 'Returns the year of a date', category: 'Date' },
  { type: 'function', value: 'MONTH', description: 'Returns the month of a date', category: 'Date' },
  { type: 'function', value: 'DAY', description: 'Returns the day of a date', category: 'Date' },
  { type: 'function', value: 'ROUND', description: 'Rounds a number', category: 'Math' },
  { type: 'function', value: 'ROUNDUP', description: 'Rounds up', category: 'Math' },
  { type: 'function', value: 'ROUNDDOWN', description: 'Rounds down', category: 'Math' },
  { type: 'function', value: 'ABS', description: 'Returns absolute value', category: 'Math' },
  { type: 'function', value: 'SQRT', description: 'Returns square root', category: 'Math' },
  { type: 'function', value: 'POWER', description: 'Returns number raised to power', category: 'Math' },
  { type: 'function', value: 'MOD', description: 'Returns remainder after division', category: 'Math' },
  { type: 'function', value: 'SUMIF', description: 'Sums cells that meet criteria', category: 'Math' },
  { type: 'function', value: 'SUMIFS', description: 'Sums cells that meet multiple criteria', category: 'Math' },
  { type: 'function', value: 'COUNTIF', description: 'Counts cells that meet criteria', category: 'Statistical' },
  { type: 'function', value: 'COUNTIFS', description: 'Counts cells that meet multiple criteria', category: 'Statistical' },
  { type: 'function', value: 'AVERAGEIF', description: 'Averages cells that meet criteria', category: 'Statistical' },
  { type: 'function', value: 'AVERAGEIFS', description: 'Averages cells that meet multiple criteria', category: 'Statistical' },
];

/**
 * Converts column number to letter (1 -> A, 2 -> B, etc.)
 */
function colToLetter(col: number): string {
  let letter = '';
  while (col > 0) {
    const mod = (col - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    col = Math.floor((col - 1) / 26);
  }
  return letter;
}

/**
 * Generate cell reference suggestions (A1, B2, etc.)
 */
function generateCellSuggestions(maxRows = 100, maxCols = 26): Suggestion[] {
  const suggestions: Suggestion[] = [];
  
  // Add some common cell references
  for (let col = 1; col <= Math.min(maxCols, 10); col++) {
    for (let row = 1; row <= Math.min(maxRows, 20); row++) {
      suggestions.push({
        type: 'cell',
        value: `${colToLetter(col)}${row}`,
        description: `Cell ${colToLetter(col)}${row}`,
      });
    }
  }
  
  return suggestions;
}

/**
 * Extract the current token being typed (for autocomplete context)
 */
function getCurrentToken(input: string, cursorPosition: number): string {
  // Find the start of the current token
  let start = cursorPosition - 1;
  while (start >= 0 && /[A-Za-z0-9_]/.test(input[start])) {
    start--;
  }
  start++;
  
  return input.substring(start, cursorPosition).toUpperCase();
}

/**
 * Get filtered suggestions based on input and cursor position
 * Exported for use in parent components
 */
export function getFilteredSuggestions(
  input: string,
  cursorPosition: number,
  maxSuggestions: number = 10
): Suggestion[] {
  const currentToken = getCurrentToken(input, cursorPosition);
  
  if (!currentToken) {
    return [];
  }
  
  // Combine all suggestion sources
  const allSuggestions = [
    ...EXCEL_FUNCTIONS,
    ...generateCellSuggestions(),
  ];
  
  // Filter by current token
  const filtered = allSuggestions.filter((suggestion) => {
    return suggestion.value.startsWith(currentToken);
  });
  
  // Sort by relevance (exact match first, then alphabetically)
  filtered.sort((a, b) => {
    if (a.value === currentToken) return -1;
    if (b.value === currentToken) return 1;
    return a.value.localeCompare(b.value);
  });
  
  return filtered.slice(0, maxSuggestions);
}

/**
 * FormulaSuggestions Component
 */
export const FormulaSuggestions: React.FC<FormulaSuggestionsProps> = ({
  input,
  cursorPosition,
  onSelect,
  isVisible,
  highlightedIndex,
  maxSuggestions = 10,
  onSuggestionsCountChange,
}) => {
  // Get filtered suggestions
  const filteredSuggestions = getFilteredSuggestions(input, cursorPosition, maxSuggestions);

  // Notify parent of suggestions count change
  React.useEffect(() => {
    onSuggestionsCountChange?.(filteredSuggestions.length);
  }, [filteredSuggestions.length, onSuggestionsCountChange]);

  if (!isVisible || filteredSuggestions.length === 0) {
    return null;
  }

  return (
    <div
      className="formula-suggestions"
      style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        backgroundColor: 'white',
        border: '1px solid #d0d0d0',
        borderTop: 'none',
        maxHeight: '300px',
        overflowY: 'auto',
        boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
        zIndex: 1000,
      }}
    >
      {filteredSuggestions.map((suggestion: Suggestion, index: number) => (
        <div
          key={`${suggestion.type}-${suggestion.value}`}
          onMouseDown={(e: React.MouseEvent) => {
            // Prevent input blur when clicking suggestion
            e.preventDefault();
          }}
          onClick={() => onSelect(suggestion)}
          style={{
            padding: '8px 12px',
            cursor: 'pointer',
            backgroundColor: index === highlightedIndex ? '#e8f0fe' : 'white',
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
          onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
            (e.target as HTMLDivElement).style.backgroundColor = '#e8f0fe';
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
            if (index !== highlightedIndex) {
              (e.target as HTMLDivElement).style.backgroundColor = 'white';
            }
          }}
        >
          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: suggestion.type === 'function' ? '#4285f4' : '#34a853',
              color: 'white',
              fontSize: '12px',
              fontWeight: 'bold',
              flexShrink: 0,
            }}
          >
            {suggestion.type === 'function' ? 'ƒx' : 'C'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 500, fontSize: '13px', color: '#202124' }}>
              {suggestion.value}
              {suggestion.type === 'function' && '()'}
            </div>
            {suggestion.description && (
              <div style={{ fontSize: '11px', color: '#5f6368', marginTop: '2px' }}>
                {suggestion.description}
              </div>
            )}
          </div>
          {suggestion.category && (
            <div
              style={{
                fontSize: '10px',
                color: '#5f6368',
                backgroundColor: '#f1f3f4',
                padding: '2px 6px',
                borderRadius: '4px',
                flexShrink: 0,
              }}
            >
              {suggestion.category}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
