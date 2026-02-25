/**
 * search-types.ts
 * 
 * Type definitions for General Search (Find & Replace, Go To Special)
 * 
 * Excel Parity Target: 100%
 * Phase 1: Core Search API (find, findAll, findIterator)
 */

import type { Address, CellValue } from './formula-types';
import type { CellStyle } from './style-types';

/**
 * Search scope - what content to search within
 */
export type SearchLookIn = 
  | 'values'      // Search in cell display values
  | 'formulas'    // Search in formula text (e.g., "=SUM(A1:A10)")
  | 'comments';   // Search in cell comments

/**
 * Match type - how to match search term
 */
export type SearchLookAt = 
  | 'part'        // Partial match (substring) - Excel default
  | 'whole';      // Exact match (entire cell content)

/**
 * Search direction
 */
export type SearchDirection = 
  | 'next'        // Forward search (left-to-right, top-to-bottom)
  | 'previous';   // Backward search (right-to-left, bottom-to-top)

/**
 * Search order - iteration pattern
 */
export type SearchOrder = 
  | 'rows'        // Search by rows (A1 → B1 → C1..., then A2 → B2 → C2...)
  | 'columns';    // Search by columns (A1 → A2 → A3..., then B1 → B2 → B3...)

/**
 * Core search options (Phase 1)
 * 
 * Excel Reference: Worksheet.Range.Find() parameters
 * https://docs.microsoft.com/en-us/office/vba/api/excel.range.find
 */
export interface SearchOptions {
  /**
   * Search term or pattern
   * 
   * Supports:
   * - Plain text: "Apple"
   * - Wildcards: "App*" (any chars), "App?" (single char), "~*" (literal asterisk)
   * 
   * Excel Parity: ✅ Plain text, ✅ Wildcards
   */
  what: string;

  /**
   * Where to search
   * 
   * - values: Search cell display values (default)
   * - formulas: Search formula text (e.g., "=SUM(A1:A10)")
   * - comments: Search cell comments
   * 
   * Excel Parity: ✅ values, ✅ formulas, ✅ comments
   */
  lookIn?: SearchLookIn;

  /**
   * Match type
   * 
   * - part: Partial match (substring) - default
   * - whole: Exact match (entire cell content)
   * 
   * Excel Parity: ✅ part, ✅ whole
   */
  lookAt?: SearchLookAt;

  /**
   * Case sensitivity
   * 
   * - true: Case-sensitive ("Apple" != "apple")
   * - false: Case-insensitive (default)
   * 
   * Excel Parity: ✅ matchCase
   */
  matchCase?: boolean;

  /**
   * Search order (iteration pattern)
   * 
   * - rows: Search by rows (default)
   * - columns: Search by columns
   * 
   * Excel Parity: ✅ rows, ✅ columns
   */
  searchOrder?: SearchOrder;

  /**
   * Search direction
   * 
   * - next: Forward search (default)
   * - previous: Backward search
   * 
   * Excel Parity: ✅ next, ✅ previous
   */
  searchDirection?: SearchDirection;

  /**
   * Double-byte character matching (East Asian languages)
   * 
   * Excel Parity: ✅ matchByte (Phase 2)
   */
  matchByte?: boolean;

  /**
   * Format-based search (Phase 4)
   * 
   * Search cells by style properties (font color, fill, borders, etc.)
   * 
   * Excel Parity: ✅ searchFormat (Phase 4)
   */
  searchFormat?: Partial<CellStyle>;
}

/**
 * Search range specification
 * 
 * If not provided, searches entire worksheet.
 */
export interface SearchRange {
  /**
   * Start address (inclusive)
   */
  start: Address;

  /**
   * End address (inclusive)
   */
  end: Address;
}

/**
 * Search result (Phase 1 - simple)
 * 
 * Future phases may include:
 * - matchText: Actual matched text
 * - context: Surrounding text (for preview)
 * - sheet: Sheet name (for multi-sheet search)
 */
export interface SearchResult {
  /**
   * Cell address where match was found
   */
  address: Address;

  /**
   * Cell value at match location
   */
  value: CellValue;

  /**
   * Formula text (if lookIn === 'formulas')
   */
  formula?: string;
}

/**
 * Replace options (Phase 2)
 * 
 * Extends SearchOptions with replacement-specific fields.
 */
export interface ReplaceOptions extends SearchOptions {
  /**
   * Replacement text
   * 
   * For formulas: replaces text within formula string
   * For values: replaces entire cell value (if whole match) or substring (if partial)
   */
  replacement: string;

  /**
   * Replace all occurrences vs single
   * 
   * - true: Replace all matches in range
   * - false: Replace only first match (default)
   */
  replaceAll?: boolean;

  /**
   * Apply style to replaced cells (Phase 4)
   * 
   * Excel Parity: ✅ replaceFormat
   */
  replaceFormat?: Partial<CellStyle>;
}

/**
 * Special cell type (Phase 3: Go To Special)
 * 
 * Excel Reference: Range.SpecialCells(type, value)
 * https://docs.microsoft.com/en-us/office/vba/api/excel.range.specialcells
 */
export type SpecialCellType =
  | 'formulas'              // Cells containing formulas
  | 'constants'             // Cells containing constants (no formulas)
  | 'blanks'                // Empty cells
  | 'currentRegion'         // Contiguous range around anchor (Ctrl+*)
  | 'currentArray'          // Array formula range
  | 'visible'               // Non-hidden cells
  | 'lastCell'              // Bottom-right corner of used range
  | 'precedents'            // Cells referenced by formula (direct)
  | 'dependents'            // Cells referencing this cell (direct)
  | 'allPrecedents'         // All precedents (direct + indirect)
  | 'allDependents'         // All dependents (direct + indirect)
  | 'conditionalFormats'    // Cells with conditional formatting rules
  | 'dataValidation';       // Cells with data validation rules

/**
 * Special cell value filter (for formulas/constants)
 */
export type SpecialCellValue =
  | 'numbers'   // Numeric values
  | 'text'      // Text values
  | 'logicals'  // Boolean values (TRUE/FALSE)
  | 'errors';   // Error values (#N/A, #VALUE!, etc.)

/**
 * Go To Special options (Phase 3)
 * 
 * Excel Parity: ✅ All special cell types
 */
export interface SpecialCellsOptions {
  /**
   * Special cell type to find
   */
  type: SpecialCellType;

  /**
   * Value filter (for formulas/constants only)
   * 
   * If not specified, returns all cells of given type.
   */
  value?: SpecialCellValue;

  /**
   * Anchor cell (for currentRegion, currentArray, precedents, dependents)
   */
  anchor?: Address;
}

/**
 * Search metadata (SDK-Grade compliance)
 * 
 * Phase 1: Core attributes
 * Phase 2: Performance metrics
 */
export interface SearchMetadata {
  /**
   * Total cells searched
   */
  cellsSearched: number;

  /**
   * Total matches found
   */
  matchesFound: number;

  /**
   * Search duration (ms)
   */
  durationMs: number;

  /**
   * Range searched
   */
  range: SearchRange;

  /**
   * Search options used
   */
  options: SearchOptions;
}
