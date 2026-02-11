/**
 * FormulaAutocomplete.ts
 * 
 * Provides intelligent formula autocomplete suggestions based on user input.
 * Features:
 * - Fuzzy matching with Levenshtein distance
 * - Category-based filtering
 * - Ranked suggestions (startsWith > contains > fuzzy)
 * - Function metadata (description, syntax, args)
 * 
 * Week 9 Day 1: Basic Autocomplete Implementation
 */

import type { FunctionRegistry } from '../registry/FunctionRegistry';
import type { FunctionMetadata, FunctionCategory } from '../types/formula-types';

/**
 * Autocomplete suggestion item
 */
export interface AutocompleteSuggestion {
  name: string;
  category: FunctionCategory;
  description: string;
  syntax: string;
  minArgs?: number;
  maxArgs?: number;
  matchScore: number; // Higher = better match (0-100)
  matchType: 'exact' | 'startsWith' | 'contains' | 'fuzzy';
}

/**
 * Autocomplete options
 */
export interface AutocompleteOptions {
  maxSuggestions?: number;
  includeCategory?: FunctionCategory[];
  excludeCategory?: FunctionCategory[];
  caseSensitive?: boolean;
  fuzzyThreshold?: number; // 0-1, lower = more fuzzy matches
}

/**
 * Formula autocomplete engine
 */
export class FormulaAutocomplete {
  private readonly registry: FunctionRegistry;
  private readonly functionDescriptions: Map<string, string>;

  constructor(registry: FunctionRegistry) {
    this.registry = registry;
    this.functionDescriptions = new Map();
    
    // Initialize function descriptions (can be extended later)
    this.initializeDescriptions();
  }

  /**
   * Get autocomplete suggestions for input
   * 
   * @param input - User input (e.g., "SU", "XLOOK", "FIL")
   * @param options - Autocomplete options
   * @returns Array of ranked suggestions
   * 
   * @example
   * getSuggestions("SU") → [SUM, SUMIF, SUMIFS, SUBSTITUTE, ...]
   * getSuggestions("XLOOK") → [XLOOKUP]
   * getSuggestions("FIL") → [FILTER]
   */
  getSuggestions(
    input: string,
    options: AutocompleteOptions = {}
  ): AutocompleteSuggestion[] {
    // Normalize input
    const normalizedInput = options.caseSensitive ? input : input.toUpperCase();
    
    if (!normalizedInput || normalizedInput.length === 0) {
      return [];
    }

    // Get all function names
    const allFunctions = this.registry.getAllNames();
    
    // Calculate matches
    const suggestions: AutocompleteSuggestion[] = [];
    
    for (const funcName of allFunctions) {
      const metadata = this.registry.getMetadata(funcName);
      if (!metadata) continue;
      
      // Apply category filters
      if (options.includeCategory && !options.includeCategory.includes(metadata.category)) {
        continue;
      }
      if (options.excludeCategory && options.excludeCategory.includes(metadata.category)) {
        continue;
      }
      
      // Calculate match score
      const matchResult = this.calculateMatch(normalizedInput, funcName, options);
      
      if (matchResult.score > 0) {
        suggestions.push({
          name: funcName,
          category: metadata.category,
          description: this.getDescription(funcName),
          syntax: this.generateSyntax(funcName, metadata),
          minArgs: metadata.minArgs,
          maxArgs: metadata.maxArgs,
          matchScore: matchResult.score,
          matchType: matchResult.type,
        });
      }
    }
    
    // Sort by match score (descending)
    suggestions.sort((a, b) => {
      // First by match score
      if (b.matchScore !== a.matchScore) {
        return b.matchScore - a.matchScore;
      }
      // Then alphabetically
      return a.name.localeCompare(b.name);
    });
    
    // Limit results
    const maxSuggestions = options.maxSuggestions ?? 10;
    return suggestions.slice(0, maxSuggestions);
  }

  /**
   * Calculate match score for a function name
   */
  private calculateMatch(
    input: string,
    funcName: string,
    options: AutocompleteOptions
  ): { score: number; type: AutocompleteSuggestion['matchType'] } {
    // Exact match (very rare but highest score)
    if (input === funcName) {
      return { score: 100, type: 'exact' };
    }
    
    // Starts with (highest priority)
    if (funcName.startsWith(input)) {
      // Longer match = higher score
      const ratio = input.length / funcName.length;
      return { score: 90 + ratio * 10, type: 'startsWith' };
    }
    
    // Contains (medium priority)
    if (funcName.includes(input)) {
      // Earlier position = higher score
      const position = funcName.indexOf(input);
      const score = 70 - (position / funcName.length) * 20;
      return { score, type: 'contains' };
    }
    
    // Fuzzy match (low priority)
    const fuzzyThreshold = options.fuzzyThreshold ?? 0.6;
    const distance = this.levenshteinDistance(input, funcName);
    const maxLength = Math.max(input.length, funcName.length);
    const similarity = 1 - distance / maxLength;
    
    if (similarity >= fuzzyThreshold) {
      const score = 50 * similarity;
      return { score, type: 'fuzzy' };
    }
    
    // No match
    return { score: 0, type: 'fuzzy' };
  }

  /**
   * Levenshtein distance (edit distance) for fuzzy matching
   * Measures how many single-character edits are needed to change one string to another
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    
    // Create 2D array
    const dp: number[][] = Array(len1 + 1)
      .fill(null)
      .map(() => Array(len2 + 1).fill(0));
    
    // Initialize first row and column
    for (let i = 0; i <= len1; i++) {
      dp[i][0] = i;
    }
    for (let j = 0; j <= len2; j++) {
      dp[0][j] = j;
    }
    
    // Fill the matrix
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1,     // deletion
            dp[i][j - 1] + 1,     // insertion
            dp[i - 1][j - 1] + 1  // substitution
          );
        }
      }
    }
    
    return dp[len1][len2];
  }

  /**
   * Generate function syntax string
   */
  private generateSyntax(funcName: string, metadata: FunctionMetadata): string {
    const minArgs = metadata.minArgs ?? 0;
    const maxArgs = metadata.maxArgs ?? 255;
    
    if (minArgs === 0 && maxArgs === 0) {
      return `${funcName}()`;
    }
    
    const args: string[] = [];
    
    // Required arguments
    for (let i = 1; i <= minArgs; i++) {
      args.push(`arg${i}`);
    }
    
    // Optional arguments
    if (maxArgs !== minArgs) {
      if (maxArgs === 255) {
        // Variable arguments
        args.push('[arg' + (minArgs + 1) + ', ...]');
      } else {
        // Fixed optional arguments
        for (let i = minArgs + 1; i <= Math.min(minArgs + 3, maxArgs); i++) {
          args.push(`[arg${i}]`);
        }
        if (maxArgs > minArgs + 3) {
          args.push('[...]');
        }
      }
    }
    
    return `${funcName}(${args.join(', ')})`;
  }

  /**
   * Get function description
   */
  private getDescription(funcName: string): string {
    return this.functionDescriptions.get(funcName) || 'No description available';
  }

  /**
   * Initialize function descriptions
   * This can be extended to load from JSDoc comments or external files
   */
  private initializeDescriptions(): void {
    // Math functions
    this.functionDescriptions.set('SUM', 'Adds all numbers in a range');
    this.functionDescriptions.set('AVERAGE', 'Returns the average of numbers');
    this.functionDescriptions.set('AVERAGEA', 'Returns the average, including text and logical values');
    this.functionDescriptions.set('MIN', 'Returns the minimum value');
    this.functionDescriptions.set('MAX', 'Returns the maximum value');
    this.functionDescriptions.set('COUNT', 'Counts numbers in a range');
    this.functionDescriptions.set('COUNTA', 'Counts non-empty values');
    this.functionDescriptions.set('ABS', 'Returns the absolute value');
    this.functionDescriptions.set('ROUND', 'Rounds a number to specified digits');
    this.functionDescriptions.set('ROUNDUP', 'Rounds up away from zero');
    this.functionDescriptions.set('ROUNDDOWN', 'Rounds down toward zero');
    this.functionDescriptions.set('SQRT', 'Returns the square root');
    this.functionDescriptions.set('POWER', 'Returns the result of a number raised to a power');
    this.functionDescriptions.set('EXP', 'Returns e raised to the power of a number');
    this.functionDescriptions.set('LN', 'Returns the natural logarithm');
    this.functionDescriptions.set('LOG', 'Returns the logarithm of a number');
    this.functionDescriptions.set('LOG10', 'Returns the base-10 logarithm');
    this.functionDescriptions.set('MOD', 'Returns the remainder from division');
    this.functionDescriptions.set('PI', 'Returns the value of pi');
    this.functionDescriptions.set('RAND', 'Returns a random number between 0 and 1');
    this.functionDescriptions.set('RANDBETWEEN', 'Returns a random integer between two values');
    
    // Trigonometric functions
    this.functionDescriptions.set('SIN', 'Returns the sine of an angle');
    this.functionDescriptions.set('COS', 'Returns the cosine of an angle');
    this.functionDescriptions.set('TAN', 'Returns the tangent of an angle');
    this.functionDescriptions.set('ASIN', 'Returns the arcsine');
    this.functionDescriptions.set('ACOS', 'Returns the arccosine');
    this.functionDescriptions.set('ATAN', 'Returns the arctangent');
    this.functionDescriptions.set('ATAN2', 'Returns the arctangent from x and y coordinates');
    this.functionDescriptions.set('DEGREES', 'Converts radians to degrees');
    this.functionDescriptions.set('RADIANS', 'Converts degrees to radians');
    
    // Array functions
    this.functionDescriptions.set('FILTER', 'Filters a range based on criteria');
    this.functionDescriptions.set('SORT', 'Sorts a range');
    this.functionDescriptions.set('UNIQUE', 'Returns unique values from a range');
    this.functionDescriptions.set('SEQUENCE', 'Generates a sequence of numbers');
    this.functionDescriptions.set('RANDARRAY', 'Returns an array of random numbers');
    
    // Lookup functions
    this.functionDescriptions.set('XLOOKUP', 'Searches a range and returns corresponding value');
    this.functionDescriptions.set('VLOOKUP', 'Vertical lookup in a table');
    this.functionDescriptions.set('HLOOKUP', 'Horizontal lookup in a table');
    this.functionDescriptions.set('INDEX', 'Returns a value from a specific position');
    this.functionDescriptions.set('MATCH', 'Returns the position of a value in a range');
    
    // Logical functions
    this.functionDescriptions.set('IF', 'Returns one value if true, another if false');
    this.functionDescriptions.set('IFS', 'Checks multiple conditions');
    this.functionDescriptions.set('AND', 'Returns TRUE if all arguments are TRUE');
    this.functionDescriptions.set('OR', 'Returns TRUE if any argument is TRUE');
    this.functionDescriptions.set('NOT', 'Reverses the logic of its argument');
    this.functionDescriptions.set('XOR', 'Returns TRUE if odd number of arguments are TRUE');
    this.functionDescriptions.set('IFERROR', 'Returns value if no error, otherwise returns alternate');
    this.functionDescriptions.set('ISERROR', 'Returns TRUE if value is an error');
    this.functionDescriptions.set('ISNA', 'Returns TRUE if value is #N/A');
    this.functionDescriptions.set('ISNUMBER', 'Returns TRUE if value is a number');
    this.functionDescriptions.set('ISTEXT', 'Returns TRUE if value is text');
    this.functionDescriptions.set('ISBLANK', 'Returns TRUE if value is blank');
    
    // Text functions
    this.functionDescriptions.set('CONCATENATE', 'Joins text strings');
    this.functionDescriptions.set('LEFT', 'Returns leftmost characters');
    this.functionDescriptions.set('RIGHT', 'Returns rightmost characters');
    this.functionDescriptions.set('MID', 'Returns characters from middle of text');
    this.functionDescriptions.set('LEN', 'Returns the length of text');
    this.functionDescriptions.set('UPPER', 'Converts text to uppercase');
    this.functionDescriptions.set('LOWER', 'Converts text to lowercase');
    this.functionDescriptions.set('TRIM', 'Removes extra spaces');
    this.functionDescriptions.set('SUBSTITUTE', 'Replaces text in a string');
    this.functionDescriptions.set('TEXT', 'Formats a number as text');
    
    // Date/Time functions
    this.functionDescriptions.set('TODAY', 'Returns today\'s date');
    this.functionDescriptions.set('NOW', 'Returns current date and time');
    this.functionDescriptions.set('DATE', 'Creates a date from year, month, day');
    this.functionDescriptions.set('TIME', 'Creates a time from hour, minute, second');
    this.functionDescriptions.set('YEAR', 'Returns the year from a date');
    this.functionDescriptions.set('MONTH', 'Returns the month from a date');
    this.functionDescriptions.set('DAY', 'Returns the day from a date');
    this.functionDescriptions.set('HOUR', 'Returns the hour from a time');
    this.functionDescriptions.set('MINUTE', 'Returns the minute from a time');
    this.functionDescriptions.set('SECOND', 'Returns the second from a time');
    this.functionDescriptions.set('DATEVALUE', 'Converts a date string to a date number');
    this.functionDescriptions.set('TIMEVALUE', 'Converts a time string to a time decimal');
    
    // Financial functions
    this.functionDescriptions.set('NPV', 'Net present value of an investment');
    this.functionDescriptions.set('XNPV', 'Net present value with irregular dates');
    this.functionDescriptions.set('PV', 'Present value of an investment');
    this.functionDescriptions.set('FV', 'Future value of an investment');
    this.functionDescriptions.set('PMT', 'Payment for a loan');
    this.functionDescriptions.set('IPMT', 'Interest payment for a period');
    this.functionDescriptions.set('PPMT', 'Principal payment for a period');
    this.functionDescriptions.set('IRR', 'Internal rate of return');
    this.functionDescriptions.set('XIRR', 'Internal rate of return with irregular dates');
    this.functionDescriptions.set('NPER', 'Number of periods for an investment');
    this.functionDescriptions.set('RATE', 'Interest rate per period');
    this.functionDescriptions.set('EFFECT', 'Effective annual interest rate');
    this.functionDescriptions.set('NOMINAL', 'Nominal annual interest rate');
    
    // Statistical functions
    this.functionDescriptions.set('STDEV', 'Standard deviation of a sample');
    this.functionDescriptions.set('VAR', 'Variance of a sample');
    this.functionDescriptions.set('MEDIAN', 'Median of numbers');
    this.functionDescriptions.set('MODE', 'Most common value');
    this.functionDescriptions.set('LARGE', 'Returns the k-th largest value');
    this.functionDescriptions.set('SMALL', 'Returns the k-th smallest value');
    this.functionDescriptions.set('RANK', 'Rank of a number in a list');
    
    // Functional functions
    this.functionDescriptions.set('LAMBDA', 'Creates a custom function');
    this.functionDescriptions.set('LET', 'Assigns names to calculation results');
    this.functionDescriptions.set('MAP', 'Maps values by applying a lambda');
    this.functionDescriptions.set('REDUCE', 'Reduces an array to a single value');
    this.functionDescriptions.set('SCAN', 'Scans array by applying lambda to each value');
    this.functionDescriptions.set('MAKEARRAY', 'Creates an array by applying lambda');
  }

  /**
   * Add or update a function description
   */
  setDescription(funcName: string, description: string): void {
    this.functionDescriptions.set(funcName.toUpperCase(), description);
  }

  /**
   * Get suggestions for a specific category
   */
  getSuggestionsByCategory(
    category: FunctionCategory,
    limit: number = 10
  ): AutocompleteSuggestion[] {
    const funcNames = this.registry.getByCategory(category);
    const suggestions: AutocompleteSuggestion[] = [];
    
    for (const funcName of funcNames) {
      const metadata = this.registry.getMetadata(funcName);
      if (!metadata) continue;
      
      suggestions.push({
        name: funcName,
        category: metadata.category,
        description: this.getDescription(funcName),
        syntax: this.generateSyntax(funcName, metadata),
        minArgs: metadata.minArgs,
        maxArgs: metadata.maxArgs,
        matchScore: 50, // Default score for category browse
        matchType: 'contains',
      });
    }
    
    // Sort alphabetically
    suggestions.sort((a, b) => a.name.localeCompare(b.name));
    
    return suggestions.slice(0, limit);
  }
}
