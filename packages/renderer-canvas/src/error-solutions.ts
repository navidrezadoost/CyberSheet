/**
 * Error Solutions Module
 * 
 * Provides intelligent error messages and suggested solutions for formula errors.
 * Includes Levenshtein distance for function name typo detection.
 * 
 * Week 9 Day 3: Error Highlighting + Interactive Tooltips
 */

import { ExcelErrorType } from './error-highlighter';

/**
 * Error solution information
 */
export interface ErrorSolution {
  /** The error type (e.g., "#DIV/0!") */
  errorType: ExcelErrorType | string;
  /** User-friendly explanation of the error */
  message: string;
  /** Actionable suggestion to fix the error */
  suggestion: string;
  /** Optional documentation link */
  docLink?: string;
}

/**
 * Default error solutions for each Excel error type
 */
export const ERROR_SOLUTIONS: Record<string, ErrorSolution> = {
  '#DIV/0!': {
    errorType: '#DIV/0!',
    message: 'Division by zero error',
    suggestion: 'Check that the denominator is not zero. Consider using IFERROR() to handle the error gracefully.',
    docLink: 'https://support.microsoft.com/en-us/office/div-0-error-3a5a18a9-8d80-4ebb-a908-39e759a009a5',
  },
  
  '#N/A': {
    errorType: '#N/A',
    message: 'Value not available',
    suggestion: 'The value you\'re looking for wasn\'t found. Check your lookup range and search criteria. Use IFNA() to provide a fallback value.',
    docLink: 'https://support.microsoft.com/en-us/office/n-a-error-5469c31c-9d98-44b4-89e2-04d1a90e8f94',
  },
  
  '#NAME?': {
    errorType: '#NAME?',
    message: 'Unrecognized function or name',
    suggestion: 'Excel doesn\'t recognize this function name. Check the spelling or verify that the function is available.',
    docLink: 'https://support.microsoft.com/en-us/office/name-error-b6d54e31-a743-4d7d-9b61-40002a7b4286',
  },
  
  '#NULL!': {
    errorType: '#NULL!',
    message: 'Null intersection error',
    suggestion: 'The formula refers to an intersection of two ranges that don\'t intersect. Check cell range references and the space operator.',
    docLink: 'https://support.microsoft.com/en-us/office/null-error-5f1c59c7-d343-4c37-b7c7-6be18b6b5c87',
  },
  
  '#NUM!': {
    errorType: '#NUM!',
    message: 'Invalid numeric value',
    suggestion: 'A numeric value is invalid or out of range. Check that numbers are within valid limits and formulas use correct syntax.',
    docLink: 'https://support.microsoft.com/en-us/office/num-error-4d64c4f3-d5d7-4b42-82ed-6f15360a5a5e',
  },
  
  '#REF!': {
    errorType: '#REF!',
    message: 'Invalid cell reference',
    suggestion: 'The formula refers to cells that don\'t exist or have been deleted. Update the cell references to point to valid cells.',
    docLink: 'https://support.microsoft.com/en-us/office/ref-error-4bb4a835-fb00-4f6f-9f51-837d54f7a41d',
  },
  
  '#VALUE!': {
    errorType: '#VALUE!',
    message: 'Wrong data type',
    suggestion: 'An argument is the wrong type. Check that text is in quotes, dates are properly formatted, and functions receive the correct data types.',
    docLink: 'https://support.microsoft.com/en-us/office/value-error-15e1b616-fbf2-4147-9c0b-0a11a20e409e',
  },
  
  '#SPILL!': {
    errorType: '#SPILL!',
    message: 'Spill range is blocked',
    suggestion: 'The array formula can\'t spill because cells in the output range contain data. Clear the blocking cells or move the formula.',
    docLink: 'https://support.microsoft.com/en-us/office/spill-error-ffe0f555-b479-4a17-a552-6c58b77f8f46',
  },
  
  '#CALC!': {
    errorType: '#CALC!',
    message: 'Calculation error',
    suggestion: 'There was an error during calculation. This may be due to complex formulas, circular references, or resource limitations.',
  },
};

/**
 * Calculates Levenshtein distance between two strings
 * Used for fuzzy matching of function names
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  
  // Create distance matrix
  const matrix: number[][] = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));
  
  // Initialize first row and column
  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;
  
  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1].toLowerCase() === str2[j - 1].toLowerCase() ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  return matrix[len1][len2];
}

/**
 * Common Excel function names for typo detection
 */
export const COMMON_FUNCTIONS = [
  'SUM', 'AVERAGE', 'COUNT', 'IF', 'VLOOKUP', 'HLOOKUP', 'XLOOKUP',
  'INDEX', 'MATCH', 'SUMIF', 'SUMIFS', 'COUNTIF', 'COUNTIFS',
  'AVERAGEIF', 'AVERAGEIFS', 'MAX', 'MIN', 'ROUND', 'ROUNDUP', 'ROUNDDOWN',
  'CONCATENATE', 'CONCAT', 'LEFT', 'RIGHT', 'MID', 'LEN', 'TRIM',
  'UPPER', 'LOWER', 'PROPER', 'SUBSTITUTE', 'TEXT', 'VALUE',
  'DATE', 'TODAY', 'NOW', 'YEAR', 'MONTH', 'DAY', 'HOUR', 'MINUTE', 'SECOND',
  'DATEDIF', 'NETWORKDAYS', 'WORKDAY', 'EOMONTH', 'EDATE',
  'PMT', 'PV', 'FV', 'RATE', 'NPER', 'NPV', 'IRR', 'XIRR', 'XNPV',
  'AND', 'OR', 'NOT', 'XOR', 'TRUE', 'FALSE', 'IFERROR', 'IFNA', 'ISERROR',
  'ISBLANK', 'ISTEXT', 'ISNUMBER', 'ISLOGICAL',
  'FILTER', 'SORT', 'SORTBY', 'UNIQUE', 'SEQUENCE', 'RANDARRAY',
  'ABS', 'SQRT', 'POWER', 'EXP', 'LN', 'LOG', 'LOG10',
  'SIN', 'COS', 'TAN', 'ASIN', 'ACOS', 'ATAN', 'ATAN2',
  'PI', 'RADIANS', 'DEGREES', 'MOD', 'QUOTIENT', 'GCD', 'LCM',
  'RAND', 'RANDBETWEEN', 'LARGE', 'SMALL', 'RANK', 'PERCENTILE',
  'STDEV', 'STDEVP', 'VAR', 'VARP', 'MEDIAN', 'MODE', 'CORREL',
  'CHOOSE', 'SWITCH', 'IFS', 'MAXIFS', 'MINIFS',
  'TEXTJOIN', 'TEXTSPLIT', 'TRANSPOSE', 'MMULT',
] as const;

/**
 * Finds the closest function names to a given (possibly misspelled) function name
 */
export function findClosestFunctions(
  attemptedName: string,
  maxResults: number = 3,
  maxDistance: number = 3
): string[] {
  const distances = COMMON_FUNCTIONS.map(funcName => ({
    name: funcName,
    distance: levenshteinDistance(attemptedName, funcName),
  }));
  
  return distances
    .filter(d => d.distance <= maxDistance)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, maxResults)
    .map(d => d.name);
}

/**
 * Generates a custom suggestion for #NAME? errors with function name suggestions
 */
export function getNameErrorSuggestion(errorMessage: string): string {
  // Try to extract the function name from the error message
  // Common patterns: "Unknown function: SUMM" or "SUMM is not defined"
  const match = errorMessage.match(/(?:Unknown function:|function|name)[:\s]*['"]?(\w+)['"]?/i);
  
  if (match && match[1]) {
    const attemptedName = match[1];
    const suggestions = findClosestFunctions(attemptedName);
    
    if (suggestions.length > 0) {
      return `Function "${attemptedName}" not recognized. Did you mean: ${suggestions.join(', ')}?`;
    }
  }
  
  return ERROR_SOLUTIONS['#NAME?'].suggestion;
}

/**
 * Gets a complete error solution with context-aware suggestions
 */
export function getErrorSolution(error: Error): ErrorSolution {
  const message = error.message;
  
  // Find error type in message
  for (const errorType of Object.keys(ERROR_SOLUTIONS)) {
    if (message.includes(errorType)) {
      const baseSolution = ERROR_SOLUTIONS[errorType];
      
      // Special handling for #NAME? errors with function suggestions
      if (errorType === '#NAME?') {
        return {
          ...baseSolution,
          suggestion: getNameErrorSuggestion(message),
        };
      }
      
      return baseSolution;
    }
  }
  
  // Unknown error type
  return {
    errorType: 'Error',
    message: 'An error occurred in the formula',
    suggestion: 'Check the formula syntax and arguments. Use the formula bar to review the complete formula.',
  };
}

/**
 * Formats an error solution as HTML for tooltip display
 */
export function formatErrorSolutionHTML(solution: ErrorSolution): string {
  return `
    <div class="error-solution">
      <div class="error-type">${solution.errorType}</div>
      <div class="error-message">${solution.message}</div>
      <div class="error-suggestion">
        <strong>Suggestion:</strong> ${solution.suggestion}
      </div>
      ${solution.docLink ? `
        <div class="error-doclink">
          <a href="${solution.docLink}" target="_blank" rel="noopener noreferrer">
            Learn more →
          </a>
        </div>
      ` : ''}
    </div>
  `.trim();
}

/**
 * Formats an error solution as plain text for accessibility
 */
export function formatErrorSolutionText(solution: ErrorSolution): string {
  let text = `${solution.errorType}: ${solution.message}\n`;
  text += `Suggestion: ${solution.suggestion}`;
  if (solution.docLink) {
    text += `\nLearn more: ${solution.docLink}`;
  }
  return text;
}

/**
 * Gets CSS styles for error solution tooltips
 */
export function getErrorSolutionCSS(): string {
  return `
    .error-solution {
      max-width: 300px;
      padding: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      line-height: 1.5;
      color: #333;
    }
    
    .error-type {
      font-weight: bold;
      font-size: 14px;
      color: #D32F2F;
      margin-bottom: 8px;
      padding: 4px 8px;
      background: #FFEBEE;
      border-radius: 4px;
      display: inline-block;
    }
    
    .error-message {
      margin-bottom: 12px;
      color: #555;
    }
    
    .error-suggestion {
      margin-bottom: 8px;
      padding: 8px;
      background: #FFF3E0;
      border-left: 3px solid #FF9800;
      border-radius: 4px;
    }
    
    .error-suggestion strong {
      color: #E65100;
    }
    
    .error-doclink {
      margin-top: 8px;
      text-align: right;
    }
    
    .error-doclink a {
      color: #1976D2;
      text-decoration: none;
      font-size: 12px;
    }
    
    .error-doclink a:hover {
      text-decoration: underline;
    }
  `.trim();
}
