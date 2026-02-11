/**
 * formula-tokenizer.ts
 * 
 * Tokenizer for Excel-style formulas
 * Breaks formulas into tokens for syntax highlighting and analysis
 * 
 * Week 9 Day 2: Syntax Highlighting Implementation
 */

export type TokenType = 
  | 'function'
  | 'cell'
  | 'range'
  | 'number'
  | 'string'
  | 'operator'
  | 'comma'
  | 'parenthesis'
  | 'error'
  | 'whitespace'
  | 'boolean'
  | 'named-range';

export interface Token {
  type: TokenType;
  value: string;
  start: number;
  end: number;
  raw?: string; // Original text including quotes for strings
}

export interface TokenizerOptions {
  preserveWhitespace?: boolean;
  captureErrors?: boolean;
}

/**
 * Tokenize an Excel formula into constituent parts
 * 
 * @param formula - The formula string (with or without leading =)
 * @param options - Tokenizer options
 * @returns Array of tokens
 * 
 * @example
 * tokenizeFormula("=SUM(A1:A10, 5)")
 * // Returns:
 * // [
 * //   { type: 'function', value: 'SUM', start: 1, end: 4 },
 * //   { type: 'parenthesis', value: '(', start: 4, end: 5 },
 * //   { type: 'range', value: 'A1:A10', start: 5, end: 11 },
 * //   { type: 'comma', value: ',', start: 11, end: 12 },
 * //   { type: 'number', value: '5', start: 13, end: 14 },
 * //   { type: 'parenthesis', value: ')', start: 14, end: 15 }
 * // ]
 */
export function tokenizeFormula(
  formula: string,
  options: TokenizerOptions = {}
): Token[] {
  const { preserveWhitespace = false, captureErrors = true } = options;
  const tokens: Token[] = [];
  
  // Strip leading = if present
  let input = formula;
  let offset = 0;
  if (input.startsWith('=')) {
    input = input.slice(1);
    offset = 1;
  }
  
  let i = 0;
  
  while (i < input.length) {
    const char = input[i];
    
    // Whitespace
    if (/\s/.test(char)) {
      if (preserveWhitespace) {
        let value = '';
        const start = i;
        while (i < input.length && /\s/.test(input[i])) {
          value += input[i];
          i++;
        }
        tokens.push({ 
          type: 'whitespace', 
          value, 
          start: start + offset, 
          end: i + offset 
        });
      } else {
        i++;
      }
      continue;
    }
    
    // String literals (double quotes)
    if (char === '"') {
      const start = i;
      i++; // Skip opening quote
      let value = '';
      let escaped = false;
      
      while (i < input.length) {
        if (input[i] === '"' && !escaped) {
          // Check for escaped quote ("")
          if (input[i + 1] === '"') {
            value += '"';
            i += 2;
            continue;
          }
          break; // End of string
        }
        value += input[i];
        i++;
      }
      
      if (i < input.length && input[i] === '"') {
        i++; // Skip closing quote
        tokens.push({ 
          type: 'string', 
          value, 
          start: start + offset, 
          end: i + offset,
          raw: input.slice(start, i)
        });
      } else if (captureErrors) {
        // Unclosed string
        tokens.push({ 
          type: 'error', 
          value: '"' + value, 
          start: start + offset, 
          end: i + offset 
        });
      }
      continue;
    }
    
    // Function names, cell references, named ranges, booleans
    if (/[A-Za-z_]/.test(char)) {
      let value = '';
      const start = i;
      
      // Capture alphanumeric and underscores (for function names and named ranges)
      while (i < input.length && /[A-Za-z0-9_.]/.test(input[i])) {
        value += input[i];
        i++;
      }
      
      const upperValue = value.toUpperCase();
      
      // Check for boolean literals
      if (upperValue === 'TRUE' || upperValue === 'FALSE') {
        tokens.push({ 
          type: 'boolean', 
          value: upperValue, 
          start: start + offset, 
          end: i + offset 
        });
        continue;
      }
      
      // Check for cell reference (A1, B2, AA10, etc.) or range (A1:B10)
      const cellRefPattern = /^[A-Z]{1,3}[0-9]+$/;
      const isLikelyCell = cellRefPattern.test(upperValue);
      
      // Look ahead for range operator (:)
      if (isLikelyCell && i < input.length && input[i] === ':') {
        // This is the start of a range
        value += ':';
        i++; // Skip the :
        
        // Capture the end cell
        while (i < input.length && /[A-Za-z0-9]/.test(input[i])) {
          value += input[i];
          i++;
        }
        
        tokens.push({ 
          type: 'range', 
          value: value.toUpperCase(), 
          start: start + offset, 
          end: i + offset 
        });
        continue;
      }
      
      // Check if it's a cell reference
      if (isLikelyCell) {
        tokens.push({ 
          type: 'cell', 
          value: upperValue, 
          start: start + offset, 
          end: i + offset 
        });
        continue;
      }
      
      // Check if followed by opening parenthesis (function)
      let j = i;
      while (j < input.length && /\s/.test(input[j])) j++; // Skip whitespace
      
      if (j < input.length && input[j] === '(') {
        tokens.push({ 
          type: 'function', 
          value: upperValue, 
          start: start + offset, 
          end: i + offset 
        });
        continue;
      }
      
      // Otherwise, treat as named range
      tokens.push({ 
        type: 'named-range', 
        value: upperValue, 
        start: start + offset, 
        end: i + offset 
      });
      continue;
    }
    
    // Numbers (including decimals and scientific notation)
    if (/[0-9.]/.test(char)) {
      let value = '';
      const start = i;
      let hasDecimal = false;
      
      while (i < input.length) {
        const c = input[i];
        
        if (c === '.') {
          if (hasDecimal) break; // Second decimal point
          hasDecimal = true;
          value += c;
          i++;
        } else if (/[0-9]/.test(c)) {
          value += c;
          i++;
        } else if (c.toLowerCase() === 'e' && i + 1 < input.length) {
          // Scientific notation
          value += c;
          i++;
          if (input[i] === '+' || input[i] === '-') {
            value += input[i];
            i++;
          }
        } else {
          break;
        }
      }
      
      tokens.push({ 
        type: 'number', 
        value, 
        start: start + offset, 
        end: i + offset 
      });
      continue;
    }
    
    // Operators and punctuation
    if ('+-*/^=<>!&%'.includes(char)) {
      const start = i;
      let value = char;
      i++;
      
      // Handle multi-character operators (<=, >=, <>, !=)
      if (i < input.length) {
        const nextChar = input[i];
        if (
          (char === '<' && (nextChar === '=' || nextChar === '>')) ||
          (char === '>' && nextChar === '=') ||
          (char === '!' && nextChar === '=')
        ) {
          value += nextChar;
          i++;
        }
      }
      
      tokens.push({ 
        type: 'operator', 
        value, 
        start: start + offset, 
        end: i + offset 
      });
      continue;
    }
    
    // Comma
    if (char === ',') {
      tokens.push({ 
        type: 'comma', 
        value: ',', 
        start: i + offset, 
        end: i + 1 + offset 
      });
      i++;
      continue;
    }
    
    // Parentheses
    if (char === '(' || char === ')') {
      tokens.push({ 
        type: 'parenthesis', 
        value: char, 
        start: i + offset, 
        end: i + 1 + offset 
      });
      i++;
      continue;
    }
    
    // Colon (for ranges not caught earlier)
    if (char === ':') {
      tokens.push({ 
        type: 'operator', 
        value: ':', 
        start: i + offset, 
        end: i + 1 + offset 
      });
      i++;
      continue;
    }
    
    // Unrecognized character
    if (captureErrors) {
      tokens.push({ 
        type: 'error', 
        value: char, 
        start: i + offset, 
        end: i + 1 + offset 
      });
    }
    i++;
  }
  
  return tokens;
}

/**
 * Get token at specific position in formula
 */
export function getTokenAtPosition(
  formula: string, 
  position: number
): Token | null {
  const tokens = tokenizeFormula(formula);
  
  for (const token of tokens) {
    if (position >= token.start && position < token.end) {
      return token;
    }
  }
  
  return null;
}

/**
 * Get all tokens of a specific type
 */
export function getTokensByType(
  formula: string, 
  type: TokenType | TokenType[]
): Token[] {
  const tokens = tokenizeFormula(formula);
  const types = Array.isArray(type) ? type : [type];
  
  return tokens.filter(token => types.includes(token.type));
}

/**
 * Validate formula syntax (basic check)
 */
export function validateFormulaSyntax(formula: string): {
  valid: boolean;
  errors: string[];
} {
  const tokens = tokenizeFormula(formula, { captureErrors: true });
  const errors: string[] = [];
  
  // Check for error tokens
  const errorTokens = tokens.filter(t => t.type === 'error');
  if (errorTokens.length > 0) {
    errors.push(`Invalid characters: ${errorTokens.map(t => t.value).join(', ')}`);
  }
  
  // Check parentheses balance
  let parenCount = 0;
  for (const token of tokens) {
    if (token.type === 'parenthesis') {
      parenCount += token.value === '(' ? 1 : -1;
      if (parenCount < 0) {
        errors.push('Unmatched closing parenthesis');
        break;
      }
    }
  }
  if (parenCount > 0) {
    errors.push('Unmatched opening parenthesis');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
